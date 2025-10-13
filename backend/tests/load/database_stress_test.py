"""
Database Stress Testing Suite
Tests database performance under heavy load.

Focuses on:
- Query performance degradation under load
- Connection pool handling
- RLS policy performance
- Index effectiveness
- Concurrent write operations

Usage:
    python -m pytest backend/tests/load/database_stress_test.py -v
    python backend/tests/load/database_stress_test.py --queries 10000
"""

import asyncio
import time
import statistics
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from typing import List, Dict, Any
from dataclasses import dataclass, field
import logging
import argparse
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
import os

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class DatabaseMetrics:
    """Metrics for database stress testing"""
    query_times: List[float] = field(default_factory=list)
    connection_times: List[float] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    successful_queries: int = 0
    failed_queries: int = 0
    total_duration: float = 0.0

    def add_query_time(self, time_ms: float):
        self.query_times.append(time_ms)

    def add_connection_time(self, time_ms: float):
        self.connection_times.append(time_ms)

    def add_error(self, error: str):
        self.errors.append(error)

    def get_stats(self) -> Dict[str, Any]:
        """Calculate statistics"""
        stats = {
            "total_queries": self.successful_queries + self.failed_queries,
            "successful_queries": self.successful_queries,
            "failed_queries": self.failed_queries,
            "success_rate": (
                self.successful_queries / (self.successful_queries + self.failed_queries)
                if (self.successful_queries + self.failed_queries) > 0
                else 0
            ),
            "total_errors": len(self.errors),
            "test_duration_seconds": self.total_duration,
        }

        if self.query_times:
            stats["query_time_ms"] = {
                "min": min(self.query_times),
                "max": max(self.query_times),
                "mean": statistics.mean(self.query_times),
                "median": statistics.median(self.query_times),
                "p95": self._percentile(self.query_times, 0.95),
                "p99": self._percentile(self.query_times, 0.99),
            }

        if self.connection_times:
            stats["connection_time_ms"] = {
                "mean": statistics.mean(self.connection_times),
                "p95": self._percentile(self.connection_times, 0.95),
            }

        if self.total_duration > 0:
            stats["queries_per_second"] = self.successful_queries / self.total_duration

        return stats

    @staticmethod
    def _percentile(data: List[float], percentile: float) -> float:
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile)
        return sorted_data[min(index, len(sorted_data) - 1)]

    def print_summary(self):
        """Print summary"""
        stats = self.get_stats()

        print("\n" + "="*80)
        print("DATABASE STRESS TEST RESULTS")
        print("="*80)

        print(f"\n📊 Query Statistics:")
        print(f"  Total: {stats['total_queries']}")
        print(f"  Successful: {stats['successful_queries']} ({stats['success_rate']*100:.1f}%)")
        print(f"  Failed: {stats['failed_queries']}")

        if "query_time_ms" in stats:
            qt = stats["query_time_ms"]
            print(f"\n⏱️  Query Performance (ms):")
            print(f"  Min: {qt['min']:.2f}")
            print(f"  Mean: {qt['mean']:.2f}")
            print(f"  Median: {qt['median']:.2f}")
            print(f"  P95: {qt['p95']:.2f}")
            print(f"  P99: {qt['p99']:.2f}")
            print(f"  Max: {qt['max']:.2f}")

        if "connection_time_ms" in stats:
            ct = stats["connection_time_ms"]
            print(f"\n🔌 Connection Performance (ms):")
            print(f"  Mean: {ct['mean']:.2f}")
            print(f"  P95: {ct['p95']:.2f}")

        if "queries_per_second" in stats:
            print(f"\n🚀 Throughput: {stats['queries_per_second']:.2f} queries/sec")

        print(f"\n⏲️  Test Duration: {stats['test_duration_seconds']:.2f}s")
        print(f"❌ Total Errors: {stats['total_errors']}")

        # Performance targets
        print(f"\n🎯 Performance Targets:")
        if "query_time_ms" in stats:
            p95 = stats["query_time_ms"]["p95"]
            if p95 < 100:
                print(f"  ✅ P95 Query Time: {p95:.2f}ms (target: <100ms)")
            else:
                print(f"  ⚠️  P95 Query Time: {p95:.2f}ms (target: <100ms)")

        if stats['success_rate'] >= 0.99:
            print(f"  ✅ Success Rate: {stats['success_rate']*100:.1f}% (target: >99%)")
        else:
            print(f"  ⚠️  Success Rate: {stats['success_rate']*100:.1f}% (target: >99%)")

        print("="*80 + "\n")


class DatabaseStressTester:
    """Database stress tester"""

    def __init__(
        self,
        connection_string: str,
        num_queries: int,
        num_workers: int,
        pool_size: int = 20
    ):
        self.connection_string = connection_string
        self.num_queries = num_queries
        self.num_workers = num_workers
        self.pool_size = pool_size
        self.metrics = DatabaseMetrics()
        self.pool = None

    def setup_pool(self):
        """Setup connection pool"""
        try:
            self.pool = ThreadedConnectionPool(
                minconn=1,
                maxconn=self.pool_size,
                dsn=self.connection_string
            )
            logger.info(f"Connection pool created (size: {self.pool_size})")
        except Exception as e:
            logger.error(f"Failed to create connection pool: {e}")
            raise

    def teardown_pool(self):
        """Cleanup connection pool"""
        if self.pool:
            self.pool.closeall()
            logger.info("Connection pool closed")

    def execute_read_query(self, query_id: int) -> float:
        """Execute a read query and measure performance"""
        conn = None
        cursor = None

        try:
            # Get connection from pool
            conn_start = time.time()
            conn = self.pool.getconn()
            conn_time = (time.time() - conn_start) * 1000
            self.metrics.add_connection_time(conn_time)

            cursor = conn.cursor()

            # Execute query
            query_start = time.time()

            # Simulate common query patterns
            queries = [
                # User profile lookup
                """
                SELECT * FROM profiles
                WHERE id = 'test-user-id'
                LIMIT 1
                """,
                # Expense listing with RLS
                """
                SELECT * FROM expenses
                WHERE user_id = 'test-user-id'
                ORDER BY date DESC
                LIMIT 50
                """,
                # Budget utilization view
                """
                SELECT * FROM budget_utilization
                WHERE user_id = 'test-user-id'
                """,
                # PAM conversation history
                """
                SELECT c.*, COUNT(m.id) as message_count
                FROM pam_conversations c
                LEFT JOIN pam_messages m ON c.id = m.conversation_id
                WHERE c.user_id = 'test-user-id'
                GROUP BY c.id
                ORDER BY c.updated_at DESC
                LIMIT 20
                """,
            ]

            query = queries[query_id % len(queries)]
            cursor.execute(query)
            results = cursor.fetchall()

            query_time = (time.time() - query_start) * 1000
            self.metrics.add_query_time(query_time)
            self.metrics.successful_queries += 1

            return query_time

        except Exception as e:
            self.metrics.failed_queries += 1
            error_msg = f"Query {query_id} failed: {str(e)}"
            logger.error(error_msg)
            self.metrics.add_error(error_msg)
            return -1

        finally:
            if cursor:
                cursor.close()
            if conn:
                self.pool.putconn(conn)

    def execute_write_query(self, query_id: int) -> float:
        """Execute a write query (INSERT/UPDATE)"""
        conn = None
        cursor = None

        try:
            conn = self.pool.getconn()
            cursor = conn.cursor()

            query_start = time.time()

            # Test write operations
            cursor.execute(
                """
                INSERT INTO pam_messages (
                    conversation_id,
                    role,
                    content,
                    created_at
                ) VALUES (
                    'test-conversation-id',
                    'user',
                    'Load test message',
                    NOW()
                )
                ON CONFLICT (id) DO NOTHING
                """
            )
            conn.commit()

            query_time = (time.time() - query_start) * 1000
            self.metrics.add_query_time(query_time)
            self.metrics.successful_queries += 1

            return query_time

        except Exception as e:
            self.metrics.failed_queries += 1
            if conn:
                conn.rollback()
            error_msg = f"Write query {query_id} failed: {str(e)}"
            logger.error(error_msg)
            self.metrics.add_error(error_msg)
            return -1

        finally:
            if cursor:
                cursor.close()
            if conn:
                self.pool.putconn(conn)

    def run_stress_test(self) -> DatabaseMetrics:
        """Run the stress test"""
        logger.info(f"Starting database stress test: {self.num_queries} queries, {self.num_workers} workers")

        test_start = time.time()

        self.setup_pool()

        try:
            # Execute queries concurrently using thread pool
            with ThreadPoolExecutor(max_workers=self.num_workers) as executor:
                # Mix of read and write queries (80% read, 20% write)
                futures = []

                for i in range(self.num_queries):
                    if i % 5 == 0:  # 20% writes
                        future = executor.submit(self.execute_write_query, i)
                    else:  # 80% reads
                        future = executor.submit(self.execute_read_query, i)

                    futures.append(future)

                # Wait for all queries to complete
                for future in as_completed(futures):
                    try:
                        future.result()
                    except Exception as e:
                        logger.error(f"Query execution error: {e}")

        finally:
            self.teardown_pool()

        self.metrics.total_duration = time.time() - test_start

        logger.info(f"Stress test completed in {self.metrics.total_duration:.2f}s")

        return self.metrics


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Database Stress Testing")
    parser.add_argument(
        "--db",
        default=os.getenv("DATABASE_URL", "postgresql://localhost/wheels_wins"),
        help="Database connection string"
    )
    parser.add_argument(
        "--queries",
        type=int,
        default=1000,
        help="Number of queries to execute (default: 1000)"
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=10,
        help="Number of concurrent workers (default: 10)"
    )
    parser.add_argument(
        "--pool-size",
        type=int,
        default=20,
        help="Connection pool size (default: 20)"
    )

    args = parser.parse_args()

    # Create and run tester
    tester = DatabaseStressTester(
        connection_string=args.db,
        num_queries=args.queries,
        num_workers=args.workers,
        pool_size=args.pool_size
    )

    # Run the stress test
    metrics = tester.run_stress_test()

    # Print results
    metrics.print_summary()

    # Exit based on performance
    stats = metrics.get_stats()
    p95_time = stats.get('query_time_ms', {}).get('p95', 1000)
    success_rate = stats['success_rate']

    if p95_time < 100 and success_rate >= 0.99:
        logger.info("✅ Database stress test PASSED")
        sys.exit(0)
    else:
        logger.warning("⚠️  Database stress test did not meet targets")
        sys.exit(1)


if __name__ == "__main__":
    main()
