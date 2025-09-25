"""
PAM 2.0 Multimodal Service
Phase 2.3: Image processing and multimodal AI capabilities

Features:
- Image analysis and interpretation
- RV/vehicle damage assessment
- Campsite and scenery analysis
- Document processing (receipts, permits, maps)
- Combined text+image conversation
- Visual troubleshooting assistance
"""

import logging
import base64
import io
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from dataclasses import dataclass
from PIL import Image
import mimetypes

from ..core.types import ConversationContext
from ..core.exceptions import PAMBaseException

logger = logging.getLogger(__name__)

@dataclass
class ImageAnalysisResult:
    """Result of image analysis with AI interpretation"""
    description: str
    analysis_type: str
    confidence_score: float
    key_objects: List[str]
    recommendations: List[str]
    safety_concerns: List[str]
    metadata: Dict[str, Any]

@dataclass
class MultimodalRequest:
    """Combined text and image request"""
    text_message: str
    image_data: Optional[bytes]
    image_format: Optional[str]
    analysis_type: str  # 'general', 'damage_assessment', 'campsite', 'document', 'troubleshooting'
    user_id: str
    conversation_context: Optional[ConversationContext] = None

class MultimodalService:
    """
    Advanced multimodal service for PAM 2.0
    Handles image processing, analysis, and multimodal AI interactions
    """

    def __init__(self):
        self.supported_formats = ['jpeg', 'jpg', 'png', 'webp', 'gif']
        self.max_image_size = 10 * 1024 * 1024  # 10MB
        self.analysis_templates = self._load_analysis_templates()

    async def process_multimodal_request(
        self,
        request: MultimodalRequest
    ) -> Tuple[str, ImageAnalysisResult]:
        """
        Process a combined text and image request

        Args:
            request: MultimodalRequest containing text, image, and context

        Returns:
            Tuple of (AI response text, Image analysis result)
        """
        try:
            logger.info(f"🖼️ Processing multimodal request: {request.analysis_type}")

            # Validate image if provided
            if request.image_data:
                validation_result = await self._validate_image(request.image_data, request.image_format)
                if not validation_result['valid']:
                    raise PAMBaseException(f"Image validation failed: {validation_result['error']}")

            # Analyze image using Gemini Vision
            image_analysis = await self._analyze_image_with_gemini(
                image_data=request.image_data,
                text_prompt=request.text_message,
                analysis_type=request.analysis_type,
                conversation_context=request.conversation_context
            )

            # Generate multimodal AI response
            ai_response = await self._generate_multimodal_response(
                request=request,
                image_analysis=image_analysis
            )

            logger.info(f"✅ Multimodal processing completed successfully")
            return ai_response, image_analysis

        except Exception as e:
            logger.error(f"❌ Multimodal processing failed: {e}")
            raise PAMBaseException(f"Multimodal processing error: {str(e)}")

    async def _analyze_image_with_gemini(
        self,
        image_data: Optional[bytes],
        text_prompt: str,
        analysis_type: str,
        conversation_context: Optional[ConversationContext] = None
    ) -> ImageAnalysisResult:
        """Analyze image using Gemini Vision API"""

        if not image_data:
            # Text-only analysis
            return ImageAnalysisResult(
                description="Text-only request, no image provided",
                analysis_type=analysis_type,
                confidence_score=1.0,
                key_objects=[],
                recommendations=[],
                safety_concerns=[],
                metadata={"text_only": True}
            )

        try:
            # Import Gemini Vision
            import google.generativeai as genai
            from app.core.infra_config import get_infra_settings

            infra_settings = get_infra_settings()

            # Configure Gemini (reuse existing configuration)
            if hasattr(infra_settings, 'GEMINI_API_KEY') and infra_settings.GEMINI_API_KEY:
                if hasattr(infra_settings.GEMINI_API_KEY, 'get_secret_value'):
                    api_key = infra_settings.GEMINI_API_KEY.get_secret_value()
                else:
                    api_key = str(infra_settings.GEMINI_API_KEY)

                genai.configure(api_key=api_key)
            else:
                raise PAMBaseException("Gemini API key not configured for multimodal processing")

            # Initialize Gemini Vision model
            model = genai.GenerativeModel('gemini-1.5-flash')

            # Prepare image for Gemini
            image_parts = [
                {
                    "mime_type": f"image/jpeg",  # Gemini expects JPEG
                    "data": base64.b64encode(image_data).decode()
                }
            ]

            # Build specialized prompt based on analysis type
            vision_prompt = self._build_vision_prompt(text_prompt, analysis_type, conversation_context)

            # Call Gemini Vision API
            logger.info(f"🔍 Calling Gemini Vision API for {analysis_type} analysis...")
            response = model.generate_content([vision_prompt] + image_parts)

            if response and response.text:
                # Parse Gemini response into structured result
                analysis_result = self._parse_vision_response(
                    response.text,
                    analysis_type,
                    image_data
                )

                logger.info(f"✅ Gemini Vision analysis completed: {len(response.text)} chars")
                return analysis_result
            else:
                logger.warning("⚠️ Gemini Vision returned empty response")
                return self._create_fallback_analysis(analysis_type)

        except Exception as e:
            logger.error(f"❌ Gemini Vision analysis failed: {e}")
            return self._create_fallback_analysis(analysis_type, str(e))

    def _build_vision_prompt(
        self,
        user_message: str,
        analysis_type: str,
        conversation_context: Optional[ConversationContext] = None
    ) -> str:
        """Build specialized vision analysis prompt"""

        base_context = """You are PAM (Personal Assistant Manager), an expert AI assistant for RV travelers and digital nomads. You're analyzing an image to provide helpful insights and recommendations."""

        # Analysis-specific prompts
        analysis_prompts = {
            'damage_assessment': """
🔍 **RV/VEHICLE DAMAGE ASSESSMENT**
Analyze this image for any visible damage to an RV, vehicle, or equipment. Look for:
- Exterior damage (dents, scratches, cracks, rust)
- Interior damage (water damage, wear, broken fixtures)
- Mechanical issues visible in the photo
- Safety concerns that need immediate attention

Provide:
1. Description of any damage found
2. Severity assessment (minor/moderate/severe)
3. Immediate safety concerns
4. Recommended actions
5. Estimated urgency for repairs
""",

            'campsite': """
🏕️ **CAMPSITE ANALYSIS**
Analyze this campsite or location image. Assess:
- Site conditions (level, drainage, accessibility)
- Amenities visible (hookups, picnic tables, fire rings)
- Surroundings (privacy, scenery, safety)
- Suitability for different RV sizes
- Weather considerations

Provide:
1. Overall site quality rating
2. Best RV positioning recommendations
3. Potential challenges or concerns
4. Scenic highlights
5. Weather/seasonal considerations
""",

            'document': """
📄 **DOCUMENT PROCESSING**
Analyze this document image (receipt, permit, map, manual, etc.). Extract:
- Document type and purpose
- Key information and details
- Relevant dates, amounts, or specifications
- Important terms or requirements
- Any action items or deadlines

Provide:
1. Document summary
2. Key extracted information
3. Important dates or deadlines
4. Recommended actions
5. Filing/organization suggestions
""",

            'troubleshooting': """
🔧 **VISUAL TROUBLESHOOTING**
Analyze this image to help diagnose a technical issue. Look for:
- Equipment setup and configuration
- Visible problems or error states
- Connection issues or missing components
- Wear patterns or damage
- Environmental factors affecting performance

Provide:
1. Problem identification
2. Likely causes
3. Step-by-step troubleshooting steps
4. Safety warnings if applicable
5. When to seek professional help
""",

            'general': """
🖼️ **GENERAL IMAGE ANALYSIS**
Analyze this image in the context of RV travel and digital nomadic lifestyle. Describe:
- What you see in the image
- Relevance to RV travel or nomadic living
- Any interesting or notable features
- Potential opportunities or concerns
- Helpful recommendations or insights

Provide detailed, contextual observations that would be valuable to an RV traveler.
"""
        }

        # Get analysis-specific prompt
        analysis_prompt = analysis_prompts.get(analysis_type, analysis_prompts['general'])

        # Add conversation context if available
        context_section = ""
        if conversation_context and conversation_context.messages:
            recent_messages = conversation_context.messages[-3:]  # Last 3 messages
            context_section = "\n💬 **RECENT CONVERSATION CONTEXT**:\n"
            for msg in recent_messages:
                role = "User" if msg.type.value == 'user' else "PAM"
                content = msg.content[:100] + "..." if len(msg.content) > 100 else msg.content
                context_section += f"{role}: {content}\n"

        # Construct final prompt
        vision_prompt = f"""{base_context}

{analysis_prompt}

{context_section}

**User's message**: {user_message}

**Instructions**:
- Be specific and detailed in your analysis
- Focus on actionable insights
- Consider safety implications
- Provide practical recommendations
- Use clear, structured formatting
- Reference specific details you observe in the image

**Your analysis**:"""

        return vision_prompt

    def _parse_vision_response(
        self,
        response_text: str,
        analysis_type: str,
        image_data: bytes
    ) -> ImageAnalysisResult:
        """Parse Gemini Vision response into structured analysis result"""

        # Extract key information from response (basic parsing)
        # In production, this could be more sophisticated with regex or NLP

        # Determine confidence based on response detail
        confidence_score = min(1.0, len(response_text) / 500)  # Rough heuristic

        # Extract potential objects/items mentioned
        key_objects = []
        common_rv_objects = ['rv', 'motorhome', 'trailer', 'campsite', 'generator', 'solar', 'awning', 'tire', 'wheel', 'engine', 'battery', 'propane', 'water']
        for obj in common_rv_objects:
            if obj in response_text.lower():
                key_objects.append(obj)

        # Extract recommendations (sentences with action words)
        recommendations = []
        action_indicators = ['recommend', 'suggest', 'should', 'consider', 'try', 'check', 'inspect', 'replace', 'repair']
        sentences = response_text.split('.')
        for sentence in sentences:
            if any(action in sentence.lower() for action in action_indicators):
                recommendations.append(sentence.strip())

        # Extract safety concerns
        safety_concerns = []
        safety_keywords = ['danger', 'unsafe', 'hazard', 'risk', 'warning', 'caution', 'emergency', 'immediate']
        for sentence in sentences:
            if any(keyword in sentence.lower() for keyword in safety_keywords):
                safety_concerns.append(sentence.strip())

        return ImageAnalysisResult(
            description=response_text,
            analysis_type=analysis_type,
            confidence_score=confidence_score,
            key_objects=key_objects,
            recommendations=recommendations[:5],  # Top 5 recommendations
            safety_concerns=safety_concerns[:3],  # Top 3 safety concerns
            metadata={
                "response_length": len(response_text),
                "image_size": len(image_data),
                "analysis_timestamp": datetime.now().isoformat(),
                "gemini_vision": True
            }
        )

    async def _generate_multimodal_response(
        self,
        request: MultimodalRequest,
        image_analysis: ImageAnalysisResult
    ) -> str:
        """Generate AI response combining text and image analysis"""

        # Import prompt service for consistent response generation
        from .prompt_service import PromptEngineeringService

        prompt_service = PromptEngineeringService()

        # Build enhanced message combining text and image insights
        if request.image_data:
            enhanced_message = f"""
{request.text_message}

🖼️ **IMAGE ANALYSIS RESULTS**:
{image_analysis.description}

**Key Observations**: {', '.join(image_analysis.key_objects)}
"""
        else:
            enhanced_message = request.text_message

        # Use existing prompt engineering for consistent response quality
        enhanced_prompt = prompt_service.build_enhanced_prompt(
            user_message=enhanced_message,
            conversation_context=request.conversation_context,
            user_profile=None,
            location_context=None,
            intent_analysis=await self._classify_multimodal_intent(request)
        )

        # Add multimodal-specific instructions
        multimodal_instructions = f"""

🎯 **MULTIMODAL RESPONSE INSTRUCTIONS**:
- This is a combined text and image analysis request
- Reference specific visual details from the image analysis
- Provide actionable recommendations based on both text and visual context
- If safety concerns were identified, prioritize them in your response
- Structure your response to address both the text question and image insights

**Image Analysis Type**: {request.analysis_type}
**Safety Concerns**: {'; '.join(image_analysis.safety_concerns) if image_analysis.safety_concerns else 'None identified'}
"""

        final_prompt = enhanced_prompt + multimodal_instructions

        # Generate response using existing Gemini integration
        try:
            import google.generativeai as genai
            from app.core.infra_config import get_infra_settings

            infra_settings = get_infra_settings()

            if hasattr(infra_settings, 'GEMINI_API_KEY'):
                if hasattr(infra_settings.GEMINI_API_KEY, 'get_secret_value'):
                    api_key = infra_settings.GEMINI_API_KEY.get_secret_value()
                else:
                    api_key = str(infra_settings.GEMINI_API_KEY)

                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-1.5-flash')

                response = model.generate_content(final_prompt)

                if response and response.text:
                    return response.text

        except Exception as e:
            logger.warning(f"⚠️ Multimodal response generation failed: {e}")

        # Fallback response
        return self._generate_fallback_multimodal_response(request, image_analysis)

    async def _validate_image(
        self,
        image_data: bytes,
        image_format: Optional[str]
    ) -> Dict[str, Any]:
        """Validate image data and format"""

        try:
            # Check file size
            if len(image_data) > self.max_image_size:
                return {
                    "valid": False,
                    "error": f"Image too large: {len(image_data)} bytes (max: {self.max_image_size})"
                }

            # Try to open with PIL to validate format
            image = Image.open(io.BytesIO(image_data))
            detected_format = image.format.lower() if image.format else None

            # Check if format is supported
            if detected_format not in [fmt.upper() for fmt in self.supported_formats]:
                return {
                    "valid": False,
                    "error": f"Unsupported format: {detected_format} (supported: {self.supported_formats})"
                }

            return {
                "valid": True,
                "format": detected_format,
                "size": image.size,
                "mode": image.mode,
                "data_size": len(image_data)
            }

        except Exception as e:
            return {
                "valid": False,
                "error": f"Image validation failed: {str(e)}"
            }

    async def _classify_multimodal_intent(self, request: MultimodalRequest) -> str:
        """Classify intent for multimodal requests"""

        # Analysis type provides strong intent signal
        intent_mapping = {
            'damage_assessment': 'assessment',
            'campsite': 'evaluation',
            'document': 'information_extraction',
            'troubleshooting': 'support',
            'general': 'analysis'
        }

        return intent_mapping.get(request.analysis_type, 'general')

    def _create_fallback_analysis(self, analysis_type: str, error_message: str = "") -> ImageAnalysisResult:
        """Create fallback analysis when vision processing fails"""

        return ImageAnalysisResult(
            description=f"Unable to analyze image due to technical limitations. {error_message}".strip(),
            analysis_type=analysis_type,
            confidence_score=0.0,
            key_objects=[],
            recommendations=["Please try uploading a different image", "Ensure image is clear and well-lit"],
            safety_concerns=[],
            metadata={
                "fallback": True,
                "error": error_message,
                "timestamp": datetime.now().isoformat()
            }
        )

    def _generate_fallback_multimodal_response(
        self,
        request: MultimodalRequest,
        image_analysis: ImageAnalysisResult
    ) -> str:
        """Generate fallback response when AI generation fails"""

        base_response = f"I received your message about {request.analysis_type}"

        if request.image_data and image_analysis.description:
            base_response += f" and analyzed your image. {image_analysis.description}"
        elif request.image_data:
            base_response += " and attempted to analyze your image, but encountered some technical difficulties."
        else:
            base_response += "."

        if image_analysis.safety_concerns:
            base_response += f" ⚠️ Important safety note: {image_analysis.safety_concerns[0]}"

        if image_analysis.recommendations:
            base_response += f" I recommend: {image_analysis.recommendations[0]}"

        return base_response

    def _load_analysis_templates(self) -> Dict[str, Dict[str, Any]]:
        """Load analysis templates for different image types"""

        return {
            'damage_assessment': {
                'focus_areas': ['structural_damage', 'mechanical_issues', 'safety_hazards'],
                'severity_levels': ['minor', 'moderate', 'severe', 'critical'],
                'output_format': 'detailed_report'
            },
            'campsite': {
                'focus_areas': ['site_conditions', 'amenities', 'accessibility', 'scenery'],
                'rating_criteria': ['level_ground', 'hookups', 'privacy', 'safety'],
                'output_format': 'site_review'
            },
            'document': {
                'focus_areas': ['text_extraction', 'key_information', 'action_items'],
                'document_types': ['receipt', 'permit', 'manual', 'map', 'form'],
                'output_format': 'structured_data'
            },
            'troubleshooting': {
                'focus_areas': ['problem_identification', 'root_cause', 'solutions'],
                'equipment_types': ['electrical', 'mechanical', 'plumbing', 'electronics'],
                'output_format': 'diagnostic_guide'
            },
            'general': {
                'focus_areas': ['scene_description', 'relevant_details', 'recommendations'],
                'context_types': ['travel', 'lifestyle', 'equipment', 'location'],
                'output_format': 'conversational'
            }
        }

    def get_supported_analysis_types(self) -> List[str]:
        """Get list of supported image analysis types"""
        return list(self.analysis_templates.keys())

    def get_image_processing_capabilities(self) -> Dict[str, Any]:
        """Get current image processing capabilities"""
        return {
            "supported_formats": self.supported_formats,
            "max_image_size_mb": self.max_image_size / (1024 * 1024),
            "analysis_types": list(self.analysis_templates.keys()),
            "vision_model": "gemini-1.5-flash",
            "features": [
                "damage_assessment",
                "campsite_evaluation",
                "document_processing",
                "visual_troubleshooting",
                "general_scene_analysis"
            ]
        }

# Service factory function
def create_multimodal_service() -> MultimodalService:
    """Factory function to create MultimodalService instance"""
    return MultimodalService()