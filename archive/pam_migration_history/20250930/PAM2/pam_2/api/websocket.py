"""
PAM 2.0 WebSocket Handler
========================

Real-time WebSocket communication for PAM 2.0.
Provides streaming chat interface with context awareness.

Key Features:
- Real-time bidirectional communication
- Session management and context persistence
- Safety filtering and rate limiting
- Connection lifecycle management

Design: <200 lines, single responsibility, easily testable
"""

import json
import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime

from fastapi import WebSocket, WebSocketDisconnect, Depends, status
from fastapi.exceptions import WebSocketException

from .models import WebSocketMessage, WebSocketChatMessage, WebSocketResponse
from ..core.types import ChatMessage, MessageType
from ..core.exceptions import PAM2Exception, handle_async_service_error
from ..services import (
    create_conversational_engine, create_context_manager,
    create_safety_layer
)

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Clean WebSocket connection manager for PAM 2.0

    Handles real-time communication with safety and context management.
    """

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_sessions: Dict[str, str] = {}  # user_id -> session_id

        # Service instances (shared across connections)
        self.conversational_engine = None
        self.context_manager = None
        self.safety_layer = None

        logger.info("WebSocketManager initialized")

    async def initialize_services(self):
        """Initialize services if not already done"""
        if not self.conversational_engine:
            self.conversational_engine = create_conversational_engine()
            self.context_manager = create_context_manager()
            self.safety_layer = create_safety_layer()

            # Initialize async services
            await self.conversational_engine.initialize()
            await self.context_manager.initialize()
            await self.safety_layer.initialize()

            logger.info("WebSocket services initialized")

    async def connect(self, websocket: WebSocket, user_id: str, session_id: Optional[str] = None):
        """Accept WebSocket connection and setup user session"""
        await websocket.accept()

        # Initialize services if needed
        await self.initialize_services()

        # Setup user session
        if session_id:
            self.user_sessions[user_id] = session_id

        self.active_connections[user_id] = websocket

        logger.info(f"WebSocket connected: user_id={user_id}, session_id={session_id}")

        # Send welcome message
        await self.send_message(user_id, WebSocketResponse(
            type="connection_established",
            success=True,
            data={
                "user_id": user_id,
                "session_id": session_id,
                "message": "Connected to PAM 2.0"
            }
        ))

    async def disconnect(self, user_id: str):
        """Handle WebSocket disconnection"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]

        if user_id in self.user_sessions:
            del self.user_sessions[user_id]

        logger.info(f"WebSocket disconnected: user_id={user_id}")

    async def send_message(self, user_id: str, message: WebSocketResponse):
        """Send message to specific user"""
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            try:
                await websocket.send_text(message.json())
            except Exception as e:
                logger.error(f"Failed to send message to {user_id}: {e}")
                await self.disconnect(user_id)

    async def broadcast_message(self, message: WebSocketResponse):
        """Broadcast message to all connected users"""
        disconnected_users = []

        for user_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(message.json())
            except Exception as e:
                logger.error(f"Failed to broadcast to {user_id}: {e}")
                disconnected_users.append(user_id)

        # Clean up disconnected users
        for user_id in disconnected_users:
            await self.disconnect(user_id)

    @handle_async_service_error
    async def handle_chat_message(self, user_id: str, chat_data: WebSocketChatMessage):
        """Process incoming chat message"""
        try:
            # Create chat message
            chat_message = ChatMessage(
                user_id=user_id,
                type=MessageType.USER,
                content=chat_data.message
            )

            # Safety check first
            safety_result = await self.safety_layer.check_message_safety(chat_message)
            if not safety_result.success or not safety_result.data["safety_passed"]:
                await self.send_message(user_id, WebSocketResponse(
                    type="chat_error",
                    success=False,
                    data=None,
                    error="Message blocked by safety filters"
                ))
                return

            # Retrieve context if session exists
            context = None
            session_id = self.user_sessions.get(user_id) or chat_data.session_id
            if session_id:
                context_result = await self.context_manager.retrieve_context(session_id, user_id)
                if context_result.success:
                    context = context_result.data

            # Send typing indicator
            await self.send_message(user_id, WebSocketResponse(
                type="typing_start",
                success=True,
                data={"user_id": user_id}
            ))

            # Generate AI response
            response_result = await self.conversational_engine.process_message(
                user_id=user_id,
                message=chat_data.message,
                context=context,
                session_id=session_id
            )

            # Stop typing indicator
            await self.send_message(user_id, WebSocketResponse(
                type="typing_stop",
                success=True,
                data={"user_id": user_id}
            ))

            if not response_result.success:
                await self.send_message(user_id, WebSocketResponse(
                    type="chat_error",
                    success=False,
                    data=None,
                    error=response_result.error
                ))
                return

            # Store updated context if session exists
            if session_id and context is not None:
                ai_response_message = ChatMessage(
                    user_id=user_id,
                    type=MessageType.ASSISTANT,
                    content=response_result.data["response"]
                )

                await self.context_manager.add_message_to_context(session_id, chat_message)
                await self.context_manager.add_message_to_context(session_id, ai_response_message)

            # Send successful response
            await self.send_message(user_id, WebSocketResponse(
                type="chat_response",
                success=True,
                data={
                    "response": response_result.data["response"],
                    "ui_action": response_result.data.get("ui_action", "none"),
                    "processing_time_ms": response_result.data.get("processing_time_ms", 0),
                    "model_used": response_result.data.get("model_used", "unknown"),
                    "session_id": session_id
                }
            ))

        except PAM2Exception as e:
            await self.send_message(user_id, WebSocketResponse(
                type="chat_error",
                success=False,
                data=None,
                error=str(e)
            ))
        except Exception as e:
            logger.error(f"WebSocket chat handling failed: {e}")
            await self.send_message(user_id, WebSocketResponse(
                type="chat_error",
                success=False,
                data=None,
                error="Internal server error"
            ))


# Global WebSocket manager instance
websocket_manager = WebSocketManager()


async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    session_id: Optional[str] = None
):
    """
    Main WebSocket endpoint for PAM 2.0 real-time communication

    Handles connection lifecycle and message routing.
    """
    await websocket_manager.connect(websocket, user_id, session_id)

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()

            try:
                # Parse incoming message
                message_data = json.loads(data)
                message = WebSocketMessage(**message_data)

                # Route message based on type
                if message.type == "chat_message":
                    chat_data = WebSocketChatMessage(**message.data)
                    await websocket_manager.handle_chat_message(user_id, chat_data)

                elif message.type == "ping":
                    # Respond to ping with pong
                    await websocket_manager.send_message(user_id, WebSocketResponse(
                        type="pong",
                        success=True,
                        data={"timestamp": datetime.now().isoformat()}
                    ))

                else:
                    # Unknown message type
                    await websocket_manager.send_message(user_id, WebSocketResponse(
                        type="error",
                        success=False,
                        data=None,
                        error=f"Unknown message type: {message.type}"
                    ))

            except json.JSONDecodeError:
                await websocket_manager.send_message(user_id, WebSocketResponse(
                    type="error",
                    success=False,
                    data=None,
                    error="Invalid JSON format"
                ))
            except Exception as e:
                logger.error(f"Message processing error: {e}")
                await websocket_manager.send_message(user_id, WebSocketResponse(
                    type="error",
                    success=False,
                    data=None,
                    error="Message processing failed"
                ))

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected normally: user_id={user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await websocket_manager.disconnect(user_id)