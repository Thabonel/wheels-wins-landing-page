"""
PAM 2.0 Tool Bridge
Connects existing PAM v1 tools (40+) to PAM 2.0 Gemini function calling
"""

import logging
from typing import Dict, List, Any, Optional
import asyncio
import inspect
from datetime import datetime

# Import existing PAM tools safely - individual imports to avoid dependency issues
# Let's start with just a minimal set for the demo
track_expense = None
get_user_context = None
log_expense = None
suggest_budget_adjustment = None
pam_log_maintenance = None
add_idea = None
MCP_TOOLS_AVAILABLE = False

# For now, let's disable MCP tools imports to focus on weather function calling
print("🚧 MCP tools temporarily disabled for demo - focusing on weather function calling")

# Temporarily disable trip planning for demo
plan_trip = None
TRIP_PLANNING_AVAILABLE = False
print("🚧 Trip planning tool temporarily disabled for demo")

try:
    from ...pam.tools.weather_tool import WeatherTool
    from ...pam.tools.load_user_profile import LoadUserProfileTool
    from ...pam.tools.load_recent_memory import LoadRecentMemoryTool
    from ...pam.tools.load_social_context import LoadSocialContextTool
    from ...pam.tools.think import ThinkTool
    CLASS_TOOLS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Class-based tools not available: {e}")
    CLASS_TOOLS_AVAILABLE = False

# Import PAM 2.0 weather tools
from ..tools.weather import get_weather, get_weather_forecast, WEATHER_FUNCTIONS

logger = logging.getLogger(__name__)

class PAMToolBridge:
    """
    Bridge between PAM v1 tools and PAM 2.0 Gemini function calling

    Automatically converts 40+ existing PAM tools into Gemini function definitions
    """

    def __init__(self):
        self.tools = {}
        self.function_definitions = []
        self.mcp_tools = {}
        self.initialized = False

    async def initialize(self):
        """Initialize all PAM tools for Gemini function calling"""
        try:
            logger.info("🔗 Initializing PAM Tool Bridge...")

            # Add PAM 2.0 weather functions (already working)
            self.function_definitions.extend(WEATHER_FUNCTIONS)
            self.tools.update({
                "get_weather": get_weather,
                "get_weather_forecast": get_weather_forecast
            })

            # Add core PAM v1 MCP tools
            await self._register_mcp_tools()

            # Add PAM v1 class-based tools
            await self._register_class_tools()

            self.initialized = True

            logger.info(f"✅ PAM Tool Bridge initialized: {len(self.function_definitions)} functions available")
            logger.info(f"🛠️ Available tools: {list(self.tools.keys())[:10]}...")  # Show first 10

        except Exception as e:
            logger.error(f"❌ Tool Bridge initialization failed: {e}")
            raise

    async def _register_mcp_tools(self):
        """Register MCP tools for function calling"""

        # Trip planning (only if available)
        if TRIP_PLANNING_AVAILABLE:
            self.function_definitions.append({
                "name": "plan_trip",
                "description": "Plan an RV trip with route optimization, camping spots, and travel recommendations",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string", "description": "User identifier"},
                        "origin": {"type": "string", "description": "Starting location"},
                        "destination": {"type": "string", "description": "Destination location"},
                        "preferences": {"type": "object", "description": "Travel preferences (optional)"}
                    },
                    "required": ["user_id", "origin", "destination"]
                }
            })
            self.tools["plan_trip"] = plan_trip

        # Only register MCP tools if they're available
        if MCP_TOOLS_AVAILABLE:
            # Expense tracking
            self.function_definitions.append({
                "name": "track_expense",
                "description": "Track RV travel expenses and categorize spending",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string", "description": "User identifier"},
                        "amount": {"type": "number", "description": "Expense amount"},
                        "category": {"type": "string", "description": "Expense category"},
                        "description": {"type": "string", "description": "Expense description"}
                    },
                    "required": ["user_id", "amount", "category"]
                }
            })
            self.tools["track_expense"] = track_expense

            # User context
            self.function_definitions.append({
                "name": "get_user_context",
                "description": "Get comprehensive user profile and travel context",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string", "description": "User identifier"}
                    },
                    "required": ["user_id"]
                }
            })
            self.tools["get_user_context"] = get_user_context

            # Budget and finance
            self.function_definitions.append({
                "name": "log_expense",
                "description": "Log detailed expense with automatic categorization",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string"},
                        "amount": {"type": "number"},
                        "description": {"type": "string"},
                        "category": {"type": "string"}
                    },
                    "required": ["user_id", "amount", "description"]
                }
            })
            self.tools["log_expense"] = log_expense

            self.function_definitions.append({
                "name": "suggest_budget_adjustment",
                "description": "Analyze spending and suggest budget adjustments",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string"}
                    },
                    "required": ["user_id"]
                }
            })
            self.tools["suggest_budget_adjustment"] = suggest_budget_adjustment

            # Vehicle maintenance
            self.function_definitions.append({
                "name": "pam_log_maintenance",
                "description": "Log RV maintenance activities and schedule reminders",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string"},
                        "maintenance_type": {"type": "string"},
                        "description": {"type": "string"},
                        "cost": {"type": "number"}
                    },
                    "required": ["user_id", "maintenance_type", "description"]
                }
            })
            self.tools["pam_log_maintenance"] = pam_log_maintenance

            # Money making ideas
            self.function_definitions.append({
                "name": "add_idea",
                "description": "Add money-making ideas for RV travelers",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string"},
                        "idea_title": {"type": "string"},
                        "description": {"type": "string"},
                        "estimated_income": {"type": "number"}
                    },
                    "required": ["user_id", "idea_title", "description"]
                }
            })
            self.tools["add_idea"] = add_idea

        logger.info(f"📦 Registered {len([t for t in self.tools.keys() if t != 'get_weather' and t != 'get_weather_forecast'])} MCP tools")

    async def _register_class_tools(self):
        """Register class-based PAM v1 tools"""
        # These would require instantiation and method mapping
        # For now, focus on the working MCP tools
        pass

    async def execute_tool(self, tool_name: str, user_id: str, **kwargs) -> Dict[str, Any]:
        """Execute a tool and return results"""
        try:
            if tool_name not in self.tools:
                return {"error": f"Tool '{tool_name}' not found"}

            tool_func = self.tools[tool_name]

            # Add user_id to kwargs if not present
            if "user_id" not in kwargs and tool_name != "get_weather" and tool_name != "get_weather_forecast":
                kwargs["user_id"] = user_id

            # Execute the tool
            if asyncio.iscoroutinefunction(tool_func):
                result = await tool_func(**kwargs)
            else:
                result = tool_func(**kwargs)

            logger.info(f"✅ Executed tool '{tool_name}' successfully")
            return result

        except Exception as e:
            logger.error(f"❌ Tool execution failed for '{tool_name}': {e}")
            return {"error": f"Tool execution failed: {str(e)}"}

    def get_function_definitions(self) -> List[Dict[str, Any]]:
        """Get all function definitions for Gemini"""
        return self.function_definitions

    def get_tool_names(self) -> List[str]:
        """Get list of available tool names"""
        return list(self.tools.keys())

# Global tool bridge instance
pam_tool_bridge = PAMToolBridge()