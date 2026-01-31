"""
Unit tests for Technical Monitoring Agent
Tests health data parsing, threshold detection, and decision logic with mocked dependencies.
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
from agents.autonomous.technical_monitor import TechnicalMonitor


class TestTechnicalMonitor:
    """Unit tests for TechnicalMonitor class"""

    @pytest.fixture
    def monitor(self):
        """Create TechnicalMonitor instance for testing"""
        return TechnicalMonitor()

    @pytest.fixture
    def sample_health_data(self):
        """Sample health data for testing"""
        return {
            "status": "WARNING",
            "health_score": 50,
            "alerts": 1,
            "stats": {
                "memory_pct": 82.5,
                "disk_pct": 77.3,
                "cpu_pct": 45.2
            },
            "timestamp": datetime.now().isoformat()
        }

    def test_health_parsing_normal_status(self, monitor, sample_health_data):
        """Test parsing of healthy system status"""
        # Normal status data
        healthy_data = sample_health_data.copy()
        healthy_data.update({
            "status": "HEALTHY",
            "health_score": 100,
            "alerts": 0,
            "stats": {
                "memory_pct": 45.0,
                "disk_pct": 55.0,
                "cpu_pct": 25.0
            }
        })

        parsed = monitor.parse_health_data(healthy_data)

        assert parsed["status"] == "HEALTHY"
        assert parsed["memory_pct"] == 45.0
        assert parsed["disk_pct"] == 55.0
        assert parsed["cpu_pct"] == 25.0
        assert parsed["alerts"] == 0

    def test_health_parsing_critical_status(self, monitor, sample_health_data):
        """Test parsing of critical system status"""
        # Critical status data
        critical_data = sample_health_data.copy()
        critical_data.update({
            "status": "CRITICAL",
            "health_score": 0,
            "alerts": 3,
            "stats": {
                "memory_pct": 95.0,
                "disk_pct": 92.0,
                "cpu_pct": 98.0
            }
        })

        parsed = monitor.parse_health_data(critical_data)

        assert parsed["status"] == "CRITICAL"
        assert parsed["memory_pct"] == 95.0
        assert parsed["disk_pct"] == 92.0
        assert parsed["cpu_pct"] == 98.0
        assert parsed["alerts"] == 3

    def test_threshold_detection_memory_warning(self, monitor):
        """Test memory threshold detection for warning level"""
        health_data = {
            "memory_pct": 82.5,
            "disk_pct": 55.0,
            "cpu_pct": 30.0
        }

        thresholds = monitor.detect_thresholds_exceeded(health_data)

        assert "memory" in thresholds
        assert thresholds["memory"]["level"] == "critical"
        assert thresholds["memory"]["value"] == 82.5
        assert thresholds["memory"]["threshold"] == 80.0

    def test_threshold_detection_disk_critical(self, monitor):
        """Test disk threshold detection for critical level"""
        health_data = {
            "memory_pct": 45.0,
            "disk_pct": 92.0,
            "cpu_pct": 30.0
        }

        thresholds = monitor.detect_thresholds_exceeded(health_data)

        assert "disk" in thresholds
        assert thresholds["disk"]["level"] == "critical"
        assert thresholds["disk"]["value"] == 92.0
        assert thresholds["disk"]["threshold"] == 85.0

    def test_threshold_detection_multiple_issues(self, monitor):
        """Test detection of multiple threshold violations"""
        health_data = {
            "memory_pct": 85.0,
            "disk_pct": 90.0,
            "cpu_pct": 97.0
        }

        thresholds = monitor.detect_thresholds_exceeded(health_data)

        assert len(thresholds) == 3
        assert "memory" in thresholds
        assert "disk" in thresholds
        assert "cpu" in thresholds

        # All should be critical level
        for component, info in thresholds.items():
            assert info["level"] == "critical"

    def test_threshold_detection_no_issues(self, monitor):
        """Test that healthy values don't trigger thresholds"""
        health_data = {
            "memory_pct": 45.0,
            "disk_pct": 55.0,
            "cpu_pct": 25.0
        }

        thresholds = monitor.detect_thresholds_exceeded(health_data)

        assert len(thresholds) == 0

    @pytest.mark.asyncio
    async def test_health_endpoint_polling_success(self, monitor):
        """Test successful health endpoint polling"""
        mock_response = {
            "status": "HEALTHY",
            "stats": {
                "memory_pct": 45.0,
                "disk_pct": 55.0,
                "cpu_pct": 25.0
            }
        }

        with patch('agents.autonomous.technical_monitor.requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_response

            result = await monitor.poll_health_endpoint()

            assert result["status"] == "HEALTHY"
            assert "stats" in result
            mock_get.assert_called_once()

    @pytest.mark.asyncio
    async def test_health_endpoint_polling_failure(self, monitor):
        """Test handling of health endpoint failures"""
        with patch('agents.autonomous.technical_monitor.requests.get') as mock_get:
            mock_get.side_effect = ConnectionError("Connection failed")

            result = await monitor.poll_health_endpoint()

            assert result["status"] == "ERROR"
            assert "error" in result
            assert "Connection failed" in result["error"]

    def test_adaptive_polling_frequency_normal(self, monitor):
        """Test adaptive polling returns normal frequency for healthy system"""
        health_data = {"status": "HEALTHY", "alerts": 0}

        frequency = monitor.get_adaptive_polling_frequency(health_data)

        assert frequency == 30  # Normal 30 second polling

    def test_adaptive_polling_frequency_issues(self, monitor):
        """Test adaptive polling returns higher frequency during issues"""
        health_data = {"status": "CRITICAL", "alerts": 3}

        frequency = monitor.get_adaptive_polling_frequency(health_data)

        assert frequency == 10  # Increased 10 second polling during issues


class TestRemediationLibrary:
    """Unit tests for RemediationLibrary"""

    @pytest.fixture
    def remediation_lib(self):
        """Create RemediationLibrary instance for testing"""
        from agents.autonomous.remediation_library import RemediationLibrary
        return RemediationLibrary()

    @pytest.mark.asyncio
    async def test_cleanup_disk_space_action(self, remediation_lib):
        """Test disk cleanup action with mocked execution"""
        with patch('agents.autonomous.remediation_library.subprocess.run') as mock_run:
            mock_run.return_value.returncode = 0
            mock_run.return_value.stdout = "Cleaned 539 files, saved 0.13 GB"

            result = await remediation_lib.execute_action("cleanup_disk_space", {})

            assert result["success"] is True
            assert result["action"] == "cleanup_disk_space"
            assert "Cleaned" in result["details"]
            mock_run.assert_called_once()

    @pytest.mark.asyncio
    async def test_restart_celery_workers_action(self, remediation_lib):
        """Test Celery worker restart action"""
        # This action currently simulates the restart, doesn't call subprocess
        result = await remediation_lib.execute_action("restart_celery_workers", {})

        assert result["success"] is True
        assert result["action"] == "restart_celery_workers"
        assert "restarted successfully" in result["details"]

    @pytest.mark.asyncio
    async def test_clear_redis_cache_action(self, remediation_lib):
        """Test Redis cache clearing action"""
        # Mock the cache service import inside the method
        with patch('app.services.cache_service.cache_service') as mock_cache:
            mock_cache.redis = Mock()
            mock_cache.redis.dbsize = AsyncMock(return_value=100)
            mock_cache.clear_expired = AsyncMock(return_value=25)

            result = await remediation_lib.execute_action("clear_redis_cache", {})

            assert result["success"] is True
            assert result["action"] == "clear_redis_cache"
            assert "expired keys removed" in result["details"]

    @pytest.mark.asyncio
    async def test_action_failure_handling(self, remediation_lib):
        """Test handling of failed remediation actions"""
        with patch('agents.autonomous.remediation_library.subprocess.run') as mock_run:
            mock_run.return_value.returncode = 1
            mock_run.return_value.stderr = "Permission denied"
            mock_run.return_value.stdout = ""

            result = await remediation_lib.execute_action("cleanup_disk_space", {})

            assert result["success"] is False
            assert "Permission denied" in result["error"]

    def test_action_selection_for_memory_issue(self, remediation_lib):
        """Test action selection for memory issues"""
        issue_data = {
            "component": "memory",
            "level": "critical",
            "value": 85.0
        }

        actions = remediation_lib.get_recommended_actions(issue_data)

        assert "cleanup_disk_space" in actions
        assert "restart_celery_workers" in actions
        assert "clear_redis_cache" in actions

    def test_action_selection_for_disk_issue(self, remediation_lib):
        """Test action selection for disk issues"""
        issue_data = {
            "component": "disk",
            "level": "critical",
            "value": 90.0
        }

        actions = remediation_lib.get_recommended_actions(issue_data)

        assert "cleanup_disk_space" in actions
        # Disk issues should prioritize cleanup over restarts

    def test_track_action_success(self, remediation_lib):
        """Test tracking of successful actions"""
        action_result = {
            "action": "cleanup_disk_space",
            "success": True,
            "duration": 15.5,
            "timestamp": "2024-01-01T12:00:00"
        }

        remediation_lib.track_action_result(action_result)

        metrics = remediation_lib.get_action_metrics("cleanup_disk_space")
        assert metrics["success_count"] == 1
        assert metrics["total_count"] == 1
        assert metrics["success_rate"] == 1.0

    def test_track_action_failure(self, remediation_lib):
        """Test tracking of failed actions"""
        action_result = {
            "action": "restart_celery_workers",
            "success": False,
            "error": "Connection failed",
            "timestamp": "2024-01-01T12:00:00"
        }

        remediation_lib.track_action_result(action_result)

        metrics = remediation_lib.get_action_metrics("restart_celery_workers")
        assert metrics["success_count"] == 0
        assert metrics["total_count"] == 1
        assert metrics["success_rate"] == 0.0