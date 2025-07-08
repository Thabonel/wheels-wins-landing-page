from typing import Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Map connection_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # Map user_id -> {connection_id -> WebSocket}
        self.user_connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str, connection_id: str) -> None:
        """Register a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        if user_id not in self.user_connections:
            self.user_connections[user_id] = {}
        self.user_connections[user_id][connection_id] = websocket

    async def disconnect(self, user_id: str, connection_id: str) -> None:
        """Remove a WebSocket connection."""
        websocket = self.user_connections.get(user_id, {}).pop(connection_id, None)
        if user_id in self.user_connections and not self.user_connections[user_id]:
            self.user_connections.pop(user_id, None)

        if websocket is None:
            websocket = self.active_connections.get(connection_id)

        if websocket:
            self.active_connections.pop(connection_id, None)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        if isinstance(message, (dict, list)):
            await websocket.send_json(message)
        else:
            await websocket.send_text(str(message))

    async def send_message_to_user(self, message: str, user_id: str):
        if user_id in self.user_connections:
            # Send to all active connections for this user
            for ws in list(self.user_connections[user_id].values()):
                await self.send_personal_message(message, ws)

    async def broadcast(self, message: str):
        for connection_id, connection in list(self.active_connections.items()):
            try:
                await connection.send_text(message)
            except Exception:
                # Remove dead connections
                self.active_connections.pop(connection_id, None)

# Create the manager instance
manager = ConnectionManager()
