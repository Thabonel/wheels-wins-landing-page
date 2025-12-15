"""
Context Engineering Integration Layer.

Bridges the Agentic Context Engineering system with PersonalizedPamAgent.
This allows gradual rollout - can be enabled/disabled via config.
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from supabase import create_client

from .context_compiler import CompilationConfig, CompiledContext, ContextCompiler
from .session_compactor import SessionCompactor
from .sub_agent_orchestrator import (
    OrchestrationResult,
    SubAgentOrchestrator,
    TaskComplexity,
)

logger = logging.getLogger(__name__)


class ContextEngineeringManager:
    """
    Manager for Context Engineering integration.

    Handles:
    - Session lifecycle (create, update, end)
    - Event tracking (messages, tool calls, errors)
    - Context compilation for LLM calls
    - Session compaction scheduling
    - Sub-agent orchestration routing
    """

    def __init__(
        self,
        embeddings_service=None,
        enable_context_compilation: bool = True,
        enable_session_compaction: bool = True,
        enable_sub_agent_orchestration: bool = True,
        compaction_threshold: int = 20,
    ):
        """
        Initialize the Context Engineering Manager.

        Args:
            embeddings_service: Optional embeddings service for memory retrieval
            enable_context_compilation: Whether to use ContextCompiler
            enable_session_compaction: Whether to auto-compact sessions
            enable_sub_agent_orchestration: Whether to use Planner/Executor for complex requests
            compaction_threshold: Events before compaction triggers
        """
        self.embeddings_service = embeddings_service
        self.enable_context_compilation = enable_context_compilation
        self.enable_session_compaction = enable_session_compaction
        self.enable_sub_agent_orchestration = enable_sub_agent_orchestration

        # Initialize components
        self.context_compiler = ContextCompiler(embeddings_service)
        self.session_compactor = SessionCompactor(compaction_threshold, embeddings_service)
        self.sub_agent_orchestrator = None  # Lazy init to avoid circular deps

        # Supabase client
        self.supabase = create_client(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        )

        # Active sessions cache
        self._active_sessions: Dict[str, UUID] = {}  # user_id -> session_id

        logger.info(
            f"ContextEngineeringManager initialized: "
            f"compilation={enable_context_compilation}, "
            f"compaction={enable_session_compaction}, "
            f"sub_agents={enable_sub_agent_orchestration}"
        )

    # =========================================================================
    # Session Management
    # =========================================================================

    async def get_or_create_session(
        self,
        user_id: UUID,
        title: Optional[str] = None,
    ) -> UUID:
        """
        Get active session or create new one for user.

        Returns:
            Session UUID
        """
        user_id_str = str(user_id)

        # Check cache first
        if user_id_str in self._active_sessions:
            session_id = self._active_sessions[user_id_str]
            # Verify session is still active in database
            result = (
                self.supabase.table("sessions")
                .select("id, status")
                .eq("id", str(session_id))
                .eq("status", "active")
                .single()
                .execute()
            )
            if result.data:
                return session_id

        # Check for existing active session in database
        result = (
            self.supabase.table("sessions")
            .select("id")
            .eq("user_id", user_id_str)
            .eq("status", "active")
            .order("last_activity_at", desc=True)
            .limit(1)
            .execute()
        )

        if result.data:
            session_id = UUID(result.data[0]["id"])
            self._active_sessions[user_id_str] = session_id
            return session_id

        # Create new session
        session_id = uuid4()
        self.supabase.table("sessions").insert(
            {
                "id": str(session_id),
                "user_id": user_id_str,
                "title": title or f"Session {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
                "status": "active",
            }
        ).execute()

        self._active_sessions[user_id_str] = session_id
        logger.info(f"Created new session {session_id} for user {user_id}")

        return session_id

    async def end_session(self, session_id: UUID, force_compact: bool = True) -> bool:
        """
        End a session and optionally compact it.

        Args:
            session_id: Session to end
            force_compact: Whether to force compaction before ending

        Returns:
            True if successful
        """
        try:
            # Compact session if enabled
            if force_compact and self.enable_session_compaction:
                await self.session_compactor.force_compact(session_id)

            # Update session status
            self.supabase.table("sessions").update(
                {"status": "completed", "ended_at": datetime.utcnow().isoformat()}
            ).eq("id", str(session_id)).execute()

            # Remove from cache
            for user_id, cached_session in list(self._active_sessions.items()):
                if cached_session == session_id:
                    del self._active_sessions[user_id]
                    break

            logger.info(f"Ended session {session_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to end session {session_id}: {e}")
            return False

    # =========================================================================
    # Event Tracking (Tier 1: Working Context)
    # =========================================================================

    async def track_event(
        self,
        session_id: UUID,
        user_id: UUID,
        event_type: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """
        Track an event in the session.

        Args:
            session_id: Session identifier
            user_id: User identifier
            event_type: Type of event (user_message, assistant_message, tool_call, etc.)
            content: Event content
            metadata: Optional metadata

        Returns:
            Event ID if successful
        """
        try:
            # Get next sequence number
            seq_result = self.supabase.rpc(
                "get_next_event_sequence", {"p_session_id": str(session_id)}
            ).execute()
            sequence_number = seq_result.data if seq_result.data else 1

            # Insert event
            result = (
                self.supabase.table("events")
                .insert(
                    {
                        "session_id": str(session_id),
                        "user_id": str(user_id),
                        "event_type": event_type,
                        "content": content,
                        "metadata": metadata or {},
                        "sequence_number": sequence_number,
                    }
                )
                .execute()
            )

            # Update session activity
            self.supabase.table("sessions").update(
                {
                    "last_activity_at": datetime.utcnow().isoformat(),
                    "message_count": sequence_number,
                }
            ).eq("id", str(session_id)).execute()

            # Check for compaction
            if self.enable_session_compaction:
                await self.session_compactor.check_and_compact(session_id)

            return result.data[0]["id"] if result.data else None

        except Exception as e:
            logger.error(f"Failed to track event: {e}")
            return None

    async def track_user_message(
        self,
        session_id: UUID,
        user_id: UUID,
        message: str,
    ) -> Optional[str]:
        """Track a user message event."""
        return await self.track_event(
            session_id=session_id,
            user_id=user_id,
            event_type="user_message",
            content=message,
        )

    async def track_assistant_message(
        self,
        session_id: UUID,
        user_id: UUID,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """Track an assistant message event."""
        return await self.track_event(
            session_id=session_id,
            user_id=user_id,
            event_type="assistant_message",
            content=message,
            metadata=metadata,
        )

    async def track_tool_call(
        self,
        session_id: UUID,
        user_id: UUID,
        tool_name: str,
        parameters: Dict[str, Any],
        result: Any,
        success: bool,
    ) -> Optional[str]:
        """Track a tool call event."""
        return await self.track_event(
            session_id=session_id,
            user_id=user_id,
            event_type="tool_call",
            content=f"Called {tool_name}",
            metadata={
                "tool_name": tool_name,
                "parameters": parameters,
                "result": str(result)[:500],  # Truncate long results
                "success": success,
            },
        )

    # =========================================================================
    # Context Compilation
    # =========================================================================

    async def compile_context(
        self,
        user_id: UUID,
        session_id: UUID,
        current_task: str,
        agent_scope: str = "default",
    ) -> CompiledContext:
        """
        Compile context for an LLM call.

        This replaces simple message history retrieval with 4-tier context compilation.

        Args:
            user_id: User identifier
            session_id: Current session identifier
            current_task: Current user request/task
            agent_scope: "default", "planner", or "executor"

        Returns:
            CompiledContext ready for LLM consumption
        """
        if not self.enable_context_compilation:
            # Return minimal context if disabled
            return CompiledContext(
                system_prompt="You are PAM, a helpful travel assistant.",
                agent_instructions="",
                user_profile_summary="",
            )

        config = CompilationConfig(agent_scope=agent_scope)

        return await self.context_compiler.compile_context(
            agent_id="pam_main",
            user_id=user_id,
            current_task=current_task,
            session_id=session_id,
            config=config,
        )

    # =========================================================================
    # Sub-Agent Orchestration
    # =========================================================================

    async def should_use_sub_agents(self, message: str) -> bool:
        """
        Determine if a message should be handled by the sub-agent orchestrator.

        Returns True for complex, multi-step requests.
        """
        if not self.enable_sub_agent_orchestration:
            return False

        # Simple heuristics for now - could be enhanced with ML classification
        complex_indicators = [
            "plan a trip",
            "create a budget",
            "analyze my",
            "compare",
            "optimize",
            "research",
            "find the best",
            "multi-stop",
            "multi-day",
        ]

        message_lower = message.lower()
        return any(indicator in message_lower for indicator in complex_indicators)

    async def process_with_sub_agents(
        self,
        user_id: UUID,
        session_id: UUID,
        message: str,
        available_tools: List[Dict],
        tool_executor=None,
    ) -> OrchestrationResult:
        """
        Process a complex request using sub-agent orchestration.

        Args:
            user_id: User identifier
            session_id: Session identifier
            message: User's request
            available_tools: Available tool definitions
            tool_executor: Function to execute tools

        Returns:
            OrchestrationResult with response and execution details
        """
        if self.sub_agent_orchestrator is None:
            self.sub_agent_orchestrator = SubAgentOrchestrator(
                context_compiler=self.context_compiler,
                tool_executor=tool_executor,
                embeddings_service=self.embeddings_service,
            )

        return await self.sub_agent_orchestrator.process_request(
            user_id=user_id,
            session_id=session_id,
            request=message,
            available_tools=available_tools,
        )

    # =========================================================================
    # Artifact Management (Tier 4)
    # =========================================================================

    async def create_artifact(
        self,
        user_id: UUID,
        session_id: Optional[UUID],
        artifact_type: str,
        name: str,
        content: str,
        summary: str,
    ) -> Optional[str]:
        """
        Create an artifact and return its handle.

        Artifacts are large objects (files, reports, etc.) that are stored
        separately and referenced by handle in context.

        Args:
            user_id: User identifier
            session_id: Optional session identifier
            artifact_type: Type of artifact
            name: Human-readable name
            content: Full content
            summary: Brief summary for context

        Returns:
            Artifact handle if successful
        """
        try:
            # Generate unique handle
            handle = f"artifact:{artifact_type}_{uuid4().hex[:8]}"

            result = (
                self.supabase.table("artifacts")
                .insert(
                    {
                        "user_id": str(user_id),
                        "session_id": str(session_id) if session_id else None,
                        "artifact_type": artifact_type,
                        "name": name,
                        "handle": handle,
                        "content": content,
                        "summary": summary,
                        "size_bytes": len(content.encode("utf-8")),
                    }
                )
                .execute()
            )

            if result.data:
                logger.info(f"Created artifact {handle} for user {user_id}")
                return handle

            return None

        except Exception as e:
            logger.error(f"Failed to create artifact: {e}")
            return None

    async def get_artifact(self, handle: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve an artifact by handle.

        Args:
            handle: Artifact handle

        Returns:
            Artifact data if found
        """
        try:
            result = (
                self.supabase.table("artifacts")
                .select("*")
                .eq("handle", handle)
                .single()
                .execute()
            )

            if result.data:
                # Update access stats
                self.supabase.table("artifacts").update(
                    {
                        "last_accessed_at": datetime.utcnow().isoformat(),
                        "access_count": result.data.get("access_count", 0) + 1,
                    }
                ).eq("handle", handle).execute()

                return result.data

            return None

        except Exception as e:
            logger.error(f"Failed to get artifact {handle}: {e}")
            return None


# =========================================================================
# Factory Function
# =========================================================================


def create_context_engineering_manager(
    embeddings_service=None,
    enable_all: bool = True,
) -> ContextEngineeringManager:
    """
    Create a ContextEngineeringManager with sensible defaults.

    Args:
        embeddings_service: Optional embeddings service
        enable_all: Enable all features (default True)

    Returns:
        Configured ContextEngineeringManager
    """
    return ContextEngineeringManager(
        embeddings_service=embeddings_service,
        enable_context_compilation=enable_all,
        enable_session_compaction=enable_all,
        enable_sub_agent_orchestration=enable_all,
    )
