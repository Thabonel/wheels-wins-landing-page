"""
Versioned system instructions and prompt builder for Pam V2.

Static instructions are kept separate from dynamic request context so that
caching-friendly static text can be reused across turns.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Protocol

from app.services.pam_v2.models import Message


PROMPT_VERSION = "2026-06-16"


class _ToolLike(Protocol):
    name: str
    namespace: str


_STATIC_INSTRUCTIONS = """\
You are Pam, a helpful, plain-speaking assistant for Australian RV and road-trip travellers.

Your current capabilities are read-only: you can look up the user's profile, weather, calendar
events, route suggestions, and campground information when the relevant tools are provided.
You cannot book, buy, delete, modify, or send anything on the user's behalf in this mode.

Guidelines:
- Be concise. One or two sentences is usually enough.
- Use the user's locale and timezone.
- If a request is ambiguous or would require sensitive access, ask a clarifying question instead
  of guessing.
- Only call tools that are listed in the available tools summary below. Do not invent tools.
- If no tool matches, say so honestly.
- Never ask the user to reveal passwords, API keys, or payment details.
"""


def build_system_prompt(
    locale: str,
    timezone: str,
    tools: List[_ToolLike],
    extra_context: Dict[str, Any] | None = None,
    now: datetime | None = None,
) -> str:
    """
    Build the versioned system prompt for a single turn.

    Static instructions come first; dynamic context is appended. The tool list is
    summarized by namespace/name only and is never a full enumeration of schemas.
    """
    if now is None:
        now = datetime.now()

    tool_summary = _summarize_tools(tools)
    dynamic = (
        f"\nRuntime context:\n"
        f"- prompt_version: {PROMPT_VERSION}\n"
        f"- current_time: {now.isoformat()}\n"
        f"- locale: {locale}\n"
        f"- timezone: {timezone}\n"
        f"- available_tools: {tool_summary if tool_summary else 'none'}\n"
    )

    if extra_context:
        for key, value in extra_context.items():
            if _is_safe_extra_key(key):
                dynamic += f"- {key}: {value}\n"

    return _STATIC_INSTRUCTIONS + dynamic


def build_messages(
    user_message: str,
    locale: str,
    timezone: str,
    tools: List[_ToolLike],
    history: List[Message] | None = None,
    extra_context: Dict[str, Any] | None = None,
    now: datetime | None = None,
) -> List[Message]:
    """Return the initial message list for a turn: system + optional history + user."""
    system_content = build_system_prompt(locale, timezone, tools, extra_context, now)
    messages: List[Message] = [Message(role="system", content=system_content)]
    if history:
        messages.extend(history)
    messages.append(Message(role="user", content=user_message))
    return messages


def _summarize_tools(tools: List[_ToolLike]) -> str:
    """Return a compact, sorted list of tool names grouped by namespace."""
    if not tools:
        return ""
    by_namespace: Dict[str, List[str]] = {}
    for tool in tools:
        by_namespace.setdefault(tool.namespace, []).append(tool.name)

    parts = []
    for namespace in sorted(by_namespace):
        names = ", ".join(sorted(by_namespace[namespace]))
        parts.append(f"{namespace}: {names}")
    return "; ".join(parts)


def _is_safe_extra_key(key: str) -> bool:
    """Return False for keys that likely carry secrets or credentials."""
    lowered = key.lower()
    blocked = {"api_key", "password", "secret", "token", "auth", "credential", "private_key"}
    return not any(block in lowered for block in blocked)
