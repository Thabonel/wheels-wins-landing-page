#!/usr/bin/env python3

"""
PAM Unified Gateway Integration Examples
Demonstrates how to integrate the gateway into different parts of the application
"""

import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime

# Example imports (adjust paths as needed)
try:
    from app.core.pam_unified_gateway import (
        pam_unified_gateway,
        ProcessingSystem,
        RequestComplexity,
        GatewayResponse
    )
except ImportError:
    print("Note: This is an example file. Adjust import paths for your environment.")

class PAMChatSession:
    """
    Example: Chat session management with gateway integration
    """
    
    def __init__(self, user_id: str, session_id: str):
        self.user_id = user_id
        self.session_id = session_id
        self.conversation_history = []
        self.user_preferences = {}
        self.context = {
            'user_id': user_id,
            'session_id': session_id,
            'conversation_history': self.conversation_history
        }
    
    async def process_message(self, message: str) -> Dict[str, Any]:
        """Process a user message through the gateway"""
        
        # Update context with latest conversation
        self.context['conversation_history'] = self.conversation_history[-10:]  # Last 10 messages
        self.context['user_preferences'] = self.user_preferences
        
        # Process through gateway
        response = await pam_unified_gateway.process_request(
            message=message,
            context=self.context
        )
        
        # Store in conversation history
        self.conversation_history.append({
            'timestamp': datetime.utcnow().isoformat(),
            'user_message': message,
            'pam_response': response.response,
            'system_used': response.system_used.value,
            'processing_time': response.processing_time_ms,
            'confidence': response.confidence
        })
        
        return {
            'response': response.response,
            'system_used': response.system_used.value,
            'processing_time_ms': response.processing_time_ms,
            'confidence': response.confidence,
            'success': response.success,
            'metadata': response.metadata
        }
    
    def get_conversation_summary(self) -> Dict[str, Any]:
        """Get summary of conversation statistics"""
        if not self.conversation_history:
            return {'total_messages': 0}
        
        systems_used = {}
        total_processing_time = 0
        total_confidence = 0
        
        for entry in self.conversation_history:
            system = entry['system_used']
            systems_used[system] = systems_used.get(system, 0) + 1
            total_processing_time += entry['processing_time']
            total_confidence += entry['confidence']
        
        return {
            'total_messages': len(self.conversation_history),
            'systems_used': systems_used,
            'avg_processing_time': total_processing_time / len(self.conversation_history),
            'avg_confidence': total_confidence / len(self.conversation_history),
            'session_duration': len(self.conversation_history)  # Simplified
        }

class PAMWebSocketHandler:
    """
    Example: WebSocket handler with gateway integration
    """
    
    def __init__(self):
        self.active_sessions = {}
    
    async def handle_websocket_message(self, websocket, message_data: Dict[str, Any]):
        """Handle incoming WebSocket message"""
        
        message_type = message_data.get('type', 'chat')
        user_id = message_data.get('user_id', 'anonymous')
        session_id = message_data.get('session_id', 'default')
        
        # Get or create chat session
        session_key = f"{user_id}:{session_id}"
        if session_key not in self.active_sessions:
            self.active_sessions[session_key] = PAMChatSession(user_id, session_id)
        
        chat_session = self.active_sessions[session_key]
        
        if message_type == 'chat':
            user_message = message_data.get('message', '')
            
            # Process through gateway
            result = await chat_session.process_message(user_message)
            
            # Send response back through WebSocket
            response_data = {
                'type': 'chat_response',
                'content': result['response'],
                'system_used': result['system_used'],
                'processing_time_ms': result['processing_time_ms'],
                'confidence': result['confidence'],
                'timestamp': datetime.utcnow().isoformat()
            }
            
            await websocket.send(json.dumps(response_data))
            
        elif message_type == 'ping':
            # Simple ping/pong
            await websocket.send(json.dumps({'type': 'pong'}))
            
        elif message_type == 'session_summary':
            # Get conversation summary
            summary = chat_session.get_conversation_summary()
            await websocket.send(json.dumps({
                'type': 'session_summary',
                'data': summary
            }))

class PAMRESTEndpoint:
    """
    Example: REST API endpoint with gateway integration
    """
    
    async def chat_endpoint(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """REST endpoint for PAM chat"""
        
        message = request_data.get('message', '')
        user_id = request_data.get('user_id', 'anonymous')
        context = request_data.get('context', {})
        
        # Add user_id to context
        context['user_id'] = user_id
        
        try:
            # Process through gateway
            response = await pam_unified_gateway.process_request(
                message=message,
                context=context
            )
            
            return {
                'success': response.success,
                'response': response.response,
                'system_used': response.system_used.value,
                'processing_time_ms': response.processing_time_ms,
                'confidence': response.confidence,
                'metadata': response.metadata,
                'error': response.error
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'response': 'An error occurred processing your request.'
            }
    
    async def health_endpoint(self) -> Dict[str, Any]:
        """Health check endpoint for PAM gateway"""
        
        try:
            health_status = await pam_unified_gateway.health_check()
            return {
                'success': True,
                'gateway_status': health_status['gateway'],
                'systems': health_status['systems'],
                'timestamp': health_status['timestamp']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'gateway_status': 'error'
            }
    
    async def metrics_endpoint(self) -> Dict[str, Any]:
        """Performance metrics endpoint"""
        
        try:
            metrics = pam_unified_gateway.get_performance_metrics()
            return {
                'success': True,
                'metrics': metrics
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

class PAMSmartRouter:
    """
    Example: Smart routing based on user context and preferences
    """
    
    def __init__(self):
        self.user_preferences = {}
        self.performance_history = {}
    
    async def route_request(
        self, 
        message: str, 
        user_id: str,
        force_system: Optional[ProcessingSystem] = None
    ) -> GatewayResponse:
        """Route request with user-specific optimizations"""
        
        # Get user preferences
        preferences = self.user_preferences.get(user_id, {})
        
        # Build enhanced context
        context = {
            'user_id': user_id,
            'user_preferences': preferences,
            'performance_history': self.performance_history.get(user_id, [])
        }
        
        # Determine optimal system based on user history
        if not force_system and user_id in self.performance_history:
            force_system = self._suggest_optimal_system(user_id, message)
        
        # Process through gateway
        response = await pam_unified_gateway.process_request(
            message=message,
            context=context,
            force_system=force_system
        )
        
        # Update performance history
        self._update_performance_history(user_id, response)
        
        return response
    
    def _suggest_optimal_system(self, user_id: str, message: str) -> Optional[ProcessingSystem]:
        """Suggest optimal system based on user's performance history"""
        
        history = self.performance_history.get(user_id, [])
        if len(history) < 5:  # Need enough data
            return None
        
        # Analyze which system performs best for this user
        system_performance = {}
        for entry in history[-20:]:  # Last 20 interactions
            system = entry['system_used']
            processing_time = entry['processing_time_ms']
            success = entry['success']
            
            if system not in system_performance:
                system_performance[system] = {'times': [], 'successes': 0, 'total': 0}
            
            system_performance[system]['times'].append(processing_time)
            system_performance[system]['total'] += 1
            if success:
                system_performance[system]['successes'] += 1
        
        # Find best performing system
        best_system = None
        best_score = 0
        
        for system_name, perf in system_performance.items():
            if perf['total'] == 0:
                continue
                
            avg_time = sum(perf['times']) / len(perf['times'])
            success_rate = perf['successes'] / perf['total']
            
            # Score based on success rate and speed (higher is better)
            score = success_rate * (1000 / max(avg_time, 100))  # Avoid division by zero
            
            if score > best_score:
                best_score = score
                best_system = ProcessingSystem(system_name)
        
        return best_system
    
    def _update_performance_history(self, user_id: str, response: GatewayResponse):
        """Update user's performance history"""
        
        if user_id not in self.performance_history:
            self.performance_history[user_id] = []
        
        history_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'system_used': response.system_used.value,
            'processing_time_ms': response.processing_time_ms,
            'success': response.success,
            'confidence': response.confidence
        }
        
        self.performance_history[user_id].append(history_entry)
        
        # Keep only last 50 entries per user
        if len(self.performance_history[user_id]) > 50:
            self.performance_history[user_id] = self.performance_history[user_id][-50:]

class PAMBatchProcessor:
    """
    Example: Batch processing multiple requests efficiently
    """
    
    async def process_batch(self, requests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process multiple requests concurrently"""
        
        # Group requests by expected complexity for better resource utilization
        grouped_requests = self._group_by_complexity(requests)
        
        # Process each group concurrently
        all_results = []
        
        for complexity_level, request_group in grouped_requests.items():
            print(f"Processing {len(request_group)} {complexity_level} requests...")
            
            # Create concurrent tasks
            tasks = []
            for request in request_group:
                task = asyncio.create_task(
                    pam_unified_gateway.process_request(
                        message=request['message'],
                        context=request.get('context', {})
                    )
                )
                tasks.append((request, task))
            
            # Wait for all tasks in this group
            group_results = []
            for request, task in tasks:
                try:
                    response = await task
                    group_results.append({
                        'request_id': request.get('request_id', 'unknown'),
                        'success': response.success,
                        'response': response.response,
                        'system_used': response.system_used.value,
                        'processing_time_ms': response.processing_time_ms,
                        'confidence': response.confidence
                    })
                except Exception as e:
                    group_results.append({
                        'request_id': request.get('request_id', 'unknown'),
                        'success': False,
                        'error': str(e),
                        'response': 'Processing failed'
                    })
            
            all_results.extend(group_results)
        
        return all_results
    
    def _group_by_complexity(self, requests: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group requests by expected complexity"""
        
        groups = {
            'simple': [],
            'standard': [],
            'complex': []
        }
        
        for request in requests:
            message = request['message']
            
            # Quick complexity estimation
            if len(message) < 20 and any(word in message.lower() for word in ['hi', 'hello', 'thanks', 'ok']):
                groups['simple'].append(request)
            elif any(word in message.lower() for word in ['plan', 'analyze', 'compare', 'optimize', 'calculate']):
                groups['complex'].append(request)
            else:
                groups['standard'].append(request)
        
        return groups

# Example usage functions
async def example_chat_session():
    """Example: Using the chat session wrapper"""
    
    print("🗣️  Example: Chat Session Integration")
    
    # Create a chat session
    session = PAMChatSession('user123', 'session456')
    
    # Process some messages
    messages = [
        "Hi PAM",
        "What's the weather like?",
        "Plan a weekend RV trip to Colorado with budget analysis"
    ]
    
    for message in messages:
        print(f"User: {message}")
        
        result = await session.process_message(message)
        
        print(f"PAM ({result['system_used']}): {result['response'][:100]}...")
        print(f"Processing time: {result['processing_time_ms']:.1f}ms")
        print()
    
    # Get conversation summary
    summary = session.get_conversation_summary()
    print(f"Conversation summary: {summary}")
    print()

async def example_batch_processing():
    """Example: Batch processing multiple requests"""
    
    print("📦 Example: Batch Processing")
    
    processor = PAMBatchProcessor()
    
    # Create batch of requests
    batch_requests = [
        {'request_id': '1', 'message': 'Hello'},
        {'request_id': '2', 'message': 'What time is it?'},
        {'request_id': '3', 'message': 'Find camping spots near Denver'},
        {'request_id': '4', 'message': 'Plan a 5-day RV trip with budget analysis'},
        {'request_id': '5', 'message': 'Thanks PAM'}
    ]
    
    # Process batch
    results = await processor.process_batch(batch_requests)
    
    # Display results
    for result in results:
        print(f"Request {result['request_id']}: {result['system_used']} - {result['success']}")
    
    print()

async def example_smart_routing():
    """Example: Smart routing with user preferences"""
    
    print("🧠 Example: Smart Routing")
    
    router = PAMSmartRouter()
    
    # Simulate user interactions to build history
    user_id = 'smart_user'
    
    test_messages = [
        "Hello",
        "What's the weather?",
        "Plan a trip",
        "Find camping",
        "Thanks"
    ]
    
    print("Building user performance history...")
    for message in test_messages:
        response = await router.route_request(message, user_id)
        print(f"'{message}' -> {response.system_used.value} ({response.processing_time_ms:.1f}ms)")
    
    print()
    print("Now using optimized routing based on history...")
    
    # New request with optimized routing
    response = await router.route_request("Tell me about RV parks", user_id)
    print(f"Optimized routing: {response.system_used.value} ({response.processing_time_ms:.1f}ms)")
    print()

async def main():
    """Run all integration examples"""
    
    print("🎯 PAM Unified Gateway - Integration Examples")
    print("=" * 60)
    print()
    
    # Run examples
    await example_chat_session()
    await example_batch_processing()
    await example_smart_routing()
    
    print("✅ All integration examples completed!")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Examples interrupted by user")
    except Exception as e:
        print(f"Examples failed: {e}")