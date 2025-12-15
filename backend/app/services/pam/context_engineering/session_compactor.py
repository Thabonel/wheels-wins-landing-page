"""
Session Compactor - Schema-Driven Summarization.

Implements Principle 5: Schema-Driven Summarization.
This is NOT blind summarization - it's structured extraction following a defined schema.
"""

import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from anthropic import AsyncAnthropic
from supabase import create_client

logger = logging.getLogger(__name__)

# Schema for session summaries - MUST follow this structure
SESSION_SUMMARY_SCHEMA = {
    "goals": ["User's stated or inferred goals"],
    "decisions_made": [
        {"decision": "string", "reasoning": "string", "timestamp": "ISO8601"}
    ],
    "key_entities": [
        {"name": "string", "type": "location|person|vehicle|item|event|budget", "relevance": 0.0}
    ],
    "open_threads": ["Unresolved questions or pending items"],
    "user_sentiment": "positive|neutral|negative|mixed",
    "topics_discussed": ["Main topics covered"],
    "actions_taken": [
        {"action": "string", "tool_used": "string", "result": "success|partial|failed"}
    ],
    "learned_preferences": [{"preference": "string", "confidence": 0.0}],
}

COMPACTION_PROMPT = """You are a context compaction agent. Your job is to extract structured information from conversation events.

Given the following conversation events, extract information according to EXACTLY this JSON schema:

```json
{
  "goals": ["User's stated or inferred goals - be specific"],
  "decisions_made": [{"decision": "What was decided", "reasoning": "Why", "timestamp": "When"}],
  "key_entities": [{"name": "Entity name", "type": "location|person|vehicle|item|event|budget", "relevance": 0.0-1.0}],
  "open_threads": ["Questions or tasks still pending"],
  "user_sentiment": "positive|neutral|negative|mixed",
  "topics_discussed": ["Main topics"],
  "actions_taken": [{"action": "What was done", "tool_used": "tool name or null", "result": "success|partial|failed"}],
  "learned_preferences": [{"preference": "What we learned about user preferences", "confidence": 0.0-1.0}]
}
```

PREVIOUS SESSION SUMMARY (merge with new information):
{previous_summary}

CONVERSATION EVENTS TO PROCESS:
{events_text}

RULES:
1. Output ONLY valid JSON matching the schema exactly
2. Merge with previous summary - don't lose existing information
3. For relevance/confidence scores, use 0.0-1.0 scale
4. Be concise but specific - capture actionable information
5. If no information for a field, use empty array [] or "neutral"

Output the JSON now:"""


@dataclass
class CompactionResult:
    """Result of a session compaction operation."""

    success: bool
    events_compacted: int
    new_summary: Dict[str, Any]
    previous_summary: Dict[str, Any]
    error_message: Optional[str] = None


class SessionCompactor:
    """
    Compacts session events into structured summaries.

    This is NOT summarization - it's structured extraction following a defined schema.
    The schema ensures we capture actionable information, not just conversation gist.
    """

    def __init__(
        self,
        compaction_threshold: int = 20,
        embeddings_service=None,
    ):
        """
        Initialize compactor.

        Args:
            compaction_threshold: Number of uncompacted events that triggers compaction
            embeddings_service: Service for generating summary embeddings
        """
        self.compaction_threshold = compaction_threshold
        self.embeddings_service = embeddings_service

        self.supabase = create_client(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        )

        self.anthropic = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = "claude-sonnet-4-5-20250929"

    async def check_and_compact(self, session_id: UUID) -> Optional[CompactionResult]:
        """
        Check if session needs compaction and perform if necessary.

        Returns CompactionResult if compaction was performed, None otherwise.
        """
        # Count uncompacted events
        count_result = (
            self.supabase.table("events")
            .select("id", count="exact")
            .eq("session_id", str(session_id))
            .eq("is_compacted", False)
            .execute()
        )

        uncompacted_count = count_result.count or 0

        if uncompacted_count >= self.compaction_threshold:
            logger.info(
                f"Session {session_id} has {uncompacted_count} uncompacted events, "
                f"triggering compaction (threshold: {self.compaction_threshold})"
            )
            return await self.compact_session(session_id)

        return None

    async def compact_session(self, session_id: UUID) -> CompactionResult:
        """
        Perform session compaction.

        Steps:
        1. Fetch uncompacted events
        2. Extract structured summary via Claude
        3. Merge with existing summary
        4. Mark events as compacted
        5. Update session summary
        6. Generate and store embedding
        """
        logger.info(f"Starting compaction for session {session_id}")

        try:
            # Step 1: Fetch uncompacted events
            events_result = (
                self.supabase.table("events")
                .select("event_type, content, metadata, created_at, sequence_number")
                .eq("session_id", str(session_id))
                .eq("is_compacted", False)
                .order("sequence_number")
                .execute()
            )

            events = events_result.data or []
            if not events:
                return CompactionResult(
                    success=True,
                    events_compacted=0,
                    new_summary={},
                    previous_summary={},
                )

            # Step 2: Get existing session summary
            session_result = (
                self.supabase.table("sessions")
                .select("session_summary, compaction_count")
                .eq("id", str(session_id))
                .single()
                .execute()
            )

            previous_summary = (
                session_result.data.get("session_summary", {}) if session_result.data else {}
            )
            compaction_count = (
                session_result.data.get("compaction_count", 0) if session_result.data else 0
            )

            # Step 3: Format events for extraction
            events_text = self._format_events_for_extraction(events)

            # Step 4: Extract structured summary via Claude
            new_extraction = await self._extract_summary(events_text, previous_summary)

            # Step 5: Merge summaries
            merged_summary = self._merge_summaries(previous_summary, new_extraction)

            # Step 6: Mark events as compacted
            event_ids = [e.get("id") for e in events if e.get("id")]
            if event_ids:
                self.supabase.table("events").update(
                    {"is_compacted": True, "compacted_into_session_id": str(session_id)}
                ).in_("id", event_ids).execute()

            # Step 7: Update session with new summary
            update_data = {
                "session_summary": merged_summary,
                "compaction_count": compaction_count + 1,
                "last_compaction_at": datetime.utcnow().isoformat(),
            }

            # Step 8: Generate embedding for summary (optional)
            if self.embeddings_service:
                summary_text = self._summary_to_text(merged_summary)
                embedding = await self.embeddings_service.generate_embedding(summary_text)
                if embedding:
                    update_data["summary_embedding"] = embedding

            self.supabase.table("sessions").update(update_data).eq(
                "id", str(session_id)
            ).execute()

            # Step 9: Add compaction marker event
            await self._add_compaction_marker(session_id, len(events))

            logger.info(
                f"Compaction complete for session {session_id}: "
                f"{len(events)} events compacted"
            )

            return CompactionResult(
                success=True,
                events_compacted=len(events),
                new_summary=merged_summary,
                previous_summary=previous_summary,
            )

        except Exception as e:
            logger.error(f"Compaction failed for session {session_id}: {e}")
            return CompactionResult(
                success=False,
                events_compacted=0,
                new_summary={},
                previous_summary={},
                error_message=str(e),
            )

    def _format_events_for_extraction(self, events: List[Dict]) -> str:
        """Format events into readable text for extraction."""
        lines = []
        for event in events:
            event_type = event.get("event_type", "unknown")
            content = event.get("content", "")
            timestamp = event.get("created_at", "")

            if event_type == "user_message":
                lines.append(f"[{timestamp}] USER: {content}")
            elif event_type == "assistant_message":
                lines.append(f"[{timestamp}] PAM: {content}")
            elif event_type == "tool_call":
                metadata = event.get("metadata", {})
                tool_name = metadata.get("tool_name", "unknown")
                lines.append(f"[{timestamp}] TOOL CALL: {tool_name} - {content}")
            elif event_type == "tool_result":
                lines.append(f"[{timestamp}] TOOL RESULT: {content[:200]}...")
            elif event_type == "system_event":
                lines.append(f"[{timestamp}] SYSTEM: {content}")

        return "\n".join(lines)

    async def _extract_summary(self, events_text: str, previous_summary: Dict) -> Dict:
        """Use Claude to extract structured summary following schema."""
        prompt = COMPACTION_PROMPT.format(
            previous_summary=json.dumps(previous_summary, indent=2) if previous_summary else "None",
            events_text=events_text,
        )

        try:
            response = await self.anthropic.messages.create(
                model=self.model,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            )

            # Parse JSON response
            response_text = response.content[0].text.strip()

            # Handle potential markdown code blocks
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
                response_text = response_text.strip()

            extracted = json.loads(response_text)

            # Validate against schema
            return self._validate_and_fill_schema(extracted)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse extraction response: {e}")
            return self._empty_summary()
        except Exception as e:
            logger.error(f"Extraction failed: {e}")
            return self._empty_summary()

    def _validate_and_fill_schema(self, extracted: Dict) -> Dict:
        """Validate extracted data and fill missing fields with defaults."""
        result = {
            "goals": extracted.get("goals", []),
            "decisions_made": extracted.get("decisions_made", []),
            "key_entities": extracted.get("key_entities", []),
            "open_threads": extracted.get("open_threads", []),
            "user_sentiment": extracted.get("user_sentiment", "neutral"),
            "topics_discussed": extracted.get("topics_discussed", []),
            "actions_taken": extracted.get("actions_taken", []),
            "learned_preferences": extracted.get("learned_preferences", []),
        }

        # Ensure arrays are lists
        for key in ["goals", "decisions_made", "key_entities", "open_threads",
                    "topics_discussed", "actions_taken", "learned_preferences"]:
            if not isinstance(result[key], list):
                result[key] = []

        return result

    def _empty_summary(self) -> Dict:
        """Return empty summary following schema."""
        return {
            "goals": [],
            "decisions_made": [],
            "key_entities": [],
            "open_threads": [],
            "user_sentiment": "neutral",
            "topics_discussed": [],
            "actions_taken": [],
            "learned_preferences": [],
        }

    def _merge_summaries(self, previous: Dict, new: Dict) -> Dict:
        """
        Merge previous and new summaries intelligently.

        - Deduplicate arrays
        - Keep highest relevance entities
        - Use latest sentiment
        - Preserve decisions with timestamps
        """
        if not previous:
            return new
        if not new:
            return previous

        merged = {}

        # Simple array fields - deduplicate
        for field in ["goals", "open_threads", "topics_discussed"]:
            combined = list(previous.get(field, [])) + list(new.get(field, []))
            # Remove duplicates while preserving order
            seen = set()
            merged[field] = [x for x in combined if not (x in seen or seen.add(x))]

        # Decisions - keep all with timestamps
        merged["decisions_made"] = list(previous.get("decisions_made", [])) + list(
            new.get("decisions_made", [])
        )

        # Actions - keep all
        merged["actions_taken"] = list(previous.get("actions_taken", [])) + list(
            new.get("actions_taken", [])
        )

        # Key entities - merge by name, keep highest relevance
        entity_map = {}
        for entity in list(previous.get("key_entities", [])) + list(
            new.get("key_entities", [])
        ):
            name = entity.get("name")
            if name:
                existing = entity_map.get(name)
                if not existing or entity.get("relevance", 0) > existing.get("relevance", 0):
                    entity_map[name] = entity
        merged["key_entities"] = list(entity_map.values())

        # Learned preferences - merge by preference text, keep highest confidence
        pref_map = {}
        for pref in list(previous.get("learned_preferences", [])) + list(
            new.get("learned_preferences", [])
        ):
            pref_text = pref.get("preference")
            if pref_text:
                existing = pref_map.get(pref_text)
                if not existing or pref.get("confidence", 0) > existing.get("confidence", 0):
                    pref_map[pref_text] = pref
        merged["learned_preferences"] = list(pref_map.values())

        # Sentiment - use latest (from new extraction)
        merged["user_sentiment"] = new.get("user_sentiment", previous.get("user_sentiment", "neutral"))

        return merged

    def _summary_to_text(self, summary: Dict) -> str:
        """Convert summary to text for embedding generation."""
        parts = []

        if summary.get("goals"):
            parts.append(f"Goals: {', '.join(summary['goals'])}")

        if summary.get("topics_discussed"):
            parts.append(f"Topics: {', '.join(summary['topics_discussed'])}")

        if summary.get("key_entities"):
            entities = [e.get("name", "") for e in summary["key_entities"]]
            parts.append(f"Entities: {', '.join(entities)}")

        if summary.get("open_threads"):
            parts.append(f"Open: {', '.join(summary['open_threads'])}")

        return ". ".join(parts) if parts else "Empty session"

    async def _add_compaction_marker(self, session_id: UUID, events_count: int) -> None:
        """Add a compaction marker event to the session."""
        try:
            # Get next sequence number
            seq_result = self.supabase.rpc(
                "get_next_event_sequence", {"p_session_id": str(session_id)}
            ).execute()
            sequence_number = seq_result.data if seq_result.data else 1

            # Get user_id from session
            session_result = (
                self.supabase.table("sessions")
                .select("user_id")
                .eq("id", str(session_id))
                .single()
                .execute()
            )
            user_id = session_result.data.get("user_id") if session_result.data else None

            if user_id:
                self.supabase.table("events").insert(
                    {
                        "session_id": str(session_id),
                        "user_id": user_id,
                        "event_type": "compaction_marker",
                        "content": f"Compacted {events_count} events into session summary",
                        "sequence_number": sequence_number,
                        "metadata": {
                            "events_compacted": events_count,
                            "compacted_at": datetime.utcnow().isoformat(),
                        },
                    }
                ).execute()
        except Exception as e:
            logger.debug(f"Failed to add compaction marker: {e}")

    async def force_compact(self, session_id: UUID) -> CompactionResult:
        """Force compaction regardless of threshold (e.g., on session end)."""
        return await self.compact_session(session_id)
