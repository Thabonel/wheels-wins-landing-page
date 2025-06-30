from typing import List, Dict
import asyncio
import json
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, WebSocket] = {}
        self.connection_map: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str | None = None, connection_id: str | None = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            self.user_connections[user_id] = websocket
            if connection_id:
                if user_id not in self.connection_map:
                    self.connection_map[user_id] = {}
                self.connection_map[user_id][connection_id] = websocket

    def disconnect(self, user_id: str, connection_id: str | None = None):
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
        await websocket.send_text(message)

    async def send_message_to_user(self, message: str, user_id: str):
        if user_id in self.user_connections:
            websocket = self.user_connections[user_id]
            await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.active_connections.remove(connection)

    async def heartbeat(self, interval: float = 30.0):
        """Send periodic ping messages to keep connections alive"""
        while True:
            await asyncio.sleep(interval)
            for connection in list(self.active_connections):
                try:
                    await connection.send_text(json.dumps({"type": "ping"}))
                except Exception:
                    self.active_connections.remove(connection)

# Create the manager instance.  Historically this module exposed a
# ``websocket_manager`` variable, but other modules also import
# ``manager``.  Provide both names for backward compatibility.
websocket_manager = ConnectionManager()
manager = websocket_manager
