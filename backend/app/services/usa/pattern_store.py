"""
Pattern Store for Universal Site Access

Stores and retrieves learned patterns for interacting with specific websites.
Enables faster automation by reusing successful interaction patterns.
"""

import hashlib
import json
import logging
import os
import re
from datetime import datetime
from typing import Dict, Optional, List, TYPE_CHECKING

from .models import SitePattern, WorkflowStep

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


class SecurityError(Exception):
    """Raised when a security violation is detected"""
    pass


# Pattern ID validation: alphanumeric, underscore, hyphen only
PATTERN_ID_REGEX = re.compile(r'^[a-zA-Z0-9_-]+$')


class PatternStore:
    """
    Stores learned patterns for website interactions.

    Patterns include:
    - Element patterns: Common selectors for specific roles (search, submit, etc.)
    - Form mappings: Field type to typical element index mappings
    - Navigation flows: Successful workflow sequences

    Currently uses in-memory storage. Can be extended to use
    Redis or database for persistence.

    Security features:
    - Pattern ID validation (alphanumeric, underscore, hyphen only)
    - Path traversal protection for file-based storage
    """

    def __init__(self, base_dir: Optional[str] = None):
        """
        Initialize pattern store with in-memory storage.

        Args:
            base_dir: Optional base directory for file-based storage.
                      If provided, enables path traversal protection.
        """
        # In-memory storage: {pattern_id: SitePattern}
        self._patterns: Dict[str, SitePattern] = {}

        # Index for quick lookup: {domain: {page_type: pattern_id}}
        self._index: Dict[str, Dict[str, str]] = {}

        # Base directory for file operations (if file-based storage is used)
        self._base_dir: Optional[str] = None
        if base_dir:
            self._base_dir = os.path.realpath(base_dir)

        logger.info("PatternStore initialized")

    def _validate_pattern_id(self, pattern_id: str) -> None:
        """
        Validate pattern ID format to prevent injection attacks.

        Args:
            pattern_id: The pattern ID to validate

        Raises:
            SecurityError: If pattern_id contains invalid characters
        """
        if not pattern_id:
            raise SecurityError("Pattern ID cannot be empty")

        if len(pattern_id) > 128:
            raise SecurityError(
                f"Pattern ID too long: {len(pattern_id)} chars (max 128)"
            )

        if not PATTERN_ID_REGEX.match(pattern_id):
            raise SecurityError(
                f"Invalid pattern ID format: '{pattern_id}'. "
                "Only alphanumeric characters, underscores, and hyphens allowed."
            )

    def _safe_pattern_path(self, pattern_id: str) -> str:
        """
        Generate a safe file path for a pattern, preventing path traversal.

        Args:
            pattern_id: The pattern ID to create a path for

        Returns:
            Safe absolute path within base_dir

        Raises:
            SecurityError: If path traversal is detected or base_dir not set
        """
        if not self._base_dir:
            raise SecurityError(
                "File-based storage not configured: base_dir not set"
            )

        # Validate pattern ID format first
        self._validate_pattern_id(pattern_id)

        # Construct the candidate path
        candidate_path = os.path.join(self._base_dir, f"{pattern_id}.json")

        # Resolve to absolute path to detect traversal attempts
        real_path = os.path.realpath(candidate_path)

        # Verify the resolved path is within base_dir
        if not real_path.startswith(self._base_dir + os.sep):
            logger.error(
                f"Path traversal attempt detected: pattern_id='{pattern_id}', "
                f"resolved to '{real_path}', base_dir='{self._base_dir}'"
            )
            raise SecurityError(
                f"Path traversal detected: pattern_id '{pattern_id}' "
                "resolves outside allowed directory"
            )

        return real_path

    def save_pattern_to_file(self, pattern_id: str, data: Dict) -> str:
        """
        Save pattern data to a file with path traversal protection.

        Args:
            pattern_id: The pattern ID (used as filename base)
            data: Pattern data to save

        Returns:
            Path where the file was saved

        Raises:
            SecurityError: If pattern_id is invalid or path traversal detected
        """
        safe_path = self._safe_pattern_path(pattern_id)

        with open(safe_path, 'w') as f:
            json.dump(data, f, indent=2)

        logger.info(f"Saved pattern to file: {safe_path}")
        return safe_path

    def load_pattern_from_file(self, pattern_id: str) -> Optional[Dict]:
        """
        Load pattern data from a file with path traversal protection.

        Args:
            pattern_id: The pattern ID (used as filename base)

        Returns:
            Pattern data dict or None if file doesn't exist

        Raises:
            SecurityError: If pattern_id is invalid or path traversal detected
        """
        safe_path = self._safe_pattern_path(pattern_id)

        if not os.path.exists(safe_path):
            return None

        with open(safe_path, 'r') as f:
            data = json.load(f)

        logger.debug(f"Loaded pattern from file: {safe_path}")
        return data

    def get_site_pattern(
        self,
        domain: str,
        page_type: str,
    ) -> Optional[SitePattern]:
        """
        Retrieve a stored pattern for a site.

        Args:
            domain: Website domain (e.g., "recreation.gov")
            page_type: Type of page (e.g., "search", "booking", "listing")

        Returns:
            SitePattern if found, None otherwise
        """
        domain = self._normalize_domain(domain)
        logger.debug(f"Looking up pattern for {domain}/{page_type}")

        pattern_id = self._index.get(domain, {}).get(page_type)
        if pattern_id and pattern_id in self._patterns:
            pattern = self._patterns[pattern_id]
            logger.info(f"Found pattern {pattern_id} with {pattern.success_rate:.0%} success rate")
            return pattern

        logger.debug(f"No pattern found for {domain}/{page_type}")
        return None

    def save_site_pattern(
        self,
        domain: str,
        page_type: str,
        pattern: SitePattern,
    ) -> str:
        """
        Save or update a site pattern.

        Args:
            domain: Website domain
            page_type: Type of page
            pattern: SitePattern to save

        Returns:
            pattern_id of saved pattern
        """
        domain = self._normalize_domain(domain)
        pattern_id = self._generate_pattern_id(domain, page_type)

        # Update pattern metadata
        pattern.domain = domain
        pattern.page_type = page_type
        pattern.pattern_id = pattern_id
        pattern.updated_at = datetime.utcnow()

        # Save
        self._patterns[pattern_id] = pattern

        # Update index
        if domain not in self._index:
            self._index[domain] = {}
        self._index[domain][page_type] = pattern_id

        logger.info(f"Saved pattern {pattern_id} for {domain}/{page_type}")
        return pattern_id

    def update_pattern_stats(
        self,
        pattern_id: str,
        success: bool,
        execution_time_ms: int,
    ) -> None:
        """
        Update pattern statistics after use.

        Args:
            pattern_id: ID of pattern to update
            success: Whether the pattern execution was successful
            execution_time_ms: Time taken to execute
        """
        if pattern_id not in self._patterns:
            logger.warning(f"Pattern {pattern_id} not found for stats update")
            return

        pattern = self._patterns[pattern_id]

        # Update counts
        pattern.total_uses += 1
        pattern.last_used = datetime.utcnow()

        # Update success rate (rolling average)
        old_rate = pattern.success_rate
        if pattern.total_uses == 1:
            pattern.success_rate = 1.0 if success else 0.0
        else:
            # Weighted update to prevent old data from dominating
            weight = min(0.1, 1.0 / pattern.total_uses)
            pattern.success_rate = (1 - weight) * old_rate + weight * (1.0 if success else 0.0)

        logger.debug(
            f"Updated pattern {pattern_id}: uses={pattern.total_uses}, "
            f"success_rate={pattern.success_rate:.2%}"
        )

    def delete_pattern(
        self,
        domain: str,
        page_type: str,
    ) -> bool:
        """
        Delete a stored pattern.

        Args:
            domain: Website domain
            page_type: Type of page

        Returns:
            True if pattern was deleted, False if not found
        """
        domain = self._normalize_domain(domain)
        pattern_id = self._index.get(domain, {}).get(page_type)

        if not pattern_id:
            return False

        if pattern_id in self._patterns:
            del self._patterns[pattern_id]

        if domain in self._index and page_type in self._index[domain]:
            del self._index[domain][page_type]
            if not self._index[domain]:
                del self._index[domain]

        logger.info(f"Deleted pattern {pattern_id}")
        return True

    def list_patterns(
        self,
        domain: Optional[str] = None,
    ) -> List[SitePattern]:
        """
        List all stored patterns, optionally filtered by domain.

        Args:
            domain: Optional domain to filter by

        Returns:
            List of SitePattern objects
        """
        if domain:
            domain = self._normalize_domain(domain)
            pattern_ids = list(self._index.get(domain, {}).values())
            return [self._patterns[pid] for pid in pattern_ids if pid in self._patterns]

        return list(self._patterns.values())

    def get_best_pattern_for_domain(
        self,
        domain: str,
    ) -> Optional[SitePattern]:
        """
        Get the most successful pattern for a domain.

        Args:
            domain: Website domain

        Returns:
            Best performing SitePattern or None
        """
        patterns = self.list_patterns(domain)
        if not patterns:
            return None

        # Sort by success rate and usage
        patterns.sort(key=lambda p: (p.success_rate, p.total_uses), reverse=True)
        return patterns[0]

    def create_pattern_from_workflow(
        self,
        domain: str,
        page_type: str,
        workflow_steps: List[WorkflowStep],
        element_refs: Dict,
        form_mappings: Optional[Dict[str, int]] = None,
    ) -> SitePattern:
        """
        Create a new pattern from a successful workflow execution.

        Args:
            domain: Website domain
            page_type: Type of page
            workflow_steps: Steps that were executed successfully
            element_refs: Element references from the session
            form_mappings: Optional mapping of field types to element indices

        Returns:
            New SitePattern object
        """
        # Extract element patterns from workflow
        element_patterns = {}
        for step in workflow_steps:
            if step.target and step.name:
                ref = element_refs.get(step.target)
                if ref:
                    element_patterns[step.name] = {
                        "index": step.target,
                        "tag": ref.tag,
                        "text_signature": ref.text_signature,
                        "stable_selector": ref.stable_selector,
                    }

        # Convert workflow steps to navigation flow
        navigation_flow = []
        for step in workflow_steps:
            navigation_flow.append(WorkflowStep(
                name=step.name,
                action=step.action,
                target=step.target,
                value=step.value,
                wait_for=step.wait_for,
                wait_timeout_ms=step.wait_timeout_ms,
                on_error=step.on_error,
            ))

        pattern = SitePattern(
            domain=self._normalize_domain(domain),
            page_type=page_type,
            pattern_id=self._generate_pattern_id(domain, page_type),
            element_patterns=element_patterns,
            form_mappings=form_mappings or {},
            navigation_flows={page_type: navigation_flow},
            success_rate=1.0,  # Starts at 100% since it just succeeded
            total_uses=1,
            last_used=datetime.utcnow(),
        )

        return pattern

    def merge_patterns(
        self,
        pattern1: SitePattern,
        pattern2: SitePattern,
    ) -> SitePattern:
        """
        Merge two patterns, keeping the more successful elements.

        Args:
            pattern1: First pattern
            pattern2: Second pattern

        Returns:
            Merged SitePattern
        """
        # Use the pattern with higher success rate as base
        if pattern1.success_rate >= pattern2.success_rate:
            base, other = pattern1, pattern2
        else:
            base, other = pattern2, pattern1

        # Merge element patterns, preferring base
        merged_elements = {**other.element_patterns, **base.element_patterns}

        # Merge form mappings
        merged_forms = {**other.form_mappings, **base.form_mappings}

        # Merge navigation flows
        merged_flows = {**other.navigation_flows, **base.navigation_flows}

        merged = SitePattern(
            domain=base.domain,
            page_type=base.page_type,
            pattern_id=base.pattern_id,
            element_patterns=merged_elements,
            form_mappings=merged_forms,
            navigation_flows=merged_flows,
            success_rate=(
                base.success_rate * base.total_uses + other.success_rate * other.total_uses
            ) / (base.total_uses + other.total_uses),
            total_uses=base.total_uses + other.total_uses,
            last_used=max(base.last_used or datetime.min, other.last_used or datetime.min),
        )

        return merged

    def export_patterns(self) -> str:
        """
        Export all patterns as JSON.

        Returns:
            JSON string of all patterns
        """
        export_data = []
        for pattern in self._patterns.values():
            data = {
                "domain": pattern.domain,
                "page_type": pattern.page_type,
                "pattern_id": pattern.pattern_id,
                "element_patterns": pattern.element_patterns,
                "form_mappings": pattern.form_mappings,
                "success_rate": pattern.success_rate,
                "total_uses": pattern.total_uses,
            }
            export_data.append(data)

        return json.dumps(export_data, indent=2)

    def import_patterns(self, json_data: str) -> int:
        """
        Import patterns from JSON.

        Args:
            json_data: JSON string of patterns

        Returns:
            Number of patterns imported
        """
        try:
            data = json.loads(json_data)
            count = 0

            for item in data:
                pattern = SitePattern(
                    domain=item["domain"],
                    page_type=item["page_type"],
                    pattern_id=item["pattern_id"],
                    element_patterns=item.get("element_patterns", {}),
                    form_mappings=item.get("form_mappings", {}),
                    success_rate=item.get("success_rate", 0.5),
                    total_uses=item.get("total_uses", 0),
                )
                self.save_site_pattern(pattern.domain, pattern.page_type, pattern)
                count += 1

            logger.info(f"Imported {count} patterns")
            return count

        except Exception as e:
            logger.error(f"Pattern import failed: {e}")
            return 0

    def _normalize_domain(self, domain: str) -> str:
        """Normalize domain for consistent lookup"""
        domain = domain.lower().strip()
        if domain.startswith("www."):
            domain = domain[4:]
        if domain.startswith("http://") or domain.startswith("https://"):
            from urllib.parse import urlparse
            domain = urlparse(domain).netloc
            if domain.startswith("www."):
                domain = domain[4:]
        return domain

    def _generate_pattern_id(self, domain: str, page_type: str) -> str:
        """Generate unique pattern ID"""
        key = f"{self._normalize_domain(domain)}:{page_type}"
        return hashlib.md5(key.encode()).hexdigest()[:12]


# Singleton instance
pattern_store = PatternStore()
