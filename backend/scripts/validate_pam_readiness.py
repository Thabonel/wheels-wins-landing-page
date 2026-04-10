"""
PAM Readiness Validator

Runs at application startup to catch configuration problems before they surface
as mysterious tool failures at runtime. Raises on critical failures, warns on
optional integrations.

Import and call `validate_pam_readiness()` from the FastAPI lifespan handler.
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class PAMReadinessError(Exception):
    """Raised when a critical PAM configuration check fails at startup."""
    pass


def _check_required_env(name: str) -> Optional[str]:
    """Return the env var value, or None if missing/empty."""
    val = os.environ.get(name) or ""
    return val.strip() or None


def _validate_credentials() -> list[str]:
    """Returns a list of critical missing credential names."""
    critical = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "ANTHROPIC_API_KEY",
    ]
    missing = [name for name in critical if not _check_required_env(name)]
    return missing


def _warn_optional_keys() -> list[str]:
    """Returns a list of optional keys that are absent (warnings only)."""
    optional = {
        "MAPBOX_PUBLIC_TOKEN": "Mapbox navigation and map tools will be unavailable",
        "YOUTUBE_API_KEY": "YouTube video search tool will be unavailable",
        "OPENWEATHERMAP_API_KEY": "Some weather tools may fall back to free tier",
    }
    warnings = []
    for name, message in optional.items():
        if not _check_required_env(name):
            warnings.append(f"{name} not set - {message}")
    return warnings


def validate_pam_readiness() -> None:
    """
    Validate PAM configuration at startup.

    - BLOCKS (raises PAMReadinessError) on missing critical credentials so the
      problem is visible immediately in logs rather than silently degrading.
    - WARNS (logs only) on missing optional API keys so optional tools can be
      disabled gracefully without aborting startup.

    Call this early in the FastAPI lifespan handler, before tool initialization.
    """
    logger.info("PAM readiness check starting...")

    # --- Critical checks ---
    missing_critical = _validate_credentials()
    if missing_critical:
        msg = (
            "PAM startup blocked - missing critical environment variables: "
            + ", ".join(missing_critical)
            + ". Set these in backend/.env and restart."
        )
        logger.critical(msg)
        raise PAMReadinessError(msg)

    logger.info(
        "Critical credentials present: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY"
    )

    # --- Optional warnings ---
    optional_warnings = _warn_optional_keys()
    for warning in optional_warnings:
        logger.warning(f"Optional key absent - {warning}")

    # --- Supabase client smoke test ---
    # Try to create the client now so a bad key fails here with a clear message
    # rather than silently returning MockClient later.
    try:
        from app.core.database import get_cached_supabase_client, DatabaseUnavailableError
        get_cached_supabase_client()
        logger.info("Supabase client created successfully")
    except DatabaseUnavailableError as e:
        msg = f"PAM startup blocked - Supabase client failed: {e}"
        logger.critical(msg)
        raise PAMReadinessError(msg) from e
    except Exception as e:
        # Non-critical - log and continue so the rest of startup can proceed
        logger.warning(f"Supabase client smoke test inconclusive: {e}")

    logger.info("PAM readiness check passed")
