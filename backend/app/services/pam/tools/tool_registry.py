"""
PAM Tool Registry - Function Calling Integration
Comprehensive tool management and OpenAI function calling integration
Enhanced with Phase 4 RAG and intelligent agent capabilities
"""

import asyncio
import json
from typing import Dict, List, Any, Optional, Union, Callable
from datetime import datetime
from dataclasses import dataclass, asdict

from app.core.logging import get_logger
from .tool_capabilities import ToolCapability, normalize_capability
from .base_tool import BaseTool
from .import_utils import lazy_import

logger = get_logger(__name__)


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
        """Initialize a single tool with error handling and graceful degradation"""
        try:
            # Set a timeout for tool initialization to prevent hanging
            await asyncio.wait_for(tool.initialize(), timeout=10.0)
            logger.info(f"✅ Tool '{tool_name}' initialized successfully")
            return True
        except asyncio.TimeoutError:
            logger.warning(f"⏱️ Tool '{tool_name}' initialization timed out - disabling")
            if tool_name in self.tool_definitions:
                self.tool_definitions[tool_name].enabled = False
            return False
        except ImportError as e:
            logger.warning(f"📦 Tool '{tool_name}' dependencies missing: {e} - skipping")
            if tool_name in self.tool_definitions:
                self.tool_definitions[tool_name].enabled = False
            return False
        except Exception as e:
            logger.error(f"❌ Tool '{tool_name}' initialization failed: {e}")
            # Disable tool if initialization fails, but don't crash the registry
            if tool_name in self.tool_definitions:
                self.tool_definitions[tool_name].enabled = False
            return False
    
    def register_tool(
        self, 
        tool: BaseTool, 
        function_definition: Optional[Dict[str, Any]] = None,
        capability: Union[ToolCapability, str] = ToolCapability.EXTERNAL_API,
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
        
        # Normalize capability to prevent enum conflicts
        normalized_capability = normalize_capability(capability)
        
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
            capability=normalized_capability,
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
        
        logger.info(f"📝 Registered tool: {tool_name} ({normalized_capability.value})")
    
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
        timeout: Optional[int] = None,
        context: Optional[Dict[str, Any]] = None
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
            # Check if tool supports context parameter (like WeatherTool)
            import inspect
            if 'context' in inspect.signature(tool.execute).parameters:
                result = await asyncio.wait_for(
                    tool.execute(user_id, parameters, context),
                    timeout=execution_timeout
                )
            else:
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
        # Import and register all available tools with graceful error handling
        registered_count, failed_count = await _register_all_tools(registry)
        
        # Initialize the registry (this should not fail even if some tools are missing)
        try:
            await registry.initialize()
            logger.info(f"🎯 Tool registry initialization complete: {registered_count} tools active")
        except Exception as init_error:
            logger.error(f"❌ Tool registry initialization failed: {init_error}")
            # Don't re-raise - return a partially functional registry
            logger.warning("⚠️ Returning partially functional tool registry")
        
        return registry
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize tool registry: {e}")
        # Return an empty but functional registry instead of crashing
        logger.warning("🆘 Returning empty tool registry as fallback")
        empty_registry = ToolRegistry()
        empty_registry.is_initialized = True
        return empty_registry


async def _register_all_tools(registry: ToolRegistry):
    """Register all available PAM tools with graceful error handling"""
    logger.info("=" * 60)
    logger.info("📋 STARTING PAM TOOL REGISTRATION")
    logger.info("=" * 60)

    registered_count = 0
    failed_count = 0
    tool_attempt_count = 0
    
    # Financial Tools - Core expense and budget management using WinsNode
    try:
        logger.debug("🔄 Attempting to register Financial tools...")
        wins_node = lazy_import("app.services.pam.nodes.wins_node", "wins_node")
        
        if wins_node is None:
            raise ImportError("WinsNode not available")
        
        # Create wrapper class for WinsNode financial operations
        class FinanceToolWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "manage_finances",
                    "Manage expenses, budgets, and financial tracking"
                )
                self.wins_node = wins_node
            
            async def initialize(self):
                # WinsNode is already initialized
                self.is_initialized = True
            
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
                    
                    # PAM Savings Attribution - collect PAM influence data
                    pam_influence = None
                    if params.get("pam_recommended", False):
                        original_amount = params.get("original_amount")
                        savings_amount = params.get("savings_amount", 0)
                        recommendation_type = params.get("recommendation_type", "general")
                        confidence = params.get("confidence", 0.8)
                        
                        # Only create PAM influence record if there's actual savings
                        if savings_amount > 0:
                            pam_influence = {
                                "recommended_by_pam": True,
                                "original_amount": original_amount,
                                "savings_amount": savings_amount,
                                "recommendation_type": recommendation_type,
                                "confidence": confidence
                            }
                    
                    # Prepare expense data
                    expense_data = {
                        "category": category,
                        "amount": amount,
                        "description": description
                    }
                    
                    # Add PAM influence if present
                    if pam_influence:
                        expense_data["pam_influence"] = pam_influence
                    
                    result = await self.wins_node.add_expense(
                        user_id=user_id,
                        data=expense_data
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
                "description": "Manage expenses, budgets, and financial tracking. Use when user mentions spending money, tracking expenses, or managing budgets. Support PAM savings attribution when suggesting cost-saving alternatives.",
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
                        },
                        "pam_recommended": {
                            "type": "boolean",
                            "description": "Whether PAM recommended this expense or a money-saving alternative"
                        },
                        "original_amount": {
                            "type": "number",
                            "description": "Original amount before PAM's money-saving suggestion (if applicable)"
                        },
                        "savings_amount": {
                            "type": "number",
                            "description": "Amount saved due to PAM's recommendation"
                        },
                        "recommendation_type": {
                            "type": "string",
                            "enum": ["fuel_optimization", "camping_alternative", "route_optimization", "price_comparison", "timing_optimization", "general"],
                            "description": "Type of PAM money-saving recommendation"
                        },
                        "confidence": {
                            "type": "number",
                            "description": "Confidence in savings attribution (0.0-1.0), defaults to 0.8"
                        }
                    },
                    "required": ["action"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Financial tools registered")
        registered_count += 1
        
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Financial tools: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Financial tools registration failed: {e}")
        failed_count += 1
    
    # Mapbox Tool for trip planning
    try:
        logger.debug("🔄 Attempting to register Mapbox tool...")
        MapboxTool = lazy_import("app.services.pam.tools.mapbox_tool", "MapboxTool")
        
        if MapboxTool is None:
            raise ImportError("MapboxTool not available")
        
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
        registered_count += 1
        
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Mapbox tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Mapbox tool registration failed: {e}")
        failed_count += 1
    
    # Weather Tool - FREE OpenMeteo API (no API key required!)
    try:
        logger.debug("🔄 Attempting to register Weather tool (FREE OpenMeteo)...")
        OpenMeteoWeatherTool = lazy_import("app.services.pam.tools.openmeteo_weather_tool", "OpenMeteoWeatherTool")

        if OpenMeteoWeatherTool is None:
            raise ImportError("OpenMeteoWeatherTool not available")

        registry.register_tool(
            tool=OpenMeteoWeatherTool(),
            function_definition={
                "name": "weather_advisor",
                "description": "Get current weather conditions, forecasts, and RV travel conditions for locations. Essential for trip planning and safety. Uses FREE OpenMeteo API (no API key required).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["get_current", "get_forecast", "check_travel_conditions", "get_route_weather"],
                            "description": "Weather action to perform"
                        },
                        "location": {
                            "type": "string",
                            "description": "Location for weather (city name, coordinates, or address)"
                        },
                        "days": {
                            "type": "number",
                            "description": "Number of days for forecast (1-7, default 5)"
                        },
                        "departure_time": {
                            "type": "string",
                            "description": "Planned departure time for travel conditions check"
                        },
                        "vehicle_type": {
                            "type": "string",
                            "description": "Type of RV for travel condition assessment"
                        },
                        "route_points": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of locations along a route for route weather"
                        }
                    },
                    "required": ["action", "location"]
                }
            },
            capability=ToolCapability.WEATHER,
            priority=1
        )
        logger.info("✅ Weather tool registered (FREE OpenMeteo API)")
        registered_count += 1

    except ImportError as e:
        logger.warning(f"⚠️ Could not register Weather tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Weather tool registration failed: {e}")
        failed_count += 1

    # Fuel Log Tool - Access user's fuel log entries
    try:
        logger.debug("🔄 Attempting to register Fuel Log tool...")
        get_fuel_log = lazy_import("app.services.pam.tools.trip.get_fuel_log", "get_fuel_log")

        if get_fuel_log is None:
            raise ImportError("get_fuel_log not available")

        # Create wrapper class for fuel log function
        class FuelLogToolWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_fuel_log",
                    "Retrieve user's fuel log entries from database"
                )
                self.get_fuel_log_func = get_fuel_log

            async def initialize(self):
                self.is_initialized = True

            async def execute(self, user_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
                limit = params.get("limit", 10)
                start_date = params.get("start_date")
                end_date = params.get("end_date")

                result = await self.get_fuel_log_func(
                    user_id=user_id,
                    limit=limit,
                    start_date=start_date,
                    end_date=end_date
                )
                return result

        registry.register_tool(
            tool=FuelLogToolWrapper(),
            function_definition={
                "name": "get_fuel_log",
                "description": "Retrieve user's fuel log entries with date, litres/gallons, cost, and location. Use when user asks about fuel purchases, gas logs, or fuel consumption history.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "limit": {
                            "type": "number",
                            "description": "Maximum number of entries to return (default 10)"
                        },
                        "start_date": {
                            "type": "string",
                            "description": "Start date for filtering (YYYY-MM-DD format, optional)"
                        },
                        "end_date": {
                            "type": "string",
                            "description": "End date for filtering (YYYY-MM-DD format, optional)"
                        }
                    },
                    "required": []
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Fuel Log tool registered")
        registered_count += 1

    except ImportError as e:
        logger.warning(f"⚠️ Could not register Fuel Log tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Fuel Log tool registration failed: {e}")
        failed_count += 1

    # Google Places Tool removed - ChatGPT handles place recommendations with user location context
    
    # YouTube Trip Tool
    try:
        logger.debug("🔄 Attempting to register YouTube Trip tool...")
        YouTubeTripTool = lazy_import("app.services.pam.tools.youtube_trip_tool", "YouTubeTripTool")

        if YouTubeTripTool is None:
            raise ImportError("YouTubeTripTool not available")

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
        registered_count += 1

    except ImportError as e:
        logger.warning(f"⚠️ Could not register YouTube Trip tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ YouTube Trip tool registration failed: {e}")
        failed_count += 1

    # Calendar Event Tool
    try:
        logger.debug("🔄 Attempting to register Calendar Event tool...")
        CreateCalendarEventTool = lazy_import("app.services.pam.tools.create_calendar_event", "CreateCalendarEventTool")

        if CreateCalendarEventTool is None:
            raise ImportError("CreateCalendarEventTool not available")

        registry.register_tool(
            tool=CreateCalendarEventTool(),
            function_definition={
                "name": "create_calendar_event",
                "description": "Create a calendar event or appointment for the user. Use this when user asks to schedule, book, or add appointments.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "Title or name of the event"
                        },
                        "start_date": {
                            "type": "string",
                            "description": "Start date and time in ISO format (YYYY-MM-DDTHH:MM:SS)"
                        },
                        "end_date": {
                            "type": "string",
                            "description": "End date and time in ISO format (optional)"
                        },
                        "description": {
                            "type": "string",
                            "description": "Event description or notes (optional)"
                        },
                        "event_type": {
                            "type": "string",
                            "description": "Type of event: personal, work, travel, maintenance, etc."
                        },
                        "all_day": {
                            "type": "boolean",
                            "description": "Whether this is an all-day event"
                        },
                        "location_name": {
                            "type": "string",
                            "description": "Location of the event (optional)"
                        },
                        "reminder_minutes": {
                            "type": "number",
                            "description": "Minutes before event to send reminder (optional)"
                        }
                    },
                    "required": ["title", "start_date"]
                }
            },
            capability=ToolCapability.ACTION,
            priority=1
        )
        logger.info("✅ Calendar Event tool registered")
        registered_count += 1

    except ImportError as e:
        logger.warning(f"⚠️ Could not register Calendar Event tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Calendar Event tool registration failed: {e}")
        failed_count += 1

    # ============================================================
    # PHASE 1 TOOLS - Budget, Trip, Calendar (Week 1)
    # ============================================================

    # Budget Tool: Track Savings
    try:
        logger.debug("🔄 Attempting to register Track Savings tool...")
        track_savings = lazy_import("app.services.pam.tools.budget.track_savings", "track_savings")

        if track_savings is None:
            raise ImportError("track_savings function not available")

        class TrackSavingsTool:
            async def execute(self, user_id: str, **kwargs):
                return await track_savings(user_id=user_id, **kwargs)

        registry.register_tool(
            tool=TrackSavingsTool(),
            function_definition={
                "name": "track_savings",
                "description": "Log money saved by PAM for the user (cheaper gas, better campground deals, route optimization, etc.). Critical for ROI tracking - PAM aims to pay for herself at $10/month.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "amount": {
                            "type": "number",
                            "description": "Amount of money saved in dollars (must be positive)"
                        },
                        "category": {
                            "type": "string",
                            "description": "Category of savings (gas, campground, route, shopping, food, etc.)"
                        },
                        "description": {
                            "type": "string",
                            "description": "Description of what was saved (e.g., 'Shell station $0.15/gal cheaper')"
                        },
                        "event_type": {
                            "type": "string",
                            "enum": ["gas", "campground", "route", "other"],
                            "description": "Type of savings event"
                        }
                    },
                    "required": ["amount", "category"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Track Savings tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Track Savings tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Track Savings tool registration failed: {e}")
        failed_count += 1

    # Budget Tool: Analyze Budget
    try:
        logger.debug("🔄 Attempting to register Analyze Budget tool...")
        analyze_budget = lazy_import("app.services.pam.tools.budget.analyze_budget", "analyze_budget")

        if analyze_budget is None:
            raise ImportError("analyze_budget function not available")

        class AnalyzeBudgetTool:
            async def execute(self, user_id: str, **kwargs):
                return await analyze_budget(user_id=user_id, **kwargs)

        registry.register_tool(
            tool=AnalyzeBudgetTool(),
            function_definition={
                "name": "analyze_budget",
                "description": "Analyze user's budget and provide insights (spending trends, budget adherence, category breakdowns, recommendations). Use when user asks about budget status or financial health.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "period": {
                            "type": "string",
                            "enum": ["week", "month", "quarter", "year"],
                            "description": "Time period to analyze (default: month)"
                        },
                        "categories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Specific categories to analyze (leave empty for all)"
                        }
                    }
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Analyze Budget tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Analyze Budget tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Analyze Budget tool registration failed: {e}")
        failed_count += 1

    # Budget Tool: Compare vs Budget
    try:
        logger.debug("🔄 Attempting to register Compare vs Budget tool...")
        compare_vs_budget = lazy_import("app.services.pam.tools.budget.compare_vs_budget", "compare_vs_budget")

        if compare_vs_budget is None:
            raise ImportError("compare_vs_budget function not available")

        class CompareVsBudgetTool:
            async def execute(self, user_id: str, **kwargs):
                return await compare_vs_budget(user_id=user_id, **kwargs)

        registry.register_tool(
            tool=CompareVsBudgetTool(),
            function_definition={
                "name": "compare_vs_budget",
                "description": "Compare actual spending vs planned budget. Shows if user is over/under budget by category. Use when user asks 'am I on track?' or 'am I over budget?'",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "period": {
                            "type": "string",
                            "enum": ["week", "month", "quarter", "year"],
                            "description": "Time period to compare (default: month)"
                        },
                        "category": {
                            "type": "string",
                            "description": "Specific category to compare (leave empty for all categories)"
                        }
                    }
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Compare vs Budget tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Compare vs Budget tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Compare vs Budget tool registration failed: {e}")
        failed_count += 1

    # Budget Tool: Predict End of Month
    try:
        logger.debug("🔄 Attempting to register Predict End of Month tool...")
        predict_end_of_month = lazy_import("app.services.pam.tools.budget.predict_end_of_month", "predict_end_of_month")

        if predict_end_of_month is None:
            raise ImportError("predict_end_of_month function not available")

        class PredictEndOfMonthTool:
            async def execute(self, user_id: str, **kwargs):
                return await predict_end_of_month(user_id=user_id, **kwargs)

        registry.register_tool(
            tool=PredictEndOfMonthTool(),
            function_definition={
                "name": "predict_end_of_month",
                "description": "Forecast spending through end of month based on current trends. Predicts if user will stay under budget. Use when user asks 'will I stay under budget?' or 'what will I spend this month?'",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "description": "Specific category to predict (leave empty for overall prediction)"
                        }
                    }
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Predict End of Month tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Predict End of Month tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Predict End of Month tool registration failed: {e}")
        failed_count += 1

    # Budget Tool: Find Savings Opportunities
    try:
        logger.debug("🔄 Attempting to register Find Savings Opportunities tool...")
        find_savings_opportunities = lazy_import("app.services.pam.tools.budget.find_savings_opportunities", "find_savings_opportunities")

        if find_savings_opportunities is None:
            raise ImportError("find_savings_opportunities function not available")

        class FindSavingsOpportunitiesTool:
            async def execute(self, user_id: str, **kwargs):
                return await find_savings_opportunities(user_id=user_id, **kwargs)

        registry.register_tool(
            tool=FindSavingsOpportunitiesTool(),
            function_definition={
                "name": "find_savings_opportunities",
                "description": "AI-powered analysis to find money-saving opportunities based on spending patterns. Suggests where user can cut costs. Use when user asks 'where can I save money?' or 'how can I reduce spending?'",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "target_amount": {
                            "type": "number",
                            "description": "Target amount to save per month (optional, helps prioritize suggestions)"
                        }
                    }
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Find Savings Opportunities tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Find Savings Opportunities tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Find Savings Opportunities tool registration failed: {e}")
        failed_count += 1

    # Trip Tool: Find Cheap Gas
    try:
        logger.debug("🔄 Attempting to register Find Cheap Gas tool...")
        find_cheap_gas = lazy_import("app.services.pam.tools.trip.find_cheap_gas", "find_cheap_gas")

        if find_cheap_gas is None:
            raise ImportError("find_cheap_gas function not available")

        class FindCheapGasTool:
            async def execute(self, user_id: str, **kwargs):
                return await find_cheap_gas(user_id=user_id, **kwargs)

        registry.register_tool(
            tool=FindCheapGasTool(),
            function_definition={
                "name": "find_cheap_gas",
                "description": "Find cheapest gas stations near a location. Returns prices, distances, and station details. Critical for user savings - gas is major RV expense. Use when user asks about gas prices or fuel.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "latitude": {
                            "type": "number",
                            "description": "Latitude of search location"
                        },
                        "longitude": {
                            "type": "number",
                            "description": "Longitude of search location"
                        },
                        "radius_miles": {
                            "type": "number",
                            "description": "Search radius in miles (default: 10)"
                        },
                        "fuel_type": {
                            "type": "string",
                            "enum": ["regular", "midgrade", "premium", "diesel"],
                            "description": "Type of fuel (default: diesel for RVs)"
                        }
                    },
                    "required": ["latitude", "longitude"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Find Cheap Gas tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Find Cheap Gas tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Find Cheap Gas tool registration failed: {e}")
        failed_count += 1

    # Trip Tool: Optimize Route
    try:
        logger.debug("🔄 Attempting to register Optimize Route tool...")
        optimize_route = lazy_import("app.services.pam.tools.trip.optimize_route", "optimize_route")

        if optimize_route is None:
            raise ImportError("optimize_route function not available")

        class OptimizeRouteTool:
            async def execute(self, user_id: str, **kwargs):
                return await optimize_route(user_id=user_id, **kwargs)

        registry.register_tool(
            tool=OptimizeRouteTool(),
            function_definition={
                "name": "optimize_route",
                "description": "Find most cost-effective route between multiple stops. Minimizes fuel costs and considers RV constraints (height, weight, tolls). Use for multi-stop trip planning.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "waypoints": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of locations to visit in order (addresses or coordinates)"
                        },
                        "optimize_for": {
                            "type": "string",
                            "enum": ["cost", "time", "distance"],
                            "description": "Optimization priority (default: cost)"
                        },
                        "avoid": {
                            "type": "array",
                            "items": {"type": "string", "enum": ["tolls", "highways", "ferries"]},
                            "description": "Route features to avoid"
                        }
                    },
                    "required": ["waypoints"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Optimize Route tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Optimize Route tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Optimize Route tool registration failed: {e}")
        failed_count += 1

    # Trip Tool: Get Road Conditions
    try:
        logger.debug("🔄 Attempting to register Get Road Conditions tool...")
        get_road_conditions = lazy_import("app.services.pam.tools.trip.get_road_conditions", "get_road_conditions")

        if get_road_conditions is None:
            raise ImportError("get_road_conditions function not available")

        class GetRoadConditionsTool:
            async def execute(self, user_id: str, **kwargs):
                return await get_road_conditions(user_id=user_id, **kwargs)

        registry.register_tool(
            tool=GetRoadConditionsTool(),
            function_definition={
                "name": "get_road_conditions",
                "description": "Check road conditions, closures, traffic, and hazards for a route. Critical for RV safety. Use when user asks about road status or travel safety.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "route": {
                            "type": "string",
                            "description": "Route identifier (e.g., 'I-80', 'US-101') or location"
                        },
                        "origin": {
                            "type": "string",
                            "description": "Starting location (address or coordinates)"
                        },
                        "destination": {
                            "type": "string",
                            "description": "Ending location (address or coordinates)"
                        }
                    }
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Get Road Conditions tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Get Road Conditions tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Get Road Conditions tool registration failed: {e}")
        failed_count += 1

    # Trip Tool: Estimate Travel Time
    try:
        logger.debug("🔄 Attempting to register Estimate Travel Time tool...")
        estimate_travel_time = lazy_import("app.services.pam.tools.trip.estimate_travel_time", "estimate_travel_time")

        if estimate_travel_time is None:
            raise ImportError("estimate_travel_time function not available")

        class EstimateTravelTimeTool:
            async def execute(self, user_id: str, **kwargs):
                return await estimate_travel_time(user_id=user_id, **kwargs)

        registry.register_tool(
            tool=EstimateTravelTimeTool(),
            function_definition={
                "name": "estimate_travel_time",
                "description": "Calculate travel duration between locations, accounting for RV speed limits, breaks, and traffic. Use when user asks 'how long will it take?' or 'when will I arrive?'",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "origin": {
                            "type": "string",
                            "description": "Starting location (address or coordinates)"
                        },
                        "destination": {
                            "type": "string",
                            "description": "Ending location (address or coordinates)"
                        },
                        "departure_time": {
                            "type": "string",
                            "description": "Departure time (ISO format, optional - defaults to now)"
                        },
                        "include_breaks": {
                            "type": "boolean",
                            "description": "Whether to include recommended breaks (default: true)"
                        }
                    },
                    "required": ["origin", "destination"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Estimate Travel Time tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Estimate Travel Time tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Estimate Travel Time tool registration failed: {e}")
        failed_count += 1

    # ===============================
    # CALENDAR TOOLS (Phase 1: 2 tools)
    # Critical for: Calendar management
    # ===============================

    # Calendar Tool: Update Calendar Event
    try:
        logger.debug("🔄 Attempting to register Update Calendar Event tool...")
        update_calendar_event = lazy_import("app.services.pam.tools.update_calendar_event", "update_calendar_event")

        if update_calendar_event is None:
            raise ImportError("update_calendar_event function not available")

        class UpdateCalendarEventTool:
            async def execute(self, user_id: str, **kwargs):
                return await update_calendar_event(user_id=user_id, **kwargs)

        registry.register_tool(
            tool=UpdateCalendarEventTool(),
            function_definition={
                "name": "update_calendar_event",
                "description": "Modify an existing calendar event (change time, location, description, etc.). User must provide event ID or enough details to identify the event.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "event_id": {
                            "type": "string",
                            "description": "UUID of the event to update (required)"
                        },
                        "title": {
                            "type": "string",
                            "description": "New event title"
                        },
                        "start_date": {
                            "type": "string",
                            "description": "New start date/time in ISO format (YYYY-MM-DDTHH:MM:SS)"
                        },
                        "end_date": {
                            "type": "string",
                            "description": "New end date/time in ISO format (YYYY-MM-DDTHH:MM:SS)"
                        },
                        "description": {
                            "type": "string",
                            "description": "New event description"
                        },
                        "event_type": {
                            "type": "string",
                            "enum": ["reminder", "trip", "booking", "maintenance", "inspection"],
                            "description": "New event type"
                        },
                        "all_day": {
                            "type": "boolean",
                            "description": "Whether this is an all-day event"
                        },
                        "location_name": {
                            "type": "string",
                            "description": "New location name"
                        },
                        "reminder_minutes": {
                            "type": "integer",
                            "description": "New reminder time in minutes before event"
                        },
                        "color": {
                            "type": "string",
                            "description": "New color hex code for calendar display (e.g., #FF5733)"
                        }
                    },
                    "required": ["event_id"]
                }
            },
            capability=ToolCapability.ACTION,
            priority=1
        )
        logger.info("✅ Update Calendar Event tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Update Calendar Event tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Update Calendar Event tool registration failed: {e}")
        failed_count += 1

    # Calendar Tool: Delete Calendar Event
    try:
        logger.debug("🔄 Attempting to register Delete Calendar Event tool...")
        delete_calendar_event = lazy_import("app.services.pam.tools.delete_calendar_event", "delete_calendar_event")

        if delete_calendar_event is None:
            raise ImportError("delete_calendar_event function not available")

        class DeleteCalendarEventTool:
            async def execute(self, user_id: str, **kwargs):
                return await delete_calendar_event(user_id=user_id, **kwargs)

        registry.register_tool(
            tool=DeleteCalendarEventTool(),
            function_definition={
                "name": "delete_calendar_event",
                "description": "Delete a calendar event permanently. User must provide event ID or enough details to identify the event to delete.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "event_id": {
                            "type": "string",
                            "description": "UUID of the event to delete (required)"
                        }
                    },
                    "required": ["event_id"]
                }
            },
            capability=ToolCapability.ACTION,
            priority=1
        )
        logger.info("✅ Delete Calendar Event tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Delete Calendar Event tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Delete Calendar Event tool registration failed: {e}")
        failed_count += 1

    # Web Scraper Tool removed - ChatGPT handles general information with its knowledge base
    
    # Memory Tools
    try:
        logger.debug("🔄 Attempting to register Memory tools...")
        load_recent_memory = lazy_import("app.services.pam.tools.load_recent_memory", "load_recent_memory")
        load_user_profile = lazy_import("app.services.pam.tools.load_user_profile", "load_user_profile")
        
        # Note: These are functions, not classes, so we need wrapper tools
        # This would require creating wrapper tool classes or converting them
        
    except ImportError as e:
        logger.debug(f"Memory tools not available: {e}")
    
    # Registration summary
    total_attempted = registered_count + failed_count
    success_rate = (registered_count / total_attempted * 100) if total_attempted > 0 else 0

    logger.info("=" * 60)
    logger.info("📊 PAM TOOL REGISTRATION SUMMARY")
    logger.info("=" * 60)
    logger.info(f"✅ Successfully registered: {registered_count} tools")
    logger.info(f"❌ Failed to register: {failed_count} tools")
    logger.info(f"📈 Success rate: {success_rate:.1f}%")
    logger.info(f"🎯 Total tools attempted: {total_attempted}")
    logger.info("=" * 60)

    if failed_count > 0:
        logger.warning(f"⚠️ {failed_count} tools failed to register - PAM will function with reduced capabilities")

    return registered_count, failed_count