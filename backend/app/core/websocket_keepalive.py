"""
WebSocket Keepalive System for Render Deployment
Prevents connection drops with regular ping/pong mechanism
"""

import asyncio
import json
import logging
from typing import Optional, Dict, Any, Set
from datetime import datetime, timedelta
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class WebSocketKeepalive:
    """
    Manages WebSocket keepalive to prevent connection drops on Render.
    Render's load balancer closes idle connections after 30 seconds.
    """
    
    def __init__(self, ping_interval: int = 25, pong_timeout: int = 10):
        """
        Initialize keepalive manager
        
        Args:
            ping_interval: Seconds between ping messages (25s for Render's 30s timeout)
            pong_timeout: Seconds to wait for pong response before considering connection dead
        """
        self.ping_interval = ping_interval
        self.pong_timeout = pong_timeout
        self.active_connections: Dict[str, Dict[str, Any]] = {}
        self.keepalive_tasks: Dict[str, asyncio.Task] = {}
        
    async def start_keepalive(self, connection_id: str, websocket: WebSocket) -> None:
        """
        Start keepalive task for a connection
        """
        # Cancel existing task if any
        if connection_id in self.keepalive_tasks:
            self.keepalive_tasks[connection_id].cancel()
        
        self.active_connections[connection_id] = {
            'websocket': websocket,
            'last_pong': datetime.utcnow(),
            'is_alive': True,
            'ping_count': 0,
            'pong_count': 0
        }
        
        # Start keepalive loop
        self.keepalive_tasks[connection_id] = asyncio.create_task(
            self._keepalive_loop(connection_id)
        )
        logger.info(f"✅ [KEEPALIVE] Started for connection {connection_id[:8]}...")
    
    async def stop_keepalive(self, connection_id: str) -> None:
        """
        Stop keepalive task for a connection
        """
        if connection_id in self.keepalive_tasks:
            self.keepalive_tasks[connection_id].cancel()
            try:
                await self.keepalive_tasks[connection_id]
            except asyncio.CancelledError:
                pass
            del self.keepalive_tasks[connection_id]
        
        if connection_id in self.active_connections:
            conn_info = self.active_connections[connection_id]
            logger.info(f"🛑 [KEEPALIVE] Stopped for {connection_id[:8]}... "
                       f"(sent {conn_info['ping_count']} pings, received {conn_info['pong_count']} pongs)")
            del self.active_connections[connection_id]
    
    async def handle_pong(self, connection_id: str) -> None:
        """
        Handle pong response from client
        """
        if connection_id in self.active_connections:
            self.active_connections[connection_id]['last_pong'] = datetime.utcnow()
            self.active_connections[connection_id]['is_alive'] = True
            self.active_connections[connection_id]['pong_count'] += 1
            logger.debug(f"💓 [KEEPALIVE] Pong #{self.active_connections[connection_id]['pong_count']} from {connection_id[:8]}...")
    
    async def _keepalive_loop(self, connection_id: str) -> None:
        """
        Main keepalive loop for a connection
        """
        try:
            logger.info(f"🔄 [KEEPALIVE] Loop started for {connection_id[:8]}...")
            
            # Initial delay to let connection stabilize
            await asyncio.sleep(5)
            
            while connection_id in self.active_connections:
                try:
                    connection = self.active_connections.get(connection_id)
                    if not connection:
                        break
                    
                    websocket = connection['websocket']
                    
                    # Check WebSocket state
                    if hasattr(websocket, 'client_state'):
                        from starlette.websockets import WebSocketState
                        if websocket.client_state != WebSocketState.CONNECTED:
                            logger.warning(f"⚠️ [KEEPALIVE] WebSocket not connected for {connection_id[:8]}...")
                            break
                    
                    # Check if connection is still alive based on pong responses
                    last_pong = connection['last_pong']
                    time_since_pong = (datetime.utcnow() - last_pong).total_seconds()
                    
                    if time_since_pong > (self.ping_interval + self.pong_timeout):
                        logger.warning(f"⚠️ [KEEPALIVE] Connection {connection_id[:8]}... appears dead "
                                     f"(no pong for {time_since_pong:.1f}s)")
                        connection['is_alive'] = False
                        
                        # Try to close the connection gracefully
                        try:
                            await websocket.close(code=1001, reason="Ping timeout")
                        except Exception as close_error:
                            logger.debug(f"Failed to close WebSocket: {close_error}")
                        break
                    
                    # Send ping
                    try:
                        connection['ping_count'] += 1
                        ping_message = {
                            "type": "ping",
                            "timestamp": datetime.utcnow().isoformat(),
                            "ping_number": connection['ping_count']
                        }
                        await websocket.send_json(ping_message)
                        logger.debug(f"🏓 [KEEPALIVE] Ping #{connection['ping_count']} sent to {connection_id[:8]}...")
                        
                    except Exception as send_error:
                        logger.error(f"❌ [KEEPALIVE] Failed to send ping to {connection_id[:8]}...: {send_error}")
                        connection['is_alive'] = False
                        break
                    
                    # Wait for next ping interval
                    await asyncio.sleep(self.ping_interval)
                    
                except asyncio.CancelledError:
                    logger.debug(f"[KEEPALIVE] Task cancelled for {connection_id[:8]}...")
                    raise
                except Exception as loop_error:
                    logger.error(f"❌ [KEEPALIVE] Loop error for {connection_id[:8]}...: {loop_error}")
                    break
                    
        except asyncio.CancelledError:
            logger.debug(f"[KEEPALIVE] Task cancelled for {connection_id[:8]}...")
        except Exception as e:
            logger.error(f"❌ [KEEPALIVE] Fatal error for {connection_id[:8]}...: {e}")
        finally:
            logger.info(f"[KEEPALIVE] Loop ended for {connection_id[:8]}...")
    
    def is_connection_alive(self, connection_id: str) -> bool:
        """
        Check if a connection is still alive
        """
        if connection_id not in self.active_connections:
            return False
        return self.active_connections[connection_id].get('is_alive', False)
    
    def get_connection_stats(self, connection_id: str) -> Optional[Dict[str, Any]]:
        """
        Get statistics for a connection
        """
        if connection_id not in self.active_connections:
            return None
        
        conn = self.active_connections[connection_id]
        return {
            'is_alive': conn['is_alive'],
            'ping_count': conn['ping_count'],
            'pong_count': conn['pong_count'],
            'last_pong': conn['last_pong'].isoformat(),
            'time_since_pong': (datetime.utcnow() - conn['last_pong']).total_seconds()
        }
    
    async def cleanup_all(self) -> None:
        """
        Stop all keepalive tasks (for shutdown)
        """
        connection_ids = list(self.keepalive_tasks.keys())
        for connection_id in connection_ids:
            await self.stop_keepalive(connection_id)
        logger.info("🧹 [KEEPALIVE] All connections cleaned up")


# Global keepalive manager instance with Render-optimized settings
# Render closes connections after 30 seconds of inactivity
websocket_keepalive = WebSocketKeepalive(
    ping_interval=20,  # Send ping every 20 seconds (well before Render's 30s timeout)
    pong_timeout=15    # Wait up to 15 seconds for pong
)


# Export for use in other modules
__all__ = ['websocket_keepalive', 'WebSocketKeepalive']