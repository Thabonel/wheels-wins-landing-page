"""
Test Resource Optimization Implementation
Validates memory, disk, and performance optimizations for production stability.
"""
import psutil
import time
import os
import tempfile
from datetime import datetime, timedelta
from app.workers.celery import celery_app


def test_celery_memory_optimization():
    """Test that Celery worker memory usage is controlled"""

    # Get initial memory baseline
    process = psutil.Process()
    initial_memory = process.memory_info().rss / 1024 / 1024  # MB

    # Simulate task processing (this would need actual task simulation)
    # For now, verify configuration is optimized

    # Check worker configuration
    assert celery_app.conf.worker_max_tasks_per_child <= 200, \
        f"worker_max_tasks_per_child too high: {celery_app.conf.worker_max_tasks_per_child}"

    assert celery_app.conf.worker_prefetch_multiplier <= 2, \
        f"worker_prefetch_multiplier too high: {celery_app.conf.worker_prefetch_multiplier}"


def test_automated_cleanup_removes_old_files():
    """Test that automated cleanup removes old files but keeps recent ones"""

    # Create temporary directory structure
    with tempfile.TemporaryDirectory() as temp_dir:
        log_dir = os.path.join(temp_dir, "logs")
        os.makedirs(log_dir)

        # Create fake log files with different ages
        old_log = os.path.join(log_dir, "old.log")
        recent_log = os.path.join(log_dir, "recent.log")

        # Create files
        with open(old_log, "w") as f:
            f.write("old log content")
        with open(recent_log, "w") as f:
            f.write("recent log content")

        # Set file modification times (simulate age)
        old_time = (datetime.now() - timedelta(days=8)).timestamp()
        recent_time = (datetime.now() - timedelta(days=2)).timestamp()

        os.utime(old_log, (old_time, old_time))
        os.utime(recent_log, (recent_time, recent_time))

        # Test cleanup function
        from scripts.cleanup_system import cleanup_old_logs

        removed_files = cleanup_old_logs(log_dir, max_age_days=7)

        # Verify old file removed, recent file kept
        assert not os.path.exists(old_log), "Old log file should be removed"
        assert os.path.exists(recent_log), "Recent log file should be kept"
        assert len(removed_files) == 1, "Should remove exactly one old file"