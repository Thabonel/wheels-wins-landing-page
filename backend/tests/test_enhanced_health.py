"""
Test Enhanced Health Monitoring Endpoint
"""
import pytest
import asyncio
from app.api.health import detailed_health_check


def test_enhanced_health_function_directly():
    """Test our enhanced detailed health function directly"""
    # Test the function directly to ensure our enhancements work
    result = asyncio.run(detailed_health_check())

    # Verify enhanced monitoring structure
    assert "status" in result
    assert "timestamp" in result
    assert "service" in result
    assert result["service"] == "pam-backend"
    assert "version" in result
    assert result["version"] == "2.0.4"

    # Verify enhanced monitoring sections
    assert "ai_providers" in result
    assert "agents" in result
    assert "tools" in result
    assert "database" in result
    assert "performance" in result
    assert "response_time_ms" in result

    # Verify AI providers section structure
    assert "primary" in result["ai_providers"]
    ai_provider = result["ai_providers"]["primary"]
    assert "provider" in ai_provider
    assert "status" in ai_provider
    assert "configured" in ai_provider

    # Verify tools section structure
    tools = result["tools"]
    assert "status" in tools
    assert "total_registered" in tools

    # Verify performance section has enhanced metrics
    performance = result["performance"]
    assert "python_version" in performance
    if "memory_usage_mb" in performance:
        assert isinstance(performance["memory_usage_mb"], (int, float))

    # Verify response time tracking
    assert isinstance(result["response_time_ms"], (int, float))
    assert result["response_time_ms"] > 0

    # Verify backward compatibility
    assert "platform_status" in result
    platform_status = result["platform_status"]
    assert "anthropic" in platform_status
    assert "gemini" in platform_status


def test_enhanced_health_status_determination():
    """Test that status determination logic works"""
    result = asyncio.run(detailed_health_check())

    # Status should be one of the expected values
    assert result["status"] in ["healthy", "degraded", "unhealthy"]

    # With test configuration, should be unhealthy due to database connection
    # (fake credentials will cause DB connection to fail)
    assert result["status"] in ["degraded", "unhealthy"]


def test_enhanced_health_error_handling():
    """Test that health check handles errors gracefully"""
    result = asyncio.run(detailed_health_check())

    # Should not crash even with invalid configurations
    assert "status" in result
    assert "timestamp" in result

    # Errors should be captured in respective sections
    if "error" in result.get("agents", {}):
        assert isinstance(result["agents"]["error"], str)
    if "error" in result.get("database", {}):
        assert isinstance(result["database"]["error"], str)