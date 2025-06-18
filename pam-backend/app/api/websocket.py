from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from app.core.websocket_manager import manager
from app.core.security import verify_token
from app.core.logging import setup_logging
import uuid
import json

router = APIRouter()
logger = setup_logging()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    user_id: str,
    token: str = Query(...)
):
    """WebSocket endpoint for real-time communication with PAM"""
    connection_id = str(uuid.uuid4())
    
    try:
        # Verify token (simplified for WebSocket)
        # In production, implement proper WebSocket authentication
        if not token:
            await websocket.close(code=1008, reason="Unauthorized")
            return
            
        await manager.connect(websocket, user_id, connection_id)
        
        # Send welcome message
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "message": "PAM is ready to assist you!"
        })
        
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            logger.info(f"Received WebSocket message: {data}")
            
            # Process different message types
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                
            elif data.get("type") == "chat":
                # Process chat message
                response = {
                    "type": "chat_response",
                    "message": f"PAM received: {data.get('message', '')}",
                    "timestamp": str(uuid.uuid4())
                }
                await websocket.send_json(response)
                
            elif data.get("type") == "action":
                # Process UI action request
                response = {
                    "type": "action_response",
                    "action": data.get("action"),
                    "status": "processing",
                    "message": f"Executing {data.get('action', {}).get('type', 'unknown')} action..."
                }
                await websocket.send_json(response)
                
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {data.get('type')}"
                })
                
    except WebSocketDisconnect:
        await manager.disconnect(user_id, connection_id)
        logger.info(f"Client {user_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.disconnect(user_id, connection_id)
        await websocket.close(code=1011, reason="Internal server error")
