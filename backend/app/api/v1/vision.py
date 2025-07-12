"""
Vision API endpoints for PAM
Provides screenshot and image analysis capabilities
"""

import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse

from app.core.auth import get_current_user_optional
from app.services.pam.orchestrator import get_orchestrator

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/analyze-screenshot")
async def analyze_screenshot(
    image: UploadFile = File(..., description="Screenshot or image file to analyze"),
    analysis_type: str = Form(default="general", description="Type of analysis: general, ui, text, error, dashboard"),
    context: Optional[str] = Form(default=None, description="Optional JSON context for analysis"),
    user_id: Optional[str] = Depends(get_current_user_optional)
):
    """
    Analyze a screenshot or image and provide PAM insights
    
    Analysis types:
    - general: Basic image analysis and content detection
    - ui: User interface analysis and navigation guidance
    - text: Text extraction and content analysis (OCR)
    - error: Error screen analysis and troubleshooting suggestions
    - dashboard: Dashboard and data visualization analysis
    """
    
    try:
        # Validate file type
        if not image.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image (PNG, JPEG, GIF, etc.)"
            )
        
        # Read image data
        image_data = await image.read()
        
        # Validate image size (10MB max)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(image_data) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"Image too large. Maximum size is {max_size / (1024*1024):.1f}MB"
            )
        
        # Parse context if provided
        analysis_context = None
        if context:
            try:
                import json
                analysis_context = json.loads(context)
            except json.JSONDecodeError:
                logger.warning("Invalid JSON context provided, ignoring")
        
        # Get orchestrator and analyze screenshot
        orchestrator = await get_orchestrator()
        
        # Use user_id from auth or default for anonymous users
        effective_user_id = user_id or "anonymous"
        
        logger.info(f"🖼️ Screenshot analysis request from user {effective_user_id}")
        
        # Perform analysis
        result = await orchestrator.analyze_screenshot(
            user_id=effective_user_id,
            image_data=image_data,
            analysis_type=analysis_type,
            context=analysis_context
        )
        
        if result.get("success"):
            logger.info(f"✅ Screenshot analysis successful for user {effective_user_id}")
            return JSONResponse(
                content={
                    "success": True,
                    "analysis": result,
                    "message": "Screenshot analyzed successfully"
                },
                status_code=200
            )
        else:
            logger.error(f"❌ Screenshot analysis failed for user {effective_user_id}: {result.get('error')}")
            return JSONResponse(
                content={
                    "success": False,
                    "error": result.get("error", "Analysis failed"),
                    "message": "Failed to analyze screenshot"
                },
                status_code=500
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Screenshot analysis endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during screenshot analysis: {str(e)}"
        )

@router.post("/analyze-multiple")
async def analyze_multiple_screenshots(
    images: list[UploadFile] = File(..., description="Multiple screenshot files to analyze as a sequence"),
    analysis_type: str = Form(default="sequence", description="Type of analysis: sequence, workflow, comparison"),
    context: Optional[str] = Form(default=None, description="Optional JSON context for analysis"),
    user_id: Optional[str] = Depends(get_current_user_optional)
):
    """
    Analyze multiple screenshots to understand workflows or sequences
    
    Analysis types:
    - sequence: Analyze screenshots as a sequence of steps
    - workflow: Identify workflow patterns across images
    - comparison: Compare screenshots to identify differences
    """
    
    try:
        # Validate number of images
        if len(images) > 10:
            raise HTTPException(
                status_code=400,
                detail="Maximum 10 images allowed per request"
            )
        
        if len(images) < 2:
            raise HTTPException(
                status_code=400,
                detail="At least 2 images required for multi-image analysis"
            )
        
        # Process all images
        image_data_list = []
        total_size = 0
        
        for i, image in enumerate(images):
            # Validate file type
            if not image.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=400,
                    detail=f"File {i+1} must be an image (PNG, JPEG, GIF, etc.)"
                )
            
            # Read image data
            data = await image.read()
            total_size += len(data)
            
            # Validate total size (50MB max for all images combined)
            max_total_size = 50 * 1024 * 1024  # 50MB
            if total_size > max_total_size:
                raise HTTPException(
                    status_code=400,
                    detail=f"Total images size too large. Maximum is {max_total_size / (1024*1024):.1f}MB"
                )
            
            image_data_list.append(data)
        
        # Parse context if provided
        analysis_context = None
        if context:
            try:
                import json
                analysis_context = json.loads(context)
            except json.JSONDecodeError:
                logger.warning("Invalid JSON context provided, ignoring")
        
        # Get screenshot analyzer directly for multi-image analysis
        try:
            from app.services.vision.screenshot_analyzer import screenshot_analyzer
        except ImportError:
            raise HTTPException(
                status_code=503,
                detail="Screenshot analysis service not available"
            )
        
        # Use user_id from auth or default for anonymous users
        effective_user_id = user_id or "anonymous"
        
        logger.info(f"🖼️ Multi-screenshot analysis request from user {effective_user_id}: {len(images)} images")
        
        # Perform multi-image analysis
        result = await screenshot_analyzer.analyze_multiple_screenshots(
            screenshots=image_data_list,
            analysis_type=analysis_type,
            context=analysis_context
        )
        
        if not result.get("error"):
            logger.info(f"✅ Multi-screenshot analysis successful for user {effective_user_id}")
            return JSONResponse(
                content={
                    "success": True,
                    "analysis": result,
                    "message": f"Successfully analyzed {len(images)} screenshots"
                },
                status_code=200
            )
        else:
            logger.error(f"❌ Multi-screenshot analysis failed for user {effective_user_id}: {result.get('error')}")
            return JSONResponse(
                content={
                    "success": False,
                    "error": result.get("error", "Analysis failed"),
                    "message": "Failed to analyze screenshots"
                },
                status_code=500
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Multi-screenshot analysis endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during multi-screenshot analysis: {str(e)}"
        )

@router.get("/capabilities")
async def get_vision_capabilities():
    """
    Get information about available vision analysis capabilities
    """
    
    try:
        from app.services.vision.screenshot_analyzer import screenshot_analyzer
        available = True
        pil_available = getattr(screenshot_analyzer, 'PIL_AVAILABLE', False)
    except ImportError:
        available = False
        pil_available = False
    
    return {
        "service_available": available,
        "pil_available": pil_available,
        "supported_formats": [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"] if available else [],
        "max_image_size_mb": 10,
        "max_total_size_mb": 50,
        "max_images_per_request": 10,
        "analysis_types": {
            "single_image": [
                "general",
                "ui", 
                "text",
                "error",
                "dashboard"
            ],
            "multiple_images": [
                "sequence",
                "workflow", 
                "comparison"
            ]
        },
        "features": [
            "Image dimension analysis",
            "Content type detection",
            "UI element recognition",
            "Error screen analysis",
            "Dashboard pattern detection",
            "PAM-specific insights",
            "Multi-image workflow analysis"
        ]
    }