"""Complexity Router for PAM Hybrid System

Routes requests to appropriate handlers based on complexity classification.
"""

from typing import Optional
import logging
import time

from .types import (
    HybridRequest,
    HybridResponse,
    QueryComplexity,
    AgentTask
)
from .classifier import ComplexityClassifier
from .config import config

logger = logging.getLogger(__name__)


class ComplexityRouter:
    """Routes requests based on complexity"""

    def __init__(
        self,
        classifier: ComplexityClassifier,
        orchestrator,  # AgentOrchestrator
        gpt_handler  # GPT-4o-mini handler
    ):
        self.classifier = classifier
        self.orchestrator = orchestrator
        self.gpt_handler = gpt_handler

    async def route(
        self,
        request: HybridRequest
    ) -> HybridResponse:
        """Route request to appropriate handler"""

        start_time = time.time()

        try:
            # Classify the request
            classification = await self.classifier.classify(request)

            logger.info(
                f"Classification: {classification.complexity.value} "
                f"(confidence: {classification.confidence:.2f}, "
                f"domain: {classification.domain}, "
                f"handler: {classification.suggested_handler})"
            )

            # Route based on classification
            if classification.suggested_handler == "gpt4o-mini":
                response_text = await self.gpt_handler.handle(request)
                handler = "gpt4o-mini"
                agent_used = None
                tools_called = []  # TODO: Extract from gpt_handler

            else:  # claude-agent
                if not classification.domain:
                    # If no domain detected, use dashboard agent as default
                    classification.domain = "dashboard"

                # Create agent task
                task = AgentTask(
                    domain=classification.domain,
                    user_id=request.user_id,
                    objective=request.message,
                    context=request.context,
                    conversation_history=request.conversation_history,
                )

                # Execute with agent
                result = await self.orchestrator.execute_task(task)

                if result.success:
                    response_text = result.response
                    handler = f"claude-{classification.domain.value}"
                    agent_used = classification.domain
                    tools_called = result.tools_used
                else:
                    # Fallback to GPT-4o-mini
                    logger.warning(
                        f"Agent execution failed, falling back to GPT-4o-mini: {result.error}"
                    )
                    response_text = await self.gpt_handler.handle(request)
                    handler = "gpt4o-mini-fallback"
                    agent_used = None
                    tools_called = []

            latency_ms = int((time.time() - start_time) * 1000)

            return HybridResponse(
                response=response_text,
                handler=handler,
                complexity=classification.complexity,
                agent_used=agent_used,
                tools_called=tools_called,
                cost_estimate=classification.estimated_cost_usd,
                latency_ms=latency_ms,
                metadata={
                    "classification": classification.dict(),
                }
            )

        except Exception as e:
            logger.error(f"Routing failed: {e}", exc_info=True)

            # Ultimate fallback
            try:
                response_text = await self.gpt_handler.handle(request)
                handler = "gpt4o-mini-fallback-error"
            except Exception as fallback_error:
                logger.error(f"Fallback also failed: {fallback_error}")
                response_text = (
                    "I apologize, but I'm having trouble processing your request "
                    "right now. Please try again in a moment."
                )
                handler = "error"

            latency_ms = int((time.time() - start_time) * 1000)

            return HybridResponse(
                response=response_text,
                handler=handler,
                complexity=QueryComplexity.SIMPLE,
                agent_used=None,
                tools_called=[],
                cost_estimate=0.0,
                latency_ms=latency_ms,
                metadata={
                    "error": str(e)
                }
            )