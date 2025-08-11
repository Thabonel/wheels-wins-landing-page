"""
PAM Use-Case-Specific AI Profiles
Implements OpenAI's best practices for per-use-case model selection and configuration
"""

from enum import Enum
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from app.core.ai_models_config import (
    get_latest_model, 
    ModelPurpose,
    get_model_with_fallbacks
)

class PamUseCase(Enum):
    """PAM interaction use cases"""
    # Core use cases
    TRIP_PLANNING = "trip_planning"
    QUICK_INFO = "quick_info"
    EXPENSE_TRACKING = "expense_tracking"
    ROUTE_OPTIMIZATION = "route_optimization"
    CONVERSATION = "conversation"
    VOICE_RESPONSE = "voice_response"
    SAVINGS_ANALYSIS = "savings_analysis"
    
    # Specialized use cases
    WEATHER_CHECK = "weather_check"
    CAMPGROUND_SEARCH = "campground_search"
    EMERGENCY_HELP = "emergency_help"
    ONBOARDING = "onboarding"
    FEEDBACK = "feedback"
    
    # Default fallback
    GENERAL = "general"

@dataclass
class ResponseFormat:
    """Response format configuration"""
    type: str = "text"  # text, json, json_schema
    json_schema: Optional[Dict[str, Any]] = None
    max_length: Optional[int] = None
    
@dataclass
class ToolConfig:
    """Tool configuration for a use case"""
    enabled: bool = True
    allowed_tools: List[str] = field(default_factory=list)
    force_tool: Optional[str] = None
    tool_choice: str = "auto"  # auto, none, or specific tool

@dataclass
class UseCaseProfile:
    """Complete profile for a use case"""
    name: str
    description: str
    
    # Model configuration
    model: str
    fallback_models: List[str]
    
    # Sampling parameters
    temperature: float = 0.7
    top_p: float = 1.0
    max_tokens: int = 1000
    stop_sequences: List[str] = field(default_factory=list)
    
    # Instructions
    system_instructions: str = ""
    instruction_template: Optional[str] = None
    
    # Response configuration
    response_format: ResponseFormat = field(default_factory=ResponseFormat)
    
    # Tool configuration
    tools: ToolConfig = field(default_factory=ToolConfig)
    
    # Performance hints
    optimize_for: str = "quality"  # quality, speed, cost
    cache_ttl: int = 0  # Cache time in seconds
    
    # Voice/TTS optimization
    voice_optimized: bool = False
    voice_max_length: int = 500

class PamProfileManager:
    """Manages use-case-specific profiles for PAM"""
    
    def __init__(self):
        self.profiles = self._initialize_profiles()
        
    def _initialize_profiles(self) -> Dict[PamUseCase, UseCaseProfile]:
        """Initialize all use case profiles"""
        profiles = {}
        
        # TRIP PLANNING - Complex, needs reasoning
        profiles[PamUseCase.TRIP_PLANNING] = UseCaseProfile(
            name="Trip Planning",
            description="Complex RV trip planning with routes, stops, and recommendations",
            model=get_latest_model(ModelPurpose.COMPLEX),
            fallback_models=get_model_with_fallbacks(ModelPurpose.COMPLEX),
            temperature=0.7,
            max_tokens=2500,
            system_instructions="""You are PAM, an expert RV trip planner. Create detailed, practical trip plans with:
- Day-by-day itineraries with driving times
- RV-friendly campgrounds with amenities
- Scenic stops and attractions
- Fuel stop recommendations
- Weather considerations
- Cost estimates
Be specific with locations, distances, and practical tips.""",
            tools=ToolConfig(
                enabled=True,
                allowed_tools=["mapbox_tool", "weather_tool", "campground_search", "route_planner"]
            ),
            optimize_for="quality",
            response_format=ResponseFormat(
                type="structured_text",
                max_length=3000
            )
        )
        
        # QUICK INFO - Fast, cheap responses
        profiles[PamUseCase.QUICK_INFO] = UseCaseProfile(
            name="Quick Info",
            description="Simple questions needing fast answers",
            model=get_latest_model(ModelPurpose.QUICK),
            fallback_models=get_model_with_fallbacks(ModelPurpose.QUICK),
            temperature=0.1,
            max_tokens=150,
            system_instructions="Answer concisely in 1-2 sentences. Be direct and factual.",
            tools=ToolConfig(enabled=False),
            optimize_for="speed",
            cache_ttl=3600,  # Cache for 1 hour
            voice_optimized=True,
            voice_max_length=100
        )
        
        # EXPENSE TRACKING - Structured data extraction
        profiles[PamUseCase.EXPENSE_TRACKING] = UseCaseProfile(
            name="Expense Tracking",
            description="Extract and structure expense information",
            model=get_latest_model(ModelPurpose.QUICK),
            fallback_models=get_model_with_fallbacks(ModelPurpose.QUICK),
            temperature=0,
            max_tokens=200,
            system_instructions="Extract expense information and return structured data.",
            response_format=ResponseFormat(
                type="json_schema",
                json_schema={
                    "name": "expense_entry",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "amount": {"type": "number"},
                            "category": {"type": "string", "enum": ["Fuel", "Food", "Camping", "Maintenance", "Entertainment", "Other"]},
                            "description": {"type": "string"},
                            "date": {"type": "string", "format": "date"},
                            "location": {"type": "string"},
                            "confidence": {"type": "number", "minimum": 0, "maximum": 1}
                        },
                        "required": ["amount", "category", "date"],
                        "additionalProperties": False
                    },
                    "strict": True
                }
            ),
            tools=ToolConfig(
                enabled=True,
                allowed_tools=["expense_db_write"]
            ),
            optimize_for="accuracy"
        )
        
        # ROUTE OPTIMIZATION - Maps and calculations
        profiles[PamUseCase.ROUTE_OPTIMIZATION] = UseCaseProfile(
            name="Route Optimization",
            description="Optimize RV routes for fuel, time, or scenery",
            model=get_latest_model(ModelPurpose.FUNCTION_CALL),
            fallback_models=get_model_with_fallbacks(ModelPurpose.FUNCTION_CALL),
            temperature=0.2,
            max_tokens=1500,
            system_instructions="""Calculate optimal RV routes considering:
- Vehicle height/weight restrictions
- Fuel efficiency (assume 8-10 MPG)
- Grade percentages for mountain roads
- RV-friendly roads
- Rest stop availability
Provide specific route details with alternatives.""",
            tools=ToolConfig(
                enabled=True,
                allowed_tools=["mapbox_tool", "route_calculator", "fuel_calculator"],
                tool_choice="required"
            ),
            optimize_for="accuracy",
            response_format=ResponseFormat(
                type="structured_text",
                max_length=2000
            )
        )
        
        # CONVERSATION - Natural dialogue
        profiles[PamUseCase.CONVERSATION] = UseCaseProfile(
            name="Conversation",
            description="Natural, engaging conversation with personality",
            model=get_latest_model(ModelPurpose.EMOTIONAL),
            fallback_models=get_model_with_fallbacks(ModelPurpose.EMOTIONAL),
            temperature=0.8,
            max_tokens=800,
            system_instructions="""You are PAM, a friendly and enthusiastic RV travel companion. 
Be warm, encouraging, and genuinely interested in the user's adventures.
Share relevant tips and experiences. Use appropriate emojis occasionally.
Remember previous context and build rapport over time.""",
            tools=ToolConfig(
                enabled=True,
                allowed_tools=["memory_recall", "user_preferences"]
            ),
            optimize_for="quality",
            voice_optimized=True,
            voice_max_length=500
        )
        
        # VOICE RESPONSE - Optimized for TTS
        profiles[PamUseCase.VOICE_RESPONSE] = UseCaseProfile(
            name="Voice Response",
            description="Responses optimized for text-to-speech",
            model=get_latest_model(ModelPurpose.QUICK),
            fallback_models=get_model_with_fallbacks(ModelPurpose.QUICK),
            temperature=0.5,
            max_tokens=300,
            system_instructions="""Respond in a conversational, natural way suitable for voice.
- Use simple, clear sentences
- Avoid complex punctuation
- No URLs, emojis, or special characters
- Be concise but friendly
- Use natural speech patterns""",
            tools=ToolConfig(enabled=False),
            optimize_for="speed",
            voice_optimized=True,
            voice_max_length=250,
            stop_sequences=[".", "!", "?"]
        )
        
        # SAVINGS ANALYSIS - Financial calculations
        profiles[PamUseCase.SAVINGS_ANALYSIS] = UseCaseProfile(
            name="Savings Analysis",
            description="Analyze expenses and calculate savings",
            model=get_latest_model(ModelPurpose.ANALYSIS),
            fallback_models=get_model_with_fallbacks(ModelPurpose.ANALYSIS),
            temperature=0.1,
            max_tokens=1000,
            system_instructions="""Analyze financial data and provide insights:
- Calculate exact savings amounts
- Identify spending patterns
- Suggest specific cost-cutting measures
- Compare costs across categories
Use precise numbers and percentages.""",
            response_format=ResponseFormat(
                type="json_schema",
                json_schema={
                    "name": "savings_analysis",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "total_savings": {"type": "number"},
                            "savings_percentage": {"type": "number"},
                            "top_savings_categories": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "category": {"type": "string"},
                                        "amount_saved": {"type": "number"},
                                        "percentage": {"type": "number"}
                                    }
                                }
                            },
                            "recommendations": {
                                "type": "array",
                                "items": {"type": "string"}
                            },
                            "analysis_summary": {"type": "string"}
                        },
                        "required": ["total_savings", "savings_percentage", "analysis_summary"]
                    }
                }
            ),
            tools=ToolConfig(
                enabled=True,
                allowed_tools=["expense_db_read", "savings_calculator"]
            ),
            optimize_for="accuracy"
        )
        
        # WEATHER CHECK - Quick weather info
        profiles[PamUseCase.WEATHER_CHECK] = UseCaseProfile(
            name="Weather Check",
            description="Weather information and forecasts",
            model=get_latest_model(ModelPurpose.QUICK),
            fallback_models=get_model_with_fallbacks(ModelPurpose.QUICK),
            temperature=0.3,
            max_tokens=400,
            system_instructions="Provide clear, concise weather information with RV-relevant details (wind, storms, road conditions).",
            tools=ToolConfig(
                enabled=True,
                allowed_tools=["weather_tool"],
                force_tool="weather_tool"
            ),
            optimize_for="speed",
            cache_ttl=1800  # Cache for 30 minutes
        )
        
        # CAMPGROUND SEARCH - Location-based search
        profiles[PamUseCase.CAMPGROUND_SEARCH] = UseCaseProfile(
            name="Campground Search",
            description="Find and recommend campgrounds",
            model=get_latest_model(ModelPurpose.GENERAL),
            fallback_models=get_model_with_fallbacks(ModelPurpose.GENERAL),
            temperature=0.4,
            max_tokens=1200,
            system_instructions="""Find suitable campgrounds with:
- RV size compatibility
- Required amenities (hookups, wifi, etc.)
- User preferences (pet-friendly, quiet, etc.)
- Pricing and availability
- Reviews and ratings
Provide 3-5 options with pros/cons.""",
            tools=ToolConfig(
                enabled=True,
                allowed_tools=["campground_search", "mapbox_tool"],
                tool_choice="required"
            ),
            optimize_for="quality"
        )
        
        # EMERGENCY HELP - Critical assistance
        profiles[PamUseCase.EMERGENCY_HELP] = UseCaseProfile(
            name="Emergency Help",
            description="Emergency assistance and critical information",
            model=get_latest_model(ModelPurpose.GENERAL),
            fallback_models=get_model_with_fallbacks(ModelPurpose.GENERAL),
            temperature=0,
            max_tokens=500,
            system_instructions="""EMERGENCY RESPONSE MODE:
1. Assess the situation clearly
2. Provide immediate actionable steps
3. Locate nearest help (hospitals, repair, police)
4. Give clear, calm instructions
5. Prioritize safety above all
Do NOT provide medical advice beyond basic first aid.""",
            tools=ToolConfig(
                enabled=True,
                allowed_tools=["emergency_services", "mapbox_tool", "phone_numbers"]
            ),
            optimize_for="speed",
            voice_optimized=True
        )
        
        # GENERAL - Default fallback
        profiles[PamUseCase.GENERAL] = UseCaseProfile(
            name="General",
            description="Default profile for unclassified requests",
            model=get_latest_model(ModelPurpose.GENERAL),
            fallback_models=get_model_with_fallbacks(ModelPurpose.GENERAL),
            temperature=0.7,
            max_tokens=1000,
            system_instructions="You are PAM, a helpful RV travel assistant. Provide accurate, helpful information.",
            tools=ToolConfig(enabled=True),
            optimize_for="quality"
        )
        
        return profiles
    
    def get_profile(self, use_case: PamUseCase) -> UseCaseProfile:
        """Get profile for a specific use case"""
        return self.profiles.get(use_case, self.profiles[PamUseCase.GENERAL])
    
    def detect_use_case(self, message: str, context: Optional[Dict[str, Any]] = None) -> PamUseCase:
        """Detect use case from message content and context"""
        message_lower = message.lower()
        
        # Check for explicit use case hints in context
        if context and "use_case" in context:
            try:
                return PamUseCase(context["use_case"])
            except ValueError:
                pass
        
        # Emergency detection (highest priority)
        emergency_keywords = ["emergency", "help", "urgent", "accident", "broken down", "medical", "911"]
        if any(keyword in message_lower for keyword in emergency_keywords):
            return PamUseCase.EMERGENCY_HELP
        
        # Expense tracking
        expense_keywords = ["spent", "bought", "paid", "cost", "expense", "$", "dollar", "receipt"]
        if any(keyword in message_lower for keyword in expense_keywords):
            return PamUseCase.EXPENSE_TRACKING
        
        # Trip planning
        trip_keywords = ["plan trip", "plan a trip", "itinerary", "route to", "journey", "road trip", "plan my"]
        if any(keyword in message_lower for keyword in trip_keywords):
            return PamUseCase.TRIP_PLANNING
        
        # Route optimization
        route_keywords = ["best route", "fastest route", "shortest", "avoid traffic", "optimal route", "directions"]
        if any(keyword in message_lower for keyword in route_keywords):
            return PamUseCase.ROUTE_OPTIMIZATION
        
        # Weather check
        weather_keywords = ["weather", "forecast", "rain", "storm", "temperature", "wind", "snow"]
        if any(keyword in message_lower for keyword in weather_keywords):
            return PamUseCase.WEATHER_CHECK
        
        # Campground search
        campground_keywords = ["campground", "rv park", "camping", "campsite", "hookups", "boondocking"]
        if any(keyword in message_lower for keyword in campground_keywords):
            return PamUseCase.CAMPGROUND_SEARCH
        
        # Savings analysis
        savings_keywords = ["savings", "save money", "budget", "analyze spending", "financial", "costs analysis"]
        if any(keyword in message_lower for keyword in savings_keywords):
            return PamUseCase.SAVINGS_ANALYSIS
        
        # Quick info (short questions)
        if len(message.split()) <= 10 and "?" in message:
            quick_patterns = ["what time", "how far", "where is", "when does", "how much", "what's the"]
            if any(pattern in message_lower for pattern in quick_patterns):
                return PamUseCase.QUICK_INFO
        
        # Voice response (if context indicates voice input)
        if context and context.get("input_mode") == "voice":
            return PamUseCase.VOICE_RESPONSE
        
        # Default to conversation for anything else
        return PamUseCase.CONVERSATION
    
    def merge_with_context(self, profile: UseCaseProfile, context: Dict[str, Any]) -> UseCaseProfile:
        """Merge profile with runtime context overrides"""
        import copy
        merged = copy.deepcopy(profile)
        
        # Allow context to override certain parameters
        if "temperature" in context:
            merged.temperature = context["temperature"]
        if "max_tokens" in context:
            merged.max_tokens = context["max_tokens"]
        if "model" in context:
            merged.model = context["model"]
        
        return merged

# Singleton instance
pam_profile_manager = PamProfileManager()