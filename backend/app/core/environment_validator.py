"""
Environment Validation Module
Validates all required environment variables at application startup
to prevent runtime failures in production.
"""

import os
from typing import Dict, List, Optional, Tuple
from app.core.logging import get_logger

logger = get_logger(__name__)


class EnvironmentValidationError(Exception):
    """Raised when environment validation fails."""
    pass


class EnvironmentValidator:
    """Validates environment variables for different deployment environments."""
    
    # Required variables for all environments
    UNIVERSAL_REQUIRED = [
        "SUPABASE_URL",
        "SUPABASE_KEY", 
        "SECRET_KEY",
    ]
    
    # Required for production environments
    PRODUCTION_REQUIRED = [
        "OPENAI_API_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
    ]
    
    # Required for development environments
    DEVELOPMENT_REQUIRED = [
        # Development can work with minimal config
    ]
    
    # Optional but recommended variables
    RECOMMENDED = [
        "REDIS_URL",  # For caching and session management
        "SENTRY_DSN",
        "MAPBOX_SECRET_TOKEN",
        "YOUTUBE_API_KEY",
        "GOOGLE_SEARCH_API_KEY",
        "LANGFUSE_SECRET_KEY",
        "AGENTOPS_API_KEY",
    ]
    
    # Security-critical variables that should never be default values
    SECURITY_CRITICAL = {
        "SECRET_KEY": ["your-super-secret-key-here", "changeme", "secret"],
        "SUPABASE_KEY": ["your-supabase-anon-key", "your_supabase_anon_key_here"],
        "SUPABASE_SERVICE_ROLE_KEY": ["your-supabase-service-key", "your_supabase_service_role_key_here"],
        "OPENAI_API_KEY": ["your-openai-api-key", "sk-your-openai-api-key"],
    }
    
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "production").lower()
        self.is_production = self.environment == "production"
        self.is_development = self.environment in ["development", "dev", "local"]
        self.validation_results: Dict[str, List[str]] = {
            "missing": [],
            "invalid": [],
            "warnings": []
        }
    
    def validate_required_variables(self) -> None:
        """Validate all required environment variables."""
        required_vars = self.UNIVERSAL_REQUIRED.copy()
        
        if self.is_production:
            required_vars.extend(self.PRODUCTION_REQUIRED)
        else:
            required_vars.extend(self.DEVELOPMENT_REQUIRED)
        
        for var in required_vars:
            value = os.getenv(var)
            if not value:
                self.validation_results["missing"].append(var)
                logger.error(f"❌ Missing required environment variable: {var}")
            elif var in self.SECURITY_CRITICAL:
                if value in self.SECURITY_CRITICAL[var]:
                    self.validation_results["invalid"].append(
                        f"{var} contains default/placeholder value"
                    )
                    logger.error(f"🚨 SECURITY: {var} contains default value!")
    
    def validate_security_settings(self) -> None:
        """Validate security-related configuration."""
        # Check CORS origins
        cors_origins = os.getenv("CORS_ORIGINS", "")
        if "*" in cors_origins and self.is_production:
            self.validation_results["invalid"].append(
                "CORS_ORIGINS contains wildcard (*) in production"
            )
        
        # Check DEBUG setting
        debug = os.getenv("DEBUG", "").lower()
        if debug in ["true", "1", "yes"] and self.is_production:
            self.validation_results["warnings"].append(
                "DEBUG is enabled in production environment"
            )
        
        # Check SECRET_KEY strength
        secret_key = os.getenv("SECRET_KEY", "")
        if secret_key and len(secret_key) < 32:
            self.validation_results["warnings"].append(
                "SECRET_KEY is shorter than recommended 32 characters"
            )
    
    def validate_database_config(self) -> None:
        """Validate database configuration."""
        supabase_url = os.getenv("SUPABASE_URL", "")
        if supabase_url and not supabase_url.startswith("https://"):
            self.validation_results["warnings"].append(
                "SUPABASE_URL should use HTTPS"
            )
        
        # Check if we have either Supabase or PostgreSQL config
        has_supabase = bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_KEY"))
        has_postgres = bool(os.getenv("DATABASE_URL"))
        
        if not has_supabase and not has_postgres:
            self.validation_results["missing"].append(
                "Either Supabase (SUPABASE_URL, SUPABASE_KEY) or PostgreSQL (DATABASE_URL) configuration required"
            )
    
    def validate_api_keys(self) -> None:
        """Validate external API key formats."""
        # OpenAI API Key
        openai_key = os.getenv("OPENAI_API_KEY", "")
        if openai_key and not openai_key.startswith("sk-"):
            self.validation_results["warnings"].append(
                "OPENAI_API_KEY should start with 'sk-'"
            )
        
        # Mapbox Token
        mapbox_secret = os.getenv("MAPBOX_SECRET_TOKEN", "")
        if mapbox_secret and not mapbox_secret.startswith("sk."):
            self.validation_results["warnings"].append(
                "MAPBOX_SECRET_TOKEN should start with 'sk.'"
            )
        
        # Anthropic API Key (for Claude)
        anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
        if anthropic_key and not anthropic_key.startswith("sk-ant-"):
            self.validation_results["warnings"].append(
                "ANTHROPIC_API_KEY should start with 'sk-ant-'"
            )
    
    def validate_redis_config(self) -> None:
        """Validate Redis configuration."""
        redis_url = os.getenv("REDIS_URL", "")
        if redis_url:
            if not redis_url.startswith("redis://") and not redis_url.startswith("rediss://"):
                self.validation_results["warnings"].append(
                    "REDIS_URL should start with 'redis://' or 'rediss://'"
                )
            
            # Check for password in production
            if self.is_production and ":@" not in redis_url and "?password=" not in redis_url:
                self.validation_results["warnings"].append(
                    "Redis password not detected in production environment"
                )
    
    def check_recommended_variables(self) -> None:
        """Check for recommended but optional variables."""
        for var in self.RECOMMENDED:
            if not os.getenv(var):
                self.validation_results["warnings"].append(
                    f"Recommended variable missing: {var}"
                )
    
    def validate_all(self) -> Tuple[bool, Dict[str, List[str]]]:
        """Run all validation checks."""
        logger.info(f"🔍 Starting environment validation for {self.environment} environment...")
        
        self.validate_required_variables()
        self.validate_security_settings()
        self.validate_database_config()
        self.validate_api_keys()
        self.validate_redis_config()
        
        if not self.is_production:
            # Only check recommended in non-production to avoid noise
            self.check_recommended_variables()
        
        # Determine if validation passed
        has_critical_issues = bool(
            self.validation_results["missing"] or 
            self.validation_results["invalid"]
        )
        
        # Log summary
        if has_critical_issues:
            logger.error("❌ Environment validation FAILED")
            for missing in self.validation_results["missing"]:
                logger.error(f"  Missing: {missing}")
            for invalid in self.validation_results["invalid"]:
                logger.error(f"  Invalid: {invalid}")
        else:
            logger.info("✅ Environment validation PASSED")
        
        # Log warnings
        for warning in self.validation_results["warnings"]:
            logger.warning(f"⚠️  {warning}")
        
        return not has_critical_issues, self.validation_results


def validate_environment() -> None:
    """
    Main validation function to be called at application startup.
    Raises EnvironmentValidationError if critical validation fails.
    """
    validator = EnvironmentValidator()
    is_valid, results = validator.validate_all()
    
    if not is_valid:
        error_message = "Environment validation failed:\n"
        
        if results["missing"]:
            error_message += f"Missing variables: {', '.join(results['missing'])}\n"
        
        if results["invalid"]:
            error_message += f"Invalid values: {', '.join(results['invalid'])}\n"
        
        error_message += "\nPlease check your environment configuration and try again."
        
        raise EnvironmentValidationError(error_message)
    
    # Log success with summary
    total_warnings = len(results["warnings"])
    environment = os.getenv("ENVIRONMENT", "production")
    
    logger.info(f"🎯 Environment: {environment}")
    logger.info(f"📊 Validation complete: 0 errors, {total_warnings} warnings")
    
    if total_warnings > 0 and total_warnings <= 5:
        logger.info("💡 Consider addressing warnings for optimal configuration")
    elif total_warnings > 5:
        logger.warning(f"⚠️  {total_warnings} warnings detected - review configuration")


def get_environment_info() -> Dict[str, any]:
    """Get current environment information for health checks."""
    validator = EnvironmentValidator()
    is_valid, results = validator.validate_all()
    
    return {
        "environment": validator.environment,
        "is_production": validator.is_production,
        "validation_passed": is_valid,
        "missing_variables": results["missing"],
        "invalid_variables": results["invalid"],
        "warnings": results["warnings"],
        "total_issues": len(results["missing"]) + len(results["invalid"]),
        "total_warnings": len(results["warnings"])
    }


if __name__ == "__main__":
    # CLI tool for testing environment validation
    try:
        validate_environment()
        print("✅ Environment validation passed!")
    except EnvironmentValidationError as e:
        print(f"❌ Environment validation failed:\n{e}")
        exit(1)