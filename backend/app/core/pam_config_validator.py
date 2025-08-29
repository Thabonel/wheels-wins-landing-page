"""
PAM Configuration Validator
Ensures proper configuration for PAM AI services and provides clear error messages
"""

import os
import logging
from typing import Dict, List, Tuple, Optional
from openai import AsyncOpenAI
from ..core.config import settings

logger = logging.getLogger(__name__)

class PAMConfigurationError(Exception):
    """Raised when PAM configuration is invalid"""
    pass

class PAMConfigValidator:
    """Validates PAM service configuration and provides diagnostic information"""
    
    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.info: List[str] = []
    
    async def validate_all(self) -> Tuple[bool, Dict[str, any]]:
        """
        Validate all PAM configuration requirements
        Returns (is_valid, diagnostic_info)
        """
        self.errors.clear()
        self.warnings.clear()
        self.info.clear()
        
        # Check OpenAI configuration
        openai_valid = await self._validate_openai_config()
        
        # Check database configuration
        db_valid = self._validate_database_config()
        
        # Check environment variables
        env_valid = self._validate_environment_variables()
        
        # Check service endpoints
        endpoints_valid = self._validate_service_endpoints()
        
        is_valid = openai_valid and db_valid and env_valid and endpoints_valid
        
        diagnostic_info = {
            "is_valid": is_valid,
            "openai_valid": openai_valid,
            "database_valid": db_valid,
            "environment_valid": env_valid,
            "endpoints_valid": endpoints_valid,
            "errors": self.errors,
            "warnings": self.warnings,
            "info": self.info,
            "recommendations": self._get_recommendations()
        }
        
        return is_valid, diagnostic_info
    
    async def _validate_openai_config(self) -> bool:
        """Validate OpenAI API configuration"""
        api_key = settings.OPENAI_API_KEY
        
        if not api_key:
            self.errors.append("OPENAI_API_KEY environment variable is missing")
            return False
        
        # Extract the actual key value from SecretStr
        api_key_value = api_key.get_secret_value() if hasattr(api_key, 'get_secret_value') else str(api_key)
        
        if not api_key_value.startswith('sk-'):
            self.errors.append("OPENAI_API_KEY appears to be invalid (should start with 'sk-')")
            return False
        
        if len(api_key_value) < 45:  # OpenAI keys are typically 51+ characters
            self.warnings.append("OPENAI_API_KEY appears to be shorter than expected")
        
        # Test API connectivity
        try:
            client = AsyncOpenAI(api_key=api_key)
            
            # Simple test call with minimal tokens
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1,
                timeout=10.0
            )
            
            self.info.append("OpenAI API connection test successful")
            return True
            
        except Exception as e:
            error_msg = str(e).lower()
            
            if "invalid api key" in error_msg or "unauthorized" in error_msg:
                self.errors.append(f"OpenAI API key is invalid: {str(e)}")
            elif "quota" in error_msg or "billing" in error_msg:
                self.errors.append(f"OpenAI API quota/billing issue: {str(e)}")
            elif "timeout" in error_msg or "connection" in error_msg:
                self.warnings.append(f"OpenAI API connectivity issue (may be temporary): {str(e)}")
                return True  # Don't fail config validation for temporary network issues
            else:
                self.errors.append(f"OpenAI API test failed: {str(e)}")
            
            return False
    
    def _validate_database_config(self) -> bool:
        """Validate database configuration for PAM"""
        valid = True
        
        if not settings.SUPABASE_URL:
            self.errors.append("SUPABASE_URL environment variable is missing")
            valid = False
        elif not settings.SUPABASE_URL.startswith('https://'):
            self.warnings.append("SUPABASE_URL should use HTTPS")
        
        if not settings.SUPABASE_KEY:
            self.errors.append("SUPABASE_KEY environment variable is missing")
            valid = False
        
        if not settings.SUPABASE_SERVICE_ROLE_KEY:
            self.warnings.append("SUPABASE_SERVICE_ROLE_KEY not set - some PAM features may be limited")
        
        return valid
    
    def _validate_environment_variables(self) -> bool:
        """Validate required environment variables"""
        required_vars = [
            "OPENAI_API_KEY",
            "SUPABASE_URL", 
            "SUPABASE_KEY"
        ]
        
        missing_vars = []
        for var in required_vars:
            if not getattr(settings, var, None):
                missing_vars.append(var)
        
        if missing_vars:
            self.errors.append(f"Missing required environment variables: {', '.join(missing_vars)}")
            return False
        
        # Check optional but recommended variables
        optional_vars = [
            "SUPABASE_SERVICE_ROLE_KEY",
            "MAPBOX_PUBLIC_TOKEN",
            "MAPBOX_SECRET_TOKEN"
        ]
        
        missing_optional = []
        for var in optional_vars:
            if not getattr(settings, var, None):
                missing_optional.append(var)
        
        if missing_optional:
            self.warnings.append(f"Optional environment variables not set: {', '.join(missing_optional)}")
        
        return True
    
    def _validate_service_endpoints(self) -> bool:
        """Validate service endpoint configuration"""
        valid = True
        
        # Check if we're running on expected deployment platform
        render_service = os.getenv('RENDER_SERVICE_NAME')
        if render_service:
            self.info.append(f"Running on Render service: {render_service}")
        else:
            self.info.append("Not running on Render (local development?)")
        
        # Validate site URL configuration
        site_url = settings.SITE_URL
        if site_url == "http://localhost:3000":
            self.info.append("Using local development site URL")
        elif not site_url.startswith('https://'):
            self.warnings.append("Production SITE_URL should use HTTPS")
        
        return valid
    
    def _get_recommendations(self) -> List[str]:
        """Generate recommendations based on validation results"""
        recommendations = []
        
        if any("OPENAI_API_KEY" in error for error in self.errors):
            recommendations.append(
                "Set OPENAI_API_KEY environment variable in Render.com dashboard. "
                "Get API key from https://platform.openai.com/api-keys"
            )
        
        if any("SUPABASE" in error for error in self.errors):
            recommendations.append(
                "Configure Supabase environment variables in Render.com dashboard. "
                "Get values from Supabase project settings → API"
            )
        
        if any("connectivity" in warning.lower() for warning in self.warnings):
            recommendations.append(
                "Network connectivity issues detected. Check if outbound connections "
                "to OpenAI API (api.openai.com) are allowed in your deployment environment"
            )
        
        if any("quota" in error.lower() for error in self.errors):
            recommendations.append(
                "OpenAI API quota exceeded. Check billing and usage limits at "
                "https://platform.openai.com/usage"
            )
        
        return recommendations

# Global validator instance
pam_validator = PAMConfigValidator()

async def validate_pam_config() -> Tuple[bool, Dict[str, any]]:
    """
    Convenience function to validate PAM configuration
    Returns (is_valid, diagnostic_info)
    """
    return await pam_validator.validate_all()

async def ensure_pam_config_valid() -> None:
    """
    Ensure PAM configuration is valid, raise exception if not
    """
    is_valid, diagnostic_info = await validate_pam_config()
    
    if not is_valid:
        errors = diagnostic_info.get("errors", [])
        recommendations = diagnostic_info.get("recommendations", [])
        
        error_message = "PAM configuration validation failed:\n"
        error_message += "\n".join(f"  - {error}" for error in errors)
        
        if recommendations:
            error_message += "\n\nRecommendations:\n"
            error_message += "\n".join(f"  - {rec}" for rec in recommendations)
        
        raise PAMConfigurationError(error_message)

def get_pam_config_summary() -> Dict[str, any]:
    """Get a summary of current PAM configuration (without sensitive data)"""
    return {
        "openai_api_key_configured": bool(settings.OPENAI_API_KEY),
        "openai_api_key_format_valid": bool(
            settings.OPENAI_API_KEY and 
            hasattr(settings.OPENAI_API_KEY, 'get_secret_value') and
            settings.OPENAI_API_KEY.get_secret_value().startswith('sk-') and 
            len(settings.OPENAI_API_KEY.get_secret_value()) >= 45
        ),
        "supabase_url_configured": bool(settings.SUPABASE_URL),
        "supabase_key_configured": bool(settings.SUPABASE_KEY),
        "supabase_service_role_configured": bool(settings.SUPABASE_SERVICE_ROLE_KEY),
        "environment": os.getenv('RENDER_SERVICE_NAME', 'local'),
        "site_url": settings.SITE_URL,
    }