"""
PersonalizedPamAgent - Unified AI agent with profile-aware context

This replaces all competing PAM implementations with a single,
profile-aware agent that maintains user context and provides
personalized responses based on vehicle preferences and travel history.

Based on proven patterns from Claude Projects, LangChain agents, and OpenAI Assistants.

Enhanced with Agentic Context Engineering (Dec 2025):
- 4-tier memory system (working context, session logs, durable memory, artifacts)
- Schema-driven session compaction
- Sub-agent orchestration for complex tasks
- Context compilation as runtime projection
"""

import asyncio
import logging
import os
import re
from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
from uuid import UUID

from app.services.pam.tools.load_user_profile import LoadUserProfileTool
from app.services.pam.tools.tool_registry import get_tool_registry, initialize_tool_registry
from app.services.ai.ai_orchestrator import ai_orchestrator
from app.core.travel_domain.vehicle_capability_mapper import VehicleCapabilityMapper
from app.core.travel_domain.travel_mode_detector import TravelModeDetector
from app.core.travel_domain.travel_response_personalizer import TravelResponsePersonalizer
from app.services.pam.domain_memory.router import DomainMemoryRouter
from app.services.pam.domain_memory.models import TaskType, TaskScope

# Event Manager integration for proactive monitoring
from app.services.pam.monitoring.manager import event_manager

# Context Engineering imports (optional - graceful fallback if not available)
try:
    from app.services.pam.context_engineering.integration import (
        ContextEngineeringManager,
        create_context_engineering_manager,
    )
    CONTEXT_ENGINEERING_AVAILABLE = True
except ImportError:
    CONTEXT_ENGINEERING_AVAILABLE = False

logger = logging.getLogger(__name__)


class ConversationMode(Enum):
    """Conversation modes based on user context"""
    RV_TRAVEL = "rv_travel"          # User owns overland-capable vehicle
    GENERAL_TRAVEL = "general_travel" # Standard travel recommendations
    BUDGET_FOCUSED = "budget_focused" # Money-saving priorities
    LUXURY_FOCUSED = "luxury_focused" # Comfort/convenience priorities
    ACCESSIBILITY = "accessibility"   # Special accessibility needs


@dataclass
class UserContext:
    """Complete user context for personalized responses"""
    user_id: str
    profile: Dict[str, Any]
    vehicle_info: Dict[str, Any]
    travel_preferences: Dict[str, Any]
    conversation_history: List[Dict[str, Any]]
    conversation_mode: ConversationMode

    # Dynamic properties (required fields)
    is_rv_traveler: bool
    vehicle_capabilities: Dict[str, Any]
    preferred_transport_modes: List[str]

    # Location context (optional - for weather, travel planning, etc.)
    user_location: Optional[Dict[str, Any]] = None


class PersonalizedPamAgent:
    """
    Unified PAM agent that replaces all competing implementations
    
    Key Features:
    1. Profile-aware system prompt generation
    2. Vehicle-specific travel routing
    3. Persistent conversation context
    4. Intelligent tool selection
    5. Personalized response generation
    """
    
    # Patterns that indicate complex multi-step requests requiring Domain Memory
    COMPLEX_REQUEST_PATTERNS = [
        # Trip planning with budget/multi-day
        r"plan\s+(?:a\s+)?(?:\d+[-\s]?day|\d+\s*night)?\s*(?:trip|journey|road\s*trip)",
        r"plan\s+(?:a\s+)?trip\s+(?:from|to)\s+.+\s+(?:under|within|for)\s+\$?\d+",
        r"(?:multi[-\s]?stop|route)\s+(?:trip|journey|itinerary)",
        # Budget analysis requiring research
        r"analyze\s+(?:my\s+)?(?:budget|spending|expenses?)\s+(?:for|over|in)\s+(?:the\s+)?(?:last\s+)?(?:\d+\s+)?(?:month|week|year)",
        r"create\s+(?:a\s+)?(?:monthly|weekly|yearly|annual)\s+budget\s+plan",
        r"compare\s+(?:my\s+)?(?:spending|expenses?)\s+(?:to|with|vs)",
        # Complex travel research
        r"find\s+(?:the\s+)?(?:best|cheapest|optimal)\s+(?:route|way|path)\s+(?:from|to)",
        r"optimize\s+(?:my\s+)?(?:route|trip|itinerary)",
        r"research\s+(?:rv\s+)?(?:parks?|campgrounds?|camping)\s+(?:in|near|around)",
    ]

    def __init__(
        self,
        user_jwt: str = None,
        enable_context_engineering: bool = None,
        embeddings_service=None,
    ):
        # Initialize tools with user JWT for proper database authentication
        self.user_jwt = user_jwt
        self.profile_tool = LoadUserProfileTool(user_jwt=user_jwt)
        self.vehicle_mapper = VehicleCapabilityMapper()
        self.travel_detector = TravelModeDetector()
        self.response_personalizer = TravelResponsePersonalizer()

        # Context cache for conversation persistence
        self.user_contexts: Dict[str, UserContext] = {}

        # Get tool registry (initialize if needed)
        self.tool_registry = get_tool_registry()

        # Domain Memory router for complex multi-step tasks
        self._domain_memory_router: Optional[DomainMemoryRouter] = None

        # Compile complex request patterns for efficiency
        self._complex_patterns = [re.compile(p, re.IGNORECASE) for p in self.COMPLEX_REQUEST_PATTERNS]

        # Context Engineering integration (Agentic Context Engineering)
        # Enable via env var ENABLE_CONTEXT_ENGINEERING=true or constructor param
        if enable_context_engineering is None:
            enable_context_engineering = os.getenv("ENABLE_CONTEXT_ENGINEERING", "false").lower() == "true"

        self.enable_context_engineering = enable_context_engineering and CONTEXT_ENGINEERING_AVAILABLE
        self._context_manager: Optional["ContextEngineeringManager"] = None
        self._embeddings_service = embeddings_service

        if self.enable_context_engineering:
            logger.info("Context Engineering ENABLED - using 4-tier memory system")
        else:
            reason = "not available" if not CONTEXT_ENGINEERING_AVAILABLE else "disabled"
            logger.info(f"Context Engineering {reason} - using standard context management")

        logger.info(f"PersonalizedPamAgent initialized {'with user authentication context' if user_jwt else 'with service role fallback'}")

    @property
    def domain_memory_router(self) -> DomainMemoryRouter:
        """Lazy-initialize Domain Memory router."""
        if self._domain_memory_router is None:
            self._domain_memory_router = DomainMemoryRouter()
        return self._domain_memory_router

    @property
    def context_manager(self) -> Optional["ContextEngineeringManager"]:
        """Lazy-initialize Context Engineering Manager."""
        if not self.enable_context_engineering:
            return None

        if self._context_manager is None:
            self._context_manager = create_context_engineering_manager(
                embeddings_service=self._embeddings_service,
                enable_all=True,
            )
        return self._context_manager

    def _is_complex_request(self, message: str) -> bool:
        """
        Detect if a message requires multi-step processing via Domain Memory.

        Returns True for requests like:
        - "Plan a 3-day trip from Phoenix to Seattle under $2000"
        - "Analyze my spending over the last 3 months"
        - "Find the best route with multiple stops"
        """
        for pattern in self._complex_patterns:
            if pattern.search(message):
                logger.info(f"🎯 Complex request detected: matched pattern")
                return True
        return False

    def _detect_task_type(self, message: str) -> TaskType:
        """Detect appropriate task type from message content."""
        message_lower = message.lower()

        if any(word in message_lower for word in ["trip", "route", "travel", "journey", "drive"]):
            return TaskType.TRIP_PLANNING
        elif any(word in message_lower for word in ["budget", "spending", "expense", "money", "cost"]):
            return TaskType.BUDGET_ANALYSIS
        elif any(word in message_lower for word in ["research", "find", "search", "compare"]):
            return TaskType.RESEARCH
        else:
            return TaskType.CUSTOM

    async def _handle_complex_request(
        self,
        user_id: str,
        message: str,
        additional_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Handle complex multi-step requests via Domain Memory system.

        Creates a background task and returns appropriate feedback:
        - Voice mode: Verbal message "This will take a few steps..."
        - Text mode: Informative message with task ID
        """
        try:
            # Detect task type from message
            task_type = self._detect_task_type(message)

            # Create Domain Memory task
            response = await self.domain_memory_router.create_task(
                user_id=UUID(user_id),
                request=message,
                task_type=task_type,
                scope=TaskScope.USER,
                priority=7,  # Higher priority for user-initiated tasks
            )

            if not response.success:
                logger.error(f"Failed to create Domain Memory task: {response.errors}")
                return {
                    "content": "I understand this is a complex request, but I'm having trouble setting it up. Let me try to help you directly instead.",
                    "success": False,
                    "error": "Failed to create background task"
                }

            # Check if user is in voice mode
            is_voice_mode = additional_context.get("input_mode") == "voice"

            # Build response based on input mode
            if is_voice_mode:
                # Verbal feedback for voice users
                content = "This will take a few steps. I'll work on it and you can check back anytime."
            else:
                # More detailed feedback for text users
                task_data = response.data or {}
                work_items = task_data.get("work_items_count", 0)
                goal = task_data.get("goal", message[:50] + "...")
                content = (
                    f"I've started working on your request: {goal}\n\n"
                    f"This involves {work_items} steps. I'll process them in the background. "
                    f"You can ask me about the progress anytime by saying 'check my task status'."
                )

            logger.info(
                f"📋 Created Domain Memory task {response.task_id} for user {user_id} "
                f"(voice_mode={is_voice_mode}, type={task_type.value})"
            )

            return {
                "content": content,
                "success": True,
                "domain_memory_task": {
                    "task_id": str(response.task_id),
                    "task_type": task_type.value,
                    "is_background": True,
                    "work_items_count": response.data.get("work_items_count", 0) if response.data else 0
                }
            }

        except Exception as e:
            logger.error(f"Error handling complex request: {e}", exc_info=True)
            # Fall back to normal processing message
            return {
                "content": "I'll help you with that. Let me work through the details.",
                "success": False,
                "error": str(e)
            }

    async def process_message(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        additional_context: Optional[Dict[str, Any]] = None,
        user_location: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Main entry point - processes user message with full personalization

        If Context Engineering is enabled:
        - Creates/retrieves session from database
        - Tracks events in the session
        - Uses 4-tier context compilation
        - Routes complex requests through sub-agent orchestration
        """
        try:
            # Convert user_id to UUID for context engineering
            user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

            # Context Engineering: Get or create session
            ce_session_id = None
            if self.context_manager:
                ce_session_id = await self.context_manager.get_or_create_session(user_uuid)

                # Track user message event
                await self.context_manager.track_user_message(
                    session_id=ce_session_id,
                    user_id=user_uuid,
                    message=message,
                )

                # Check if this should be handled by sub-agent orchestration
                if await self.context_manager.should_use_sub_agents(message):
                    logger.info(f"Routing to sub-agent orchestration for user {user_id}")
                    tools = self.tool_registry.get_openai_functions()

                    result = await self.context_manager.process_with_sub_agents(
                        user_id=user_uuid,
                        session_id=ce_session_id,
                        message=message,
                        available_tools=tools,
                        tool_executor=self._execute_tool_for_orchestrator,
                    )

                    # Track assistant response
                    await self.context_manager.track_assistant_message(
                        session_id=ce_session_id,
                        user_id=user_uuid,
                        message=result.response,
                        metadata={
                            "orchestration_mode": "sub_agent",
                            "steps_executed": result.steps_executed,
                            "tools_used": result.tools_used,
                        },
                    )

                    return {
                        "content": result.response,
                        "success": True,
                        "orchestration_mode": "sub_agent",
                        "steps_executed": result.steps_executed,
                        "tools_used": result.tools_used,
                    }

            # Step 0: Check for complex multi-step requests that need Domain Memory
            # (Only if Context Engineering sub-agents didn't handle it)
            if self._is_complex_request(message) and not self.enable_context_engineering:
                return await self._handle_complex_request(
                    user_id=user_id,
                    message=message,
                    additional_context=additional_context or {}
                )

            # Step 1: Load or get cached user context
            user_context = await self._get_user_context(user_id, user_location)

            # Step 2: Detect intent and travel mode
            travel_mode = await self.travel_detector.detect_mode(
                message, user_context.vehicle_info
            )

            # Step 3: Generate personalized system prompt
            # If Context Engineering enabled, use compiled context; otherwise use standard prompt
            if self.context_manager and ce_session_id:
                compiled_context = await self.context_manager.compile_context(
                    user_id=user_uuid,
                    session_id=ce_session_id,
                    current_task=message,
                    agent_scope="default",
                )
                # Merge compiled context with vehicle-specific prompt
                system_prompt = self._build_personalized_prompt_with_compiled_context(
                    user_context, travel_mode, compiled_context
                )
            else:
                system_prompt = self._build_personalized_prompt(user_context, travel_mode)

            # Step 4: Process with AI using personalized context
            ai_response = await self._process_with_ai(
                message, system_prompt, user_context, travel_mode
            )

            # Step 5: Personalize response with vehicle context
            personalized_response = await self.response_personalizer.enhance_response(
                ai_response, user_context, travel_mode
            )

            # Step 6: Update conversation history
            await self._update_conversation_history(
                user_context, message, personalized_response
            )

            # Context Engineering: Track assistant response
            if self.context_manager and ce_session_id:
                await self.context_manager.track_assistant_message(
                    session_id=ce_session_id,
                    user_id=user_uuid,
                    message=personalized_response.get("content", ""),
                    metadata={
                        "travel_mode": travel_mode.value if hasattr(travel_mode, "value") else str(travel_mode),
                        "conversation_mode": user_context.conversation_mode.value,
                    },
                )

            logger.info(f"Processed message for {user_id}: {travel_mode.value if hasattr(travel_mode, 'value') else travel_mode} mode")
            return personalized_response

        except Exception as e:
            logger.error(f"Error processing message for {user_id}: {e}")
            return {
                "content": "I'm having trouble processing your request. Please try again.",
                "error": str(e),
                "success": False
            }

    async def _execute_tool_for_orchestrator(
        self,
        tool_name: str,
        parameters: Dict[str, Any],
        user_id: UUID,
    ) -> Dict[str, Any]:
        """Execute a tool for the sub-agent orchestrator."""
        result = await self.tool_registry.execute_tool(
            tool_name=tool_name,
            user_id=str(user_id),
            parameters=parameters,
            context={"user_jwt": self.user_jwt} if self.user_jwt else {},
        )
        return {
            "success": result.success,
            "result": result.result,
            "error": result.error,
        }
    
    async def _get_user_context(self, user_id: str, user_location: Optional[Dict[str, Any]] = None) -> UserContext:
        """Load or retrieve cached user context"""

        # Check cache first
        if user_id in self.user_contexts:
            context = self.user_contexts[user_id]
            # Update location even if using cached context
            if user_location:
                context.user_location = user_location
            return context
        
        # Load fresh profile
        profile_result = await self.profile_tool.execute(user_id)
        
        if not profile_result.get("success") or not profile_result.get("result", {}).get("profile_exists"):
            # Create minimal context for users without profiles
            return UserContext(
                user_id=user_id,
                profile={},
                vehicle_info={},
                travel_preferences={},
                conversation_history=[],
                conversation_mode=ConversationMode.GENERAL_TRAVEL,
                user_location=user_location,
                is_rv_traveler=False,
                vehicle_capabilities={},
                preferred_transport_modes=["flight", "train", "bus"]
            )
        
        profile_data = profile_result["result"]
        vehicle_info = profile_data.get("vehicle_info", {})
        
        # Analyze vehicle capabilities
        vehicle_capabilities = await self.vehicle_mapper.analyze_capabilities(vehicle_info)
        
        # Determine conversation mode
        conversation_mode = self._determine_conversation_mode(profile_data, vehicle_capabilities)
        
        # Build complete context
        user_context = UserContext(
            user_id=user_id,
            profile=profile_data,
            vehicle_info=vehicle_info,
            travel_preferences=profile_data.get("travel_preferences", {}),
            conversation_history=[],
            conversation_mode=conversation_mode,
            user_location=user_location,
            is_rv_traveler=vehicle_capabilities.get("is_rv_capable", False),
            vehicle_capabilities=vehicle_capabilities,
            preferred_transport_modes=self._get_preferred_transport_modes(vehicle_capabilities)
        )
        
        # Cache context
        self.user_contexts[user_id] = user_context
        
        logger.info(f"🔄 Loaded user context for {user_id}: {conversation_mode.value} mode")
        return user_context
    
    def _build_personalized_prompt(
        self, 
        user_context: UserContext, 
        travel_mode: str
    ) -> str:
        """
        BUILD PERSONALIZED SYSTEM PROMPT - This is the KEY fix!
        
        This is where profile context gets injected into AI instructions
        """
        
        base_prompt = """You are PAM, a highly personalized travel and lifestyle assistant."""
        
        # CRITICAL: Inject user-specific context
        if user_context.vehicle_info:
            vehicle_type = user_context.vehicle_info.get("type", "unknown")
            vehicle_name = user_context.vehicle_info.get("make_model_year", "")
            
            if user_context.is_rv_traveler:
                base_prompt += f"""
                
IMPORTANT USER CONTEXT:
- User owns a {vehicle_type.upper()} ({vehicle_name})
- This is an overland-capable vehicle suitable for RV/expedition travel
- User prefers overland routes over flights when their vehicle can handle the journey
- For trip planning, prioritize ferry connections and overland routes
- NEVER suggest flights for routes their vehicle can reasonably handle
- Always mention their vehicle when relevant to travel planning
                """
            else:
                base_prompt += f"""
                
IMPORTANT USER CONTEXT:
- User owns a {vehicle_type} ({vehicle_name})
- Consider their vehicle capabilities when making travel recommendations
                """
        
        # Add travel preferences
        if user_context.travel_preferences:
            prefs = user_context.travel_preferences
            base_prompt += f"""

USER TRAVEL PREFERENCES:
- Style: {prefs.get('style', 'balanced')}
- Camping: {', '.join(prefs.get('camp_types', []))}
- Daily drive limit: {prefs.get('drive_limit_per_day', 'flexible')}
            """

        # Add location context
        if user_context.user_location:
            location = user_context.user_location
            city = location.get("city", "unknown location")
            region = location.get("region", "")
            country = location.get("country", "")

            location_str = f"{city}"
            if region:
                location_str += f", {region}"
            if country:
                location_str += f", {country}"

            base_prompt += f"""

USER LOCATION CONTEXT:
- Current location: {location_str}
- Coordinates: {location.get('lat', 'N/A')}, {location.get('lng', 'N/A')}
- Timezone: {location.get('timezone', 'unknown')}
- Location source: {location.get('source', 'unknown')}

IMPORTANT: When user asks about weather or location-dependent information, use this location automatically.
Do NOT ask "where are you?" if location is already known.
            """

        # Add conversation mode context
        if user_context.conversation_mode == ConversationMode.RV_TRAVEL:
            base_prompt += """
            
RV TRAVEL MODE:
- Focus on overland routes and ferry connections
- Suggest RV parks, camping grounds, and vehicle-friendly accommodations
- Consider fuel stops, vehicle maintenance, and road conditions
- Provide detailed logistics for overland vehicle travel
            """
        
        # Add specific instructions for travel mode
        if travel_mode == "OVERLAND_VEHICLE":
            base_prompt += """
            
OVERLAND VEHICLE TRAVEL DETECTED:
- This user has specifically requested travel planning with their overland vehicle
- Prioritize ferry connections over flights (e.g., for Tasmania travel)
- Provide vehicle-specific routing and accommodation advice
- Include fuel planning, road conditions, and vehicle restrictions
            """
        
        base_prompt += """

Respond naturally and conversationally, always considering the user's specific context and vehicle capabilities.
        """

        return base_prompt

    def _build_personalized_prompt_with_compiled_context(
        self,
        user_context: UserContext,
        travel_mode: str,
        compiled_context: "CompiledContext",
    ) -> str:
        """
        Build personalized system prompt enhanced with compiled context from 4-tier memory.

        This merges:
        1. Base PAM personality and instructions (from compiled_context.system_prompt)
        2. Vehicle-specific context (from user_context)
        3. Session summaries (from compiled_context.session_summary)
        4. Retrieved memories (from compiled_context.retrieved_memories)
        5. User profile summary (from compiled_context.user_profile_summary)
        """
        parts = []

        # Start with compiled system prompt (includes agent instructions)
        if compiled_context.system_prompt:
            parts.append(compiled_context.system_prompt)

        if compiled_context.agent_instructions:
            parts.append(f"\n{compiled_context.agent_instructions}")

        # Add user profile summary from compiled context
        if compiled_context.user_profile_summary:
            parts.append(f"\n\nUSER PROFILE:\n{compiled_context.user_profile_summary}")

        # Add vehicle-specific context (critical for PAM)
        if user_context.vehicle_info:
            vehicle_type = user_context.vehicle_info.get("type", "unknown")
            vehicle_name = user_context.vehicle_info.get("make_model_year", "")

            if user_context.is_rv_traveler:
                parts.append(f"""

VEHICLE CONTEXT:
- User owns a {vehicle_type.upper()} ({vehicle_name})
- This is an overland-capable vehicle suitable for RV/expedition travel
- Prioritize overland routes and ferry connections over flights
- Consider fuel stops, vehicle maintenance, and road conditions""")
            elif vehicle_name:
                parts.append(f"""

VEHICLE CONTEXT:
- User owns a {vehicle_type} ({vehicle_name})
- Consider their vehicle capabilities when making recommendations""")

        # Add location context
        if user_context.user_location:
            location = user_context.user_location
            city = location.get("city", "unknown")
            region = location.get("region", "")
            country = location.get("country", "")
            location_str = ", ".join(filter(None, [city, region, country]))

            parts.append(f"""

CURRENT LOCATION:
- Location: {location_str}
- Coordinates: {location.get('lat', 'N/A')}, {location.get('lng', 'N/A')}
Use this location automatically for weather and location-dependent queries.""")

        # Add session summary from compiled context (Tier 2)
        if compiled_context.session_summary:
            summary = compiled_context.session_summary
            session_parts = []

            if summary.get("goals"):
                session_parts.append(f"Goals: {', '.join(summary['goals'])}")
            if summary.get("open_threads"):
                session_parts.append(f"Open threads: {', '.join(summary['open_threads'])}")
            if summary.get("topics_discussed"):
                session_parts.append(f"Recent topics: {', '.join(summary['topics_discussed'])}")

            if session_parts:
                parts.append(f"\n\nSESSION CONTEXT:\n" + "\n".join(session_parts))

        # Add retrieved memories (Tier 3)
        if compiled_context.retrieved_memories:
            memory_lines = []
            for mem in compiled_context.retrieved_memories[:5]:  # Top 5 most relevant
                memory_lines.append(f"- {mem.get('content', '')}")

            if memory_lines:
                parts.append(f"\n\nRELEVANT MEMORIES:\n" + "\n".join(memory_lines))

        # Add artifact handles (Tier 4) - just summaries, not full content
        if compiled_context.artifact_handles:
            artifact_lines = []
            for artifact in compiled_context.artifact_handles[:3]:
                artifact_lines.append(
                    f"- [{artifact.get('handle', 'unknown')}]: {artifact.get('summary', 'No summary')}"
                )

            if artifact_lines:
                parts.append(f"\n\nAVAILABLE ARTIFACTS:\n" + "\n".join(artifact_lines))

        # Add travel mode context
        if travel_mode == "OVERLAND_VEHICLE":
            parts.append("""

OVERLAND VEHICLE MODE:
- User is planning travel with their overland vehicle
- Prioritize ferry connections, RV parks, and vehicle-friendly routes
- Include fuel planning and road condition information""")

        parts.append("""

Respond naturally and conversationally, leveraging all context available.""")

        return "\n".join(parts)

    def _determine_conversation_mode(
        self, 
        profile_data: Dict[str, Any], 
        vehicle_capabilities: Dict[str, Any]
    ) -> ConversationMode:
        """Determine conversation mode based on user profile"""
        
        if vehicle_capabilities.get("is_rv_capable", False):
            return ConversationMode.RV_TRAVEL
        
        if profile_data.get("budget_preferences", {}).get("priority") == "budget":
            return ConversationMode.BUDGET_FOCUSED
        
        if profile_data.get("accessibility_needs"):
            return ConversationMode.ACCESSIBILITY
        
        return ConversationMode.GENERAL_TRAVEL
    
    def _get_preferred_transport_modes(
        self, 
        vehicle_capabilities: Dict[str, Any]
    ) -> List[str]:
        """Get preferred transport modes based on vehicle capabilities"""
        
        modes = []
        
        if vehicle_capabilities.get("is_rv_capable", False):
            modes.extend(["overland", "ferry"])
        
        # Always include other options as alternatives
        modes.extend(["flight", "train", "bus"])
        
        return modes
    
    async def _process_with_ai(
        self,
        message: str,
        system_prompt: str,
        user_context: UserContext,
        travel_mode: str
    ) -> Dict[str, Any]:
        """Process message with AI using personalized system prompt"""

        # Prepare messages for AI
        messages = [
            {"role": "system", "content": system_prompt}
        ]

        # Add location context if available (helps tools access location)
        if user_context.user_location:
            location = user_context.user_location
            city = location.get("city", "unknown")
            lat = location.get("lat", "N/A")
            lng = location.get("lng", "N/A")
            location_str = f"{city}" if city != "unknown" else f"({lat}, {lng})"
            messages.append({
                "role": "system",
                "content": f"User's current location: {location_str} (lat: {lat}, lng: {lng})"
            })

        # Add recent conversation history
        for hist_msg in user_context.conversation_history[-5:]:  # Last 5 messages
            messages.append({
                "role": "user" if hist_msg["sender"] == "user" else "assistant",
                "content": hist_msg["content"]
            })

        # Add current message
        messages.append({"role": "user", "content": message})

        # CRITICAL FIX: Get tools from tool registry (this was missing!)
        # This enables PAM to access weather_advisor, manage_finances, and all other registered tools
        tools = self.tool_registry.get_openai_functions()
        logger.info(f"🔧 Loaded {len(tools)} tools from registry for Claude: {[t['name'] for t in tools]}")

        # Process with AI orchestrator (now WITH tools!)
        # We disable auto_handle_tools to manually execute them with user context
        # TIERED AI ROUTING: Pass user_id for subscription-based provider selection
        # Free/trial users -> DeepSeek V3 (cost-effective)
        # Paid/admin users -> Claude Sonnet 4.5 (premium quality)
        response = await ai_orchestrator.complete(
            messages=messages,
            temperature=0.7,
            max_tokens=2048,
            functions=tools,  # Pass tools to AI orchestrator
            user_id=user_context.user_id,  # Enable tier-based AI routing
            auto_handle_tools=False  # CRITICAL: We handle tools manually to pass user context
        )

        # Tool Execution Loop
        # If the AI wants to call tools, we execute them and feed results back
        max_tool_iterations = 5
        iteration = 0
        
        while response.function_calls and iteration < max_tool_iterations:
            iteration += 1
            logger.info(f"🔄 Tool execution loop iteration {iteration}: {len(response.function_calls)} calls")
            
            # Add assistant's tool call message to history
            messages.append({
                "role": "assistant",
                "content": response.content,
                "function_calls": response.function_calls
            })
            
            # Execute each tool
            tool_results = []
            for tool_call in response.function_calls:
                tool_name = tool_call.get("name")
                tool_args = tool_call.get("arguments", {})
                tool_id = tool_call.get("id")
                
                logger.info(f"🛠️ Executing tool: {tool_name}")

                # Build context with ALL required fields for tools
                # CRITICAL: Include user_location so weather/location tools work automatically
                tool_context = {"user_location": user_context.user_location}
                if self.user_jwt:
                    tool_context["user_jwt"] = self.user_jwt

                # Execute with user context including location
                result = await self.tool_registry.execute_tool(
                    tool_name=tool_name,
                    user_id=user_context.user_id,
                    parameters=tool_args,
                    context=tool_context
                )
                
                # Format result for AI
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_id,
                    "content": str(result.result) if result.success else f"Error: {result.error}",
                    "is_error": not result.success,
                    "name": tool_name # Helpful for some providers
                })
            
            # Add tool results to history
            # Note: Format depends on provider, but orchestrator handles normalization
            messages.append({
                "role": "user",
                "content": tool_results
            })
            
            # Get next response from AI (with tier-based routing)
            response = await ai_orchestrator.complete(
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
                functions=tools,
                user_id=user_context.user_id,  # Enable tier-based AI routing
                auto_handle_tools=False
            )

        return {
            "content": response.content,
            "success": True,
            "travel_mode": travel_mode,
            "conversation_mode": user_context.conversation_mode.value
        }
    
    async def _update_conversation_history(
        self,
        user_context: UserContext,
        user_message: str,
        assistant_response: Dict[str, Any]
    ):
        """Update conversation history for context persistence"""
        
        user_context.conversation_history.extend([
            {
                "sender": "user",
                "content": user_message,
                "timestamp": datetime.utcnow().isoformat()
            },
            {
                "sender": "assistant", 
                "content": assistant_response.get("content", ""),
                "timestamp": datetime.utcnow().isoformat()
            }
        ])
        
        # Keep only recent history
        if len(user_context.conversation_history) > 20:
            user_context.conversation_history = user_context.conversation_history[-20:]
    
    async def get_health_status(self) -> Dict[str, Any]:
        """Health check for the unified agent"""
        status = {
            "status": "healthy",
            "agent": "PersonalizedPamAgent",
            "cached_users": len(self.user_contexts),
            "timestamp": datetime.utcnow().isoformat(),
            "context_engineering": {
                "enabled": self.enable_context_engineering,
                "available": CONTEXT_ENGINEERING_AVAILABLE,
            },
        }

        # Add context engineering stats if enabled
        if self.context_manager:
            status["context_engineering"]["active_sessions"] = len(
                self.context_manager._active_sessions
            )

        return status

    async def end_session(self, user_id: str) -> bool:
        """
        End the current session for a user.

        This triggers session compaction if context engineering is enabled.
        """
        if self.context_manager:
            user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id
            user_id_str = str(user_uuid)

            if user_id_str in self.context_manager._active_sessions:
                session_id = self.context_manager._active_sessions[user_id_str]
                return await self.context_manager.end_session(session_id, force_compact=True)

        return True


# Global instance (service role fallback)
personalized_pam_agent = PersonalizedPamAgent()


def create_user_context_pam_agent(
    user_jwt: str,
    enable_context_engineering: bool = None,
    embeddings_service=None,
) -> PersonalizedPamAgent:
    """Create a PersonalizedPamAgent with user authentication context"""
    return PersonalizedPamAgent(
        user_jwt=user_jwt,
        enable_context_engineering=enable_context_engineering,
        embeddings_service=embeddings_service,
    )