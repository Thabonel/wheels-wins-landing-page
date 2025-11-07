"""
Base MCP Client for Code Execution Architecture

This module provides a foundation for executing MCP tool calls from Python code,
enabling the 98.7% token reduction described in Anthropic's blog post.

Instead of loading all 100+ tool definitions into context (150K tokens),
agents can import and use only the tools they need (2K tokens).
"""

import json
import logging
from typing import Any, Dict, Optional, TypeVar, Generic
from dataclasses import dataclass
import httpx

logger = logging.getLogger(__name__)

T = TypeVar('T')


@dataclass
class MCPToolResult(Generic[T]):
    """Result from an MCP tool call"""
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class MCPClient:
    """
    Base client for calling MCP tools

    This client abstracts the actual MCP server communication,
    allowing tool wrappers to simply call callMCPTool() without
    worrying about the underlying protocol.
    """

    def __init__(self, base_url: Optional[str] = None):
        """
        Initialize MCP client

        Args:
            base_url: Optional base URL for MCP server (defaults to local)
        """
        self.base_url = base_url or "http://localhost:3000"
        self.client = httpx.AsyncClient(timeout=30.0)

    async def call_tool(
        self,
        tool_name: str,
        input_data: Dict[str, Any],
        result_type: type[T] = dict
    ) -> MCPToolResult[T]:
        """
        Call an MCP tool and return typed result

        Args:
            tool_name: Full tool name (e.g., 'github__create_issue')
            input_data: Tool input parameters
            result_type: Expected return type for type safety

        Returns:
            MCPToolResult with typed data

        Example:
            >>> result = await client.call_tool(
            ...     'github__create_issue',
            ...     {'repo': 'myrepo', 'title': 'Bug'},
            ...     dict
            ... )
            >>> if result.success:
            ...     print(f"Created issue: {result.data['number']}")
        """
        try:
            # Log the tool call for monitoring
            logger.info(f"Calling MCP tool: {tool_name}")
            logger.debug(f"Input: {json.dumps(input_data, indent=2)}")

            # Make the MCP tool call
            # NOTE: This is a placeholder - actual implementation depends on
            # how MCP servers are exposed to the backend
            response = await self._execute_tool(tool_name, input_data)

            # Parse and validate response
            if response.get('success'):
                return MCPToolResult(
                    success=True,
                    data=response.get('data'),
                    metadata=response.get('metadata')
                )
            else:
                return MCPToolResult(
                    success=False,
                    error=response.get('error', 'Unknown error'),
                    metadata=response.get('metadata')
                )

        except Exception as e:
            logger.error(f"Error calling MCP tool {tool_name}: {str(e)}")
            return MCPToolResult(
                success=False,
                error=str(e)
            )

    async def _execute_tool(
        self,
        tool_name: str,
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute the actual MCP tool call

        This method abstracts the communication protocol with MCP servers.
        Implementation options:
        1. HTTP API to MCP server bridge
        2. Direct MCP protocol communication
        3. Subprocess execution of MCP CLI

        For now, this is a placeholder that would need to be implemented
        based on how MCP servers are deployed in production.
        """
        # Placeholder implementation
        # In production, this would make actual MCP server calls

        # Option 1: HTTP bridge to MCP servers
        # response = await self.client.post(
        #     f"{self.base_url}/mcp/{tool_name}",
        #     json=input_data
        # )
        # return response.json()

        # Option 2: Direct MCP protocol
        # This would use the MCP SDK to communicate with servers

        # For now, return mock success
        return {
            "success": True,
            "data": {"message": "Mock MCP tool call - implement _execute_tool()"},
            "metadata": {"tool": tool_name}
        }

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Global client instance (singleton pattern)
_client: Optional[MCPClient] = None


def get_client() -> MCPClient:
    """
    Get or create the global MCP client instance

    Returns:
        MCPClient instance
    """
    global _client
    if _client is None:
        _client = MCPClient()
    return _client


async def call_mcp_tool(
    tool_name: str,
    input_data: Dict[str, Any],
    result_type: type[T] = dict
) -> T:
    """
    Convenience function to call an MCP tool

    This is the function that tool wrappers should use.
    It automatically handles the client singleton and returns
    just the data (or raises exception on error).

    Args:
        tool_name: Full tool name (e.g., 'github__create_issue')
        input_data: Tool input parameters
        result_type: Expected return type for type safety

    Returns:
        Tool result data (typed according to result_type)

    Raises:
        RuntimeError: If tool call fails

    Example:
        >>> data = await call_mcp_tool(
        ...     'github__get_file_contents',
        ...     {'owner': 'user', 'repo': 'repo', 'path': 'README.md'}
        ... )
        >>> print(data['content'])
    """
    client = get_client()
    result = await client.call_tool(tool_name, input_data, result_type)

    if not result.success:
        raise RuntimeError(f"MCP tool call failed: {result.error}")

    return result.data
