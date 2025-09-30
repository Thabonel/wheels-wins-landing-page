"""Base Agent for PAM Hybrid System

All specialized agents extend this base class.
"""

import time
import json
from typing import List, Optional
from abc import ABC, abstractmethod
import logging

from anthropic import Anthropic

from ..core.types import AgentTask, AgentResult, ToolCall, AgentDomain
from ..core.tool_registry import ToolRegistry
from ..core.context_manager import ContextManager
from ..core.config import config

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Base class for all Claude agents"""

    def __init__(
        self,
        domain: AgentDomain,
        anthropic_client: Anthropic,
        tool_registry: ToolRegistry,
        context_manager: ContextManager
    ):
        self.domain = domain
        self.anthropic = anthropic_client
        self.tool_registry = tool_registry
        self.context_manager = context_manager

        # Get agent config
        self.agent_config = config.agent_configs.get(domain.value, {})
        self.max_iterations = self.agent_config.get(
            "max_iterations",
            config.max_agent_iterations
        )
        self.timeout = self.agent_config.get(
            "timeout",
            config.agent_timeout_seconds
        )

    @abstractmethod
    def get_system_prompt(self) -> str:
        """Get system prompt for this agent"""
        pass

    @abstractmethod
    def get_tools(self) -> List[str]:
        """Get list of tool names this agent can use"""
        pass

    async def execute(self, task: AgentTask) -> AgentResult:
        """Execute agent task"""

        start_time = time.time()
        tools_used = []
        iterations = 0

        try:
            # Get tools for this agent
            tool_names = self.get_tools()
            tool_schemas = []

            for tool_name in tool_names:
                tool = self.tool_registry.get_tool(tool_name)
                if tool:
                    # Build tool schema for Claude
                    metadata = self.tool_registry.get_tool_metadata(tool_name)
                    tool_schemas.append({
                        "name": tool_name,
                        "description": metadata["description"],
                        "input_schema": {
                            "type": "object",
                            "properties": {},
                            "required": []
                        }
                    })

            # Build messages
            messages = []

            # Add conversation history
            for turn in task.conversation_history[-5:]:  # Last 5 turns
                messages.append({
                    "role": turn.get("role", "user"),
                    "content": turn.get("content", "")
                })

            # Add current objective
            context_str = json.dumps(task.context, indent=2) if task.context else "None"
            user_message = f"""
{task.objective}

Context:
{context_str}
"""

            messages.append({
                "role": "user",
                "content": user_message.strip()
            })

            # Execute with Claude
            response = self.anthropic.messages.create(
                model=config.claude_model,
                max_tokens=config.max_tokens_claude,
                system=self.get_system_prompt(),
                messages=messages,
                tools=tool_schemas if tool_schemas else None,
                timeout=self.timeout
            )

            iterations = 1
            response_text = ""

            # Process response
            for block in response.content:
                if block.type == "text":
                    response_text += block.text
                elif block.type == "tool_use":
                    # Tool call requested
                    tool_name = block.name
                    tool_input = block.input

                    try:
                        # Execute tool
                        tool_result = await self.tool_registry.call_tool(
                            tool_name,
                            task.user_id,
                            **tool_input
                        )

                        tools_used.append(tool_name)

                        logger.info(f"Tool called: {tool_name} by {self.domain.value} agent")

                    except Exception as tool_error:
                        logger.error(f"Tool execution failed: {tool_name} - {tool_error}")

            if not response_text:
                response_text = f"I processed your request regarding {task.objective}"

            # Calculate cost
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens

            cost_usd = (
                (input_tokens / 1_000_000) * config.claude_input_cost +
                (output_tokens / 1_000_000) * config.claude_output_cost
            )

            latency_ms = int((time.time() - start_time) * 1000)

            # Save conversation
            await self.context_manager.add_conversation_turn(
                task.user_id,
                "user",
                task.objective
            )
            await self.context_manager.add_conversation_turn(
                task.user_id,
                "assistant",
                response_text,
                metadata={"agent": self.domain.value, "tools_used": tools_used}
            )

            return AgentResult(
                success=True,
                response=response_text,
                tools_used=tools_used,
                iterations=iterations,
                cost_usd=cost_usd,
                latency_ms=latency_ms,
                metadata={
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "model": config.claude_model
                }
            )

        except Exception as e:
            logger.error(f"Agent execution failed ({self.domain.value}): {e}", exc_info=True)

            latency_ms = int((time.time() - start_time) * 1000)

            return AgentResult(
                success=False,
                response=f"I encountered an error: {str(e)}",
                tools_used=tools_used,
                iterations=iterations,
                cost_usd=0.0,
                latency_ms=latency_ms,
                error=str(e)
            )