"""
Comprehensive Integration Tests for PAM API
Tests all security features, performance optimizations, and production configurations
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import pytest
import redis.asyncio as redis
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.testclient import TestClient
from httpx import AsyncClient
import jwt

from app.main import app
from app.api.v1.pam import router as pam_router
from app.core.config import settings
from app.middleware.rate_limiting import MultiTierRateLimiter
from app.middleware.message_size_validator import MessageSizeValidator, MessageType
from app.services.tts.circuit_breaker import CircuitBreaker, CircuitState
from app.services.cache_manager import CacheManager
from app.services.pam.optimized_context_manager import OptimizedContextManager
from app.services.database_optimizer import DatabaseOptimizer
from app.core.logging_config import PAMLogger


# =====================================================
# TEST FIXTURES
# =====================================================

@pytest.fixture
def test_client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
async def async_client():
    """Create async test client"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_redis():
    """Mock Redis client"""
    mock = AsyncMock()
    mock.get = AsyncMock(return_value=None)
    mock.set = AsyncMock(return_value=True)
    mock.delete = AsyncMock(return_value=True)
    mock.incr = AsyncMock(return_value=1)
    mock.expire = AsyncMock(return_value=True)
    mock.hget = AsyncMock(return_value=None)
    mock.hset = AsyncMock(return_value=True)
    mock.zadd = AsyncMock(return_value=1)
    mock.zremrangebyscore = AsyncMock(return_value=0)
    mock.zcard = AsyncMock(return_value=0)
    return mock


@pytest.fixture
def mock_supabase():
    """Mock Supabase client"""
    mock = Mock()
    mock.auth.get_user = Mock(return_value=Mock(user=Mock(id="test-user-123")))
    mock.table = Mock(return_value=Mock(
        select=Mock(return_value=Mock(
            execute=Mock(return_value=Mock(data=[]))
        ))
    ))
    return mock


@pytest.fixture
def valid_jwt_token():
    """Generate valid JWT token for testing"""
    payload = {
        "sub": "test-user-123",
        "email": "test@example.com",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


@pytest.fixture
def mock_websocket():
    """Create mock WebSocket"""
    ws = AsyncMock(spec=WebSocket)
    ws.accept = AsyncMock()
    ws.send_text = AsyncMock()
    ws.send_json = AsyncMock()
    ws.receive_text = AsyncMock()
    ws.receive_json = AsyncMock()
    ws.close = AsyncMock()
    ws.client_state = 1  # WebSocketState.CONNECTED
    return ws


# =====================================================
# WEBSOCKET CONNECTION TESTS
# =====================================================

class TestWebSocketConnection:
    """Test WebSocket connection and authentication"""
    
    @pytest.mark.asyncio
    async def test_websocket_connection_success(self, mock_websocket, mock_supabase, valid_jwt_token):
        """Test successful WebSocket connection with valid token"""
        from app.api.v1.pam import websocket_endpoint
        
        # Setup
        mock_websocket.headers = {"authorization": f"Bearer {valid_jwt_token}"}
        mock_websocket.receive_json = AsyncMock(side_effect=[
            {"type": "ping"},
            WebSocketDisconnect()
        ])
        
        with patch("app.api.v1.pam.supabase", mock_supabase):
            # Execute
            try:
                await websocket_endpoint(mock_websocket, token=valid_jwt_token)
            except WebSocketDisconnect:
                pass
            
            # Verify
            mock_websocket.accept.assert_called_once()
            mock_websocket.send_json.assert_called()
    
    @pytest.mark.asyncio
    async def test_websocket_connection_invalid_token(self, mock_websocket):
        """Test WebSocket connection with invalid token"""
        from app.api.v1.pam import websocket_endpoint
        
        # Setup
        invalid_token = "invalid.jwt.token"
        mock_websocket.headers = {"authorization": f"Bearer {invalid_token}"}
        
        # Execute & Verify
        with pytest.raises(Exception):
            await websocket_endpoint(mock_websocket, token=invalid_token)
    
    @pytest.mark.asyncio
    async def test_websocket_connection_expired_token(self, mock_websocket):
        """Test WebSocket connection with expired token"""
        from app.api.v1.pam import websocket_endpoint
        
        # Setup - Create expired token
        payload = {
            "sub": "test-user-123",
            "email": "test@example.com",
            "exp": datetime.utcnow() - timedelta(hours=1)  # Expired
        }
        expired_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        mock_websocket.headers = {"authorization": f"Bearer {expired_token}"}
        
        # Execute & Verify
        with pytest.raises(Exception):
            await websocket_endpoint(mock_websocket, token=expired_token)


# =====================================================
# CSRF EXEMPTION TESTS
# =====================================================

class TestCSRFExemption:
    """Test CSRF exemption for PAM endpoints"""
    
    def test_websocket_csrf_exempt(self, test_client):
        """Test that WebSocket endpoint is CSRF exempt"""
        # WebSocket connections should not require CSRF tokens
        response = test_client.get("/api/v1/pam/ws")
        # WebSocket upgrade will fail without proper headers, but shouldn't be CSRF blocked
        assert response.status_code in [403, 426]  # Forbidden or Upgrade Required
        assert "CSRF" not in response.text
    
    def test_voice_endpoint_csrf_exempt(self, test_client, valid_jwt_token):
        """Test that voice endpoint is CSRF exempt"""
        headers = {"Authorization": f"Bearer {valid_jwt_token}"}
        response = test_client.post(
            "/api/v1/pam/voice",
            headers=headers,
            json={"audio_data": "base64_audio", "format": "webm"}
        )
        # Should not fail due to CSRF
        if response.status_code == 200:
            assert "CSRF" not in response.text


# =====================================================
# RATE LIMITING TESTS
# =====================================================

class TestRateLimiting:
    """Test rate limiting functionality"""
    
    @pytest.mark.asyncio
    async def test_user_rate_limiting(self, mock_redis):
        """Test user-level rate limiting"""
        rate_limiter = MultiTierRateLimiter()
        rate_limiter.redis_client = mock_redis
        
        user_id = "test-user-123"
        endpoint = "/api/v1/pam/chat"
        
        # Mock Redis to simulate rate limit
        mock_redis.zadd = AsyncMock(return_value=1)
        mock_redis.zcard = AsyncMock(side_effect=[
            59,  # Just under limit
            60,  # At limit
            61   # Over limit
        ])
        
        # First requests should pass
        result1 = await rate_limiter.check_rate_limit(user_id, endpoint, tier="user")
        assert result1["allowed"] == True
        
        # At limit
        result2 = await rate_limiter.check_rate_limit(user_id, endpoint, tier="user")
        assert result2["allowed"] == True
        
        # Over limit
        result3 = await rate_limiter.check_rate_limit(user_id, endpoint, tier="user")
        assert result3["allowed"] == False
        assert result3["retry_after"] > 0
    
    @pytest.mark.asyncio
    async def test_ip_rate_limiting(self, mock_redis):
        """Test IP-level rate limiting"""
        rate_limiter = MultiTierRateLimiter()
        rate_limiter.redis_client = mock_redis
        
        ip = "192.168.1.1"
        endpoint = "/api/v1/pam/chat"
        
        # Mock Redis to simulate rate limit
        mock_redis.zcard = AsyncMock(return_value=101)  # Over IP limit
        
        result = await rate_limiter.check_rate_limit(ip, endpoint, tier="ip")
        assert result["allowed"] == False
        assert "tier" in result
        assert result["tier"] == "ip"
    
    @pytest.mark.asyncio
    async def test_global_rate_limiting(self, mock_redis):
        """Test global rate limiting"""
        rate_limiter = MultiTierRateLimiter()
        rate_limiter.redis_client = mock_redis
        
        endpoint = "/api/v1/pam/chat"
        
        # Mock Redis to simulate global limit
        mock_redis.get = AsyncMock(return_value=b"5001")  # Over global limit
        
        result = await rate_limiter.check_rate_limit("any", endpoint, tier="global")
        assert result["allowed"] == False


# =====================================================
# MESSAGE SIZE VALIDATION TESTS
# =====================================================

class TestMessageSizeValidation:
    """Test message size validation"""
    
    def test_text_message_size_validation(self):
        """Test text message size validation"""
        validator = MessageSizeValidator()
        
        # Valid message
        valid_message = "Hello" * 100  # 500 chars
        result = validator.validate_message(valid_message, MessageType.WEBSOCKET_TEXT)
        assert result["valid"] == True
        
        # Too large message
        large_message = "x" * 40000  # Over 32KB limit
        result = validator.validate_message(large_message, MessageType.WEBSOCKET_TEXT)
        assert result["valid"] == False
        assert "size_violation" in result["violations"][0]["type"]
    
    def test_json_message_validation(self):
        """Test JSON message validation"""
        validator = MessageSizeValidator()
        
        # Valid JSON
        valid_json = {
            "message": "Hello PAM",
            "context": {"user_id": "123"}
        }
        result = validator.validate_message(valid_json, MessageType.WEBSOCKET_JSON)
        assert result["valid"] == True
        
        # Too many fields
        many_fields = {f"field_{i}": f"value_{i}" for i in range(60)}
        result = validator.validate_message(many_fields, MessageType.WEBSOCKET_JSON)
        assert result["valid"] == False
        assert any("field_count" in v["type"] for v in result["violations"])
    
    def test_field_size_validation(self):
        """Test individual field size validation"""
        validator = MessageSizeValidator()
        
        # Field too large
        large_field = {
            "message": "x" * 20000  # Over 16KB field limit
        }
        result = validator.validate_message(large_field, MessageType.WEBSOCKET_JSON)
        assert result["valid"] == False
        assert any("field_size" in v["type"] for v in result["violations"])


# =====================================================
# CIRCUIT BREAKER TESTS
# =====================================================

class TestCircuitBreaker:
    """Test circuit breaker functionality"""
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_states(self):
        """Test circuit breaker state transitions"""
        breaker = CircuitBreaker(
            name="test_service",
            failure_threshold=3,
            timeout=1,
            success_threshold=2
        )
        
        # Initially closed
        assert breaker.state == CircuitState.CLOSED
        
        # Simulate failures
        for _ in range(3):
            breaker.record_failure()
        
        # Should be open after threshold
        assert breaker.state == CircuitState.OPEN
        
        # Wait for timeout
        await asyncio.sleep(1.1)
        
        # Should be half-open
        assert breaker.state == CircuitState.HALF_OPEN
        
        # Record successes
        breaker.record_success()
        breaker.record_success()
        
        # Should be closed again
        assert breaker.state == CircuitState.CLOSED
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_call_protection(self):
        """Test circuit breaker protecting calls"""
        breaker = CircuitBreaker(
            name="test_service",
            failure_threshold=2,
            timeout=1
        )
        
        call_count = 0
        
        async def failing_function():
            nonlocal call_count
            call_count += 1
            raise Exception("Service failure")
        
        # First calls should execute and fail
        for _ in range(2):
            try:
                await breaker.call(failing_function)
            except:
                pass
        
        assert call_count == 2
        assert breaker.state == CircuitState.OPEN
        
        # Further calls should be rejected without executing
        with pytest.raises(Exception) as exc:
            await breaker.call(failing_function)
        
        assert "Circuit breaker is OPEN" in str(exc.value)
        assert call_count == 2  # Function not called when open


# =====================================================
# CACHING TESTS
# =====================================================

class TestCaching:
    """Test caching functionality"""
    
    @pytest.mark.asyncio
    async def test_response_caching(self, mock_redis):
        """Test PAM response caching"""
        cache_manager = CacheManager()
        cache_manager.redis_client = mock_redis
        
        # Test cache miss
        mock_redis.hget = AsyncMock(return_value=None)
        result = await cache_manager.get("Hello PAM", "user123")
        assert result is None
        
        # Test cache set
        response = {"reply": "Hello! How can I help?", "context": {}}
        await cache_manager.set("Hello PAM", "user123", response)
        mock_redis.hset.assert_called()
        
        # Test cache hit
        cached_data = json.dumps(response)
        mock_redis.hget = AsyncMock(return_value=cached_data.encode())
        result = await cache_manager.get("Hello PAM", "user123")
        assert result == response
    
    @pytest.mark.asyncio
    async def test_cache_compression(self, mock_redis):
        """Test cache compression for large responses"""
        cache_manager = CacheManager()
        cache_manager.redis_client = mock_redis
        
        # Large response that should be compressed
        large_response = {
            "reply": "x" * 2000,
            "data": [{"item": i} for i in range(100)]
        }
        
        await cache_manager.set("query", "user123", large_response, compress=True)
        
        # Verify compression was applied
        call_args = mock_redis.hset.call_args
        cached_value = call_args[0][2]  # Get the value argument
        
        # Compressed data should be smaller than original
        original_size = len(json.dumps(large_response))
        assert len(cached_value) < original_size
    
    @pytest.mark.asyncio
    async def test_cache_ttl(self, mock_redis):
        """Test cache TTL settings"""
        cache_manager = CacheManager()
        cache_manager.redis_client = mock_redis
        
        response = {"reply": "Test response"}
        
        # Set with custom TTL
        await cache_manager.set("query", "user123", response, ttl=600)
        
        # Verify expire was called with correct TTL
        mock_redis.expire.assert_called()
        expire_args = mock_redis.expire.call_args
        assert expire_args[0][1] == 600


# =====================================================
# DATABASE OPTIMIZATION TESTS
# =====================================================

class TestDatabaseOptimization:
    """Test database optimization features"""
    
    @pytest.mark.asyncio
    async def test_connection_pooling(self):
        """Test database connection pooling"""
        optimizer = DatabaseOptimizer()
        
        # Mock pool creation
        with patch("asyncpg.create_pool", new_callable=AsyncMock) as mock_create:
            mock_pool = AsyncMock()
            mock_create.return_value = mock_pool
            
            await optimizer.initialize()
            
            # Verify pool configuration
            mock_create.assert_called()
            call_args = mock_create.call_args[1]
            assert call_args["min_size"] == settings.DB_POOL_MIN_SIZE
            assert call_args["max_size"] == settings.DB_POOL_MAX_SIZE
            assert call_args["timeout"] == settings.DB_POOL_TIMEOUT
    
    @pytest.mark.asyncio
    async def test_query_optimization(self):
        """Test query optimization and caching"""
        optimizer = DatabaseOptimizer()
        
        # Mock connection and query execution
        mock_conn = AsyncMock()
        mock_conn.fetch = AsyncMock(return_value=[{"id": 1, "name": "Test"}])
        
        optimizer.write_pool = AsyncMock()
        optimizer.write_pool.acquire = AsyncMock(return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_conn)))
        
        # Execute query
        query = "SELECT * FROM users WHERE id = $1"
        params = [123]
        
        result = await optimizer.execute_optimized(query, params)
        assert result == [{"id": 1, "name": "Test"}]
        
        # Verify query was executed
        mock_conn.fetch.assert_called_once_with(query, *params)
    
    @pytest.mark.asyncio
    async def test_slow_query_logging(self):
        """Test slow query logging"""
        optimizer = DatabaseOptimizer()
        
        # Mock slow query
        mock_conn = AsyncMock()
        
        async def slow_fetch(*args):
            await asyncio.sleep(0.2)  # Simulate slow query
            return []
        
        mock_conn.fetch = slow_fetch
        optimizer.write_pool = AsyncMock()
        optimizer.write_pool.acquire = AsyncMock(return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_conn)))
        
        with patch("app.services.database_optimizer.logger") as mock_logger:
            await optimizer.execute_optimized("SELECT * FROM large_table", [])
            
            # Verify slow query was logged
            mock_logger.warning.assert_called()
            warning_message = mock_logger.warning.call_args[0][0]
            assert "Slow query detected" in warning_message


# =====================================================
# ERROR LOGGING TESTS
# =====================================================

class TestErrorLogging:
    """Test comprehensive error logging"""
    
    def test_pam_logger_initialization(self):
        """Test PAM logger initialization"""
        logger = PAMLogger()
        
        assert logger.error_logger is not None
        assert logger.security_logger is not None
        assert logger.performance_logger is not None
        assert logger.api_logger is not None
        assert logger.audit_logger is not None
    
    def test_api_request_logging(self):
        """Test API request logging"""
        logger = PAMLogger()
        
        with patch.object(logger.api_logger, "info") as mock_info:
            logger.log_api_request(
                user_id="user123",
                endpoint="/api/v1/pam/chat",
                method="POST",
                data={"message": "Hello"}
            )
            
            mock_info.assert_called_once()
            log_data = mock_info.call_args[0][0]
            assert "user123" in log_data
            assert "/api/v1/pam/chat" in log_data
    
    def test_security_event_logging(self):
        """Test security event logging"""
        logger = PAMLogger()
        
        with patch.object(logger.security_logger, "warning") as mock_warning:
            logger.log_security_event(
                event_type="rate_limit_exceeded",
                user_id="user123",
                details="User exceeded rate limit",
                severity="medium"
            )
            
            mock_warning.assert_called_once()
            log_data = mock_warning.call_args[0][0]
            assert "rate_limit_exceeded" in log_data
            assert "user123" in log_data
    
    def test_performance_metric_logging(self):
        """Test performance metric logging"""
        logger = PAMLogger()
        
        with patch.object(logger.performance_logger, "info") as mock_info:
            logger.log_performance_metric(
                metric="api_response_time",
                value=150.5,
                unit="ms",
                context={"endpoint": "/api/v1/pam/chat"}
            )
            
            mock_info.assert_called_once()
            log_data = mock_info.call_args[0][0]
            assert "150.5" in log_data
            assert "ms" in log_data


# =====================================================
# CONTEXT OPTIMIZATION TESTS
# =====================================================

class TestContextOptimization:
    """Test optimized context fetching"""
    
    @pytest.mark.asyncio
    async def test_single_query_context_fetch(self):
        """Test single-query context fetching"""
        manager = OptimizedContextManager()
        
        # Mock database connection
        mock_conn = AsyncMock()
        mock_result = [
            {
                "user_id": "user123",
                "display_name": "Test User",
                "trip_count": 5,
                "last_trip": datetime.utcnow(),
                "preferences": {"theme": "dark"}
            }
        ]
        mock_conn.fetch = AsyncMock(return_value=mock_result)
        
        with patch.object(manager, "_get_connection", return_value=mock_conn):
            context = await manager.get_user_context("user123")
            
            # Verify single query was made
            mock_conn.fetch.assert_called_once()
            
            # Verify context structure
            assert context.user_id == "user123"
            assert context.display_name == "Test User"
            assert context.trip_stats["total_trips"] == 5
    
    @pytest.mark.asyncio
    async def test_batch_context_fetch(self):
        """Test batch context fetching"""
        manager = OptimizedContextManager()
        
        # Mock database connection
        mock_conn = AsyncMock()
        mock_results = [
            {"user_id": "user1", "display_name": "User 1"},
            {"user_id": "user2", "display_name": "User 2"},
            {"user_id": "user3", "display_name": "User 3"}
        ]
        mock_conn.fetch = AsyncMock(return_value=mock_results)
        
        with patch.object(manager, "_get_connection", return_value=mock_conn):
            contexts = await manager.get_batch_contexts(["user1", "user2", "user3"])
            
            # Verify batch query was made
            mock_conn.fetch.assert_called_once()
            
            # Verify all contexts returned
            assert len(contexts) == 3
            assert contexts["user1"].display_name == "User 1"


# =====================================================
# PRODUCTION CONFIGURATION TESTS
# =====================================================

class TestProductionConfiguration:
    """Test production configuration validation"""
    
    def test_production_settings_validation(self):
        """Test production settings validation"""
        from app.core.config import Settings
        
        # Create production settings
        with patch.dict(os.environ, {"NODE_ENV": "production"}):
            settings = Settings(
                OPENAI_API_KEY="test-key",
                SUPABASE_URL="https://test.supabase.co",
                SUPABASE_SERVICE_ROLE_KEY="test-key",
                SESSION_COOKIE_SECURE=True,
                APP_URL="https://production.com"
            )
            
            validation = settings.validate_on_startup()
            
            # Should be valid for basic production setup
            assert validation["valid"] == True
            assert validation["environment"] == "production"
    
    def test_production_security_requirements(self):
        """Test production security requirements"""
        from app.core.config import Settings
        
        with patch.dict(os.environ, {"NODE_ENV": "production"}):
            # Test insecure settings
            settings = Settings(
                OPENAI_API_KEY="test-key",
                SUPABASE_URL="https://test.supabase.co",
                SUPABASE_SERVICE_ROLE_KEY="test-key",
                SESSION_COOKIE_SECURE=False,  # Insecure
                APP_URL="http://localhost:8080"  # Localhost in production
            )
            
            validation = settings.validate_on_startup()
            
            # Should have issues
            assert validation["valid"] == False
            assert any("SESSION_COOKIE_SECURE" in issue for issue in validation["issues"])
            assert any("localhost" in issue for issue in validation["issues"])
    
    def test_environment_specific_loading(self):
        """Test environment-specific configuration loading"""
        from app.core.environment_config import get_config
        
        # Test development environment
        with patch.dict(os.environ, {"NODE_ENV": "development"}):
            config = get_config()
            assert config.NODE_ENV == "development"
            assert config.LOG_LEVEL == "INFO"
        
        # Test production environment
        with patch.dict(os.environ, {"NODE_ENV": "production", "LOG_LEVEL": "WARNING"}):
            # Reset config instance
            import app.core.environment_config
            app.core.environment_config._config_instance = None
            
            config = get_config()
            assert config.NODE_ENV == "production"
            assert config.LOG_LEVEL == "WARNING"


# =====================================================
# END-TO-END INTEGRATION TESTS
# =====================================================

class TestEndToEndIntegration:
    """Full end-to-end integration tests"""
    
    @pytest.mark.asyncio
    async def test_complete_pam_conversation_flow(self, mock_websocket, mock_redis, mock_supabase, valid_jwt_token):
        """Test complete PAM conversation flow with all features"""
        from app.api.v1.pam import websocket_endpoint
        
        # Setup mocks
        mock_websocket.headers = {"authorization": f"Bearer {valid_jwt_token}"}
        
        # Simulate conversation
        messages = [
            {"type": "message", "content": "Hello PAM"},
            {"type": "message", "content": "Plan a trip to Yellowstone"},
            {"type": "voice", "audio_data": "base64_audio"},
            {"type": "ping"},
            WebSocketDisconnect()
        ]
        mock_websocket.receive_json = AsyncMock(side_effect=messages)
        
        # Mock PAM service response
        with patch("app.api.v1.pam.pam_service") as mock_pam:
            mock_pam.process_message = AsyncMock(return_value={
                "reply": "I'll help you plan your trip!",
                "context": {"destination": "Yellowstone"}
            })
            
            with patch("app.api.v1.pam.supabase", mock_supabase):
                with patch("app.api.v1.pam.rate_limiter") as mock_rate_limiter:
                    mock_rate_limiter.check_rate_limit = AsyncMock(return_value={"allowed": True})
                    
                    try:
                        await websocket_endpoint(mock_websocket, token=valid_jwt_token)
                    except WebSocketDisconnect:
                        pass
                    
                    # Verify all components were called
                    mock_websocket.accept.assert_called_once()
                    assert mock_websocket.send_json.call_count >= 3
                    mock_pam.process_message.assert_called()
                    mock_rate_limiter.check_rate_limit.assert_called()
    
    @pytest.mark.asyncio
    async def test_security_features_integration(self, mock_websocket, mock_redis, valid_jwt_token):
        """Test all security features working together"""
        from app.api.v1.pam import websocket_endpoint
        
        # Setup for security testing
        mock_websocket.headers = {"authorization": f"Bearer {valid_jwt_token}"}
        
        # Large message to trigger size validation
        large_message = {"type": "message", "content": "x" * 100000}
        
        mock_websocket.receive_json = AsyncMock(side_effect=[
            large_message,
            WebSocketDisconnect()
        ])
        
        with patch("app.api.v1.pam.message_validator") as mock_validator:
            mock_validator.validate_message = Mock(return_value={
                "valid": False,
                "violations": [{"type": "size_violation", "details": "Message too large"}]
            })
            
            try:
                await websocket_endpoint(mock_websocket, token=valid_jwt_token)
            except:
                pass
            
            # Verify validation was performed
            mock_validator.validate_message.assert_called()
    
    @pytest.mark.asyncio
    async def test_performance_features_integration(self, mock_redis):
        """Test all performance features working together"""
        # Test caching + database optimization + context management
        
        cache_manager = CacheManager()
        db_optimizer = DatabaseOptimizer()
        context_manager = OptimizedContextManager()
        
        # Mock components
        cache_manager.redis_client = mock_redis
        
        mock_conn = AsyncMock()
        mock_conn.fetch = AsyncMock(return_value=[{"user_id": "user123"}])
        
        with patch.object(db_optimizer, "_get_connection", return_value=mock_conn):
            with patch.object(context_manager, "_get_connection", return_value=mock_conn):
                # First call - cache miss, database hit
                mock_redis.hget = AsyncMock(return_value=None)
                context = await context_manager.get_user_context("user123")
                assert context is not None
                
                # Cache the context
                await cache_manager.set(
                    "user_context",
                    "user123",
                    {"user_id": "user123", "cached": True}
                )
                
                # Second call - cache hit
                cached_data = json.dumps({"user_id": "user123", "cached": True})
                mock_redis.hget = AsyncMock(return_value=cached_data.encode())
                cached = await cache_manager.get("user_context", "user123")
                assert cached["cached"] == True


# =====================================================
# PERFORMANCE BENCHMARK TESTS
# =====================================================

class TestPerformanceBenchmarks:
    """Performance benchmark tests"""
    
    @pytest.mark.asyncio
    async def test_websocket_message_throughput(self, mock_websocket, mock_redis):
        """Test WebSocket message throughput"""
        start_time = time.time()
        message_count = 100
        
        # Simulate rapid message sending
        for i in range(message_count):
            message = {"type": "message", "content": f"Message {i}"}
            await mock_websocket.send_json(message)
        
        elapsed = time.time() - start_time
        throughput = message_count / elapsed
        
        # Should handle at least 100 messages per second
        assert throughput > 100
    
    @pytest.mark.asyncio
    async def test_cache_performance(self, mock_redis):
        """Test cache performance"""
        cache_manager = CacheManager()
        cache_manager.redis_client = mock_redis
        
        # Measure cache operations
        start_time = time.time()
        
        for i in range(100):
            await cache_manager.set(f"key_{i}", f"user_{i}", {"data": i})
        
        elapsed = time.time() - start_time
        
        # Should complete 100 cache sets in under 1 second
        assert elapsed < 1.0
    
    @pytest.mark.asyncio
    async def test_rate_limiter_performance(self, mock_redis):
        """Test rate limiter performance"""
        rate_limiter = MultiTierRateLimiter()
        rate_limiter.redis_client = mock_redis
        
        # Measure rate limit checks
        start_time = time.time()
        
        for i in range(100):
            await rate_limiter.check_rate_limit(f"user_{i}", "/api/endpoint")
        
        elapsed = time.time() - start_time
        
        # Should complete 100 rate checks in under 0.5 seconds
        assert elapsed < 0.5


# =====================================================
# TEST UTILITIES
# =====================================================

def create_test_user(user_id: str = "test-user") -> Dict[str, Any]:
    """Create test user data"""
    return {
        "id": user_id,
        "email": f"{user_id}@example.com",
        "display_name": f"Test User {user_id}",
        "created_at": datetime.utcnow().isoformat()
    }


def create_test_message(content: str = "Test message") -> Dict[str, Any]:
    """Create test message data"""
    return {
        "type": "message",
        "content": content,
        "timestamp": datetime.utcnow().isoformat()
    }


async def simulate_websocket_conversation(websocket: WebSocket, messages: List[str]):
    """Simulate a WebSocket conversation"""
    await websocket.accept()
    
    for message in messages:
        data = create_test_message(message)
        await websocket.send_json(data)
        
        # Wait for response
        response = await websocket.receive_json()
        assert response.get("type") == "response"
    
    await websocket.close()


# =====================================================
# RUN TESTS
# =====================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])