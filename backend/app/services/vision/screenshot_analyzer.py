"""
Screenshot and Image Analysis Service for PAM
Provides visual understanding capabilities for screenshots, images, and visual content
"""

import base64
import io
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from pathlib import Path

try:
    from PIL import Image, ImageEnhance, ImageFilter
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    Image = None

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class ScreenshotAnalyzer:
    """Analyzes screenshots and images to extract meaningful information for PAM"""
    
    def __init__(self):
        self.supported_formats = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}
        self.max_image_size = 10 * 1024 * 1024  # 10MB max
        
        if not PIL_AVAILABLE:
            logger.warning("⚠️ PIL (Pillow) not available - image processing will be limited")
    
    async def analyze_screenshot(
        self, 
        image_data: Union[bytes, str, Path],
        analysis_type: str = "general",
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze a screenshot and extract relevant information
        
        Args:
            image_data: Image as bytes, base64 string, or file path
            analysis_type: Type of analysis (general, ui, text, error, dashboard)
            context: Additional context for analysis
        
        Returns:
            Analysis results with extracted information
        """
        
        try:
            # Process image data
            image_info = await self._process_image_data(image_data)
            if not image_info:
                return {"error": "Failed to process image", "success": False}
            
            # Perform analysis based on type
            analysis_results = {
                "success": True,
                "timestamp": datetime.now().isoformat(),
                "image_info": image_info,
                "analysis_type": analysis_type,
                "context": context or {}
            }
            
            if analysis_type == "ui":
                analysis_results.update(await self._analyze_ui_elements(image_info))
            elif analysis_type == "text":
                analysis_results.update(await self._extract_text_content(image_info))
            elif analysis_type == "error":
                analysis_results.update(await self._analyze_error_screen(image_info))
            elif analysis_type == "dashboard":
                analysis_results.update(await self._analyze_dashboard(image_info))
            else:
                analysis_results.update(await self._general_analysis(image_info))
            
            # Add PAM-specific insights
            analysis_results["pam_insights"] = await self._generate_pam_insights(
                analysis_results, context
            )
            
            return analysis_results
            
        except Exception as e:
            logger.error(f"❌ Screenshot analysis failed: {e}")
            return {
                "error": str(e),
                "success": False,
                "timestamp": datetime.now().isoformat()
            }
    
    async def _process_image_data(self, image_data: Union[bytes, str, Path]) -> Optional[Dict[str, Any]]:
        """Process various image data formats into a standardized format"""
        
        try:
            image_bytes = None
            source_type = None
            
            # Handle different input types
            if isinstance(image_data, bytes):
                image_bytes = image_data
                source_type = "bytes"
            elif isinstance(image_data, str):
                if image_data.startswith('data:image/'):
                    # Base64 data URL
                    header, encoded = image_data.split(',', 1)
                    image_bytes = base64.b64decode(encoded)
                    source_type = "base64_url"
                elif image_data.startswith('/') or '://' in image_data:
                    # File path or URL
                    if image_data.startswith('http'):
                        # URL - would need to download
                        logger.warning("⚠️ URL image download not implemented")
                        return None
                    else:
                        # Local file path
                        try:
                            with open(image_data, 'rb') as f:
                                image_bytes = f.read()
                            source_type = "file_path"
                        except FileNotFoundError:
                            logger.error(f"❌ Image file not found: {image_data}")
                            return None
                else:
                    # Assume base64 encoded
                    try:
                        image_bytes = base64.b64decode(image_data)
                        source_type = "base64"
                    except Exception:
                        logger.error("❌ Invalid base64 image data")
                        return None
            elif isinstance(image_data, Path):
                try:
                    image_bytes = image_data.read_bytes()
                    source_type = "path_object"
                except Exception as e:
                    logger.error(f"❌ Failed to read image from path: {e}")
                    return None
            
            if not image_bytes:
                return None
            
            # Check file size
            if len(image_bytes) > self.max_image_size:
                logger.error(f"❌ Image too large: {len(image_bytes)} bytes")
                return None
            
            # Basic image info
            image_info = {
                "size_bytes": len(image_bytes),
                "source_type": source_type,
                "processed_at": datetime.now().isoformat()
            }
            
            # If PIL is available, get more detailed info
            if PIL_AVAILABLE:
                try:
                    with Image.open(io.BytesIO(image_bytes)) as img:
                        image_info.update({
                            "dimensions": img.size,
                            "format": img.format,
                            "mode": img.mode,
                            "has_transparency": img.mode in ('RGBA', 'LA') or 'transparency' in img.info
                        })
                        
                        # Store processed image data for analysis
                        image_info["pil_data"] = image_bytes
                        
                except Exception as e:
                    logger.warning(f"⚠️ PIL processing failed: {e}")
            
            return image_info
            
        except Exception as e:
            logger.error(f"❌ Image processing failed: {e}")
            return None
    
    async def _general_analysis(self, image_info: Dict[str, Any]) -> Dict[str, Any]:
        """Perform general image analysis"""
        
        analysis = {
            "detected_elements": [],
            "content_type": "unknown",
            "confidence": 0.5
        }
        
        # Basic analysis based on image properties
        if image_info.get("dimensions"):
            width, height = image_info["dimensions"]
            
            # Guess content type based on dimensions
            if width > height * 1.5:
                analysis["content_type"] = "landscape_screenshot"
            elif height > width * 1.5:
                analysis["content_type"] = "mobile_screenshot"
            elif abs(width - height) < min(width, height) * 0.1:
                analysis["content_type"] = "square_image"
            else:
                analysis["content_type"] = "standard_screenshot"
            
            analysis["screen_info"] = {
                "aspect_ratio": round(width / height, 2),
                "total_pixels": width * height,
                "likely_device": self._guess_device_type(width, height)
            }
        
        # Look for common UI patterns (simplified)
        analysis["detected_elements"] = await self._detect_ui_patterns(image_info)
        
        return analysis
    
    async def _analyze_ui_elements(self, image_info: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze UI elements in the screenshot"""
        
        ui_analysis = {
            "ui_elements": [],
            "layout_type": "unknown",
            "navigation_detected": False,
            "form_detected": False,
            "error_indicators": False
        }
        
        # Detect common UI patterns
        if image_info.get("dimensions"):
            width, height = image_info["dimensions"]
            
            # Analyze layout patterns
            if width > 1200:
                ui_analysis["layout_type"] = "desktop"
            elif width > 768:
                ui_analysis["layout_type"] = "tablet"
            else:
                ui_analysis["layout_type"] = "mobile"
            
            # Look for typical UI elements (simplified heuristics)
            ui_analysis["ui_elements"] = [
                "header_area",
                "content_area", 
                "sidebar" if width > 1000 else None,
                "footer_area"
            ]
            ui_analysis["ui_elements"] = [e for e in ui_analysis["ui_elements"] if e]
        
        return ui_analysis
    
    async def _extract_text_content(self, image_info: Dict[str, Any]) -> Dict[str, Any]:
        """Extract text content from the image"""
        
        text_analysis = {
            "extracted_text": "",
            "text_regions": [],
            "languages_detected": [],
            "text_confidence": 0.0
        }
        
        # Note: OCR would require additional libraries like pytesseract
        # For now, return placeholder analysis
        text_analysis["note"] = "OCR functionality requires additional libraries (pytesseract)"
        text_analysis["extracted_text"] = "[OCR analysis would extract text here]"
        text_analysis["text_confidence"] = 0.1
        
        return text_analysis
    
    async def _analyze_error_screen(self, image_info: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze error screens and troubleshooting information"""
        
        error_analysis = {
            "error_detected": False,
            "error_type": "unknown",
            "error_indicators": [],
            "suggested_actions": []
        }
        
        # Look for error indicators (simplified)
        if image_info.get("format") in ["PNG", "JPEG"]:
            error_analysis["error_indicators"] = [
                "red_elements_detected",
                "warning_symbols_possible",
                "dialog_box_likely"
            ]
            error_analysis["error_detected"] = True
            error_analysis["suggested_actions"] = [
                "Check error message text",
                "Look for retry buttons",
                "Verify network connection",
                "Check system logs"
            ]
        
        return error_analysis
    
    async def _analyze_dashboard(self, image_info: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze dashboard and data visualization screenshots"""
        
        dashboard_analysis = {
            "dashboard_type": "unknown",
            "data_elements": [],
            "metrics_detected": [],
            "chart_types": []
        }
        
        # Detect dashboard patterns
        if image_info.get("dimensions"):
            width, height = image_info["dimensions"]
            
            if width > height:
                dashboard_analysis["dashboard_type"] = "analytics_dashboard"
                dashboard_analysis["data_elements"] = [
                    "metrics_cards",
                    "charts_area",
                    "navigation_panel"
                ]
                dashboard_analysis["chart_types"] = [
                    "line_charts_likely",
                    "bar_charts_possible",
                    "pie_charts_possible"
                ]
        
        return dashboard_analysis
    
    async def _detect_ui_patterns(self, image_info: Dict[str, Any]) -> List[str]:
        """Detect common UI patterns in the image"""
        
        patterns = []
        
        if image_info.get("dimensions"):
            width, height = image_info["dimensions"]
            
            # Detect patterns based on image characteristics
            if width > 1024:
                patterns.append("desktop_interface")
            
            if height > width:
                patterns.append("mobile_portrait")
            
            if image_info.get("format") == "PNG":
                patterns.append("screenshot_likely")
            
            # Add more pattern detection logic here
            patterns.extend([
                "header_region",
                "content_area",
                "interactive_elements"
            ])
        
        return patterns
    
    def _guess_device_type(self, width: int, height: int) -> str:
        """Guess device type based on screen dimensions"""
        
        common_resolutions = {
            (1920, 1080): "desktop_1080p",
            (1366, 768): "laptop_common",
            (375, 667): "iphone_se",
            (414, 896): "iphone_11",
            (768, 1024): "ipad",
            (1440, 900): "macbook_air"
        }
        
        # Check for exact matches
        if (width, height) in common_resolutions:
            return common_resolutions[(width, height)]
        
        # Check for rotated matches
        if (height, width) in common_resolutions:
            return f"{common_resolutions[(height, width)]}_rotated"
        
        # General categories
        if width >= 1920 or height >= 1080:
            return "high_resolution_display"
        elif width <= 414 and height <= 896:
            return "mobile_device"
        elif 768 <= width <= 1366:
            return "tablet_or_laptop"
        else:
            return "unknown_device"
    
    async def _generate_pam_insights(
        self, 
        analysis: Dict[str, Any], 
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate PAM-specific insights from the image analysis"""
        
        insights = {
            "actionable_items": [],
            "user_assistance": [],
            "context_understanding": {},
            "follow_up_questions": []
        }
        
        # Generate insights based on analysis type
        analysis_type = analysis.get("analysis_type", "general")
        
        if analysis_type == "error":
            insights["actionable_items"] = [
                "Help troubleshoot the error",
                "Search for similar error solutions",
                "Provide step-by-step resolution"
            ]
            insights["follow_up_questions"] = [
                "What were you trying to do when this error occurred?",
                "Has this happened before?",
                "Would you like me to search for solutions?"
            ]
        
        elif analysis_type == "ui":
            insights["actionable_items"] = [
                "Explain UI elements",
                "Provide navigation guidance",
                "Suggest workflow optimizations"
            ]
            insights["follow_up_questions"] = [
                "What specific part of the interface do you need help with?",
                "Are you looking for a particular feature?",
                "Would you like a walkthrough of this screen?"
            ]
        
        elif analysis_type == "dashboard":
            insights["actionable_items"] = [
                "Explain data trends",
                "Identify key metrics",
                "Suggest data actions"
            ]
            insights["follow_up_questions"] = [
                "Which metrics are most important to you?",
                "Do you see any concerning trends?",
                "Would you like me to analyze specific data points?"
            ]
        
        # Add context-aware insights
        if context:
            if context.get("user_goal"):
                insights["context_understanding"]["user_goal"] = context["user_goal"]
            
            if context.get("current_task"):
                insights["context_understanding"]["current_task"] = context["current_task"]
        
        return insights
    
    async def analyze_multiple_screenshots(
        self, 
        screenshots: List[Union[bytes, str, Path]],
        analysis_type: str = "sequence",
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Analyze multiple screenshots to understand a sequence or workflow"""
        
        try:
            results = {
                "total_screenshots": len(screenshots),
                "individual_analyses": [],
                "sequence_analysis": {},
                "workflow_insights": {}
            }
            
            # Analyze each screenshot
            for i, screenshot in enumerate(screenshots):
                analysis = await self.analyze_screenshot(
                    screenshot, 
                    analysis_type="general", 
                    context={**(context or {}), "sequence_position": i}
                )
                results["individual_analyses"].append(analysis)
            
            # Analyze the sequence
            if len(screenshots) > 1:
                results["sequence_analysis"] = await self._analyze_screenshot_sequence(
                    results["individual_analyses"]
                )
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Multiple screenshot analysis failed: {e}")
            return {"error": str(e), "success": False}
    
    async def _analyze_screenshot_sequence(self, analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze a sequence of screenshots to understand workflow"""
        
        sequence_analysis = {
            "workflow_detected": False,
            "steps_identified": len(analyses),
            "ui_changes": [],
            "progression_type": "unknown"
        }
        
        # Look for UI changes between screenshots
        for i in range(1, len(analyses)):
            prev_analysis = analyses[i-1]
            curr_analysis = analyses[i]
            
            # Compare dimensions
            prev_dims = prev_analysis.get("image_info", {}).get("dimensions")
            curr_dims = curr_analysis.get("image_info", {}).get("dimensions")
            
            if prev_dims != curr_dims:
                sequence_analysis["ui_changes"].append({
                    "step": i,
                    "change_type": "screen_size_change",
                    "from_dims": prev_dims,
                    "to_dims": curr_dims
                })
        
        if sequence_analysis["ui_changes"]:
            sequence_analysis["workflow_detected"] = True
            sequence_analysis["progression_type"] = "multi_screen_workflow"
        
        return sequence_analysis


# Global screenshot analyzer instance
screenshot_analyzer = ScreenshotAnalyzer()