"""
WebSocket Load Testing Suite
Tests concurrent user capacity and performance under load.

Target: 100+ concurrent users
Target P95 latency: <2s under load

Usage:
    python -m pytest backend/tests/load/websocket_load_test.py -v
    python backend/tests/load/websocket_load_test.py --users 100 --duration 300
"""

import asyncio
import time
import json
import statistics
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
import websockets
import logging
import argparse
from concurrent.futures import ThreadPoolExecutor
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class LoadTestMetrics:
    """Metrics collected during load testing"""
    connection_times: List[float] = field(default_factory=list)
    message_latencies: List[float] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    successful_connections: int = 0
    failed_connections: int = 0
    messages_sent: int = 0
    messages_received: int = 0
    total_duration: float = 0.0

    def add_connection_time(self, time_ms: float):
        self.connection_times.append(time_ms)

    def add_message_latency(self, latency_ms: float):
        self.message_latencies.append(latency_ms)

    def add_error(self, error: str):
        self.errors.append(error)

    def get_stats(self) -> Dict[str, Any]:
        """Calculate statistics from collected metrics"""
        stats = {
            "total_connections_attempted": self.successful_connections + self.failed_connections,
            "successful_connections": self.successful_connections,
            "failed_connections": self.failed_connections,
            "connection_success_rate": (
                self.successful_connections / (self.successful_connections + self.failed_connections)
                if (self.successful_connections + self.failed_connections) > 0
                else 0
            ),
            "messages_sent": self.messages_sent,
            "messages_received": self.messages_received,
            "message_delivery_rate": (
                self.messages_received / self.messages_sent
                if self.messages_sent > 0
                else 0
            ),
            "total_errors": len(self.errors),
            "test_duration_seconds": self.total_duration,
        }

        # Connection time statistics
        if self.connection_times:
            stats["connection_time_ms"] = {
                "min": min(self.connection_times),
                "max": max(self.connection_times),
                "mean": statistics.mean(self.connection_times),
                "median": statistics.median(self.connection_times),
                "p95": self._percentile(self.connection_times, 0.95),
                "p99": self._percentile(self.connection_times, 0.99),
            }

        # Message latency statistics
        if self.message_latencies:
            stats["message_latency_ms"] = {
                "min": min(self.message_latencies),
                "max": max(self.message_latencies),
                "mean": statistics.mean(self.message_latencies),
                "median": statistics.median(self.message_latencies),
                "p95": self._percentile(self.message_latencies, 0.95),
                "p99": self._percentile(self.message_latencies, 0.99),
            }

            # Convert to seconds for target comparison
            stats["message_latency_seconds"] = {
                "p95": stats["message_latency_ms"]["p95"] / 1000,
                "p99": stats["message_latency_ms"]["p99"] / 1000,
            }

        # Throughput
        if self.total_duration > 0:
            stats["throughput"] = {
                "connections_per_second": self.successful_connections / self.total_duration,
                "messages_per_second": self.messages_received / self.total_duration,
            }

        return stats

    @staticmethod
    def _percentile(data: List[float], percentile: float) -> float:
        """Calculate percentile of a list"""
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile)
        return sorted_data[min(index, len(sorted_data) - 1)]

    def print_summary(self):
        """Print human-readable summary"""
        stats = self.get_stats()

        print("\n" + "="*80)
        print("LOAD TEST RESULTS SUMMARY")
        print("="*80)

        print(f"\n📊 Connection Statistics:")
        print(f"  Total Attempted: {stats['total_connections_attempted']}")
        print(f"  Successful: {stats['successful_connections']} ({stats['connection_success_rate']*100:.1f}%)")
        print(f"  Failed: {stats['failed_connections']}")

        print(f"\n📨 Message Statistics:")
        print(f"  Sent: {stats['messages_sent']}")
        print(f"  Received: {stats['messages_received']} ({stats['message_delivery_rate']*100:.1f}%)")

        if "connection_time_ms" in stats:
            ct = stats["connection_time_ms"]
            print(f"\n⏱️  Connection Time (ms):")
            print(f"  Min: {ct['min']:.2f}")
            print(f"  Mean: {ct['mean']:.2f}")
            print(f"  Median: {ct['median']:.2f}")
            print(f"  P95: {ct['p95']:.2f}")
            print(f"  P99: {ct['p99']:.2f}")
            print(f"  Max: {ct['max']:.2f}")

        if "message_latency_ms" in stats:
            ml = stats["message_latency_ms"]
            mls = stats["message_latency_seconds"]
            print(f"\n⚡ Message Latency (ms):")
            print(f"  Min: {ml['min']:.2f}")
            print(f"  Mean: {ml['mean']:.2f}")
            print(f"  Median: {ml['median']:.2f}")
            print(f"  P95: {ml['p95']:.2f} ({mls['p95']:.3f}s)")
            print(f"  P99: {ml['p99']:.2f} ({mls['p99']:.3f}s)")
            print(f"  Max: {ml['max']:.2f}")

        if "throughput" in stats:
            tp = stats["throughput"]
            print(f"\n🚀 Throughput:")
            print(f"  Connections/sec: {tp['connections_per_second']:.2f}")
            print(f"  Messages/sec: {tp['messages_per_second']:.2f}")

        print(f"\n⏲️  Test Duration: {stats['test_duration_seconds']:.2f}s")
        print(f"❌ Total Errors: {stats['total_errors']}")

        # Check against targets
        print(f"\n🎯 Target Validation:")
        if stats['successful_connections'] >= 100:
            print(f"  ✅ Concurrent Users: {stats['successful_connections']} (target: 100+)")
        else:
            print(f"  ❌ Concurrent Users: {stats['successful_connections']} (target: 100+)")

        if "message_latency_seconds" in stats:
            p95_latency = stats["message_latency_seconds"]["p95"]
            if p95_latency < 2.0:
                print(f"  ✅ P95 Latency: {p95_latency:.3f}s (target: <2s)")
            else:
                print(f"  ❌ P95 Latency: {p95_latency:.3f}s (target: <2s)")

        if stats['connection_success_rate'] >= 0.95:
            print(f"  ✅ Connection Success Rate: {stats['connection_success_rate']*100:.1f}% (target: >95%)")
        else:
            print(f"  ⚠️  Connection Success Rate: {stats['connection_success_rate']*100:.1f}% (target: >95%)")

        print("="*80 + "\n")


class WebSocketLoadTester:
    """Load tester for WebSocket connections"""

    def __init__(
        self,
        base_url: str,
        num_users: int,
        test_duration: int,
        auth_token: Optional[str] = None
    ):
        self.base_url = base_url
        self.num_users = num_users
        self.test_duration = test_duration
        self.auth_token = auth_token or "test-token-placeholder"
        self.metrics = LoadTestMetrics()

    async def simulate_user(self, user_id: int) -> None:
        """Simulate a single user connection and activity"""
        ws_url = f"{self.base_url}/ws/user-{user_id}?token={self.auth_token}"

        connection_start = time.time()

        try:
            async with websockets.connect(ws_url) as websocket:
                connection_time = (time.time() - connection_start) * 1000
                self.metrics.add_connection_time(connection_time)
                self.metrics.successful_connections += 1

                logger.info(f"User {user_id} connected in {connection_time:.2f}ms")

                # Receive welcome message
                try:
                    welcome = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    logger.debug(f"User {user_id} received welcome: {welcome}")
                except asyncio.TimeoutError:
                    logger.warning(f"User {user_id} did not receive welcome message")

                # Send messages periodically during test duration
                end_time = time.time() + self.test_duration
                message_count = 0

                while time.time() < end_time:
                    # Send a message
                    message_start = time.time()
                    message = {
                        "type": "chat",
                        "message": f"Test message {message_count} from user {user_id}",
                        "timestamp": datetime.utcnow().isoformat()
                    }

                    await websocket.send(json.dumps(message))
                    self.metrics.messages_sent += 1
                    message_count += 1

                    # Wait for response
                    try:
                        response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                        message_latency = (time.time() - message_start) * 1000
                        self.metrics.add_message_latency(message_latency)
                        self.metrics.messages_received += 1

                        logger.debug(
                            f"User {user_id} received response in {message_latency:.2f}ms"
                        )
                    except asyncio.TimeoutError:
                        error_msg = f"User {user_id} message {message_count} timed out"
                        logger.warning(error_msg)
                        self.metrics.add_error(error_msg)

                    # Wait before sending next message (simulate real user behavior)
                    await asyncio.sleep(2.0)

                logger.info(f"User {user_id} completed test with {message_count} messages")

        except Exception as e:
            self.metrics.failed_connections += 1
            error_msg = f"User {user_id} connection failed: {str(e)}"
            logger.error(error_msg)
            self.metrics.add_error(error_msg)

    async def run_load_test(self) -> LoadTestMetrics:
        """Run the load test with specified number of concurrent users"""
        logger.info(f"Starting load test: {self.num_users} users, {self.test_duration}s duration")

        test_start = time.time()

        # Create tasks for all users
        tasks = [
            self.simulate_user(user_id)
            for user_id in range(self.num_users)
        ]

        # Run all user simulations concurrently
        await asyncio.gather(*tasks, return_exceptions=True)

        self.metrics.total_duration = time.time() - test_start

        logger.info(f"Load test completed in {self.metrics.total_duration:.2f}s")

        return self.metrics


def main():
    """Main entry point for load testing"""
    parser = argparse.ArgumentParser(description="WebSocket Load Testing")
    parser.add_argument(
        "--url",
        default="ws://localhost:8000/api/v1/pam",
        help="Base WebSocket URL"
    )
    parser.add_argument(
        "--users",
        type=int,
        default=10,
        help="Number of concurrent users (default: 10)"
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=60,
        help="Test duration in seconds (default: 60)"
    )
    parser.add_argument(
        "--token",
        default=None,
        help="Authentication token (optional)"
    )

    args = parser.parse_args()

    # Create and run load tester
    tester = WebSocketLoadTester(
        base_url=args.url,
        num_users=args.users,
        test_duration=args.duration,
        auth_token=args.token
    )

    # Run the load test
    metrics = asyncio.run(tester.run_load_test())

    # Print results
    metrics.print_summary()

    # Return exit code based on success
    stats = metrics.get_stats()
    if stats['successful_connections'] >= 100 and stats.get('message_latency_seconds', {}).get('p95', 10) < 2.0:
        logger.info("✅ Load test PASSED all targets")
        sys.exit(0)
    else:
        logger.warning("⚠️  Load test did not meet all targets")
        sys.exit(1)


if __name__ == "__main__":
    main()
