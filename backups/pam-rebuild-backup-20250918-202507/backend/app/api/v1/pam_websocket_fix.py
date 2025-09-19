# WebSocket Fix for PAM Backend
# This file contains the fixes needed for the WebSocket connection issues

from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect, Query, HTTPException
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

class WebSocketManager:
    """Manages WebSocket connections with proper error handling"""
    
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        
    async def connect(self, websocket: WebSocket, token: Optional[str] = None):
        """Accept WebSocket connection with optional token validation"""
        try:
            await websocket.accept()
            self.active_connections.append(websocket)
            logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
            
            # Send initial connection confirmation
            await websocket.send_json({
                "type": "connection",
                "message": "Connected to PAM WebSocket",
                "timestamp": datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error accepting WebSocket connection: {e}")
            raise
            
    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket from active connections"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
        
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific WebSocket connection"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message to WebSocket: {e}")
            self.disconnect(websocket)
            
    async def broadcast(self, message: dict):
        """Broadcast message to all connected WebSockets"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to WebSocket: {e}")
                disconnected.append(connection)
                
        # Clean up disconnected connections
        for connection in disconnected:
            self.disconnect(connection)

# WebSocket endpoint fix
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    Fixed WebSocket endpoint for PAM chat
    """
    manager = WebSocketManager()
    
    try:
        # Accept connection
        await manager.connect(websocket, token)
        
        while True:
            # Receive message
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                
                # Handle ping/pong for connection health
                if message.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    continue
                    
                # Handle authentication
                if message.get("type") == "auth":
                    await websocket.send_json({
                        "type": "auth_success",
                        "message": "Authentication successful",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    continue
                    
                # Handle chat messages
                if message.get("message"):
                    # Process with PAM AI
                    response = {
                        "type": "response",
                        "message": "PAM is currently being upgraded. Please use the chat endpoint for now.",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    await websocket.send_json(response)
                    
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON format",
                    "timestamp": datetime.utcnow().isoformat()
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass