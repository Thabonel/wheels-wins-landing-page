from typing import List, Dict
import asyncio
import json
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, WebSocket] = {}
        # Allow multiple connections per user via connection IDs
        self.connection_map: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str = None, connection_id: str = None):
        """Register a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            self.user_connections[user_id] = websocket
            if connection_id:
                if user_id not in self.connection_map:
                    self.connection_map[user_id] = {}
                self.connection_map[user_id][connection_id] = websocket

    async def disconnect(self, user_id: str, connection_id: str = None):
        """Remove a WebSocket connection"""
        websocket = None
        if connection_id and user_id in self.connection_map:
            websocket = self.connection_map[user_id].pop(connection_id, None)
            if not self.connection_map[user_id]:
                del self.connection_map[user_id]
        if not websocket and user_id in self.user_connections:
            websocket = self.user_connections.pop(user_id)

        if websocket and websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        if isinstance(message, (dict, list)):
            await websocket.send_json(message)
        else:
            await websocket.send_text(str(message))

    async def send_message_to_user(self, message: str, user_id: str):
        if user_id in self.user_connections:
            websocket = self.user_connections[user_id]
            await self.send_personal_message(message, websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove dead connections
                self.active_connections.remove(connection)

# Create the manager instance
manager = ConnectionManager()
