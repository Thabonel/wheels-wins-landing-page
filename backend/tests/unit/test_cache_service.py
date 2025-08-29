
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.cache import CacheService


class TestCacheService:
    """Unit tests for CacheService."""
    
    @pytest.fixture
    def cache_service(self):
        """Create CacheService instance with mocked Redis."""
        with patch('app.services.cache.aioredis') as mock_redis:
            mock_redis_client = AsyncMock()
            mock_redis.from_url.return_value = mock_redis_client
            
            service = CacheService()
            service.redis = mock_redis_client
            return service, mock_redis_client
    
    async def test_set_cache_success(self, cache_service):
        """Test successful cache set operation."""
        # Arrange
        service, mock_redis = cache_service
        key = "test_key"
        value = {"data": "test_value"}
        ttl = 300
        
        # Act
        await service.set(key, value, ttl)
        
        # Assert
        mock_redis.setex.assert_called_once()
    
    async def test_get_cache_success(self, cache_service):
        """Test successful cache get operation."""
        # Arrange
        service, mock_redis = cache_service
        key = "test_key"
        cached_value = '{"data": "test_value"}'
        mock_redis.get.return_value = cached_value.encode()
        
        # Act
        result = await service.get(key)
        
        # Assert
        assert result == {"data": "test_value"}
        mock_redis.get.assert_called_once_with(key)
    
    async def test_get_cache_miss(self, cache_service):
        """Test cache miss scenario."""
        # Arrange
        service, mock_redis = cache_service
        key = "non_existent_key"
        mock_redis.get.return_value = None
        
        # Act
        result = await service.get(key)
        
        # Assert
        assert result is None
    
    async def test_delete_cache(self, cache_service):
        """Test cache deletion."""
        # Arrange
        service, mock_redis = cache_service
        key = "test_key"
        
        # Act
        await service.delete(key)
        
        # Assert
        mock_redis.delete.assert_called_once_with(key)
    
    async def test_exists_cache_true(self, cache_service):
        """Test cache key exists."""
        # Arrange
        service, mock_redis = cache_service
        key = "existing_key"
        mock_redis.exists.return_value = 1
        
        # Act
        result = await service.exists(key)
        
        # Assert
        assert result is True
        mock_redis.exists.assert_called_once_with(key)
    
    async def test_exists_cache_false(self, cache_service):
        """Test cache key does not exist."""
        # Arrange
        service, mock_redis = cache_service
        key = "non_existing_key"
        mock_redis.exists.return_value = 0
        
        # Act
        result = await service.exists(key)
        
        # Assert
        assert result is False
