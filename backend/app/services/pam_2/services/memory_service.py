"""
PAM 2.0 Memory Service
Enhanced persistent conversation memory with intelligent context management

Features:
- Long-term conversation history storage and retrieval
- Context-aware memory summarization
- User preference learning
- Topic continuity tracking
- Smart memory pruning and archiving
"""

import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict

from ..core.types import ChatMessage, MessageType, ConversationContext
from ..core.exceptions import MemoryServiceError
from app.db.supabase import supabase

logger = logging.getLogger(__name__)

@dataclass
class MemoryContext:
    """Enhanced memory context with intelligent summarization"""
    recent_messages: List[Dict[str, Any]]
    topic_summary: str
    user_preferences: Dict[str, Any]
    conversation_themes: List[str]
    last_context_update: datetime
    memory_tokens_used: int

@dataclass
class ConversationSummary:
    """Summarized conversation for long-term memory"""
    user_id: str
    time_period: str
    topic_themes: List[str]
    key_decisions: List[str]
    user_goals: List[str]
    context_data: Dict[str, Any]
    summary_text: str
    token_count: int

class MemoryService:
    """
    Advanced memory service for PAM 2.0
    Manages conversation persistence, context awareness, and memory optimization
    """

    def __init__(self):
        self.max_recent_messages = 20  # Keep last 20 messages in active memory
        self.context_window_hours = 24  # Consider last 24 hours for active context
        self.summary_threshold_days = 7  # Summarize conversations older than 7 days
        self.max_memory_tokens = 8000  # Token limit for memory context (Gemini 1M limit)

    async def get_enhanced_conversation_context(
        self,
        user_id: str,
        include_summaries: bool = True,
        max_messages: Optional[int] = None
    ) -> ConversationContext:
        """
        Get enhanced conversation context with intelligent memory loading

        Args:
            user_id: User identifier
            include_summaries: Include conversation summaries for deeper context
            max_messages: Maximum recent messages to include

        Returns:
            ConversationContext with enhanced memory
        """
        try:
            logger.info(f"Loading enhanced conversation context for user {user_id}")

            # Load recent conversation history
            recent_messages = await self._load_recent_messages(
                user_id,
                max_messages or self.max_recent_messages
            )

            # Load user preferences and learned patterns
            user_preferences = await self._load_user_preferences(user_id)

            # Load conversation summaries for context
            summaries = []
            if include_summaries:
                summaries = await self._load_conversation_summaries(user_id, limit=5)

            # Analyze current conversation themes
            themes = await self._analyze_conversation_themes(recent_messages, summaries)

            # Build memory context
            memory_context = MemoryContext(
                recent_messages=recent_messages,
                topic_summary=self._generate_topic_summary(themes, summaries),
                user_preferences=user_preferences,
                conversation_themes=themes,
                last_context_update=datetime.now(),
                memory_tokens_used=self._estimate_token_usage(recent_messages, summaries)
            )

            # Create enhanced conversation context
            context = ConversationContext(
                user_id=user_id,
                current_topic=themes[0] if themes else None,
                messages=[ChatMessage(**msg) for msg in recent_messages],
                context_data={
                    "memory_context": asdict(memory_context),
                    "conversation_summaries": summaries,
                    "user_preferences": user_preferences,
                    "context_tokens": memory_context.memory_tokens_used
                }
            )

            logger.info(f"Enhanced context loaded: {len(recent_messages)} messages, "
                       f"{len(summaries)} summaries, {memory_context.memory_tokens_used} tokens")

            return context

        except Exception as e:
            logger.error(f"Error loading enhanced conversation context: {e}")
            # Return basic context as fallback
            return await self._get_basic_context(user_id)

    async def save_conversation_turn(
        self,
        user_id: str,
        user_message: str,
        ai_response: str,
        context_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Save conversation turn with enhanced metadata and context tracking

        Args:
            user_id: User identifier
            user_message: User's message
            ai_response: AI assistant's response
            context_data: Additional context information
            metadata: Conversation metadata

        Returns:
            Success status
        """
        try:
            # Enhanced conversation data with memory context
            conversation_data = {
                'user_id': user_id,
                'message': user_message,
                'response': ai_response,
                'timestamp': datetime.now().isoformat(),
                'context_data': context_data or {},
                'metadata': {
                    'memory_version': '2.0',
                    'enhanced_context': True,
                    'topic_analysis': await self._extract_topics(user_message, ai_response),
                    'user_intent': await self._classify_user_intent(user_message),
                    **(metadata or {})
                }
            }

            # Save to database
            result = supabase.table('pam_conversations').insert(conversation_data).execute()

            if result.data:
                logger.debug(f"Enhanced conversation saved for user {user_id}")

                # Update user preferences based on conversation
                await self._update_user_preferences(user_id, user_message, ai_response)

                # Check if summarization is needed
                await self._check_summarization_needed(user_id)

                return True
            else:
                logger.error("Failed to save conversation to database")
                return False

        except Exception as e:
            logger.error(f"Error saving conversation turn: {e}")
            return False

    async def create_conversation_summary(
        self,
        user_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Optional[ConversationSummary]:
        """
        Create intelligent conversation summary for long-term memory

        Args:
            user_id: User identifier
            start_date: Summary period start
            end_date: Summary period end

        Returns:
            ConversationSummary or None if failed
        """
        try:
            logger.info(f"Creating conversation summary for user {user_id} "
                       f"from {start_date} to {end_date}")

            # Load conversations in time period
            conversations = await self._load_conversations_by_period(
                user_id, start_date, end_date
            )

            if not conversations:
                logger.info("No conversations found for summary period")
                return None

            # Analyze conversations for key themes and decisions
            themes = await self._analyze_conversation_themes(conversations)
            decisions = await self._extract_key_decisions(conversations)
            goals = await self._extract_user_goals(conversations)

            # Generate summary text using AI
            summary_text = await self._generate_ai_summary(
                conversations, themes, decisions, goals
            )

            # Create summary object
            summary = ConversationSummary(
                user_id=user_id,
                time_period=f"{start_date.date()} to {end_date.date()}",
                topic_themes=themes,
                key_decisions=decisions,
                user_goals=goals,
                context_data={
                    "conversation_count": len(conversations),
                    "date_range": {
                        "start": start_date.isoformat(),
                        "end": end_date.isoformat()
                    }
                },
                summary_text=summary_text,
                token_count=len(summary_text.split()) * 1.3  # Rough token estimate
            )

            # Save summary to database
            await self._save_conversation_summary(summary)

            # Archive original conversations to reduce active memory load
            await self._archive_conversations(user_id, start_date, end_date)

            logger.info(f"Conversation summary created: {len(themes)} themes, "
                       f"{len(decisions)} decisions")

            return summary

        except Exception as e:
            logger.error(f"Error creating conversation summary: {e}")
            return None

    # Private helper methods

    async def _load_recent_messages(
        self,
        user_id: str,
        limit: int
    ) -> List[Dict[str, Any]]:
        """Load recent conversation messages"""
        try:
            result = supabase.table('pam_conversations') \
                .select('*') \
                .eq('user_id', user_id) \
                .order('timestamp', desc=True) \
                .limit(limit) \
                .execute()

            messages = []
            for conv in result.data or []:
                # Add user message
                messages.append({
                    'user_id': user_id,
                    'type': MessageType.USER,
                    'content': conv.get('message', ''),
                    'timestamp': datetime.fromisoformat(conv.get('timestamp', datetime.now().isoformat()))
                })

                # Add AI response
                if conv.get('response'):
                    messages.append({
                        'user_id': user_id,
                        'type': MessageType.ASSISTANT,
                        'content': conv.get('response', ''),
                        'timestamp': datetime.fromisoformat(conv.get('timestamp', datetime.now().isoformat()))
                    })

            return list(reversed(messages))  # Return in chronological order

        except Exception as e:
            logger.error(f"Error loading recent messages: {e}")
            return []

    async def _load_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Load learned user preferences"""
        try:
            result = supabase.table('user_settings') \
                .select('pam_context, pam_preferences') \
                .eq('user_id', user_id) \
                .single() \
                .execute()

            if result.data:
                return {
                    'context': result.data.get('pam_context', {}),
                    'preferences': result.data.get('pam_preferences', {}),
                    'learned_patterns': result.data.get('pam_context', {}).get('learned_patterns', {})
                }

            return {}

        except Exception as e:
            logger.debug(f"No user preferences found for {user_id}: {e}")
            return {}

    async def _analyze_conversation_themes(
        self,
        messages: List[Dict[str, Any]],
        summaries: List[Dict[str, Any]] = None
    ) -> List[str]:
        """Analyze conversation themes using keyword extraction"""
        themes = set()

        # Extract themes from messages
        for msg in messages:
            content = msg.get('content', '').lower()

            # Travel/Trip themes
            if any(word in content for word in ['trip', 'travel', 'destination', 'flight', 'hotel']):
                themes.add('travel_planning')

            # Finance themes
            if any(word in content for word in ['budget', 'money', 'expense', 'savings', 'cost']):
                themes.add('financial_management')

            # Personal themes
            if any(word in content for word in ['goal', 'plan', 'want', 'need', 'help']):
                themes.add('personal_assistance')

            # Location themes
            if any(word in content for word in ['weather', 'location', 'address', 'nearby']):
                themes.add('location_services')

        # Extract themes from summaries if provided
        if summaries:
            for summary in summaries:
                if 'topic_themes' in summary:
                    themes.update(summary['topic_themes'])

        return list(themes)

    async def _generate_ai_summary(
        self,
        conversations: List[Dict[str, Any]],
        themes: List[str],
        decisions: List[str],
        goals: List[str]
    ) -> str:
        """Generate AI-powered conversation summary"""
        # For now, create a structured summary
        # TODO: Integrate with Gemini for intelligent summarization

        summary_parts = []

        if themes:
            summary_parts.append(f"Main topics discussed: {', '.join(themes)}")

        if decisions:
            summary_parts.append(f"Key decisions made: {'; '.join(decisions[:3])}")

        if goals:
            summary_parts.append(f"User goals identified: {'; '.join(goals[:3])}")

        summary_parts.append(f"Total conversations: {len(conversations)}")

        return ". ".join(summary_parts)

    async def _check_summarization_needed(self, user_id: str) -> bool:
        """Check if conversation summarization is needed"""
        try:
            # Check conversations older than threshold
            cutoff_date = datetime.now() - timedelta(days=self.summary_threshold_days)

            result = supabase.table('pam_conversations') \
                .select('id', count='exact') \
                .eq('user_id', user_id) \
                .lt('timestamp', cutoff_date.isoformat()) \
                .execute()

            old_conversation_count = result.count or 0

            # Trigger summarization if we have more than 50 old conversations
            if old_conversation_count > 50:
                logger.info(f"Triggering summarization for user {user_id}: "
                           f"{old_conversation_count} old conversations")
                await self.create_conversation_summary(
                    user_id=user_id,
                    start_date=datetime.now() - timedelta(days=30),
                    end_date=cutoff_date
                )
                return True

            return False

        except Exception as e:
            logger.error(f"Error checking summarization: {e}")
            return False

    async def _get_basic_context(self, user_id: str) -> ConversationContext:
        """Fallback to basic conversation context"""
        try:
            recent_messages = await self._load_recent_messages(user_id, 5)

            return ConversationContext(
                user_id=user_id,
                current_topic=None,
                messages=[ChatMessage(**msg) for msg in recent_messages],
                context_data={"basic_context": True}
            )
        except Exception as e:
            logger.error(f"Error creating basic context: {e}")
            return ConversationContext(
                user_id=user_id,
                current_topic=None,
                messages=[],
                context_data={}
            )

    def _estimate_token_usage(
        self,
        messages: List[Dict[str, Any]],
        summaries: List[Dict[str, Any]]
    ) -> int:
        """Estimate token usage for memory context"""
        token_count = 0

        # Estimate tokens for messages (rough: 1 token per 0.75 words)
        for msg in messages:
            content = msg.get('content', '')
            token_count += len(content.split()) * 1.3

        # Estimate tokens for summaries
        for summary in summaries:
            summary_text = summary.get('summary_text', '')
            token_count += len(summary_text.split()) * 1.3

        return int(token_count)

    def _generate_topic_summary(
        self,
        themes: List[str],
        summaries: List[Dict[str, Any]]
    ) -> str:
        """Generate concise topic summary"""
        if not themes and not summaries:
            return "General conversation"

        parts = []
        if themes:
            parts.append(f"Current topics: {', '.join(themes[:3])}")

        if summaries and len(summaries) > 0:
            parts.append(f"Previous context available")

        return ". ".join(parts)

    # Placeholder methods for future AI integration
    async def _extract_topics(self, user_message: str, ai_response: str) -> List[str]:
        """Extract topics from conversation turn"""
        # Basic keyword-based topic extraction
        topics = []
        combined_text = f"{user_message} {ai_response}".lower()

        if any(word in combined_text for word in ['trip', 'travel']):
            topics.append('travel')
        if any(word in combined_text for word in ['budget', 'money']):
            topics.append('finance')
        if any(word in combined_text for word in ['weather', 'location']):
            topics.append('location')

        return topics

    async def _classify_user_intent(self, user_message: str) -> str:
        """Classify user intent from message"""
        message_lower = user_message.lower()

        if any(word in message_lower for word in ['help', 'how', 'what', '?']):
            return 'question'
        elif any(word in message_lower for word in ['plan', 'book', 'find']):
            return 'request'
        elif any(word in message_lower for word in ['thanks', 'great', 'good']):
            return 'acknowledgment'
        else:
            return 'statement'

    async def _update_user_preferences(
        self,
        user_id: str,
        user_message: str,
        ai_response: str
    ):
        """Update user preferences based on conversation"""
        # TODO: Implement preference learning algorithm
        pass

    async def _load_conversations_by_period(
        self,
        user_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Load conversations within specific time period"""
        # TODO: Implement database query for period
        return []

    async def _extract_key_decisions(self, conversations: List[Dict[str, Any]]) -> List[str]:
        """Extract key decisions from conversations"""
        # TODO: Implement decision extraction
        return []

    async def _extract_user_goals(self, conversations: List[Dict[str, Any]]) -> List[str]:
        """Extract user goals from conversations"""
        # TODO: Implement goal extraction
        return []

    async def _save_conversation_summary(self, summary: ConversationSummary):
        """Save conversation summary to database"""
        # TODO: Implement summary storage
        pass

    async def _archive_conversations(
        self,
        user_id: str,
        start_date: datetime,
        end_date: datetime
    ):
        """Archive old conversations to reduce memory load"""
        # TODO: Implement conversation archiving
        pass

    async def _load_conversation_summaries(
        self,
        user_id: str,
        limit: int
    ) -> List[Dict[str, Any]]:
        """Load conversation summaries for context"""
        # TODO: Implement summary loading
        return []

# Service factory function
def create_memory_service() -> MemoryService:
    """Factory function to create MemoryService instance"""
    return MemoryService()