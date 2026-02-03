"""
Dynamic Tool Pattern Learner - Caches and learns from tool generation patterns
"""
import hashlib
import re
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.core.logging import get_logger
from app.services.dynamic_tools.models import GeneratedToolPattern

logger = get_logger(__name__)


class PatternLearner:
    """
    Learns from tool generation patterns to improve future generations
    and cache successful patterns for reuse.
    """

    def __init__(self):
        self.logger = get_logger(__name__)
        self.db_service = None
        self.is_initialized = False

        # In-memory cache for quick lookups
        self.pattern_cache: Dict[str, GeneratedToolPattern] = {}

        # Keyword index for similarity matching
        self.keyword_index: Dict[str, List[str]] = {}  # keyword -> list of pattern_ids

    async def initialize(self):
        """Initialize the pattern learner with database connection"""
        try:
            from app.services.database import get_database_service
            self.db_service = get_database_service()
            self.is_initialized = True

            # Load existing patterns into cache
            await self._load_patterns_from_db()

            self.logger.info(
                f"PatternLearner initialized",
                extra={"cached_patterns": len(self.pattern_cache)}
            )
        except Exception as e:
            self.logger.error(f"PatternLearner initialization failed: {e}")
            # Continue without database - use in-memory only
            self.is_initialized = True

    async def find_similar_pattern(
        self,
        intent: str
    ) -> Optional[GeneratedToolPattern]:
        """
        Find a similar cached pattern based on intent keywords

        Args:
            intent: User's intent description

        Returns:
            GeneratedToolPattern if found, None otherwise
        """
        if not self.is_initialized:
            await self.initialize()

        try:
            # Extract keywords from intent
            keywords = self._extract_keywords(intent)

            if not keywords:
                return None

            # Score patterns by keyword overlap
            pattern_scores: Dict[str, float] = {}

            for keyword in keywords:
                if keyword in self.keyword_index:
                    for pattern_id in self.keyword_index[keyword]:
                        if pattern_id not in pattern_scores:
                            pattern_scores[pattern_id] = 0
                        pattern_scores[pattern_id] += 1

            if not pattern_scores:
                return None

            # Find best match (normalize by total keywords)
            best_pattern_id = max(
                pattern_scores,
                key=lambda pid: pattern_scores[pid] / len(keywords)
            )

            # Require at least 50% keyword overlap
            overlap_ratio = pattern_scores[best_pattern_id] / len(keywords)
            if overlap_ratio < 0.5:
                return None

            pattern = self.pattern_cache.get(best_pattern_id)

            if pattern and pattern.is_active:
                self.logger.info(
                    f"Found similar pattern",
                    extra={
                        "pattern_id": best_pattern_id,
                        "overlap_ratio": overlap_ratio,
                        "intent": intent[:50]
                    }
                )
                return pattern

            return None

        except Exception as e:
            self.logger.error(f"Pattern search failed: {e}")
            return None

    async def save_pattern(
        self,
        intent: str,
        template: str,
        code: str,
        function_def: Dict[str, Any]
    ) -> Optional[str]:
        """
        Save a new pattern to the database and cache

        Args:
            intent: Original user intent
            template: Template type used
            code: Generated code
            function_def: OpenAI function definition

        Returns:
            Pattern ID if saved successfully, None otherwise
        """
        if not self.is_initialized:
            await self.initialize()

        try:
            # Generate pattern ID from intent hash
            intent_hash = hashlib.md5(intent.lower().encode()).hexdigest()
            keywords = self._extract_keywords(intent)

            pattern = GeneratedToolPattern(
                id=intent_hash,
                intent_hash=intent_hash,
                intent_keywords=keywords,
                template_type=template,
                generated_code=code,
                function_definition=function_def,
                success_count=0,
                failure_count=0,
                avg_execution_time_ms=0.0,
                created_at=datetime.utcnow(),
                is_active=True
            )

            # Save to cache
            self.pattern_cache[intent_hash] = pattern

            # Update keyword index
            for keyword in keywords:
                if keyword not in self.keyword_index:
                    self.keyword_index[keyword] = []
                if intent_hash not in self.keyword_index[keyword]:
                    self.keyword_index[keyword].append(intent_hash)

            # Save to database if available
            if self.db_service:
                await self._save_pattern_to_db(pattern)

            self.logger.info(
                f"Saved new pattern",
                extra={
                    "pattern_id": intent_hash,
                    "template": template,
                    "keywords": keywords[:5]
                }
            )

            return intent_hash

        except Exception as e:
            self.logger.error(f"Failed to save pattern: {e}")
            return None

    async def record_execution(
        self,
        pattern_id: str,
        success: bool,
        execution_time_ms: float
    ) -> bool:
        """
        Record an execution result for a pattern

        Args:
            pattern_id: Pattern ID
            success: Whether execution was successful
            execution_time_ms: Execution time in milliseconds

        Returns:
            True if recorded successfully
        """
        try:
            pattern = self.pattern_cache.get(pattern_id)
            if not pattern:
                return False

            # Update statistics
            if success:
                pattern.success_count += 1
            else:
                pattern.failure_count += 1

            # Update rolling average execution time
            total_executions = pattern.success_count + pattern.failure_count
            if total_executions > 0:
                old_total = pattern.avg_execution_time_ms * (total_executions - 1)
                pattern.avg_execution_time_ms = (old_total + execution_time_ms) / total_executions

            pattern.last_used = datetime.utcnow()

            # Disable pattern if failure rate is too high
            if total_executions >= 5:
                failure_rate = pattern.failure_count / total_executions
                if failure_rate > 0.5:
                    pattern.is_active = False
                    self.logger.warning(
                        f"Disabled pattern due to high failure rate",
                        extra={
                            "pattern_id": pattern_id,
                            "failure_rate": failure_rate
                        }
                    )

            # Update database if available
            if self.db_service:
                await self._update_pattern_in_db(pattern)

            return True

        except Exception as e:
            self.logger.error(f"Failed to record execution: {e}")
            return False

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract meaningful keywords from text"""
        # Extract words
        words = re.findall(r'\b[a-zA-Z]+\b', text.lower())

        # Filter stop words and short words
        stop_words = {
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
            'to', 'for', 'of', 'and', 'or', 'in', 'on', 'at', 'by',
            'with', 'from', 'that', 'this', 'it', 'as', 'can', 'could',
            'would', 'should', 'will', 'do', 'does', 'did', 'have', 'has',
            'me', 'my', 'i', 'we', 'you', 'your', 'please', 'want', 'need'
        }

        keywords = [
            word for word in words
            if word not in stop_words and len(word) > 2
        ]

        # Deduplicate while preserving order
        seen = set()
        unique_keywords = []
        for kw in keywords:
            if kw not in seen:
                seen.add(kw)
                unique_keywords.append(kw)

        return unique_keywords[:10]  # Limit to 10 keywords

    async def _load_patterns_from_db(self):
        """Load patterns from database into cache"""
        if not self.db_service:
            return

        try:
            # Query patterns from database
            # Note: This assumes a generated_tool_patterns table exists
            result = await self.db_service.client.table('generated_tool_patterns') \
                .select('*') \
                .eq('is_active', True) \
                .execute()

            if result.data:
                for row in result.data:
                    pattern = GeneratedToolPattern(
                        id=row['id'],
                        intent_hash=row['intent_hash'],
                        intent_keywords=row.get('intent_keywords', []),
                        template_type=row['template_type'],
                        generated_code=row['generated_code'],
                        function_definition=row.get('function_definition', {}),
                        success_count=row.get('success_count', 0),
                        failure_count=row.get('failure_count', 0),
                        avg_execution_time_ms=row.get('avg_execution_time_ms', 0.0),
                        last_used=row.get('last_used'),
                        created_at=row.get('created_at'),
                        is_active=row.get('is_active', True)
                    )

                    self.pattern_cache[pattern.id] = pattern

                    # Index keywords
                    for keyword in pattern.intent_keywords:
                        if keyword not in self.keyword_index:
                            self.keyword_index[keyword] = []
                        self.keyword_index[keyword].append(pattern.id)

                self.logger.info(f"Loaded {len(result.data)} patterns from database")

        except Exception as e:
            self.logger.warning(f"Could not load patterns from database: {e}")

    async def _save_pattern_to_db(self, pattern: GeneratedToolPattern):
        """Save a pattern to the database"""
        if not self.db_service:
            return

        try:
            await self.db_service.client.table('generated_tool_patterns').upsert({
                'id': pattern.id,
                'intent_hash': pattern.intent_hash,
                'intent_keywords': pattern.intent_keywords,
                'template_type': pattern.template_type,
                'generated_code': pattern.generated_code,
                'function_definition': pattern.function_definition,
                'success_count': pattern.success_count,
                'failure_count': pattern.failure_count,
                'avg_execution_time_ms': pattern.avg_execution_time_ms,
                'last_used': pattern.last_used.isoformat() if pattern.last_used else None,
                'created_at': pattern.created_at.isoformat() if pattern.created_at else None,
                'is_active': pattern.is_active
            }).execute()
        except Exception as e:
            self.logger.warning(f"Could not save pattern to database: {e}")

    async def _update_pattern_in_db(self, pattern: GeneratedToolPattern):
        """Update a pattern in the database"""
        if not self.db_service:
            return

        try:
            await self.db_service.client.table('generated_tool_patterns') \
                .update({
                    'success_count': pattern.success_count,
                    'failure_count': pattern.failure_count,
                    'avg_execution_time_ms': pattern.avg_execution_time_ms,
                    'last_used': pattern.last_used.isoformat() if pattern.last_used else None,
                    'is_active': pattern.is_active
                }) \
                .eq('id', pattern.id) \
                .execute()
        except Exception as e:
            self.logger.warning(f"Could not update pattern in database: {e}")

    def get_stats(self) -> Dict[str, Any]:
        """Get pattern learner statistics"""
        total_patterns = len(self.pattern_cache)
        active_patterns = sum(1 for p in self.pattern_cache.values() if p.is_active)

        return {
            "total_patterns": total_patterns,
            "active_patterns": active_patterns,
            "indexed_keywords": len(self.keyword_index),
            "is_initialized": self.is_initialized
        }


# Module-level instance
pattern_learner = PatternLearner()


async def get_pattern_learner() -> PatternLearner:
    """Get the pattern learner instance"""
    if not pattern_learner.is_initialized:
        await pattern_learner.initialize()
    return pattern_learner
