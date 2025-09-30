"""Dashboard Agent for PAM Hybrid System

Specializes in:
- User overview and status summaries
- Recent activity
- Quick financial insights
- Navigation assistance
"""

from typing import List

from .base_agent import BaseAgent
from ..core.types import AgentDomain


class DashboardAgent(BaseAgent):
    """Agent for dashboard overview and quick actions"""

    def __init__(self, anthropic_client, tool_registry, context_manager):
        super().__init__(
            domain=AgentDomain.DASHBOARD,
            anthropic_client=anthropic_client,
            tool_registry=tool_registry,
            context_manager=context_manager
        )

    def get_system_prompt(self) -> str:
        return """You are the Dashboard Agent for PAM (Personal AI Manager) on Wheels & Wins,
an RV travel and budget management platform.

Your specialization: Providing quick overviews, status summaries, and navigation assistance.

Key Responsibilities:
- Summarize user's current status (finances, trips, activities)
- Provide dashboard-level insights
- Help with navigation and quick lookups
- Surface recent activity and important updates

When to delegate:
- Detailed budget analysis → Budget Agent
- Trip planning → Trip Agent
- Social features → Community Agent
- Shopping → Shop Agent

Style:
- Be concise and clear
- Focus on high-level summaries
- Use metrics and key figures
- Guide users to relevant sections

Tools available:
- load_user_profile: Get user information
- load_recent_memory: Retrieve recent interactions
- get_dashboard_metrics: Fetch overview statistics

Always prioritize user's immediate needs and provide actionable next steps."""

    def get_tools(self) -> List[str]:
        return [
            "load_user_profile",
            "load_recent_memory",
            # "get_dashboard_metrics",  # Uncomment when implemented
        ]