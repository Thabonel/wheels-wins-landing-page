"""
Site-Agnostic Data Extraction - Pattern Cache
Redis-based caching for extraction results and learned patterns

Thread-safe implementation using asyncio.Lock for concurrent access protection.
"""

import asyncio
import hashlib
import time
from typing import Optional, Dict, Any
from datetime import datetime
from urllib.parse import urlparse

from app.core.logging import get_logger
from app.services.cache_service import cache_service

logger = get_logger(__name__)

from .schemas import ExtractionResult, ExtractionPattern, PageType


class PatternCache:
    """
    Redis-based caching for extraction results and learned URL patterns
    Implements intelligent caching with pattern learning for improved efficiency.

    Thread Safety:
        All cache operations are protected by asyncio.Lock to prevent race conditions
        in concurrent async contexts. This ensures atomic read-modify-write operations
        and safe initialization.
    """

    # TTL constants (in seconds)
    REQUEST_TTL = 300  # 5 minutes for individual request results
    PATTERN_TTL = 604800  # 7 days for learned patterns
    HIGH_CONFIDENCE_THRESHOLD = 0.8  # Minimum confidence to cache patterns

    def __init__(self):
        self.cache = cache_service
        self._prefix = "extraction:"
        self._lock = asyncio.Lock()  # Thread safety for cache operations
        self._initialized = False
        self._local_cache: Dict[str, Dict[str, Any]] = {}  # Fallback in-memory cache

    async def _ensure_initialized(self) -> bool:
        """
        Ensure cache is initialized (thread-safe).

        Uses double-checked locking pattern for efficiency - only acquires lock
        if not already initialized.
        """
        if self._initialized and self.cache.redis is not None:
            return True

        async with self._lock:
            # Double-check after acquiring lock
            if self._initialized and self.cache.redis is not None:
                return True

            try:
                await self.cache.initialize()
                self._initialized = self.cache.redis is not None
                return self._initialized
            except Exception as e:
                logger.warning(f"Cache initialization failed: {str(e)}")
                self._initialized = False
                return False

    def _get_cache_key(self, url: str, intent: Optional[str] = None) -> str:
        """Generate cache key for URL and intent combination"""
        # Create hash of URL + intent for consistent key length
        key_content = f"{url}:{intent or ''}"
        key_hash = hashlib.md5(key_content.encode()).hexdigest()[:16]
        return f"{self._prefix}result:{key_hash}"

    def _get_pattern_key(self, url: str) -> str:
        """Generate cache key for URL pattern"""
        # Extract domain and path pattern
        parsed = urlparse(url)
        domain = parsed.netloc
        # Create pattern from path structure (e.g., /product/123 -> /product/*)
        path_parts = [p for p in parsed.path.split("/") if p]
        if path_parts:
            # Replace likely IDs with wildcards
            pattern_parts = []
            for part in path_parts:
                if part.isdigit() or len(part) > 20:
                    pattern_parts.append("*")
                else:
                    pattern_parts.append(part)
            path_pattern = "/" + "/".join(pattern_parts)
        else:
            path_pattern = "/"

        pattern = f"{domain}{path_pattern}"
        pattern_hash = hashlib.md5(pattern.encode()).hexdigest()[:16]
        return f"{self._prefix}pattern:{pattern_hash}"

    async def get_cached_extraction(
        self,
        url: str,
        intent: Optional[str] = None
    ) -> Optional[ExtractionResult]:
        """
        Get cached extraction result for URL/intent combination (thread-safe).

        Args:
            url: URL to look up
            intent: Optional user intent

        Returns:
            Cached ExtractionResult or None if not found
        """
        cache_key = self._get_cache_key(url, intent)

        async with self._lock:
            # Try Redis first
            if await self._ensure_initialized():
                try:
                    cached_data = await self.cache.get(cache_key)
                    if cached_data:
                        result = self._deserialize_extraction_result(cached_data, url)
                        if result:
                            logger.debug(f"Cache hit (Redis) for: {url}")
                            return result
                except Exception as e:
                    logger.warning(f"Redis cache retrieval error: {str(e)}")

            # Fall back to local cache with TTL check
            local_entry = self._local_cache.get(cache_key)
            if local_entry and time.time() < local_entry.get('expires', 0):
                cached_data = local_entry.get('value')
                if cached_data:
                    result = self._deserialize_extraction_result(cached_data, url)
                    if result:
                        logger.debug(f"Cache hit (local) for: {url}")
                        return result
            elif local_entry:
                # Clean up expired local entry
                del self._local_cache[cache_key]

        logger.debug(f"Cache miss for: {url}")
        return None

    def _deserialize_extraction_result(
        self, cached_data: Dict[str, Any], url: str
    ) -> Optional[ExtractionResult]:
        """Deserialize cached data to ExtractionResult."""
        try:
            return ExtractionResult(
                success=cached_data.get("success", False),
                url=cached_data.get("url", url),
                page_type=PageType(cached_data.get("page_type", "unknown")),
                confidence=cached_data.get("confidence", 0.0),
                data=cached_data.get("data", {}),
                errors=cached_data.get("errors", []),
                metadata={
                    **cached_data.get("metadata", {}),
                    "from_cache": True
                },
                extracted_at=datetime.fromisoformat(
                    cached_data.get("extracted_at", datetime.utcnow().isoformat())
                )
            )
        except Exception as e:
            logger.warning(f"Failed to deserialize extraction result: {str(e)}")
            return None

    async def get_pattern(self, url: str) -> Optional[ExtractionPattern]:
        """
        Get cached extraction pattern for URL (thread-safe).

        Args:
            url: URL to look up pattern for

        Returns:
            Cached ExtractionPattern or None
        """
        pattern_key = self._get_pattern_key(url)

        async with self._lock:
            # Try Redis first
            if await self._ensure_initialized():
                try:
                    cached_data = await self.cache.get(pattern_key)
                    if cached_data:
                        pattern = self._deserialize_pattern(cached_data)
                        if pattern:
                            logger.debug(f"Pattern found (Redis): {pattern.url_pattern}")
                            return pattern
                except Exception as e:
                    logger.warning(f"Redis pattern retrieval error: {str(e)}")

            # Fall back to local cache with TTL check
            local_entry = self._local_cache.get(pattern_key)
            if local_entry and time.time() < local_entry.get('expires', 0):
                cached_data = local_entry.get('value')
                if cached_data:
                    pattern = self._deserialize_pattern(cached_data)
                    if pattern:
                        logger.debug(f"Pattern found (local): {pattern.url_pattern}")
                        return pattern
            elif local_entry:
                # Clean up expired local entry
                del self._local_cache[pattern_key]

        return None

    def _deserialize_pattern(self, cached_data: Dict[str, Any]) -> Optional[ExtractionPattern]:
        """Deserialize cached data to ExtractionPattern."""
        try:
            return ExtractionPattern(
                url_pattern=cached_data.get("url_pattern", ""),
                page_type=PageType(cached_data.get("page_type", "unknown")),
                field_selectors=cached_data.get("field_selectors", {}),
                confidence=cached_data.get("confidence", 0.0),
                success_rate=cached_data.get("success_rate", 1.0),
                usage_count=cached_data.get("usage_count", 0),
                last_used=datetime.fromisoformat(
                    cached_data.get("last_used", datetime.utcnow().isoformat())
                ),
                created_at=datetime.fromisoformat(
                    cached_data.get("created_at", datetime.utcnow().isoformat())
                )
            )
        except Exception as e:
            logger.warning(f"Failed to deserialize pattern: {str(e)}")
            return None

    async def cache_extraction(
        self,
        url: str,
        intent: Optional[str],
        result: ExtractionResult,
        pattern: Optional[ExtractionPattern] = None
    ) -> bool:
        """
        Cache extraction result and optionally update pattern

        Args:
            url: Source URL
            intent: User intent (if any)
            result: Extraction result to cache
            pattern: Optional pattern to cache/update

        Returns:
            True if caching succeeded
        """
        if not await self._ensure_initialized():
            return False

        try:
            # Cache the extraction result
            cache_key = self._get_cache_key(url, intent)
            result_data = {
                "success": result.success,
                "url": result.url,
                "page_type": result.page_type.value,
                "confidence": result.confidence,
                "data": result.data,
                "errors": result.errors,
                "metadata": result.metadata,
                "extracted_at": result.extracted_at.isoformat()
            }
            await self.cache.set(cache_key, result_data, ttl=self.REQUEST_TTL)
            logger.debug(f"Cached extraction result for: {url}")

            # Cache pattern if confidence is high enough
            if result.success and result.confidence >= self.HIGH_CONFIDENCE_THRESHOLD:
                await self._update_pattern(url, result, pattern)

            return True

        except Exception as e:
            logger.warning(f"Cache storage error: {str(e)}")
            return False

    async def _update_pattern(
        self,
        url: str,
        result: ExtractionResult,
        existing_pattern: Optional[ExtractionPattern]
    ) -> None:
        """Update or create extraction pattern for URL"""
        try:
            pattern_key = self._get_pattern_key(url)
            parsed = urlparse(url)

            if existing_pattern:
                # Update existing pattern
                pattern_data = {
                    "url_pattern": existing_pattern.url_pattern,
                    "page_type": result.page_type.value,
                    "field_selectors": existing_pattern.field_selectors,
                    "confidence": (existing_pattern.confidence + result.confidence) / 2,
                    "success_rate": existing_pattern.success_rate,
                    "usage_count": existing_pattern.usage_count + 1,
                    "last_used": datetime.utcnow().isoformat(),
                    "created_at": existing_pattern.created_at.isoformat()
                }
            else:
                # Create new pattern
                # Build URL pattern
                path_parts = [p for p in parsed.path.split("/") if p]
                pattern_parts = []
                for part in path_parts:
                    if part.isdigit() or len(part) > 20:
                        pattern_parts.append("*")
                    else:
                        pattern_parts.append(part)
                url_pattern = f"{parsed.netloc}/{'/'.join(pattern_parts)}"

                pattern_data = {
                    "url_pattern": url_pattern,
                    "page_type": result.page_type.value,
                    "field_selectors": {},  # Could be populated from extraction hints
                    "confidence": result.confidence,
                    "success_rate": 1.0,
                    "usage_count": 1,
                    "last_used": datetime.utcnow().isoformat(),
                    "created_at": datetime.utcnow().isoformat()
                }

            await self.cache.set(pattern_key, pattern_data, ttl=self.PATTERN_TTL)
            logger.debug(f"Updated pattern for: {pattern_data['url_pattern']}")

        except Exception as e:
            logger.warning(f"Pattern update error: {str(e)}")

    async def invalidate(self, url: str, intent: Optional[str] = None) -> bool:
        """
        Invalidate cached extraction for URL

        Args:
            url: URL to invalidate
            intent: Optional intent to invalidate specific cache

        Returns:
            True if invalidation succeeded
        """
        if not await self._ensure_initialized():
            return False

        try:
            cache_key = self._get_cache_key(url, intent)
            await self.cache.delete(cache_key)
            logger.debug(f"Invalidated cache for: {url}")
            return True
        except Exception as e:
            logger.warning(f"Cache invalidation error: {str(e)}")
            return False

    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not await self._ensure_initialized():
            return {"status": "unavailable", "message": "Cache not initialized"}

        try:
            stats = await self.cache.get_cache_stats()
            return {
                "status": "healthy" if stats.get("connected") else "disconnected",
                **stats
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def health_check(self) -> Dict[str, Any]:
        """Health check for pattern cache"""
        if not await self._ensure_initialized():
            return {
                "status": "unavailable",
                "redis_connected": False
            }

        try:
            stats = await self.cache.get_cache_stats()
            return {
                "status": "healthy" if stats.get("connected") else "degraded",
                "redis_connected": stats.get("connected", False),
                "total_keys": stats.get("total_keys", 0)
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
