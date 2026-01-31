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