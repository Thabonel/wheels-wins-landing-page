#!/usr/bin/env python3
"""
Test script for the integrated performance monitoring system.
"""

import asyncio
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.core.logging import setup_logging, get_logger
from app.monitoring.integration_manager import get_integration_manager

setup_logging()
logger = get_logger(__name__)


async def test_performance_integration():
    """Test the integrated performance monitoring system."""
    logger.info("🧪 Testing integrated performance monitoring...")
    
    try:
        # Test integration manager
        integration_manager = await get_integration_manager()
        
        # Test initialization
        logger.info("1️⃣ Testing component initialization...")
        await integration_manager.initialize()
        logger.info("✅ Components initialized successfully")
        
        # Test health status
        logger.info("2️⃣ Testing health status...")
        health_status = await integration_manager.get_health_status()
        logger.info(f"📊 System Status: {health_status['status']}")
        logger.info(f"📊 Uptime: {health_status['uptime_seconds']:.1f}s")
        
        # Test performance metrics
        logger.info("3️⃣ Testing performance metrics...")
        metrics = await integration_manager.get_performance_metrics()
        if 'memory_optimization' in metrics:
            current_metrics = metrics['memory_optimization'].get('current_metrics', {})
            logger.info(f"📊 Memory: {current_metrics.get('memory_percent', 0):.1f}%")
            logger.info(f"📊 Process Memory: {current_metrics.get('process_memory_mb', 0):.1f}MB")
        
        # Test manual optimization
        logger.info("4️⃣ Testing manual optimization...")
        optimization_result = await integration_manager.optimize_system()
        logger.info(f"🔧 Optimization: {'✅ Success' if optimization_result else '❌ Failed'}")
        
        # Test threshold updates
        logger.info("5️⃣ Testing threshold updates...")
        test_thresholds = {
            'memory_usage': {
                'warning': 80.0,
                'error': 90.0, 
                'critical': 95.0
            }
        }
        threshold_result = await integration_manager.update_monitoring_thresholds(test_thresholds)
        logger.info(f"📊 Thresholds: {'✅ Updated' if threshold_result else '❌ Failed'}")
        
        # Test individual services
        logger.info("6️⃣ Testing individual services...")
        
        # Memory manager test
        if 'memory_manager' in integration_manager.services:
            memory_manager = integration_manager.services['memory_manager']
            memory_stats = await memory_manager.get_optimization_stats()
            config = memory_stats.get('configuration', {})
            logger.info(f"🧠 Memory Manager: {config.get('system_memory_gb', 0):.1f}GB system")
            logger.info(f"🧠 Warning Threshold: {config.get('warning_threshold', 0):.1f}%")
        
        # Monitoring system test
        if 'monitoring' in integration_manager.services:
            monitoring = integration_manager.services['monitoring']
            monitoring_status = await monitoring.get_monitoring_status()
            system_status = monitoring_status.get('system_status', {})
            logger.info(f"📊 Monitoring: {system_status.get('active_alerts', 0)} active alerts")
            logger.info(f"📊 Today's Alerts: {system_status.get('total_alerts_today', 0)}")
        
        # Test graceful shutdown
        logger.info("7️⃣ Testing graceful shutdown...")
        await integration_manager.shutdown()
        logger.info("✅ Components shut down successfully")
        
        logger.info("🎉 All integration tests passed!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Integration test failed: {e}")
        return False


async def test_memory_optimization_patterns():
    """Test memory optimization patterns specifically."""
    logger.info("🧠 Testing memory optimization patterns...")
    
    try:
        from app.monitoring.optimized_memory_manager import get_optimized_memory_manager
        
        memory_manager = await get_optimized_memory_manager()
        await memory_manager.start()
        
        # Test different cleanup strategies
        logger.info("Testing cleanup strategies...")
        
        # Routine cleanup
        await memory_manager._routine_cleanup()
        logger.info("✅ Routine cleanup tested")
        
        # Standard cleanup
        await memory_manager._standard_cleanup()
        logger.info("✅ Standard cleanup tested")
        
        # Get optimization stats
        stats = await memory_manager.get_optimization_stats()
        current_metrics = stats.get('current_metrics', {})
        
        logger.info(f"📊 Current Memory: {current_metrics.get('memory_percent', 0):.1f}%")
        logger.info(f"📊 Process Memory: {current_metrics.get('process_memory_mb', 0):.1f}MB")
        logger.info(f"📊 GC Thresholds: {stats.get('configuration', {}).get('gc_thresholds', 'N/A')}")
        
        await memory_manager.stop()
        logger.info("✅ Memory optimization pattern tests passed!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Memory optimization test failed: {e}")
        return False


async def test_monitoring_alerts():
    """Test the enhanced monitoring and alerting system."""
    logger.info("🚨 Testing monitoring and alerting system...")
    
    try:
        from app.monitoring.enhanced_monitoring import get_enhanced_monitoring
        
        monitoring = await get_enhanced_monitoring()
        await monitoring.start()
        
        # Test metric collection
        logger.info("Testing metric collection...")
        system_metrics = await monitoring._collect_system_metrics()
        app_metrics = await monitoring._collect_application_metrics()
        
        logger.info(f"📊 System Metrics: {len(system_metrics)} collected")
        logger.info(f"📊 App Metrics: {len(app_metrics)} collected")
        
        # Test threshold configuration
        logger.info("Testing threshold management...")
        monitoring.update_threshold('memory_usage', 'warning', 75.0)
        monitoring.enable_metric('cpu_usage', True)
        
        # Get monitoring status
        status = await monitoring.get_monitoring_status()
        logger.info(f"📊 Active Alerts: {len(status.get('active_alerts', []))}")
        logger.info(f"📊 Configured Thresholds: {len(status.get('thresholds', {}))}")
        
        await monitoring.stop()
        logger.info("✅ Monitoring and alerting tests passed!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Monitoring test failed: {e}")
        return False


async def main():
    """Main test runner."""
    logger.info("🚀 Starting Performance Integration Tests")
    logger.info("=" * 60)
    
    test_results = []
    
    # Run all tests
    tests = [
        ("Integration Manager", test_performance_integration),
        ("Memory Optimization", test_memory_optimization_patterns),
        ("Monitoring & Alerts", test_monitoring_alerts),
    ]
    
    for test_name, test_func in tests:
        logger.info(f"\n🧪 Running {test_name} tests...")
        try:
            result = await test_func()
            test_results.append((test_name, result))
            status = "✅ PASSED" if result else "❌ FAILED"
            logger.info(f"{status}: {test_name}")
        except Exception as e:
            test_results.append((test_name, False))
            logger.error(f"❌ FAILED: {test_name} - {e}")
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("🎯 Test Summary:")
    
    passed = sum(1 for _, result in test_results if result)
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        logger.info(f"   {status}: {test_name}")
    
    logger.info(f"\n📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 All performance integration tests passed!")
        logger.info("✅ Your optimized backend is ready for deployment!")
    else:
        logger.warning(f"⚠️ {total - passed} tests failed - review logs for details")
    
    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)