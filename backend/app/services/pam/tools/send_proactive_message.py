"""Send Proactive Message Tool for PAM

Allows PAM to send proactive alerts and suggestions to users via WebSocket.
This tool enables the proactive autonomous agent system to communicate
directly with users through real-time WebSocket messages.

Examples:
- Low fuel alerts during trips
- Budget threshold notifications
- Weather window suggestions for travel
- General proactive assistance and recommendations

Integration:
- Uses existing WebSocket ConnectionManager infrastructure
- Follows standard tool pattern for consistency
- Handles errors gracefully without system crashes
- Supports various message types and priorities
"""

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from app.services.pam.tools.base_tool import BaseTool, ToolResult, ToolCapability
from app.core.websocket_manager import manager
from app.services.pam.tools.utils import validate_uuid

logger = logging.getLogger(__name__)

class SendProactiveMessageTool(BaseTool):
    """Tool for sending proactive messages to users via WebSocket"""

    def __init__(self, user_jwt: Optional[str] = None):
        super().__init__(
            tool_name="send_proactive_message",
            description="Send proactive alerts and suggestions to users via WebSocket",
            capabilities=[ToolCapability.ACTION],  # Using ACTION capability for communication actions
            user_jwt=user_jwt
        )

    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> ToolResult:
        """Send a proactive message to the user"""
        try:
            # Validate user_id
            validate_uuid(user_id, "user_id")
        except Exception as e:
            return self._create_error_result(f"Invalid user_id: {e}")

        if not parameters:
            return self._create_error_result("No message parameters provided")

        # Extract message parameters with defaults
        message_type = parameters.get("type", "general")
        message_content = parameters.get("message", "")
        priority = parameters.get("priority", "normal")
        actions = parameters.get("actions", [])
        category = parameters.get("category", "assistance")

        # Validate required fields
        if not message_content:
            return self._create_error_result("Message content is required")

        try:
            # Format proactive message data
            proactive_data = {
                "type": "proactive_suggestion",
                "category": category,
                "message": message_content,
                "priority": priority,
                "actions": actions,
                "timestamp": datetime.now().isoformat(),
                "alert_type": message_type
            }

            # Create WebSocket message format
            websocket_message = {
                "type": "proactive_alert",
                "timestamp": datetime.now().isoformat(),
                "content": proactive_data,
                "id": f"proactive_{int(datetime.now().timestamp() * 1000)}"
            }

            # Send via WebSocket manager
            await manager.send_message_to_user(
                message=json.dumps(websocket_message),
                user_id=user_id
            )

            logger.info(f"Sent proactive {message_type} message to user {user_id}")

            return self._create_success_result(
                data={
                    "message_sent": True,
                    "user_id": user_id,
                    "message_type": message_type,
                    "category": category,
                    "priority": priority,
                    "timestamp": websocket_message["timestamp"],
                    "message_id": websocket_message["id"]
                },
                metadata={
                    "delivery_method": "websocket",
                    "proactive_type": "real_time_alert"
                }
            )

        except Exception as e:
            logger.error(f"Error sending proactive message to user {user_id}: {e}")
            return self._create_error_result(
                error_message=f"Failed to send proactive message: {str(e)}",
                metadata={
                    "user_id": user_id,
                    "attempted_message_type": message_type,
                    "error_type": type(e).__name__
                }
            )