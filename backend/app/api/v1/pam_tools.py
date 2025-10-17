"""
REST API endpoints for tool execution
Called by browser when OpenAI requests function call
"""

import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from app.api.deps import get_current_user
from app.models.user import User
from app.services.pam.tools.tool_registry import execute_tool
from app.services.usage_tracking_service import track_tool_call

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pam/tools", tags=["pam-tools"])


@router.post("/execute/{tool_name}")
async def execute_pam_tool(
    tool_name: str,
    arguments: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Execute a PAM tool and return result

    Called by browser when OpenAI Realtime requests function call:
    1. OpenAI tells browser: "call create_expense"
    2. Browser POSTs to this endpoint with arguments
    3. We execute the tool (reusing existing implementations)
    4. Return result to browser
    5. Browser sends result back to OpenAI

    Args:
        tool_name: Name of tool to execute
        arguments: Tool arguments from OpenAI
        current_user: Authenticated user

    Returns:
        Tool execution result
    """
    try:
        logger.info(f"🔧 Executing tool: {tool_name} for user {current_user.id}")

        # Execute tool (all existing tools work as-is!)
        result = await execute_tool(
            tool_name=tool_name,
            user_id=current_user.id,
            **arguments
        )

        # Track usage
        await track_tool_call(
            user_id=current_user.id,
            tool_name=tool_name,
            tokens=None  # OpenAI calculates automatically
        )

        logger.info(f"✅ Tool {tool_name} executed successfully")

        return result

    except Exception as e:
        logger.error(f"❌ Tool execution failed: {tool_name}, {e}")

        # Return error in format OpenAI can understand
        return {
            "success": False,
            "error": str(e),
            "tool_name": tool_name
        }


@router.get("/list")
async def list_available_tools(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    List all available PAM tools

    Useful for debugging and documentation
    """
    try:
        from app.services.pam.tools.tool_registry import get_all_tools

        tools = get_all_tools()

        return {
            "success": True,
            "total_tools": len(tools),
            "tools": [
                {
                    "name": tool["name"],
                    "description": tool["description"],
                    "category": tool.get("category", "unknown")
                }
                for tool in tools
            ]
        }

    except Exception as e:
        logger.error(f"❌ Failed to list tools: {e}")
        raise HTTPException(status_code=500, detail=str(e))
