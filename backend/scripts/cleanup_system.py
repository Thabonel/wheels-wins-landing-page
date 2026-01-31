#!/usr/bin/env python3
"""
Comprehensive system cleanup script for production environments
"""
import os
import glob
import logging
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict


def setup_logging():
    """Setup logging for cleanup operations"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("cleanup.log", mode="a")
        ]
    )


def get_disk_usage(path: str) -> Dict[str, float]:
    """Get disk usage statistics for a path"""
    try:
        statvfs = os.statvfs(path)
        total = statvfs.f_frsize * statvfs.f_blocks
        available = statvfs.f_frsize * statvfs.f_bavail
        used = total - available

        return {
            "total_gb": total / (1024**3),
            "used_gb": used / (1024**3),
            "available_gb": available / (1024**3),
            "used_percent": (used / total) * 100
        }
    except OSError as e:
        logging.error(f"Error getting disk usage for {path}: {e}")
        return {}


def cleanup_old_logs(log_dir: str, max_age_days: int = 7) -> List[str]:
    """Remove log files older than max_age_days"""
    if not os.path.exists(log_dir):
        return []

    removed_files = []
    cutoff_time = datetime.now() - timedelta(days=max_age_days)

    log_patterns = ["*.log", "*.log.*", "*.out", "*.err"]

    for pattern in log_patterns:
        pattern_path = os.path.join(log_dir, pattern)
        log_files = glob.glob(pattern_path)

        for log_file in log_files:
            try:
                file_time = datetime.fromtimestamp(os.path.getmtime(log_file))

                if file_time < cutoff_time:
                    file_size_mb = os.path.getsize(log_file) / (1024**2)
                    os.remove(log_file)
                    removed_files.append(log_file)
                    logging.info(f"Removed old log: {log_file} ({file_size_mb:.1f} MB)")

            except OSError as e:
                logging.error(f"Error removing {log_file}: {e}")

    return removed_files


def cleanup_temp_files(base_dir: str) -> List[str]:
    """Remove temporary files and cache directories"""
    if not os.path.exists(base_dir):
        return []

    removed_items = []

    temp_patterns = [
        "**/.pytest_cache",
        "**/htmlcov",
        "**/__pycache__",
        "**/*.pyc",
        "**/.coverage*",
        "**/coverage.xml",
        "**/coverage.json",
        "**/.DS_Store",
        "**/Thumbs.db",
        "**/*.tmp",
        "**/*.temp"
    ]

    for pattern in temp_patterns:
        pattern_path = os.path.join(base_dir, pattern)
        matches = glob.glob(pattern_path, recursive=True)

        for match in matches:
            try:
                if os.path.isfile(match):
                    os.remove(match)
                    removed_items.append(match)
                elif os.path.isdir(match):
                    shutil.rmtree(match)
                    removed_items.append(match)

            except OSError as e:
                logging.error(f"Error removing {match}: {e}")

    return removed_items


def compress_large_logs(log_dir: str, size_threshold_mb: int = 50) -> List[str]:
    """Compress log files larger than threshold"""
    if not os.path.exists(log_dir):
        return []

    compressed_files = []

    for log_file in glob.glob(os.path.join(log_dir, "*.log")):
        try:
            file_size_mb = os.path.getsize(log_file) / (1024**2)

            if file_size_mb > size_threshold_mb:
                # Compress with gzip
                import gzip

                compressed_name = f"{log_file}.gz"

                with open(log_file, 'rb') as f_in:
                    with gzip.open(compressed_name, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)

                # Replace original with compressed
                os.remove(log_file)
                compressed_files.append(log_file)
                logging.info(f"Compressed large log: {log_file} ({file_size_mb:.1f} MB)")

        except (OSError, ImportError) as e:
            logging.error(f"Error compressing {log_file}: {e}")

    return compressed_files


def main():
    """Main cleanup routine"""
    setup_logging()

    # Get initial disk usage
    disk_before = get_disk_usage("/")
    if disk_before:
        logging.info(f"Disk usage before cleanup: {disk_before['used_percent']:.1f}% ({disk_before['used_gb']:.1f} GB used)")

    total_operations = 0

    # Define cleanup locations
    cleanup_locations = {
        "logs": [
            "/opt/render/project/src/backend/logs",
            "backend/logs",
            "logs",
            "/var/log/app"
        ],
        "temp": [
            "/opt/render/project/src",
            "backend",
            "."
        ]
    }

    # Cleanup logs (keep last 7 days)
    for log_dir in cleanup_locations["logs"]:
        if os.path.exists(log_dir):
            removed = cleanup_old_logs(log_dir, max_age_days=7)
            total_operations += len(removed)
            if removed:
                logging.info(f"Cleaned {len(removed)} log files from {log_dir}")

    # Compress large logs
    for log_dir in cleanup_locations["logs"]:
        if os.path.exists(log_dir):
            compressed = compress_large_logs(log_dir, size_threshold_mb=50)
            total_operations += len(compressed)
            if compressed:
                logging.info(f"Compressed {len(compressed)} large logs in {log_dir}")

    # Cleanup temp files
    for project_dir in cleanup_locations["temp"]:
        if os.path.exists(project_dir):
            removed = cleanup_temp_files(project_dir)
            total_operations += len(removed)
            if removed:
                logging.info(f"Cleaned {len(removed)} temp files from {project_dir}")

    # Get final disk usage
    disk_after = get_disk_usage("/")
    if disk_after and disk_before:
        saved_gb = disk_before["used_gb"] - disk_after["used_gb"]
        logging.info(f"Cleanup complete: {total_operations} operations performed")
        logging.info(f"Disk usage after cleanup: {disk_after['used_percent']:.1f}% ({disk_after['used_gb']:.1f} GB used)")
        logging.info(f"Space saved: {saved_gb:.2f} GB")
    else:
        logging.info(f"Cleanup complete: {total_operations} operations performed")

    return {
        "operations_performed": total_operations,
        "disk_before": disk_before,
        "disk_after": disk_after
    }


if __name__ == "__main__":
    main()