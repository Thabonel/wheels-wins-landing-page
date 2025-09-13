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
    logger.info("📋 Registering PAM tools...")
    
    registered_count = 0
    failed_count = 0
    
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
    
    # Weather Tool removed - ChatGPT handles weather with user location context
    
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
    
    logger.info(f"✅ PAM tool registration completed: {registered_count}/{total_attempted} tools registered ({success_rate:.1f}% success rate)")
    
    if failed_count > 0:
        logger.warning(f"⚠️ {failed_count} tools failed to register - PAM will function with reduced capabilities")
    
    return registered_count, failed_count