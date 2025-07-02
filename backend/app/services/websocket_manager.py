from typing import List, Dict
import asyncio
import json
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, WebSocket] = {}
        self.connection_mapping: Dict[str, WebSocket] = {}  # connection_id -> websocket

    async def connect(self, websocket: WebSocket, user_id: str = None, connection_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            self.user_connections[user_id] = websocket
        if connection_id:
            self.connection_mapping[connection_id] = websocket

    async def disconnect(self, user_id: str = None, connection_id: str = None):
        websocket = None
        
        # Find websocket by connection_id or user_id
        if connection_id and connection_id in self.connection_mapping:
            websocket = self.connection_mapping[connection_id]
            del self.connection_mapping[connection_id]
        elif user_id and user_id in self.user_connections:
            websocket = self.user_connections[user_id]
            del self.user_connections[user_id]
        
        # Remove from active connections
        if websocket and websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def send_message_to_user(self, message: str, user_id: str):
        if user_id in self.user_connections:
            websocket = self.user_connections[user_id]
            await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove dead connections
                self.active_connections.remove(connection)

# Create the manager instance.  Historically this module exposed a
# ``websocket_manager`` variable, but other modules also import
# ``manager``.  Provide both names for backward compatibility.
websocket_manager = ConnectionManager()
manager = websocket_manager