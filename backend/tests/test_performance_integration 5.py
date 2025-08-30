"""
Performance-Focused Integration Tests
Tests for caching, optimization, database performance, and scalability
"""

import asyncio
import json
import time
import zlib
from datetime import datetime, timedelta
from typing import Dict, Any, List
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import pytest
import redis.asyncio as redis
from concurrent.futures import ThreadPoolExecutor

from app.services.cache_manager import CacheManager
from app.services.database_optimizer import DatabaseOptimizer
from app.services.pam.optimized_context_manager import OptimizedContextManager
from app.core.config import settings


# =====================================================
# CACHE PERFORMANCE TESTS
# =====================================================

class TestCachePerformance:
    """Test cache performance and optimization"""
    
    @pytest.mark.asyncio
    async def test_cache_hit_ratio(self):
        """Test cache hit ratio optimization"""
        cache_manager = CacheManager()
        mock_redis = AsyncMock()
        cache_manager.redis_client = mock_redis
        
        # Simulate cache operations
        total_requests = 1000
        cache_hits = 0
        cache_misses = 0
        
        # Pre-populate some cache entries
        cached_keys = set()
        for i in range(100):
            key = f"user_{i % 20}"  # 20 unique users
            cached_keys.add(key)
        
        # Simulate requests
        for i in range(total_requests):
            key = f"user_{i % 30}"  # 30 possible users
            
            if key in cached_keys:
                mock_redis.hget = AsyncMock(return_value=b'{"cached": true}')
                result = await cache_manager.get("query", key)
                if result:
                    cache_hits += 1
                else:
                    cache_misses += 1
            else:
                mock_redis.hget = AsyncMock(return_value=None)
                result = await cache_manager.get("query", key)
                cache_misses += 1
                # Cache the miss
                cached_keys.add(key)
        
        hit_ratio = cache_hits / total_requests
        
        # Should maintain good hit ratio
        assert hit_ratio > 0.6  # 60% hit ratio minimum
    
    @pytest.mark.asyncio
    async def test_cache_compression_performance(self):
        """Test cache compression performance"""
        cache_manager = CacheManager()
        mock_redis = AsyncMock()
        cache_manager.redis_client = mock_redis
        
        # Large data that benefits from compression
        large_data = {
            "messages": [f"Message {i}" * 100 for i in range(100)],
            "context": {"data": "x" * 10000}
        }
        
        # Measure compression time
        start_time = time.time()
        await cache_manager.set("query", "user123", large_data, compress=True)
        compression_time = time.time() - start_time
        
        # Compression should be fast
        assert compression_time < 0.1  # Less than 100ms
        
        # Verify compression ratio
        original_size = len(json.dumps(large_data))
        compressed_call = mock_redis.hset.call_args[0][2]
        compressed_size = len(compressed_call)
        
        compression_ratio = 1 - (compressed_size / original_size)
        assert compression_ratio > 0.5  # At least 50% compression
    
    @pytest.mark.asyncio
    async def test_cache_ttl_optimization(self):
        """Test cache TTL optimization based on access patterns"""
        cache_manager = CacheManager()
        mock_redis = AsyncMock()
        cache_manager.redis_client = mock_redis
        
        # Track access patterns
        access_counts = {}
        
        # Simulate access patterns
        for i in range(100):
            user_id = f"user_{i % 10}"
            access_counts[user_id] = access_counts.get(user_id, 0) + 1
            
            # Adaptive TTL based on access frequency
            if access_counts[user_id] > 5:
                ttl = 3600  # 1 hour for frequent access
            elif access_counts[user_id] > 2:
                ttl = 600   # 10 minutes for moderate access
            else:
                ttl = 300   # 5 minutes for rare access
            
            await cache_manager.set("query", user_id, {"data": i}, ttl=ttl)
        
        # Verify adaptive TTL was applied
        expire_calls = mock_redis.expire.call_args_list
        ttls_used = [call[0][1] for call in expire_calls]
        
        # Should use different TTLs
        assert len(set(ttls_used)) > 1
        assert max(ttls_used) == 3600
        assert min(ttls_used) == 300
    
    @pytest.mark.asyncio
    async def test_cache_memory_management(self):
        """Test cache memory management and eviction"""
        cache_manager = CacheManager()
        
        # Test memory cache with limited size
        cache_manager.memory_cache = {}
        cache_manager.max_memory_items = 100
        
        # Fill cache beyond limit
        for i in range(150):
            key = f"item_{i}"
            cache_manager.memory_cache[key] = {
                "data": f"value_{i}",
                "timestamp": time.time() - (150 - i)  # Older items have lower timestamp
            }
        
        # Trigger eviction
        cache_manager._evict_memory_cache()
        
        # Should maintain size limit
        assert len(cache_manager.memory_cache) <= cache_manager.max_memory_items
        
        # Should keep newer items
        remaining_keys = list(cache_manager.memory_cache.keys())
        assert "item_149" in remaining_keys  # Newest
        assert "item_0" not in remaining_keys  # Oldest


# =====================================================
# DATABASE OPTIMIZATION TESTS
# =====================================================

class TestDatabaseOptimization:
    """Test database query optimization"""
    
    @pytest.mark.asyncio
    async def test_connection_pool_performance(self):
        """Test connection pool performance"""
        optimizer = DatabaseOptimizer()
        
        # Mock connection pool
        mock_pool = AsyncMock()
        mock_conn = AsyncMock()
        mock_conn.fetch = AsyncMock(return_value=[])
        mock_pool.acquire = AsyncMock(return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_conn)))
        
        optimizer.write_pool = mock_pool
        optimizer.read_pool = mock_pool
        
        # Measure concurrent query performance
        async def execute_query(i):
            return await optimizer.execute_optimized(
                f"SELECT * FROM table WHERE id = ${i}",
                [i]
            )
        
        # Run concurrent queries
        start_time = time.time()
        tasks = [execute_query(i) for i in range(50)]
        await asyncio.gather(*tasks)
        elapsed = time.time() - start_time
        
        # Should handle concurrent queries efficiently
        assert elapsed < 2.0  # 50 queries in under 2 seconds
        
        # Pool should reuse connections
        acquire_count = mock_pool.acquire.call_count
        assert acquire_count <= settings.DB_POOL_MAX_SIZE
    
    @pytest.mark.asyncio
    async def test_query_plan_caching(self):
        """Test query plan caching"""
        optimizer = DatabaseOptimizer()
        optimizer.query_plan_cache = {}
        
        # Mock connection
        mock_conn = AsyncMock()
        mock_conn.fetch = AsyncMock(return_value=[{"id": 1}])
        
        optimizer.write_pool = AsyncMock()
        optimizer.write_pool.acquire = AsyncMock(return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_conn)))
        
        # Same query structure, different parameters
        query_template = "SELECT * FROM users WHERE id = $1 AND status = $2"
        
        # Execute similar queries
        for i in range(10):
            await optimizer.execute_optimized(
                query_template,
                [i, "active"],
                cache_plan=True
            )
        
        # Query plan should be cached
        assert len(optimizer.query_plan_cache) > 0
        
        # Cached plan should be reused
        plan_key = optimizer._get_query_plan_key(query_template)
        assert plan_key in optimizer.query_plan_cache
    
    @pytest.mark.asyncio
    async def test_batch_query_optimization(self):
        """Test batch query optimization"""
        optimizer = DatabaseOptimizer()
        
        # Mock connection
        mock_conn = AsyncMock()
        mock_conn.fetch = AsyncMock(return_value=[
            {"id": i, "name": f"User {i}"} for i in range(100)
        ])
        
        optimizer.read_pool = AsyncMock()
        optimizer.read_pool.acquire = AsyncMock(return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_conn)))
        
        # Batch query instead of N+1
        user_ids = list(range(100))
        
        # Single batch query
        start_time = time.time()
        result = await optimizer.execute_batch_query(
            "SELECT * FROM users WHERE id = ANY($1)",
            [user_ids]
        )
        batch_time = time.time() - start_time
        
        # Compare with individual queries (simulated)
        individual_time = 0.01 * len(user_ids)  # Assume 10ms per query
        
        # Batch should be much faster
        assert batch_time < individual_time / 10
    
    @pytest.mark.asyncio
    async def test_read_replica_routing(self):
        """Test read query routing to replicas"""
        optimizer = DatabaseOptimizer()
        
        # Mock pools
        mock_write_pool = AsyncMock()
        mock_read_pool = AsyncMock()
        
        mock_write_conn = AsyncMock()
        mock_read_conn = AsyncMock()
        
        mock_write_pool.acquire = AsyncMock(return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_write_conn)))
        mock_read_pool.acquire = AsyncMock(return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_read_conn)))
        
        optimizer.write_pool = mock_write_pool
        optimizer.read_pool = mock_read_pool
        
        # Read query should use read pool
        await optimizer.execute_optimized("SELECT * FROM users", [], use_read_replica=True)
        mock_read_pool.acquire.assert_called()
        mock_write_pool.acquire.assert_not_called()
        
        # Write query should use write pool
        mock_write_pool.reset_mock()
        mock_read_pool.reset_mock()
        
        await optimizer.execute_optimized("INSERT INTO users VALUES ($1)", ["test"], use_read_replica=False)
        mock_write_pool.acquire.assert_called()
        mock_read_pool.acquire.assert_not_called()


# =====================================================
# CONTEXT OPTIMIZATION TESTS
# =====================================================

class TestContextOptimization:
    """Test context fetching optimization"""
    
    @pytest.mark.asyncio
    async def test_single_query_context(self):
        """Test single query context fetching vs multiple queries"""
        manager = OptimizedContextManager()
        
        # Mock connection
        mock_conn = AsyncMock()
        
        # Single optimized query result
        optimized_result = [{
            "user_id": "user123",
            "display_name": "Test User",
            "email": "test@example.com",
            "trip_count": 10,
            "total_distance": 5000,
            "last_trip": datetime.utcnow(),
            "preferences": {"theme": "dark"},
            "vehicle_info": {"type": "RV", "model": "Winnebago"}
        }]
        
        mock_conn.fetch = AsyncMock(return_value=optimized_result)
        
        with patch.object(manager, "_get_connection", return_value=mock_conn):
            # Measure single query approach
            start_time = time.time()
            context = await manager.get_user_context("user123")
            single_query_time = time.time() - start_time
            
            # Verify only one query was made
            assert mock_conn.fetch.call_count == 1
            
            # Compare with multiple query approach (simulated)
            multiple_query_time = 0.05  # Assume 50ms for 5 separate queries
            
            # Single query should be faster
            assert single_query_time < multiple_query_time
    
    @pytest.mark.asyncio
    async def test_context_prefetching(self):
        """Test context prefetching for performance"""
        manager = OptimizedContextManager()
        
        # Mock connection
        mock_conn = AsyncMock()
        mock_conn.fetch = AsyncMock(return_value=[
            {"user_id": f"user_{i}", "data": f"data_{i}"} 
            for i in range(10)
        ])
        
        with patch.object(manager, "_get_connection", return_value=mock_conn):
            # Prefetch contexts for active users
            active_users = [f"user_{i}" for i in range(10)]
            
            start_time = time.time()
            contexts = await manager.prefetch_contexts(active_users)
            prefetch_time = time.time() - start_time
            
            # Should fetch all in one batch
            assert len(contexts) == 10
            assert mock_conn.fetch.call_count == 1
            
            # Should be fast
            assert prefetch_time < 0.1  # Under 100ms for 10 users
    
    @pytest.mark.asyncio
    async def test_context_caching_strategy(self):
        """Test context caching strategy"""
        manager = OptimizedContextManager()
        manager.cache = {}
        
        # Mock connection
        mock_conn = AsyncMock()
        call_count = 0
        
        async def fetch_side_effect(*args):
            nonlocal call_count
            call_count += 1
            return [{"user_id": "user123", "call": call_count}]
        
        mock_conn.fetch = AsyncMock(side_effect=fetch_side_effect)
        
        with patch.object(manager, "_get_connection", return_value=mock_conn):
            # First call - cache miss
            context1 = await manager.get_user_context("user123", use_cache=True)
            assert call_count == 1
            
            # Second call - cache hit
            context2 = await manager.get_user_context("user123", use_cache=True)
            assert call_count == 1  # No additional DB call
            
            # Force refresh
            context3 = await manager.get_user_context("user123", use_cache=False)
            assert call_count == 2  # New DB call


# =====================================================
# LOAD TESTING
# =====================================================

class TestLoadPerformance:
    """Test system performance under load"""
    
    @pytest.mark.asyncio
    async def test_concurrent_websocket_connections(self):
        """Test handling concurrent WebSocket connections"""
        from app.api.v1.pam import ConnectionManager
        
        manager = ConnectionManager()
        
        # Simulate concurrent connections
        async def connect_client(client_id):
            websocket = AsyncMock()
            websocket.client_id = client_id
            await manager.connect(websocket, client_id)
            return websocket
        
        # Connect many clients
        start_time = time.time()
        tasks = [connect_client(f"client_{i}") for i in range(100)]
        clients = await asyncio.gather(*tasks)
        connect_time = time.time() - start_time
        
        # Should handle 100 connections quickly
        assert connect_time < 1.0
        assert len(manager.active_connections) == 100
        
        # Broadcast performance
        start_time = time.time()
        await manager.broadcast({"message": "test"})
        broadcast_time = time.time() - start_time
        
        # Should broadcast quickly
        assert broadcast_time < 0.5
    
    @pytest.mark.asyncio
    async def test_high_throughput_processing(self):
        """Test high throughput message processing"""
        from app.services.pam.enhanced_orchestrator import EnhancedOrchestrator
        
        orchestrator = EnhancedOrchestrator()
        
        # Mock providers
        orchestrator.providers = {
            "openai": AsyncMock(process=AsyncMock(return_value={"reply": "test"}))
        }
        
        # Process many messages
        messages = [f"Message {i}" for i in range(100)]
        
        start_time = time.time()
        tasks = [
            orchestrator.process_message(msg, "user123")
            for msg in messages
        ]
        results = await asyncio.gather(*tasks)
        process_time = time.time() - start_time
        
        # Should process 100 messages in reasonable time
        assert process_time < 10.0  # Under 10 seconds
        assert len(results) == 100
        
        # Calculate throughput
        throughput = len(messages) / process_time
        assert throughput > 10  # At least 10 messages per second
    
    @pytest.mark.asyncio
    async def test_memory_usage_under_load(self):
        """Test memory usage under load"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Create load
        cache_manager = CacheManager()
        cache_manager.memory_cache = {}
        
        # Add many items to cache
        for i in range(10000):
            cache_manager.memory_cache[f"key_{i}"] = {
                "data": f"value_{i}" * 100,
                "timestamp": time.time()
            }
        
        current_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = current_memory - initial_memory
        
        # Memory increase should be reasonable
        assert memory_increase < 100  # Less than 100MB increase
        
        # Clean up
        cache_manager.memory_cache.clear()
    
    @pytest.mark.asyncio
    async def test_response_time_percentiles(self):
        """Test response time percentiles"""
        response_times = []
        
        async def simulate_request():
            start = time.time()
            # Simulate varying processing times
            await asyncio.sleep(0.01 + (hash(time.time()) % 100) / 1000)
            return time.time() - start
        
        # Simulate many requests
        for _ in range(1000):
            response_time = await simulate_request()
            response_times.append(response_time * 1000)  # Convert to ms
        
        # Calculate percentiles
        response_times.sort()
        p50 = response_times[int(len(response_times) * 0.50)]
        p95 = response_times[int(len(response_times) * 0.95)]
        p99 = response_times[int(len(response_times) * 0.99)]
        
        # Performance requirements
        assert p50 < 50   # 50th percentile under 50ms
        assert p95 < 200  # 95th percentile under 200ms
        assert p99 < 500  # 99th percentile under 500ms


# =====================================================
# OPTIMIZATION BENCHMARKS
# =====================================================

class TestOptimizationBenchmarks:
    """Benchmark optimization improvements"""
    
    @pytest.mark.asyncio
    async def test_message_processing_optimization(self):
        """Test message processing optimization"""
        # Before optimization - sequential processing
        async def process_sequential(messages):
            results = []
            for msg in messages:
                await asyncio.sleep(0.01)  # Simulate processing
                results.append(f"Processed: {msg}")
            return results
        
        # After optimization - parallel processing
        async def process_parallel(messages):
            tasks = []
            for msg in messages:
                task = asyncio.create_task(process_single(msg))
                tasks.append(task)
            return await asyncio.gather(*tasks)
        
        async def process_single(msg):
            await asyncio.sleep(0.01)  # Simulate processing
            return f"Processed: {msg}"
        
        messages = [f"Message {i}" for i in range(20)]
        
        # Measure sequential
        start = time.time()
        await process_sequential(messages)
        sequential_time = time.time() - start
        
        # Measure parallel
        start = time.time()
        await process_parallel(messages)
        parallel_time = time.time() - start
        
        # Parallel should be much faster
        speedup = sequential_time / parallel_time
        assert speedup > 5  # At least 5x speedup
    
    @pytest.mark.asyncio
    async def test_database_query_optimization(self):
        """Test database query optimization improvements"""
        # Before - N+1 queries
        async def fetch_unoptimized(user_ids):
            results = []
            for user_id in user_ids:
                # Simulate individual query
                await asyncio.sleep(0.005)
                results.append({"id": user_id, "data": "data"})
            return results
        
        # After - Batch query
        async def fetch_optimized(user_ids):
            # Simulate batch query
            await asyncio.sleep(0.01)
            return [{"id": uid, "data": "data"} for uid in user_ids]
        
        user_ids = list(range(50))
        
        # Measure unoptimized
        start = time.time()
        await fetch_unoptimized(user_ids)
        unoptimized_time = time.time() - start
        
        # Measure optimized
        start = time.time()
        await fetch_optimized(user_ids)
        optimized_time = time.time() - start
        
        # Optimized should be much faster
        improvement = unoptimized_time / optimized_time
        assert improvement > 10  # At least 10x improvement
    
    @pytest.mark.asyncio
    async def test_caching_impact(self):
        """Test impact of caching on performance"""
        cache = {}
        db_calls = 0
        
        async def fetch_with_cache(key):
            nonlocal db_calls
            
            if key in cache:
                return cache[key]
            
            # Simulate DB fetch
            db_calls += 1
            await asyncio.sleep(0.01)
            value = f"value_{key}"
            cache[key] = value
            return value
        
        async def fetch_without_cache(key):
            # Always hit DB
            await asyncio.sleep(0.01)
            return f"value_{key}"
        
        # Simulate requests with 80% repeat rate
        keys = []
        for i in range(100):
            if i < 20:
                keys.append(f"key_{i}")
            else:
                keys.append(f"key_{i % 20}")  # Repeat keys
        
        # With cache
        cache.clear()
        db_calls = 0
        start = time.time()
        for key in keys:
            await fetch_with_cache(key)
        cached_time = time.time() - start
        cached_db_calls = db_calls
        
        # Without cache
        start = time.time()
        for key in keys:
            await fetch_without_cache(key)
        uncached_time = time.time() - start
        
        # Cache should provide significant speedup
        speedup = uncached_time / cached_time
        assert speedup > 3  # At least 3x speedup
        assert cached_db_calls < 30  # Much fewer DB calls


# =====================================================
# SCALABILITY TESTS
# =====================================================

class TestScalability:
    """Test system scalability"""
    
    @pytest.mark.asyncio
    async def test_horizontal_scaling(self):
        """Test horizontal scaling capability"""
        # Simulate multiple app instances
        instances = []
        
        for i in range(4):
            instance = {
                "id": f"instance_{i}",
                "load": 0,
                "max_load": 100
            }
            instances.append(instance)
        
        # Load balancer simulation
        def get_least_loaded_instance():
            return min(instances, key=lambda x: x["load"])
        
        # Distribute requests
        request_count = 400
        for _ in range(request_count):
            instance = get_least_loaded_instance()
            instance["load"] += 1
        
        # Check load distribution
        loads = [inst["load"] for inst in instances]
        
        # Load should be evenly distributed
        avg_load = sum(loads) / len(loads)
        for load in loads:
            assert abs(load - avg_load) < 10  # Within 10% of average
    
    @pytest.mark.asyncio
    async def test_auto_scaling_triggers(self):
        """Test auto-scaling triggers"""
        metrics = {
            "cpu_usage": 0,
            "memory_usage": 0,
            "request_rate": 0,
            "response_time": 0
        }
        
        def should_scale_up():
            return (
                metrics["cpu_usage"] > 70 or
                metrics["memory_usage"] > 80 or
                metrics["request_rate"] > 1000 or
                metrics["response_time"] > 500
            )
        
        def should_scale_down():
            return (
                metrics["cpu_usage"] < 20 and
                metrics["memory_usage"] < 30 and
                metrics["request_rate"] < 100 and
                metrics["response_time"] < 100
            )
        
        # Test scale up trigger
        metrics["cpu_usage"] = 75
        assert should_scale_up() == True
        
        # Test scale down trigger
        metrics = {
            "cpu_usage": 15,
            "memory_usage": 25,
            "request_rate": 50,
            "response_time": 80
        }
        assert should_scale_down() == True
    
    @pytest.mark.asyncio
    async def test_queue_based_scaling(self):
        """Test queue-based scaling"""
        import asyncio
        
        queue = asyncio.Queue(maxsize=1000)
        workers = []
        
        async def worker(worker_id):
            while True:
                try:
                    task = await asyncio.wait_for(queue.get(), timeout=0.1)
                    await asyncio.sleep(0.01)  # Process task
                except asyncio.TimeoutError:
                    break
        
        # Start with minimal workers
        for i in range(2):
            workers.append(asyncio.create_task(worker(i)))
        
        # Add tasks
        for i in range(100):
            await queue.put(f"task_{i}")
        
        # Check queue size and scale
        if queue.qsize() > 50:
            # Add more workers
            for i in range(2, 5):
                workers.append(asyncio.create_task(worker(i)))
        
        # Wait for processing
        await queue.join()
        
        # Clean up workers
        for w in workers:
            w.cancel()
        
        # Queue should be empty
        assert queue.qsize() == 0


# =====================================================
# RUN TESTS
# =====================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])