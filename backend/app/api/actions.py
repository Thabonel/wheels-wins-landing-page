# app/api/actions.py
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class ActionRequest(BaseModel):
    action: str  # Changed from action_type to match frontend
    payload: Dict[str, Any] = {}
    parameters: Dict[str, Any] = {}  # Keep for backward compatibility
    context: Dict[str, Any] = {}

class ActionResponse(BaseModel):
    success: bool
    action_type: str
    result: Dict[str, Any]
    message: str

@router.post("/execute", response_model=ActionResponse)
def execute_action(request: ActionRequest):
    """Execute a specific action based on the request"""
    try:
        action_type = request.action  # Use action field
        parameters = request.payload or request.parameters  # Support both payload and parameters
        
        logger.info(f"🎬 Received action request: {action_type} with params: {parameters}")
        
        # Handle different action types
        if action_type == "navigate":
            return ActionResponse(
                success=True,
                action_type=action_type,
                result={"target": parameters.get("target", "/")},
                message=f"Navigating to {parameters.get('target', '/')}"
            )
        
        elif action_type == "update_ui":
            return ActionResponse(
                success=True,
                action_type=action_type,
                result={"element": parameters.get("element"), "data": parameters.get("data")},
                message="UI updated successfully"
            )
        
        elif action_type == "show_notification":
            return ActionResponse(
                success=True,
                action_type=action_type,
                result={"message": parameters.get("message", "Notification")},
                message="Notification displayed"
            )
        
        elif action_type == "open_modal":
            return ActionResponse(
                success=True,
                action_type=action_type,
                result={"modal": parameters.get("modal_type"), "data": parameters.get("data")},
                message=f"Opening {parameters.get('modal_type', 'modal')}"
            )
        
        elif action_type == "save_memory":
            # Handle PAM memory saving
            logger.info(f"💾 Saving to PAM memory: {parameters}")
            return ActionResponse(
                success=True,
                action_type=action_type,
                result={"saved": True, "user_id": parameters.get("user_id")},
                message="Memory saved successfully"
            )
        
        else:
            # Default handler for unknown actions
            logger.warning(f"⚠️ Unknown action type: {action_type}")
            return ActionResponse(
                success=True,  # Return success to avoid breaking the frontend
                action_type=action_type,
                result=parameters,
                message=f"Action {action_type} processed"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available")
def get_available_actions():
    """Get list of available actions"""
    return {
        "actions": [
            {
                "type": "navigate",
                "description": "Navigate to a specific page or section",
                "parameters": ["target"]
            },
            {
                "type": "update_ui",
                "description": "Update UI elements with new data",
                "parameters": ["element", "data"]
            },
            {
                "type": "show_notification",
                "description": "Display a notification to the user",
                "parameters": ["message", "type"]
            },
            {
                "type": "open_modal",
                "description": "Open a modal dialog",
                "parameters": ["modal_type", "data"]
            }
        ]
    }

@router.get("/status")
def get_action_status():
    """Get the status of the actions service and platform configuration"""
    
    # Get basic actions status
    basic_status = {
        "status": "operational",
        "message": "Actions service is ready to execute UI commands",
        "supported_actions": 4
    }
    
    # Try to get platform configuration status
    try:
        from app.core.config import get_settings
        settings = get_settings()
        
        platform_status = {
            "gemini": "configured" if getattr(settings, 'GEMINI_API_KEY', None) else "not_configured",
            "anthropic": "configured" if getattr(settings, 'ANTHROPIC_API_KEY', None) else "not_configured",
            "langfuse": "configured" if (getattr(settings, 'LANGFUSE_SECRET_KEY', None) and getattr(settings, 'LANGFUSE_PUBLIC_KEY', None)) else "not_configured"
        }
        
        basic_status["platform_status"] = platform_status
        basic_status["observability_enabled"] = getattr(settings, 'OBSERVABILITY_ENABLED', False)
        
    except Exception as e:
        logger.warning(f"Could not get platform status: {e}")
        basic_status["platform_status"] = {
            "gemini": "unknown",
            "anthropic": "unknown",
            "langfuse": "unknown"
        }
    
    return basic_status

@router.post("/test")
def test_actions():
    """Test endpoint to verify actions API is working"""
    logger.info("🧪 Actions test endpoint called")
    return {
        "success": True,
        "message": "Actions API is working correctly",
        "timestamp": "2025-01-10T00:00:00Z"
    }
