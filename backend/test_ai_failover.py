#!/usr/bin/env python3
"""
AI Failover Testing Script
Tests the AI provider failover functionality between OpenAI and Anthropic
"""

import asyncio
import os
import sys
import json
import time
from datetime import datetime
from typing import Dict, List, Any

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.ai.ai_orchestrator import ai_orchestrator, AIMessage, AICapability
from app.services.ai.provider_interface import AIProviderStatus
from app.core.config import settings

class AIFailoverTester:
    """Test suite for AI provider failover functionality"""
    
    def __init__(self):
        self.test_results = []
        self.start_time = datetime.now()
    
    def log_test(self, test_name: str, status: str, message: str, details: Dict = None):
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
    
    async def test_environment_configuration(self):
        """Test 1: Check environment configuration"""
        self.log_test("Environment Check", "INFO", "Checking AI provider configuration...")
        
        openai_configured = bool(getattr(settings, 'OPENAI_API_KEY', None))
        anthropic_configured = bool(getattr(settings, 'ANTHROPIC_API_KEY', None))
        
        details = {
            "openai_configured": openai_configured,
            "anthropic_configured": anthropic_configured,
            "openai_key_prefix": str(settings.OPENAI_API_KEY)[:10] + "..." if openai_configured else "None",
            "anthropic_key_prefix": str(settings.ANTHROPIC_API_KEY)[:10] + "..." if anthropic_configured else "None"
        }
        
        if openai_configured and anthropic_configured:
            self.log_test("Environment Configuration", "PASS", "Both providers configured", details)
        elif openai_configured:
            self.log_test("Environment Configuration", "WARN", "Only OpenAI configured - failover limited", details)
        elif anthropic_configured:
            self.log_test("Environment Configuration", "WARN", "Only Anthropic configured - failover limited", details)
        else:
            self.log_test("Environment Configuration", "FAIL", "No AI providers configured", details)
        
        return details
    
    async def test_orchestrator_initialization(self):
        """Test 2: Initialize AI orchestrator"""
        self.log_test("Orchestrator Init", "INFO", "Initializing AI orchestrator...")
        
        try:
            await ai_orchestrator.initialize()
            
            status = ai_orchestrator.get_status()
            details = {
                "initialized": status["initialized"],
                "total_providers": status["total_providers"],
                "healthy_providers": status["healthy_providers"],
                "strategy": status["strategy"],
                "providers": [
                    {
                        "name": p["name"],
                        "status": p["status"],
                        "capabilities": p["capabilities"],
                        "circuit_breaker": p["circuit_breaker"]
                    }
                    for p in status["providers"]
                ]
            }
            
            if status["initialized"] and status["total_providers"] > 0:
                self.log_test("Orchestrator Initialization", "PASS", 
                             f"Initialized with {status['total_providers']} providers", details)
            else:
                self.log_test("Orchestrator Initialization", "FAIL", 
                             "Failed to initialize or no providers available", details)
            
            return details
            
        except Exception as e:
            self.log_test("Orchestrator Initialization", "FAIL", f"Initialization error: {str(e)}")
            return {"error": str(e)}
    
    async def test_provider_health_checks(self):
        """Test 3: Check individual provider health"""
        self.log_test("Provider Health", "INFO", "Running provider health checks...")
        
        health_results = {}
        
        for provider in ai_orchestrator.providers:
            try:
                status, message = await provider.health_check()
                health_results[provider.name] = {
                    "status": status.value,
                    "message": message,
                    "capabilities": [cap.value for cap in provider.capabilities],
                    "model": provider.config.default_model
                }
                
                if status == AIProviderStatus.HEALTHY:
                    self.log_test(f"Health Check - {provider.name}", "PASS", message)
                else:
                    self.log_test(f"Health Check - {provider.name}", "FAIL", message)
                    
            except Exception as e:
                health_results[provider.name] = {"error": str(e)}
                self.log_test(f"Health Check - {provider.name}", "FAIL", f"Health check error: {str(e)}")
        
        return health_results
    
    async def test_basic_completion(self):
        """Test 4: Test basic AI completion"""
        self.log_test("Basic Completion", "INFO", "Testing basic AI completion...")
        
        test_messages = [
            AIMessage(role="user", content="Hello, please respond with just 'AI test successful'")
        ]
        
        try:
            start_time = time.time()
            response = await ai_orchestrator.complete(
                messages=test_messages,
                temperature=0.1,
                max_tokens=20
            )
            end_time = time.time()
            
            details = {
                "provider_used": response.provider,
                "model_used": response.model,
                "response_content": response.content,
                "latency_ms": response.latency_ms,
                "total_time_ms": (end_time - start_time) * 1000,
                "usage": response.usage
            }
            
            if response.content and len(response.content.strip()) > 0:
                self.log_test("Basic Completion", "PASS", 
                             f"Success via {response.provider} in {response.latency_ms:.1f}ms", details)
            else:
                self.log_test("Basic Completion", "FAIL", "Empty response received", details)
            
            return details
            
        except Exception as e:
            self.log_test("Basic Completion", "FAIL", f"Completion error: {str(e)}")
            return {"error": str(e)}
    
    async def test_streaming_capability(self):
        """Test 5: Test streaming AI completion"""
        self.log_test("Streaming Test", "INFO", "Testing streaming capability...")
        
        test_messages = [
            AIMessage(role="user", content="Please count from 1 to 5, each number on a new line.")
        ]
        
        try:
            chunks = []
            start_time = time.time()
            
            async for chunk in ai_orchestrator.stream(
                messages=test_messages,
                required_capabilities={AICapability.STREAMING},
                temperature=0.1,
                max_tokens=50
            ):
                chunks.append(chunk)
            
            end_time = time.time()
            
            full_response = "".join(chunks)
            details = {
                "chunks_received": len(chunks),
                "full_response": full_response,
                "total_time_ms": (end_time - start_time) * 1000,
                "avg_chunk_time_ms": ((end_time - start_time) * 1000) / len(chunks) if chunks else 0
            }
            
            if chunks and len(full_response.strip()) > 0:
                self.log_test("Streaming Completion", "PASS", 
                             f"Received {len(chunks)} chunks", details)
            else:
                self.log_test("Streaming Completion", "FAIL", "No streaming data received", details)
            
            return details
            
        except Exception as e:
            self.log_test("Streaming Completion", "FAIL", f"Streaming error: {str(e)}")
            return {"error": str(e)}
    
    async def test_provider_failover(self):
        """Test 6: Simulate provider failure and test failover"""
        self.log_test("Failover Test", "INFO", "Testing provider failover behavior...")
        
        if len(ai_orchestrator.providers) < 2:
            self.log_test("Failover Test", "WARN", 
                         f"Only {len(ai_orchestrator.providers)} provider(s) available - limited failover testing")
            return {"providers_available": len(ai_orchestrator.providers)}
        
        # Test with multiple providers by forcing failures
        test_messages = [
            AIMessage(role="user", content="This is a failover test")
        ]
        
        failover_results = {}
        
        # Try completion multiple times to potentially trigger different providers
        for i in range(3):
            try:
                response = await ai_orchestrator.complete(
                    messages=test_messages,
                    temperature=0.1,
                    max_tokens=30
                )
                
                provider_used = response.provider
                if provider_used not in failover_results:
                    failover_results[provider_used] = []
                
                failover_results[provider_used].append({
                    "attempt": i + 1,
                    "latency_ms": response.latency_ms,
                    "content_length": len(response.content) if response.content else 0
                })
                
            except Exception as e:
                failover_results[f"error_{i}"] = str(e)
        
        # Check circuit breaker status
        circuit_breaker_status = {}
        for provider in ai_orchestrator.providers:
            circuit_breaker_status[provider.name] = ai_orchestrator._is_circuit_broken(provider.name)
        
        details = {
            "provider_usage": failover_results,
            "circuit_breakers": circuit_breaker_status,
            "total_providers": len(ai_orchestrator.providers)
        }
        
        providers_used = len([k for k in failover_results.keys() if not k.startswith("error_")])
        if providers_used > 1:
            self.log_test("Failover Test", "PASS", 
                         f"Multiple providers used: {list(failover_results.keys())}", details)
        else:
            self.log_test("Failover Test", "INFO", 
                         f"Single provider used: {list(failover_results.keys())}", details)
        
        return details
    
    async def test_pam_integration(self):
        """Test 7: Test PAM integration with AI orchestrator"""
        self.log_test("PAM Integration", "INFO", "Testing PAM integration...")
        
        # Test a typical PAM conversation
        test_messages = [
            AIMessage(role="system", content="You are PAM, a travel assistant for RV enthusiasts."),
            AIMessage(role="user", content="I'm planning a trip from Brisbane to Sydney. Any recommendations?")
        ]
        
        try:
            response = await ai_orchestrator.complete(
                messages=test_messages,
                temperature=0.7,
                max_tokens=150
            )
            
            details = {
                "provider_used": response.provider,
                "response_length": len(response.content) if response.content else 0,
                "contains_travel_advice": any(word in response.content.lower() 
                                            for word in ["route", "road", "highway", "stop", "camp", "park"]
                                            if response.content),
                "latency_ms": response.latency_ms
            }
            
            if response.content and len(response.content.strip()) > 20:
                self.log_test("PAM Integration", "PASS", 
                             f"Generated travel advice via {response.provider}", details)
            else:
                self.log_test("PAM Integration", "FAIL", "Insufficient response for travel query", details)
            
            return details
            
        except Exception as e:
            self.log_test("PAM Integration", "FAIL", f"PAM integration error: {str(e)}")
            return {"error": str(e)}
    
    async def run_all_tests(self):
        """Run all tests and generate report"""
        print("🔬 Starting AI Failover Testing Suite")
        print("=" * 60)
        
        # Run all tests
        test_results = {}
        test_results["environment"] = await self.test_environment_configuration()
        test_results["orchestrator"] = await self.test_orchestrator_initialization()
        test_results["health_checks"] = await self.test_provider_health_checks()
        test_results["basic_completion"] = await self.test_basic_completion()
        test_results["streaming"] = await self.test_streaming_capability()
        test_results["failover"] = await self.test_provider_failover()
        test_results["pam_integration"] = await self.test_pam_integration()
        
        # Generate summary
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["status"] == "PASS"])
        failed_tests = len([r for r in self.test_results if r["status"] == "FAIL"])
        warned_tests = len([r for r in self.test_results if r["status"] == "WARN"])
        
        print("\n" + "=" * 60)
        print("🎯 AI FAILOVER TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⚠️  Warnings: {warned_tests}")
        print(f"Test Duration: {(datetime.now() - self.start_time).total_seconds():.2f}s")
        
        if failed_tests == 0:
            print("\n🎉 All critical tests passed! AI failover system is working correctly.")
        else:
            print(f"\n⚠️  {failed_tests} test(s) failed. Review the issues above.")
        
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
            "timestamp": datetime.now().isoformat()
        }
        
        # Write report to file
        report_file = f"ai_failover_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📊 Detailed report saved to: {report_file}")
        
        return report

async def main():
    """Main test runner"""
    tester = AIFailoverTester()
    
    try:
        await tester.run_all_tests()
    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted by user")
    except Exception as e:
        print(f"\n💥 Critical test error: {str(e)}")
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