"""Hybrid Gateway for PAM System

Main entry point for hybrid PAM requests. Routes between:
- GPT-4o-mini for simple conversational queries (95%)
- Claude Agent SDK for complex tasks (5%)
"""

import logging
import time
from typing import Optional

from openai import AsyncOpenAI

from .types import HybridRequest, HybridResponse
from .config import config
from .classifier import ComplexityClassifier
from .router import ComplexityRouter
from .orchestrator import AgentOrchestrator
from .tool_registry import ToolRegistry
from .context_manager import ContextManager

logger = logging.getLogger(__name__)


class GPT4oMiniHandler:
    """Handler for GPT-4o-mini simple queries"""

    def __init__(
        self,
        context_manager: ContextManager,
        tool_registry: ToolRegistry
    ):
        self.client = AsyncOpenAI(api_key=config.openai_api_key)
        self.context_manager = context_manager
        self.tool_registry = tool_registry

    async def handle(self, request: HybridRequest) -> str:
        """Handle simple query with GPT-4o-mini"""

        try:
            # Get conversation history
            history = await self.context_manager.get_conversation_history(
                request.user_id,
                limit=10
            )

            # Build messages
            messages = []

            # System prompt
            messages.append({
                "role": "system",
                "content": (
                    "You are PAM (Personal AI Manager), a helpful AI assistant for "
                    "Wheels & Wins, an RV travel and budget management platform. "
                    "You help users with navigation, quick lookups, and conversational queries. "
                    "For complex tasks like planning trips or analyzing budgets, you should "
                    "acknowledge the request and indicate that you're working on it. "
                    "Be friendly, concise, and helpful."
                )
            })

            # Add conversation history
            for turn in history:
                messages.append({
                    "role": turn["role"],
                    "content": turn["content"]
                })

            # Add current message
            messages.append({
                "role": "user",
                "content": request.message
            })

            # Call GPT-4o-mini
            response = await self.client.chat.completions.create(
                model=config.gpt_model,
                messages=messages,
                max_tokens=config.max_tokens_gpt,
                temperature=0.7,
                timeout=config.gpt_timeout_seconds
            )

            response_text = response.choices[0].message.content

            # Save conversation turn
            await self.context_manager.add_conversation_turn(
                request.user_id,
                "user",
                request.message
            )
            await self.context_manager.add_conversation_turn(
                request.user_id,
                "assistant",
                response_text,
                metadata={"handler": "gpt4o-mini"}
            )

            return response_text

        except Exception as e:
            logger.error(f"GPT-4o-mini handler failed: {e}", exc_info=True)
            return (
                "I apologize, but I'm having trouble processing your request right now. "
                "Please try again in a moment."
            )


class HybridGateway:
    """Main gateway for hybrid PAM system"""

    def __init__(
        self,
        tool_registry: Optional[ToolRegistry] = None,
        context_manager: Optional[ContextManager] = None
    ):
        # Initialize components
        self.tool_registry = tool_registry or ToolRegistry()
        self.context_manager = context_manager or ContextManager()

        # Initialize handlers
        self.gpt_handler = GPT4oMiniHandler(
            context_manager=self.context_manager,
            tool_registry=self.tool_registry
        )

        self.orchestrator = AgentOrchestrator(
            tool_registry=self.tool_registry,
            context_manager=self.context_manager
        )

        # Initialize classifier and router
        self.classifier = ComplexityClassifier()
        self.router = ComplexityRouter(
            classifier=self.classifier,
            orchestrator=self.orchestrator,
            gpt_handler=self.gpt_handler
        )

        logger.info("Hybrid Gateway initialized")

    async def process_request(
        self,
        user_id: str,
        message: str,
        context: Optional[dict] = None,
        voice_input: bool = False
    ) -> HybridResponse:
        """Process incoming request"""

        start_time = time.time()

        try:
            # Create hybrid request
            request = HybridRequest(
                user_id=user_id,
                message=message,
                context=context or {},
                conversation_history=await self.context_manager.get_conversation_history(
                    user_id,
                    limit=10
                ),
                voice_input=voice_input
            )

            # Route request
            response = await self.router.route(request)

            logger.info(
                f"Request processed: handler={response.handler}, "
                f"latency={response.latency_ms}ms, "
                f"cost=${response.cost_estimate:.6f}"
            )

            return response

        except Exception as e:
            logger.error(f"Gateway processing failed: {e}", exc_info=True)

            latency_ms = int((time.time() - start_time) * 1000)

            return HybridResponse(
                response=(
                    "I apologize, but I encountered an error processing your request. "
                    "Please try again."
                ),
                handler="error",
                complexity="simple",
                latency_ms=latency_ms,
                metadata={"error": str(e)}
            )

    async def get_metrics(self) -> dict:
        """Get system metrics"""
        return {
            "orchestrator_metrics": self.orchestrator.get_metrics(),
            "tools_loaded": len(self.tool_registry.tools),
        }

    async def shutdown(self):
        """Shutdown gateway"""
        await self.orchestrator.shutdown()
        logger.info("Hybrid Gateway shutdown")