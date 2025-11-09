"""
Progressive Tool Discovery System

This module implements Anthropic's progressive disclosure pattern for MCP tools.
Instead of loading 100+ tool definitions (150K tokens), agents can:
1. Search for tool names (2K tokens)
2. Get descriptions for relevant tools (5K tokens)
3. Load full schemas only when needed (10K tokens)

This achieves the 98.7% token reduction described in the blog post.
"""

import os
import ast
import inspect
import importlib
from typing import List, Dict, Any, Literal, Optional
from pathlib import Path
from dataclasses import dataclass
from enum import Enum


class DetailLevel(str, Enum):
    """Detail level for tool information"""
    NAME_ONLY = "name_only"  # Just tool names (~50 tokens per 100 tools)
    WITH_DESCRIPTION = "with_description"  # Names + descriptions (~500 tokens per 100 tools)
    FULL = "full"  # Complete schemas (~1500 tokens per 100 tools)


@dataclass
class ToolInfo:
    """Information about an MCP tool"""
    name: str  # Tool function name (e.g., "create_issue")
    module_path: str  # Import path (e.g., "servers.github.create_issue")
    server: str  # Server name (e.g., "github")
    description: Optional[str] = None  # Brief description
    input_schema: Optional[Dict[str, Any]] = None  # Full input schema
    output_schema: Optional[Dict[str, Any]] = None  # Full output schema
    example: Optional[str] = None  # Usage example


class ToolDiscovery:
    """
    Progressive tool discovery system

    This class scans the servers/ directory and builds an index of available tools.
    Tools can be searched and retrieved with varying levels of detail to minimize
    token usage.
    """

    def __init__(self, servers_dir: Optional[Path] = None):
        """
        Initialize tool discovery

        Args:
            servers_dir: Path to servers directory (defaults to ./servers)
        """
        if servers_dir is None:
            # Default to servers/ directory relative to this file
            servers_dir = Path(__file__).parent / "servers"

        self.servers_dir = servers_dir
        self._tool_index: Optional[List[ToolInfo]] = None

    def _build_index(self) -> List[ToolInfo]:
        """
        Build index of all available tools by scanning servers/ directory

        Returns:
            List of ToolInfo objects

        This scans all Python files in servers/ subdirectories and extracts:
        - Function names (from async def functions)
        - Docstrings (for descriptions)
        - TypedDict classes (for schemas)
        """
        tools: List[ToolInfo] = []

        # Scan each server directory
        for server_dir in self.servers_dir.iterdir():
            if not server_dir.is_dir() or server_dir.name.startswith('_'):
                continue

            server_name = server_dir.name

            # Scan Python files in server directory
            for py_file in server_dir.glob("*.py"):
                if py_file.name.startswith('_'):
                    continue

                tool_name = py_file.stem  # File name without .py
                module_path = f"servers.{server_name}.{tool_name}"

                # Extract minimal info from file
                # (Full parsing only happens when detail level is FULL)
                try:
                    with open(py_file, 'r') as f:
                        content = f.read()

                    # Extract first docstring as description
                    tree = ast.parse(content)
                    description = None
                    for node in ast.walk(tree):
                        if isinstance(node, ast.FunctionDef):
                            if node.name == tool_name and ast.get_docstring(node):
                                description = ast.get_docstring(node).split('\n')[0]
                                break

                    tools.append(ToolInfo(
                        name=tool_name,
                        module_path=module_path,
                        server=server_name,
                        description=description
                    ))

                except Exception as e:
                    # Skip files that can't be parsed
                    print(f"Warning: Could not parse {py_file}: {e}")
                    continue

        return tools

    def get_tool_index(self) -> List[ToolInfo]:
        """
        Get tool index (builds it if needed)

        Returns:
            List of all available tools
        """
        if self._tool_index is None:
            self._tool_index = self._build_index()
        return self._tool_index

    def search_tools(
        self,
        query: Optional[str] = None,
        server: Optional[str] = None,
        detail_level: DetailLevel = DetailLevel.NAME_ONLY,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Search for tools with progressive detail levels

        Args:
            query: Optional search query (matches tool name or description)
            server: Optional server filter (e.g., "github", "filesystem")
            detail_level: Level of detail to return
            limit: Maximum number of results

        Returns:
            List of tool information (format depends on detail_level)

        Example (agent workflow):
            >>> # Step 1: Find relevant tools (minimal tokens)
            >>> tools = search_tools(query="file", detail_level="name_only")
            >>> # Returns: ["get_file_contents", "read_file", "write_file"]
            >>>
            >>> # Step 2: Get descriptions for relevant tools
            >>> tools = search_tools(query="get_file_contents",
            ...                      detail_level="with_description")
            >>> # Returns: [{"name": "get_file_contents",
            ...              "description": "Get contents of a file from GitHub"}]
            >>>
            >>> # Step 3: Load full schema only when ready to use
            >>> tool = search_tools(query="get_file_contents",
            ...                     detail_level="full")[0]
            >>> # Now has complete input/output schemas
        """
        index = self.get_tool_index()

        # Filter tools
        results = index
        if server:
            results = [t for t in results if t.server == server]
        if query:
            query_lower = query.lower()
            results = [
                t for t in results
                if query_lower in t.name.lower() or
                   (t.description and query_lower in t.description.lower())
            ]

        # Limit results
        results = results[:limit]

        # Format based on detail level
        if detail_level == DetailLevel.NAME_ONLY:
            return [{"name": t.name, "server": t.server} for t in results]

        elif detail_level == DetailLevel.WITH_DESCRIPTION:
            return [
                {
                    "name": t.name,
                    "server": t.server,
                    "description": t.description or "No description available",
                    "import": f"from servers.{t.server} import {t.name}"
                }
                for t in results
            ]

        elif detail_level == DetailLevel.FULL:
            # Load full schemas (expensive, only do when requested)
            return [self._get_full_tool_info(t) for t in results]

        return []

    def _get_full_tool_info(self, tool: ToolInfo) -> Dict[str, Any]:
        """
        Get complete tool information including schemas

        This is expensive (requires parsing and importing), so only call
        when agent explicitly needs full details.

        Args:
            tool: Tool to get full info for

        Returns:
            Complete tool information including schemas
        """
        # Import the module to get schemas
        try:
            # Build proper import path
            import_path = f"app.services.mcp-code-execution.servers.{tool.server}.{tool.name}"
            module = importlib.import_module(import_path)

            # Find Input and Response TypedDict classes
            input_class_name = ''.join(word.capitalize() for word in tool.name.split('_')) + 'Input'
            response_class_name = ''.join(word.capitalize() for word in tool.name.split('_')) + 'Response'

            input_schema = None
            output_schema = None

            if hasattr(module, input_class_name):
                # Extract schema from TypedDict
                input_class = getattr(module, input_class_name)
                input_schema = self._extract_typed_dict_schema(input_class)

            if hasattr(module, response_class_name):
                response_class = getattr(module, response_class_name)
                output_schema = self._extract_typed_dict_schema(response_class)

            # Get docstring example
            func = getattr(module, tool.name)
            docstring = inspect.getdoc(func)
            example = self._extract_example_from_docstring(docstring) if docstring else None

            return {
                "name": tool.name,
                "server": tool.server,
                "description": tool.description or "No description",
                "import": f"from servers.{tool.server} import {tool.name}",
                "input_schema": input_schema,
                "output_schema": output_schema,
                "example": example
            }

        except Exception as e:
            # Fallback if can't load full info
            return {
                "name": tool.name,
                "server": tool.server,
                "description": tool.description or "No description",
                "import": f"from servers.{tool.server} import {tool.name}",
                "error": f"Could not load full schema: {str(e)}"
            }

    def _extract_typed_dict_schema(self, typed_dict_class: type) -> Dict[str, Any]:
        """
        Extract JSON schema from TypedDict class

        Args:
            typed_dict_class: TypedDict class

        Returns:
            JSON schema representation
        """
        # Simple schema extraction
        # In production, use typing.get_type_hints() for complete extraction
        annotations = typed_dict_class.__annotations__ if hasattr(typed_dict_class, '__annotations__') else {}

        schema = {
            "type": "object",
            "properties": {}
        }

        for field_name, field_type in annotations.items():
            # Simplified type conversion
            # In production, handle complex types (Optional, List, etc.)
            schema["properties"][field_name] = {
                "type": self._python_type_to_json_type(field_type),
                "description": ""  # Extract from comments if available
            }

        return schema

    def _python_type_to_json_type(self, python_type: Any) -> str:
        """Convert Python type to JSON schema type"""
        type_map = {
            str: "string",
            int: "integer",
            float: "number",
            bool: "boolean",
            list: "array",
            dict: "object"
        }
        return type_map.get(python_type, "string")

    def _extract_example_from_docstring(self, docstring: str) -> Optional[str]:
        """Extract example from docstring"""
        if "Example:" in docstring:
            example_start = docstring.find("Example:")
            return docstring[example_start:]
        return None


# Global discovery instance
_discovery: Optional[ToolDiscovery] = None


def get_discovery() -> ToolDiscovery:
    """Get or create global tool discovery instance"""
    global _discovery
    if _discovery is None:
        _discovery = ToolDiscovery()
    return _discovery


# Convenience function for agents to use
def search_tools(
    query: Optional[str] = None,
    server: Optional[str] = None,
    detail_level: str = "name_only",
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Search for available MCP tools (agent-facing function)

    This is the function that agents call to discover tools.

    Args:
        query: Search query (optional)
        server: Filter by server (optional)
        detail_level: "name_only", "with_description", or "full"
        limit: Max results

    Returns:
        List of tools matching search

    Example workflow:
        >>> # Step 1: Find relevant tools (costs ~50 tokens for 100 tools)
        >>> tools = search_tools("github create")
        >>> # ["create_issue", "create_pull_request", "create_repository"]
        >>>
        >>> # Step 2: Get descriptions (costs ~500 tokens)
        >>> tools = search_tools("create_issue", detail_level="with_description")
        >>>
        >>> # Step 3: Import and use
        >>> from servers.github import create_issue
        >>> result = await create_issue({...})
    """
    discovery = get_discovery()
    return discovery.search_tools(
        query=query,
        server=server,
        detail_level=DetailLevel(detail_level),
        limit=limit
    )
