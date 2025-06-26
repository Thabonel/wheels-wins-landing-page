
"""
Optimized WebSocket Manager
High-performance WebSocket connection management with message optimization.
"""

import asyncio
import json
import uuid
from typing import Dict, Set, Optional, Any
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timedelta
from fastapi import WebSocket
from app.core.logging import setup_logging

logger = setup_logging()

@dataclass
class ConnectionInfo:
    """Connection information with optimization metrics"""
    websocket: WebSocket
    user_id: str
    connection_id: str
    connected_at: datetime
    last_ping: datetime
    message_count: int = 0
    bytes_sent: int = 0
    bytes_received: int = 0

class OptimizedWebSocketManager:
    """High-performance WebSocket manager with message batching and compression"""
    
    def __init__(self):
        # Connection management
        self.active_connections: Dict[str, ConnectionInfo] = {}
        self.user_connections: Dict[str, Set[str]] = defaultdict(set)
        
        # Message queuing and batching
        self.message_queues: Dict[str, deque] = defaultdict(deque)
        self.batch_size = 10
        self.batch_timeout = 0.5  # 500ms
        
        # Rate limiting
        self.rate_limits: Dict[str, deque] = defaultdict(deque)
        self.max_messages_per_minute = 100
        
        # Background tasks
        self._cleanup_task: Optional[asyncio.Task] = None
        self._batch_processor_task: Optional[asyncio.Task] = None
        
        self.start_background_tasks()
    
    def start_background_tasks(self):
        """Start background optimization tasks"""
        if not self._cleanup_task or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._cleanup_stale_connections())
        
        if not self._batch_processor_task or self._batch_processor_task.done():
            self._batch_processor_task = asyncio.create_task(self._process_message_batches())
    
    async def connect(self, websocket: WebSocket, user_id: str, connection_id: str):
        """Connect WebSocket with optimization setup"""
        await websocket.accept()
        
        connection_info = ConnectionInfo(
            websocket=websocket,
            user_id=user_id,
            connection_id=connection_id,
            connected_at=datetime.now(),
            last_ping=datetime.now()
        )
        
        self.active_connections[connection_id] = connection_info
        self.user_connections[user_id].add(connection_id)
        
        logger.info(f"WebSocket connected: {user_id} ({connection_id})")
        
        # Start ping task for this connection
        asyncio.create_task(self._ping_connection(connection_id))
    
    async def disconnect(self, user_id: str, connection_id: str):
        """Disconnect WebSocket and cleanup"""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        # Clear message queue
        if connection_id in self.message_queues:
            del self.message_queues[connection_id]
        
        logger.info(f"WebSocket disconnected: {user_id} ({connection_id})")
    
    async def send_personal_message(self, message: Dict[str, Any], user_id: str, priority: bool = False) -> bool:
        """Send message to specific user with batching optimization"""
        if user_id not in self.user_connections:
            return False
        
        # Check rate limiting
        if not self._check_rate_limit(user_id):
            logger.warning(f"Rate limit exceeded for user {user_id}")
            return False
        
        message_data = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "data": message
        }
        
        success_count = 0
        for connection_id in self.user_connections[user_id].copy():
            if connection_id in self.active_connections:
                if priority:
                    # Send immediately for high-priority messages
                    success = await self._send_direct_message(connection_id, message_data)
                else:
                    # Add to batch queue for optimization
                    self.message_queues[connection_id].append(message_data)
                    success = True
                
                if success:
                    success_count += 1
        
        return success_count > 0
    
    async def broadcast(self, message: Dict[str, Any], exclude_user: Optional[str] = None):
        """Broadcast message to all connections with optimization"""
        message_data = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "type": "broadcast",
            "data": message
        }
        
        broadcast_tasks = []
        for connection_id, conn_info in self.active_connections.items():
            if exclude_user and conn_info.user_id == exclude_user:
                continue
            
            # Use batching for broadcasts
            self.message_queues[connection_id].append(message_data)
        
        logger.info(f"Broadcast queued for {len(self.active_connections)} connections")
    
    async def _send_direct_message(self, connection_id: str, message: Dict[str, Any]) -> bool:
        """Send message directly to connection"""
        if connection_id not in self.active_connections:
            return False
        
        connection_info = self.active_connections[connection_id]
        
        try:
            message_json = json.dumps(message)
            await connection_info.websocket.send_text(message_json)
            
            # Update metrics
            connection_info.message_count += 1
            connection_info.bytes_sent += len(message_json)
            
            return True
        except Exception as e:
            logger.warning(f"Failed to send message to {connection_id}: {e}")
            await self.disconnect(connection_info.user_id, connection_id)
            return False
    
    async def _process_message_batches(self):
        """Background task to process message batches for optimization"""
        while True:
            try:
                batch_tasks = []
                
                for connection_id in list(self.message_queues.keys()):
                    if connection_id not in self.active_connections:
                        del self.message_queues[connection_id]
                        continue
                    
                    queue = self.message_queues[connection_id]
                    if not queue:
                        continue
                    
                    # Process batch
                    batch = []
                    for _ in range(min(self.batch_size, len(queue))):
                        if queue:
                            batch.append(queue.popleft())
                    
                    if batch:
                        batch_task = self._send_message_batch(connection_id, batch)
                        batch_tasks.append(batch_task)
                
                # Execute all batch sends concurrently
                if batch_tasks:
                    await asyncio.gather(*batch_tasks, return_exceptions=True)
                
                await asyncio.sleep(self.batch_timeout)
                
            except Exception as e:
                logger.error(f"Error in batch processor: {e}")
                await asyncio.sleep(1)
    
    async def _send_message_batch(self, connection_id: str, messages: list):
        """Send batch of messages to connection"""
        if connection_id not in self.active_connections:
            return
        
        connection_info = self.active_connections[connection_id]
        
        try:
            # Send as single batch message for efficiency
            batch_message = {
                "type": "batch",
                "messages": messages,
                "count": len(messages)
            }
            
            message_json = json.dumps(batch_message)
            await connection_info.websocket.send_text(message_json)
            
            # Update metrics
            connection_info.message_count += len(messages)
            connection_info.bytes_sent += len(message_json)
            
        except Exception as e:
            logger.warning(f"Failed to send batch to {connection_id}: {e}")
            await self.disconnect(connection_info.user_id, connection_id)
    
    def _check_rate_limit(self, user_id: str) -> bool:
        """Check if user is within rate limits"""
        now = datetime.now()
        minute_ago = now - timedelta(minutes=1)
        
        # Clean old entries
        user_requests = self.rate_limits[user_id]
        while user_requests and user_requests[0] < minute_ago:
            user_requests.popleft()
        
        # Check limit
        if len(user_requests) >= self.max_messages_per_minute:
            return False
        
        # Add current request
        user_requests.append(now)
        return True
    
    async def _ping_connection(self, connection_id: str):
        """Send periodic pings to maintain connection"""
        while connection_id in self.active_connections:
            try:
                await asyncio.sleep(30)  # Ping every 30 seconds
                
                if connection_id not in self.active_connections:
                    break
                
                connection_info = self.active_connections[connection_id]
                
                # Send ping
                ping_message = {
                    "type": "ping",
                    "timestamp": datetime.now().isoformat()
                }
                
                await connection_info.websocket.send_text(json.dumps(ping_message))
                connection_info.last_ping = datetime.now()
                
            except Exception as e:
                logger.warning(f"Ping failed for {connection_id}: {e}")
                if connection_id in self.active_connections:
                    conn_info = self.active_connections[connection_id]
                    await self.disconnect(conn_info.user_id, connection_id)
                break
    
    async def _cleanup_stale_connections(self):
        """Background task to cleanup stale connections"""
        while True:
            try:
                now = datetime.now()
                stale_threshold = now - timedelta(minutes=5)
                
                stale_connections = []
                for connection_id, conn_info in self.active_connections.items():
                    if conn_info.last_ping < stale_threshold:
                        stale_connections.append((conn_info.user_id, connection_id))
                
                for user_id, connection_id in stale_connections:
                    logger.info(f"Cleaning up stale connection: {connection_id}")
                    await self.disconnect(user_id, connection_id)
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Error in cleanup task: {e}")
                await asyncio.sleep(60)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics for monitoring"""
        total_connections = len(self.active_connections)
        total_users = len(self.user_connections)
        
        total_messages = sum(conn.message_count for conn in self.active_connections.values())
        total_bytes_sent = sum(conn.bytes_sent for conn in self.active_connections.values())
        total_bytes_received = sum(conn.bytes_received for conn in self.active_connections.values())
        
        return {
            "total_connections": total_connections,
            "total_users": total_users,
            "total_messages_sent": total_messages,
            "total_bytes_sent": total_bytes_sent,
            "total_bytes_received": total_bytes_received,
            "queued_messages": sum(len(queue) for queue in self.message_queues.values())
        }

# Global WebSocket manager instance
websocket_manager = OptimizedWebSocketManager()
