"""
Automated tool converter: Claude format → OpenAI format
Converts all 40+ PAM tools in seconds
"""

from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)


def claude_to_openai_tools(claude_tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert Claude tool definitions to OpenAI function calling format

    Claude format:
    {
        "name": "create_expense",
        "description": "Add expense to budget tracker",
        "input_schema": {
            "type": "object",
            "properties": {...},
            "required": [...]
        }
    }

    OpenAI format:
    {
        "type": "function",
        "function": {
            "name": "create_expense",
            "description": "Add expense to budget tracker",
            "parameters": {
                "type": "object",
                "properties": {...},
                "required": [...]
            }
        }
    }
    """
    openai_tools = []

    for tool in claude_tools:
        try:
            openai_tool = {
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool["description"],
                    "parameters": tool["input_schema"]  # Just rename the key!
                }
            }
            openai_tools.append(openai_tool)

        except KeyError as e:
            logger.warning(f"⚠️ Skipping tool {tool.get('name', 'unknown')}: missing {e}")
            continue

    logger.info(f"✅ Converted {len(openai_tools)} Claude tools to OpenAI format")

    return openai_tools


def openai_to_claude_tool(openai_tool: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert OpenAI tool definition back to Claude format
    (Useful if we need to swap back to Claude later)
    """
    try:
        function = openai_tool["function"]

        claude_tool = {
            "name": function["name"],
            "description": function["description"],
            "input_schema": function["parameters"]  # Reverse the rename
        }

        return claude_tool

    except KeyError as e:
        logger.error(f"❌ Failed to convert OpenAI tool: missing {e}")
        raise
