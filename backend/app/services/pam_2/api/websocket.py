"""
PAM 2.0 WebSocket Handlers
Real-time conversation and updates
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Any, Optional
import logging
import json
from datetime import datetime

from .models import WebSocketMessage, WebSocketChatMessage, WebSocketResponse
from ..services import (
    ConversationalEngine,
    ContextManager,
    TripLogger,
    SavingsTracker,
    SafetyLayer
)
from ..core.types import ChatMessage, MessageType
from ..core.exceptions import PAMBaseException

logger = logging.getLogger(__name__)

class WebSocketManager:
    """
    WebSocket connection manager for PAM 2.0
    Handles real-time conversations and updates
    """

    def __init__(self):
        # Active connections: user_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}

        # Service instances
        self.conversational_engine = ConversationalEngine()
        self.context_manager = ContextManager()
        self.trip_logger = TripLogger()
        self.savings_tracker = SavingsTracker()
        self.safety_layer = SafetyLayer()

    async def connect(self, websocket: WebSocket, user_id: str):
        """Connect a user to WebSocket"""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"WebSocket connected for user {user_id}")

        # Send connection confirmation
        await self.send_message(websocket, {
            "type": "connection_established",
            "message": "Connected to PAM 2.0",
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
        })

    def disconnect(self, user_id: str):
        """Disconnect a user from WebSocket"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"WebSocket disconnected for user {user_id}")

    async def send_message(self, websocket: WebSocket, message: Dict[str, Any]):
        """Send message to WebSocket"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending WebSocket message: {e}")

    async def broadcast_to_user(self, user_id: str, message: Dict[str, Any]):
        """Broadcast message to specific user"""
        if user_id in self.active_connections:
            await self.send_message(self.active_connections[user_id], message)

    async def handle_message(self, websocket: WebSocket, user_id: str, data: Dict[str, Any]):
        """
        Handle incoming WebSocket message
        Process through all PAM 2.0 services
        """
        try:
            message_type = data.get("type", "chat")

            if message_type == "chat":
                await self._handle_chat_message(websocket, user_id, data)
            elif message_type == "context_request":
                await self._handle_context_request(websocket, user_id, data)
            elif message_type == "ping":
                await self._handle_ping(websocket, user_id)
            else:
                await self.send_message(websocket, {
                    "type": "error",
                    "message": f"Unknown message type: {message_type}",
                    "timestamp": datetime.now().isoformat()
                })

        except Exception as e:
            logger.error(f"Error handling WebSocket message for user {user_id}: {e}")
            await self.send_message(websocket, {
                "type": "error",
                "message": "Internal server error",
                "error_details": str(e),
                "timestamp": datetime.now().isoformat()
            })

    async def _handle_chat_message(
        self,
        websocket: WebSocket,
        user_id: str,
        data: Dict[str, Any]
    ):
        """Handle chat message through WebSocket"""

        message_content = data.get("message", "")
        session_id = data.get("session_id")

        # Safety check first
        safety_check = await self.safety_layer.check_message_safety(
            user_id=user_id,
            message=message_content
        )

        if not safety_check.data.get("is_safe", False):
            await self.send_message(websocket, {
                "type": "safety_warning",
                "message": "Message blocked by safety filters",
                "issues": safety_check.data.get("detected_issues", []),
                "timestamp": datetime.now().isoformat()
            })
            return

        # Get or create conversation context
        context = await self.context_manager.get_conversation_context(
            user_id=user_id,
            session_id=session_id
        )

        if not context:
            context = await self.context_manager.create_conversation_context(
                user_id=user_id,
                session_id=session_id
            )

        # Send typing indicator
        await self.send_message(websocket, {
            "type": "typing",
            "message": "PAM is thinking...",
            "timestamp": datetime.now().isoformat()
        })

        # Process with conversational engine
        ai_response = await self.conversational_engine.process_message(
            user_id=user_id,
            message=message_content,
            context=context
        )

        # Parallel analysis (non-blocking)
        trip_analysis = await self.trip_logger.analyze_conversation_for_trip_activity(
            user_id=user_id,
            message=message_content
        )

        financial_analysis = await self.savings_tracker.analyze_financial_conversation(
            user_id=user_id,
            message=message_content
        )

        # Update context
        user_message = ChatMessage(
            user_id=user_id,
            type=MessageType.USER,
            content=message_content,
            timestamp=datetime.now()
        )
        await self.context_manager.update_conversation_context(context, user_message)

        # Send AI response
        response_data = {
            "type": "chat_response",
            "response": ai_response.data.get("response", ""),
            "ui_action": ai_response.data.get("ui_action"),
            "session_id": context.session_id,
            "metadata": {
                "user_id": user_id,
                "analysis": {
                    "trip_activity": trip_analysis.data.get("trip_activity_detected", False),
                    "financial_content": financial_analysis.data.get("financial_content_detected", False),
                },
                "response_time_ms": 200,  # TODO: Calculate actual response time
                "model_used": "gemini-1.5-flash"
            },
            "timestamp": datetime.now().isoformat()
        }

        await self.send_message(websocket, response_data)

        # Send additional insights if detected
        if trip_analysis.data.get("trip_activity_detected"):
            suggestions = await self.trip_logger.suggest_trip_assistance(
                user_id, trip_analysis.data
            )
            if suggestions:
                await self.send_message(websocket, {
                    "type": "trip_suggestion",
                    "suggestions": suggestions,
                    "timestamp": datetime.now().isoformat()
                })

        if financial_analysis.data.get("financial_content_detected"):
            recommendations = financial_analysis.data.get("recommendations", [])
            if recommendations:
                await self.send_message(websocket, {
                    "type": "financial_recommendation",
                    "recommendations": recommendations,
                    "timestamp": datetime.now().isoformat()
                })

    async def _handle_context_request(
        self,
        websocket: WebSocket,
        user_id: str,
        data: Dict[str, Any]
    ):
        """Handle context information request"""

        session_id = data.get("session_id")
        context = await self.context_manager.get_conversation_context(user_id, session_id)

        if context:
            await self.send_message(websocket, {
                "type": "context_info",
                "context": {
                    "session_id": context.session_id,
                    "message_count": len(context.messages),
                    "current_topic": context.current_topic,
                    "last_activity": context.last_activity.isoformat()
                },
                "timestamp": datetime.now().isoformat()
            })
        else:
            await self.send_message(websocket, {
                "type": "context_info",
                "context": None,
                "message": "No context found",
                "timestamp": datetime.now().isoformat()
            })

    async def _handle_ping(self, websocket: WebSocket, user_id: str):
        """Handle ping message"""
        await self.send_message(websocket, {
            "type": "pong",
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
        })

# Global WebSocket manager instance
websocket_manager = WebSocketManager()

# WebSocket endpoint
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """
    Main WebSocket endpoint for PAM 2.0
    Phase 6: Real-time conversation + database updates
    """
    await websocket_manager.connect(websocket, user_id)

    try:
        while True:
            # Receive message
            data = await websocket.receive_json()

            # Handle message through manager
            await websocket_manager.handle_message(websocket, user_id, data)

    except WebSocketDisconnect:
        websocket_manager.disconnect(user_id)
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        websocket_manager.disconnect(user_id)
        await websocket.close(code=1000)