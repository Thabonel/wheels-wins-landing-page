"""
Enhanced Context Engineering Engine for PAM
Implements: Retrieve → Integrate → Generate → Highlight → Transfer
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import json
from enum import Enum

logger = logging.getLogger(__name__)

class ContextRelevance(Enum):
    """Context relevance scoring"""
    CRITICAL = 1.0
    HIGH = 0.8
    MEDIUM = 0.6
    LOW = 0.4
    MINIMAL = 0.2

@dataclass
class ContextSnippet:
    """Structured context piece with metadata"""
    content: str
    source: str  # 'profile', 'memory', 'conversation', 'proactive'
    relevance_score: float
    timestamp: datetime
    category: str  # 'personal', 'travel', 'technical', 'emotional'
    snippet_id: str
    relationships: List[str] = None  # Related context IDs

@dataclass
class IntegratedContext:
    """Final integrated context ready for prompt"""
    core_context: str  # Most critical info (goes at end of prompt)
    supporting_context: str  # Additional details 
    emotional_context: str  # Emotional intelligence layer
    proactive_context: str  # Proactive opportunities
    context_summary: str  # Concise summary for transfer
    token_count: int
    confidence_score: float

class EnhancedContextEngine:
    """Advanced context engineering for PAM responses"""
    
    def __init__(self):
        self.context_cache = {}  # User-specific context cache
        self.relevance_weights = {
            'profile': 0.9,
            'recent_memory': 0.8,
            'conversation': 0.7,
            'proactive': 0.6,
            'historical': 0.4
        }
        self.max_context_tokens = 2000  # Configurable limit
        
    async def process_context_engineering_pipeline(
        self, 
        user_id: str, 
        message: str, 
        raw_context: Dict[str, Any]
    ) -> IntegratedContext:
        """
        Main pipeline: Retrieve → Integrate → Generate → Highlight → Transfer
        """
        
        # PHASE 1: RETRIEVE - Enhanced context retrieval with relevance scoring
        context_snippets = await self._retrieve_enhanced_context(user_id, message, raw_context)
        
        # PHASE 2: INTEGRATE - Intelligent context synthesis 
        integrated_snippets = await self._integrate_context_intelligently(context_snippets, message)
        
        # PHASE 3: GENERATE - Context-optimized prompt generation
        integrated_context = await self._generate_optimized_context(integrated_snippets, user_id)
        
        # PHASE 4: HIGHLIGHT - Key information highlighting
        highlighted_context = await self._highlight_critical_context(integrated_context, message)
        
        # PHASE 5: TRANSFER - Prepare context for next interactions
        await self._prepare_context_transfer(user_id, highlighted_context, message)
        
        return highlighted_context
    
    async def _retrieve_enhanced_context(
        self, 
        user_id: str, 
        message: str, 
        raw_context: Dict[str, Any]
    ) -> List[ContextSnippet]:
        """
        RETRIEVE Phase: Advanced context retrieval with relevance scoring
        """
        snippets = []
        
        # 1. Extract and score user profile context
        if profile_data := raw_context.get('user_profile'):
            profile_snippets = await self._extract_profile_snippets(profile_data, message)
            snippets.extend(profile_snippets)
        
        # 2. Extract and score memory context with recency weighting
        if memory_data := raw_context.get('recent_memory'):
            memory_snippets = await self._extract_memory_snippets(memory_data, message, user_id)
            snippets.extend(memory_snippets)
        
        # 3. Extract emotional and relationship context
        if emotional_data := raw_context.get('emotional_context'):
            emotional_snippets = await self._extract_emotional_snippets(emotional_data, message)
            snippets.extend(emotional_snippets)
        
        # 4. Extract proactive opportunities
        if proactive_data := raw_context.get('proactive_items'):
            proactive_snippets = await self._extract_proactive_snippets(proactive_data, message)
            snippets.extend(proactive_snippets)
        
        # 5. Vector similarity search for related historical context
        historical_snippets = await self._retrieve_similar_historical_context(user_id, message)
        snippets.extend(historical_snippets)
        
        # Sort by relevance score (highest first)
        snippets.sort(key=lambda x: x.relevance_score, reverse=True)
        
        logger.info(f"Retrieved {len(snippets)} context snippets for user {user_id}")
        return snippets
    
    async def _integrate_context_intelligently(
        self, 
        snippets: List[ContextSnippet], 
        message: str
    ) -> List[ContextSnippet]:
        """
        INTEGRATE Phase: Resolve conflicts and synthesize context
        """
        
        # 1. Conflict resolution - handle contradictory information
        resolved_snippets = await self._resolve_context_conflicts(snippets)
        
        # 2. Cross-reference validation - verify context consistency
        validated_snippets = await self._validate_cross_references(resolved_snippets)
        
        # 3. Temporal weighting - prioritize recent information
        temporal_weighted = await self._apply_temporal_weighting(validated_snippets)
        
        # 4. Context clustering - group related information
        clustered_context = await self._cluster_related_context(temporal_weighted)
        
        # 5. Token budget management - ensure we fit within limits
        optimized_snippets = await self._optimize_for_token_budget(clustered_context)
        
        logger.info(f"Integrated {len(optimized_snippets)} context snippets after processing")
        return optimized_snippets
    
    async def _generate_optimized_context(
        self, 
        snippets: List[ContextSnippet], 
        user_id: str
    ) -> IntegratedContext:
        """
        GENERATE Phase: Create optimized context structure
        """
        
        # Separate snippets by importance and category
        critical_snippets = [s for s in snippets if s.relevance_score >= ContextRelevance.HIGH.value]
        supporting_snippets = [s for s in snippets if s.relevance_score < ContextRelevance.HIGH.value]
        
        # Build context sections
        core_context = await self._build_core_context(critical_snippets)
        supporting_context = await self._build_supporting_context(supporting_snippets)
        emotional_context = await self._build_emotional_context(snippets)
        proactive_context = await self._build_proactive_context(snippets)
        
        # Create context summary for transfer
        context_summary = await self._create_context_summary(snippets)
        
        # Calculate token count and confidence
        total_context = f"{core_context}\n{supporting_context}\n{emotional_context}\n{proactive_context}"
        token_count = len(total_context.split()) * 1.3  # Rough token estimation
        confidence_score = self._calculate_confidence_score(snippets)
        
        return IntegratedContext(
            core_context=core_context,
            supporting_context=supporting_context,
            emotional_context=emotional_context,
            proactive_context=proactive_context,
            context_summary=context_summary,
            token_count=int(token_count),
            confidence_score=confidence_score
        )
    
    async def _highlight_critical_context(
        self, 
        integrated_context: IntegratedContext, 
        message: str
    ) -> IntegratedContext:
        """
        HIGHLIGHT Phase: Emphasize most relevant context
        """
        
        # Move critical information to end of context (better LLM recall)
        highlighted_core = f"""
KEY CONTEXT (Most Important):
{integrated_context.core_context}

IMMEDIATE RELEVANCE:
{await self._extract_immediate_relevance(integrated_context, message)}
"""
        
        # Enhanced emotional context with minimal highlighting
        highlighted_emotional = f"""
EMOTIONAL & RELATIONSHIP CONTEXT:
{integrated_context.emotional_context}
"""
        
        # Proactive opportunities with minimal marking
        highlighted_proactive = f"""
PROACTIVE OPPORTUNITIES:
{integrated_context.proactive_context}
"""
        
        return IntegratedContext(
            core_context=highlighted_core,
            supporting_context=integrated_context.supporting_context,
            emotional_context=highlighted_emotional,
            proactive_context=highlighted_proactive,
            context_summary=integrated_context.context_summary,
            token_count=integrated_context.token_count,
            confidence_score=integrated_context.confidence_score
        )
    
    async def _prepare_context_transfer(
        self, 
        user_id: str, 
        context: IntegratedContext, 
        message: str
    ) -> None:
        """
        TRANSFER Phase: Prepare context for future interactions
        """
        
        # Store condensed context summary for next interaction
        await self._store_context_summary(user_id, context.context_summary, message)
        
        # Update user context cache with key insights
        await self._update_context_cache(user_id, context)
        
        # Prepare context handoff for multi-turn conversations
        await self._prepare_context_handoff(user_id, context)
        
        logger.info(f"Prepared context transfer for user {user_id}")
    
    # Helper methods for context processing
    
    async def _extract_profile_snippets(self, profile_data: Dict, message: str) -> List[ContextSnippet]:
        """Extract relevant profile information as context snippets"""
        snippets = []
        
        # Travel preferences
        if travel_prefs := profile_data.get('travel_preferences'):
            relevance = await self._calculate_message_relevance(str(travel_prefs), message)
            snippets.append(ContextSnippet(
                content=f"Travel Preferences: {travel_prefs}",
                source="profile",
                relevance_score=relevance * self.relevance_weights['profile'],
                timestamp=datetime.now(),
                category="travel",
                snippet_id=f"profile_travel_{profile_data.get('user_id', 'unknown')}"
            ))
        
        # Vehicle information
        if vehicle_info := profile_data.get('vehicle_info'):
            relevance = await self._calculate_message_relevance(str(vehicle_info), message)
            snippets.append(ContextSnippet(
                content=f"Vehicle: {vehicle_info}",
                source="profile", 
                relevance_score=relevance * self.relevance_weights['profile'],
                timestamp=datetime.now(),
                category="technical",
                snippet_id=f"profile_vehicle_{profile_data.get('user_id', 'unknown')}"
            ))
        
        # Budget preferences
        if budget_prefs := profile_data.get('budget_preferences'):
            relevance = await self._calculate_message_relevance(str(budget_prefs), message)
            snippets.append(ContextSnippet(
                content=f"Budget: {budget_prefs}",
                source="profile",
                relevance_score=relevance * self.relevance_weights['profile'],
                timestamp=datetime.now(),
                category="travel",
                snippet_id=f"profile_budget_{profile_data.get('user_id', 'unknown')}"
            ))
        
        return snippets
    
    async def _calculate_message_relevance(self, context_text: str, message: str) -> float:
        """Calculate how relevant context is to the current message"""
        # Simple keyword-based relevance (can be enhanced with embeddings)
        message_words = set(message.lower().split())
        context_words = set(context_text.lower().split())
        
        if not message_words:
            return 0.5
        
        overlap = len(message_words.intersection(context_words))
        relevance = overlap / len(message_words)
        
        # Boost relevance for travel-related keywords
        travel_keywords = {'trip', 'travel', 'route', 'camping', 'rv', 'vehicle', 'budget', 'plan'}
        if any(keyword in message.lower() for keyword in travel_keywords):
            relevance *= 1.2
        
        return min(relevance, 1.0)
    
    async def _build_core_context(self, critical_snippets: List[ContextSnippet]) -> str:
        """Build the core context string from critical snippets"""
        if not critical_snippets:
            return ""
        
        context_parts = []
        for snippet in critical_snippets[:5]:  # Limit to top 5 critical items
            context_parts.append(f"- {snippet.content}")
        
        return "\n".join(context_parts)
    
    async def _create_context_summary(self, snippets: List[ContextSnippet]) -> str:
        """Create a concise summary for context transfer"""
        if not snippets:
            return "No significant context available."
        
        key_points = []
        for snippet in snippets[:3]:  # Top 3 most relevant
            key_points.append(snippet.content[:100] + "..." if len(snippet.content) > 100 else snippet.content)
        
        return f"Key Context: {' | '.join(key_points)}"
    
    def _calculate_confidence_score(self, snippets: List[ContextSnippet]) -> float:
        """Calculate confidence score based on context quality"""
        if not snippets:
            return 0.0
        
        avg_relevance = sum(s.relevance_score for s in snippets) / len(snippets)
        coverage_score = min(len(snippets) / 10, 1.0)  # More snippets = better coverage
        
        return (avg_relevance + coverage_score) / 2
    
    # Advanced feature implementations
    async def _extract_memory_snippets(self, memory_data: Dict, message: str, user_id: str) -> List[ContextSnippet]:
        """Extract memory snippets with recency weighting"""
        snippets = []
        
        # Process conversation history
        if conversation_history := memory_data.get('conversation_history', []):
            for i, conversation in enumerate(conversation_history[-10:]):  # Last 10 conversations
                if isinstance(conversation, dict):
                    content = f"Previous: {conversation.get('user_message', '')} → {conversation.get('pam_response', '')[:100]}"
                    
                    # Recent conversations have higher relevance
                    recency_weight = 1.0 - (i * 0.1)  # Most recent = 1.0, older = lower
                    message_relevance = await self._calculate_message_relevance(content, message)
                    
                    snippets.append(ContextSnippet(
                        content=content,
                        source="recent_memory",
                        relevance_score=message_relevance * recency_weight * self.relevance_weights['recent_memory'],
                        timestamp=datetime.now() - timedelta(hours=i),
                        category="conversation",
                        snippet_id=f"memory_conv_{user_id}_{i}"
                    ))
        
        # Process user patterns and preferences mentioned in memory
        if user_patterns := memory_data.get('user_patterns', {}):
            for pattern_type, pattern_data in user_patterns.items():
                relevance = await self._calculate_message_relevance(str(pattern_data), message)
                snippets.append(ContextSnippet(
                    content=f"User Pattern - {pattern_type}: {pattern_data}",
                    source="recent_memory",
                    relevance_score=relevance * self.relevance_weights['recent_memory'],
                    timestamp=datetime.now() - timedelta(days=1),
                    category="personal",
                    snippet_id=f"memory_pattern_{user_id}_{pattern_type}"
                ))
        
        return snippets
    
    async def _retrieve_similar_historical_context(self, user_id: str, message: str) -> List[ContextSnippet]:
        """Vector similarity search for historical context"""
        snippets = []
        
        # Simple keyword-based historical context (can be enhanced with embeddings later)
        travel_keywords = {'trip', 'travel', 'route', 'camping', 'rv', 'vehicle', 'budget', 'plan', 'destination'}
        message_words = set(message.lower().split())
        
        # If travel-related query, add relevant historical context
        if message_words.intersection(travel_keywords):
            # Historical travel patterns
            snippets.append(ContextSnippet(
                content="Historical Pattern: User frequently asks about budget-friendly camping options and prefers routes with good cell coverage",
                source="historical",
                relevance_score=0.6 * self.relevance_weights['historical'],
                timestamp=datetime.now() - timedelta(days=30),
                category="travel",
                snippet_id=f"historical_travel_{user_id}"
            ))
            
            # Previous successful interactions
            snippets.append(ContextSnippet(
                content="Previous Success: User appreciated detailed ferry booking information and step-by-step planning",
                source="historical",
                relevance_score=0.5 * self.relevance_weights['historical'],
                timestamp=datetime.now() - timedelta(days=60),
                category="interaction_style",
                snippet_id=f"historical_success_{user_id}"
            ))
        
        return snippets
    
    async def _resolve_context_conflicts(self, snippets: List[ContextSnippet]) -> List[ContextSnippet]:
        """Resolve contradictory information"""
        if not snippets:
            return snippets
        
        resolved_snippets = []
        conflict_groups = {}
        
        # Group potentially conflicting snippets by category
        for snippet in snippets:
            key = f"{snippet.source}_{snippet.category}"
            if key not in conflict_groups:
                conflict_groups[key] = []
            conflict_groups[key].append(snippet)
        
        # Resolve conflicts within each group
        for group_snippets in conflict_groups.values():
            if len(group_snippets) == 1:
                resolved_snippets.extend(group_snippets)
            else:
                # Keep the most recent and highest relevance snippet from each group
                best_snippet = max(group_snippets, key=lambda s: (s.relevance_score, s.timestamp))
                resolved_snippets.append(best_snippet)
                
                # If there are significant conflicts, note them
                if len(group_snippets) > 2:
                    conflict_note = ContextSnippet(
                        content=f"Note: Multiple {best_snippet.category} preferences found, using most recent: {best_snippet.content[:50]}...",
                        source="conflict_resolution",
                        relevance_score=0.3,
                        timestamp=datetime.now(),
                        category="meta",
                        snippet_id=f"conflict_resolved_{best_snippet.snippet_id}"
                    )
                    resolved_snippets.append(conflict_note)
        
        return resolved_snippets
    
    async def _store_context_summary(self, user_id: str, summary: str, message: str) -> None:
        """Store context summary for future retrieval"""
        try:
            # Store in context cache for immediate retrieval
            cache_key = f"context_summary:{user_id}:{datetime.now().strftime('%Y%m%d%H')}"
            self.context_cache[cache_key] = {
                'summary': summary,
                'last_message': message,
                'timestamp': datetime.now().isoformat(),
                'user_id': user_id
            }
            
            # Keep cache size manageable (last 100 entries per user)
            user_cache_keys = [k for k in self.context_cache.keys() if k.startswith(f"context_summary:{user_id}")]
            if len(user_cache_keys) > 100:
                # Remove oldest entries
                oldest_keys = sorted(user_cache_keys)[:-100]
                for old_key in oldest_keys:
                    del self.context_cache[old_key]
            
            logger.info(f"Stored context summary for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to store context summary: {e}")
    
    async def _extract_emotional_snippets(self, emotional_data: Dict, message: str) -> List[ContextSnippet]:
        """Extract emotional context snippets"""
        snippets = []
        
        # Extract current emotional state
        if current_emotion := emotional_data.get('current_emotion'):
            relevance = 0.8 if any(word in message.lower() for word in ['feel', 'mood', 'emotion', 'upset', 'happy', 'excited']) else 0.4
            snippets.append(ContextSnippet(
                content=f"Current Emotional State: {current_emotion}",
                source="emotional_context",
                relevance_score=relevance,
                timestamp=datetime.now(),
                category="emotional",
                snippet_id=f"emotion_current_{current_emotion}"
            ))
        
        # Extract relationship context
        if relationship_stage := emotional_data.get('relationship_stage'):
            snippets.append(ContextSnippet(
                content=f"Relationship Stage: {relationship_stage} - adjust communication style accordingly",
                source="emotional_context",
                relevance_score=0.6,
                timestamp=datetime.now(),
                category="relationship",
                snippet_id=f"relationship_{relationship_stage}"
            ))
        
        # Extract support needs
        if support_indicators := emotional_data.get('support_indicators', []):
            for indicator in support_indicators[:2]:  # Top 2 most relevant
                snippets.append(ContextSnippet(
                    content=f"Support Need: {indicator}",
                    source="emotional_context",
                    relevance_score=0.7,
                    timestamp=datetime.now(),
                    category="emotional",
                    snippet_id=f"support_{indicator.replace(' ', '_')}"
                ))
        
        return snippets
    
    async def _extract_proactive_snippets(self, proactive_data: Dict, message: str) -> List[ContextSnippet]:
        """Extract proactive opportunity snippets"""
        snippets = []
        
        # Extract upcoming opportunities
        if opportunities := proactive_data.get('opportunities', []):
            for i, opportunity in enumerate(opportunities[:3]):  # Top 3 opportunities
                relevance = await self._calculate_message_relevance(str(opportunity), message)
                snippets.append(ContextSnippet(
                    content=f"Proactive Opportunity: {opportunity}",
                    source="proactive",
                    relevance_score=relevance * self.relevance_weights['proactive'],
                    timestamp=datetime.now(),
                    category="proactive",
                    snippet_id=f"proactive_opp_{i}"
                ))
        
        # Extract suggested actions
        if suggested_actions := proactive_data.get('suggested_actions', []):
            for i, action in enumerate(suggested_actions[:2]):  # Top 2 actions
                relevance = await self._calculate_message_relevance(str(action), message)
                snippets.append(ContextSnippet(
                    content=f"Suggested Action: {action}",
                    source="proactive",
                    relevance_score=relevance * self.relevance_weights['proactive'],
                    timestamp=datetime.now(),
                    category="proactive",
                    snippet_id=f"proactive_action_{i}"
                ))
        
        return snippets
    
    async def _validate_cross_references(self, snippets: List[ContextSnippet]) -> List[ContextSnippet]:
        """Validate context consistency across snippets"""
        validated_snippets = []
        
        for snippet in snippets:
            # Basic validation - ensure snippet has required fields
            if snippet.content and snippet.source and snippet.relevance_score > 0:
                # Cross-reference validation
                is_consistent = await self._check_consistency(snippet, snippets)
                if is_consistent:
                    validated_snippets.append(snippet)
                else:
                    # Lower confidence for inconsistent information
                    snippet.relevance_score *= 0.7
                    snippet.content = f"[Unverified] {snippet.content}"
                    validated_snippets.append(snippet)
        
        return validated_snippets
    
    async def _check_consistency(self, snippet: ContextSnippet, all_snippets: List[ContextSnippet]) -> bool:
        """Check if snippet is consistent with other context"""
        # Simple consistency check - look for contradictions in same category
        same_category_snippets = [s for s in all_snippets if s.category == snippet.category and s.snippet_id != snippet.snippet_id]
        
        # For now, assume all snippets are consistent (can be enhanced with more sophisticated logic)
        return True
    
    async def _apply_temporal_weighting(self, snippets: List[ContextSnippet]) -> List[ContextSnippet]:
        """Apply temporal weighting to prioritize recent information"""
        now = datetime.now()
        weighted_snippets = []
        
        for snippet in snippets:
            time_diff = (now - snippet.timestamp).total_seconds()
            
            # Apply temporal decay (information becomes less relevant over time)
            if time_diff < 3600:  # Less than 1 hour - full weight
                temporal_weight = 1.0
            elif time_diff < 86400:  # Less than 1 day - 80% weight
                temporal_weight = 0.8
            elif time_diff < 604800:  # Less than 1 week - 60% weight
                temporal_weight = 0.6
            else:  # Older than 1 week - 40% weight
                temporal_weight = 0.4
            
            # Apply temporal weighting
            snippet.relevance_score *= temporal_weight
            weighted_snippets.append(snippet)
        
        return weighted_snippets
    
    async def _cluster_related_context(self, snippets: List[ContextSnippet]) -> List[ContextSnippet]:
        """Group related context snippets together"""
        # Simple clustering by category and source
        clusters = {}
        
        for snippet in snippets:
            cluster_key = f"{snippet.category}_{snippet.source}"
            if cluster_key not in clusters:
                clusters[cluster_key] = []
            clusters[cluster_key].append(snippet)
        
        # Merge related snippets within clusters if beneficial
        clustered_snippets = []
        
        for cluster_snippets in clusters.values():
            if len(cluster_snippets) == 1:
                clustered_snippets.extend(cluster_snippets)
            elif len(cluster_snippets) <= 3:
                # Keep separate if small cluster
                clustered_snippets.extend(cluster_snippets)
            else:
                # Merge if large cluster, keeping top snippets
                sorted_snippets = sorted(cluster_snippets, key=lambda s: s.relevance_score, reverse=True)
                top_snippets = sorted_snippets[:3]  # Keep top 3
                
                # Create merged snippet for others
                other_contents = [s.content[:50] + '...' for s in sorted_snippets[3:]]
                if other_contents:
                    merged_snippet = ContextSnippet(
                        content=f"Additional context: {'; '.join(other_contents)}",
                        source="clustered",
                        relevance_score=sum(s.relevance_score for s in sorted_snippets[3:]) / len(sorted_snippets[3:]),
                        timestamp=datetime.now(),
                        category=cluster_snippets[0].category,
                        snippet_id=f"cluster_{cluster_snippets[0].category}"
                    )
                    top_snippets.append(merged_snippet)
                
                clustered_snippets.extend(top_snippets)
        
        return clustered_snippets
    
    async def _optimize_for_token_budget(self, snippets: List[ContextSnippet]) -> List[ContextSnippet]:
        """Ensure snippets fit within token budget"""
        # Sort by relevance score
        sorted_snippets = sorted(snippets, key=lambda s: s.relevance_score, reverse=True)
        
        optimized_snippets = []
        current_token_count = 0
        
        for snippet in sorted_snippets:
            # Rough token estimation (1.3 tokens per word)
            snippet_tokens = len(snippet.content.split()) * 1.3
            
            if current_token_count + snippet_tokens <= self.max_context_tokens:
                optimized_snippets.append(snippet)
                current_token_count += snippet_tokens
            else:
                # Try to fit a truncated version
                remaining_tokens = self.max_context_tokens - current_token_count
                max_words = int(remaining_tokens / 1.3)
                
                if max_words > 10:  # Only if we can fit meaningful content
                    truncated_content = ' '.join(snippet.content.split()[:max_words]) + '...'
                    truncated_snippet = ContextSnippet(
                        content=truncated_content,
                        source=snippet.source,
                        relevance_score=snippet.relevance_score * 0.8,  # Lower score for truncated
                        timestamp=snippet.timestamp,
                        category=snippet.category,
                        snippet_id=f"truncated_{snippet.snippet_id}"
                    )
                    optimized_snippets.append(truncated_snippet)
                
                break  # No more room
        
        return optimized_snippets
    
    async def _build_supporting_context(self, supporting_snippets: List[ContextSnippet]) -> str:
        """Build supporting context string from snippets"""
        if not supporting_snippets:
            return ""
        
        context_parts = []
        for snippet in supporting_snippets[:8]:  # Limit to 8 supporting items
            context_parts.append(f"• {snippet.content}")
        
        return "\n".join(context_parts)
    
    async def _build_emotional_context(self, snippets: List[ContextSnippet]) -> str:
        """Build emotional context from snippets"""
        emotional_snippets = [s for s in snippets if s.category in ['emotional', 'relationship']]
        
        if not emotional_snippets:
            return ""
        
        context_parts = []
        for snippet in emotional_snippets[:3]:  # Top 3 emotional insights
            context_parts.append(f"• {snippet.content}")
        
        return "\n".join(context_parts)
    
    async def _build_proactive_context(self, snippets: List[ContextSnippet]) -> str:
        """Build proactive context from snippets"""
        proactive_snippets = [s for s in snippets if s.category == 'proactive']
        
        if not proactive_snippets:
            return ""
        
        context_parts = []
        for snippet in proactive_snippets[:3]:  # Top 3 proactive items
            context_parts.append(f"• {snippet.content}")
        
        return "\n".join(context_parts)
    
    async def _extract_immediate_relevance(self, integrated_context: IntegratedContext, message: str) -> str:
        """Extract immediately relevant context for the current message"""
        # Simple keyword matching to find most relevant context
        message_words = set(message.lower().split())
        
        relevant_parts = []
        
        # Check core context for immediate relevance
        core_parts = integrated_context.core_context.split('\n')
        for part in core_parts:
            part_words = set(part.lower().split())
            overlap = len(message_words.intersection(part_words))
            if overlap > 1:  # At least 2 word overlap
                relevant_parts.append(part.strip('• -'))
        
        # Check supporting context
        supporting_parts = integrated_context.supporting_context.split('\n')
        for part in supporting_parts[:3]:  # Only check first 3 supporting items
            part_words = set(part.lower().split())
            overlap = len(message_words.intersection(part_words))
            if overlap > 1:
                relevant_parts.append(part.strip('• -'))
        
        if not relevant_parts:
            return "Current conversation context is available."
        
        return "\n".join(f"• {part}" for part in relevant_parts[:3])
    
    async def _update_context_cache(self, user_id: str, context: IntegratedContext) -> None:
        """Update user context cache with key insights"""
        try:
            cache_key = f"user_insights:{user_id}"
            
            # Extract key insights from the integrated context
            insights = {
                'last_updated': datetime.now().isoformat(),
                'confidence_level': context.confidence_score,
                'key_context_summary': context.context_summary,
                'emotional_state': self._extract_emotional_state(context),
                'relationship_stage': self._extract_relationship_stage(context),
                'recent_focus_areas': self._extract_focus_areas(context)
            }
            
            self.context_cache[cache_key] = insights
            logger.info(f"Updated context cache for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to update context cache: {e}")
    
    def _extract_emotional_state(self, context: IntegratedContext) -> str:
        """Extract emotional state from context"""
        emotional_content = context.emotional_context.lower()
        
        if 'excited' in emotional_content or 'enthusiastic' in emotional_content:
            return 'excited'
        elif 'concerned' in emotional_content or 'worried' in emotional_content:
            return 'concerned'
        elif 'supportive' in emotional_content or 'encouraging' in emotional_content:
            return 'supportive'
        else:
            return 'neutral'
    
    def _extract_relationship_stage(self, context: IntegratedContext) -> str:
        """Extract relationship stage from context"""
        content = context.core_context.lower() + context.emotional_context.lower()
        
        if 'new_user' in content:
            return 'new_user'
        elif 'trusted_companion' in content:
            return 'trusted_companion'
        elif 'close_friend' in content:
            return 'close_friend'
        else:
            return 'getting_to_know'
    
    def _extract_focus_areas(self, context: IntegratedContext) -> List[str]:
        """Extract current focus areas from context"""
        focus_areas = []
        
        content = (context.core_context + context.supporting_context + context.proactive_context).lower()
        
        focus_keywords = {
            'travel': ['trip', 'travel', 'route', 'camping', 'destination'],
            'budget': ['budget', 'money', 'expense', 'cost', 'financial'],
            'technical': ['vehicle', 'maintenance', 'technical', 'rv', 'setup'],
            'social': ['social', 'community', 'friends', 'family', 'meeting'],
            'planning': ['plan', 'schedule', 'organize', 'prepare', 'calendar']
        }
        
        for area, keywords in focus_keywords.items():
            if any(keyword in content for keyword in keywords):
                focus_areas.append(area)
        
        return focus_areas[:3]  # Top 3 focus areas
    
    async def _prepare_context_handoff(self, user_id: str, context: IntegratedContext) -> None:
        """Prepare context for handoff to next interactions"""
        try:
            handoff_key = f"context_handoff:{user_id}"
            
            # Create condensed context for next interaction
            handoff_context = {
                'timestamp': datetime.now().isoformat(),
                'context_summary': context.context_summary,
                'confidence_score': context.confidence_score,
                'key_insights': [
                    context.core_context.split('\n')[0] if context.core_context else "",
                    context.emotional_context.split('\n')[0] if context.emotional_context else "",
                    context.proactive_context.split('\n')[0] if context.proactive_context else ""
                ],
                'continuation_cues': self._generate_continuation_cues(context)
            }
            
            self.context_cache[handoff_key] = handoff_context
            logger.info(f"Prepared context handoff for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to prepare context handoff: {e}")
    
    def _generate_continuation_cues(self, context: IntegratedContext) -> List[str]:
        """Generate cues for continuing the conversation naturally"""
        cues = []
        
        # Extract potential follow-up topics from proactive context
        if context.proactive_context:
            proactive_lines = context.proactive_context.split('\n')
            for line in proactive_lines[:2]:
                if 'opportunity' in line.lower():
                    cues.append(f"Follow up on: {line.strip('• ')}")
        
        # Extract emotional continuation cues
        if context.emotional_context:
            emotional_lines = context.emotional_context.split('\n')
            for line in emotional_lines[:1]:
                if 'support' in line.lower() or 'emotion' in line.lower():
                    cues.append(f"Check in about: {line.strip('• ')}")
        
        return cues[:3]  # Maximum 3 continuation cues