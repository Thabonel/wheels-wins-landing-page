"""
Conversation Memory Module
Manages conversation history, context retention, and learning patterns
for PAM interactions across all orchestrators.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import json
import hashlib

logger = logging.getLogger(__name__)


class MessageRole(Enum):
    """Message role types in conversation"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    CONTEXT = "context"


class ConversationPhase(Enum):
    """Different phases of conversation"""
    GREETING = "greeting"
    DISCOVERY = "discovery"        # Learning about user needs
    PLANNING = "planning"         # Active planning/problem solving
    EXECUTION = "execution"       # Helping with tasks
    FOLLOWUP = "followup"         # Follow-up and feedback
    CLOSURE = "closure"           # Wrapping up conversation


@dataclass
class ConversationMessage:
    """Individual message in conversation"""
    role: MessageRole
    content: str
    timestamp: datetime
    metadata: Dict[str, Any] = None
    
    # Analysis fields
    intent: Optional[str] = None
    entities: List[Dict[str, Any]] = None
    sentiment: Optional[str] = None
    complexity_score: float = 0.0
    response_time_ms: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        data = asdict(self)
        data["role"] = self.role.value
        data["timestamp"] = self.timestamp.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConversationMessage":
        """Create from dictionary"""
        return cls(
            role=MessageRole(data["role"]),
            content=data["content"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            metadata=data.get("metadata"),
            intent=data.get("intent"),
            entities=data.get("entities", []),
            sentiment=data.get("sentiment"),
            complexity_score=data.get("complexity_score", 0.0),
            response_time_ms=data.get("response_time_ms")
        )


@dataclass
class ConversationSummary:
    """Summary of conversation for memory compression"""
    session_id: str
    user_id: str
    start_time: datetime
    end_time: datetime
    message_count: int
    
    # Content summary
    main_topics: List[str]
    key_entities: Dict[str, List[str]]
    user_goals: List[str]
    outcomes: List[str]
    
    # Interaction patterns
    conversation_phase: ConversationPhase
    user_sentiment: str
    satisfaction_score: Optional[float]
    
    # Learning insights
    user_preferences_learned: Dict[str, Any]
    successful_patterns: List[str]
    failure_points: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data["start_time"] = self.start_time.isoformat()
        data["end_time"] = self.end_time.isoformat()
        data["conversation_phase"] = self.conversation_phase.value
        return data


class ConversationMemory:
    """
    Advanced conversation memory system for PAM interactions.
    
    This system manages conversation history, learns from interactions,
    and provides contextual memory across sessions and orchestrators.
    """
    
    def __init__(self, context_store=None, max_memory_length: int = 50):
        self.context_store = context_store
        self.max_memory_length = max_memory_length
        self.active_conversations: Dict[str, List[ConversationMessage]] = {}
        self.conversation_summaries: Dict[str, ConversationSummary] = {}
        
        # Memory compression thresholds
        self.compression_threshold = 20  # Compress after 20 messages
        self.summary_retention_days = 30  # Keep summaries for 30 days
        
    async def add_message(
        self,
        session_id: str,
        user_id: str,
        role: MessageRole,
        content: str,
        metadata: Dict[str, Any] = None,
        intent: Optional[str] = None,
        entities: List[Dict[str, Any]] = None,
        response_time_ms: Optional[int] = None
    ) -> ConversationMessage:
        """
        Add a message to conversation memory.
        
        Args:
            session_id: Conversation session identifier
            user_id: User identifier
            role: Message role (user, assistant, system)
            content: Message content
            metadata: Optional metadata
            intent: Detected intent
            entities: Extracted entities
            response_time_ms: Response time for assistant messages
            
        Returns:
            ConversationMessage object
        """
        try:
            # Create message
            message = ConversationMessage(
                role=role,
                content=content,
                timestamp=datetime.utcnow(),
                metadata=metadata or {},
                intent=intent,
                entities=entities or [],
                response_time_ms=response_time_ms
            )
            
            # Analyze message
            await self._analyze_message(message, user_id)
            
            # Add to active conversation
            if session_id not in self.active_conversations:
                self.active_conversations[session_id] = []
            
            self.active_conversations[session_id].append(message)
            
            # Store in context store if available
            if self.context_store:
                await self._persist_message(session_id, user_id, message)
            
            # Check if compression is needed
            conversation = self.active_conversations[session_id]
            if len(conversation) > self.compression_threshold:
                await self._compress_conversation(session_id, user_id)
            
            logger.debug(f"Added message to conversation {session_id}: {role.value}")
            return message
            
        except Exception as e:
            logger.error(f"Error adding message: {e}")
            raise
    
    async def get_conversation_history(
        self,
        session_id: str,
        user_id: str,
        limit: int = 10,
        include_context: bool = True
    ) -> List[ConversationMessage]:
        """
        Get conversation history for a session.
        
        Args:
            session_id: Session identifier
            user_id: User identifier  
            limit: Maximum number of messages to return
            include_context: Whether to include context messages
            
        Returns:
            List of ConversationMessage objects
        """
        try:
            messages = []
            
            # Get from active conversation
            if session_id in self.active_conversations:
                active_messages = self.active_conversations[session_id]
                messages.extend(active_messages)
            
            # Get from context store if available
            elif self.context_store:
                stored_messages = await self._retrieve_conversation(session_id, user_id)
                messages.extend(stored_messages)
            
            # Filter by role if needed
            if not include_context:
                messages = [m for m in messages if m.role != MessageRole.CONTEXT]
            
            # Sort by timestamp and limit
            messages.sort(key=lambda m: m.timestamp)
            return messages[-limit:] if limit > 0 else messages
            
        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            return []
    
    async def get_contextual_memory(
        self,
        user_id: str,
        query: str,
        max_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get relevant contextual memory based on current query.
        
        Args:
            user_id: User identifier
            query: Current query/message
            max_results: Maximum number of results
            
        Returns:
            List of relevant conversation contexts
        """
        try:
            relevant_contexts = []
            
            # Search through conversation summaries
            for summary in self.conversation_summaries.values():
                if summary.user_id == user_id:
                    relevance_score = self._calculate_relevance(query, summary)
                    if relevance_score > 0.3:  # Threshold for relevance
                        relevant_contexts.append({
                            "session_id": summary.session_id,
                            "relevance_score": relevance_score,
                            "main_topics": summary.main_topics,
                            "key_entities": summary.key_entities,
                            "user_goals": summary.user_goals,
                            "outcomes": summary.outcomes,
                            "timestamp": summary.end_time.isoformat(),
                            "context_type": "conversation_summary"
                        })
            
            # Search through recent active conversations
            for session_id, messages in self.active_conversations.items():
                if not messages:
                    continue
                
                # Check if this is the user's conversation
                user_messages = [m for m in messages if m.metadata and m.metadata.get("user_id") == user_id]
                if not user_messages:
                    continue
                
                # Calculate relevance based on recent messages
                recent_content = " ".join([m.content for m in messages[-5:]])
                relevance_score = self._calculate_text_similarity(query, recent_content)
                
                if relevance_score > 0.4:
                    relevant_contexts.append({
                        "session_id": session_id,
                        "relevance_score": relevance_score,
                        "recent_messages": [m.to_dict() for m in messages[-3:]],
                        "message_count": len(messages),
                        "context_type": "active_conversation"
                    })
            
            # Sort by relevance and limit results
            relevant_contexts.sort(key=lambda c: c["relevance_score"], reverse=True)
            return relevant_contexts[:max_results]
            
        except Exception as e:
            logger.error(f"Error getting contextual memory: {e}")
            return []
    
    async def learn_user_patterns(
        self,
        user_id: str,
        timeframe_days: int = 7
    ) -> Dict[str, Any]:
        """
        Learn user interaction patterns from conversation history.
        
        Args:
            user_id: User identifier
            timeframe_days: Number of days to analyze
            
        Returns:
            Dictionary of learned patterns
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=timeframe_days)
            
            # Collect user's conversations
            user_conversations = []
            for summary in self.conversation_summaries.values():
                if summary.user_id == user_id and summary.end_time > cutoff_date:
                    user_conversations.append(summary)
            
            if not user_conversations:
                return {"error": "No recent conversations found"}
            
            # Analyze patterns
            patterns = {
                "user_id": user_id,
                "analysis_period": f"Last {timeframe_days} days",
                "total_conversations": len(user_conversations),
                "communication_patterns": self._analyze_communication_patterns(user_conversations),
                "topic_preferences": self._analyze_topic_preferences(user_conversations),
                "interaction_timing": self._analyze_interaction_timing(user_conversations),
                "success_patterns": self._analyze_success_patterns(user_conversations),
                "learning_insights": self._generate_learning_insights(user_conversations)
            }
            
            # Store learned patterns in context
            if self.context_store:
                from .context_store import ContextScope
                await self.context_store.set_context(
                    user_id, 
                    "learned_patterns", 
                    patterns, 
                    ContextScope.USER
                )
            
            return patterns
            
        except Exception as e:
            logger.error(f"Error learning user patterns: {e}")
            return {"error": str(e)}
    
    async def get_conversation_insights(
        self,
        session_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Get insights about the current conversation"""
        try:
            messages = await self.get_conversation_history(session_id, user_id, limit=-1)
            
            if not messages:
                return {"error": "No conversation found"}
            
            insights = {
                "session_id": session_id,
                "message_count": len(messages),
                "duration_minutes": self._calculate_conversation_duration(messages),
                "conversation_phase": self._detect_conversation_phase(messages),
                "user_engagement": self._analyze_user_engagement(messages),
                "topic_evolution": self._analyze_topic_evolution(messages),
                "response_quality": self._analyze_response_quality(messages),
                "next_best_actions": self._suggest_next_actions(messages)
            }
            
            return insights
            
        except Exception as e:
            logger.error(f"Error getting conversation insights: {e}")
            return {"error": str(e)}
    
    async def _analyze_message(self, message: ConversationMessage, user_id: str):
        """Analyze message for sentiment, complexity, etc."""
        try:
            # Simple sentiment analysis
            message.sentiment = self._analyze_sentiment(message.content)
            
            # Calculate complexity score
            message.complexity_score = self._calculate_complexity(message.content)
            
            # Additional metadata
            if not message.metadata:
                message.metadata = {}
            
            message.metadata.update({
                "user_id": user_id,
                "word_count": len(message.content.split()),
                "character_count": len(message.content),
                "analyzed_at": datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            logger.warning(f"Error analyzing message: {e}")
    
    def _analyze_sentiment(self, text: str) -> str:
        """Simple sentiment analysis"""
        positive_words = ["good", "great", "excellent", "love", "like", "happy", "thank", "perfect"]
        negative_words = ["bad", "terrible", "hate", "angry", "frustrated", "problem", "issue", "wrong"]
        
        text_lower = text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            return "positive"
        elif negative_count > positive_count:
            return "negative"
        else:
            return "neutral"
    
    def _calculate_complexity(self, text: str) -> float:
        """Calculate text complexity score"""
        words = text.split()
        if not words:
            return 0.0
        
        # Factors: length, unique words, question marks, complex terms
        word_count = len(words)
        unique_words = len(set(words))
        question_marks = text.count("?")
        
        complex_indicators = ["analyze", "calculate", "optimize", "integrate", "correlate"]
        complex_count = sum(1 for word in complex_indicators if word.lower() in text.lower())
        
        # Normalize to 0-1 scale
        complexity = min(1.0, (
            (word_count / 100) * 0.3 +
            (unique_words / word_count) * 0.2 +
            (question_marks / max(1, word_count)) * 10 * 0.2 +
            (complex_count / max(1, word_count)) * 10 * 0.3
        ))
        
        return complexity
    
    async def _compress_conversation(self, session_id: str, user_id: str):
        """Compress long conversation into summary"""
        try:
            messages = self.active_conversations.get(session_id, [])
            if len(messages) < self.compression_threshold:
                return
            
            # Create summary
            summary = self._create_conversation_summary(session_id, user_id, messages)
            
            # Store summary
            self.conversation_summaries[session_id] = summary
            
            # Keep only recent messages in active conversation
            keep_count = self.compression_threshold // 2
            self.active_conversations[session_id] = messages[-keep_count:]
            
            # Persist summary if context store available
            if self.context_store:
                from .context_store import ContextScope
                await self.context_store.set_context(
                    user_id,
                    f"conversation_summary_{session_id}",
                    summary.to_dict(),
                    ContextScope.USER,
                    expires_in_minutes=self.summary_retention_days * 24 * 60
                )
            
            logger.info(f"Compressed conversation {session_id} to summary")
            
        except Exception as e:
            logger.error(f"Error compressing conversation: {e}")
    
    def _create_conversation_summary(
        self,
        session_id: str,
        user_id: str,
        messages: List[ConversationMessage]
    ) -> ConversationSummary:
        """Create a summary from conversation messages"""
        
        if not messages:
            raise ValueError("No messages to summarize")
        
        start_time = messages[0].timestamp
        end_time = messages[-1].timestamp
        
        # Extract topics and entities
        main_topics = self._extract_main_topics(messages)
        key_entities = self._extract_key_entities(messages)
        
        # Analyze user goals and outcomes
        user_goals = self._extract_user_goals(messages)
        outcomes = self._extract_outcomes(messages)
        
        # Determine conversation phase
        conversation_phase = self._detect_conversation_phase(messages)
        
        # Calculate user sentiment
        user_messages = [m for m in messages if m.role == MessageRole.USER]
        user_sentiment = self._calculate_overall_sentiment(user_messages)
        
        # Extract learning insights
        user_preferences_learned = self._extract_preferences(messages)
        successful_patterns = self._identify_successful_patterns(messages)
        failure_points = self._identify_failure_points(messages)
        
        return ConversationSummary(
            session_id=session_id,
            user_id=user_id,
            start_time=start_time,
            end_time=end_time,
            message_count=len(messages),
            main_topics=main_topics,
            key_entities=key_entities,
            user_goals=user_goals,
            outcomes=outcomes,
            conversation_phase=conversation_phase,
            user_sentiment=user_sentiment,
            satisfaction_score=None,  # Could be calculated from feedback
            user_preferences_learned=user_preferences_learned,
            successful_patterns=successful_patterns,
            failure_points=failure_points
        )
    
    def _extract_main_topics(self, messages: List[ConversationMessage]) -> List[str]:
        """Extract main topics from conversation"""
        topic_keywords = {
            "trip_planning": ["trip", "plan", "route", "destination", "travel"],
            "financial": ["budget", "cost", "expense", "money", "payment"],
            "maintenance": ["maintenance", "repair", "service", "oil", "tire"],
            "social": ["group", "meet", "friend", "community", "share"],
            "camping": ["campground", "rv park", "camping", "site", "hookup"]
        }
        
        all_text = " ".join([m.content.lower() for m in messages])
        topics = []
        
        for topic, keywords in topic_keywords.items():
            if any(keyword in all_text for keyword in keywords):
                topics.append(topic)
        
        return topics
    
    def _extract_key_entities(self, messages: List[ConversationMessage]) -> Dict[str, List[str]]:
        """Extract key entities organized by type"""
        entities = {"locations": [], "amounts": [], "dates": [], "vehicles": []}
        
        for message in messages:
            if message.entities:
                for entity in message.entities:
                    entity_type = entity.get("entity_type", "")
                    entity_value = entity.get("value", "")
                    
                    if entity_type == "location" and entity_value not in entities["locations"]:
                        entities["locations"].append(entity_value)
                    elif entity_type == "budget" and entity_value not in entities["amounts"]:
                        entities["amounts"].append(entity_value)
                    elif entity_type == "time" and entity_value not in entities["dates"]:
                        entities["dates"].append(entity_value)
                    elif entity_type == "vehicle" and entity_value not in entities["vehicles"]:
                        entities["vehicles"].append(entity_value)
        
        return entities
    
    def _extract_user_goals(self, messages: List[ConversationMessage]) -> List[str]:
        """Extract user goals from conversation"""
        goals = []
        goal_indicators = ["want to", "need to", "looking for", "trying to", "help me"]
        
        user_messages = [m for m in messages if m.role == MessageRole.USER]
        
        for message in user_messages:
            text_lower = message.content.lower()
            for indicator in goal_indicators:
                if indicator in text_lower:
                    # Extract the goal (simplified)
                    start_idx = text_lower.find(indicator) + len(indicator)
                    goal_text = message.content[start_idx:start_idx+100].strip()
                    if goal_text and goal_text not in goals:
                        goals.append(goal_text)
        
        return goals[:5]  # Limit to top 5 goals
    
    def _extract_outcomes(self, messages: List[ConversationMessage]) -> List[str]:
        """Extract conversation outcomes"""
        outcomes = []
        outcome_indicators = ["completed", "solved", "found", "booked", "scheduled"]
        
        assistant_messages = [m for m in messages if m.role == MessageRole.ASSISTANT]
        
        for message in assistant_messages[-5:]:  # Look at recent assistant messages
            text_lower = message.content.lower()
            for indicator in outcome_indicators:
                if indicator in text_lower:
                    outcomes.append(f"Action: {indicator}")
        
        return list(set(outcomes))
    
    def _detect_conversation_phase(self, messages: List[ConversationMessage]) -> ConversationPhase:
        """Detect current conversation phase"""
        if not messages:
            return ConversationPhase.GREETING
        
        recent_messages = messages[-3:]
        recent_text = " ".join([m.content.lower() for m in recent_messages])
        
        if any(word in recent_text for word in ["hello", "hi", "start", "begin"]):
            return ConversationPhase.GREETING
        elif any(word in recent_text for word in ["plan", "schedule", "organize"]):
            return ConversationPhase.PLANNING
        elif any(word in recent_text for word in ["do", "execute", "start", "begin"]):
            return ConversationPhase.EXECUTION
        elif any(word in recent_text for word in ["thanks", "thank you", "bye", "goodbye"]):
            return ConversationPhase.CLOSURE
        elif any(word in recent_text for word in ["how", "what", "tell me"]):
            return ConversationPhase.DISCOVERY
        else:
            return ConversationPhase.FOLLOWUP
    
    def _calculate_overall_sentiment(self, user_messages: List[ConversationMessage]) -> str:
        """Calculate overall user sentiment"""
        if not user_messages:
            return "neutral"
        
        sentiments = [m.sentiment for m in user_messages if m.sentiment]
        
        if not sentiments:
            return "neutral"
        
        positive_count = sentiments.count("positive")
        negative_count = sentiments.count("negative")
        
        if positive_count > negative_count:
            return "positive"
        elif negative_count > positive_count:
            return "negative"
        else:
            return "neutral"
    
    def _extract_preferences(self, messages: List[ConversationMessage]) -> Dict[str, Any]:
        """Extract user preferences from conversation"""
        preferences = {}
        
        # Look for preference indicators
        preference_patterns = {
            "communication_style": ["brief", "detailed", "quick", "thorough"],
            "travel_style": ["luxury", "budget", "adventure", "relaxed"],
            "activity_preferences": ["hiking", "fishing", "sightseeing", "photography"]
        }
        
        all_text = " ".join([m.content.lower() for m in messages if m.role == MessageRole.USER])
        
        for pref_type, keywords in preference_patterns.items():
            found_preferences = [kw for kw in keywords if kw in all_text]
            if found_preferences:
                preferences[pref_type] = found_preferences
        
        return preferences
    
    def _identify_successful_patterns(self, messages: List[ConversationMessage]) -> List[str]:
        """Identify successful interaction patterns"""
        patterns = []
        
        # Look for positive feedback patterns
        positive_responses = [
            m for m in messages 
            if m.role == MessageRole.USER and m.sentiment == "positive"
        ]
        
        if len(positive_responses) > len(messages) * 0.3:  # 30% positive responses
            patterns.append("high_user_satisfaction")
        
        # Quick response patterns
        quick_responses = [
            m for m in messages 
            if m.role == MessageRole.ASSISTANT and m.response_time_ms and m.response_time_ms < 2000
        ]
        
        if len(quick_responses) > len(messages) * 0.7:  # 70% quick responses
            patterns.append("responsive_assistance")
        
        return patterns
    
    def _identify_failure_points(self, messages: List[ConversationMessage]) -> List[str]:
        """Identify conversation failure points"""
        failure_points = []
        
        # Look for confusion indicators
        confusion_indicators = ["what", "confused", "don't understand", "unclear"]
        user_messages = [m for m in messages if m.role == MessageRole.USER]
        
        confused_messages = 0
        for message in user_messages:
            if any(indicator in message.content.lower() for indicator in confusion_indicators):
                confused_messages += 1
        
        if confused_messages > 2:
            failure_points.append("user_confusion")
        
        # Look for repeated requests
        user_contents = [m.content.lower() for m in user_messages]
        if len(set(user_contents)) < len(user_contents) * 0.8:  # 20% repeated content
            failure_points.append("repeated_requests")
        
        return failure_points
    
    def _calculate_relevance(self, query: str, summary: ConversationSummary) -> float:
        """Calculate relevance score between query and conversation summary"""
        query_lower = query.lower()
        relevance = 0.0
        
        # Check topic relevance
        for topic in summary.main_topics:
            if topic.lower() in query_lower:
                relevance += 0.3
        
        # Check entity relevance
        for entity_list in summary.key_entities.values():
            for entity in entity_list:
                if entity.lower() in query_lower:
                    relevance += 0.2
        
        # Check goal relevance
        for goal in summary.user_goals:
            if self._calculate_text_similarity(query, goal) > 0.5:
                relevance += 0.4
        
        return min(1.0, relevance)
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Simple text similarity calculation"""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0.0
    
    async def _persist_message(self, session_id: str, user_id: str, message: ConversationMessage):
        """Persist message to context store"""
        if not self.context_store:
            return
        
        try:
            from .context_store import ContextScope
            
            # Store individual message
            message_key = f"message_{session_id}_{message.timestamp.isoformat()}"
            await self.context_store.set_context(
                user_id,
                message_key,
                message.to_dict(),
                ContextScope.SESSION,
                expires_in_minutes=24 * 60  # 24 hours
            )
            
            # Update conversation index
            conversation_key = f"conversation_{session_id}"
            await self.context_store.update_context(
                user_id,
                conversation_key,
                {
                    "last_message": message.timestamp.isoformat(),
                    "message_count": len(self.active_conversations.get(session_id, [])),
                    "updated_at": datetime.utcnow().isoformat()
                },
                ContextScope.SESSION
            )
            
        except Exception as e:
            logger.error(f"Error persisting message: {e}")
    
    async def _retrieve_conversation(self, session_id: str, user_id: str) -> List[ConversationMessage]:
        """Retrieve conversation from context store"""
        if not self.context_store:
            return []
        
        try:
            # This would need to be implemented based on context store capabilities
            # For now, return empty list
            return []
            
        except Exception as e:
            logger.error(f"Error retrieving conversation: {e}")
            return []