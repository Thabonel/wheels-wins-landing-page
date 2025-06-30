from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
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
    # Accept the WebSocket connection
    await websocket.accept()

    # Verify JWT token for this user
    if not token or not verify_token(token, user_id):
        await websocket.close(code=1008, reason="Unauthorized")
        return

    # Register connection (only websocket and user_id)
    await manager.connect(websocket, user_id)

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
                context["user_id"] = user_id

                logger.info(f"📍 Context: {json.dumps(context)}")
                logger.info(f"💬 Message: {message}")

                try:
                    actions = await orchestrator.plan(message, context)
                    response_message = next(
                        (a["content"] for a in actions if a.get("type") == "message"),
                        "I'm processing your request..."
                    )
                except Exception as e:
                    logger.error(f"Chat processing error: {e}")
                    actions = []
                    response_message = f"❌ Error: {e}"

                await websocket.send_json({
                    "type": "chat_response",
                    "message": response_message,
                    "actions": actions,
                    "timestamp": str(uuid.uuid4())
                })

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
        # Disconnect is synchronous
        manager.disconnect(websocket)
        logger.info(f"WebSocket disconnected: {user_id}")

    except Exception as e:
        manager.disconnect(websocket)
        logger.error(f"WebSocket error for {user_id}: {e}")
        try:
            await websocket.close(code=1011, reason="Internal error")
        except:
            pass
