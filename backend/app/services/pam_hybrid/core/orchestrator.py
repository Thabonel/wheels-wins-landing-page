"""Agent Orchestrator for PAM Hybrid System

Manages lifecycle and coordination of 5 specialized Claude agents:
- Dashboard Agent
- Budget Agent
- Trip Agent
- Community Agent
- Shop Agent
"""

import time
from typing import Dict, Optional
import logging

from anthropic import Anthropic

from .types import (
    AgentDomain,
    AgentTask,
    AgentResult,
    AgentMetrics
)
from .config import config
from .tool_registry import ToolRegistry
from .context_manager import ContextManager

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """Orchestrates specialized Claude agents"""

    def __init__(
        self,
        tool_registry: Optional[ToolRegistry] = None,
        context_manager: Optional[ContextManager] = None
    ):
        self.anthropic = Anthropic(api_key=config.anthropic_api_key)
        self.tool_registry = tool_registry or ToolRegistry()
        self.context_manager = context_manager or ContextManager()

        # Agent instances (lazy-loaded)
        self.agents: Dict[AgentDomain, any] = {}

        # Performance metrics
        self.metrics: Dict[AgentDomain, AgentMetrics] = {}

        # Initialize metrics
        for domain in AgentDomain:
            self.metrics[domain] = AgentMetrics(agent_domain=domain)

    def _get_agent(self, domain: AgentDomain):
        """Get or create agent for domain"""
        if domain not in self.agents:
            # Lazy-load agent
            from ..agents.dashboard_agent import DashboardAgent
            from ..agents.budget_agent import BudgetAgent
            from ..agents.trip_agent import TripAgent
            from ..agents.community_agent import CommunityAgent
            from ..agents.shop_agent import ShopAgent

            agent_classes = {
                AgentDomain.DASHBOARD: DashboardAgent,
                AgentDomain.BUDGET: BudgetAgent,
                AgentDomain.TRIP: TripAgent,
                AgentDomain.COMMUNITY: CommunityAgent,
                AgentDomain.SHOP: ShopAgent,
            }

            agent_class = agent_classes[domain]
            self.agents[domain] = agent_class(
                anthropic_client=self.anthropic,
                tool_registry=self.tool_registry,
                context_manager=self.context_manager
            )

            logger.info(f"Initialized {domain.value} agent")

        return self.agents[domain]

    async def execute_task(
        self,
        task: AgentTask
    ) -> AgentResult:
        """Execute task with appropriate agent"""

        start_time = time.time()

        try:
            # Get agent for domain
            agent = self._get_agent(task.domain)

            # Get user context
            context = await self.context_manager.get_user_context(task.user_id)
            task.context.update({
                "user_state": context.get("user_state", {}),
                "shared_memory": context.get("shared_memory", {})
            })

            # Execute task
            result = await agent.execute(task)

            # Update metrics
            metrics = self.metrics[task.domain]
            metrics.total_requests += 1

            if result.success:
                metrics.successful_requests += 1
            else:
                metrics.failed_requests += 1

            # Update average latency
            latency_ms = result.latency_ms
            if metrics.avg_latency_ms == 0:
                metrics.avg_latency_ms = latency_ms
            else:
                # Exponential moving average
                metrics.avg_latency_ms = (
                    0.9 * metrics.avg_latency_ms + 0.1 * latency_ms
                )

            metrics.total_cost_usd += result.cost_usd

            # Update tool usage counts
            for tool in result.tools_used:
                metrics.tools_usage[tool] = metrics.tools_usage.get(tool, 0) + 1

            # Save context updates
            await self.context_manager.set_last_agent_used(
                task.user_id,
                task.domain.value
            )

            return result

        except Exception as e:
            logger.error(f"Task execution failed for {task.domain.value}: {e}", exc_info=True)

            # Update error metrics
            metrics = self.metrics[task.domain]
            metrics.total_requests += 1
            metrics.failed_requests += 1

            latency_ms = int((time.time() - start_time) * 1000)

            return AgentResult(
                success=False,
                response="I encountered an error processing your request.",
                tools_used=[],
                iterations=0,
                cost_usd=0.0,
                latency_ms=latency_ms,
                error=str(e),
                metadata={"task": task.dict()}
            )

    def get_metrics(self, domain: Optional[AgentDomain] = None) -> Dict:
        """Get performance metrics"""
        if domain:
            return self.metrics[domain].dict()

        return {
            domain.value: metrics.dict()
            for domain, metrics in self.metrics.items()
        }

    async def shutdown(self):
        """Shutdown all agents"""
        for domain, agent in self.agents.items():
            try:
                if hasattr(agent, "shutdown"):
                    await agent.shutdown()
                logger.info(f"Shutdown {domain.value} agent")
            except Exception as e:
                logger.error(f"Error shutting down {domain.value} agent: {e}")