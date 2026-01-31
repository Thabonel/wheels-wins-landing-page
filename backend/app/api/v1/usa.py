"""
Universal Site Access API Router

Provides endpoints for:
- Universal action execution (browser automation)
- Screenshot retrieval (with user authorization)
- Session management
"""

import os
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from app.api.deps import get_current_user, CurrentUser
from app.services.usa import session_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/usa", tags=["Universal Site Access"])


# Request/Response Models
class UniversalActionRequest(BaseModel):
    """Request model for universal action execution"""
    action: str = Field(
        ...,
        description="Action to perform",
        enum=["navigate", "index_page", "click", "type", "get_text", "scroll", "screenshot", "pause", "resume"]
    )
    element_index: Optional[int] = Field(
        None,
        description="Element number from index_page (required for click, type, get_text)"
    )
    text: Optional[str] = Field(
        None,
        description="Text to type (required for type action)"
    )
    url: Optional[str] = Field(
        None,
        description="URL to navigate to (required for navigate action)"
    )


class ElementInfo(BaseModel):
    """Element information from index_page"""
    index: int
    tag: str
    text: str


class UniversalActionResponse(BaseModel):
    """Response model for universal action execution"""
    status: str
    message: Optional[str] = None
    screenshot: Optional[str] = None
    url: Optional[str] = None
    element_count: Optional[int] = None
    elements: Optional[List[ElementInfo]] = None
    element: Optional[int] = None
    text: Optional[str] = None
    retry_after: Optional[int] = None


@router.post("/action", response_model=UniversalActionResponse)
async def execute_action(
    request: UniversalActionRequest,
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Execute a universal action on the current browser session.

    This endpoint allows interaction with any website element using numeric references.

    Workflow:
    1. Navigate to a URL
    2. Run index_page to see available elements: [1] Search, [2] Add to Cart
    3. Use click/type/get_text with element numbers

    Actions:
    - navigate: Go to a URL (requires 'url' parameter)
    - index_page: Index visible interactive elements on page
    - click: Click an element (requires 'element_index')
    - type: Type text into an element (requires 'element_index' and 'text')
    - get_text: Extract text from an element (requires 'element_index')
    - scroll: Scroll the page down
    - screenshot: Take a screenshot of current page
    - pause: Pause session for manual user interaction
    - resume: Resume session after manual interaction

    Returns:
        Action result with status, screenshot URL, and relevant data
    """
    user_id = str(current_user.user_id)

    logger.info(f"USA action request: {request.action} from user {user_id}")

    # Import the tool and execute
    try:
        from app.services.pam.tools.universal.universal_action import UniversalActionTool

        tool = UniversalActionTool()
        result = await tool.execute(
            user_id=user_id,
            parameters={
                "action": request.action,
                "element_index": request.element_index,
                "text": request.text,
                "url": request.url
            }
        )

        # Convert ToolResult to response dict
        if result.success:
            return result.data
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "Action failed"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"USA action error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Action execution failed: {str(e)}"
        )


@router.get("/screenshots/{filename}")
async def get_screenshot(
    filename: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Retrieve a screenshot with user authorization.

    Only the user who created the screenshot can access it.
    Screenshot filenames include the user ID for authorization.

    Args:
        filename: Screenshot filename (format: usa_{user_id}_{timestamp}.png)
        current_user: Authenticated user from JWT

    Returns:
        FileResponse with the screenshot image

    Raises:
        HTTPException 403: If user doesn't own the screenshot
        HTTPException 404: If screenshot doesn't exist or expired
    """
    # Extract user_id from filename and validate ownership
    # Format: usa_{user_id}_{timestamp}.png
    user_id_str = str(current_user.user_id)

    if not filename.startswith(f"usa_{user_id_str}_"):
        raise HTTPException(
            status_code=403,
            detail="Access denied. You can only access your own screenshots."
        )

    path = f"/tmp/{filename}"

    if not os.path.exists(path):
        raise HTTPException(
            status_code=404,
            detail="Screenshot not found or has expired."
        )

    return FileResponse(
        path,
        media_type="image/png",
        filename=filename
    )


@router.delete("/session")
async def close_session(
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Close the current user's browser session.

    Frees up resources and allows a fresh session on next use.

    Args:
        current_user: Authenticated user from JWT

    Returns:
        Status message
    """
    user_id = str(current_user.user_id)
    closed = await session_manager.close_session(user_id)

    if closed:
        return {"status": "closed", "message": "Browser session closed successfully"}
    else:
        return {"status": "no_session", "message": "No active session to close"}


@router.get("/session/status")
async def get_session_status(
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Get status of current user's browser session.

    Args:
        current_user: Authenticated user from JWT

    Returns:
        Session status information
    """
    user_id = str(current_user.user_id)

    if user_id in session_manager.sessions:
        session = session_manager.sessions[user_id]
        return {
            "status": "active",
            "paused": session.paused,
            "elements_indexed": len(session.elements),
            "created_at": session.created_at.isoformat(),
            "last_activity": session.last_activity.isoformat(),
        }
    else:
        return {
            "status": "no_session",
            "message": "No active browser session"
        }


@router.get("/health")
async def usa_health():
    """
    Health check endpoint for Universal Site Access service.

    Returns:
        Health status and session count
    """
    return {
        "status": "healthy",
        "initialized": session_manager.is_initialized(),
        "active_sessions": session_manager.get_session_count(),
        "max_sessions": session_manager.max_sessions,
    }
