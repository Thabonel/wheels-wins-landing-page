"""
PAM Tool Registry - Function Calling Integration
Comprehensive tool management and OpenAI function calling integration
"""

import asyncio
import json
from typing import Dict, List, Any, Optional, Union, Callable
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum

from app.core.logging import get_logger
from .base_tool import BaseTool

logger = get_logger(__name__)


class ToolCapability(Enum):
    """Tool capability types"""
    LOCATION_SEARCH = "location_search"
    WEB_SCRAPING = "web_scraping" 
    MEDIA_SEARCH = "media_search"
    USER_DATA = "user_data"
    MEMORY = "memory"
    CALCULATION = "calculation"
    EXTERNAL_API = "external_api"
    FINANCIAL = "financial"
    TRIP_PLANNING = "trip_planning"
    WEATHER = "weather"


@dataclass
class ToolDefinition:
    """OpenAI function definition for tool"""
    name: str
    description: str
    parameters: Dict[str, Any]
    capability: ToolCapability
    enabled: bool = True
    priority: int = 1  # Lower number = higher priority
    max_execution_time: int = 30  # seconds
    requires_user_context: bool = False


@dataclass
class ToolExecutionResult:
    """Result of tool execution"""
    success: bool
    tool_name: str
    execution_time_ms: float
    result: Any
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ToolRegistry:
    """
    Central registry for PAM tools with OpenAI function calling integration
    
    Features:
    - Automatic OpenAI function definition generation
    - Tool execution with timeout and error handling
    - Priority-based tool selection
    - Capability-based filtering
    - Performance monitoring
    """
    
    def __init__(self):
        self.tools: Dict[str, BaseTool] = {}
        self.tool_definitions: Dict[str, ToolDefinition] = {}
        self.execution_stats: Dict[str, Dict[str, Any]] = {}
        self.is_initialized = False
        
    async def initialize(self):
        """Initialize the tool registry and all registered tools"""
        try:
            logger.info("🛠️ Initializing PAM Tool Registry...")
            
            # Initialize all registered tools
            initialization_tasks = []
            for tool_name, tool in self.tools.items():
                initialization_tasks.append(self._initialize_tool(tool_name, tool))
            
            # Run initializations concurrently
            await asyncio.gather(*initialization_tasks, return_exceptions=True)
            
            self.is_initialized = True
            
            # Log registry status
            enabled_tools = [name for name, defn in self.tool_definitions.items() if defn.enabled]
            logger.info(f"✅ Tool Registry initialized: {len(enabled_tools)} tools available")
            logger.info(f"🎯 Available tools: {', '.join(enabled_tools)}")
            
        except Exception as e:
            logger.error(f"❌ Tool Registry initialization failed: {e}")
            raise
    
    async def _initialize_tool(self, tool_name: str, tool: BaseTool):
        """Initialize a single tool with error handling"""
        try:
            await tool.initialize()
            logger.info(f"✅ Tool '{tool_name}' initialized successfully")
        except Exception as e:
            logger.error(f"❌ Tool '{tool_name}' initialization failed: {e}")
            # Disable tool if initialization fails
            if tool_name in self.tool_definitions:
                self.tool_definitions[tool_name].enabled = False
    
    def register_tool(
        self, 
        tool: BaseTool, 
        function_definition: Optional[Dict[str, Any]] = None,
        capability: ToolCapability = ToolCapability.EXTERNAL_API,
        priority: int = 1,
        max_execution_time: int = 30
    ):
        """
        Register a tool with the registry
        
        Args:
            tool: The tool instance
            function_definition: OpenAI function definition (auto-generated if None)
            capability: Tool capability type
            priority: Execution priority (lower = higher priority)
            max_execution_time: Maximum execution time in seconds
        """
        tool_name = tool.tool_name
        
        if tool_name in self.tools:
            logger.warning(f"⚠️ Tool '{tool_name}' already registered, overwriting")
        
        # Register the tool instance
        self.tools[tool_name] = tool
        
        # Create or use provided function definition
        if function_definition:
            parameters = function_definition.get("parameters", {})
            description = function_definition.get("description", f"Execute {tool_name} tool")
        else:
            # Auto-generate basic definition
            parameters = {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "description": f"Action to perform with {tool_name}"
                    },
                    "parameters": {
                        "type": "object",
                        "description": f"Parameters for {tool_name} execution"
                    }
                },
                "required": ["action"]
            }
            description = f"Execute {tool_name} tool with specified action and parameters"
        
        # Register tool definition
        self.tool_definitions[tool_name] = ToolDefinition(
            name=tool_name,
            description=description,
            parameters=parameters,
            capability=capability,
            priority=priority,
            max_execution_time=max_execution_time,
            requires_user_context=hasattr(tool, 'requires_user_context') and tool.requires_user_context
        )
        
        # Initialize execution stats
        self.execution_stats[tool_name] = {
            "total_calls": 0,
            "successful_calls": 0,
            "failed_calls": 0,
            "avg_execution_time_ms": 0.0,
            "last_execution": None
        }
        
        logger.info(f"📝 Registered tool: {tool_name} ({capability.value})")
    
    def get_openai_functions(
        self, 
        capabilities: Optional[List[ToolCapability]] = None,
        user_context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get OpenAI function definitions for enabled tools
        
        Args:
            capabilities: Filter by tool capabilities
            user_context: User context for capability filtering
            
        Returns:
            List of OpenAI function definitions
        """
        functions = []
        
        for tool_name, definition in self.tool_definitions.items():
            # Skip disabled tools
            if not definition.enabled:
                continue
                
            # Filter by capabilities if specified
            if capabilities and definition.capability not in capabilities:
                continue
            
            # Check if tool is available
            if tool_name not in self.tools:
                continue
            
            # Build OpenAI function definition
            function_def = {
                "name": tool_name,
                "description": definition.description,
                "parameters": definition.parameters
            }
            
            functions.append(function_def)
        
        # Sort by priority (lower number = higher priority)
        functions.sort(key=lambda x: self.tool_definitions[x["name"]].priority)
        
        logger.debug(f"🔧 Generated {len(functions)} OpenAI function definitions")
        return functions
    
    async def execute_tool(
        self,
        tool_name: str,
        user_id: str,
        parameters: Dict[str, Any],
        timeout: Optional[int] = None
    ) -> ToolExecutionResult:
        """
        Execute a tool with error handling and timeout
        
        Args:
            tool_name: Name of the tool to execute
            user_id: User ID for context
            parameters: Tool parameters
            timeout: Custom timeout (uses tool default if None)
            
        Returns:
            Tool execution result
        """
        start_time = datetime.utcnow()
        
        if tool_name not in self.tools:
            return ToolExecutionResult(
                success=False,
                tool_name=tool_name,
                execution_time_ms=0,
                result=None,
                error=f"Tool '{tool_name}' not found"
            )
        
        tool = self.tools[tool_name]
        definition = self.tool_definitions.get(tool_name)
        
        if not definition or not definition.enabled:
            return ToolExecutionResult(
                success=False,
                tool_name=tool_name,
                execution_time_ms=0,
                result=None,
                error=f"Tool '{tool_name}' is disabled"
            )
        
        # Use custom timeout or tool default
        execution_timeout = timeout or definition.max_execution_time
        
        try:
            logger.info(f"🔧 Executing tool: {tool_name} for user: {user_id}")
            
            # Execute tool with timeout
            result = await asyncio.wait_for(
                tool.execute(user_id, parameters),
                timeout=execution_timeout
            )
            
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            # Update stats
            self._update_execution_stats(tool_name, True, execution_time)
            
            logger.info(f"✅ Tool '{tool_name}' executed successfully in {execution_time:.1f}ms")
            
            return ToolExecutionResult(
                success=True,
                tool_name=tool_name,
                execution_time_ms=execution_time,
                result=result,
                metadata={
                    "timeout_used": execution_timeout,
                    "parameters": parameters
                }
            )
            
        except asyncio.TimeoutError:
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            error_msg = f"Tool execution timed out after {execution_timeout}s"
            
            self._update_execution_stats(tool_name, False, execution_time)
            
            logger.warning(f"⏱️ Tool '{tool_name}' timed out after {execution_timeout}s")
            
            return ToolExecutionResult(
                success=False,
                tool_name=tool_name,
                execution_time_ms=execution_time,
                result=None,
                error=error_msg
            )
            
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            error_msg = f"Tool execution failed: {str(e)}"
            
            self._update_execution_stats(tool_name, False, execution_time)
            
            logger.error(f"❌ Tool '{tool_name}' execution failed: {e}")
            
            return ToolExecutionResult(
                success=False,
                tool_name=tool_name,
                execution_time_ms=execution_time,
                result=None,
                error=error_msg
            )
    
    def _update_execution_stats(self, tool_name: str, success: bool, execution_time_ms: float):
        """Update execution statistics for a tool"""
        if tool_name not in self.execution_stats:
            return
        
        stats = self.execution_stats[tool_name]
        stats["total_calls"] += 1
        stats["last_execution"] = datetime.utcnow().isoformat()
        
        if success:
            stats["successful_calls"] += 1
        else:
            stats["failed_calls"] += 1
        
        # Update average execution time
        total_calls = stats["total_calls"]
        current_avg = stats["avg_execution_time_ms"]
        stats["avg_execution_time_ms"] = ((current_avg * (total_calls - 1)) + execution_time_ms) / total_calls
    
    def get_tool_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get execution statistics for all tools"""
        return {
            "tools": self.execution_stats,
            "registry_stats": {
                "total_tools": len(self.tools),
                "enabled_tools": len([d for d in self.tool_definitions.values() if d.enabled]),
                "capabilities": list(set(d.capability.value for d in self.tool_definitions.values())),
                "is_initialized": self.is_initialized
            }
        }
    
    def get_tool_by_capability(self, capability: ToolCapability) -> List[str]:
        """Get tools that have a specific capability"""
        return [
            name for name, definition in self.tool_definitions.items()
            if definition.capability == capability and definition.enabled
        ]
    
    def disable_tool(self, tool_name: str):
        """Disable a tool"""
        if tool_name in self.tool_definitions:
            self.tool_definitions[tool_name].enabled = False
            logger.info(f"🚫 Tool '{tool_name}' disabled")
    
    def enable_tool(self, tool_name: str):
        """Enable a tool"""
        if tool_name in self.tool_definitions:
            self.tool_definitions[tool_name].enabled = True
            logger.info(f"✅ Tool '{tool_name}' enabled")


# Global tool registry instance
_tool_registry: Optional[ToolRegistry] = None


def get_tool_registry() -> ToolRegistry:
    """Get or create the global tool registry"""
    global _tool_registry
    if _tool_registry is None:
        _tool_registry = ToolRegistry()
    return _tool_registry


async def initialize_tool_registry() -> ToolRegistry:
    """Initialize the tool registry with all available tools"""
    registry = get_tool_registry()
    
    if registry.is_initialized:
        return registry
    
    try:
        # Import and register all available tools
        await _register_all_tools(registry)
        
        # Initialize the registry
        await registry.initialize()
        
        return registry
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize tool registry: {e}")
        raise


async def _register_all_tools(registry: ToolRegistry):
    """Register all available PAM tools"""
    logger.info("📋 Registering PAM tools...")
    
    # Financial Tools - Core expense and budget management using WinsNode
    try:
        from ..nodes.wins_node import wins_node
        
        # Create wrapper class for WinsNode financial operations
        class FinanceToolWrapper:
            def __init__(self):
                self.tool_name = "manage_finances"
                self.wins_node = wins_node
            
            async def initialize(self):
                # WinsNode is already initialized
                pass
            
            async def execute(self, user_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
                action = params.get("action")
                
                if action == "log_expense":
                    # Use WinsNode's expense tracking with automatic categorization
                    description = params.get("description", "")
                    amount = params.get("amount", 0)
                    
                    # Auto-categorize if no category provided
                    category = params.get("category")
                    if not category and description:
                        category = await self.wins_node.categorize_expense(description, amount)
                    
                    result = await self.wins_node.add_expense(
                        user_id=user_id,
                        data={
                            "category": category,
                            "amount": amount,
                            "description": description
                        }
                    )
                    return result
                    
                elif action == "fetch_summary":
                    # Get comprehensive financial summary
                    summary = await self.wins_node.get_financial_summary(user_id)
                    analytics = await self.wins_node.get_expense_analytics(user_id)
                    
                    return {
                        "summary": summary,
                        "analytics": analytics,
                        "success": True
                    }
                    
                elif action == "suggest_budget":
                    # Check budget status and provide suggestions
                    category = params.get("category")
                    budget_status = await self.wins_node.check_budget_status(user_id, category)
                    
                    suggestion = "on_track"
                    if budget_status.get("alert"):
                        suggestion = "reduce_spending"
                    elif budget_status.get("percentage_used", 0) < 50:
                        suggestion = "budget_healthy"
                    
                    return {
                        "suggestion": suggestion,
                        "budget_status": budget_status,
                        "success": True
                    }
                    
                return {"error": "Unknown finance action", "success": False}
        
        registry.register_tool(
            tool=FinanceToolWrapper(),
            function_definition={
                "name": "manage_finances",
                "description": "Manage expenses, budgets, and financial tracking. Use when user mentions spending money, tracking expenses, or managing budgets.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["log_expense", "fetch_summary", "suggest_budget"],
                            "description": "Financial action to perform"
                        },
                        "category": {
                            "type": "string",
                            "description": "Expense category (fuel, food, accommodation, maintenance, etc.)"
                        },
                        "amount": {
                            "type": "number",
                            "description": "Amount in dollars"
                        },
                        "description": {
                            "type": "string",
                            "description": "Optional description of the expense"
                        }
                    },
                    "required": ["action"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Financial tools registered")
        
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Financial tools: {e}")
    
    # Mapbox Tool for trip planning
    try:
        from .mapbox_tool import MapboxTool
        
        registry.register_tool(
            tool=MapboxTool(),
            function_definition={
                "name": "mapbox_navigator",
                "description": "Plan RV routes, find campgrounds, calculate distances and fuel costs. Use for trip planning and navigation.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["plan_route", "find_campgrounds", "find_fuel_stops", "calculate_costs"],
                            "description": "Navigation action to perform"
                        },
                        "origin": {
                            "type": "string",
                            "description": "Starting location (address or coordinates)"
                        },
                        "destination": {
                            "type": "string",
                            "description": "Destination location (address or coordinates)"
                        },
                        "waypoints": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Optional waypoints for the route"
                        },
                        "radius": {
                            "type": "number",
                            "description": "Search radius in miles for POIs"
                        }
                    },
                    "required": ["action"]
                }
            },
            capability=ToolCapability.LOCATION_SEARCH,
            priority=1
        )
        logger.info("✅ Mapbox tool registered")
        
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Mapbox tool: {e}")
    
    # Weather Tool for travel safety
    try:
        from .weather_tool import WeatherTool
        
        registry.register_tool(
            tool=WeatherTool(),
            function_definition={
                "name": "weather_service",
                "description": "Get weather forecasts, alerts, and RV travel conditions. Use for weather-related queries.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["current_weather", "forecast", "travel_conditions", "weather_alerts"],
                            "description": "Weather information to retrieve"
                        },
                        "location": {
                            "type": "string",
                            "description": "Location for weather (address or coordinates)"
                        },
                        "days": {
                            "type": "number",
                            "description": "Number of days for forecast (1-7)"
                        }
                    },
                    "required": ["action", "location"]
                }
            },
            capability=ToolCapability.EXTERNAL_API,
            priority=2
        )
        logger.info("✅ Weather tool registered")
        
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Weather tool: {e}")
    
    # Google Places Tool (existing)
    try:
        from .google_places_tool import GooglePlacesTool
        
        registry.register_tool(
            tool=GooglePlacesTool(),
            function_definition={
                "name": "search_nearby_places",
                "description": "Search for places, businesses, and points of interest near a location. Use for any location-based queries including restaurants, gas stations, attractions, campgrounds, etc.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "array",
                            "items": {"type": "number"},
                            "description": "Location coordinates [latitude, longitude] or address string"
                        },
                        "place_type": {
                            "type": "string",
                            "enum": ["restaurant", "lodging", "tourist_attraction", "gas_station", "campground", "rv_park", "grocery_store", "hospital", "bank"],
                            "description": "Type of place to search for"
                        },
                        "radius": {
                            "type": "number",
                            "description": "Search radius in meters (default: 5000, max: 50000)"
                        },
                        "keyword": {
                            "type": "string", 
                            "description": "Optional keyword to refine search"
                        },
                        "min_rating": {
                            "type": "number",
                            "description": "Minimum rating filter (1.0-5.0, default: 3.0)"
                        }
                    },
                    "required": ["location", "place_type"]
                }
            },
            capability=ToolCapability.LOCATION_SEARCH,
            priority=2
        )
        
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Google Places tool: {e}")
    
    # YouTube Trip Tool
    try:
        from .youtube_trip_tool import YouTubeTripTool
        
        registry.register_tool(
            tool=YouTubeTripTool(),
            function_definition={
                "name": "search_travel_videos",
                "description": "Search for travel videos, RV tips, destination guides, and camping tutorials on YouTube",
                "parameters": {
                    "type": "object", 
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query for travel videos (e.g., 'RV camping Yellowstone', 'best campgrounds California')"
                        },
                        "video_type": {
                            "type": "string",
                            "enum": ["destination_guide", "rv_tips", "camping_tutorial", "travel_vlog", "reviews"],
                            "description": "Type of travel video to find"
                        },
                        "max_results": {
                            "type": "number",
                            "description": "Maximum number of videos to return (default: 5)"
                        }
                    },
                    "required": ["query"]
                }
            },
            capability=ToolCapability.MEDIA_SEARCH,
            priority=2
        )
        
    except ImportError as e:
        logger.warning(f"⚠️ Could not register YouTube Trip tool: {e}")
    
    # Web Scraper Tool
    try:
        from .webscraper_tool import WebScraperTool
        
        registry.register_tool(
            tool=WebScraperTool(),
            function_definition={
                "name": "search_web_information",
                "description": "Search and scrape web information about travel, camping, RV tips, weather, or any topic",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string", 
                            "description": "Search query for web information"
                        },
                        "result_type": {
                            "type": "string",
                            "enum": ["general", "news", "weather", "travel", "camping", "rv_guides"],
                            "description": "Type of information to search for"
                        },
                        "max_results": {
                            "type": "number",
                            "description": "Maximum number of results (default: 3)"
                        }
                    },
                    "required": ["query"]
                }
            },
            capability=ToolCapability.WEB_SCRAPING,
            priority=2
        )
        
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Web Scraper tool: {e}")
    
    # Memory Tools
    try:
        from .load_recent_memory import load_recent_memory
        from .load_user_profile import load_user_profile
        
        # Note: These are functions, not classes, so we need wrapper tools
        # This would require creating wrapper tool classes or converting them
        
    except ImportError as e:
        logger.debug(f"Memory tools not available: {e}")
    
    logger.info("✅ PAM tool registration completed")