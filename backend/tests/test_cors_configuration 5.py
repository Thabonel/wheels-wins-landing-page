"""
Test CORS Configuration
Comprehensive tests for the robust CORS configuration system
"""

import os
import pytest
from unittest.mock import patch
from app.core.cors_settings import CORSSettings, CORSEnvironment, CORSOrigin


class TestCORSOrigin:
    """Test CORS origin validation"""
    
    def test_valid_http_origin(self):
        """Test valid HTTP origin"""
        origin = CORSOrigin(url="http://localhost:3000")
        assert origin.url == "http://localhost:3000"
    
    def test_valid_https_origin(self):
        """Test valid HTTPS origin"""
        origin = CORSOrigin(url="https://example.com")
        assert origin.url == "https://example.com"
    
    def test_trailing_slash_removed(self):
        """Test trailing slash is removed"""
        origin = CORSOrigin(url="https://example.com/")
        assert origin.url == "https://example.com"
    
    def test_invalid_origin_no_protocol(self):
        """Test invalid origin without protocol"""
        with pytest.raises(ValueError, match="Must start with http:// or https://"):
            CORSOrigin(url="example.com")
    
    def test_invalid_origin_wildcard(self):
        """Test wildcard origins are rejected"""
        with pytest.raises(ValueError, match="Wildcard origins are not allowed"):
            CORSOrigin(url="http://*")
    
    def test_empty_origin(self):
        """Test empty origin is rejected"""
        with pytest.raises(ValueError, match="CORS origin cannot be empty"):
            CORSOrigin(url="")


class TestCORSSettings:
    """Test CORS settings configuration"""
    
    def test_default_development_environment(self):
        """Test default environment is development"""
        with patch.dict(os.environ, {}, clear=True):
            settings = CORSSettings()
            assert settings.environment == CORSEnvironment.DEVELOPMENT
    
    def test_staging_environment_detection(self):
        """Test staging environment detection"""
        with patch.dict(os.environ, {"ENVIRONMENT": "staging"}):
            settings = CORSSettings()
            assert settings.environment == CORSEnvironment.STAGING
    
    def test_production_environment_detection(self):
        """Test production environment detection"""
        with patch.dict(os.environ, {"NODE_ENV": "production"}):
            settings = CORSSettings()
            assert settings.environment == CORSEnvironment.PRODUCTION
    
    def test_development_origins(self):
        """Test development environment returns correct origins"""
        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            settings = CORSSettings()
            origins = settings.get_allowed_origins()
            
            # Should include localhost origins
            assert "http://localhost:3000" in origins
            assert "http://localhost:8080" in origins
            
            # Should also include staging origins in development
            assert "https://staging-wheelsandwins.netlify.app" in origins
    
    def test_staging_origins(self):
        """Test staging environment returns correct origins"""
        with patch.dict(os.environ, {"ENVIRONMENT": "staging"}):
            settings = CORSSettings()
            origins = settings.get_allowed_origins()
            
            # Should include staging origins
            assert "https://staging-wheelsandwins.netlify.app" in origins
            assert "https://wheels-wins-staging.netlify.app" in origins
            
            # Should also include development origins in staging
            assert "http://localhost:8080" in origins
    
    def test_production_origins(self):
        """Test production environment returns correct origins"""
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            settings = CORSSettings()
            origins = settings.get_allowed_origins()
            
            # Should include production origins
            assert "https://wheelsandwins.com" in origins
            assert "https://www.wheelsandwins.com" in origins
            
            # Should NOT include localhost in production
            assert "http://localhost:8080" not in origins
    
    def test_additional_origins_from_env(self):
        """Test parsing additional origins from environment variable"""
        with patch.dict(os.environ, {
            "CORS_ALLOWED_ORIGINS": "https://custom1.com,https://custom2.com"
        }):
            settings = CORSSettings()
            origins = settings.get_allowed_origins()
            
            assert "https://custom1.com" in origins
            assert "https://custom2.com" in origins
    
    def test_invalid_additional_origins_skipped(self):
        """Test invalid additional origins are skipped"""
        with patch.dict(os.environ, {
            "CORS_ALLOWED_ORIGINS": "https://valid.com,invalid-origin,http://*"
        }):
            settings = CORSSettings()
            origins = settings.get_allowed_origins()
            
            # Valid origin should be included
            assert "https://valid.com" in origins
            
            # Invalid origins should be skipped
            assert "invalid-origin" not in origins
            assert "http://*" not in origins
    
    def test_cors_middleware_config(self):
        """Test CORS middleware configuration generation"""
        settings = CORSSettings()
        config = settings.get_cors_middleware_config()
        
        assert "allow_origins" in config
        assert "allow_credentials" in config
        assert "allow_methods" in config
        assert "allow_headers" in config
        assert "expose_headers" in config
        assert "max_age" in config
        
        # Check defaults
        assert config["allow_credentials"] == True
        assert "GET" in config["allow_methods"]
        assert "POST" in config["allow_methods"]
        assert "Content-Type" in config["allow_headers"]
    
    def test_cors_disabled(self):
        """Test CORS can be disabled"""
        with patch.dict(os.environ, {"CORS_ENABLED": "false"}):
            settings = CORSSettings()
            config = settings.get_cors_middleware_config()
            assert config == {}
    
    def test_security_validation_production(self):
        """Test security validation in production"""
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            settings = CORSSettings()
            # Manually add localhost for testing
            settings.production_origins.append("http://localhost:3000")
            
            warnings = settings.validate_security()
            
            # Should warn about localhost in production
            assert any("Localhost origins in production" in warning for warning in warnings)
    
    def test_security_validation_wildcard(self):
        """Test security validation detects wildcards"""
        settings = CORSSettings()
        # Manually add wildcard for testing (normally prevented by validation)
        settings.development_origins.append("http://*")
        
        warnings = settings.validate_security()
        
        # Should warn about wildcard
        assert any("Wildcard origins detected" in warning for warning in warnings)
    
    def test_origin_deduplication(self):
        """Test that duplicate origins are removed"""
        with patch.dict(os.environ, {
            "CORS_ALLOWED_ORIGINS": "https://example.com,https://example.com"
        }):
            settings = CORSSettings()
            origins = settings.get_allowed_origins()
            
            # Count occurrences of the duplicate origin
            count = origins.count("https://example.com")
            assert count == 1  # Should only appear once


class TestCORSIntegration:
    """Test CORS integration with main configuration"""
    
    def test_cors_settings_singleton(self):
        """Test CORS settings singleton pattern"""
        from app.core.cors_settings import get_cors_settings
        
        settings1 = get_cors_settings()
        settings2 = get_cors_settings()
        
        assert settings1 is settings2  # Should be the same instance
    
    def test_cors_settings_with_render_environment(self):
        """Test CORS settings with Render deployment environment"""
        with patch.dict(os.environ, {
            "RENDER": "true",
            "ENVIRONMENT": "staging",
            "CORS_ALLOWED_ORIGINS": "https://staging-wheelsandwins.netlify.app,https://wheels-wins-staging.netlify.app"
        }):
            settings = CORSSettings()
            origins = settings.get_allowed_origins()
            
            assert "https://staging-wheelsandwins.netlify.app" in origins
            assert "https://wheels-wins-staging.netlify.app" in origins


if __name__ == "__main__":
    pytest.main([__file__, "-v"])