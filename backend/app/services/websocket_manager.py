
import asyncio
import json
import logging
from typing import Dict, List, Set, Optional, Any
from datetime import datetime, timedelta
from collections import defaultdict, deque
from fastapi import WebSocket, WebSocketDisconnect
import redis.asyncio as redis
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

class WebSocketManager:
    def __init__(self):
        # Connection management
        self.connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, Set[str]] = defaultdict(set)
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        
        # Room/channel support
        self.rooms: Dict[str, Set[str]] = defaultdict(set)
        self.connection_rooms: Dict[str, Set[str]] = defaultdict(set)
        
        # Message queuing for offline users
        self.offline_messages: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        
        # Presence tracking
        self.user_presence: Dict[str, Dict[str, Any]] = {}
        self.presence_heartbeats: Dict[str, datetime] = {}
        
        # Redis pub/sub for multi-instance support
        self.redis_pool = None
        self.pubsub = None
        self.redis_listener_task = None
        
        # Statistics
        self.stats = {
            'total_connections': 0,
            'active_connections': 0,
            'messages_sent': 0,
            'messages_received': 0,
            'rooms_active': 0
        }

    async def initialize_redis(self):
        """Initialize Redis connection for pub/sub"""
        try:
            self.redis_pool = redis.ConnectionPool.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                max_connections=20
            )
            redis_client = redis.Redis(connection_pool=self.redis_pool)
            
            # Test connection
            await redis_client.ping()
            
            # Initialize pub/sub
            self.pubsub = redis_client.pubsub()
            await self.pubsub.subscribe('websocket_broadcast', 'websocket_rooms')
            
            # Start Redis listener
            self.redis_listener_task = asyncio.create_task(self._redis_listener())
            
            logger.info("Redis WebSocket pub/sub initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis for WebSocket: {e}")
            # Continue without Redis (single instance mode)

    async def _redis_listener(self):
        """Listen for Redis pub/sub messages"""
        try:
            async for message in self.pubsub.listen():
                if message['type'] == 'message':
                    await self._handle_redis_message(message)
        except Exception as e:
            logger.error(f"Redis listener error: {e}")

    async def _handle_redis_message(self, message):
        """Handle incoming Redis pub/sub messages"""
        try:
            channel = message['channel']
            data = json.loads(message['data'])
            
            if channel == 'websocket_broadcast':
                await self._handle_broadcast_message(data)
            elif channel == 'websocket_rooms':
                await self._handle_room_message(data)
                
        except Exception as e:
            logger.error(f"Error handling Redis message: {e}")

    async def _handle_broadcast_message(self, data):
        """Handle broadcast messages from Redis"""
        message = data.get('message', {})
        exclude_connections = set(data.get('exclude_connections', []))
        
        # Send to all local connections except excluded ones
        for connection_id, websocket in self.connections.items():
            if connection_id not in exclude_connections:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending broadcast message to {connection_id}: {e}")

    async def _handle_room_message(self, data):
        """Handle room-specific messages from Redis"""
        room = data.get('room')
        message = data.get('message', {})
        exclude_connections = set(data.get('exclude_connections', []))
        
        if room in self.rooms:
            for connection_id in self.rooms[room]:
                if connection_id not in exclude_connections and connection_id in self.connections:
                    try:
                        await self.connections[connection_id].send_json(message)
                    except Exception as e:
                        logger.error(f"Error sending room message to {connection_id}: {e}")

    async def connect(self, websocket: WebSocket, user_id: str, connection_id: str, 
                     metadata: Optional[Dict[str, Any]] = None):
        """Accept WebSocket connection and register user"""
        await websocket.accept()
        
        # Store connection
        self.connections[connection_id] = websocket
        self.user_connections[user_id].add(connection_id)
        
        # Store metadata
        self.connection_metadata[connection_id] = {
            'user_id': user_id,
            'connected_at': datetime.utcnow(),
            'last_activity': datetime.utcnow(),
            **(metadata or {})
        }
        
        # Update presence
        await self._update_presence(user_id, connection_id, 'online')
        
        # Send queued offline messages
        await self._send_queued_messages(user_id, connection_id)
        
        # Update stats
        self.stats['total_connections'] += 1
        self.stats['active_connections'] = len(self.connections)
        
        logger.info(f"WebSocket connected: user={user_id}, connection={connection_id}")

    async def disconnect(self, user_id: str, connection_id: str):
        """Handle WebSocket disconnection"""
        try:
            # Remove from connections
            if connection_id in self.connections:
                del self.connections[connection_id]
            
            # Remove from user connections
            if user_id in self.user_connections:
                self.user_connections[user_id].discard(connection_id)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]
            
            # Remove from all rooms
            await self._leave_all_rooms(connection_id)
            
            # Clean up metadata
            if connection_id in self.connection_metadata:
                del self.connection_metadata[connection_id]
            
            # Update presence
            await self._update_presence(user_id, connection_id, 'offline')
            
            # Update stats
            self.stats['active_connections'] = len(self.connections)
            
            logger.info(f"WebSocket disconnected: user={user_id}, connection={connection_id}")
            
        except Exception as e:
            logger.error(f"Error during disconnect: {e}")

    async def send_personal_message(self, message: Dict[str, Any], user_id: str):
        """Send message to specific user"""
        if user_id not in self.user_connections:
            # Queue message for offline user
            self.offline_messages[user_id].append({
                'message': message,
                'timestamp': datetime.utcnow().isoformat()
            })
            logger.info(f"Queued message for offline user: {user_id}")
            return False

        # Send to all user's connections
        sent_count = 0
        failed_connections = []
        
        for connection_id in self.user_connections[user_id].copy():
            try:
                websocket = self.connections[connection_id]
                await websocket.send_json(message)
                sent_count += 1
                
                # Update last activity
                if connection_id in self.connection_metadata:
                    self.connection_metadata[connection_id]['last_activity'] = datetime.utcnow()
                    
            except Exception as e:
                logger.error(f"Failed to send message to {connection_id}: {e}")
                failed_connections.append(connection_id)

        # Clean up failed connections
        for connection_id in failed_connections:
            await self.disconnect(user_id, connection_id)

        self.stats['messages_sent'] += sent_count
        return sent_count > 0

    async def broadcast(self, message: Dict[str, Any], exclude_connections: Optional[Set[str]] = None):
        """Broadcast message to all connected users"""
        exclude_connections = exclude_connections or set()
        
        # Local broadcast
        sent_count = 0
        failed_connections = []
        
        for connection_id, websocket in self.connections.items():
            if connection_id not in exclude_connections:
                try:
                    await websocket.send_json(message)
                    sent_count += 1
                except Exception as e:
                    logger.error(f"Failed to broadcast to {connection_id}: {e}")
                    failed_connections.append(connection_id)

        # Redis broadcast for multi-instance support
        if self.redis_pool:
            try:
                redis_client = redis.Redis(connection_pool=self.redis_pool)
                await redis_client.publish('websocket_broadcast', json.dumps({
                    'message': message,
                    'exclude_connections': list(exclude_connections)
                }))
            except Exception as e:
                logger.error(f"Failed to publish broadcast to Redis: {e}")

        # Clean up failed connections
        for connection_id in failed_connections:
            user_id = self.connection_metadata.get(connection_id, {}).get('user_id')
            if user_id:
                await self.disconnect(user_id, connection_id)

        self.stats['messages_sent'] += sent_count
        logger.info(f"Broadcast sent to {sent_count} connections")

    async def join_room(self, connection_id: str, room: str):
        """Add connection to a room"""
        if connection_id in self.connections:
            self.rooms[room].add(connection_id)
            self.connection_rooms[connection_id].add(room)
            
            # Update stats
            self.stats['rooms_active'] = len([room for room in self.rooms if self.rooms[room]])
            
            logger.info(f"Connection {connection_id} joined room {room}")
            return True
        return False

    async def leave_room(self, connection_id: str, room: str):
        """Remove connection from a room"""
        if room in self.rooms:
            self.rooms[room].discard(connection_id)
            if not self.rooms[room]:
                del self.rooms[room]
        
        if connection_id in self.connection_rooms:
            self.connection_rooms[connection_id].discard(room)
            if not self.connection_rooms[connection_id]:
                del self.connection_rooms[connection_id]
        
        # Update stats
        self.stats['rooms_active'] = len([room for room in self.rooms if self.rooms[room]])
        
        logger.info(f"Connection {connection_id} left room {room}")

    async def _leave_all_rooms(self, connection_id: str):
        """Remove connection from all rooms"""
        if connection_id in self.connection_rooms:
            rooms_to_leave = self.connection_rooms[connection_id].copy()
            for room in rooms_to_leave:
                await self.leave_room(connection_id, room)

    async def send_to_room(self, room: str, message: Dict[str, Any], 
                          exclude_connections: Optional[Set[str]] = None):
        """Send message to all connections in a room"""
        exclude_connections = exclude_connections or set()
        
        if room not in self.rooms:
            return 0

        # Local room broadcast
        sent_count = 0
        failed_connections = []
        
        for connection_id in self.rooms[room].copy():
            if connection_id not in exclude_connections and connection_id in self.connections:
                try:
                    await self.connections[connection_id].send_json(message)
                    sent_count += 1
                except Exception as e:
                    logger.error(f"Failed to send room message to {connection_id}: {e}")
                    failed_connections.append(connection_id)

        # Redis room broadcast for multi-instance support
        if self.redis_pool:
            try:
                redis_client = redis.Redis(connection_pool=self.redis_pool)
                await redis_client.publish('websocket_rooms', json.dumps({
                    'room': room,
                    'message': message,
                    'exclude_connections': list(exclude_connections)
                }))
            except Exception as e:
                logger.error(f"Failed to publish room message to Redis: {e}")

        # Clean up failed connections
        for connection_id in failed_connections:
            user_id = self.connection_metadata.get(connection_id, {}).get('user_id')
            if user_id:
                await self.disconnect(user_id, connection_id)

        self.stats['messages_sent'] += sent_count
        return sent_count

    async def _send_queued_messages(self, user_id: str, connection_id: str):
        """Send queued offline messages to newly connected user"""
        if user_id in self.offline_messages and self.offline_messages[user_id]:
            websocket = self.connections.get(connection_id)
            if websocket:
                messages_sent = 0
                while self.offline_messages[user_id]:
                    try:
                        queued_msg = self.offline_messages[user_id].popleft()
                        await websocket.send_json({
                            'type': 'queued_message',
                            'data': queued_msg['message'],
                            'queued_at': queued_msg['timestamp']
                        })
                        messages_sent += 1
                    except Exception as e:
                        logger.error(f"Failed to send queued message: {e}")
                        break
                
                if messages_sent > 0:
                    logger.info(f"Sent {messages_sent} queued messages to user {user_id}")

    async def _update_presence(self, user_id: str, connection_id: str, status: str):
        """Update user presence information"""
        now = datetime.utcnow()
        
        if status == 'online':
            self.user_presence[user_id] = {
                'status': 'online',
                'last_seen': now.isoformat(),
                'connections': len(self.user_connections.get(user_id, set())),
                'connection_id': connection_id
            }
            self.presence_heartbeats[connection_id] = now
            
        elif status == 'offline':
            # Only mark offline if no other connections exist
            if user_id not in self.user_connections or not self.user_connections[user_id]:
                self.user_presence[user_id] = {
                    'status': 'offline',
                    'last_seen': now.isoformat(),
                    'connections': 0
                }
            
            if connection_id in self.presence_heartbeats:
                del self.presence_heartbeats[connection_id]

    async def heartbeat(self, connection_id: str):
        """Update heartbeat for connection"""
        if connection_id in self.connection_metadata:
            self.connection_metadata[connection_id]['last_activity'] = datetime.utcnow()
            self.presence_heartbeats[connection_id] = datetime.utcnow()

    async def cleanup_stale_connections(self):
        """Clean up stale connections (should be called periodically)"""
        now = datetime.utcnow()
        stale_threshold = timedelta(minutes=5)
        
        stale_connections = []
        for connection_id, last_heartbeat in self.presence_heartbeats.items():
            if now - last_heartbeat > stale_threshold:
                stale_connections.append(connection_id)
        
        for connection_id in stale_connections:
            user_id = self.connection_metadata.get(connection_id, {}).get('user_id')
            if user_id:
                logger.info(f"Cleaning up stale connection: {connection_id}")
                await self.disconnect(user_id, connection_id)

    def get_stats(self) -> Dict[str, Any]:
        """Get WebSocket manager statistics"""
        return {
            **self.stats,
            'users_online': len(self.user_connections),
            'total_rooms': len(self.rooms),
            'queued_messages': sum(len(queue) for queue in self.offline_messages.values())
        }

    def get_user_presence(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get presence information for a user"""
        return self.user_presence.get(user_id)

    def get_room_users(self, room: str) -> List[str]:
        """Get list of users in a room"""
        if room not in self.rooms:
            return []
        
        users = []
        for connection_id in self.rooms[room]:
            user_id = self.connection_metadata.get(connection_id, {}).get('user_id')
            if user_id:
                users.append(user_id)
        
        return list(set(users))  # Remove duplicates

    async def shutdown(self):
        """Gracefully shutdown WebSocket manager"""
        logger.info("Shutting down WebSocket manager...")
        
        # Close all connections
        for connection_id, websocket in self.connections.items():
            try:
                await websocket.close()
            except Exception as e:
                logger.error(f"Error closing connection {connection_id}: {e}")
        
        # Stop Redis listener
        if self.redis_listener_task:
            self.redis_listener_task.cancel()
            try:
                await self.redis_listener_task
            except asyncio.CancelledError:
                pass
        
        # Close Redis connections
        if self.pubsub:
            await self.pubsub.close()
        
        if self.redis_pool:
            await self.redis_pool.disconnect()
        
        logger.info("WebSocket manager shutdown complete")

# Global WebSocket manager instance
websocket_manager = WebSocketManager()
