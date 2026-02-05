"""
Screenshot Path Security Module

Provides safe path generation and validation for screenshot operations
to prevent path traversal attacks.
"""

import os
import re
import uuid
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Default screenshot directory - configurable via environment
SCREENSHOT_DIR = os.environ.get("SCREENSHOT_DIR", "/tmp/screenshots")


class ScreenshotSecurityError(Exception):
    """Raised when a path traversal or other security issue is detected"""
    pass


def _validate_user_id(user_id: str) -> None:
    """
    Validate user_id format to prevent path injection.

    Args:
        user_id: User identifier to validate

    Raises:
        ValueError: If user_id format is invalid
    """
    if not user_id:
        raise ValueError("user_id cannot be empty")

    # Allow alphanumeric, underscore, hyphen, and UUID format (with dashes)
    if not re.match(r'^[a-zA-Z0-9_-]+$', user_id):
        logger.warning(f"Invalid user_id format attempted: {user_id[:50]}")
        raise ValueError("Invalid user_id format - only alphanumeric, underscore, and hyphen allowed")

    # Reasonable length limit
    if len(user_id) > 128:
        raise ValueError("user_id exceeds maximum length")


def _validate_filename(filename: str) -> None:
    """
    Validate filename format to prevent path injection.

    Args:
        filename: Filename to validate

    Raises:
        ValueError: If filename format is invalid
    """
    if not filename:
        raise ValueError("filename cannot be empty")

    # Must match expected format: usa_{user_id}_{unique_id}.png
    if not re.match(r'^usa_[a-zA-Z0-9_-]+_[a-zA-Z0-9]+\.png$', filename):
        logger.warning(f"Invalid filename format attempted: {filename[:100]}")
        raise ValueError("Invalid filename format")

    # No path separators allowed
    if '/' in filename or '\\' in filename or '..' in filename:
        raise ValueError("Path traversal characters not allowed in filename")


def _ensure_within_directory(filepath: str, allowed_dir: str) -> str:
    """
    Verify that a filepath is within the allowed directory.

    Args:
        filepath: Path to verify
        allowed_dir: Directory that must contain the path

    Returns:
        The realpath if valid

    Raises:
        ScreenshotSecurityError: If path is outside allowed directory
    """
    real_dir = os.path.realpath(allowed_dir)
    real_path = os.path.realpath(filepath)

    # Ensure the path starts with the allowed directory
    if not real_path.startswith(real_dir + os.sep) and real_path != real_dir:
        logger.warning(
            f"Path traversal attempt detected: {filepath} resolved to {real_path}, "
            f"expected within {real_dir}"
        )
        raise ScreenshotSecurityError("Path traversal attempt detected")

    return real_path


def safe_screenshot_path(user_id: str, suffix: str = "") -> str:
    """
    Generate a safe screenshot path preventing traversal attacks.

    Args:
        user_id: User identifier (will be validated)
        suffix: Optional suffix to add to filename (e.g., "_thumbnail")

    Returns:
        Safe absolute filepath within SCREENSHOT_DIR

    Raises:
        ValueError: If user_id format is invalid
        ScreenshotSecurityError: If path traversal is detected
    """
    # Validate user_id format
    _validate_user_id(user_id)

    # Validate suffix if provided
    if suffix and not re.match(r'^[a-zA-Z0-9_-]*$', suffix):
        raise ValueError("Invalid suffix format")

    # Generate unique filename using UUID to prevent overwrites
    unique_id = uuid.uuid4().hex[:8]
    filename = f"usa_{user_id}_{unique_id}{suffix}.png"

    # Construct full path
    filepath = os.path.join(SCREENSHOT_DIR, filename)

    # Verify path is within allowed directory (defense in depth)
    _ensure_within_directory(filepath, SCREENSHOT_DIR)

    # Ensure directory exists with secure permissions
    real_dir = os.path.realpath(SCREENSHOT_DIR)
    if not os.path.exists(real_dir):
        os.makedirs(real_dir, mode=0o755, exist_ok=True)
        logger.info(f"Created screenshot directory: {real_dir}")

    logger.debug(f"Generated safe screenshot path for user {user_id}: {filename}")

    return filepath


def validate_screenshot_access(filename: str, user_id: str) -> str:
    """
    Validate that a user can access a screenshot file.

    Args:
        filename: Screenshot filename to access
        user_id: User requesting access

    Returns:
        Safe absolute filepath if validation passes

    Raises:
        ValueError: If filename format is invalid
        ScreenshotSecurityError: If access is denied or path traversal detected
        FileNotFoundError: If file doesn't exist
    """
    # Validate filename format first
    _validate_filename(filename)

    # Validate user_id
    _validate_user_id(user_id)

    # Extract user_id from filename and verify ownership
    # Format: usa_{user_id}_{unique_id}.png
    expected_prefix = f"usa_{user_id}_"
    if not filename.startswith(expected_prefix):
        logger.warning(
            f"Screenshot access denied: user {user_id} attempted to access {filename}"
        )
        raise ScreenshotSecurityError("Access denied - you can only access your own screenshots")

    # Construct filepath
    filepath = os.path.join(SCREENSHOT_DIR, filename)

    # Verify path is within allowed directory
    real_path = _ensure_within_directory(filepath, SCREENSHOT_DIR)

    # Check file exists
    if not os.path.exists(real_path):
        raise FileNotFoundError("Screenshot not found or has expired")

    logger.debug(f"Validated screenshot access for user {user_id}: {filename}")

    return real_path


def get_screenshot_url_path(filepath: str) -> str:
    """
    Convert a filesystem path to a URL path for API access.

    Args:
        filepath: Absolute filesystem path to screenshot

    Returns:
        URL path for accessing the screenshot via API
    """
    filename = os.path.basename(filepath)
    return f"/api/v1/usa/screenshots/{filename}"


def cleanup_user_screenshots(user_id: str, max_age_seconds: int = 3600) -> int:
    """
    Clean up old screenshots for a user.

    Args:
        user_id: User whose screenshots to clean up
        max_age_seconds: Maximum age of screenshots to keep (default 1 hour)

    Returns:
        Number of screenshots removed
    """
    import time

    _validate_user_id(user_id)

    removed = 0
    real_dir = os.path.realpath(SCREENSHOT_DIR)

    if not os.path.exists(real_dir):
        return 0

    prefix = f"usa_{user_id}_"
    current_time = time.time()

    try:
        for filename in os.listdir(real_dir):
            if filename.startswith(prefix) and filename.endswith('.png'):
                filepath = os.path.join(real_dir, filename)
                try:
                    file_age = current_time - os.path.getmtime(filepath)
                    if file_age > max_age_seconds:
                        os.remove(filepath)
                        removed += 1
                        logger.debug(f"Removed old screenshot: {filename}")
                except OSError as e:
                    logger.warning(f"Failed to remove screenshot {filename}: {e}")
    except OSError as e:
        logger.error(f"Failed to list screenshot directory: {e}")

    if removed > 0:
        logger.info(f"Cleaned up {removed} old screenshots for user {user_id}")

    return removed
