"""
MCP Configuration Service for Anthropic Integration
Configures native MCP tools for PAM's financial data access
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class MCPTool:
    """MCP tool configuration"""
    name: str
    description: str
    parameters: Dict[str, Any]
    required: List[str]


@dataclass
class MCPServer:
    """MCP server configuration"""
    name: str
    url: str
    tools: List[MCPTool]
    description: str


class MCPConfigService:
    """Service for configuring MCP tools with Anthropic's native MCP support"""
    
    def __init__(self):
        self.servers: List[MCPServer] = []
        self._initialize_default_servers()
    
    def _initialize_default_servers(self):
        """Initialize default MCP servers for PAM financial data access"""
        
        # PAM Supabase MCP Server (our built server for future use)
        supabase_tools = [
            MCPTool(
                name="get_expenses",
                description="Retrieve user expenses with filtering options",
                parameters={
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string", "description": "User UUID"},
                        "since": {"type": "string", "description": "Start date (YYYY-MM-DD)"},
                        "until": {"type": "string", "description": "End date (YYYY-MM-DD)"},
                        "limit": {"type": "number", "description": "Max records (default: 100)"},
                        "category": {"type": "string", "description": "Category filter"}
                    }
                },
                required=["user_id"]
            ),
            MCPTool(
                name="get_budgets",
                description="Retrieve user budget data",
                parameters={
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string", "description": "User UUID"},
                        "active_only": {"type": "boolean", "description": "Return only active budgets"}
                    }
                },
                required=["user_id"]
            ),
            MCPTool(
                name="get_income",
                description="Retrieve user income records",
                parameters={
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string", "description": "User UUID"},
                        "since": {"type": "string", "description": "Start date (YYYY-MM-DD)"},
                        "until": {"type": "string", "description": "End date (YYYY-MM-DD)"},
                        "limit": {"type": "number", "description": "Max records (default: 100)"}
                    }
                },
                required=["user_id"]
            ),
            MCPTool(
                name="analyze_spending",
                description="Run analytical queries on financial data",
                parameters={
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string", "description": "User UUID"},
                        "analysis_type": {
                            "type": "string",
                            "enum": ["top_categories", "monthly_trends", "fuel_costs"],
                            "description": "Type of analysis to perform"
                        },
                        "date_range_days": {"type": "number", "description": "Analysis period in days"}
                    }
                },
                required=["user_id", "analysis_type"]
            )
        ]
        
        self.servers.append(MCPServer(
            name="pam-supabase-mcp",
            url="https://pam-supabase-mcp-server.onrender.com",  # Future deployment
            tools=supabase_tools,
            description="Direct access to PAM's financial data via Supabase"
        ))
        
        logger.info(f"Initialized {len(self.servers)} MCP servers with {sum(len(s.tools) for s in self.servers)} total tools")
    
    def get_anthropic_mcp_config(self) -> Dict[str, Any]:
        """Get MCP configuration for Anthropic's native MCP support"""
        return {
            "servers": [
                {
                    "name": server.name,
                    "url": server.url,
                    "tools": [
                        {
                            "name": tool.name,
                            "description": tool.description,
                            "input_schema": {
                                "type": "object",
                                "properties": tool.parameters.get("properties", {}),
                                "required": tool.required
                            }
                        }
                        for tool in server.tools
                    ],
                    "description": server.description
                }
                for server in self.servers
            ]
        }
    
    def add_custom_server(self, server: MCPServer):
        """Add a custom MCP server configuration"""
        self.servers.append(server)
        logger.info(f"Added custom MCP server: {server.name}")
    
    def get_tool_by_name(self, tool_name: str) -> Optional[MCPTool]:
        """Get tool configuration by name"""
        for server in self.servers:
            for tool in server.tools:
                if tool.name == tool_name:
                    return tool
        return None
    
    def list_available_tools(self) -> List[str]:
        """List all available MCP tools"""
        tools = []
        for server in self.servers:
            for tool in server.tools:
                tools.append(f"{server.name}.{tool.name}")
        return tools
    
    def enable_mcp_for_anthropic(self, anthropic_provider) -> bool:
        """Enable MCP tools for an Anthropic provider instance"""
        try:
            config = self.get_anthropic_mcp_config()
            
            # Add each server to the provider
            for server_config in config["servers"]:
                anthropic_provider.add_mcp_server(
                    server_url=server_config["url"],
                    tools=[tool["name"] for tool in server_config["tools"]]
                )
            
            logger.info(f"Enabled MCP with {len(config['servers'])} servers for Anthropic provider")
            return True
            
        except Exception as e:
            logger.error(f"Failed to enable MCP for Anthropic provider: {e}")
            return False


# Global MCP configuration service
mcp_config = MCPConfigService()