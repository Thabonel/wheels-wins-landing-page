#!/usr/bin/env python3

"""
FastAPI Integration Example for PAM Unified Gateway
Shows how to integrate the gateway into FastAPI endpoints
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import asyncio
import json
import logging
from datetime import datetime

# Import the gateway (adjust path as needed)
try:
    from app.core.pam_unified_gateway import (
        pam_unified_gateway,
        ProcessingSystem,
        GatewayResponse
    )
except ImportError:
    print("Note: Adjust import paths for your environment")

# Pydantic models for request/response validation
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = "anonymous"
    context: Optional[Dict[str, Any]] = {}
    force_system: Optional[str] = None

class ChatResponse(BaseModel):
    success: bool
    response: str
    system_used: str
    processing_time_ms: float
    confidence: float
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class HealthResponse(BaseModel):
    success: bool
    gateway_status: str
    systems: Dict[str, Any]
    timestamp: str

class MetricsResponse(BaseModel):
    success: bool
    metrics: Dict[str, Any]

# FastAPI app instance
app = FastAPI(
    title="PAM Unified Gateway API",
    description="Intelligent routing for PAM AI assistant requests",
    version="1.0.0"
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_sessions: Dict[str, Dict] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        
        # Initialize user session
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = {
                'websocket': websocket,
                'conversation_history': [],
                'connected_at': datetime.utcnow().isoformat()
            }

    def disconnect(self, websocket: WebSocket, user_id: str):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        if user_id in self.user_sessions:
            del self.user_sessions[user_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove dead connections
                self.active_connections.remove(connection)

manager = ConnectionManager()

# Authentication dependency (simplified example)
async def get_current_user(user_id: str = "anonymous") -> str:
    """Simple user identification - replace with real auth"""
    return user_id

# REST API Endpoints

@app.post("/api/v1/pam/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Main chat endpoint using PAM Unified Gateway
    """
    try:
        # Parse force_system if provided
        force_system = None
        if request.force_system:
            try:
                force_system = ProcessingSystem(request.force_system.lower())
            except ValueError:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid system: {request.force_system}. Use: edge, simple, or planner"
                )
        
        # Add user info to context
        context = request.context or {}
        context['user_id'] = request.user_id or current_user
        context['request_timestamp'] = datetime.utcnow().isoformat()
        
        # Process through gateway
        response = await pam_unified_gateway.process_request(
            message=request.message,
            context=context,
            force_system=force_system
        )
        
        return ChatResponse(
            success=response.success,
            response=response.response,
            system_used=response.system_used.value,
            processing_time_ms=response.processing_time_ms,
            confidence=response.confidence,
            metadata=response.metadata,
            error=response.error
        )
        
    except Exception as e:
        logging.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/pam/health", response_model=HealthResponse)
async def health_endpoint():
    """
    Health check endpoint for PAM gateway
    """
    try:
        health_status = await pam_unified_gateway.health_check()
        
        return HealthResponse(
            success=True,
            gateway_status=health_status['gateway'],
            systems=health_status['systems'],
            timestamp=health_status['timestamp']
        )
        
    except Exception as e:
        logging.error(f"Health check error: {e}")
        return HealthResponse(
            success=False,
            gateway_status="error",
            systems={},
            timestamp=datetime.utcnow().isoformat()
        )

@app.get("/api/v1/pam/metrics", response_model=MetricsResponse)
async def metrics_endpoint():
    """
    Performance metrics endpoint
    """
    try:
        metrics = pam_unified_gateway.get_performance_metrics()
        
        return MetricsResponse(
            success=True,
            metrics=metrics
        )
        
    except Exception as e:
        logging.error(f"Metrics endpoint error: {e}")
        return MetricsResponse(
            success=False,
            metrics={}
        )

@app.post("/api/v1/pam/batch")
async def batch_chat_endpoint(
    requests: List[ChatRequest],
    current_user: str = Depends(get_current_user)
):
    """
    Batch processing endpoint for multiple chat requests
    """
    if len(requests) > 50:  # Limit batch size
        raise HTTPException(status_code=400, detail="Batch size limited to 50 requests")
    
    try:
        # Process all requests concurrently
        tasks = []
        for i, request in enumerate(requests):
            # Add user info to context
            context = request.context or {}
            context['user_id'] = request.user_id or current_user
            context['batch_index'] = i
            context['batch_size'] = len(requests)
            
            # Parse force_system if provided
            force_system = None
            if request.force_system:
                try:
                    force_system = ProcessingSystem(request.force_system.lower())
                except ValueError:
                    pass  # Ignore invalid systems in batch
            
            # Create task
            task = pam_unified_gateway.process_request(
                message=request.message,
                context=context,
                force_system=force_system
            )
            tasks.append(task)
        
        # Execute all tasks concurrently
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Format results
        results = []
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                results.append({
                    'index': i,
                    'success': False,
                    'error': str(response),
                    'response': 'Processing failed'
                })
            else:
                results.append({
                    'index': i,
                    'success': response.success,
                    'response': response.response,
                    'system_used': response.system_used.value,
                    'processing_time_ms': response.processing_time_ms,
                    'confidence': response.confidence,
                    'error': response.error
                })
        
        return {
            'success': True,
            'batch_size': len(requests),
            'results': results,
            'processed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logging.error(f"Batch endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint
@app.websocket("/api/v1/pam/ws")
async def websocket_endpoint(websocket: WebSocket, user_id: str = "anonymous"):
    """
    WebSocket endpoint for real-time PAM chat
    """
    await manager.connect(websocket, user_id)
    
    try:
        # Send welcome message
        welcome_message = {
            'type': 'welcome',
            'message': '🤖 PAM is ready to assist you!',
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat()
        }
        await manager.send_personal_message(json.dumps(welcome_message), websocket)
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message_data = json.loads(data)
                message_type = message_data.get('type', 'chat')
                
                if message_type == 'ping':
                    # Handle ping/pong
                    pong_response = {
                        'type': 'pong',
                        'timestamp': datetime.utcnow().isoformat()
                    }
                    await manager.send_personal_message(json.dumps(pong_response), websocket)
                    
                elif message_type == 'chat':
                    # Handle chat message
                    user_message = message_data.get('message', '')
                    context = message_data.get('context', {})
                    
                    # Add WebSocket context
                    context['user_id'] = user_id
                    context['connection_type'] = 'websocket'
                    context['conversation_history'] = manager.user_sessions.get(user_id, {}).get('conversation_history', [])
                    
                    # Process through gateway
                    response = await pam_unified_gateway.process_request(
                        message=user_message,
                        context=context
                    )
                    
                    # Store in conversation history
                    if user_id in manager.user_sessions:
                        manager.user_sessions[user_id]['conversation_history'].append({
                            'user_message': user_message,
                            'pam_response': response.response,
                            'timestamp': datetime.utcnow().isoformat(),
                            'system_used': response.system_used.value
                        })
                        
                        # Keep only last 20 messages
                        history = manager.user_sessions[user_id]['conversation_history']
                        if len(history) > 20:
                            manager.user_sessions[user_id]['conversation_history'] = history[-20:]
                    
                    # Send response
                    chat_response = {
                        'type': 'chat_response',
                        'content': response.response,
                        'system_used': response.system_used.value,
                        'processing_time_ms': response.processing_time_ms,
                        'confidence': response.confidence,
                        'success': response.success,
                        'timestamp': datetime.utcnow().isoformat()
                    }
                    
                    if response.metadata:
                        chat_response['metadata'] = response.metadata
                        
                    if response.error:
                        chat_response['error'] = response.error
                    
                    await manager.send_personal_message(json.dumps(chat_response), websocket)
                    
                elif message_type == 'get_history':
                    # Send conversation history
                    history = manager.user_sessions.get(user_id, {}).get('conversation_history', [])
                    history_response = {
                        'type': 'conversation_history',
                        'history': history,
                        'count': len(history),
                        'timestamp': datetime.utcnow().isoformat()
                    }
                    await manager.send_personal_message(json.dumps(history_response), websocket)
                    
                else:
                    # Unknown message type
                    error_response = {
                        'type': 'error',
                        'error': f'Unknown message type: {message_type}',
                        'timestamp': datetime.utcnow().isoformat()
                    }
                    await manager.send_personal_message(json.dumps(error_response), websocket)
                    
            except json.JSONDecodeError:
                # Invalid JSON
                error_response = {
                    'type': 'error',
                    'error': 'Invalid JSON message format',
                    'timestamp': datetime.utcnow().isoformat()
                }
                await manager.send_personal_message(json.dumps(error_response), websocket)
                
            except Exception as e:
                # Processing error
                error_response = {
                    'type': 'error',
                    'error': f'Message processing failed: {str(e)}',
                    'timestamp': datetime.utcnow().isoformat()
                }
                await manager.send_personal_message(json.dumps(error_response), websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        logging.info(f"WebSocket disconnected: {user_id}")
        
    except Exception as e:
        logging.error(f"WebSocket error for {user_id}: {e}")
        manager.disconnect(websocket, user_id)

# Admin endpoints
@app.get("/api/v1/pam/admin/sessions")
async def get_active_sessions():
    """
    Admin endpoint to view active WebSocket sessions
    """
    sessions_info = {}
    
    for user_id, session_data in manager.user_sessions.items():
        sessions_info[user_id] = {
            'connected_at': session_data.get('connected_at'),
            'message_count': len(session_data.get('conversation_history', [])),
            'last_activity': session_data.get('conversation_history', [{}])[-1].get('timestamp') if session_data.get('conversation_history') else None
        }
    
    return {
        'active_sessions': len(manager.active_connections),
        'user_sessions': sessions_info,
        'timestamp': datetime.utcnow().isoformat()
    }

@app.post("/api/v1/pam/admin/broadcast")
async def broadcast_message(message: str):
    """
    Admin endpoint to broadcast message to all connected clients
    """
    broadcast_data = {
        'type': 'broadcast',
        'message': message,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    await manager.broadcast(json.dumps(broadcast_data))
    
    return {
        'success': True,
        'message': 'Broadcast sent',
        'recipients': len(manager.active_connections)
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize gateway on startup"""
    logging.info("🚀 PAM Unified Gateway API starting up...")
    
    # Perform initial health check
    try:
        health_status = await pam_unified_gateway.health_check()
        logging.info(f"Gateway health: {health_status['gateway']}")
        
        for system, status in health_status['systems'].items():
            logging.info(f"  {system}: {status['status']}")
            
    except Exception as e:
        logging.error(f"Initial health check failed: {e}")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logging.info("🛑 PAM Unified Gateway API shutting down...")
    
    # Close all WebSocket connections
    for connection in manager.active_connections:
        try:
            await connection.close()
        except:
            pass

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        'name': 'PAM Unified Gateway API',
        'version': '1.0.0',
        'description': 'Intelligent routing for PAM AI assistant requests',
        'endpoints': {
            'chat': '/api/v1/pam/chat',
            'websocket': '/api/v1/pam/ws',
            'health': '/api/v1/pam/health',
            'metrics': '/api/v1/pam/metrics',
            'batch': '/api/v1/pam/batch',
            'docs': '/docs'
        },
        'timestamp': datetime.utcnow().isoformat()
    }

# Example usage
if __name__ == "__main__":
    import uvicorn
    
    # Run with: python fastapi_integration.py
    uvicorn.run(
        "fastapi_integration:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )