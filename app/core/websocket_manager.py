
# Legacy compatibility import
# from backend.app.services.websocket_manager import websocket_manager as manager

# Keep the existing simple interface for backward compatibility
class ConnectionManager:
    def __init__(self):
        self.manager = manager

    async def connect(self, websocket, user_id: str, connection_id: str):
        await self.manager.connect(websocket, user_id, connection_id)

    async def disconnect(self, user_id: str, connection_id: str):
        await self.manager.disconnect(user_id, connection_id)

    async def send_personal_message(self, message: dict, user_id: str):
        return await self.manager.send_personal_message(message, user_id)

    async def broadcast(self, message: dict):
        await self.manager.broadcast(message)

# Keep existing manager instance for backward compatibility
manager = ConnectionManager()
