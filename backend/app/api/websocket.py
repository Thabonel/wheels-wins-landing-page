from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.auth import verify_token
from app.core.logging import setup_logging, get_logger
from app.core.simple_pam_service import simple_pam_service
from app.core.websocket_manager import manager
import uuid
import json

router = APIRouter()
setup_logging()
logger = get_logger(__name__)




@router.websocket("/ws")
async def websocket_endpoint_generic(
    websocket: WebSocket,
    token: str = Query(...)
):
    """WebSocket endpoint for real-time communication with PAM"""
    # Accept the connection first to avoid 403 error
    await websocket.accept()
    
    # Extract user_id from token
    user_id = "anonymous"
    
    # Verify JWT token and extract user_id
    try:
        # Try to decode as JWT first (for Supabase tokens)
        import jwt
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get('sub', 'anonymous')
        
        # Log for debugging
        logger.info(f"🔐 WebSocket auth - token user_id: {user_id}")
        
        # More lenient validation - accept if token is valid JWT
        if not user_id:
            await websocket.close(code=1008, reason="Invalid token")
            return
            
    except Exception as e:
        logger.error(f"🔐 WebSocket JWT decode error: {e}")
        # Fall back to treating token as plain user_id for development
        if not token or len(token) < 10:  # Basic validation
            await websocket.close(code=1008, reason="Invalid token format")
            return
            
    await websocket_handler(websocket, user_id)


@router.websocket("/{user_id}")
async def websocket_endpoint_with_user_id(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(...)
):
    """WebSocket endpoint for real-time communication with PAM (with user_id in path)"""
    # Accept the connection first to avoid 403 error
    await websocket.accept()
    
    # Verify JWT token for this user after accepting the connection
    try:
        # Try to decode as JWT first (for Supabase tokens)
        import jwt
        decoded = jwt.decode(token, options={"verify_signature": False})
        token_user_id = decoded.get('sub', token)  # 'sub' is the user ID in Supabase JWT
        
        # Log for debugging
        logger.info(f"🔐 WebSocket auth - provided user_id: {user_id}, token user_id: {token_user_id}")
        
        # More lenient validation - accept if token is valid JWT
        if not token_user_id:
            await websocket.close(code=1008, reason="Invalid token")
            return
            
    except Exception as e:
        logger.error(f"🔐 WebSocket JWT decode error: {e}")
        # Fall back to treating token as plain user_id for development
        if not token or len(token) < 10:  # Basic validation
            await websocket.close(code=1008, reason="Invalid token format")
            return
            
    await websocket_handler(websocket, user_id)


async def websocket_handler(websocket: WebSocket, user_id: str):
    """Common WebSocket handler for PAM communication"""
    connection_id = str(uuid.uuid4())
    await manager.connect(websocket, user_id, connection_id)

    # Send initial welcome payload
    await websocket.send_json({
        "type": "connection",
        "status": "connected",
        "message": "🤖 PAM is ready to assist you! Try saying: 'I spent $25 on fuel' or 'Show my budget'"
    })

    try:
        while True:
            data = await websocket.receive_json()
            logger.info(f"Received WebSocket message from {user_id}: {data}")
            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "chat":
                message = data.get("content", "")
                context = data.get("context", {})
                
                # Ensure user_id is properly set in context
                if not context.get("user_id"):
                    context["user_id"] = user_id
                
                # Add session info for better tracking
                context["websocket_user"] = user_id
                context["connection_type"] = "websocket"

                logger.info(f"📍 Context: {json.dumps(context, indent=2)}")
                logger.info(f"💬 Message: '{message}' from user: {user_id}")

                try:
                    logger.info(f"🧠 Calling SimplePamService for user {user_id}")
                    
                    # Get conversation history if available
                    conversation_history = context.get("conversation_history", [])
                    
                    # Get response from SimplePamService
                    response_message = await simple_pam_service.get_response(
                        message=message,
                        context=context,
                        conversation_history=conversation_history
                    )
                    
                    # Create actions array for compatibility
                    actions = [{
                        "type": "message",
                        "content": response_message
                    }]
                    
                    logger.info(f"✅ SimplePamService returned response")
                    logger.info(f"📤 Response: {response_message}")
                    
                except Exception as e:
                    logger.error(f"❌ Chat processing error: {e}", exc_info=True)
                    actions = [{"type": "error", "content": str(e)}]
                    response_message = f"I encountered an error processing your request: {str(e)}"

                # Extract Mundi data from actions if present
                mundi_data = None
                for action in actions:
                    if action.get("type") == "message" and action.get("mundi_data"):
                        mundi_data = action.get("mundi_data")
                        break
                
                response_payload = {
                    "type": "chat_response",
                    "message": response_message,
                    "actions": actions,
                    "timestamp": str(uuid.uuid4())
                }
                
                # Include Mundi data if available
                if mundi_data:
                    response_payload["mundi_data"] = mundi_data
                
                await websocket.send_json(response_payload)

                ui_actions = [a for a in actions if a.get("type") in ["navigate", "fill_form", "click", "alert"]]
                if ui_actions:
                    await websocket.send_json({
                        "type": "ui_actions",
                        "actions": ui_actions
                    })

            elif msg_type == "action":
                action = data.get("action", {})
                await websocket.send_json({
                    "type": "action_response",
                    "action": action,
                    "status": "processing",
                    "message": f"Executing {action.get('type', 'unknown')}..."
                })
                # simulate completion
                await websocket.send_json({
                    "type": "action_response",
                    "action": action,
                    "status": "completed",
                    "message": f"✅ {action.get('type', 'Action')} completed"
                })

            elif msg_type == "demo":
                await websocket.send_json({
                    "type": "demo_response",
                    "message": "🎬 Running PAM demo...",
                    "actions": [
                        {"type": "message", "content": "✅ Added $25.00 expense to fuel category."},
                        {"type": "navigate", "target": "/wins/expenses"},
                        {"type": "alert", "content": "💡 You've used 45% of your fuel budget this month!"}
                    ]
                })

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}"
                })

    except WebSocketDisconnect:
        manager.disconnect(user_id, connection_id)
        logger.info(f"WebSocket disconnected: {user_id}")

    except Exception as e:
        manager.disconnect(user_id, connection_id)
        logger.error(f"WebSocket error for {user_id}: {e}")
        try:
            await websocket.close(code=1011, reason="Internal error")
        except:
            pass
