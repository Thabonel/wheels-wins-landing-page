# app/core/pam_unified_gateway.py
"""
PAM Unified Gateway - Intelligent routing system for PAM requests

This gateway analyzes incoming requests and routes them to the optimal processing system:
- Edge Processing: Instant responses for simple queries (<100ms)
- SimplePamService: Standard AI conversations (1-5s)
- ActionPlanner: Complex multi-step analysis (3-10s)

The gateway ensures users get the fastest possible response while maintaining 
intelligence when needed.
"""

import asyncio
import time
import re
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
from dataclasses import dataclass
from datetime import datetime
import logging

from app.core.logging import get_logger

logger = get_logger("pam_unified_gateway")

class ProcessingSystem(Enum):
    """Available processing systems"""
    EDGE = "edge"
    SIMPLE = "simple"
    PLANNER = "planner"

class RequestComplexity(Enum):
    """Request complexity levels"""
    SIMPLE = "simple"      # 0-3: Greetings, basic commands
    STANDARD = "standard"  # 4-6: Standard queries, information requests
    COMPLEX = "complex"    # 7-10: Multi-step analysis, planning

@dataclass
class ComplexityAnalysis:
    """Result of request complexity analysis"""
    score: float  # 0-10 complexity score
    level: RequestComplexity
    factors: List[str]  # What contributed to the score
    keywords: List[str]  # Important keywords found
    entities: List[str]  # Detected entities
    recommended_system: ProcessingSystem

@dataclass
class GatewayResponse:
    """Normalized response from any PAM system"""
    response: str
    processing_time_ms: float
    system_used: ProcessingSystem
    confidence: float
    success: bool
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class RequestComplexityAnalyzer:
    """Analyzes request complexity to determine optimal processing system"""
    
    def __init__(self):
        # Complexity scoring patterns
        self.simple_patterns = {
            'greetings': ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'g\'day'],
            'commands': ['turn on', 'turn off', 'start', 'stop', 'activate', 'deactivate'],
            'acknowledgments': ['thank you', 'thanks', 'ok', 'okay', 'yes', 'no'],
            'time_queries': ['what time', 'current time', 'time is it'],
            'status_queries': ['how are you', 'what\'s up', 'status']
        }
        
        self.standard_patterns = {
            'information': ['what is', 'tell me about', 'explain', 'describe', 'show me'],
            'weather': ['weather', 'temperature', 'forecast', 'rain', 'sunny'],
            'location': ['near me', 'nearby', 'close to', 'in the area', 'around here'],
            'expenses': ['spent', 'cost', 'price', 'expense', 'how much'],
            'reminders': ['remind me', 'reminder', 'don\'t forget'],
            'simple_search': ['find', 'search', 'look for', 'where is']
        }
        
        self.complex_patterns = {
            'planning': ['plan', 'create itinerary', 'schedule', 'organize', 'arrange'],
            'analysis': ['analyze', 'compare', 'evaluate', 'assess', 'calculate'],
            'optimization': ['optimize', 'best route', 'most efficient', 'save money'],
            'multi_step': ['first', 'then', 'next', 'after that', 'finally'],
            'budget_analysis': ['budget breakdown', 'spending patterns', 'financial analysis'],
            'route_planning': ['route from', 'trip to', 'travel plan', 'itinerary'],
            'social_matching': ['connect with', 'find travelers', 'meet up', 'group travel']
        }
        
        # Entity patterns that indicate complexity
        self.entity_patterns = {
            'locations': r'\b(from\s+\w+\s+to\s+\w+|in\s+\w+|near\s+\w+)\b',
            'dates': r'\b(tomorrow|next week|in \d+ days?|on \w+day)\b',
            'amounts': r'\$\d+|\d+\s*dollars?',
            'timeframes': r'\b(\d+\s*(hours?|days?|weeks?|months?))\b'
        }

    def analyze_complexity(self, message: str, context: Optional[Dict] = None) -> ComplexityAnalysis:
        """Analyze message complexity and recommend processing system"""
        message_lower = message.lower().strip()
        score = 0.0
        factors = []
        keywords = []
        entities = []
        
        # Base score from message length
        length_score = min(len(message) / 50.0, 2.0)  # Max 2 points for length
        if length_score > 1.5:
            factors.append(f"long_message_{len(message)}_chars")
        score += length_score
        
        # Simple pattern matching (reduces score)
        simple_matches = 0
        for category, patterns in self.simple_patterns.items():
            for pattern in patterns:
                if pattern in message_lower:
                    simple_matches += 1
                    keywords.append(f"simple_{category}")
                    factors.append(f"simple_pattern_{pattern}")
        
        if simple_matches > 0:
            score -= simple_matches * 0.5  # Reduce score for simple patterns
        
        # Standard pattern matching (moderate score increase)
        standard_matches = 0
        for category, patterns in self.standard_patterns.items():
            for pattern in patterns:
                if pattern in message_lower:
                    standard_matches += 1
                    keywords.append(f"standard_{category}")
                    factors.append(f"standard_pattern_{pattern}")
                    score += 1.0
        
        # Complex pattern matching (high score increase)
        complex_matches = 0
        for category, patterns in self.complex_patterns.items():
            for pattern in patterns:
                if pattern in message_lower:
                    complex_matches += 1
                    keywords.append(f"complex_{category}")
                    factors.append(f"complex_pattern_{pattern}")
                    score += 2.0
        
        # Entity detection (increases complexity)
        for entity_type, pattern in self.entity_patterns.items():
            matches = re.findall(pattern, message_lower)
            if matches:
                entities.extend([f"{entity_type}_{match}" for match in matches])
                score += len(matches) * 0.5
                factors.append(f"entity_{entity_type}_count_{len(matches)}")
        
        # Question complexity analysis
        question_words = ['how', 'what', 'when', 'where', 'why', 'which', 'who']
        question_count = sum(1 for word in question_words if word in message_lower)
        if question_count > 1:
            score += question_count * 0.5
            factors.append(f"multiple_questions_{question_count}")
        
        # Context complexity (if available)
        if context:
            if context.get('conversation_history') and len(context['conversation_history']) > 3:
                score += 0.5
                factors.append("long_conversation_history")
            
            if context.get('user_profile') and len(context['user_profile']) > 5:
                score += 0.5
                factors.append("rich_user_profile")
        
        # Normalize score to 0-10 range
        score = max(0.0, min(10.0, score))
        
        # Determine complexity level and system
        if score < 3.0:
            level = RequestComplexity.SIMPLE
            system = ProcessingSystem.EDGE
        elif score < 7.0:
            level = RequestComplexity.STANDARD
            system = ProcessingSystem.SIMPLE
        else:
            level = RequestComplexity.COMPLEX
            system = ProcessingSystem.PLANNER
        
        return ComplexityAnalysis(
            score=score,
            level=level,
            factors=factors,
            keywords=keywords,
            entities=entities,
            recommended_system=system
        )

class PAMUnifiedGateway:
    """
    Unified Gateway that intelligently routes PAM requests to optimal processing systems
    """
    
    def __init__(self):
        self.analyzer = RequestComplexityAnalyzer()
        self.performance_metrics = {
            ProcessingSystem.EDGE: {'requests': 0, 'avg_time': 0, 'success_rate': 1.0},
            ProcessingSystem.SIMPLE: {'requests': 0, 'avg_time': 0, 'success_rate': 1.0},
            ProcessingSystem.PLANNER: {'requests': 0, 'avg_time': 0, 'success_rate': 1.0}
        }
        
        # Initialize processing systems (lazy loading)
        self._edge_processor = None
        self._simple_pam_service = None
        self._action_planner = None
        
        logger.info("🎯 PAM Unified Gateway initialized")

    async def process_request(
        self, 
        message: str, 
        context: Optional[Dict] = None,
        force_system: Optional[ProcessingSystem] = None
    ) -> GatewayResponse:
        """
        Main entry point for processing PAM requests
        
        Args:
            message: User message to process
            context: Optional context (user_id, session_id, etc.)
            force_system: Optional system override for testing
            
        Returns:
            GatewayResponse with normalized result
        """
        start_time = time.time()
        
        try:
            # Analyze request complexity
            analysis = self.analyzer.analyze_complexity(message, context)
            
            # Determine which system to use
            target_system = force_system or analysis.recommended_system
            
            logger.info(
                f"🔄 Processing request: '{message[:50]}...' "
                f"(complexity: {analysis.score:.1f}, system: {target_system.value})"
            )
            
            # Route to appropriate system with fallback chain
            response = await self._route_with_fallback(
                message, context, target_system, analysis
            )
            
            # Update performance metrics
            processing_time = (time.time() - start_time) * 1000
            self._update_metrics(target_system, processing_time, response.success)
            
            # Enhance response with gateway metadata
            response.metadata = response.metadata or {}
            response.metadata.update({
                'complexity_analysis': {
                    'score': analysis.score,
                    'level': analysis.level.value,
                    'factors': analysis.factors,
                    'keywords': analysis.keywords,
                    'entities': analysis.entities
                },
                'gateway_version': '1.0.0',
                'routing_time_ms': processing_time
            })
            
            return response
            
        except Exception as e:
            logger.error(f"❌ Gateway processing failed: {e}")
            
            # Emergency fallback response
            return GatewayResponse(
                response=f"Service error: {str(e)}. Please try again shortly.",
                processing_time_ms=(time.time() - start_time) * 1000,
                system_used=ProcessingSystem.EDGE,
                confidence=0.5,
                success=False,
                error=str(e)
            )

    async def _route_with_fallback(
        self, 
        message: str, 
        context: Optional[Dict],
        primary_system: ProcessingSystem,
        analysis: ComplexityAnalysis
    ) -> GatewayResponse:
        """Route request with intelligent fallback chain"""
        
        # Define fallback chain based on primary system
        if primary_system == ProcessingSystem.EDGE:
            fallback_chain = [ProcessingSystem.EDGE, ProcessingSystem.SIMPLE]
        elif primary_system == ProcessingSystem.SIMPLE:
            fallback_chain = [ProcessingSystem.SIMPLE, ProcessingSystem.EDGE]
        else:  # PLANNER
            fallback_chain = [ProcessingSystem.PLANNER, ProcessingSystem.SIMPLE, ProcessingSystem.EDGE]
        
        # Try each system in fallback chain
        for system in fallback_chain:
            try:
                logger.info(f"🎯 Attempting {system.value} processing...")
                response = await self._process_with_system(message, context, system)
                
                if response.success:
                    logger.info(f"✅ {system.value} processing successful")
                    return response
                else:
                    logger.warning(f"⚠️ {system.value} processing failed: {response.error}")
                    
            except Exception as e:
                logger.error(f"❌ {system.value} processing error: {e}")
                continue
        
        # All systems failed - return error response
        return GatewayResponse(
            response="I'm having trouble processing your request right now. Please try again later.",
            processing_time_ms=0,
            system_used=primary_system,
            confidence=0.0,
            success=False,
            error="All processing systems failed"
        )

    async def _process_with_system(
        self, 
        message: str, 
        context: Optional[Dict],
        system: ProcessingSystem
    ) -> GatewayResponse:
        """Process request with specific system"""
        start_time = time.time()
        
        try:
            if system == ProcessingSystem.EDGE:
                response_text = await self._process_with_edge(message, context)
                confidence = 0.9  # High confidence for pattern matching
                
            elif system == ProcessingSystem.SIMPLE:
                response_text = await self._process_with_simple_pam(message, context)
                confidence = 0.8  # Good confidence for AI responses
                
            elif system == ProcessingSystem.PLANNER:
                response_text = await self._process_with_action_planner(message, context)
                confidence = 0.85  # High confidence for complex analysis
                
            else:
                raise ValueError(f"Unknown processing system: {system}")
            
            processing_time = (time.time() - start_time) * 1000
            
            return GatewayResponse(
                response=response_text,
                processing_time_ms=processing_time,
                system_used=system,
                confidence=confidence,
                success=True
            )
            
        except Exception as e:
            processing_time = (time.time() - start_time) * 1000
            return GatewayResponse(
                response="",
                processing_time_ms=processing_time,
                system_used=system,
                confidence=0.0,
                success=False,
                error=str(e)
            )

    async def _process_with_edge(self, message: str, context: Optional[Dict]) -> str:
        """Process with Edge Processing Service"""
        if not self._edge_processor:
            from app.services.voice.edge_processing_service import edge_processing_service
            self._edge_processor = edge_processing_service
        
        result = await self._edge_processor.process_query(message, context or {})
        
        if result.handled and result.response:
            return result.response
        else:
            raise Exception("Edge processing could not handle request")

    async def _process_with_simple_pam(self, message: str, context: Optional[Dict]) -> str:
        """Process with SimplePamService"""
        if not self._simple_pam_service:
            from app.core.simple_pam_service import simple_pam_service
            self._simple_pam_service = simple_pam_service
        
        response = await self._simple_pam_service.get_response(
            message=message,
            context=context or {},
            conversation_history=context.get('conversation_history', []) if context else []
        )
        
        return response

    async def _process_with_action_planner(self, message: str, context: Optional[Dict]) -> str:
        """Process with ActionPlanner/Orchestrator"""
        if not self._action_planner:
            from app.core.orchestrator import orchestrator
            self._action_planner = orchestrator
        
        results = await self._action_planner.plan(message, context or {})
        
        if results and len(results) > 0:
            # Extract response from first result
            result = results[0]
            return result.get('content', result.get('response', 'No response generated'))
        else:
            raise Exception("ActionPlanner returned no results")

    def _update_metrics(self, system: ProcessingSystem, processing_time: float, success: bool):
        """Update performance metrics for system"""
        metrics = self.performance_metrics[system]
        
        # Update request count
        metrics['requests'] += 1
        
        # Update average processing time
        if metrics['requests'] == 1:
            metrics['avg_time'] = processing_time
        else:
            # Running average
            metrics['avg_time'] = (
                (metrics['avg_time'] * (metrics['requests'] - 1) + processing_time) / 
                metrics['requests']
            )
        
        # Update success rate
        if metrics['requests'] == 1:
            metrics['success_rate'] = 1.0 if success else 0.0
        else:
            # Running success rate
            current_successes = metrics['success_rate'] * (metrics['requests'] - 1)
            if success:
                current_successes += 1
            metrics['success_rate'] = current_successes / metrics['requests']

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics for all systems"""
        return {
            'systems': dict(self.performance_metrics),
            'timestamp': datetime.utcnow().isoformat(),
            'total_requests': sum(m['requests'] for m in self.performance_metrics.values())
        }

    async def health_check(self) -> Dict[str, Any]:
        """Check health of all processing systems"""
        health_status = {
            'gateway': 'healthy',
            'systems': {},
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Test each system
        test_message = "Hello"
        test_context = {'user_id': 'health_check'}
        
        for system in ProcessingSystem:
            try:
                response = await self._process_with_system(test_message, test_context, system)
                health_status['systems'][system.value] = {
                    'status': 'healthy' if response.success else 'unhealthy',
                    'response_time_ms': response.processing_time_ms,
                    'error': response.error
                }
            except Exception as e:
                health_status['systems'][system.value] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
        
        # Overall health
        unhealthy_systems = [
            system for system, status in health_status['systems'].items() 
            if status['status'] != 'healthy'
        ]
        
        if len(unhealthy_systems) == len(ProcessingSystem):
            health_status['gateway'] = 'critical'
        elif len(unhealthy_systems) > 0:
            health_status['gateway'] = 'degraded'
        
        return health_status

# Global gateway instance
pam_unified_gateway = PAMUnifiedGateway()