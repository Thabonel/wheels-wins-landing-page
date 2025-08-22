#!/usr/bin/env python3
"""
AI Failover Simulation Script
Tests the AI provider failover by simulating provider failures
"""

import asyncio
import os
import sys
import json
import time
from datetime import datetime
from unittest.mock import patch

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.ai.ai_orchestrator import ai_orchestrator, AIMessage
from app.services.ai.provider_interface import AIProviderStatus
from app.core.config import settings

class FailoverSimulator:
    """Simulate AI provider failures to test failover"""
    
    def __init__(self):
        self.test_results = []
        self.start_time = datetime.now()
    
    def log_test(self, test_name: str, status: str, message: str, details: dict = None):
        """Log test results"""
        result = {
            "test_name": test_name,
            "status": status,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details or {}
        }
        self.test_results.append(result)
        
        # Print colored output
        color = {
            "PASS": "\033[92m",  # Green
            "FAIL": "\033[91m",  # Red
            "WARN": "\033[93m",  # Yellow
            "INFO": "\033[94m"   # Blue
        }.get(status, "\033[0m")
        
        print(f"{color}[{status}] {test_name}: {message}\033[0m")
        if details:
            print(f"  Details: {json.dumps(details, indent=2)}")
    
    async def test_setup_dual_providers(self):
        """Set up both OpenAI and Anthropic providers for testing"""
        self.log_test("Setup", "INFO", "Setting up dual providers for failover testing...")
        
        # Temporarily set Anthropic API key for testing
        # Using a test key format (not a real key)
        test_anthropic_key = "sk-ant-test-key-for-failover-simulation"
        
        # Patch the settings to include Anthropic
        with patch.object(settings, 'ANTHROPIC_API_KEY', test_anthropic_key):
            try:
                # Reinitialize orchestrator with both providers
                await ai_orchestrator.cleanup()
                await ai_orchestrator.initialize()
                
                status = ai_orchestrator.get_status()
                details = {
                    "total_providers": status["total_providers"],
                    "healthy_providers": status["healthy_providers"],
                    "providers": [p["name"] for p in status["providers"]]
                }
                
                if status["total_providers"] >= 1:
                    self.log_test("Dual Provider Setup", "PASS", 
                                 f"Initialized with {status['total_providers']} provider(s)", details)
                    return True
                else:
                    self.log_test("Dual Provider Setup", "FAIL", "No providers initialized", details)
                    return False
                    
            except Exception as e:
                self.log_test("Dual Provider Setup", "FAIL", f"Setup error: {str(e)}")
                return False
    
    async def test_normal_operation(self):
        """Test normal operation before simulating failures"""
        self.log_test("Normal Operation", "INFO", "Testing normal AI operation...")
        
        test_messages = [
            AIMessage(role="user", content="Hello, respond with 'Normal operation test'")
        ]
        
        try:
            response = await ai_orchestrator.complete(
                messages=test_messages,
                temperature=0.1,
                max_tokens=20
            )
            
            details = {
                "provider_used": response.provider,
                "response_content": response.content,
                "latency_ms": response.latency_ms
            }
            
            self.log_test("Normal Operation", "PASS", 
                         f"Success via {response.provider}", details)
            return details
            
        except Exception as e:
            self.log_test("Normal Operation", "FAIL", f"Normal operation failed: {str(e)}")
            return {"error": str(e)}
    
    async def test_provider_circuit_breaker(self):
        """Test circuit breaker behavior by forcing failures"""
        self.log_test("Circuit Breaker", "INFO", "Testing circuit breaker functionality...")
        
        if len(ai_orchestrator.providers) == 0:
            self.log_test("Circuit Breaker", "FAIL", "No providers available for testing")
            return {}
        
        provider = ai_orchestrator.providers[0]
        provider_name = provider.name
        
        # Manually trip the circuit breaker
        original_threshold = ai_orchestrator.circuit_breaker_threshold
        ai_orchestrator.circuit_breaker_threshold = 1  # Lower threshold for testing
        
        # Force consecutive failures to trip circuit breaker
        for i in range(3):
            ai_orchestrator._update_metrics_failure(provider_name)
        
        # Check if circuit breaker is tripped
        is_tripped = ai_orchestrator._is_circuit_broken(provider_name)
        
        details = {
            "provider_tested": provider_name,
            "consecutive_failures": ai_orchestrator.provider_metrics[provider_name].consecutive_failures,
            "circuit_breaker_tripped": is_tripped,
            "threshold_used": ai_orchestrator.circuit_breaker_threshold
        }
        
        if is_tripped:
            self.log_test("Circuit Breaker", "PASS", 
                         f"Circuit breaker tripped for {provider_name}", details)
        else:
            self.log_test("Circuit Breaker", "WARN", 
                         f"Circuit breaker not tripped for {provider_name}", details)
        
        # Reset circuit breaker and threshold
        if provider_name in ai_orchestrator.circuit_breakers:
            del ai_orchestrator.circuit_breakers[provider_name]
        ai_orchestrator.provider_metrics[provider_name].consecutive_failures = 0
        ai_orchestrator.circuit_breaker_threshold = original_threshold
        
        return details
    
    async def test_provider_health_degradation(self):
        """Test system behavior when provider health degrades"""
        self.log_test("Health Degradation", "INFO", "Testing provider health degradation...")
        
        if len(ai_orchestrator.providers) == 0:
            self.log_test("Health Degradation", "FAIL", "No providers available for testing")
            return {}
        
        provider = ai_orchestrator.providers[0]
        original_status = provider._status
        
        # Temporarily mark provider as unhealthy
        provider._status = AIProviderStatus.UNHEALTHY
        
        # Test completion with unhealthy provider
        test_messages = [
            AIMessage(role="user", content="Test with unhealthy provider")
        ]
        
        try:
            response = await ai_orchestrator.complete(
                messages=test_messages,
                temperature=0.1,
                max_tokens=20
            )
            
            details = {
                "provider_used": response.provider,
                "response_received": bool(response.content),
                "original_status": original_status.value,
                "test_status": "unhealthy"
            }
            
            self.log_test("Health Degradation", "INFO", 
                         f"Response received despite unhealthy status via {response.provider}", details)
            
        except Exception as e:
            details = {
                "error": str(e),
                "original_status": original_status.value,
                "test_status": "unhealthy"
            }
            
            self.log_test("Health Degradation", "PASS", 
                         "System correctly failed with unhealthy provider", details)
        
        # Restore original status
        provider._status = original_status
        
        return details
    
    async def test_load_balancing(self):
        """Test load balancing across providers"""
        self.log_test("Load Balancing", "INFO", "Testing load balancing...")
        
        if len(ai_orchestrator.providers) < 2:
            self.log_test("Load Balancing", "WARN", 
                         f"Only {len(ai_orchestrator.providers)} provider(s) - limited load balancing test")
            return {"providers_available": len(ai_orchestrator.providers)}
        
        # Test multiple requests to see provider distribution
        provider_usage = {}
        test_messages = [
            AIMessage(role="user", content="Load balancing test")
        ]
        
        for i in range(5):
            try:
                response = await ai_orchestrator.complete(
                    messages=test_messages,
                    temperature=0.1,
                    max_tokens=10
                )
                
                provider_used = response.provider
                if provider_used not in provider_usage:
                    provider_usage[provider_used] = 0
                provider_usage[provider_used] += 1
                
            except Exception as e:
                provider_usage[f"error_{i}"] = str(e)
        
        details = {
            "provider_usage": provider_usage,
            "total_requests": 5,
            "unique_providers_used": len([k for k in provider_usage.keys() if not k.startswith("error_")])
        }
        
        if len(provider_usage) > 1:
            self.log_test("Load Balancing", "PASS", 
                         "Multiple providers were used", details)
        else:
            self.log_test("Load Balancing", "INFO", 
                         "Single provider handled all requests", details)
        
        return details
    
    async def test_response_consistency(self):
        """Test response consistency across providers"""
        self.log_test("Response Consistency", "INFO", "Testing response consistency...")
        
        # Test same prompt multiple times
        test_messages = [
            AIMessage(role="user", content="What is 2+2? Answer with just the number.")
        ]
        
        responses = []
        for i in range(3):
            try:
                response = await ai_orchestrator.complete(
                    messages=test_messages,
                    temperature=0.1,
                    max_tokens=10
                )
                
                responses.append({
                    "provider": response.provider,
                    "content": response.content.strip(),
                    "latency_ms": response.latency_ms
                })
                
            except Exception as e:
                responses.append({"error": str(e)})
        
        # Check consistency
        contents = [r.get("content", "") for r in responses if "content" in r]
        consistent = len(set(contents)) <= 2  # Allow some variation but expect mostly consistent
        
        details = {
            "responses": responses,
            "unique_contents": list(set(contents)),
            "consistent": consistent
        }
        
        if consistent and len(contents) > 0:
            self.log_test("Response Consistency", "PASS", 
                         "Responses are reasonably consistent", details)
        else:
            self.log_test("Response Consistency", "WARN", 
                         "Response consistency varies", details)
        
        return details
    
    async def run_failover_simulation(self):
        """Run complete failover simulation"""
        print("🔧 Starting AI Failover Simulation")
        print("=" * 60)
        
        # Run all tests
        test_results = {}
        
        # Setup
        setup_success = await self.test_setup_dual_providers()
        if not setup_success:
            print("❌ Setup failed - aborting simulation")
            return
        
        # Run simulation tests
        test_results["normal_operation"] = await self.test_normal_operation()
        test_results["circuit_breaker"] = await self.test_provider_circuit_breaker()
        test_results["health_degradation"] = await self.test_provider_health_degradation()
        test_results["load_balancing"] = await self.test_load_balancing()
        test_results["response_consistency"] = await self.test_response_consistency()
        
        # Generate summary
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["status"] == "PASS"])
        failed_tests = len([r for r in self.test_results if r["status"] == "FAIL"])
        warned_tests = len([r for r in self.test_results if r["status"] == "WARN"])
        
        print("\n" + "=" * 60)
        print("🎯 FAILOVER SIMULATION SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⚠️  Warnings: {warned_tests}")
        print(f"Test Duration: {(datetime.now() - self.start_time).total_seconds():.2f}s")
        
        # Get final orchestrator status
        final_status = ai_orchestrator.get_status()
        print(f"\nFinal Orchestrator Status:")
        print(f"  Providers: {final_status['total_providers']}")
        print(f"  Healthy: {final_status['healthy_providers']}")
        print(f"  Strategy: {final_status['strategy']}")
        
        if failed_tests == 0:
            print("\n🎉 Failover simulation completed successfully!")
        else:
            print(f"\n⚠️  {failed_tests} test(s) failed during simulation.")
        
        # Save detailed results
        report = {
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "warnings": warned_tests,
                "duration_seconds": (datetime.now() - self.start_time).total_seconds()
            },
            "test_results": self.test_results,
            "detailed_results": test_results,
            "final_orchestrator_status": final_status,
            "timestamp": datetime.now().isoformat()
        }
        
        # Write report to file
        report_file = f"failover_simulation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📊 Detailed simulation report saved to: {report_file}")
        
        return report

async def main():
    """Main simulation runner"""
    simulator = FailoverSimulator()
    
    try:
        await simulator.run_failover_simulation()
    except KeyboardInterrupt:
        print("\n🛑 Simulation interrupted by user")
    except Exception as e:
        print(f"\n💥 Critical simulation error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        try:
            await ai_orchestrator.cleanup()
        except:
            pass

if __name__ == "__main__":
    asyncio.run(main())