"""
REST API endpoints for tool execution
Called by browser when OpenAI requests function call
"""

import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from app.api.deps import get_current_user, CurrentUser
from app.services.pam.tools.tool_registry import get_tool_registry
from app.services.usage_tracking_service import track_tool_call

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pam/tools", tags=["pam-tools"])


@router.post("/execute/{tool_name}")
async def execute_pam_tool(
    tool_name: str,
    arguments: Dict[str, Any] = Body(...),
    current_user: CurrentUser = Depends(get_current_user)
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
        logger.info(f"🔧 Executing tool: {tool_name} for user {current_user.user_id}")

        # Get tool registry and execute tool
        registry = get_tool_registry()
        execution_result = await registry.execute_tool(
            tool_name=tool_name,
            user_id=current_user.user_id,
            parameters=arguments
        )

        # Track usage
        await track_tool_call(
            user_id=current_user.user_id,
            tool_name=tool_name,
            tokens=None  # OpenAI calculates automatically
        )

        logger.info(f"✅ Tool {tool_name} executed successfully")

        # Return the tool result
        if execution_result.success:
            return execution_result.result
        else:
            return {
                "success": False,
                "error": execution_result.error,
                "tool_name": tool_name
            }

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
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    List all available PAM tools

    Useful for debugging and documentation
    """
    try:
        registry = get_tool_registry()

        # Get OpenAI function definitions (which includes all registered tools)
        functions = registry.get_openai_functions()

        return {
            "success": True,
            "total_tools": len(functions),
            "tools": [
                {
                    "name": func["name"],
                    "description": func["description"],
                    "parameters": func.get("parameters", {})
                }
                for func in functions
            ]
        }

    except Exception as e:
        logger.error(f"❌ Failed to list tools: {e}")
        raise HTTPException(status_code=500, detail=str(e))
