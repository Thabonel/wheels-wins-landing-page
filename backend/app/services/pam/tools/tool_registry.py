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

    # Timer/Alarm Tool - Set timers and alarms via voice/text
    try:
        logger.debug("🔄 Attempting to register Timer/Alarm tool...")
        TimerAlarmTool = lazy_import("app.services.pam.tools.timer_alarm_tool", "TimerAlarmTool")

        if TimerAlarmTool is None:
            raise ImportError("TimerAlarmTool not available")

        registry.register_tool(
            tool=TimerAlarmTool(),
            function_definition={
                "name": "set_timer_or_alarm",
                "description": "Set a timer or alarm for the user. Use this when user asks to: set a timer (e.g., 'set a timer for 10 minutes'), set an alarm (e.g., 'set an alarm for 3pm'), remind them in a specific time, or list/cancel active timers.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["create", "list", "cancel"],
                            "description": "Action to perform: create a new timer/alarm, list active ones, or cancel one"
                        },
                        "type": {
                            "type": "string",
                            "enum": ["timer", "alarm"],
                            "description": "Type: 'timer' for countdown (e.g., 10 minutes from now), 'alarm' for specific time (e.g., 3pm)"
                        },
                        "duration": {
                            "type": "string",
                            "description": "Duration for timer (e.g., '10 minutes', '1 hour', '30 seconds')"
                        },
                        "duration_seconds": {
                            "type": "number",
                            "description": "Duration in seconds (alternative to duration string)"
                        },
                        "alarm_time": {
                            "type": "string",
                            "description": "Time for alarm (e.g., '3pm', '15:00', 'tomorrow at 7am')"
                        },
                        "label": {
                            "type": "string",
                            "description": "Optional label for the timer/alarm (e.g., 'Coffee break', 'Wake up')"
                        },
                        "timer_id": {
                            "type": "string",
                            "description": "Timer ID for cancel action"
                        }
                    },
                    "required": ["action"]
                }
            },
            capability=ToolCapability.ACTION,
            priority=1
        )
        logger.info("✅ Timer/Alarm tool registered")
        registered_count += 1

    except ImportError as e:
        logger.warning(f"⚠️ Could not register Timer/Alarm tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Timer/Alarm tool registration failed: {e}")
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

        class TrackSavingsTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "track_savings",
                    "Log money saved by PAM for the user (cheaper gas, better campground deals, route optimization, etc.). Critical for ROI tracking - PAM aims to pay for herself at $10/month.",
                    capabilities=[ToolCapability.FINANCIAL]
                )
                self.track_savings_func = track_savings

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.track_savings_func(user_id=user_id, **parameters)

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

        class AnalyzeBudgetTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "analyze_budget",
                    "Analyze user's budget and provide insights (spending trends, budget adherence, category breakdowns, recommendations). Use when user asks about budget status or financial health.",
                    capabilities=[ToolCapability.FINANCIAL]
                )
                self.analyze_budget_func = analyze_budget

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.analyze_budget_func(user_id=user_id, **parameters)

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

        class CompareVsBudgetTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "compare_vs_budget",
                    "Compare actual spending vs planned budget. Shows if user is over/under budget by category. Use when user asks 'am I on track?' or 'am I over budget?'",
                    capabilities=[ToolCapability.FINANCIAL]
                )
                self.compare_vs_budget_func = compare_vs_budget

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.compare_vs_budget_func(user_id=user_id, **parameters)

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
            capability=ToolCapability.FINANCIAL,
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

        class PredictEndOfMonthTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "predict_end_of_month",
                    "Forecast spending through end of month based on current trends. Predicts if user will stay under budget. Use when user asks 'will I stay under budget?' or 'what will I spend this month?'",
                    capabilities=[ToolCapability.FINANCIAL]
                )
                self.predict_end_of_month_func = predict_end_of_month

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.predict_end_of_month_func(user_id=user_id, **parameters)

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
            capability=ToolCapability.FINANCIAL,
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

        class FindSavingsOpportunitiesTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "find_savings_opportunities",
                    "AI-powered analysis to find money-saving opportunities based on spending patterns. Suggests where user can cut costs. Use when user asks 'where can I save money?' or 'how can I reduce spending?'",
                    capabilities=[ToolCapability.FINANCIAL]
                )
                self.find_savings_opportunities_func = find_savings_opportunities

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.find_savings_opportunities_func(user_id=user_id, **parameters)

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
            capability=ToolCapability.FINANCIAL,
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

        class FindCheapGasTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "find_cheap_gas",
                    "Find cheapest gas stations near a location. Returns prices, distances, and station details. Critical for user savings - gas is major RV expense. Use when user asks about gas prices or fuel.",
                    capabilities=[ToolCapability.TRIP_PLANNING]
                )
                self.find_cheap_gas_func = find_cheap_gas

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.find_cheap_gas_func(user_id=user_id, **parameters)

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
            capability=ToolCapability.TRIP_PLANNING,
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

        class OptimizeRouteTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "optimize_route",
                    "Find most cost-effective route between multiple stops. Minimizes fuel costs and considers RV constraints (height, weight, tolls). Use for multi-stop trip planning.",
                    capabilities=[ToolCapability.TRIP_PLANNING]
                )
                self.optimize_route_func = optimize_route

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.optimize_route_func(user_id=user_id, **parameters)

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
            capability=ToolCapability.TRIP_PLANNING,
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

        class GetRoadConditionsTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_road_conditions",
                    "Check road conditions, closures, traffic, and hazards for a route. Critical for RV safety. Use when user asks about road status or travel safety.",
                    capabilities=[ToolCapability.TRIP_PLANNING]
                )
                self.get_road_conditions_func = get_road_conditions

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.get_road_conditions_func(user_id=user_id, **parameters)

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
            capability=ToolCapability.TRIP_PLANNING,
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

        class EstimateTravelTimeTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "estimate_travel_time",
                    "Calculate travel duration between locations, accounting for RV speed limits, breaks, and traffic. Use when user asks 'how long will it take?' or 'when will I arrive?'",
                    capabilities=[ToolCapability.TRIP_PLANNING]
                )
                self.estimate_travel_time_func = estimate_travel_time

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.estimate_travel_time_func(user_id=user_id, **parameters)

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
            capability=ToolCapability.TRIP_PLANNING,
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

        class UpdateCalendarEventTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "update_calendar_event",
                    "Modify an existing calendar event (change time, location, description, etc.). User must provide event ID or enough details to identify the event.",
                    capabilities=[ToolCapability.ACTION]
                )
                self.update_calendar_event_func = update_calendar_event

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.update_calendar_event_func(user_id=user_id, **parameters)

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

        class DeleteCalendarEventTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "delete_calendar_event",
                    "Delete a calendar event permanently. User must provide event ID or enough details to identify the event to delete.",
                    capabilities=[ToolCapability.ACTION]
                )
                self.delete_calendar_event_func = delete_calendar_event

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.delete_calendar_event_func(user_id=user_id, **parameters)

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

    # ===============================
    # SOCIAL TOOLS (10 tools)
    # Critical for: Community features
    # ===============================

    # Social Tool: Create Post
    try:
        logger.debug("🔄 Attempting to register Create Post tool...")
        create_post = lazy_import("app.services.pam.tools.social.create_post", "create_post")

        if create_post is None:
            raise ImportError("create_post function not available")

        class CreatePostTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "create_post",
                    "Create a social post to share with the RV community. Use when user wants to share travel updates, photos, or tips.",
                    capabilities=[ToolCapability.SOCIAL]
                )
                self.create_post_func = create_post

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.create_post_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=CreatePostTool(),
            function_definition={
                "name": "create_post",
                "description": "Create a social post to share with the RV community. Use when user wants to share travel updates, photos, or tips.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "content": {
                            "type": "string",
                            "description": "Post content (required)"
                        },
                        "title": {
                            "type": "string",
                            "description": "Optional post title"
                        },
                        "location": {
                            "type": "string",
                            "description": "Location tag"
                        },
                        "image_url": {
                            "type": "string",
                            "description": "URL of image to attach"
                        },
                        "tags": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Tags for the post"
                        }
                    },
                    "required": ["content"]
                }
            },
            capability=ToolCapability.SOCIAL,
            priority=2
        )
        logger.info("✅ Create Post tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Create Post tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Create Post tool registration failed: {e}")
        failed_count += 1

    # Social Tool: Get Feed
    try:
        logger.debug("🔄 Attempting to register Get Feed tool...")
        get_feed = lazy_import("app.services.pam.tools.social.get_feed", "get_feed")

        if get_feed is None:
            raise ImportError("get_feed function not available")

        class GetFeedTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_feed",
                    "Get the social feed showing posts from followed users and the community. Use when user wants to see what others are posting.",
                    capabilities=[ToolCapability.SOCIAL]
                )
                self.get_feed_func = get_feed

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.get_feed_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=GetFeedTool(),
            function_definition={
                "name": "get_feed",
                "description": "Get the social feed showing posts from followed users and the community. Use when user wants to see what others are posting.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "limit": {
                            "type": "integer",
                            "description": "Number of posts to return (default: 20)"
                        },
                        "offset": {
                            "type": "integer",
                            "description": "Pagination offset"
                        }
                    }
                }
            },
            capability=ToolCapability.SOCIAL,
            priority=2
        )
        logger.info("✅ Get Feed tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Get Feed tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Get Feed tool registration failed: {e}")
        failed_count += 1

    # Social Tool: Like Post
    try:
        logger.debug("🔄 Attempting to register Like Post tool...")
        like_post = lazy_import("app.services.pam.tools.social.like_post", "like_post")

        if like_post is None:
            raise ImportError("like_post function not available")

        class LikePostTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "like_post",
                    "Like or unlike a social post. Use when user wants to show appreciation for content.",
                    capabilities=[ToolCapability.SOCIAL]
                )
                self.like_post_func = like_post

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.like_post_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=LikePostTool(),
            function_definition={
                "name": "like_post",
                "description": "Like or unlike a social post. Use when user wants to show appreciation for content.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "post_id": {
                            "type": "string",
                            "description": "ID of the post to like"
                        }
                    },
                    "required": ["post_id"]
                }
            },
            capability=ToolCapability.SOCIAL,
            priority=2
        )
        logger.info("✅ Like Post tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Like Post tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Like Post tool registration failed: {e}")
        failed_count += 1

    # Social Tool: Comment on Post
    try:
        logger.debug("🔄 Attempting to register Comment on Post tool...")
        comment_on_post = lazy_import("app.services.pam.tools.social.comment_on_post", "comment_on_post")

        if comment_on_post is None:
            raise ImportError("comment_on_post function not available")

        class CommentOnPostTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "comment_on_post",
                    "Add a comment to a social post. Use when user wants to respond to someone's content.",
                    capabilities=[ToolCapability.SOCIAL]
                )
                self.comment_on_post_func = comment_on_post

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.comment_on_post_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=CommentOnPostTool(),
            function_definition={
                "name": "comment_on_post",
                "description": "Add a comment to a social post. Use when user wants to respond to someone's content.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "post_id": {
                            "type": "string",
                            "description": "ID of the post to comment on"
                        },
                        "content": {
                            "type": "string",
                            "description": "Comment content"
                        }
                    },
                    "required": ["post_id", "content"]
                }
            },
            capability=ToolCapability.SOCIAL,
            priority=2
        )
        logger.info("✅ Comment on Post tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Comment on Post tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Comment on Post tool registration failed: {e}")
        failed_count += 1

    # Social Tool: Find Nearby RVers
    try:
        logger.debug("🔄 Attempting to register Find Nearby RVers tool...")
        find_nearby_rvers = lazy_import("app.services.pam.tools.social.find_nearby_rvers", "find_nearby_rvers")

        if find_nearby_rvers is None:
            raise ImportError("find_nearby_rvers function not available")

        class FindNearbyRversTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "find_nearby_rvers",
                    "Find other RV travelers near the user's location. Great for meetups and community connections.",
                    capabilities=[ToolCapability.SOCIAL]
                )
                self.find_nearby_rvers_func = find_nearby_rvers

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.find_nearby_rvers_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=FindNearbyRversTool(),
            function_definition={
                "name": "find_nearby_rvers",
                "description": "Find other RV travelers near the user's location. Great for meetups and community connections.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "latitude": {
                            "type": "number",
                            "description": "User's latitude"
                        },
                        "longitude": {
                            "type": "number",
                            "description": "User's longitude"
                        },
                        "radius_miles": {
                            "type": "number",
                            "description": "Search radius in miles (default: 50)"
                        }
                    },
                    "required": ["latitude", "longitude"]
                }
            },
            capability=ToolCapability.SOCIAL,
            priority=2
        )
        logger.info("✅ Find Nearby RVers tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Find Nearby RVers tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Find Nearby RVers tool registration failed: {e}")
        failed_count += 1

    # ===============================
    # SHOP TOOLS (3 tools)
    # Critical for: Product recommendations
    # ===============================

    # Shop Tool: Search Products
    try:
        logger.debug("🔄 Attempting to register Search Products tool...")
        search_products = lazy_import("app.services.pam.tools.shop.search_products", "search_products")

        if search_products is None:
            raise ImportError("search_products function not available")

        class SearchProductsTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "search_products",
                    "Search for RV products and gear. Returns Amazon affiliate products with prices and links.",
                    capabilities=[ToolCapability.SHOP]
                )
                self.search_products_func = search_products

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.search_products_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=SearchProductsTool(),
            function_definition={
                "name": "search_products",
                "description": "Search for RV products and gear. Returns Amazon affiliate products with prices and links.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query for products"
                        },
                        "category": {
                            "type": "string",
                            "description": "Product category: recovery_gear (winches, straps), camping_expedition (tents, outdoor), tools_maintenance (tools, equipment), parts_upgrades (vehicle parts), books_manuals (guides, manuals), apparel_merchandise (clothing, merch), electronics (cameras, GPS, tech), outdoor_gear (general outdoor)",
                            "enum": ["recovery_gear", "camping_expedition", "tools_maintenance", "parts_upgrades", "books_manuals", "apparel_merchandise", "electronics", "outdoor_gear"]
                        },
                        "max_price": {
                            "type": "number",
                            "description": "Maximum price filter"
                        },
                        "min_price": {
                            "type": "number",
                            "description": "Minimum price filter"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum results (default: 20)"
                        }
                    },
                    "required": ["query"]
                }
            },
            capability=ToolCapability.EXTERNAL_API,
            priority=2
        )
        logger.info("✅ Search Products tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Search Products tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Search Products tool registration failed: {e}")
        failed_count += 1

    # Shop Tool: Get Product Details
    try:
        logger.debug("🔄 Attempting to register Get Product Details tool...")
        get_product_details = lazy_import("app.services.pam.tools.shop.get_product_details", "get_product_details")

        if get_product_details is None:
            raise ImportError("get_product_details function not available")

        class GetProductDetailsTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_product_details",
                    "Get detailed information about a specific product including description, price, and purchase link.",
                    capabilities=[ToolCapability.SHOP]
                )
                self.get_product_details_func = get_product_details

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.get_product_details_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=GetProductDetailsTool(),
            function_definition={
                "name": "get_product_details",
                "description": "Get detailed information about a specific product including description, price, and purchase link.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "product_id": {
                            "type": "string",
                            "description": "ID of the product to get details for"
                        }
                    },
                    "required": ["product_id"]
                }
            },
            capability=ToolCapability.SHOP,
            priority=2
        )
        logger.info("✅ Get Product Details tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Get Product Details tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Get Product Details tool registration failed: {e}")
        failed_count += 1

    # Shop Tool: Recommend Products
    try:
        logger.debug("🔄 Attempting to register Recommend Products tool...")
        recommend_products = lazy_import("app.services.pam.tools.shop.recommend_products", "recommend_products")

        if recommend_products is None:
            raise ImportError("recommend_products function not available")

        class RecommendProductsTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "recommend_products",
                    "Get personalized product recommendations based on user's vehicle, travel style, and past purchases.",
                    capabilities=[ToolCapability.SHOP]
                )
                self.recommend_products_func = recommend_products

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.recommend_products_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=RecommendProductsTool(),
            function_definition={
                "name": "recommend_products",
                "description": "Get personalized product recommendations based on user's vehicle, travel style, and past purchases.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "description": "Product category for recommendations"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Number of recommendations (default: 5)"
                        }
                    }
                }
            },
            capability=ToolCapability.SHOP,
            priority=2
        )
        logger.info("✅ Recommend Products tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Recommend Products tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Recommend Products tool registration failed: {e}")
        failed_count += 1

    # ===============================
    # PROFILE TOOLS (6 tools)
    # Critical for: User management
    # ===============================

    # Profile Tool: Update Profile
    try:
        logger.debug("🔄 Attempting to register Update Profile tool...")
        update_profile = lazy_import("app.services.pam.tools.profile.update_profile", "update_profile")

        if update_profile is None:
            raise ImportError("update_profile function not available")

        class UpdateProfileTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "update_profile",
                    "Update user's profile information (username, bio, avatar, RV details). Use when user wants to change their profile.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.update_profile_func = update_profile

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.update_profile_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=UpdateProfileTool(),
            function_definition={
                "name": "update_profile",
                "description": "Update user's profile information (username, bio, avatar, RV details). Use when user wants to change their profile.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "username": {
                            "type": "string",
                            "description": "New username"
                        },
                        "bio": {
                            "type": "string",
                            "description": "Profile bio"
                        },
                        "avatar_url": {
                            "type": "string",
                            "description": "Avatar image URL"
                        },
                        "location": {
                            "type": "string",
                            "description": "Home location"
                        },
                        "rv_type": {
                            "type": "string",
                            "description": "Type of RV"
                        },
                        "rv_year": {
                            "type": "integer",
                            "description": "Year of RV"
                        }
                    }
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ Update Profile tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Update Profile tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Update Profile tool registration failed: {e}")
        failed_count += 1

    # Profile Tool: Get User Stats
    try:
        logger.debug("🔄 Attempting to register Get User Stats tool...")
        get_user_stats = lazy_import("app.services.pam.tools.profile.get_user_stats", "get_user_stats")

        if get_user_stats is None:
            raise ImportError("get_user_stats function not available")

        class GetUserStatsTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_user_stats",
                    "Get user's activity statistics including trips taken, miles traveled, money saved, posts made, etc.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.get_user_stats_func = get_user_stats

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.get_user_stats_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=GetUserStatsTool(),
            function_definition={
                "name": "get_user_stats",
                "description": "Get user's activity statistics including trips taken, miles traveled, money saved, posts made, etc.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "period": {
                            "type": "string",
                            "description": "Time period for stats (week, month, year, all)",
                            "enum": ["week", "month", "year", "all"]
                        }
                    }
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ Get User Stats tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Get User Stats tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Get User Stats tool registration failed: {e}")
        failed_count += 1

    # ===============================
    # ADMIN TOOLS (2 tools)
    # Critical for: Knowledge management
    # ===============================

    # Admin Tool: Add Knowledge
    try:
        logger.debug("🔄 Attempting to register Add Knowledge tool...")
        add_knowledge = lazy_import("app.services.pam.tools.admin.add_knowledge", "add_knowledge")

        if add_knowledge is None:
            raise ImportError("add_knowledge function not available")

        class AddKnowledgeTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "add_knowledge",
                    "ADMIN ONLY: Add knowledge to PAM's memory. Use when admin wants to teach PAM new information.",
                    capabilities=[ToolCapability.MEMORY]
                )
                self.add_knowledge_func = add_knowledge

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.add_knowledge_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=AddKnowledgeTool(),
            function_definition={
                "name": "add_knowledge",
                "description": "ADMIN ONLY: Add knowledge to PAM's memory. Use when admin wants to teach PAM new information.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "Short title for the knowledge"
                        },
                        "content": {
                            "type": "string",
                            "description": "The knowledge content"
                        },
                        "knowledge_type": {
                            "type": "string",
                            "description": "Type of knowledge",
                            "enum": ["location_tip", "travel_rule", "seasonal_advice", "general_knowledge", "policy", "warning"]
                        },
                        "category": {
                            "type": "string",
                            "description": "Category",
                            "enum": ["travel", "budget", "social", "shop", "general"]
                        },
                        "location_context": {
                            "type": "string",
                            "description": "Location this applies to"
                        },
                        "priority": {
                            "type": "integer",
                            "description": "Priority 1-10 (10=highest)"
                        },
                        "tags": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Searchable tags"
                        }
                    },
                    "required": ["title", "content", "knowledge_type", "category"]
                }
            },
            capability=ToolCapability.MEMORY,
            priority=1
        )
        logger.info("✅ Add Knowledge tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Add Knowledge tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Add Knowledge tool registration failed: {e}")
        failed_count += 1

    # Admin Tool: Search Knowledge
    try:
        logger.debug("🔄 Attempting to register Search Knowledge tool...")
        search_knowledge = lazy_import("app.services.pam.tools.admin.search_knowledge", "search_knowledge")

        if search_knowledge is None:
            raise ImportError("search_knowledge function not available")

        class SearchKnowledgeTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "search_knowledge",
                    "Search PAM's knowledge base for relevant information. Use to find tips, rules, and advice.",
                    capabilities=[ToolCapability.MEMORY]
                )
                self.search_knowledge_func = search_knowledge

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.search_knowledge_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=SearchKnowledgeTool(),
            function_definition={
                "name": "search_knowledge",
                "description": "Search PAM's knowledge base for relevant information. Use to find tips, rules, and advice.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query"
                        },
                        "category": {
                            "type": "string",
                            "description": "Filter by category"
                        },
                        "location": {
                            "type": "string",
                            "description": "Filter by location"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Max results (default: 10)"
                        }
                    },
                    "required": ["query"]
                }
            },
            capability=ToolCapability.MEMORY,
            priority=1
        )
        logger.info("✅ Search Knowledge tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Search Knowledge tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Search Knowledge tool registration failed: {e}")
        failed_count += 1

    # ===============================
    # COMMUNITY TOOLS (2 tools)
    # Critical for: Community tips
    # ===============================

    # Community Tool: Submit Tip
    try:
        logger.debug("🔄 Attempting to register Submit Tip tool...")
        submit_community_tip = lazy_import("app.services.pam.tools.community.submit_tip", "submit_community_tip")

        if submit_community_tip is None:
            raise ImportError("submit_community_tip function not available")

        class SubmitTipTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "submit_community_tip",
                    "Submit a tip to help other RV travelers. Tips become part of PAM's knowledge base.",
                    capabilities=[ToolCapability.SOCIAL]
                )
                self.submit_community_tip_func = submit_community_tip

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.submit_community_tip_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=SubmitTipTool(),
            function_definition={
                "name": "submit_community_tip",
                "description": "Submit a tip to help other RV travelers. Tips become part of PAM's knowledge base.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "Short title for the tip"
                        },
                        "content": {
                            "type": "string",
                            "description": "Full tip content"
                        },
                        "category": {
                            "type": "string",
                            "description": "Category (camping, gas_savings, route_planning, etc)"
                        },
                        "location_name": {
                            "type": "string",
                            "description": "Location this tip applies to"
                        },
                        "tags": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Searchable tags"
                        }
                    },
                    "required": ["title", "content", "category"]
                }
            },
            capability=ToolCapability.ACTION,
            priority=2
        )
        logger.info("✅ Submit Tip tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Submit Tip tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Submit Tip tool registration failed: {e}")
        failed_count += 1

    # Community Tool: Search Tips
    try:
        logger.debug("🔄 Attempting to register Search Tips tool...")
        search_tips = lazy_import("app.services.pam.tools.community.search_tips", "search_tips")

        if search_tips is None:
            raise ImportError("search_tips function not available")

        class SearchTipsTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "search_tips",
                    "Search community tips for helpful advice. Use to find recommendations from other RVers.",
                    capabilities=[ToolCapability.SOCIAL]
                )
                self.search_tips_func = search_tips

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.search_tips_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=SearchTipsTool(),
            function_definition={
                "name": "search_tips",
                "description": "Search community tips for helpful advice. Use to find recommendations from other RVers.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query"
                        },
                        "category": {
                            "type": "string",
                            "description": "Filter by category"
                        },
                        "location": {
                            "type": "string",
                            "description": "Filter by location"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Max results (default: 10)"
                        }
                    },
                    "required": ["query"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ Search Tips tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Search Tips tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Search Tips tool registration failed: {e}")
        failed_count += 1

    # Community Tool: Search Knowledge
    try:
        logger.debug("🔄 Attempting to register Search Knowledge tool...")
        search_knowledge_func = lazy_import("app.services.pam.tools.community.search_knowledge", "search_knowledge")

        if search_knowledge_func is None:
            raise ImportError("search_knowledge function not available")

        class SearchKnowledgeTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "search_knowledge",
                    "Search approved community knowledge articles and guides. Use to find in-depth guides on shipping, maintenance, travel tips, camping, and routes.",
                    capabilities=[ToolCapability.MEMORY]
                )
                self.search_knowledge_func = search_knowledge_func

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.search_knowledge_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=SearchKnowledgeTool(),
            function_definition={
                "name": "search_knowledge",
                "description": "Search approved community knowledge articles and guides. Use to find in-depth guides on shipping, maintenance, travel tips, camping, and routes.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query (keywords)"
                        },
                        "category": {
                            "type": "string",
                            "enum": ["shipping", "maintenance", "travel_tips", "camping", "routes", "general"],
                            "description": "Filter by category"
                        },
                        "difficulty": {
                            "type": "string",
                            "enum": ["beginner", "intermediate", "advanced"],
                            "description": "Filter by difficulty level"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Max results (default: 5)"
                        }
                    },
                    "required": ["query"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ Search Knowledge tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Search Knowledge tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Search Knowledge tool registration failed: {e}")
        failed_count += 1

    # Community Tool: Get Knowledge Article
    try:
        logger.debug("🔄 Attempting to register Get Knowledge Article tool...")
        get_knowledge_article_func = lazy_import("app.services.pam.tools.community.search_knowledge", "get_knowledge_article")

        if get_knowledge_article_func is None:
            raise ImportError("get_knowledge_article function not available")

        class GetKnowledgeArticleTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_knowledge_article",
                    "Get a specific knowledge article by ID with full content, tips, and related information.",
                    capabilities=[ToolCapability.MEMORY]
                )
                self.get_knowledge_article_func = get_knowledge_article

            async def initialize(self):
                self.is_initialized = True
                return True
            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.get_knowledge_article_func(**parameters)

        registry.register_tool(
            tool=GetKnowledgeArticleTool(),
            function_definition={
                "name": "get_knowledge_article",
                "description": "Get full details of a specific knowledge article by ID. Use after search_knowledge to get complete content.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "article_id": {
                            "type": "string",
                            "description": "UUID of the article"
                        }
                    },
                    "required": ["article_id"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=3
        )
        logger.info("✅ Get Knowledge Article tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Get Knowledge Article tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Get Knowledge Article tool registration failed: {e}")
        failed_count += 1

    # Community Tool: Get Knowledge by Category
    try:
        logger.debug("🔄 Attempting to register Get Knowledge by Category tool...")
        get_knowledge_by_category_func = lazy_import("app.services.pam.tools.community.search_knowledge", "get_knowledge_by_category")

        if get_knowledge_by_category_func is None:
            raise ImportError("get_knowledge_by_category function not available")

        class GetKnowledgeByCategoryTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_knowledge_by_category",
                    "Get all knowledge articles in a specific category. Browse topics like shipping, maintenance, travel tips, camping, and routes.",
                    capabilities=[ToolCapability.MEMORY]
                )
                self.get_knowledge_by_category_func = get_knowledge_by_category

            async def initialize(self):
                self.is_initialized = True
                return True
            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.get_knowledge_by_category_func(**parameters)

        registry.register_tool(
            tool=GetKnowledgeByCategoryTool(),
            function_definition={
                "name": "get_knowledge_by_category",
                "description": "Browse top knowledge articles in a specific category. Use to show popular guides in shipping, maintenance, etc.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "enum": ["shipping", "maintenance", "travel_tips", "camping", "routes", "general"],
                            "description": "Category to browse"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Max results (default: 10)"
                        }
                    },
                    "required": ["category"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=3
        )
        logger.info("✅ Get Knowledge by Category tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Get Knowledge by Category tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Get Knowledge by Category tool registration failed: {e}")
        failed_count += 1

    # ===============================
    # ADDITIONAL TRIP TOOLS (4 tools)
    # Critical for: Trip planning
    # ===============================

    # Trip Tool: Find RV Parks
    try:
        logger.debug("🔄 Attempting to register Find RV Parks tool...")
        find_rv_parks = lazy_import("app.services.pam.tools.trip.find_rv_parks", "find_rv_parks")

        if find_rv_parks is None:
            raise ImportError("find_rv_parks function not available")

        class FindRVParksTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "find_rv_parks",
                    "Search for RV parks and campgrounds near a location. Filter by amenities, price, and ratings.",
                    capabilities=[ToolCapability.TRIP_PLANNING]
                )
                self.find_rv_parks_func = find_rv_parks

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.find_rv_parks_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=FindRVParksTool(),
            function_definition={
                "name": "find_rv_parks",
                "description": "Search for RV parks and campgrounds near a location. Filter by amenities, price, and ratings.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "Location to search near"
                        },
                        "latitude": {
                            "type": "number",
                            "description": "Latitude for search"
                        },
                        "longitude": {
                            "type": "number",
                            "description": "Longitude for search"
                        },
                        "radius_miles": {
                            "type": "number",
                            "description": "Search radius in miles (default: 50)"
                        },
                        "amenities": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Required amenities (hookups, wifi, pool, etc)"
                        },
                        "max_price": {
                            "type": "number",
                            "description": "Maximum price per night"
                        }
                    }
                }
            },
            capability=ToolCapability.LOCATION_SEARCH,
            priority=1
        )
        logger.info("✅ Find RV Parks tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Find RV Parks tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Find RV Parks tool registration failed: {e}")
        failed_count += 1

    # Trip Tool: Plan Trip
    try:
        logger.debug("🔄 Attempting to register Plan Trip tool...")
        plan_trip = lazy_import("app.services.pam.tools.trip.plan_trip", "plan_trip")

        if plan_trip is None:
            raise ImportError("plan_trip function not available")

        class PlanTripTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "plan_trip",
                    "Create a comprehensive trip plan with route, stops, accommodations, and estimated costs.",
                    capabilities=[ToolCapability.TRIP_PLANNING]
                )
                self.plan_trip_func = plan_trip

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.plan_trip_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=PlanTripTool(),
            function_definition={
                "name": "plan_trip",
                "description": "Create a comprehensive trip plan with routes, stops, budget estimates, and campground suggestions.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "origin": {
                            "type": "string",
                            "description": "Starting location"
                        },
                        "destination": {
                            "type": "string",
                            "description": "Destination"
                        },
                        "budget": {
                            "type": "number",
                            "description": "Total budget for the trip"
                        },
                        "start_date": {
                            "type": "string",
                            "description": "Trip start date (YYYY-MM-DD)"
                        },
                        "end_date": {
                            "type": "string",
                            "description": "Trip end date (YYYY-MM-DD)"
                        },
                        "waypoints": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Stops along the way"
                        }
                    },
                    "required": ["origin", "destination"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Plan Trip tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Plan Trip tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Plan Trip tool registration failed: {e}")
        failed_count += 1

    # Trip Tool: Find Attractions
    try:
        logger.debug("🔄 Attempting to register Find Attractions tool...")
        find_attractions = lazy_import("app.services.pam.tools.trip.find_attractions", "find_attractions")

        if find_attractions is None:
            raise ImportError("find_attractions function not available")

        class FindAttractionsTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "find_attractions",
                    "Find tourist attractions, points of interest, and activities near a location. Great for discovering things to do along your route.",
                    capabilities=[ToolCapability.TRIP_PLANNING]
                )
                self.find_attractions_func = find_attractions

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.find_attractions_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=FindAttractionsTool(),
            function_definition={
                "name": "find_attractions",
                "description": "Discover points of interest, national parks, scenic routes, and activities near a location.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "Location to search near"
                        },
                        "latitude": {
                            "type": "number",
                            "description": "Latitude"
                        },
                        "longitude": {
                            "type": "number",
                            "description": "Longitude"
                        },
                        "radius_miles": {
                            "type": "number",
                            "description": "Search radius (default: 50)"
                        },
                        "types": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Types of attractions (national_park, scenic_route, museum, etc)"
                        }
                    }
                }
            },
            capability=ToolCapability.LOCATION_SEARCH,
            priority=2
        )
        logger.info("✅ Find Attractions tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Find Attractions tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Find Attractions tool registration failed: {e}")
        failed_count += 1

    # Trip Tool: Calculate Gas Cost
    try:
        logger.debug("🔄 Attempting to register Calculate Gas Cost tool...")
        calculate_gas_cost = lazy_import("app.services.pam.tools.trip.calculate_gas_cost", "calculate_gas_cost")

        if calculate_gas_cost is None:
            raise ImportError("calculate_gas_cost function not available")

        class CalculateGasCostTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "calculate_gas_cost",
                    "Calculate estimated fuel costs for a trip based on distance, vehicle mpg, and current gas prices.",
                    capabilities=[ToolCapability.FINANCIAL]
                )
                self.calculate_gas_cost_func = calculate_gas_cost

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.calculate_gas_cost_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=CalculateGasCostTool(),
            function_definition={
                "name": "calculate_gas_cost",
                "description": "Calculate estimated fuel costs for a trip based on distance, MPG, and current gas prices.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "distance_miles": {
                            "type": "number",
                            "description": "Distance in miles"
                        },
                        "mpg": {
                            "type": "number",
                            "description": "Vehicle MPG (uses profile default if not specified)"
                        },
                        "gas_price": {
                            "type": "number",
                            "description": "Gas price per gallon (uses current average if not specified)"
                        }
                    },
                    "required": ["distance_miles"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Calculate Gas Cost tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Calculate Gas Cost tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Calculate Gas Cost tool registration failed: {e}")
        failed_count += 1

    # ===============================
    # ADDITIONAL BUDGET TOOLS (3 tools)
    # Critical for: Financial management
    # ===============================

    # Budget Tool: Create Expense
    try:
        logger.debug("🔄 Attempting to register Create Expense tool...")
        create_expense = lazy_import("app.services.pam.tools.budget.create_expense", "create_expense")

        if create_expense is None:
            raise ImportError("create_expense function not available")

        class CreateExpenseTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "create_expense",
                    "Log a new expense for budget tracking. Automatically categorizes and updates spending totals.",
                    capabilities=[ToolCapability.FINANCIAL]
                )
                self.create_expense_func = create_expense

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.create_expense_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=CreateExpenseTool(),
            function_definition={
                "name": "create_expense",
                "description": "Log a new expense. Use when user mentions spending money or buying something.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "amount": {
                            "type": "number",
                            "description": "Expense amount in dollars"
                        },
                        "category": {
                            "type": "string",
                            "description": "Category (fuel, food, accommodation, maintenance, etc)"
                        },
                        "description": {
                            "type": "string",
                            "description": "Description of the expense"
                        },
                        "date": {
                            "type": "string",
                            "description": "Date of expense (YYYY-MM-DD, defaults to today)"
                        },
                        "location": {
                            "type": "string",
                            "description": "Where the expense occurred"
                        }
                    },
                    "required": ["amount", "category"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Create Expense tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Create Expense tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Create Expense tool registration failed: {e}")
        failed_count += 1

    # Budget Tool: Get Spending Summary
    try:
        logger.debug("🔄 Attempting to register Get Spending Summary tool...")
        get_spending_summary = lazy_import("app.services.pam.tools.budget.get_spending_summary", "get_spending_summary")

        if get_spending_summary is None:
            raise ImportError("get_spending_summary function not available")

        class GetSpendingSummaryTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_spending_summary",
                    "Get a summary of spending by category for a specified time period. Shows totals and trends.",
                    capabilities=[ToolCapability.FINANCIAL]
                )
                self.get_spending_summary_func = get_spending_summary

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.get_spending_summary_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=GetSpendingSummaryTool(),
            function_definition={
                "name": "get_spending_summary",
                "description": "Get a summary of spending by category and time period. Use when user asks about their spending.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "period": {
                            "type": "string",
                            "description": "Time period (week, month, quarter, year)",
                            "enum": ["week", "month", "quarter", "year"]
                        },
                        "category": {
                            "type": "string",
                            "description": "Filter by specific category"
                        }
                    }
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Get Spending Summary tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Get Spending Summary tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Get Spending Summary tool registration failed: {e}")
        failed_count += 1

    # Budget Tool: Update Budget
    try:
        logger.debug("🔄 Attempting to register Update Budget tool...")
        update_budget = lazy_import("app.services.pam.tools.budget.update_budget", "update_budget")

        if update_budget is None:
            raise ImportError("update_budget function not available")

        class UpdateBudgetTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "update_budget",
                    "Update or create budget limits for different spending categories. Set monthly or yearly limits.",
                    capabilities=[ToolCapability.FINANCIAL]
                )
                self.update_budget_func = update_budget

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.update_budget_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=UpdateBudgetTool(),
            function_definition={
                "name": "update_budget",
                "description": "Update or set budget limits for spending categories. Use when user wants to set or change budget.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "description": "Category to set budget for"
                        },
                        "amount": {
                            "type": "number",
                            "description": "Budget amount"
                        },
                        "period": {
                            "type": "string",
                            "description": "Budget period (monthly, weekly, yearly)",
                            "enum": ["monthly", "weekly", "yearly"]
                        }
                    },
                    "required": ["category", "amount"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=1
        )
        logger.info("✅ Update Budget tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Update Budget tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Update Budget tool registration failed: {e}")
        failed_count += 1

    # Meal Planning Tools
    try:
        logger.debug("🔄 Attempting to register Save Recipe tool...")
        save_recipe = lazy_import("app.services.pam.tools.meals.save_recipe", "save_recipe")

        if save_recipe is None:
            raise ImportError("save_recipe function not available")

        class SaveRecipeTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "save_recipe",
                    "Save a recipe to the user's personal recipe collection. Include ingredients, instructions, and cooking notes.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.save_recipe_func = save_recipe

            async def initialize(self):
                self.is_initialized = True
                return True
            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.save_recipe_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=SaveRecipeTool(),
            function_definition={
                "name": "save_recipe",
                "description": "Save a recipe from YouTube video or website URL to user's collection. Automatically scrapes recipe data and adds nutrition info.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "url": {
                            "type": "string",
                            "description": "YouTube or recipe website URL"
                        },
                        "recipe_name": {
                            "type": "string",
                            "description": "Optional custom name for the recipe"
                        }
                    },
                    "required": ["url"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ Save Recipe tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Save Recipe tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Save Recipe tool registration failed: {e}")
        failed_count += 1

    # Meal Tool: Search Recipes
    try:
        logger.debug("🔄 Attempting to register Search Recipes tool...")
        search_recipes = lazy_import("app.services.pam.tools.meals.search_recipes", "search_recipes")

        if search_recipes is None:
            raise ImportError("search_recipes function not available")

        class SearchRecipesTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "search_recipes",
                    "Search recipes by ingredients, meal type, dietary restrictions, or cooking method. Find RV-friendly recipes.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.search_recipes_func = search_recipes

            async def initialize(self):
                self.is_initialized = True
                return True
            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.search_recipes_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=SearchRecipesTool(),
            function_definition={
                "name": "search_recipes",
                "description": "Search user's recipe collection by ingredients, meal type, dietary restrictions. Automatically enforces user's dietary restrictions and filters allergens.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Text query for recipe name or description"
                        },
                        "ingredients": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of ingredients to search for"
                        },
                        "meal_type": {
                            "type": "string",
                            "enum": ["breakfast", "lunch", "dinner", "snack"],
                            "description": "Filter by meal type"
                        },
                        "dietary_tags": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Filter by dietary tags (vegan, gluten-free, etc.)"
                        },
                        "max_prep_time": {
                            "type": "integer",
                            "description": "Maximum prep time in minutes"
                        },
                        "include_public": {
                            "type": "boolean",
                            "description": "Include public community recipes"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of results (default: 10)"
                        }
                    }
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ Search Recipes tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Search Recipes tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Search Recipes tool registration failed: {e}")
        failed_count += 1

    # Meal Tool: Share Recipe
    try:
        logger.debug("🔄 Attempting to register Share Recipe tool...")
        share_recipe = lazy_import("app.services.pam.tools.meals.share_recipe", "share_recipe")

        if share_recipe is None:
            raise ImportError("share_recipe function not available")

        class ShareRecipeTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "share_recipe",
                    "Share a recipe with the RV community. Other travelers can discover and save your recipe recommendations.",
                    capabilities=[ToolCapability.SOCIAL]
                )
                self.share_recipe_func = share_recipe

            async def initialize(self):
                self.is_initialized = True
                return True
            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.share_recipe_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=ShareRecipeTool(),
            function_definition={
                "name": "share_recipe",
                "description": "Share a recipe with friends or make it public in the community library.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "recipe_id": {
                            "type": "string",
                            "description": "UUID of the recipe to share"
                        },
                        "action": {
                            "type": "string",
                            "enum": ["share_with_friends", "make_public", "make_private"],
                            "description": "Sharing action to perform"
                        },
                        "friend_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of friend user IDs (required for share_with_friends)"
                        }
                    },
                    "required": ["recipe_id", "action"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ Share Recipe tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Share Recipe tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Share Recipe tool registration failed: {e}")
        failed_count += 1

    # Meal Tool: Manage Dietary Preferences
    try:
        logger.debug("🔄 Attempting to register Manage Dietary Preferences tool...")
        manage_dietary_prefs = lazy_import("app.services.pam.tools.meals.manage_dietary_prefs", "manage_dietary_prefs")

        if manage_dietary_prefs is None:
            raise ImportError("manage_dietary_prefs function not available")

        class ManageDietaryPrefsTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "manage_dietary_prefs",
                    "Manage user's dietary preferences and restrictions. Set allergies, dietary choices (vegan, keto, etc), and food preferences for better recipe recommendations.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.manage_dietary_prefs_func = manage_dietary_prefs

            async def initialize(self):
                self.is_initialized = True
                return True
            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.manage_dietary_prefs_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=ManageDietaryPrefsTool(),
            function_definition={
                "name": "manage_dietary_prefs",
                "description": "Manage user's dietary preferences, restrictions, allergies, and nutrition goals. Use when user mentions dietary restrictions or nutrition goals.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["set", "add", "remove", "get"],
                            "description": "Action to perform"
                        },
                        "dietary_restrictions": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of dietary restrictions (vegan, vegetarian, gluten-free, etc.)"
                        },
                        "allergies": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of allergies (peanuts, shellfish, etc.)"
                        },
                        "preferred_cuisines": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of preferred cuisines"
                        },
                        "disliked_ingredients": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of disliked ingredients"
                        },
                        "daily_calorie_goal": {
                            "type": "integer",
                            "description": "Daily calorie goal"
                        },
                        "daily_protein_goal": {
                            "type": "integer",
                            "description": "Daily protein goal (grams)"
                        },
                        "daily_carb_goal": {
                            "type": "integer",
                            "description": "Daily carb goal (grams)"
                        },
                        "daily_fat_goal": {
                            "type": "integer",
                            "description": "Daily fat goal (grams)"
                        }
                    },
                    "required": ["action"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ Manage Dietary Preferences tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Manage Dietary Preferences tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Manage Dietary Preferences tool registration failed: {e}")
        failed_count += 1

    # Meal Tool: Manage Pantry
    try:
        logger.debug("🔄 Attempting to register Manage Pantry tool...")
        manage_pantry = lazy_import("app.services.pam.tools.meals.manage_pantry", "manage_pantry")

        if manage_pantry is None:
            raise ImportError("manage_pantry function not available")

        class ManagePantryTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "manage_pantry",
                    "Manage RV pantry inventory. Add/remove items, track quantities, check expiration dates, and get suggestions for recipes based on available ingredients.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.manage_pantry_func = manage_pantry

            async def initialize(self):
                self.is_initialized = True
                return True
            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.manage_pantry_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=ManagePantryTool(),
            function_definition={
                "name": "manage_pantry",
                "description": "Manage pantry inventory with expiry dates. Use when user mentions pantry items, groceries, or checking what's expiring.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["add", "update", "remove", "list", "check_expiry"],
                            "description": "Pantry action to perform"
                        },
                        "ingredient_name": {
                            "type": "string",
                            "description": "Name of the ingredient"
                        },
                        "quantity": {
                            "type": "number",
                            "description": "Quantity of the ingredient"
                        },
                        "unit": {
                            "type": "string",
                            "description": "Unit of measurement (cups, lbs, oz, grams, etc.)"
                        },
                        "location": {
                            "type": "string",
                            "description": "Storage location (fridge, freezer, pantry)"
                        },
                        "expiry_date": {
                            "type": "string",
                            "description": "Expiry date (YYYY-MM-DD format)"
                        },
                        "item_id": {
                            "type": "string",
                            "description": "UUID of pantry item (for update/remove)"
                        }
                    },
                    "required": ["action"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ Manage Pantry tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Manage Pantry tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Manage Pantry tool registration failed: {e}")
        failed_count += 1

    # Meal Tool: Plan Meals
    try:
        logger.debug("🔄 Attempting to register Plan Meals tool...")
        plan_meals = lazy_import("app.services.pam.tools.meals.plan_meals", "plan_meals")

        if plan_meals is None:
            raise ImportError("plan_meals function not available")

        class PlanMealsTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "plan_meals",
                    "Plan meals for upcoming days/weeks based on pantry inventory, dietary preferences, and travel schedule. Create a meal calendar with recipes.",
                    capabilities=[ToolCapability.ACTION]
                )
                self.plan_meals_func = plan_meals

            async def initialize(self):
                self.is_initialized = True
                return True
            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.plan_meals_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=PlanMealsTool(),
            function_definition={
                "name": "plan_meals",
                "description": "Generate AI-powered meal plan for specified days using user's recipes and pantry items. Use when user asks to plan meals.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "days": {
                            "type": "integer",
                            "description": "Number of days to plan (default: 7)"
                        },
                        "meal_types": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of meal types to plan (default: breakfast, lunch, dinner)"
                        },
                        "use_pantry_items": {
                            "type": "boolean",
                            "description": "Whether to prioritize pantry items (default: true)"
                        },
                        "dietary_preferences": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Optional dietary preferences to enforce"
                        }
                    }
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ Plan Meals tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Plan Meals tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Plan Meals tool registration failed: {e}")
        failed_count += 1

    # Meal Tool: Generate Shopping List
    try:
        logger.debug("🔄 Attempting to register Generate Shopping List tool...")
        generate_shopping_list = lazy_import("app.services.pam.tools.meals.generate_shopping_list", "generate_shopping_list")

        if generate_shopping_list is None:
            raise ImportError("generate_shopping_list function not available")

        class GenerateShoppingListTool(BaseTool):
            def __init__(self):
                super().__init__(
                    "generate_shopping_list",
                    "Generate a shopping list based on planned meals and current pantry inventory. Includes quantities and suggests stores along the route.",
                    capabilities=[ToolCapability.ACTION]
                )
                self.generate_shopping_list_func = generate_shopping_list

            async def initialize(self):
                self.is_initialized = True
                return True
            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.generate_shopping_list_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=GenerateShoppingListTool(),
            function_definition={
                "name": "generate_shopping_list",
                "description": "Generate shopping list from meal plans, subtracting available pantry items. Use when user asks for shopping list.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "start_date": {
                            "type": "string",
                            "description": "Start date for meal plans (YYYY-MM-DD format)"
                        },
                        "end_date": {
                            "type": "string",
                            "description": "End date for meal plans (YYYY-MM-DD format)"
                        },
                        "meal_plan_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Optional list of specific meal plan IDs"
                        },
                        "list_name": {
                            "type": "string",
                            "description": "Optional custom name for the list"
                        }
                    }
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ Generate Shopping List tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register Generate Shopping List tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ Generate Shopping List tool registration failed: {e}")
        failed_count += 1

    # =========================================================================
    # TRANSITION SYSTEM TOOLS (PRD-PAM-001)
    # Tools for Life Transition Navigator module
    # =========================================================================

    # Get Transition Progress
    try:
        logger.debug("🔄 Attempting to register get_transition_progress tool...")
        from app.services.pam.tools.transition.progress_tools import get_transition_progress

        class GetTransitionProgressWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_transition_progress",
                    "Get overall transition readiness score and summary. Use when user asks about their transition progress, readiness, or departure preparation status.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.get_transition_progress_func = get_transition_progress

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.get_transition_progress_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=GetTransitionProgressWrapper(),
            function_definition={
                "name": "get_transition_progress",
                "description": "Get overall transition readiness score and summary. Use when user asks about their transition progress, readiness, or departure preparation status.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ get_transition_progress tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register get_transition_progress tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ get_transition_progress tool registration failed: {e}")
        failed_count += 1

    # Get Transition Tasks
    try:
        logger.debug("🔄 Attempting to register get_transition_tasks tool...")
        from app.services.pam.tools.transition.task_tools import get_transition_tasks

        class GetTransitionTasksWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_transition_tasks",
                    "List transition checklist tasks with optional filtering. Use when user asks about their transition tasks, checklist items, or what they need to do.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.get_transition_tasks_func = get_transition_tasks

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.get_transition_tasks_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=GetTransitionTasksWrapper(),
            function_definition={
                "name": "get_transition_tasks",
                "description": "List transition checklist tasks with optional filtering. Use when user asks about their transition tasks, checklist items, or what they need to do.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "enum": ["financial", "vehicle", "life", "downsizing", "equipment", "legal", "social", "custom"],
                            "description": "Filter by category"
                        },
                        "status": {
                            "type": "string",
                            "enum": ["pending", "in_progress", "completed", "overdue"],
                            "description": "Filter by status"
                        },
                        "priority": {
                            "type": "string",
                            "enum": ["critical", "high", "medium", "low"],
                            "description": "Filter by priority"
                        }
                    },
                    "required": []
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ get_transition_tasks tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register get_transition_tasks tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ get_transition_tasks tool registration failed: {e}")
        failed_count += 1

    # Create Transition Task
    try:
        logger.debug("🔄 Attempting to register create_transition_task tool...")
        from app.services.pam.tools.transition.task_tools import create_transition_task

        class CreateTransitionTaskWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "create_transition_task",
                    "Create a new transition checklist task. Use when user wants to add a task to their transition plan.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.create_transition_task_func = create_transition_task

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.create_transition_task_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=CreateTransitionTaskWrapper(),
            function_definition={
                "name": "create_transition_task",
                "description": "Create a new transition checklist task. Use when user wants to add a task to their transition plan.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "Task title"
                        },
                        "category": {
                            "type": "string",
                            "enum": ["financial", "vehicle", "life", "downsizing", "equipment", "legal", "social", "custom"],
                            "description": "Task category"
                        },
                        "priority": {
                            "type": "string",
                            "enum": ["critical", "high", "medium", "low"],
                            "description": "Task priority (default: medium)"
                        },
                        "description": {
                            "type": "string",
                            "description": "Detailed description"
                        },
                        "days_before_departure": {
                            "type": "integer",
                            "description": "Days before departure this should be completed"
                        },
                        "subtasks": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of subtask descriptions"
                        }
                    },
                    "required": ["title", "category"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ create_transition_task tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register create_transition_task tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ create_transition_task tool registration failed: {e}")
        failed_count += 1

    # Complete Transition Task
    try:
        logger.debug("🔄 Attempting to register complete_transition_task tool...")
        from app.services.pam.tools.transition.task_tools import complete_transition_task

        class CompleteTransitionTaskWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "complete_transition_task",
                    "Mark a transition task as complete. Use when user says they finished or completed a task.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.complete_transition_task_func = complete_transition_task

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.complete_transition_task_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=CompleteTransitionTaskWrapper(),
            function_definition={
                "name": "complete_transition_task",
                "description": "Mark a transition task as complete. Use when user says they finished or completed a task.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "task_id": {
                            "type": "string",
                            "description": "ID of the task to complete"
                        },
                        "task_title": {
                            "type": "string",
                            "description": "Title of the task (fuzzy match if ID not provided)"
                        },
                        "notes": {
                            "type": "string",
                            "description": "Completion notes"
                        }
                    },
                    "required": []
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ complete_transition_task tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register complete_transition_task tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ complete_transition_task tool registration failed: {e}")
        failed_count += 1

    # Log Shakedown Trip
    try:
        logger.debug("🔄 Attempting to register log_shakedown_trip tool...")
        from app.services.pam.tools.transition.shakedown_tools import log_shakedown_trip

        class LogShakedownTripWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "log_shakedown_trip",
                    "Log a practice/shakedown trip. Use when user wants to record a practice trip they took.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.log_shakedown_trip_func = log_shakedown_trip

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.log_shakedown_trip_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=LogShakedownTripWrapper(),
            function_definition={
                "name": "log_shakedown_trip",
                "description": "Log a practice/shakedown trip. Use when user wants to record a practice trip they took.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "trip_type": {
                            "type": "string",
                            "enum": ["weekend", "week", "extended"],
                            "description": "Type of trip"
                        },
                        "start_date": {
                            "type": "string",
                            "description": "Trip start date (YYYY-MM-DD)"
                        },
                        "end_date": {
                            "type": "string",
                            "description": "Trip end date (YYYY-MM-DD)"
                        },
                        "destination": {
                            "type": "string",
                            "description": "Where the trip went"
                        },
                        "confidence_rating": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 10,
                            "description": "How confident you feel after this trip (1-10)"
                        },
                        "notes": {
                            "type": "string",
                            "description": "Additional notes"
                        }
                    },
                    "required": ["trip_type", "start_date", "end_date"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ log_shakedown_trip tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register log_shakedown_trip tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ log_shakedown_trip tool registration failed: {e}")
        failed_count += 1

    # Add Shakedown Issue
    try:
        logger.debug("🔄 Attempting to register add_shakedown_issue tool...")
        from app.services.pam.tools.transition.shakedown_tools import add_shakedown_issue

        class AddShakedownIssueWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "add_shakedown_issue",
                    "Track a problem found during a shakedown trip. Use when user reports an issue from a practice trip.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.add_shakedown_issue_func = add_shakedown_issue

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.add_shakedown_issue_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=AddShakedownIssueWrapper(),
            function_definition={
                "name": "add_shakedown_issue",
                "description": "Track a problem found during a shakedown trip. Use when user reports an issue from a practice trip.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "enum": ["power", "water", "comfort", "storage", "driving", "other"],
                            "description": "Issue category"
                        },
                        "severity": {
                            "type": "string",
                            "enum": ["minor", "major", "critical"],
                            "description": "Issue severity"
                        },
                        "description": {
                            "type": "string",
                            "description": "Description of the issue"
                        },
                        "trip_id": {
                            "type": "string",
                            "description": "Associated trip ID (uses most recent if not provided)"
                        },
                        "solution": {
                            "type": "string",
                            "description": "How you fixed it (marks as resolved)"
                        },
                        "cost": {
                            "type": "number",
                            "description": "Cost to fix"
                        }
                    },
                    "required": ["category", "severity", "description"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ add_shakedown_issue tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register add_shakedown_issue tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ add_shakedown_issue tool registration failed: {e}")
        failed_count += 1

    # Get Shakedown Summary
    try:
        logger.debug("🔄 Attempting to register get_shakedown_summary tool...")
        from app.services.pam.tools.transition.shakedown_tools import get_shakedown_summary

        class GetShakedownSummaryWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_shakedown_summary",
                    "Get summary of shakedown trips and issues. Use when user asks about their practice trips or shakedown progress.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.get_shakedown_summary_func = get_shakedown_summary

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.get_shakedown_summary_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=GetShakedownSummaryWrapper(),
            function_definition={
                "name": "get_shakedown_summary",
                "description": "Get summary of shakedown trips and issues. Use when user asks about their practice trips or shakedown progress.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ get_shakedown_summary tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register get_shakedown_summary tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ get_shakedown_summary tool registration failed: {e}")
        failed_count += 1

    # Add Equipment Item
    try:
        logger.debug("🔄 Attempting to register add_equipment_item tool...")
        from app.services.pam.tools.transition.equipment_tools import add_equipment_item

        class AddEquipmentItemWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "add_equipment_item",
                    "Add an equipment item to track for purchase. Use when user wants to add RV gear to their list.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.add_equipment_item_func = add_equipment_item

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.add_equipment_item_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=AddEquipmentItemWrapper(),
            function_definition={
                "name": "add_equipment_item",
                "description": "Add an equipment item to track for purchase. Use when user wants to add RV gear to their list.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "Name of the equipment"
                        },
                        "category": {
                            "type": "string",
                            "enum": ["recovery", "kitchen", "power", "climate", "safety", "comfort", "other"],
                            "description": "Equipment category"
                        },
                        "is_essential": {
                            "type": "boolean",
                            "description": "Whether this is essential (default: true)"
                        },
                        "estimated_cost": {
                            "type": "number",
                            "description": "Estimated cost"
                        },
                        "vendor_url": {
                            "type": "string",
                            "description": "URL where to purchase"
                        },
                        "notes": {
                            "type": "string",
                            "description": "Additional notes"
                        },
                        "priority": {
                            "type": "string",
                            "enum": ["critical", "high", "medium", "low"],
                            "description": "Priority level"
                        }
                    },
                    "required": ["name", "category"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ add_equipment_item tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register add_equipment_item tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ add_equipment_item tool registration failed: {e}")
        failed_count += 1

    # Mark Equipment Purchased
    try:
        logger.debug("🔄 Attempting to register mark_equipment_purchased tool...")
        from app.services.pam.tools.transition.equipment_tools import mark_equipment_purchased

        class MarkEquipmentPurchasedWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "mark_equipment_purchased",
                    "Mark an equipment item as purchased. Use when user says they bought something.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.mark_equipment_purchased_func = mark_equipment_purchased

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.mark_equipment_purchased_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=MarkEquipmentPurchasedWrapper(),
            function_definition={
                "name": "mark_equipment_purchased",
                "description": "Mark an equipment item as purchased. Use when user says they bought something.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "item_id": {
                            "type": "string",
                            "description": "ID of the item"
                        },
                        "item_name": {
                            "type": "string",
                            "description": "Name of the item (fuzzy match)"
                        },
                        "actual_cost": {
                            "type": "number",
                            "description": "Actual purchase cost"
                        },
                        "purchase_date": {
                            "type": "string",
                            "description": "Date of purchase (YYYY-MM-DD)"
                        }
                    },
                    "required": []
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ mark_equipment_purchased tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register mark_equipment_purchased tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ mark_equipment_purchased tool registration failed: {e}")
        failed_count += 1

    # Get Equipment List
    try:
        logger.debug("🔄 Attempting to register get_equipment_list tool...")
        from app.services.pam.tools.transition.equipment_tools import get_equipment_list

        class GetEquipmentListWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_equipment_list",
                    "Get equipment inventory and budget status. Use when user asks about their equipment list or budget.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.get_equipment_list_func = get_equipment_list

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.get_equipment_list_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=GetEquipmentListWrapper(),
            function_definition={
                "name": "get_equipment_list",
                "description": "Get equipment inventory and budget status. Use when user asks about their equipment list or budget.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "enum": ["recovery", "kitchen", "power", "climate", "safety", "comfort", "other"],
                            "description": "Filter by category"
                        },
                        "show_purchased": {
                            "type": "boolean",
                            "description": "Include purchased items (default: true)"
                        }
                    },
                    "required": []
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ get_equipment_list tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register get_equipment_list tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ get_equipment_list tool registration failed: {e}")
        failed_count += 1

    # Get Launch Week Status
    try:
        logger.debug("🔄 Attempting to register get_launch_week_status tool...")
        from app.services.pam.tools.transition.launch_week_tools import get_launch_week_status

        class GetLaunchWeekStatusWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_launch_week_status",
                    "Get the 7-day launch week countdown status. Use when user asks about their departure countdown or launch week.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.get_launch_week_status_func = get_launch_week_status

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.get_launch_week_status_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=GetLaunchWeekStatusWrapper(),
            function_definition={
                "name": "get_launch_week_status",
                "description": "Get the 7-day launch week countdown status. Use when user asks about their departure countdown or launch week.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ get_launch_week_status tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register get_launch_week_status tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ get_launch_week_status tool registration failed: {e}")
        failed_count += 1

    # Complete Launch Task
    try:
        logger.debug("🔄 Attempting to register complete_launch_task tool...")
        from app.services.pam.tools.transition.launch_week_tools import complete_launch_task

        class CompleteLaunchTaskWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "complete_launch_task",
                    "Mark a launch week task as complete. Use when user completes a launch week countdown task.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.complete_launch_task_func = complete_launch_task

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.complete_launch_task_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=CompleteLaunchTaskWrapper(),
            function_definition={
                "name": "complete_launch_task",
                "description": "Mark a launch week task as complete. Use when user completes a launch week countdown task.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "task_id": {
                            "type": "string",
                            "description": "ID of the launch week task"
                        },
                        "notes": {
                            "type": "string",
                            "description": "Completion notes"
                        }
                    },
                    "required": ["task_id"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ complete_launch_task tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register complete_launch_task tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ complete_launch_task tool registration failed: {e}")
        failed_count += 1

    # =========================================================================
    # MAINTENANCE TOOLS (PRD-PAM-002)
    # Tools for vehicle maintenance tracking
    # =========================================================================

    # Create Maintenance Record
    try:
        logger.debug("🔄 Attempting to register create_maintenance_record tool...")
        from app.services.pam.tools.maintenance.maintenance_crud import create_maintenance_record

        class CreateMaintenanceRecordWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "create_maintenance_record",
                    "Create a new maintenance record. Use to schedule future maintenance or log completed service.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.create_maintenance_record_func = create_maintenance_record

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.create_maintenance_record_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=CreateMaintenanceRecordWrapper(),
            function_definition={
                "name": "create_maintenance_record",
                "description": "Create a new maintenance record. Use to schedule future maintenance or log completed service.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "task": {
                            "type": "string",
                            "description": "Description of maintenance task (e.g., 'Oil change', 'Tire rotation')"
                        },
                        "service_date": {
                            "type": "string",
                            "description": "Service date (YYYY-MM-DD) - future for scheduled, past for completed"
                        },
                        "mileage": {
                            "type": "integer",
                            "description": "Vehicle mileage at service"
                        },
                        "notes": {
                            "type": "string",
                            "description": "Additional notes"
                        },
                        "cost": {
                            "type": "number",
                            "description": "Cost of service"
                        }
                    },
                    "required": ["task", "service_date"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ create_maintenance_record tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register create_maintenance_record tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ create_maintenance_record tool registration failed: {e}")
        failed_count += 1

    # Get Maintenance Schedule
    try:
        logger.debug("🔄 Attempting to register get_maintenance_schedule tool...")
        from app.services.pam.tools.maintenance.maintenance_queries import get_maintenance_schedule

        class GetMaintenanceScheduleWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_maintenance_schedule",
                    "View upcoming and overdue maintenance. Use when user asks about due services or maintenance schedule.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.get_maintenance_schedule_func = get_maintenance_schedule

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.get_maintenance_schedule_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=GetMaintenanceScheduleWrapper(),
            function_definition={
                "name": "get_maintenance_schedule",
                "description": "View upcoming and overdue maintenance. Use when user asks about due services or maintenance schedule.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "status": {
                            "type": "string",
                            "enum": ["all", "upcoming", "overdue"],
                            "description": "Filter by status (default: all)"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum records to return (default: 10)"
                        }
                    },
                    "required": []
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ get_maintenance_schedule tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register get_maintenance_schedule tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ get_maintenance_schedule tool registration failed: {e}")
        failed_count += 1

    # Update Maintenance Record
    try:
        logger.debug("🔄 Attempting to register update_maintenance_record tool...")
        from app.services.pam.tools.maintenance.maintenance_crud import update_maintenance_record

        class UpdateMaintenanceRecordWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "update_maintenance_record",
                    "Update an existing maintenance record. Use to change date, mileage, or details.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.update_maintenance_record_func = update_maintenance_record

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.update_maintenance_record_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=UpdateMaintenanceRecordWrapper(),
            function_definition={
                "name": "update_maintenance_record",
                "description": "Update an existing maintenance record. Use to change date, mileage, or details.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "record_id": {
                            "type": "integer",
                            "description": "ID of the record to update"
                        },
                        "task_name": {
                            "type": "string",
                            "description": "Task name to find (fuzzy match)"
                        },
                        "new_task": {
                            "type": "string",
                            "description": "New task description"
                        },
                        "new_date": {
                            "type": "string",
                            "description": "New service date (YYYY-MM-DD)"
                        },
                        "new_mileage": {
                            "type": "integer",
                            "description": "New mileage"
                        },
                        "notes": {
                            "type": "string",
                            "description": "Additional notes"
                        },
                        "cost": {
                            "type": "number",
                            "description": "Cost of service"
                        }
                    },
                    "required": []
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ update_maintenance_record tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register update_maintenance_record tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ update_maintenance_record tool registration failed: {e}")
        failed_count += 1

    # Delete Maintenance Record
    try:
        logger.debug("🔄 Attempting to register delete_maintenance_record tool...")
        from app.services.pam.tools.maintenance.maintenance_crud import delete_maintenance_record

        class DeleteMaintenanceRecordWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "delete_maintenance_record",
                    "Delete a maintenance record. Requires confirmation.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.delete_maintenance_record_func = delete_maintenance_record

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.delete_maintenance_record_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=DeleteMaintenanceRecordWrapper(),
            function_definition={
                "name": "delete_maintenance_record",
                "description": "Delete a maintenance record. Requires confirmation.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "record_id": {
                            "type": "integer",
                            "description": "ID of the record to delete"
                        },
                        "task_name": {
                            "type": "string",
                            "description": "Task name to find (fuzzy match)"
                        },
                        "confirm": {
                            "type": "boolean",
                            "description": "Must be true to actually delete"
                        }
                    },
                    "required": ["confirm"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ delete_maintenance_record tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register delete_maintenance_record tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ delete_maintenance_record tool registration failed: {e}")
        failed_count += 1

    # Get Maintenance History
    try:
        logger.debug("🔄 Attempting to register get_maintenance_history tool...")
        from app.services.pam.tools.maintenance.maintenance_queries import get_maintenance_history

        class GetMaintenanceHistoryWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_maintenance_history",
                    "View past maintenance records. Use when user asks about service history or when they last did something.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.get_maintenance_history_func = get_maintenance_history

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.get_maintenance_history_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=GetMaintenanceHistoryWrapper(),
            function_definition={
                "name": "get_maintenance_history",
                "description": "View past maintenance records. Use when user asks about service history or when they last did something.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "task_type": {
                            "type": "string",
                            "description": "Filter by task type (e.g., 'oil change', 'tire')"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum records to return (default: 10)"
                        }
                    },
                    "required": []
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ get_maintenance_history tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register get_maintenance_history tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ get_maintenance_history tool registration failed: {e}")
        failed_count += 1

    # =========================================================================
    # FUEL LOG TOOLS (PRD-PAM-003)
    # Tools for fuel tracking with smart calculations
    # =========================================================================

    # Add Fuel Entry
    try:
        logger.debug("🔄 Attempting to register add_fuel_entry tool...")
        from app.services.pam.tools.fuel.fuel_crud import add_fuel_entry

        class AddFuelEntryWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "add_fuel_entry",
                    "Add a fuel log entry with smart calculation. Provide any 2 of 3 (volume, price, total) and the third will be calculated.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.add_fuel_entry_func = add_fuel_entry

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.add_fuel_entry_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=AddFuelEntryWrapper(),
            function_definition={
                "name": "add_fuel_entry",
                "description": "Add a fuel log entry with smart calculation. Provide any 2 of 3 (volume, price, total) and the third will be calculated.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "odometer": {
                            "type": "number",
                            "description": "Current odometer reading"
                        },
                        "volume": {
                            "type": "number",
                            "description": "Liters/gallons filled"
                        },
                        "price": {
                            "type": "number",
                            "description": "Price per liter/gallon"
                        },
                        "total": {
                            "type": "number",
                            "description": "Total cost"
                        },
                        "entry_date": {
                            "type": "string",
                            "description": "Fill-up date (YYYY-MM-DD, defaults to today)"
                        },
                        "filled_to_top": {
                            "type": "boolean",
                            "description": "Was tank filled completely? (default: true)"
                        },
                        "station": {
                            "type": "string",
                            "description": "Gas station name/location"
                        },
                        "notes": {
                            "type": "string",
                            "description": "Additional notes"
                        }
                    },
                    "required": ["odometer"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ add_fuel_entry tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register add_fuel_entry tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ add_fuel_entry tool registration failed: {e}")
        failed_count += 1

    # Update Fuel Entry
    try:
        logger.debug("🔄 Attempting to register update_fuel_entry tool...")
        from app.services.pam.tools.fuel.fuel_crud import update_fuel_entry

        class UpdateFuelEntryWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "update_fuel_entry",
                    "Update an existing fuel entry. If entry_id not provided, updates the most recent entry.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.update_fuel_entry_func = update_fuel_entry

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.update_fuel_entry_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=UpdateFuelEntryWrapper(),
            function_definition={
                "name": "update_fuel_entry",
                "description": "Update an existing fuel entry. If entry_id not provided, updates the most recent entry.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "entry_id": {
                            "type": "string",
                            "description": "ID of entry to update (uses latest if not provided)"
                        },
                        "odometer": {
                            "type": "number",
                            "description": "New odometer reading"
                        },
                        "volume": {
                            "type": "number",
                            "description": "New volume"
                        },
                        "price": {
                            "type": "number",
                            "description": "New price per unit"
                        },
                        "total": {
                            "type": "number",
                            "description": "New total cost"
                        },
                        "entry_date": {
                            "type": "string",
                            "description": "New date"
                        },
                        "filled_to_top": {
                            "type": "boolean",
                            "description": "New filled_to_top value"
                        },
                        "station": {
                            "type": "string",
                            "description": "New station"
                        },
                        "notes": {
                            "type": "string",
                            "description": "New notes"
                        }
                    },
                    "required": []
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ update_fuel_entry tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register update_fuel_entry tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ update_fuel_entry tool registration failed: {e}")
        failed_count += 1

    # Delete Fuel Entry
    try:
        logger.debug("🔄 Attempting to register delete_fuel_entry tool...")
        from app.services.pam.tools.fuel.fuel_crud import delete_fuel_entry

        class DeleteFuelEntryWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "delete_fuel_entry",
                    "Delete a fuel entry. Requires confirmation. Uses most recent if entry_id not provided.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.delete_fuel_entry_func = delete_fuel_entry

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.delete_fuel_entry_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=DeleteFuelEntryWrapper(),
            function_definition={
                "name": "delete_fuel_entry",
                "description": "Delete a fuel entry. Requires confirmation. Uses most recent if entry_id not provided.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "entry_id": {
                            "type": "string",
                            "description": "ID of entry to delete (uses latest if not provided)"
                        },
                        "confirm": {
                            "type": "boolean",
                            "description": "Must be true to actually delete"
                        }
                    },
                    "required": ["confirm"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ delete_fuel_entry tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register delete_fuel_entry tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ delete_fuel_entry tool registration failed: {e}")
        failed_count += 1

    # Get Fuel Stats
    try:
        logger.debug("🔄 Attempting to register get_fuel_stats tool...")
        from app.services.pam.tools.fuel.fuel_crud import get_fuel_stats

        class GetFuelStatsWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_fuel_stats",
                    "Get fuel statistics and trends. Use when user asks about fuel spending, consumption, or stats.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.get_fuel_stats_func = get_fuel_stats

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.get_fuel_stats_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=GetFuelStatsWrapper(),
            function_definition={
                "name": "get_fuel_stats",
                "description": "Get fuel statistics and trends. Use when user asks about fuel spending, consumption, or stats.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "period": {
                            "type": "string",
                            "enum": ["week", "month", "year", "all"],
                            "description": "Time period (default: month)"
                        }
                    },
                    "required": []
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("✅ get_fuel_stats tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register get_fuel_stats tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ get_fuel_stats tool registration failed: {e}")
        failed_count += 1

    # =============================================================================
    # PRD-04: UNREGISTERED TOOLS - Previously created but not registered
    # =============================================================================

    # --- message_friend ---
    try:
        logger.debug("🔄 Attempting to register message_friend tool...")
        from app.services.pam.tools.social.message_friend import message_friend

        class MessageFriendWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "message_friend",
                    "Send a direct message to another user. Use for DMs, private messages.",
                    capabilities=[ToolCapability.SOCIAL]
                )
                self.message_friend_func = message_friend

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.message_friend_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=MessageFriendWrapper(),
            function_definition={
                "name": "message_friend",
                "description": "Send a direct message to another user. Use for DMs, private messages.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "recipient_id": {
                            "type": "string",
                            "description": "UUID of the recipient user"
                        },
                        "message": {
                            "type": "string",
                            "description": "Message content to send"
                        }
                    },
                    "required": ["recipient_id", "message"]
                }
            },
            capability=ToolCapability.SOCIAL,
            priority=2
        )
        logger.info("✅ message_friend tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register message_friend tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ message_friend tool registration failed: {e}")
        failed_count += 1

    # --- save_favorite_spot ---
    class SaveFavoriteSpotWrapper(BaseTool):
        def __init__(self):
            super().__init__(
                "save_favorite_spot",
                "Save a location as a favorite/bookmark. Use for campgrounds, restaurants, attractions.",
                capabilities=[ToolCapability.USER_DATA]
            )
            try:
                from app.services.pam.tools.trip.save_favorite_spot import save_favorite_spot
                self.save_favorite_spot_func = save_favorite_spot
            except ImportError:
                self.save_favorite_spot_func = None

        async def initialize(self):
            self.is_initialized = True
            return True

        async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
            if self.save_favorite_spot_func is None:
                return self._create_error_result("save_favorite_spot function not available").to_dict()
            return await self.save_favorite_spot_func(user_id=user_id, **parameters)

    try:
        logger.debug("🔄 Attempting to register save_favorite_spot tool...")
        registry.register_tool(tool=SaveFavoriteSpotWrapper(), priority=2)
        logger.info("✅ save_favorite_spot tool registered")
        registered_count += 1
    except Exception as e:
        logger.error(f"❌ save_favorite_spot tool registration failed: {e}")
        failed_count += 1

    # --- export_data ---
    class ExportDataWrapper(BaseTool):
        def __init__(self):
            super().__init__(
                "export_data",
                "Export all user data (GDPR compliance). Use when user wants to download their data.",
                capabilities=[ToolCapability.USER_DATA]
            )
            try:
                from app.services.pam.tools.profile.export_data import export_data
                self.export_data_func = export_data
            except ImportError:
                self.export_data_func = None

        async def initialize(self):
            self.is_initialized = True
            return True

        async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
            if self.export_data_func is None:
                return self._create_error_result("export_data function not available").to_dict()
            return await self.export_data_func(user_id=user_id, **parameters)

    try:
        logger.debug("🔄 Attempting to register export_data tool...")
        registry.register_tool(tool=ExportDataWrapper(), priority=1)
        logger.info("✅ export_data tool registered")
        registered_count += 1
    except Exception as e:
        logger.error(f"❌ export_data tool registration failed: {e}")
        failed_count += 1

    # --- manage_privacy ---
    class ManagePrivacyWrapper(BaseTool):
        def __init__(self):
            super().__init__(
                "manage_privacy",
                "Manage privacy settings. Use when user wants to change visibility, location sharing, etc.",
                capabilities=[ToolCapability.USER_DATA]
            )
            try:
                from app.services.pam.tools.profile.manage_privacy import manage_privacy
                self.manage_privacy_func = manage_privacy
            except ImportError:
                self.manage_privacy_func = None

        async def initialize(self):
            self.is_initialized = True
            return True

        async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
            if self.manage_privacy_func is None:
                return self._create_error_result("manage_privacy function not available").to_dict()
            return await self.manage_privacy_func(user_id=user_id, **parameters)

    try:
        logger.debug("🔄 Attempting to register manage_privacy tool...")
        registry.register_tool(tool=ManagePrivacyWrapper(), priority=1)
        logger.info("✅ manage_privacy tool registered")
        registered_count += 1
    except Exception as e:
        logger.error(f"❌ manage_privacy tool registration failed: {e}")
        failed_count += 1

    # --- create_vehicle ---
    class CreateVehicleWrapper(BaseTool):
        def __init__(self):
            super().__init__(
                "create_vehicle",
                "Create a new vehicle record. Use when user wants to add their RV, truck, or car.",
                capabilities=[ToolCapability.USER_DATA]
            )
            try:
                from app.services.pam.tools.profile.create_vehicle import create_vehicle
                self.create_vehicle_func = create_vehicle
            except ImportError:
                self.create_vehicle_func = None

        async def initialize(self):
            self.is_initialized = True
            return True

        async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
            if self.create_vehicle_func is None:
                return self._create_error_result("create_vehicle function not available").to_dict()
            return await self.create_vehicle_func(user_id=user_id, **parameters)

    try:
        logger.debug("🔄 Attempting to register create_vehicle tool...")
        registry.register_tool(tool=CreateVehicleWrapper(), priority=2)
        logger.info("✅ create_vehicle tool registered")
        registered_count += 1
    except Exception as e:
        logger.error(f"❌ create_vehicle tool registration failed: {e}")
        failed_count += 1

    # --- follow_user ---
    try:
        logger.debug("🔄 Attempting to register follow_user tool...")
        from app.services.pam.tools.social.follow_user import follow_user

        class FollowUserWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "follow_user",
                    "Follow or unfollow another user. Use for social connections.",
                    capabilities=[ToolCapability.SOCIAL]
                )
                self.follow_user_func = follow_user

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.follow_user_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=FollowUserWrapper(),
            function_definition={
                "name": "follow_user",
                "description": "Follow or unfollow another user. Use for social connections.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "target_user_id": {
                            "type": "string",
                            "description": "UUID of the user to follow/unfollow"
                        },
                        "unfollow": {
                            "type": "boolean",
                            "description": "Set to true to unfollow (default: false)"
                        }
                    },
                    "required": ["target_user_id"]
                }
            },
            capability=ToolCapability.SOCIAL,
            priority=2
        )
        logger.info("✅ follow_user tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register follow_user tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ follow_user tool registration failed: {e}")
        failed_count += 1

    # --- search_posts ---
    class SearchPostsWrapper(BaseTool):
        def __init__(self):
            super().__init__(
                "search_posts",
                "Search for posts by content, tags, or location. Use when user wants to find posts.",
                capabilities=[ToolCapability.SOCIAL]
            )
            try:
                from app.services.pam.tools.social.search_posts import search_posts
                self.search_posts_func = search_posts
            except ImportError:
                self.search_posts_func = None

        async def initialize(self):
            self.is_initialized = True
            return True

        async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
            if self.search_posts_func is None:
                return self._create_error_result("search_posts function not available").to_dict()
            return await self.search_posts_func(user_id=user_id, **parameters)

    try:
        logger.debug("🔄 Attempting to register search_posts tool...")
        registry.register_tool(tool=SearchPostsWrapper(), priority=2)
        logger.info("✅ search_posts tool registered")
        registered_count += 1
    except Exception as e:
        logger.error(f"❌ search_posts tool registration failed: {e}")
        failed_count += 1

    # --- create_event ---
    class CreateEventWrapper(BaseTool):
        def __init__(self):
            super().__init__(
                "create_event",
                "Create a community event or meetup. Use for planning gatherings.",
                capabilities=[ToolCapability.SOCIAL]
            )
            try:
                from app.services.pam.tools.social.create_event import create_event
                self.create_event_func = create_event
            except ImportError:
                self.create_event_func = None

        async def initialize(self):
            self.is_initialized = True
            return True

        async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
            if self.create_event_func is None:
                return self._create_error_result("create_event function not available").to_dict()
            return await self.create_event_func(user_id=user_id, **parameters)

    try:
        logger.debug("🔄 Attempting to register create_event tool...")
        registry.register_tool(tool=CreateEventWrapper(), priority=2)
        logger.info("✅ create_event tool registered")
        registered_count += 1
    except Exception as e:
        logger.error(f"❌ create_event tool registration failed: {e}")
        failed_count += 1

    # --- compare_prices ---
    try:
        logger.debug("🔄 Attempting to register compare_prices tool...")
        from app.services.pam.tools.shop.compare_prices import compare_prices

        class ComparePricesWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "compare_prices",
                    "Compare prices for a product across retailers. Use for finding best deals.",
                    capabilities=[ToolCapability.SHOP]
                )
                self.compare_prices_func = compare_prices

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.compare_prices_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=ComparePricesWrapper(),
            function_definition={
                "name": "compare_prices",
                "description": "Compare prices for a product across retailers. Use for finding best deals.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "product_name": {
                            "type": "string",
                            "description": "The product name to compare prices for"
                        },
                        "country": {
                            "type": "string",
                            "enum": ["au", "us", "uk", "ca", "nz"],
                            "description": "Country code for local pricing (default: au)"
                        }
                    },
                    "required": ["product_name"]
                }
            },
            capability=ToolCapability.SHOP,
            priority=2
        )
        logger.info("✅ compare_prices tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register compare_prices tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ compare_prices tool registration failed: {e}")
        failed_count += 1

    # --- web_search ---
    class WebSearchWrapper(BaseTool):
        def __init__(self):
            super().__init__(
                "web_search",
                "Search the web for products, deals, or information worldwide using Google, Bing, or DuckDuckGo. Use for finding anything anywhere in the world.",
                capabilities=[ToolCapability.SHOP]
            )
            try:
                from app.services.pam.tools.search.web_search import web_search
                self.web_search_func = web_search
            except ImportError:
                self.web_search_func = None

        async def initialize(self):
            self.is_initialized = True
            return True

        async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
            if self.web_search_func is None:
                return self._create_error_result("web_search function not available").to_dict()
            return await self.web_search_func(user_id=user_id, **parameters)

    try:
        logger.debug("🔄 Attempting to register web_search tool...")
        registry.register_tool(tool=WebSearchWrapper(), priority=1)
        logger.info("✅ web_search tool registered")
        registered_count += 1
    except Exception as e:
        logger.error(f"❌ web_search tool registration failed: {e}")
        failed_count += 1

    # --- enhanced_search (PAM Financial Co-Pilot) ---
    class EnhancedSearchWrapper(BaseTool):
        def __init__(self):
            super().__init__(
                "enhanced_search",
                "PAM's Financial Co-Pilot for Mobile Living - search with RV context intelligence. Transforms any purchase query into smart recommendations with mobile living expertise.",
                capabilities=[ToolCapability.SHOP]
            )
            try:
                from app.services.pam.tools.financial_copilot.enhanced_search import enhanced_search
                self.enhanced_search_func = enhanced_search
            except ImportError:
                self.enhanced_search_func = None

        async def initialize(self):
            self.is_initialized = True
            return True

        async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
            if self.enhanced_search_func is None:
                return self._create_error_result("Enhanced search function not available").to_dict()
            return await self.enhanced_search_func(user_id=user_id, **parameters)

    try:
        logger.debug("🔄 Attempting to register enhanced_search tool (PAM Financial Co-Pilot)...")
        registry.register_tool(tool=EnhancedSearchWrapper(), priority=1)  # High priority - this is PAM's core Co-Pilot feature
        logger.info("✅ enhanced_search tool registered (PAM Financial Co-Pilot)")
        registered_count += 1
    except Exception as e:
        logger.error(f"❌ enhanced_search tool registration failed: {e}")
        failed_count += 1

    # --- update_settings ---
    class UpdateSettingsWrapper(BaseTool):
        def __init__(self):
            super().__init__(
                "update_settings",
                "Update user preferences and settings. Use for notifications, theme, language.",
                capabilities=[ToolCapability.USER_DATA]
            )
            try:
                from app.services.pam.tools.profile.update_settings import update_settings
                self.update_settings_func = update_settings
            except ImportError:
                self.update_settings_func = None

        async def initialize(self):
            self.is_initialized = True
            return True

        async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
            if self.update_settings_func is None:
                return self._create_error_result("update_settings function not available").to_dict()
            return await self.update_settings_func(user_id=user_id, **parameters)

    try:
        logger.debug("🔄 Attempting to register update_settings tool...")
        registry.register_tool(tool=UpdateSettingsWrapper(), priority=1)
        logger.info("✅ update_settings tool registered")
        registered_count += 1
    except Exception as e:
        logger.error(f"❌ update_settings tool registration failed: {e}")
        failed_count += 1

    # --- update_vehicle_fuel_consumption ---
    class UpdateVehicleFuelConsumptionWrapper(BaseTool):
        def __init__(self):
            super().__init__(
                "update_vehicle_fuel_consumption",
                "Update vehicle fuel consumption data. Use when user reports MPG or L/100km.",
                capabilities=[ToolCapability.USER_DATA]
            )
            try:
                from app.services.pam.tools.trip.update_vehicle_fuel_consumption import update_vehicle_fuel_consumption
                self.update_vehicle_fuel_consumption_func = update_vehicle_fuel_consumption
            except ImportError:
                self.update_vehicle_fuel_consumption_func = None

        async def initialize(self):
            self.is_initialized = True
            return True

        async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
            if self.update_vehicle_fuel_consumption_func is None:
                return self._create_error_result("update_vehicle_fuel_consumption function not available").to_dict()
            return await self.update_vehicle_fuel_consumption_func(user_id=user_id, **parameters)

    try:
        logger.debug("🔄 Attempting to register update_vehicle_fuel_consumption tool...")
        registry.register_tool(tool=UpdateVehicleFuelConsumptionWrapper(), priority=2)
        logger.info("✅ update_vehicle_fuel_consumption tool registered")
        registered_count += 1
    except Exception as e:
        logger.error(f"❌ update_vehicle_fuel_consumption tool registration failed: {e}")
        failed_count += 1

    # --- categorize_transaction ---
    try:
        logger.debug("🔄 Attempting to register categorize_transaction tool...")
        from app.services.pam.tools.budget.categorize_transaction import categorize_transaction

        class CategorizeTransactionWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "categorize_transaction",
                    "Auto-categorize an expense based on description. Use when user asks to categorize a purchase.",
                    capabilities=[ToolCapability.FINANCIAL]
                )
                self.categorize_transaction_func = categorize_transaction

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.categorize_transaction_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=CategorizeTransactionWrapper(),
            function_definition={
                "name": "categorize_transaction",
                "description": "Auto-categorize an expense based on description. Use when user asks to categorize a purchase.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "description": {
                            "type": "string",
                            "description": "Transaction description to categorize"
                        },
                        "amount": {
                            "type": "number",
                            "description": "Transaction amount (for context)"
                        },
                        "merchant": {
                            "type": "string",
                            "description": "Merchant name (optional)"
                        }
                    },
                    "required": ["description"]
                }
            },
            capability=ToolCapability.FINANCIAL,
            priority=2
        )
        logger.info("✅ categorize_transaction tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register categorize_transaction tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ categorize_transaction tool registration failed: {e}")
        failed_count += 1

    # --- export_budget_report ---
    try:
        logger.debug("🔄 Attempting to register export_budget_report tool...")
        from app.services.pam.tools.budget.export_budget_report import export_budget_report

        class ExportBudgetReportWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "export_budget_report",
                    "Generate and export budget report. Use when user asks for spending report.",
                    capabilities=[ToolCapability.FINANCIAL]
                )
                self.export_budget_report_func = export_budget_report

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.export_budget_report_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=ExportBudgetReportWrapper(),
            function_definition={
                "name": "export_budget_report",
                "description": "Generate and export budget report. Use when user asks for spending report.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "format": {
                            "type": "string",
                            "enum": ["pdf", "csv", "json"],
                            "description": "Export format (default: pdf)"
                        },
                        "period": {
                            "type": "string",
                            "enum": ["daily", "weekly", "monthly", "quarterly", "yearly"],
                            "description": "Report period (default: monthly)"
                        },
                        "start_date": {
                            "type": "string",
                            "description": "Start date in ISO format (optional)"
                        },
                        "end_date": {
                            "type": "string",
                            "description": "End date in ISO format (optional)"
                        }
                    },
                    "required": []
                }
            },
            capability=ToolCapability.FINANCIAL,
            priority=2
        )
        logger.info("✅ export_budget_report tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register export_budget_report tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ export_budget_report tool registration failed: {e}")
        failed_count += 1

    # --- get_weather_forecast ---
    try:
        logger.debug("🔄 Attempting to register get_weather_forecast tool...")
        from app.services.pam.tools.trip.get_weather_forecast import get_weather_forecast

        class GetWeatherForecastWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "get_weather_forecast",
                    "Get weather forecast for a location. Uses FREE OpenMeteo API.",
                    capabilities=[ToolCapability.WEATHER]
                )
                self.get_weather_forecast_func = get_weather_forecast

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.get_weather_forecast_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=GetWeatherForecastWrapper(),
            function_definition={
                "name": "get_weather_forecast",
                "description": "Get weather forecast for a location. Uses FREE OpenMeteo API.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "Location name or coordinates (uses user location if not provided)"
                        },
                        "days": {
                            "type": "integer",
                            "description": "Number of days to forecast (default: 7, max: 7)"
                        }
                    },
                    "required": []
                }
            },
            capability=ToolCapability.WEATHER,
            priority=2
        )
        logger.info("✅ get_weather_forecast tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register get_weather_forecast tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ get_weather_forecast tool registration failed: {e}")
        failed_count += 1

    # --- share_location ---
    try:
        logger.debug("🔄 Attempting to register share_location tool...")
        from app.services.pam.tools.social.share_location import share_location

        class ShareLocationWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "share_location",
                    "Share current location or a spot with the community. Use when user wants to share where they are.",
                    capabilities=[ToolCapability.SOCIAL]
                )
                self.share_location_func = share_location

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.share_location_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=ShareLocationWrapper(),
            function_definition={
                "name": "share_location",
                "description": "Share current location or a spot with the community. Use when user wants to share where they are.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location_name": {
                            "type": "string",
                            "description": "Name of the location"
                        },
                        "latitude": {
                            "type": "number",
                            "description": "Location latitude"
                        },
                        "longitude": {
                            "type": "number",
                            "description": "Location longitude"
                        },
                        "description": {
                            "type": "string",
                            "description": "Optional description"
                        },
                        "is_public": {
                            "type": "boolean",
                            "description": "Whether location is publicly visible (default: true)"
                        }
                    },
                    "required": ["location_name", "latitude", "longitude"]
                }
            },
            capability=ToolCapability.SOCIAL,
            priority=2
        )
        logger.info("✅ share_location tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"⚠️ Could not register share_location tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"❌ share_location tool registration failed: {e}")
        failed_count += 1

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