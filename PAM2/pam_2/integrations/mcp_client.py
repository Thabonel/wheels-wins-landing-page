"""
MCP (Model Context Protocol) Client for PAM 2.0
Enables tool execution, database operations, and enhanced AI capabilities
"""

import asyncio
import json
import logging
from typing import Dict, Any, List, Optional, Callable, Tuple
from dataclasses import dataclass
from enum import Enum
from abc import ABC, abstractmethod
import inspect

from pam_2.core.types import ServiceResponse, ServiceStatus
from pam_2.core.config import get_settings
from pam_2.core.exceptions import PAMServiceError

logger = logging.getLogger(__name__)
settings = get_settings()


class ToolCategory(Enum):
    """Categories of MCP tools"""
    DATABASE = "database"
    FILESYSTEM = "filesystem"
    GITHUB = "github"
    MEMORY = "memory"
    WEB = "web"
    COMPUTATION = "computation"
    COMMUNICATION = "communication"


@dataclass
class ToolDefinition:
    """Definition of an MCP tool"""
    name: str
    description: str
    category: ToolCategory
    parameters: Dict[str, Any]
    required_params: List[str]
    returns: str
    examples: Optional[List[Dict[str, Any]]] = None
    requires_auth: bool = False
    rate_limit: Optional[int] = None  # requests per minute


@dataclass
class ToolExecutionResult:
    """Result from tool execution"""
    success: bool
    output: Any
    error: Optional[str] = None
    execution_time_ms: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


class BaseMCPTool(ABC):
    """Abstract base class for MCP tools"""

    def __init__(self, definition: ToolDefinition):
        self.definition = definition
        self.execution_count = 0
        self.last_execution_time = 0

    @abstractmethod
    async def execute(self, parameters: Dict[str, Any]) -> ToolExecutionResult:
        """Execute the tool with given parameters"""
        pass

    def validate_parameters(self, parameters: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validate tool parameters"""
        # Check required parameters
        for param in self.definition.required_params:
            if param not in parameters:
                return False, f"Missing required parameter: {param}"

        # Check parameter types
        for param, value in parameters.items():
            if param in self.definition.parameters:
                expected_type = self.definition.parameters[param].get("type")
                if expected_type and not isinstance(value, expected_type):
                    return False, f"Parameter {param} must be of type {expected_type}"

        return True, None


class DatabaseTool(BaseMCPTool):
    """MCP tool for database operations"""

    def __init__(self):
        super().__init__(ToolDefinition(
            name="database_query",
            description="Execute SQL queries directly on the database (bypasses RLS)",
            category=ToolCategory.DATABASE,
            parameters={
                "query": {"type": str, "description": "SQL query to execute"},
                "params": {"type": dict, "description": "Query parameters", "optional": True}
            },
            required_params=["query"],
            returns="Query results as list of dictionaries",
            examples=[
                {
                    "input": {"query": "SELECT * FROM profiles WHERE user_id = $1", "params": {"$1": "user123"}},
                    "output": [{"user_id": "user123", "name": "John Doe", "email": "john@example.com"}]
                }
            ],
            requires_auth=True
        ))

    async def execute(self, parameters: Dict[str, Any]) -> ToolExecutionResult:
        """Execute database query"""
        import time
        start_time = time.time()

        valid, error = self.validate_parameters(parameters)
        if not valid:
            return ToolExecutionResult(success=False, output=None, error=error)

        try:
            # In production, this would connect to actual database
            # For PAM2, we'll simulate the operation
            query = parameters["query"]
            params = parameters.get("params", {})

            # Simulate database query
            logger.info(f"Executing database query: {query[:100]}...")

            # Mock response for demonstration
            result = {
                "rows": [],
                "rowCount": 0,
                "query": query,
                "executed": True
            }

            execution_time = (time.time() - start_time) * 1000

            return ToolExecutionResult(
                success=True,
                output=result,
                execution_time_ms=execution_time,
                metadata={"query_type": query.split()[0].upper()}
            )

        except Exception as e:
            logger.error(f"Database query failed: {e}")
            return ToolExecutionResult(
                success=False,
                output=None,
                error=str(e),
                execution_time_ms=(time.time() - start_time) * 1000
            )


class FileSystemTool(BaseMCPTool):
    """MCP tool for filesystem operations"""

    def __init__(self):
        super().__init__(ToolDefinition(
            name="filesystem_read",
            description="Read files from the filesystem",
            category=ToolCategory.FILESYSTEM,
            parameters={
                "path": {"type": str, "description": "File path to read"},
                "encoding": {"type": str, "description": "File encoding", "optional": True}
            },
            required_params=["path"],
            returns="File contents as string",
            requires_auth=True
        ))

    async def execute(self, parameters: Dict[str, Any]) -> ToolExecutionResult:
        """Read file from filesystem"""
        import time
        start_time = time.time()

        valid, error = self.validate_parameters(parameters)
        if not valid:
            return ToolExecutionResult(success=False, output=None, error=error)

        try:
            path = parameters["path"]
            encoding = parameters.get("encoding", "utf-8")

            # In production, implement proper sandboxing and security
            # For PAM2, we'll simulate the operation
            logger.info(f"Reading file: {path}")

            # Mock file content
            content = f"Mock content of file: {path}"

            return ToolExecutionResult(
                success=True,
                output=content,
                execution_time_ms=(time.time() - start_time) * 1000,
                metadata={"file_size": len(content), "encoding": encoding}
            )

        except Exception as e:
            logger.error(f"File read failed: {e}")
            return ToolExecutionResult(
                success=False,
                output=None,
                error=str(e),
                execution_time_ms=(time.time() - start_time) * 1000
            )


class WebSearchTool(BaseMCPTool):
    """MCP tool for web search operations"""

    def __init__(self):
        super().__init__(ToolDefinition(
            name="web_search",
            description="Search the web for information",
            category=ToolCategory.WEB,
            parameters={
                "query": {"type": str, "description": "Search query"},
                "max_results": {"type": int, "description": "Maximum results", "optional": True}
            },
            required_params=["query"],
            returns="List of search results with title, url, and snippet",
            rate_limit=60
        ))

    async def execute(self, parameters: Dict[str, Any]) -> ToolExecutionResult:
        """Execute web search"""
        import time
        start_time = time.time()

        valid, error = self.validate_parameters(parameters)
        if not valid:
            return ToolExecutionResult(success=False, output=None, error=error)

        try:
            query = parameters["query"]
            max_results = parameters.get("max_results", 5)

            logger.info(f"Searching web for: {query}")

            # Mock search results
            results = [
                {
                    "title": f"Result {i+1} for {query}",
                    "url": f"https://example.com/result{i+1}",
                    "snippet": f"This is a sample snippet for search result {i+1} about {query}"
                }
                for i in range(min(max_results, 3))
            ]

            return ToolExecutionResult(
                success=True,
                output=results,
                execution_time_ms=(time.time() - start_time) * 1000,
                metadata={"query": query, "result_count": len(results)}
            )

        except Exception as e:
            logger.error(f"Web search failed: {e}")
            return ToolExecutionResult(
                success=False,
                output=None,
                error=str(e),
                execution_time_ms=(time.time() - start_time) * 1000
            )


class MCPClient:
    """
    MCP Client for PAM 2.0
    Manages tool registration, execution, and integration with AI providers
    """

    def __init__(self):
        self.tools: Dict[str, BaseMCPTool] = {}
        self.tool_categories: Dict[ToolCategory, List[str]] = {
            category: [] for category in ToolCategory
        }
        self._initialized = False
        self.execution_history: List[Dict[str, Any]] = []
        self.max_history_size = 100

        # Performance metrics
        self.metrics = {
            "total_executions": 0,
            "successful_executions": 0,
            "failed_executions": 0,
            "avg_execution_time_ms": 0,
            "executions_by_category": {cat.value: 0 for cat in ToolCategory},
            "executions_by_tool": {}
        }

    async def initialize(self) -> ServiceResponse:
        """Initialize MCP client and register tools"""
        try:
            logger.info("🔧 Initializing MCP Client...")

            # Register built-in tools
            await self._register_builtin_tools()

            # TODO: Load custom tools from configuration
            # await self._load_custom_tools()

            self._initialized = True
            logger.info(f"✅ MCP Client initialized with {len(self.tools)} tools")

            return ServiceResponse(
                status=ServiceStatus.SUCCESS,
                data={
                    "tools": list(self.tools.keys()),
                    "categories": {
                        cat.value: tools for cat, tools in self.tool_categories.items()
                    }
                },
                message=f"MCP client initialized with {len(self.tools)} tools"
            )

        except Exception as e:
            logger.error(f"Failed to initialize MCP client: {e}")
            return ServiceResponse(
                status=ServiceStatus.ERROR,
                error=str(e),
                message="Failed to initialize MCP client"
            )

    async def _register_builtin_tools(self):
        """Register built-in MCP tools"""
        # Register database tool
        db_tool = DatabaseTool()
        await self.register_tool(db_tool)

        # Register filesystem tool
        fs_tool = FileSystemTool()
        await self.register_tool(fs_tool)

        # Register web search tool
        web_tool = WebSearchTool()
        await self.register_tool(web_tool)

    async def register_tool(self, tool: BaseMCPTool) -> bool:
        """Register a tool with the MCP client"""
        try:
            name = tool.definition.name
            category = tool.definition.category

            if name in self.tools:
                logger.warning(f"Tool {name} already registered, overwriting")

            self.tools[name] = tool
            self.tool_categories[category].append(name)
            self.metrics["executions_by_tool"][name] = 0

            logger.debug(f"Registered tool: {name} in category {category.value}")
            return True

        except Exception as e:
            logger.error(f"Failed to register tool: {e}")
            return False

    async def execute_tool(
        self,
        tool_name: str,
        parameters: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> ServiceResponse:
        """
        Execute an MCP tool

        Args:
            tool_name: Name of the tool to execute
            parameters: Tool parameters
            user_id: User ID for authorization

        Returns:
            ServiceResponse with execution result
        """
        if not self._initialized:
            await self.initialize()

        if tool_name not in self.tools:
            return ServiceResponse(
                status=ServiceStatus.ERROR,
                error=f"Tool {tool_name} not found",
                message=f"Available tools: {', '.join(self.tools.keys())}"
            )

        tool = self.tools[tool_name]
        self.metrics["total_executions"] += 1
        self.metrics["executions_by_tool"][tool_name] += 1
        self.metrics["executions_by_category"][tool.definition.category.value] += 1

        try:
            # Check authorization if required
            if tool.definition.requires_auth and not user_id:
                return ServiceResponse(
                    status=ServiceStatus.ERROR,
                    error="Authorization required",
                    message="This tool requires user authentication"
                )

            # Execute the tool
            result = await tool.execute(parameters)

            # Update metrics
            if result.success:
                self.metrics["successful_executions"] += 1
            else:
                self.metrics["failed_executions"] += 1

            if result.execution_time_ms:
                current_avg = self.metrics["avg_execution_time_ms"]
                total = self.metrics["total_executions"]
                self.metrics["avg_execution_time_ms"] = (
                    (current_avg * (total - 1) + result.execution_time_ms) / total
                )

            # Record in history
            self._record_execution(tool_name, parameters, result, user_id)

            return ServiceResponse(
                status=ServiceStatus.SUCCESS if result.success else ServiceStatus.ERROR,
                data={
                    "output": result.output,
                    "metadata": result.metadata,
                    "execution_time_ms": result.execution_time_ms
                } if result.success else None,
                error=result.error if not result.success else None,
                message=f"Tool {tool_name} executed {'successfully' if result.success else 'with errors'}"
            )

        except Exception as e:
            logger.error(f"Tool execution failed: {e}")
            self.metrics["failed_executions"] += 1

            return ServiceResponse(
                status=ServiceStatus.ERROR,
                error=str(e),
                message=f"Failed to execute tool {tool_name}"
            )

    def _record_execution(
        self,
        tool_name: str,
        parameters: Dict[str, Any],
        result: ToolExecutionResult,
        user_id: Optional[str]
    ):
        """Record tool execution in history"""
        import time

        execution_record = {
            "timestamp": time.time(),
            "tool": tool_name,
            "parameters": parameters,
            "success": result.success,
            "error": result.error,
            "execution_time_ms": result.execution_time_ms,
            "user_id": user_id
        }

        self.execution_history.append(execution_record)

        # Trim history if too large
        if len(self.execution_history) > self.max_history_size:
            self.execution_history = self.execution_history[-self.max_history_size:]

    def get_tool_definitions(self) -> List[Dict[str, Any]]:
        """Get all tool definitions for AI provider"""
        definitions = []

        for tool_name, tool in self.tools.items():
            definition = {
                "name": tool.definition.name,
                "description": tool.definition.description,
                "parameters": tool.definition.parameters,
                "required": tool.definition.required_params,
                "returns": tool.definition.returns,
                "category": tool.definition.category.value
            }

            if tool.definition.examples:
                definition["examples"] = tool.definition.examples

            definitions.append(definition)

        return definitions

    def get_tools_by_category(self, category: ToolCategory) -> List[str]:
        """Get tools in a specific category"""
        return self.tool_categories.get(category, [])

    def get_metrics(self) -> Dict[str, Any]:
        """Get MCP client metrics"""
        return {
            **self.metrics,
            "tools_registered": len(self.tools),
            "categories_active": len([c for c, tools in self.tool_categories.items() if tools]),
            "success_rate": (
                (self.metrics["successful_executions"] / max(1, self.metrics["total_executions"])) * 100
            )
        }

    async def health_check(self) -> ServiceResponse:
        """Check MCP client health"""
        try:
            healthy_tools = []
            unhealthy_tools = []

            # Test each tool category with a simple operation
            for category, tool_names in self.tool_categories.items():
                if tool_names:
                    # Test one tool from each category
                    tool_name = tool_names[0]
                    tool = self.tools[tool_name]

                    # Simple validation check
                    try:
                        # Just validate that the tool can be instantiated
                        if tool and tool.definition:
                            healthy_tools.append(tool_name)
                        else:
                            unhealthy_tools.append(tool_name)
                    except Exception:
                        unhealthy_tools.append(tool_name)

            return ServiceResponse(
                status=ServiceStatus.SUCCESS,
                data={
                    "healthy_tools": healthy_tools,
                    "unhealthy_tools": unhealthy_tools,
                    "metrics": self.get_metrics(),
                    "execution_history_size": len(self.execution_history)
                },
                message=f"MCP client healthy with {len(healthy_tools)} tools operational"
            )

        except Exception as e:
            return ServiceResponse(
                status=ServiceStatus.ERROR,
                error=str(e),
                message="MCP client health check failed"
            )


# Module-level singleton
mcp_client = MCPClient()


async def get_mcp_client() -> MCPClient:
    """Get the MCP client singleton"""
    if not mcp_client._initialized:
        await mcp_client.initialize()
    return mcp_client