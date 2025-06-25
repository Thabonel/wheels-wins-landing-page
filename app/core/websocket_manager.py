from typing import Dict, List
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger("pam")

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, List[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str, connection_id: str):
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(connection_id)
        
        logger.info(f"WebSocket connected: user={user_id}, connection={connection_id}")

    async def disconnect(self, user_id: str, connection_id: str):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        if user_id in self.user_connections:
            self.user_connections[user_id].remove(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        logger.info(f"WebSocket disconnected: user={user_id}, connection={connection_id}")

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.user_connections:
            disconnected = []
            for connection_id in self.user_connections[user_id]:
                try:
                    websocket = self.active_connections[connection_id]
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to {connection_id}: {e}")
                    disconnected.append(connection_id)
            
            # Clean up disconnected connections
            for conn_id in disconnected:
                await self.disconnect(user_id, conn_id)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to {connection_id}: {e}")
                disconnected.append(connection_id)
        
        # Clean up disconnected connections
        for conn_id in disconnected:
            # Find user_id for this connection
            for user_id, connections in self.user_connections.items():
                if conn_id in connections:
                    await self.disconnect(user_id, conn_id)
                    break

manager = ConnectionManager()
