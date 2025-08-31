"""
CORS Configuration Settings
Production-ready CORS configuration with proper validation and environment handling
Following security best practices and Pydantic v2 standards
"""

import os
from typing import List, Optional, Set
from enum import Enum
from pydantic import BaseModel, Field, field_validator, ConfigDict
from pydantic_settings import BaseSettings, SettingsConfigDict


class CORSEnvironment(str, Enum):
    """CORS environment configurations"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class CORSOrigin(BaseModel):
    """Validated CORS origin model"""
    url: str
    environment: Optional[CORSEnvironment] = None
    
    @field_validator('url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate and normalize CORS origin URL"""
        if not v:
            raise ValueError("CORS origin cannot be empty")
        
        # Remove trailing slash
        v = v.rstrip('/')
        
        # Validate URL format
        if not (v.startswith('http://') or v.startswith('https://')):
            raise ValueError(f"Invalid CORS origin: {v}. Must start with http:// or https://")
        
        # Security: Prevent wildcard origins
        if '*' in v:
            raise ValueError("Wildcard origins are not allowed for security reasons")
        
        return v


class CORSSettings(BaseSettings):
    """
    CORS configuration with proper validation and security
    Following OWASP security guidelines for CORS
    """
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        env_prefix="CORS_",
        # Allow fields to be populated by environment variables
        extra="ignore"
    )
    
    # Core CORS settings
    enabled: bool = Field(
        default=True,
        description="Enable CORS middleware"
    )
    
    allow_credentials: bool = Field(
        default=True,
        description="Allow credentials in CORS requests"
    )
    
    allow_methods: List[str] = Field(
        default=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        description="Allowed HTTP methods"
    )
    
    allow_headers: List[str] = Field(
        default=[
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Accept",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers",
            "X-CSRF-Token",
            "X-Session-ID"
        ],
        description="Allowed request headers"
    )
    
    expose_headers: List[str] = Field(
        default=[
            "Content-Type",
            "Authorization",
            "X-Request-ID",
            "X-Rate-Limit-Remaining"
        ],
        description="Headers exposed to the browser"
    )
    
    max_age: int = Field(
        default=86400,  # 24 hours
        ge=0,
        description="Preflight cache duration in seconds"
    )
    
    # Environment-specific origins
    development_origins: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:8080",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8080",
            "http://127.0.0.1:5173"
        ],
        description="Development environment origins"
    )
    
    staging_origins: List[str] = Field(
        default=[
            "https://staging-wheelsandwins.netlify.app",
            "https://wheels-wins-staging.netlify.app",
            "https://wheelsandwins-staging.netlify.app",
            "https://wheels-wins-test.netlify.app",
            "https://staging--wheels-wins-landing-page.netlify.app",
            "https://staging--charming-figolla-d83b68.netlify.app"
        ],
        description="Staging environment origins"
    )
    
    production_origins: List[str] = Field(
        default=[
            "https://wheelsandwins.com",
            "https://www.wheelsandwins.com",
            "https://wheelz-wins.com",
            "https://www.wheelz-wins.com",
            "https://wheels-wins-landing-page.netlify.app",
            "https://charming-figolla-d83b68.netlify.app",  # Current production Netlify URL
            "https://wheelswins.netlify.app",
            "https://wheels-wins.netlify.app",
            "https://wheels-and-wins.netlify.app"
        ],
        description="Production environment origins"
    )
    
    # Additional origins from environment variable
    additional_origins: Optional[str] = Field(
        default=None,
        description="Comma-separated list of additional origins"
    )
    
    # Current environment
    environment: CORSEnvironment = Field(
        default=CORSEnvironment.DEVELOPMENT,
        description="Current environment"
    )
    
    @field_validator('additional_origins', mode='before')
    @classmethod
    def parse_additional_origins(cls, v: Optional[str]) -> Optional[str]:
        """Parse additional origins from environment variable"""
        if v is None:
            # Check for the commonly used CORS_ALLOWED_ORIGINS variable
            v = os.getenv('CORS_ALLOWED_ORIGINS')
        return v
    
    @field_validator('environment', mode='before')
    @classmethod
    def determine_environment(cls, v: Optional[str]) -> CORSEnvironment:
        """Determine environment from various sources"""
        if v:
            return CORSEnvironment(v.lower())
        
        # Check multiple environment indicators
        env_indicators = [
            os.getenv('ENVIRONMENT'),
            os.getenv('NODE_ENV'),
            os.getenv('APP_ENV')
        ]
        
        for indicator in env_indicators:
            if indicator:
                try:
                    return CORSEnvironment(indicator.lower())
                except ValueError:
                    continue
        
        # Default to development for safety (more permissive)
        return CORSEnvironment.DEVELOPMENT
    
    def get_allowed_origins(self) -> List[str]:
        """
        Get the complete list of allowed origins based on environment
        Returns a deduplicated list of validated origins
        """
        origins: Set[str] = set()
        
        # Add environment-specific origins
        if self.environment == CORSEnvironment.DEVELOPMENT:
            origins.update(self.development_origins)
            # In development, also allow staging origins for testing
            origins.update(self.staging_origins)
        elif self.environment == CORSEnvironment.STAGING:
            origins.update(self.staging_origins)
            # In staging, also allow development origins for testing
            origins.update(self.development_origins)
        elif self.environment == CORSEnvironment.PRODUCTION:
            origins.update(self.production_origins)
            # In production, only allow production origins
        elif self.environment == CORSEnvironment.TESTING:
            # In testing, allow all defined origins
            origins.update(self.development_origins)
            origins.update(self.staging_origins)
            origins.update(self.production_origins)
        
        # Add additional origins if specified
        if self.additional_origins:
            additional = [
                origin.strip() 
                for origin in self.additional_origins.split(',')
                if origin.strip()
            ]
            for origin in additional:
                try:
                    validated = CORSOrigin(url=origin)
                    origins.add(validated.url)
                except ValueError as e:
                    # Log invalid origins but don't fail
                    print(f"⚠️ Skipping invalid CORS origin '{origin}': {e}")
        
        # Convert to sorted list for consistent ordering
        return sorted(list(origins))
    
    def get_cors_middleware_config(self) -> dict:
        """
        Get configuration dictionary for FastAPI CORSMiddleware
        Ready to use with app.add_middleware(CORSMiddleware, **config)
        """
        if not self.enabled:
            return {}
        
        return {
            "allow_origins": self.get_allowed_origins(),
            "allow_credentials": self.allow_credentials,
            "allow_methods": self.allow_methods,
            "allow_headers": self.allow_headers,
            "expose_headers": self.expose_headers,
            "max_age": self.max_age
        }
    
    def validate_security(self) -> List[str]:
        """
        Validate CORS configuration for security issues
        Returns a list of security warnings
        """
        warnings = []
        
        allowed_origins = self.get_allowed_origins()
        
        # Check for wildcard origins
        if any('*' in origin for origin in allowed_origins):
            warnings.append("🚨 CRITICAL: Wildcard origins detected - this is a security risk!")
        
        # Check for non-HTTPS origins in production
        if self.environment == CORSEnvironment.PRODUCTION:
            non_https = [
                origin for origin in allowed_origins 
                if origin.startswith('http://') and 'localhost' not in origin
            ]
            if non_https:
                warnings.append(f"⚠️ Non-HTTPS origins in production: {non_https}")
        
        # Check for localhost origins in production
        if self.environment == CORSEnvironment.PRODUCTION:
            localhost_origins = [
                origin for origin in allowed_origins 
                if 'localhost' in origin or '127.0.0.1' in origin
            ]
            if localhost_origins:
                warnings.append(f"⚠️ Localhost origins in production: {localhost_origins}")
        
        # Check credentials with wildcard methods
        if self.allow_credentials and '*' in self.allow_methods:
            warnings.append("⚠️ Allowing credentials with wildcard methods is a security risk")
        
        return warnings
    
    def print_configuration(self) -> None:
        """Print CORS configuration for debugging"""
        print("\n🔒 CORS Configuration:")
        print(f"  Environment: {self.environment.value}")
        print(f"  Enabled: {self.enabled}")
        print(f"  Allow Credentials: {self.allow_credentials}")
        
        allowed_origins = self.get_allowed_origins()
        print(f"  Allowed Origins ({len(allowed_origins)}):")
        for origin in allowed_origins:
            print(f"    - {origin}")
        
        print(f"  Allowed Methods: {', '.join(self.allow_methods)}")
        print(f"  Max Age: {self.max_age} seconds")
        
        # Print security warnings
        warnings = self.validate_security()
        if warnings:
            print("\n⚠️ Security Warnings:")
            for warning in warnings:
                print(f"  {warning}")
        else:
            print("\n✅ No security warnings detected")
        print()


# Create singleton instance
_cors_settings: Optional[CORSSettings] = None


def get_cors_settings() -> CORSSettings:
    """Get or create CORS settings instance"""
    global _cors_settings
    
    if _cors_settings is None:
        _cors_settings = CORSSettings()
        _cors_settings.print_configuration()
    
    return _cors_settings


# Export for convenience
cors_settings = get_cors_settings()