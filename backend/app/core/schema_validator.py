"""
Database Schema Validator
Validates that critical database schema requirements are met.
This prevents 9+ months of id/user_id confusion from recurring.
"""
import logging
from typing import Dict, Any
from app.core.database import get_supabase

logger = logging.getLogger(__name__)


async def validate_profiles_schema() -> Dict[str, Any]:
    """
    Validate that profiles table uses 'id' as primary key (not user_id).

    Returns:
        Dict with is_valid (bool) and error_message (str) keys

    Raises:
        Exception if validation fails critically
    """
    try:
        supabase = get_supabase()

        # Call the database validation function created in migration
        result = await supabase.rpc('validate_profiles_has_id_column').execute()

        if not result.data or len(result.data) == 0:
            logger.error("❌ Schema validation function returned no data")
            return {
                "is_valid": False,
                "error_message": "Schema validation function not found. Run migrations first."
            }

        validation = result.data[0]

        if validation['is_valid']:
            logger.info("✅ Profiles schema validated: Primary key is 'id' (UUID)")
        else:
            logger.error(f"❌ Profiles schema validation failed: {validation['error_message']}")

        return validation

    except Exception as e:
        logger.error(f"❌ Schema validation error: {str(e)}")
        return {
            "is_valid": False,
            "error_message": f"Validation check failed: {str(e)}"
        }


async def validate_all_schemas() -> bool:
    """
    Run all schema validations. Call this on backend startup.

    Returns:
        True if all validations pass, False otherwise

    Raises:
        Exception if critical validation fails
    """
    logger.info("🔍 Running database schema validations...")

    # Validate profiles table
    profiles_validation = await validate_profiles_schema()

    if not profiles_validation['is_valid']:
        error_msg = f"Database schema validation failed: {profiles_validation['error_message']}"
        logger.error(f"❌ {error_msg}")
        # Don't raise exception - just log error and continue
        # This allows backend to start even if validation fails
        # (for backwards compatibility during rollout)
        return False

    logger.info("✅ All database schema validations passed")
    return True


# Convenience function for main.py startup
async def run_startup_validation():
    """Run schema validation on backend startup. Logs errors but doesn't crash."""
    try:
        await validate_all_schemas()
    except Exception as e:
        logger.error(f"❌ Startup schema validation error: {str(e)}")
        logger.warning("⚠️ Backend starting despite schema validation failure")
