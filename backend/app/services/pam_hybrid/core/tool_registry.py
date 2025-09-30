"""Tool Registry for PAM Hybrid System

Manages access to 40+ existing tools from backend/app/services/pam/tools/
"""

import importlib
import inspect
from typing import Any, Callable, Dict, List, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class ToolRegistry:
    """Registry for PAM tools accessible by agents"""

    def __init__(self):
        self.tools: Dict[str, Callable] = {}
        self.tool_metadata: Dict[str, Dict[str, Any]] = {}
        self._load_existing_tools()

    def _load_existing_tools(self):
        """Load existing tools from backend/app/services/pam/tools/"""
        try:
            # Import existing tools module
            tools_path = Path(__file__).parent.parent.parent.parent / "pam" / "tools"

            if not tools_path.exists():
                logger.warning(f"Tools directory not found: {tools_path}")
                return

            # Known tool modules from PRODUCTION_PAM_INVENTORY.md
            tool_modules = [
                "load_user_profile",
                "mapbox_tool",
                "weather_tool",
                "load_recent_memory",
                # Add more as needed
            ]

            for tool_name in tool_modules:
                try:
                    module = importlib.import_module(
                        f"app.services.pam.tools.{tool_name}"
                    )

                    # Find callable functions in module
                    for name, obj in inspect.getmembers(module):
                        if callable(obj) and not name.startswith("_"):
                            self.register_tool(
                                name=name,
                                func=obj,
                                description=obj.__doc__ or f"Tool: {name}",
                                module=tool_name
                            )

                except Exception as e:
                    logger.warning(f"Failed to load tool {tool_name}: {e}")

            logger.info(f"Loaded {len(self.tools)} tools from existing PAM system")

        except Exception as e:
            logger.error(f"Failed to load existing tools: {e}")

    def register_tool(
        self,
        name: str,
        func: Callable,
        description: str,
        module: Optional[str] = None,
        domain: Optional[str] = None,
        **metadata
    ):
        """Register a tool for agent use"""
        self.tools[name] = func
        self.tool_metadata[name] = {
            "description": description,
            "module": module,
            "domain": domain,
            "signature": inspect.signature(func),
            **metadata
        }
        logger.debug(f"Registered tool: {name}")

    def get_tool(self, name: str) -> Optional[Callable]:
        """Get a tool by name"""
        return self.tools.get(name)

    def get_tools_for_domain(self, domain: str) -> Dict[str, Callable]:
        """Get all tools relevant to a domain"""
        domain_tools = {}

        for name, metadata in self.tool_metadata.items():
            # Include tools specific to domain or general tools
            if metadata.get("domain") in [domain, None, "general"]:
                domain_tools[name] = self.tools[name]

        return domain_tools

    def get_tool_metadata(self, name: str) -> Optional[Dict[str, Any]]:
        """Get metadata for a tool"""
        return self.tool_metadata.get(name)

    def list_tools(self, domain: Optional[str] = None) -> List[str]:
        """List available tool names"""
        if domain:
            return [
                name for name, meta in self.tool_metadata.items()
                if meta.get("domain") in [domain, None, "general"]
            ]
        return list(self.tools.keys())

    async def call_tool(
        self,
        name: str,
        user_id: str,
        **kwargs
    ) -> Any:
        """Call a tool with parameters"""
        tool = self.get_tool(name)

        if not tool:
            raise ValueError(f"Tool not found: {name}")

        try:
            # Add user_id if tool accepts it
            sig = inspect.signature(tool)
            if "user_id" in sig.parameters:
                kwargs["user_id"] = user_id

            # Call tool (handle both sync and async)
            if inspect.iscoroutinefunction(tool):
                result = await tool(**kwargs)
            else:
                result = tool(**kwargs)

            return result

        except Exception as e:
            logger.error(f"Tool call failed: {name} - {e}")
            raise

    def get_tool_schemas(self, domain: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get tool schemas for Claude Agent SDK"""
        schemas = []

        for name in self.list_tools(domain):
            metadata = self.get_tool_metadata(name)
            sig = metadata["signature"]

            # Build parameter schema
            parameters = {}
            for param_name, param in sig.parameters.items():
                if param_name == "user_id":
                    continue  # Skip user_id in schema

                param_type = "string"  # Default
                if param.annotation != inspect.Parameter.empty:
                    if param.annotation == int:
                        param_type = "number"
                    elif param.annotation == float:
                        param_type = "number"
                    elif param.annotation == bool:
                        param_type = "boolean"

                parameters[param_name] = {
                    "type": param_type,
                    "description": f"Parameter: {param_name}"
                }

            schema = {
                "name": name,
                "description": metadata["description"],
                "input_schema": {
                    "type": "object",
                    "properties": parameters,
                    "required": [
                        p for p in sig.parameters
                        if sig.parameters[p].default == inspect.Parameter.empty
                        and p != "user_id"
                    ]
                }
            }

            schemas.append(schema)

        return schemas


# Global tool registry instance
tool_registry = ToolRegistry()