"""
OpenAI Responses API adapter for the Pam V2 provider-neutral model client.

All OpenAI-specific objects stay inside this module. The runtime consumes only
ModelEvent instances from app.services.pam_v2.models.base.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncIterator, Dict, List, Optional

from app.services.pam_v2.models.base import (
    FinishEvent,
    Message,
    ModelClient,
    ModelClientConfig,
    ModelErrorEvent,
    ModelEvent,
    TextDeltaEvent,
    ToolCallEvent,
    ToolSchema,
    UsageEvent,
)


class OpenAIResponsesClient(ModelClient):
    """Model client backed by the OpenAI Responses API."""

    def __init__(self, config: ModelClientConfig, client: Optional[Any] = None):
        self.config = config
        self._client = client
        self._timeout = config.timeout_seconds

    @property
    def client(self):
        """Lazy AsyncOpenAI client."""
        if self._client is None:
            from openai import AsyncOpenAI

            kwargs: Dict[str, Any] = {}
            if self.config.api_key:
                kwargs["api_key"] = self.config.api_key
            if self.config.base_url:
                kwargs["base_url"] = self.config.base_url
            self._client = AsyncOpenAI(**kwargs)
        return self._client

    async def send(
        self,
        messages: List[Message],
        tools: List[ToolSchema],
    ) -> AsyncIterator[ModelEvent]:
        openai_messages = [_to_openai_message(m) for m in messages]
        openai_tools = [_to_openai_tool(t) for t in tools]

        request: Dict[str, Any] = {
            "model": self.config.model,
            "input": openai_messages,
            "stream": True,
            "timeout": self._timeout,
        }
        if self.config.temperature is not None:
            request["temperature"] = self.config.temperature
        if self.config.max_tokens is not None:
            request["max_output_tokens"] = self.config.max_tokens
        if openai_tools:
            request["tools"] = openai_tools

        try:
            stream = await self.client.responses.create(**request)
        except Exception as exc:
            for event in _translate_error(exc):
                yield event
            return

        try:
            async for raw_event in stream:
                for event in _translate_event(raw_event):
                    yield event
        except asyncio.CancelledError:
            # Propagate cancellation to the caller after stopping network work.
            raise
        except Exception as exc:
            for event in _translate_error(exc):
                yield event


def _to_openai_message(message: Message) -> Dict[str, Any]:
    if message.role == "tool":
        return {
            "type": "function_call_output",
            "call_id": message.tool_call_id or "",
            "output": message.content or "",
        }

    if message.role == "assistant" and message.tool_calls:
        return {
            "role": "assistant",
            "content": message.content or "",
            "tool_calls": [
                {
                    "id": tc.tool_call_id,
                    "type": "function",
                    "function": {
                        "name": tc.tool_name,
                        "arguments": json.dumps(tc.arguments),
                    },
                }
                for tc in message.tool_calls
            ],
        }

    return {"role": message.role, "content": message.content or ""}


def _to_openai_tool(tool: ToolSchema) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "type": "function",
        "name": tool.name,
        "description": tool.description,
        "parameters": tool.parameters,
    }
    if tool.strict is not None:
        out["strict"] = tool.strict
    return out


def _translate_event(raw: Any) -> List[ModelEvent]:
    """Translate a single OpenAI stream event into normalized model events."""
    event_type = getattr(raw, "type", None)

    if event_type == "response.output_text.delta":
        delta = getattr(raw, "delta", "")
        if delta:
            return [TextDeltaEvent(delta=delta)]
        return []

    if event_type == "response.function_call_arguments.done":
        try:
            arguments = json.loads(getattr(raw, "arguments", "{}"))
        except json.JSONDecodeError:
            arguments = {}
        return [
            ToolCallEvent(
                tool_call_id=getattr(raw, "call_id", "") or str(id(raw)),
                tool_name=getattr(raw, "name", ""),
                arguments=arguments,
            )
        ]

    if event_type == "response.completed":
        events: List[ModelEvent] = []
        response = getattr(raw, "response", None)
        usage = getattr(response, "usage", None)
        if usage is not None:
            events.append(
                UsageEvent(
                    input_tokens=getattr(usage, "input_tokens", 0) or 0,
                    output_tokens=getattr(usage, "output_tokens", 0) or 0,
                    total_tokens=getattr(usage, "total_tokens", 0) or 0,
                )
            )
        events.append(FinishEvent(reason="completed"))
        return events

    if event_type == "response.incomplete":
        return [FinishEvent(reason="max_tokens")]

    if event_type == "error":
        code = getattr(raw, "code", "provider_error")
        message = getattr(raw, "message", "Provider error")
        return [ModelErrorEvent(code=code, message=message)]

    return []


def _translate_error(exc: Exception) -> List[ModelEvent]:
    """Map provider exceptions to safe stable codes."""
    name = type(exc).__name__
    message = str(exc) or name

    if "timeout" in message.lower() or name in ("TimeoutError", "APITimeoutError"):
        return [ModelErrorEvent(code="provider_timeout", message="Model request timed out")]

    if "rate limit" in message.lower() or name == "RateLimitError":
        return [ModelErrorEvent(code="provider_rate_limit", message="Model rate limit hit")]

    if "authentication" in message.lower() or name == "AuthenticationError":
        return [ModelErrorEvent(code="provider_auth", message="Model provider authentication failed")]

    return [ModelErrorEvent(code="provider_error", message="Model provider error")]
