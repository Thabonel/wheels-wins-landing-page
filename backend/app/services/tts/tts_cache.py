"""
TTS Caching and Optimization System
Implements intelligent caching for TTS audio with compression and deduplication
"""

import asyncio
import hashlib
import gzip
import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import asdict
import logging
from pathlib import Path
import tempfile
import os

from .base_tts import TTSRequest, TTSResponse, AudioFormat, VoiceProfile
from app.core.config import get_settings
from app.utils.datetime_encoder import DateTimeEncoder

logger = logging.getLogger(__name__)
settings = get_settings()

class TTSCacheEntry:
    """Represents a cached TTS entry"""
    
    def __init__(
        self,
        cache_key: str,
        audio_data: bytes,
        metadata: Dict[str, Any],
        created_at: datetime,
        access_count: int = 0,
        last_accessed: Optional[datetime] = None
    ):
        self.cache_key = cache_key
        self.audio_data = audio_data
        self.metadata = metadata
        self.created_at = created_at
        self.access_count = access_count
        self.last_accessed = last_accessed or created_at
        self.compressed_size = len(audio_data)
        self.original_size = metadata.get("original_size", len(audio_data))
    
    def access(self):
        """Mark cache entry as accessed"""
        self.access_count += 1
        self.last_accessed = datetime.utcnow()
    
    def get_age_hours(self) -> float:
        """Get age of cache entry in hours"""
        return (datetime.utcnow() - self.created_at).total_seconds() / 3600
    
    def get_priority_score(self) -> float:
        """Calculate priority score for cache eviction (higher = keep longer)"""
        # Factors: access count, recency, size efficiency
        age_hours = self.get_age_hours()
        recency_score = 1.0 / (1.0 + age_hours / 24)  # Decay over days
        access_score = min(self.access_count / 10, 1.0)  # Cap at 10 accesses
        size_efficiency = min(self.original_size / self.compressed_size, 3.0)  # Compression ratio
        
        return (access_score * 0.5) + (recency_score * 0.3) + (size_efficiency * 0.2)

class TTSCache:
    """TTS audio caching system with compression and intelligent eviction"""
    
    def __init__(self, max_cache_size_mb: int = 500, max_entries: int = 1000):
        self.max_cache_size_bytes = max_cache_size_mb * 1024 * 1024
        self.max_entries = max_entries
        self.cache: Dict[str, TTSCacheEntry] = {}
        self.current_size_bytes = 0
        
        # Statistics
        self.stats = {
            "total_requests": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "evictions": 0,
            "compressions": 0,
            "total_saved_bytes": 0
        }
        
        # Cache persistence (optional)
        self.cache_dir = Path(tempfile.gettempdir()) / "pam_tts_cache"
        self.cache_dir.mkdir(exist_ok=True)
        self.persistent_cache = getattr(settings, 'TTS_PERSISTENT_CACHE', False)
        
        # Background cleanup task
        self._cleanup_task = None
        
    async def start_background_cleanup(self):
        """Start background cache cleanup task"""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._background_cleanup())
    
    async def stop_background_cleanup(self):
        """Stop background cache cleanup task"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None
    
    async def _background_cleanup(self):
        """Background task for cache maintenance"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                await self._cleanup_expired_entries()
                await self._optimize_cache()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Cache cleanup error: {e}")
    
    def generate_cache_key(self, request: TTSRequest) -> str:
        """Generate cache key for TTS request"""
        # Include all relevant parameters that affect output
        key_components = {
            "text": request.text.strip().lower(),
            "voice_id": request.voice_profile.voice_id,
            "engine": request.voice_profile.engine.value,
            "format": request.format.value,
            "sample_rate": request.sample_rate,
            "settings": {
                "stability": request.voice_profile.settings.stability,
                "similarity_boost": request.voice_profile.settings.similarity_boost,
                "speed": request.voice_profile.settings.speed,
                "pitch": request.voice_profile.settings.pitch,
                "volume": request.voice_profile.settings.volume,
                "style": request.voice_profile.settings.style.value
            }
        }
        
        # Create deterministic hash
        key_string = json.dumps(key_components, sort_keys=True)
        return hashlib.sha256(key_string.encode()).hexdigest()[:16]
    
    async def get(self, cache_key: str) -> Optional[TTSResponse]:
        """Get cached TTS response"""
        self.stats["total_requests"] += 1
        
        if cache_key in self.cache:
            entry = self.cache[cache_key]
            entry.access()
            
            # Decompress audio data
            audio_data = await self._decompress_audio(entry.audio_data)
            
            # Create response from cache
            response = TTSResponse(
                request=None,  # Will be set by caller
                audio_data=audio_data,
                duration_ms=entry.metadata.get("duration_ms"),
                generation_time_ms=0,  # Cached, so no generation time
                cache_hit=True,
                engine_used=entry.metadata.get("engine_used"),
                success=True
            )
            
            self.stats["cache_hits"] += 1
            logger.info(f"💾 Cache HIT for key {cache_key} (accessed {entry.access_count} times)")
            
            return response
        
        self.stats["cache_misses"] += 1
        logger.info(f"💾 Cache MISS for key {cache_key}")
        return None
    
    async def put(self, cache_key: str, response: TTSResponse, request: TTSRequest):
        """Store TTS response in cache"""
        if not response.success or not response.audio_data:
            return
        
        try:
            # Compress audio data
            compressed_audio = await self._compress_audio(response.audio_data)
            
            # Create metadata
            metadata = {
                "original_size": len(response.audio_data),
                "duration_ms": response.duration_ms,
                "generation_time_ms": response.generation_time_ms,
                "engine_used": response.engine_used.value if response.engine_used else None,
                "format": request.format.value,
                "voice_profile": asdict(request.voice_profile),
                "text_hash": hashlib.md5(request.text.encode()).hexdigest()
            }
            
            # Create cache entry
            entry = TTSCacheEntry(
                cache_key=cache_key,
                audio_data=compressed_audio,
                metadata=metadata,
                created_at=datetime.utcnow()
            )
            
            # Check if we need to evict entries
            await self._ensure_cache_space(entry.compressed_size)
            
            # Store in cache
            self.cache[cache_key] = entry
            self.current_size_bytes += entry.compressed_size
            
            # Update statistics
            compression_ratio = len(response.audio_data) / len(compressed_audio)
            self.stats["compressions"] += 1
            self.stats["total_saved_bytes"] += len(response.audio_data) - len(compressed_audio)
            
            logger.info(f"💾 Cached TTS response (key: {cache_key}, size: {len(compressed_audio)} bytes, compression: {compression_ratio:.1f}x)")
            
            # Optionally persist to disk
            if self.persistent_cache:
                await self._persist_entry(cache_key, entry)
                
        except Exception as e:
            logger.error(f"❌ Failed to cache TTS response: {e}")
    
    async def _compress_audio(self, audio_data: bytes) -> bytes:
        """Compress audio data"""
        try:
            # Use gzip compression for audio data
            # Note: Audio is already compressed (MP3/WAV), so gains may be minimal
            compressed = gzip.compress(audio_data, compresslevel=6)
            return compressed
        except Exception as e:
            logger.warning(f"⚠️ Audio compression failed: {e}")
            return audio_data
    
    async def _decompress_audio(self, compressed_data: bytes) -> bytes:
        """Decompress audio data"""
        try:
            # Try to decompress
            decompressed = gzip.decompress(compressed_data)
            return decompressed
        except gzip.BadGzipFile:
            # Data might not be compressed
            return compressed_data
        except Exception as e:
            logger.warning(f"⚠️ Audio decompression failed: {e}")
            return compressed_data
    
    async def _ensure_cache_space(self, new_entry_size: int):
        """Ensure cache has space for new entry"""
        # Check size limit
        while (self.current_size_bytes + new_entry_size > self.max_cache_size_bytes or 
               len(self.cache) >= self.max_entries):
            
            if not self.cache:
                break
                
            # Find entry with lowest priority score
            entries_by_priority = sorted(
                self.cache.items(),
                key=lambda x: x[1].get_priority_score()
            )
            
            # Remove lowest priority entry
            key_to_remove, entry_to_remove = entries_by_priority[0]
            await self._evict_entry(key_to_remove)
    
    async def _evict_entry(self, cache_key: str):
        """Evict entry from cache"""
        if cache_key in self.cache:
            entry = self.cache[cache_key]
            self.current_size_bytes -= entry.compressed_size
            del self.cache[cache_key]
            self.stats["evictions"] += 1
            
            logger.info(f"💾 Evicted cache entry {cache_key} (age: {entry.get_age_hours():.1f}h, accesses: {entry.access_count})")
            
            # Remove from persistent storage
            if self.persistent_cache:
                await self._remove_persisted_entry(cache_key)
    
    async def _cleanup_expired_entries(self):
        """Remove expired cache entries"""
        now = datetime.utcnow()
        expired_keys = []
        
        for key, entry in self.cache.items():
            # Remove entries older than 7 days
            if (now - entry.created_at) > timedelta(days=7):
                expired_keys.append(key)
            
            # Remove entries not accessed in 24 hours and with low access count
            elif (now - entry.last_accessed) > timedelta(hours=24) and entry.access_count < 2:
                expired_keys.append(key)
        
        for key in expired_keys:
            await self._evict_entry(key)
        
        if expired_keys:
            logger.info(f"💾 Cleaned up {len(expired_keys)} expired cache entries")
    
    async def _optimize_cache(self):
        """Optimize cache by reorganizing entries"""
        # This could implement more sophisticated optimizations like:
        # - Recompressing old entries with better algorithms
        # - Merging similar entries
        # - Preloading commonly requested content
        
        # For now, just log cache statistics
        hit_rate = (self.stats["cache_hits"] / max(self.stats["total_requests"], 1)) * 100
        logger.info(f"💾 Cache stats: {len(self.cache)} entries, {self.current_size_bytes/1024/1024:.1f}MB, {hit_rate:.1f}% hit rate")
    
    async def _persist_entry(self, cache_key: str, entry: TTSCacheEntry):
        """Persist cache entry to disk"""
        try:
            entry_file = self.cache_dir / f"{cache_key}.cache"
            
            entry_data = {
                "audio_data": entry.audio_data,
                "metadata": entry.metadata,
                "created_at": entry.created_at.isoformat(),
                "access_count": entry.access_count,
                "last_accessed": entry.last_accessed.isoformat()
            }
            
            # Save to disk (compressed)
            with gzip.open(entry_file, 'wb') as f:
                f.write(json.dumps(entry_data, cls=DateTimeEncoder).encode())
                
        except Exception as e:
            logger.warning(f"⚠️ Failed to persist cache entry {cache_key}: {e}")
    
    async def _remove_persisted_entry(self, cache_key: str):
        """Remove persisted cache entry from disk"""
        try:
            entry_file = self.cache_dir / f"{cache_key}.cache"
            if entry_file.exists():
                entry_file.unlink()
        except Exception as e:
            logger.warning(f"⚠️ Failed to remove persisted cache entry {cache_key}: {e}")
    
    async def load_persistent_cache(self):
        """Load cache entries from disk"""
        if not self.persistent_cache:
            return
        
        try:
            loaded_count = 0
            
            for cache_file in self.cache_dir.glob("*.cache"):
                try:
                    with gzip.open(cache_file, 'rb') as f:
                        entry_data = json.loads(f.read().decode())
                    
                    cache_key = cache_file.stem
                    
                    entry = TTSCacheEntry(
                        cache_key=cache_key,
                        audio_data=entry_data["audio_data"],
                        metadata=entry_data["metadata"],
                        created_at=datetime.fromisoformat(entry_data["created_at"]),
                        access_count=entry_data.get("access_count", 0),
                        last_accessed=datetime.fromisoformat(entry_data.get("last_accessed", entry_data["created_at"]))
                    )
                    
                    # Check if entry is still valid (not too old)
                    if entry.get_age_hours() < 168:  # 7 days
                        self.cache[cache_key] = entry
                        self.current_size_bytes += entry.compressed_size
                        loaded_count += 1
                    else:
                        # Remove old cache file
                        cache_file.unlink()
                        
                except Exception as e:
                    logger.warning(f"⚠️ Failed to load cache entry {cache_file}: {e}")
                    # Remove corrupted cache file
                    try:
                        cache_file.unlink()
                    except:
                        pass
            
            if loaded_count > 0:
                logger.info(f"💾 Loaded {loaded_count} cache entries from disk")
                
        except Exception as e:
            logger.error(f"❌ Failed to load persistent cache: {e}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = max(self.stats["total_requests"], 1)
        
        return {
            "cache_entries": len(self.cache),
            "cache_size_mb": round(self.current_size_bytes / 1024 / 1024, 2),
            "max_size_mb": round(self.max_cache_size_bytes / 1024 / 1024, 2),
            "hit_rate_percent": round((self.stats["cache_hits"] / total_requests) * 100, 1),
            "total_requests": self.stats["total_requests"],
            "cache_hits": self.stats["cache_hits"],
            "cache_misses": self.stats["cache_misses"],
            "evictions": self.stats["evictions"],
            "compressions": self.stats["compressions"],
            "total_saved_mb": round(self.stats["total_saved_bytes"] / 1024 / 1024, 2)
        }
    
    async def clear_cache(self, older_than_hours: Optional[int] = None):
        """Clear cache entries"""
        if older_than_hours is None:
            # Clear all entries
            keys_to_remove = list(self.cache.keys())
        else:
            # Clear entries older than specified hours
            cutoff_time = datetime.utcnow() - timedelta(hours=older_than_hours)
            keys_to_remove = [
                key for key, entry in self.cache.items()
                if entry.created_at < cutoff_time
            ]
        
        for key in keys_to_remove:
            await self._evict_entry(key)
        
        logger.info(f"💾 Cleared {len(keys_to_remove)} cache entries")
        return len(keys_to_remove)

# Global cache instance
tts_cache = TTSCache()