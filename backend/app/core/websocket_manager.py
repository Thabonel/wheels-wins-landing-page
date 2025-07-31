import asyncio
import time
from typing import Dict, Optional
from fastapi import WebSocket
from fastapi.websockets import WebSocketState
from app.core.logging import get_logger

logger = get_logger(__name__)

class ConnectionManager:
    def __init__(self):
        # Map connection_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # Map user_id -> {connection_id -> WebSocket}
        self.user_connections: Dict[str, Dict[str, WebSocket]] = {}
        # Connection metadata for heartbeat tracking
        self.connection_metadata: Dict[str, Dict] = {}
        # Heartbeat configuration - more aggressive for production
        self.heartbeat_interval = 20  # Send ping every 20 seconds
        self.connection_timeout = 120  # Consider connection dead after 2 minutes
        self.max_missed_pings = 5  # Maximum missed pings before disconnection
        self.heartbeat_task: Optional[asyncio.Task] = None
    
    async def connect(self, websocket: WebSocket, user_id: str, connection_id: str) -> None:
        """Register a new WebSocket connection with heartbeat tracking."""
        # WebSocket should already be accepted by the endpoint
        self.active_connections[connection_id] = websocket
        
        if user_id not in self.user_connections:
            self.user_connections[user_id] = {}
        self.user_connections[user_id][connection_id] = websocket
        
        # Initialize connection metadata for heartbeat tracking
        self.connection_metadata[connection_id] = {
            "user_id": user_id,
            "connected_at": time.time(),
            "last_ping": time.time(),
            "last_pong": time.time(),
            "is_alive": True,
            "missed_pings": 0,
            "total_pings_sent": 0,
            "total_pongs_received": 0
        }
        
        logger.info(f"🔗 WebSocket connected: {connection_id} for user {user_id}")
        
        # Start heartbeat monitoring if not already running
        if not self.heartbeat_task or self.heartbeat_task.done():
            self.heartbeat_task = asyncio.create_task(self._heartbeat_monitor())
            logger.info("💓 Started WebSocket heartbeat monitoring")
    
    def disconnect(self, user_id: str, connection_id: str) -> None:
        """Remove a WebSocket connection and clean up metadata."""
        websocket = self.user_connections.get(user_id, {}).pop(connection_id, None)
        
        if user_id in self.user_connections and not self.user_connections[user_id]:
            self.user_connections.pop(user_id, None)
        
        if websocket is None:
            websocket = self.active_connections.get(connection_id)
        
        if websocket:
            self.active_connections.pop(connection_id, None)
        
        # Clean up connection metadata
        if connection_id in self.connection_metadata:
            metadata = self.connection_metadata.pop(connection_id)
            connection_duration = time.time() - metadata["connected_at"]
            logger.info(f"🔌 WebSocket disconnected: {connection_id} (duration: {connection_duration:.1f}s)")
        
        # Stop heartbeat monitoring if no connections remain
        if not self.active_connections and self.heartbeat_task and not self.heartbeat_task.done():
            self.heartbeat_task.cancel()
            logger.info("💓 Stopped WebSocket heartbeat monitoring (no active connections)")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send message to specific WebSocket with connection state checking."""
        try:
            # Check if WebSocket is still connected
            if websocket.client_state == WebSocketState.DISCONNECTED:
                logger.warning("⚠️ Attempted to send message to disconnected WebSocket")
                return False
                
            if isinstance(message, (dict, list)):
                await websocket.send_json(message)
            else:
                await websocket.send_text(str(message))
            return True
        except Exception as e:
            logger.error(f"❌ Failed to send WebSocket message: {e}")
            return False
    
    async def send_message_to_user(self, message: str, user_id: str):
        """Send message to all active connections for a user with cleanup."""
        if user_id in self.user_connections:
            # Send to all active connections for this user
            dead_connections = []
            for connection_id, ws in list(self.user_connections[user_id].items()):
                success = await self.send_personal_message(message, ws)
                if not success:
                    dead_connections.append(connection_id)
            
            # Clean up dead connections
            for connection_id in dead_connections:
                logger.warning(f"🧹 Cleaning up dead connection: {connection_id}")
                self.disconnect(user_id, connection_id)
    
    async def broadcast(self, message: str):
        """Broadcast message to all active connections with cleanup."""
        dead_connections = []
        for connection_id, connection in list(self.active_connections.items()):
            success = await self.send_personal_message(message, connection)
            if not success:
                dead_connections.append(connection_id)
        
        # Clean up dead connections
        for connection_id in dead_connections:
            if connection_id in self.connection_metadata:
                user_id = self.connection_metadata[connection_id]["user_id"]
                logger.warning(f"🧹 Cleaning up dead broadcast connection: {connection_id}")
                self.disconnect(user_id, connection_id)
    
    async def _heartbeat_monitor(self):
        """Background task to monitor WebSocket connections and send heartbeats."""
        logger.info("💓 WebSocket heartbeat monitor started")
        
        try:
            while True:
                current_time = time.time()
                dead_connections = []
                
                # Check all active connections
                for connection_id, metadata in list(self.connection_metadata.items()):
                    websocket = self.active_connections.get(connection_id)
                    if not websocket:
                        dead_connections.append(connection_id)
                        continue
                    
                    # Check if connection has timed out
                    time_since_pong = current_time - metadata["last_pong"]
                    if time_since_pong > self.connection_timeout:
                        metadata["missed_pings"] += 1
                        if metadata["missed_pings"] >= self.max_missed_pings:
                            logger.warning(f"💔 Connection timeout: {connection_id} (no pong for {time_since_pong:.1f}s, missed {metadata['missed_pings']} pings)")
                            dead_connections.append(connection_id)
                            continue
                        else:
                            logger.debug(f"⚠️ Missed ping {metadata['missed_pings']}/{self.max_missed_pings} for {connection_id}")
                    
                    # Send ping if interval has passed
                    time_since_ping = current_time - metadata["last_ping"]
                    if time_since_ping >= self.heartbeat_interval:
                        try:
                            # Check WebSocket state before sending
                            if websocket.client_state == WebSocketState.CONNECTED:
                                # FastAPI WebSocket doesn't have ping(), use JSON message instead
                                await asyncio.wait_for(
                                    websocket.send_json({
                                        "type": "ping",
                                        "timestamp": current_time,
                                        "connection_id": connection_id
                                    }),
                                    timeout=5.0  # 5 second timeout for ping
                                )
                                metadata["last_ping"] = current_time
                                metadata["total_pings_sent"] += 1
                                logger.debug(f"💓 Sent ping {metadata['total_pings_sent']} to {connection_id}")
                            else:
                                logger.warning(f"💔 WebSocket not connected for {connection_id}, state: {websocket.client_state}")
                                dead_connections.append(connection_id)
                        except asyncio.TimeoutError:
                            logger.warning(f"💔 Ping timeout for {connection_id}")
                            dead_connections.append(connection_id)
                        except Exception as e:
                            logger.warning(f"💔 Failed to ping {connection_id}: {e}")
                            dead_connections.append(connection_id)
                
                # Clean up dead connections
                for connection_id in dead_connections:
                    if connection_id in self.connection_metadata:
                        user_id = self.connection_metadata[connection_id]["user_id"]
                        logger.warning(f"🧹 Cleaning up dead heartbeat connection: {connection_id}")
                        self.disconnect(user_id, connection_id)
                
                # Log connection statistics
                if self.active_connections:
                    alive_count = len(self.active_connections)
                    logger.debug(f"💓 Heartbeat check: {alive_count} active connections")
                
                # Wait before next heartbeat cycle
                await asyncio.sleep(self.heartbeat_interval)
                
        except asyncio.CancelledError:
            logger.info("💓 WebSocket heartbeat monitor cancelled")
        except Exception as e:
            logger.error(f"❌ Heartbeat monitor error: {e}")
    
    async def handle_pong(self, connection_id: str, pong_data: dict = None):
        """Handle pong response from client."""
        if connection_id in self.connection_metadata:
            metadata = self.connection_metadata[connection_id]
            metadata["last_pong"] = time.time()
            metadata["missed_pings"] = 0  # Reset missed ping counter
            metadata["total_pongs_received"] += 1
            
            # Calculate ping latency if timestamp provided
            if pong_data and "timestamp" in pong_data:
                try:
                    ping_timestamp = float(pong_data["timestamp"])
                    latency = (time.time() - ping_timestamp) * 1000  # Convert to ms
                    metadata["last_latency_ms"] = round(latency, 2)
                    logger.debug(f"💓 Pong from {connection_id} (latency: {latency:.2f}ms)")
                except (ValueError, TypeError):
                    logger.debug(f"💓 Pong from {connection_id} (no latency calc)")
            else:
                logger.debug(f"💓 Pong from {connection_id}")
    
    async def get_connection_stats(self) -> Dict:
        """Get WebSocket connection statistics."""
        current_time = time.time()
        stats = {
            "total_connections": len(self.active_connections),
            "unique_users": len(self.user_connections),
            "connections_by_user": {user: len(conns) for user, conns in self.user_connections.items()},
            "connection_details": []
        }
        
        for connection_id, metadata in self.connection_metadata.items():
            connection_age = current_time - metadata["connected_at"]
            time_since_ping = current_time - metadata["last_ping"]
            time_since_pong = current_time - metadata["last_pong"]
            
            stats["connection_details"].append({
                "connection_id": connection_id,
                "user_id": metadata["user_id"],
                "age_seconds": round(connection_age, 1),
                "time_since_ping": round(time_since_ping, 1),
                "time_since_pong": round(time_since_pong, 1),
                "is_alive": metadata["is_alive"],
                "missed_pings": metadata.get("missed_pings", 0),
                "total_pings_sent": metadata.get("total_pings_sent", 0),
                "total_pongs_received": metadata.get("total_pongs_received", 0),
                "last_latency_ms": metadata.get("last_latency_ms", 0)
            })
        
        return stats

# Create the manager instance
manager = ConnectionManager()
