
# PAM AI Implementation Guide

## Overview

PAM (Personal Assistant Manager) is an advanced AI system designed to help users manage their nomadic lifestyle through intelligent conversation, context awareness, and proactive assistance. This guide covers the technical implementation details of the PAM AI system.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Conversation Flow](#conversation-flow)
4. [Intent Classification](#intent-classification)
5. [Context Management](#context-management)
6. [Memory System](#memory-system)
7. [Response Generation](#response-generation)
8. [Integration with Data Sources](#integration-with-data-sources)
9. [Customization and Training](#customization-and-training)
10. [Performance Optimization](#performance-optimization)

## Architecture Overview

The PAM AI system follows a modular architecture with several key components working together:

```
┌─────────────────────────────────────────────────────────┐
│                    PAM AI System                        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Intent    │  │   Context   │  │   Memory    │    │
│  │ Classifier  │  │  Manager    │  │   System    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Conversation│  │  Response   │  │   Action    │    │
│  │   Engine    │  │ Generator   │  │  Executor   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Wins      │  │   Wheels    │  │   Social    │    │
│  │    Node     │  │    Node     │  │    Node     │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
                              │
                ┌─────────────▼─────────────┐
                │      OpenAI GPT API      │
                └───────────────────────────┘
```

## Core Components

### 1. Intelligent Conversation Engine

The main orchestrator that coordinates all PAM components:

```python
# app/services/pam/intelligent_conversation.py
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio

class IntelligentConversation:
    """
    Main PAM AI conversation engine that orchestrates all components.
    """
    
    def __init__(self):
        self.context_manager = ContextManager()
        self.memory_system = MemorySystem()
        self.intent_classifier = IntentClassifier()
        self.response_generator = ResponseGenerator()
        self.action_executor = ActionExecutor()
        self.node_registry = NodeRegistry()
        
        # Register specialized nodes
        self.node_registry.register('wins', WinsNode())
        self.node_registry.register('wheels', WheelsNode())
        self.node_registry.register('social', SocialNode())
    
    async def process_message(
        self, 
        message: str, 
        user_id: str, 
        conversation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> ConversationResponse:
        """
        Process a user message through the complete PAM pipeline.
        
        Args:
            message: User's input message
            user_id: Unique identifier for the user
            conversation_id: Optional conversation identifier
            context: Additional context information
            
        Returns:
            ConversationResponse with AI response and actions
        """
        
        # 1. Intent Classification
        intent_result = await self.intent_classifier.classify(
            message=message,
            user_id=user_id,
            conversation_history=await self._get_recent_history(conversation_id)
        )
        
        # 2. Context Retrieval and Enhancement
        enhanced_context = await self.context_manager.build_context(
            user_id=user_id,
            intent=intent_result.intent,
            message=message,
            additional_context=context or {}
        )
        
        # 3. Memory Integration
        relevant_memories = await self.memory_system.retrieve_relevant(
            query=message,
            user_id=user_id,
            intent=intent_result.intent,
            limit=5
        )
        
        # 4. Specialized Node Processing
        node_results = await self._process_with_nodes(
            intent=intent_result.intent,
            message=message,
            context=enhanced_context,
            user_id=user_id
        )
        
        # 5. Response Generation
        response = await self.response_generator.generate(
            message=message,
            intent=intent_result,
            context=enhanced_context,
            memories=relevant_memories,
            node_results=node_results,
            user_id=user_id
        )
        
        # 6. Action Execution
        actions = await self.action_executor.execute_actions(
            response.suggested_actions,
            user_id=user_id,
            context=enhanced_context
        )
        
        # 7. Memory Storage
        await self.memory_system.store_interaction(
            user_id=user_id,
            message=message,
            response=response.content,
            intent=intent_result.intent,
            context=enhanced_context
        )
        
        # 8. Context Update
        await self.context_manager.update_context(
            user_id=user_id,
            interaction_context={
                'last_intent': intent_result.intent,
                'last_response': response.content,
                'timestamp': datetime.utcnow()
            }
        )
        
        return ConversationResponse(
            content=response.content,
            intent=intent_result.intent,
            confidence=intent_result.confidence,
            actions=actions,
            context_used=enhanced_context,
            processing_metadata={
                'intent_confidence': intent_result.confidence,
                'memories_used': len(relevant_memories),
                'nodes_processed': list(node_results.keys()),
                'processing_time_ms': response.processing_time_ms
            }
        )
```

### 2. Intent Classification System

Determines the user's intent to route processing appropriately:

```python
# app/services/pam/intent_classifier.py
from enum import Enum
from typing import List, Dict, Optional
import re
from dataclasses import dataclass

class IntentType(Enum):
    """Supported intent types in PAM system."""
    
    # Financial (Wins) intents
    EXPENSE_QUERY = "expense_query"
    EXPENSE_ADD = "expense_add"
    BUDGET_CHECK = "budget_check"
    FINANCIAL_ADVICE = "financial_advice"
    
    # Travel (Wheels) intents
    MAINTENANCE_REMINDER = "maintenance_reminder"
    FUEL_LOG = "fuel_log"
    ROUTE_PLANNING = "route_planning"
    CAMPING_SEARCH = "camping_search"
    
    # Social intents
    COMMUNITY_SEARCH = "community_search"
    EVENT_PLANNING = "event_planning"
    EXPERIENCE_SHARING = "experience_sharing"
    
    # General intents
    GREETING = "greeting"
    HELP_REQUEST = "help_request"
    CONTEXT_SETTING = "context_setting"
    GENERAL_QUESTION = "general_question"

@dataclass
class IntentResult:
    intent: IntentType
    confidence: float
    entities: Dict[str, Any]
    reasoning: str

class IntentClassifier:
    """
    Hybrid intent classifier using pattern matching and ML techniques.
    """
    
    def __init__(self):
        self.patterns = self._load_intent_patterns()
        self.entity_extractors = self._load_entity_extractors()
    
    async def classify(
        self, 
        message: str, 
        user_id: str,
        conversation_history: Optional[List[Dict]] = None
    ) -> IntentResult:
        """
        Classify user intent from message and context.
        
        Args:
            message: User's input message
            user_id: User identifier for personalization
            conversation_history: Recent conversation for context
            
        Returns:
            IntentResult with classified intent and extracted entities
        """
        
        message_lower = message.lower().strip()
        
        # 1. Pattern-based classification (fast path)
        pattern_result = self._classify_with_patterns(message_lower)
        if pattern_result.confidence > 0.8:
            return pattern_result
        
        # 2. Context-aware classification
        context_result = await self._classify_with_context(
            message=message_lower,
            history=conversation_history or []
        )
        
        # 3. ML-based classification (if needed)
        if context_result.confidence < 0.7:
            ml_result = await self._classify_with_ml(message, user_id)
            if ml_result.confidence > context_result.confidence:
                return ml_result
        
        return context_result
    
    def _classify_with_patterns(self, message: str) -> IntentResult:
        """Fast pattern-based intent classification."""
        
        # Financial patterns
        expense_patterns = [
            r'\b(spent|spend|cost|paid|expense|money)\b.*\b(fuel|gas|food|groceries)\b',
            r'\bhow much.*\b(spent|spend|cost)\b',
            r'\b(add|record|log).*\b(expense|spending)\b'
        ]
        
        budget_patterns = [
            r'\b(budget|remaining|left|available)\b',
            r'\bhow.*\b(budget|money left)\b'
        ]
        
        maintenance_patterns = [
            r'\b(maintenance|service|oil change|tire|brake)\b',
            r'\b(due|overdue|schedule).*\b(maintenance|service)\b'
        ]
        
        # Check patterns
        for pattern in expense_patterns:
            if re.search(pattern, message):
                entities = self._extract_financial_entities(message)
                return IntentResult(
                    intent=IntentType.EXPENSE_QUERY,
                    confidence=0.9,
                    entities=entities,
                    reasoning="Pattern match: expense query"
                )
        
        for pattern in budget_patterns:
            if re.search(pattern, message):
                return IntentResult(
                    intent=IntentType.BUDGET_CHECK,
                    confidence=0.85,
                    entities={},
                    reasoning="Pattern match: budget check"
                )
        
        for pattern in maintenance_patterns:
            if re.search(pattern, message):
                entities = self._extract_maintenance_entities(message)
                return IntentResult(
                    intent=IntentType.MAINTENANCE_REMINDER,
                    confidence=0.88,
                    entities=entities,
                    reasoning="Pattern match: maintenance"
                )
        
        # Default to general question
        return IntentResult(
            intent=IntentType.GENERAL_QUESTION,
            confidence=0.5,
            entities={},
            reasoning="No specific pattern matched"
        )
    
    def _extract_financial_entities(self, message: str) -> Dict[str, Any]:
        """Extract financial entities from message."""
        entities = {}
        
        # Extract amounts
        amount_pattern = r'\$?(\d+(?:\.\d{2})?)'
        amounts = re.findall(amount_pattern, message)
        if amounts:
            entities['amount'] = float(amounts[0])
        
        # Extract categories
        categories = ['fuel', 'gas', 'food', 'groceries', 'maintenance', 'camping']
        for category in categories:
            if category in message.lower():
                entities['category'] = category
                break
        
        # Extract time references
        time_patterns = {
            'today': r'\btoday\b',
            'yesterday': r'\byesterday\b',
            'this week': r'\bthis week\b',
            'this month': r'\bthis month\b'
        }
        
        for period, pattern in time_patterns.items():
            if re.search(pattern, message):
                entities['time_period'] = period
                break
        
        return entities
```

### 3. Context Management System

Maintains and updates user context for personalized responses:

```python
# app/services/pam/context_manager.py
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import json

@dataclass
class UserContext:
    """Comprehensive user context for PAM interactions."""
    
    # User profile
    user_id: str
    preferences: Dict[str, Any]
    location: Optional[Dict[str, float]]  # {"lat": float, "lng": float}
    timezone: Optional[str]
    
    # Financial context
    current_budget: Optional[Dict[str, float]]
    recent_expenses: List[Dict[str, Any]]
    financial_goals: Optional[Dict[str, Any]]
    
    # Travel context
    current_location: Optional[str]
    travel_plans: Optional[Dict[str, Any]]
    vehicle_info: Optional[Dict[str, Any]]
    
    # Social context
    community_involvement: Optional[Dict[str, Any]]
    recent_activities: List[Dict[str, Any]]
    
    # Conversation context
    conversation_history: List[Dict[str, Any]]
    last_intent: Optional[str]
    active_topics: List[str]
    
    # Temporal context
    last_updated: datetime
    context_version: int

class ContextManager:
    """
    Manages user context for personalized PAM interactions.
    """
    
    def __init__(self):
        self.cache_service = CacheService()
        self.database_service = DatabaseService()
    
    async def build_context(
        self, 
        user_id: str, 
        intent: IntentType,
        message: str,
        additional_context: Dict[str, Any] = None
    ) -> UserContext:
        """
        Build comprehensive context for user interaction.
        
        Args:
            user_id: User identifier
            intent: Classified intent
            message: Current message
            additional_context: Extra context from request
            
        Returns:
            UserContext with all relevant information
        """
        
        # Try cache first
        cached_context = await self._get_cached_context(user_id)
        if cached_context and self._is_context_fresh(cached_context):
            return await self._enhance_context(cached_context, intent, additional_context)
        
        # Build fresh context
        context = await self._build_fresh_context(user_id)
        context = await self._enhance_context(context, intent, additional_context)
        
        # Cache the context
        await self._cache_context(context)
        
        return context
    
    async def _build_fresh_context(self, user_id: str) -> UserContext:
        """Build context from database sources."""
        
        # Get user profile
        profile = await self.database_service.get_user_profile(user_id)
        
        # Get financial context
        budget_summary = await self.database_service.get_budget_summary(user_id)
        recent_expenses = await self.database_service.get_recent_expenses(
            user_id, 
            days=7
        )
        
        # Get travel context
        vehicle_info = await self.database_service.get_vehicle_info(user_id)
        maintenance_records = await self.database_service.get_recent_maintenance(
            user_id,
            limit=5
        )
        
        # Get social context
        recent_activities = await self.database_service.get_recent_activities(
            user_id,
            days=30
        )
        
        # Get conversation history
        conversation_history = await self.database_service.get_conversation_history(
            user_id,
            limit=10
        )
        
        return UserContext(
            user_id=user_id,
            preferences=profile.get('preferences', {}),
            location=profile.get('current_location'),
            timezone=profile.get('timezone'),
            current_budget=budget_summary,
            recent_expenses=recent_expenses,
            financial_goals=profile.get('financial_goals'),
            current_location=profile.get('current_location_name'),
            travel_plans=profile.get('travel_plans'),
            vehicle_info=vehicle_info,
            community_involvement=profile.get('community_data'),
            recent_activities=recent_activities,
            conversation_history=conversation_history,
            last_intent=None,
            active_topics=[],
            last_updated=datetime.utcnow(),
            context_version=1
        )
    
    async def _enhance_context(
        self, 
        context: UserContext, 
        intent: IntentType,
        additional_context: Optional[Dict[str, Any]]
    ) -> UserContext:
        """Enhance context based on current interaction."""
        
        # Update location if provided
        if additional_context and 'location' in additional_context:
            context.location = additional_context['location']
        
        # Add intent-specific context
        if intent in [IntentType.EXPENSE_QUERY, IntentType.BUDGET_CHECK]:
            # Enhance financial context
            context.recent_expenses = await self._get_detailed_expenses(
                context.user_id,
                intent
            )
        
        elif intent in [IntentType.MAINTENANCE_REMINDER, IntentType.ROUTE_PLANNING]:
            # Enhance travel context
            context.vehicle_info = await self._get_detailed_vehicle_info(
                context.user_id
            )
        
        # Update active topics
        context.active_topics = self._extract_topics_from_intent(intent)
        
        return context
    
    def _extract_topics_from_intent(self, intent: IntentType) -> List[str]:
        """Extract active topics from intent."""
        topic_mapping = {
            IntentType.EXPENSE_QUERY: ['finance', 'expenses'],
            IntentType.BUDGET_CHECK: ['finance', 'budgeting'],
            IntentType.MAINTENANCE_REMINDER: ['travel', 'maintenance'],
            IntentType.ROUTE_PLANNING: ['travel', 'navigation'],
            IntentType.CAMPING_SEARCH: ['travel', 'camping'],
            IntentType.COMMUNITY_SEARCH: ['social', 'community']
        }
        return topic_mapping.get(intent, ['general'])
```

### 4. Memory System

Stores and retrieves relevant information from past interactions:

```python
# app/services/pam/memory_system.py
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum
import numpy as np
from dataclasses import dataclass
import json

class MemoryType(Enum):
    """Types of memories stored in PAM system."""
    FACTUAL = "factual"           # User facts and preferences
    EXPERIENTIAL = "experiential"  # User experiences and stories
    PROCEDURAL = "procedural"     # How-to knowledge
    CONTEXTUAL = "contextual"     # Situational context
    EMOTIONAL = "emotional"       # Emotional context and sentiment

@dataclass
class Memory:
    """Individual memory item."""
    id: str
    user_id: str
    memory_type: MemoryType
    content: str
    context: Dict[str, Any]
    confidence: float
    created_at: datetime
    last_accessed: datetime
    access_count: int
    embedding: Optional[List[float]] = None

class MemorySystem:
    """
    Advanced memory system for PAM with semantic search and relevance scoring.
    """
    
    def __init__(self):
        self.database_service = DatabaseService()
        self.cache_service = CacheService()
        self.embedding_service = EmbeddingService()
    
    async def store_interaction(
        self,
        user_id: str,
        message: str,
        response: str,
        intent: IntentType,
        context: UserContext
    ) -> None:
        """Store interaction as memories."""
        
        memories_to_store = []
        
        # Extract factual memories
        factual_memories = await self._extract_factual_memories(
            message, response, context
        )
        memories_to_store.extend(factual_memories)
        
        # Extract experiential memories
        experiential_memories = await self._extract_experiential_memories(
            message, response, intent, context
        )
        memories_to_store.extend(experiential_memories)
        
        # Store all memories
        for memory in memories_to_store:
            await self._store_memory(user_id, memory)
    
    async def retrieve_relevant(
        self,
        query: str,
        user_id: str,
        intent: IntentType,
        limit: int = 5,
        min_confidence: float = 0.1
    ) -> List[Memory]:
        """
        Retrieve relevant memories for current query.
        
        Args:
            query: Current user query
            user_id: User identifier
            intent: Current intent
            limit: Maximum memories to return
            min_confidence: Minimum relevance confidence
            
        Returns:
            List of relevant memories ordered by relevance
        """
        
        # Generate query embedding
        query_embedding = await self.embedding_service.get_embedding(query)
        
        # Get candidate memories
        candidate_memories = await self._get_candidate_memories(
            user_id, intent, limit * 3  # Get more candidates for better filtering
        )
        
        # Score memories for relevance
        scored_memories = []
        for memory in candidate_memories:
            relevance_score = await self._calculate_relevance(
                memory, query, query_embedding, intent
            )
            
            if relevance_score >= min_confidence:
                scored_memories.append((memory, relevance_score))
        
        # Sort by relevance and return top memories
        scored_memories.sort(key=lambda x: x[1], reverse=True)
        relevant_memories = [memory for memory, score in scored_memories[:limit]]
        
        # Update access statistics
        for memory in relevant_memories:
            await self._update_memory_access(memory.id)
        
        return relevant_memories
    
    async def _extract_factual_memories(
        self, 
        message: str, 
        response: str, 
        context: UserContext
    ) -> List[Dict[str, Any]]:
        """Extract factual information from interaction."""
        
        memories = []
        
        # Extract user preferences
        preference_patterns = [
            r"I (like|prefer|enjoy|love) ([^.]+)",
            r"I (don't like|dislike|hate) ([^.]+)",
            r"My favorite ([^.]+) is ([^.]+)"
        ]
        
        for pattern in preference_patterns:
            matches = re.findall(pattern, message, re.IGNORECASE)
            for match in matches:
                memory_content = f"User {match[0]} {match[1]}"
                memories.append({
                    'type': MemoryType.FACTUAL,
                    'content': memory_content,
                    'context': {'source': 'user_preference', 'confidence': 0.8},
                    'confidence': 0.8
                })
        
        # Extract location information
        if context.location:
            memories.append({
                'type': MemoryType.FACTUAL,
                'content': f"User was at location {context.location}",
                'context': {'source': 'location_data', 'timestamp': datetime.utcnow().isoformat()},
                'confidence': 0.9
            })
        
        return memories
    
    async def _calculate_relevance(
        self, 
        memory: Memory, 
        query: str, 
        query_embedding: List[float],
        intent: IntentType
    ) -> float:
        """Calculate relevance score for a memory."""
        
        relevance_factors = []
        
        # 1. Semantic similarity
        if memory.embedding and query_embedding:
            semantic_similarity = self._cosine_similarity(
                memory.embedding, query_embedding
            )
            relevance_factors.append(('semantic', semantic_similarity, 0.4))
        
        # 2. Intent relevance
        intent_relevance = self._calculate_intent_relevance(memory, intent)
        relevance_factors.append(('intent', intent_relevance, 0.3))
        
        # 3. Temporal relevance (newer is more relevant)
        temporal_relevance = self._calculate_temporal_relevance(memory)
        relevance_factors.append(('temporal', temporal_relevance, 0.2))
        
        # 4. Access frequency (more accessed is more relevant)
        frequency_relevance = min(memory.access_count / 100.0, 1.0)
        relevance_factors.append(('frequency', frequency_relevance, 0.1))
        
        # Calculate weighted average
        total_score = sum(score * weight for _, score, weight in relevance_factors)
        
        return total_score
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        vec1_np = np.array(vec1)
        vec2_np = np.array(vec2)
        
        dot_product = np.dot(vec1_np, vec2_np)
        norm1 = np.linalg.norm(vec1_np)
        norm2 = np.linalg.norm(vec2_np)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
```

### 5. Response Generation

Creates natural, contextual responses using OpenAI API:

```python
# app/services/pam/response_generator.py
from typing import Dict, Any, List, Optional
import json
from datetime import datetime

class ResponseGenerator:
    """
    Generates contextual responses using OpenAI API with PAM personality.
    """
    
    def __init__(self):
        self.openai_client = OpenAIClient()
        self.template_manager = ResponseTemplateManager()
    
    async def generate(
        self,
        message: str,
        intent: IntentResult,
        context: UserContext,
        memories: List[Memory],
        node_results: Dict[str, Any],
        user_id: str
    ) -> ResponseResult:
        """
        Generate PAM response using all available context.
        
        Args:
            message: User's message
            intent: Classified intent
            context: User context
            memories: Relevant memories
            node_results: Results from specialized nodes
            user_id: User identifier
            
        Returns:
            ResponseResult with generated response and metadata
        """
        
        start_time = datetime.utcnow()
        
        # Build system prompt
        system_prompt = await self._build_system_prompt(context, memories)
        
        # Build user prompt with context
        user_prompt = await self._build_user_prompt(
            message, intent, context, node_results
        )
        
        # Generate response
        response = await self._call_openai(system_prompt, user_prompt)
        
        # Post-process response
        processed_response = await self._post_process_response(
            response, intent, context, node_results
        )
        
        end_time = datetime.utcnow()
        processing_time = (end_time - start_time).total_seconds() * 1000
        
        return ResponseResult(
            content=processed_response.content,
            suggested_actions=processed_response.actions,
            processing_time_ms=processing_time,
            tokens_used=response.usage.total_tokens if response.usage else 0
        )
    
    async def _build_system_prompt(
        self, 
        context: UserContext, 
        memories: List[Memory]
    ) -> str:
        """Build comprehensive system prompt for PAM."""
        
        prompt_parts = [
            "You are PAM (Personal Assistant Manager), an AI assistant specifically designed for nomadic lifestyles.",
            "",
            "CORE PERSONALITY:",
            "- Friendly, knowledgeable, and proactive",
            "- Understands the unique challenges of nomadic living",
            "- Provides practical, actionable advice",
            "- Maintains conversation context and learns from interactions",
            "",
            "CAPABILITIES:",
            "- Financial management (expenses, budgeting, savings)",
            "- Travel planning (routes, camping spots, maintenance)",
            "- Community connections (events, groups, experiences)",
            "- Personal organization and goal tracking",
            "",
        ]
        
        # Add user context
        if context.preferences:
            prompt_parts.append("USER PREFERENCES:")
            for key, value in context.preferences.items():
                prompt_parts.append(f"- {key}: {value}")
            prompt_parts.append("")
        
        # Add relevant memories
        if memories:
            prompt_parts.append("RELEVANT CONTEXT FROM PAST INTERACTIONS:")
            for memory in memories[:3]:  # Top 3 most relevant
                prompt_parts.append(f"- {memory.content}")
            prompt_parts.append("")
        
        # Add current context
        if context.current_location:
            prompt_parts.append(f"CURRENT LOCATION: {context.current_location}")
        
        if context.current_budget:
            prompt_parts.append("CURRENT BUDGET STATUS:")
            for category, amount in context.current_budget.items():
                prompt_parts.append(f"- {category}: ${amount}")
            prompt_parts.append("")
        
        prompt_parts.extend([
            "RESPONSE GUIDELINES:",
            "- Be conversational and personable",
            "- Provide specific, actionable advice when possible",
            "- Ask clarifying questions when needed",
            "- Reference past interactions when relevant",
            "- Suggest proactive actions when appropriate",
            "- Keep responses concise but comprehensive",
            ""
        ])
        
        return "\n".join(prompt_parts)
    
    async def _build_user_prompt(
        self,
        message: str,
        intent: IntentResult,
        context: UserContext,
        node_results: Dict[str, Any]
    ) -> str:
        """Build user prompt with current message and context."""
        
        prompt_parts = [f"User message: {message}"]
        
        # Add intent information
        prompt_parts.append(f"Detected intent: {intent.intent.value} (confidence: {intent.confidence:.2f})")
        
        # Add node results if available
        if node_results:
            prompt_parts.append("\nRelevant data from your systems:")
            for node_name, results in node_results.items():
                if results:
                    prompt_parts.append(f"{node_name.upper()} DATA:")
                    prompt_parts.append(json.dumps(results, indent=2, default=str))
        
        return "\n".join(prompt_parts)
    
    async def _call_openai(self, system_prompt: str, user_prompt: str) -> Any:
        """Call OpenAI API with error handling and retries."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=messages,
                max_tokens=1000,
                temperature=0.7,
                presence_penalty=0.1,
                frequency_penalty=0.1
            )
            return response
        except Exception as e:
            # Fallback to GPT-3.5 if GPT-4 fails
            try:
                response = await self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=messages,
                    max_tokens=800,
                    temperature=0.7
                )
                return response
            except Exception as fallback_error:
                raise PAMException(
                    message="Unable to generate response",
                    code="RESPONSE_GENERATION_FAILED"
                )
```

### 6. Specialized Processing Nodes

Domain-specific processors for different types of queries:

```python
# app/services/pam/nodes/wins_node.py
from .base_node import BaseNode
from typing import Dict, Any, Optional

class WinsNode(BaseNode):
    """
    Specialized node for financial management (Wins) queries.
    """
    
    async def process(
        self,
        message: str,
        intent: IntentType,
        context: UserContext,
        user_id: str
    ) -> Dict[str, Any]:
        """Process financial-related queries."""
        
        if intent not in [
            IntentType.EXPENSE_QUERY, 
            IntentType.BUDGET_CHECK,
            IntentType.FINANCIAL_ADVICE
        ]:
            return {}
        
        results = {}
        
        # Handle expense queries
        if intent == IntentType.EXPENSE_QUERY:
            results.update(await self._handle_expense_query(message, context, user_id))
        
        # Handle budget checks
        elif intent == IntentType.BUDGET_CHECK:
            results.update(await self._handle_budget_check(context, user_id))
        
        # Handle financial advice requests
        elif intent == IntentType.FINANCIAL_ADVICE:
            results.update(await self._handle_financial_advice(message, context, user_id))
        
        return results
    
    async def _handle_expense_query(
        self, 
        message: str, 
        context: UserContext, 
        user_id: str
    ) -> Dict[str, Any]:
        """Handle expense-related queries."""
        
        # Extract query parameters
        query_params = self._extract_expense_query_params(message)
        
        # Get expenses based on parameters
        expenses = await self.database_service.get_expenses_filtered(
            user_id=user_id,
            category=query_params.get('category'),
            start_date=query_params.get('start_date'),
            end_date=query_params.get('end_date'),
            limit=query_params.get('limit', 10)
        )
        
        # Calculate summary statistics
        total_amount = sum(expense['amount'] for expense in expenses)
        category_breakdown = self._calculate_category_breakdown(expenses)
        
        return {
            'expenses': expenses,
            'total_amount': total_amount,
            'category_breakdown': category_breakdown,
            'expense_count': len(expenses),
            'query_parameters': query_params
        }
    
    async def _handle_budget_check(
        self, 
        context: UserContext, 
        user_id: str
    ) -> Dict[str, Any]:
        """Handle budget status checks."""
        
        # Get current budget status
        budget_summary = await self.database_service.get_budget_summary(user_id)
        
        # Calculate budget health metrics
        budget_health = self._calculate_budget_health(budget_summary)
        
        # Get spending trends
        spending_trends = await self._get_spending_trends(user_id)
        
        # Generate budget alerts
        alerts = self._generate_budget_alerts(budget_summary, spending_trends)
        
        return {
            'budget_summary': budget_summary,
            'budget_health': budget_health,
            'spending_trends': spending_trends,
            'alerts': alerts,
            'recommendations': self._generate_budget_recommendations(
                budget_summary, spending_trends
            )
        }
    
    def _calculate_budget_health(self, budget_summary: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate overall budget health metrics."""
        
        health_score = 100
        issues = []
        
        for category, data in budget_summary.get('categories', {}).items():
            budget = data.get('budget', 0)
            spent = data.get('spent', 0)
            
            if budget > 0:
                utilization = spent / budget
                
                if utilization > 1.0:
                    health_score -= 20
                    issues.append(f"Over budget in {category}")
                elif utilization > 0.8:
                    health_score -= 10
                    issues.append(f"Approaching budget limit in {category}")
        
        return {
            'score': max(health_score, 0),
            'status': 'excellent' if health_score >= 80 else 'good' if health_score >= 60 else 'needs_attention',
            'issues': issues
        }
```

## Integration with Data Sources

PAM integrates with multiple data sources to provide comprehensive assistance:

### Database Integration
- User profiles and preferences
- Financial transactions and budgets
- Travel history and maintenance records
- Social interactions and community data

### External API Integration
- OpenAI for natural language processing
- Mapbox for location and routing services
- Weather APIs for travel planning
- Banking APIs for financial data (future)

### Real-time Data Processing
- Location updates
- Expense notifications
- Maintenance reminders
- Community activity feeds

## Customization and Training

### Personality Customization
PAM's personality can be customized through:
- System prompt modifications
- Response template customization
- Conversation style preferences
- Domain-specific knowledge integration

### Continuous Learning
- User interaction feedback
- Response quality scoring
- Context relevance optimization
- Memory system refinement
- Intent classification improvement

## Performance Optimization

### Response Time Optimization
- Intelligent caching strategies
- Parallel processing of nodes
- Optimized database queries
- Response streaming for long responses

### Memory Management
- Efficient context storage
- Memory relevance scoring
- Automatic memory cleanup
- Context compression techniques

### Scalability Considerations
- Horizontal scaling of processing nodes
- Database query optimization
- Redis caching for frequent data
- Asynchronous processing pipelines

This comprehensive PAM implementation provides a robust foundation for an intelligent personal assistant tailored to nomadic lifestyles, with the flexibility to evolve and improve based on user interactions and feedback.
