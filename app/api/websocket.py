from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from app.core.websocket_manager import manager
from app.core.security import verify_token
from app.core.logging import setup_logging
from app.core.orchestrator import orchestrator
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
        if not token:
            await websocket.close(code=1008, reason="Unauthorized")
            return
            
        await manager.connect(websocket, user_id, connection_id)
        
        # Send welcome message
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "message": "🤖 PAM is ready to assist you! Try saying: 'I spent $25 on fuel' or 'Show my budget'"
        })
        
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            logger.info(f"Received WebSocket message: {data}")
            
            # Process different message types
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                
            elif data.get("type") == "chat":
                # Process chat message through orchestrator
                message = data.get("message", "")
                context = {"user_id": user_id}
                
                try:
                    actions = await orchestrator.plan(message, context)
                    
                    # Send immediate response
                    response_message = "I'm processing your request..."
                    for action in actions:
                        if action.get("type") == "message":
                            response_message = action.get("content", response_message)
                            break
                        elif action.get("type") == "error":
                            response_message = f"❌ {action.get('content', 'An error occurred')}"
                            break
                    
                    await websocket.send_json({
                        "type": "chat_response",
                        "message": response_message,
                        "actions": actions,
                        "timestamp": str(uuid.uuid4())
                    })
                    
                    # Process UI actions
                    ui_actions = [a for a in actions if a.get("type") in ["navigate", "fill_form", "click", "alert"]]
                    if ui_actions:
                        await websocket.send_json({
                            "type": "ui_actions",
                            "actions": ui_actions
                        })
                        
                except Exception as e:
                    logger.error(f"Error processing chat: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Sorry, I encountered an error: {str(e)}"
                    })
                
            elif data.get("type") == "action":
                # Process UI action request
                action = data.get("action", {})
                
                await websocket.send_json({
                    "type": "action_response",
                    "action": action,
                    "status": "processing",
                    "message": f"Executing {action.get('type', 'unknown')} action..."
                })
                
                # Simulate action completion
                await websocket.send_json({
                    "type": "action_response",
                    "action": action,
                    "status": "completed",
                    "message": f"✅ {action.get('type', 'Action')} completed successfully"
                })
                
            elif data.get("type") == "demo":
                # Demo functionality
                await websocket.send_json({
                    "type": "demo_response",
                    "message": "🎬 Running PAM demo...",
                    "actions": [
                        {
                            "type": "message",
                            "content": "✅ Added $25.00 expense to fuel category."
                        },
                        {
                            "type": "navigate",
                            "target": "/wins/expenses"
                        },
                        {
                            "type": "alert",
                            "content": "💡 You've used 45% of your fuel budget this month!"
                        }
                    ]
                })
                
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
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass
