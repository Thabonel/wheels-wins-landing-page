# app/api/actions.py
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel

router = APIRouter()

class ActionRequest(BaseModel):
    action_type: str
    parameters: Dict[str, Any] = {}
    context: Dict[str, Any] = {}

class ActionResponse(BaseModel):
    success: bool
    action_type: str
    result: Dict[str, Any]
    message: str

@router.post("/execute", response_model=ActionResponse)
async def execute_action(request: ActionRequest):
    """Execute a specific action based on the request"""
    try:
        action_type = request.action_type
        parameters = request.parameters
        
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
        
        else:
            return ActionResponse(
                success=False,
                action_type=action_type,
                result={},
                message=f"Unknown action type: {action_type}"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available")
async def get_available_actions():
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
async def get_action_status():
    """Get the status of the actions service"""
    return {
        "status": "operational",
        "message": "Actions service is ready to execute UI commands",
        "supported_actions": 4
    }
