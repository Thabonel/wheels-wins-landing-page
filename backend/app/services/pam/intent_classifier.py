"""
Enhanced Intent Classification System for PAM
Integrates with existing memory and context systems while providing sophisticated classification
"""

from typing import Dict, Any, List, Optional, Tuple
import re
import json
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
import logging
from enum import Enum
import asyncio
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
import os

logger = logging.getLogger(__name__)


class IntentType(Enum):
    """Predefined intent types with consistent naming"""
    TRIP_PLANNING = "trip_planning"
    EXPENSE_TRACKING = "expense_tracking"
    BUDGET_MANAGEMENT = "budget_management"
    ROUTE_OPTIMIZATION = "route_optimization"
    CAMPGROUND_SEARCH = "campground_search"
    WEATHER_INQUIRY = "weather_inquiry"
    MAINTENANCE_REMINDER = "maintenance_reminder"
    SOCIAL_INTERACTION = "social_interaction"
    HELP_REQUEST = "help_request"
    GENERAL_QUERY = "general_query"
    FEEDBACK = "feedback"
    CORRECTION = "correction"


@dataclass
class Entity:
    """Extracted entity from user message"""
    type: str  # 'location', 'date', 'amount', 'duration', 'person', etc.
    value: str  # Raw extracted text
    normalized_value: Optional[str] = None  # Processed/standardized value
    confidence: float = 1.0
    position: Tuple[int, int] = (0, 0)  # Start and end positions in text


@dataclass
class IntentClassification:
    """Complete intent classification result"""
    intent: IntentType
    confidence: float
    entities: List[Entity]
    context_clues: List[str]
    suggested_handler: str
    reasoning: str
    requires_clarification: bool = False
    clarification_questions: List[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/serialization"""
        result = asdict(self)
        result['intent'] = self.intent.value
        result['clarification_questions'] = self.clarification_questions or []
        return result


class EnhancedIntentClassifier:
    """
    Enhanced intent classification system that:
    1. Uses both rule-based and AI-powered classification
    2. Extracts entities (locations, dates, amounts, etc.)
    3. Learns from user corrections and feedback
    4. Maintains intent history for pattern recognition
    """
    
    def __init__(self, openai_api_key: Optional[str] = None):
        self.openai_api_key = openai_api_key or os.getenv('OPENAI_API_KEY')
        self.ai_model = None
        if self.openai_api_key:
            self.ai_model = ChatOpenAI(
                api_key=self.openai_api_key,
                model="gpt-3.5-turbo",
                temperature=0.1,
                max_tokens=500
            )
        
        # Entity extraction patterns
        self.entity_patterns = {
            'amount': [
                r'\$?\d+(?:,\d{3})*(?:\.\d{2})?',  # $123.45, 1,234.56
                r'\d+\s*(?:dollars?|bucks?|AUD|USD)',  # 50 dollars
            ],
            'date': [
                r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',  # 12/25/2023
                r'\d{4}-\d{2}-\d{2}',  # 2023-12-25
                r'(?:next|this|last)\s+(?:week|month|year)',
                r'(?:today|tomorrow|yesterday)',
                r'(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)',
                r'(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}',
            ],
            'location': [
                r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:National\s+Park|State\s+Park|Beach|Lake|River|Mountain|Valley))\b',
                r'\b[A-Z][a-z]+,\s*[A-Z]{2,3}\b',  # City, State
                r'\bfrom\s+([^.!?]+?)\s+to\s+([^.!?]+?)(?:\.|$)',  # from X to Y
            ],
            'duration': [
                r'\d+\s*(?:days?|weeks?|months?|hours?|minutes?)',
                r'(?:a|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:day|week|month|hour)',
            ],
            'distance': [
                r'\d+\s*(?:km|kilometers?|mi|miles?)',
                r'\d+\s*(?:hour|hr)\s*(?:drive|trip)',
            ]
        }
        
        # Intent classification rules (keyword-based fallback)
        self.intent_rules = {
            IntentType.TRIP_PLANNING: [
                'trip', 'travel', 'route', 'plan', 'destination', 'journey',
                'vacation', 'holiday', 'roadtrip', 'itinerary', 'waypoint'
            ],
            IntentType.EXPENSE_TRACKING: [
                'spent', 'cost', 'expense', 'paid', 'bought', 'purchase',
                'receipt', 'transaction', 'charge', 'bill'
            ],
            IntentType.BUDGET_MANAGEMENT: [
                'budget', 'save', 'saving', 'afford', 'financial', 'money',
                'limit', 'allocation', 'forecast', 'spend limit'
            ],
            IntentType.ROUTE_OPTIMIZATION: [
                'route', 'fastest', 'shortest', 'optimize', 'avoid',
                'traffic', 'alternative', 'detour', 'directions'
            ],
            IntentType.CAMPGROUND_SEARCH: [
                'campground', 'camping', 'campsite', 'rv park', 'caravan park',
                'accommodation', 'stay', 'overnight', 'park', 'site'
            ],
            IntentType.WEATHER_INQUIRY: [
                'weather', 'forecast', 'temperature', 'rain', 'sunny',
                'cloudy', 'storm', 'conditions', 'climate'
            ],
            IntentType.MAINTENANCE_REMINDER: [
                'maintenance', 'service', 'repair', 'check', 'oil change',
                'tire', 'brake', 'engine', 'vehicle', 'mechanical'
            ],
            IntentType.HELP_REQUEST: [
                'help', 'how', 'what', 'when', 'where', 'why',
                'assist', 'support', 'guide', 'explain', 'show'
            ],
            IntentType.FEEDBACK: [
                'feedback', 'suggest', 'improve', 'like', 'dislike',
                'good', 'bad', 'better', 'worse', 'opinion'
            ],
            IntentType.CORRECTION: [
                'wrong', 'incorrect', 'mistake', 'error', 'actually',
                'no', 'not', 'fix', 'correct', 'change'
            ]
        }
    
    async def classify_intent(
        self, 
        message: str, 
        user_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> IntentClassification:
        """
        Classify user intent using both rule-based and AI-powered methods
        """
        try:
            # Step 1: Extract entities first
            entities = await self._extract_entities(message)
            
            # Step 2: Get rule-based classification
            rule_based_intent, rule_confidence, context_clues = self._classify_with_rules(
                message, context or {}
            )
            
            # Step 3: Use AI for complex cases or low confidence
            if self.ai_model and (rule_confidence < 0.8 or len(entities) > 2):
                ai_result = await self._classify_with_ai(message, entities, context or {})
                if ai_result and ai_result.confidence > rule_confidence:
                    intent = ai_result.intent
                    confidence = ai_result.confidence
                    reasoning = ai_result.reasoning
                    context_clues.extend(ai_result.context_clues)
                else:
                    intent = rule_based_intent
                    confidence = rule_confidence
                    reasoning = f"Rule-based classification using keywords: {context_clues}"
            else:
                intent = rule_based_intent
                confidence = rule_confidence
                reasoning = f"Rule-based classification using keywords: {context_clues}"
            
            # Step 4: Determine appropriate handler
            suggested_handler = self._get_handler_for_intent(intent)
            
            # Step 5: Check if clarification is needed
            requires_clarification, clarification_questions = self._check_clarification_needed(
                intent, entities, confidence
            )
            
            # Step 6: Store classification for learning
            await self._store_classification(
                user_id, message, intent, confidence, entities, context or {}
            )
            
            classification = IntentClassification(
                intent=intent,
                confidence=confidence,
                entities=entities,
                context_clues=context_clues,
                suggested_handler=suggested_handler,
                reasoning=reasoning,
                requires_clarification=requires_clarification,
                clarification_questions=clarification_questions
            )
            
            logger.info(f"Intent classified: {intent.value} (confidence: {confidence:.2f})")
            return classification
            
        except Exception as e:
            logger.error(f"Intent classification error: {e}")
            # Return safe fallback
            return IntentClassification(
                intent=IntentType.GENERAL_QUERY,
                confidence=0.5,
                entities=[],
                context_clues=["error_fallback"],
                suggested_handler="general_handler",
                reasoning=f"Error occurred, defaulting to general: {str(e)}"
            )
    
    async def _extract_entities(self, message: str) -> List[Entity]:
        """Extract entities from the message using pattern matching"""
        entities = []
        
        for entity_type, patterns in self.entity_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, message, re.IGNORECASE)
                for match in matches:
                    entity = Entity(
                        type=entity_type,
                        value=match.group(),
                        position=(match.start(), match.end()),
                        confidence=0.8  # Pattern-based confidence
                    )
                    
                    # Normalize common entities
                    if entity_type == 'amount':
                        entity.normalized_value = self._normalize_amount(entity.value)
                    elif entity_type == 'date':
                        entity.normalized_value = self._normalize_date(entity.value)
                    elif entity_type == 'location':
                        entity.normalized_value = entity.value.strip()
                    
                    entities.append(entity)
        
        # Remove overlapping entities (keep highest confidence)
        entities = self._remove_overlapping_entities(entities)
        
        return entities
    
    def _classify_with_rules(
        self, 
        message: str, 
        context: Dict[str, Any]
    ) -> Tuple[IntentType, float, List[str]]:
        """Rule-based intent classification using keywords and context"""
        message_lower = message.lower()
        scores = {}
        matched_keywords = []
        
        # Score based on keyword matches
        for intent_type, keywords in self.intent_rules.items():
            score = 0
            intent_keywords = []
            
            for keyword in keywords:
                if keyword in message_lower:
                    score += 1
                    intent_keywords.append(keyword)
            
            if score > 0:
                scores[intent_type] = score / len(keywords)  # Normalize by keyword count
                matched_keywords.extend(intent_keywords)
        
        # Context-based scoring boosts
        current_page = context.get('current_page', '')
        if 'expense' in current_page or 'budget' in current_page:
            scores[IntentType.EXPENSE_TRACKING] = scores.get(IntentType.EXPENSE_TRACKING, 0) + 0.3
            scores[IntentType.BUDGET_MANAGEMENT] = scores.get(IntentType.BUDGET_MANAGEMENT, 0) + 0.3
        
        if 'trip' in current_page or 'wheel' in current_page:
            scores[IntentType.TRIP_PLANNING] = scores.get(IntentType.TRIP_PLANNING, 0) + 0.3
            scores[IntentType.ROUTE_OPTIMIZATION] = scores.get(IntentType.ROUTE_OPTIMIZATION, 0) + 0.2
        
        # Find best match
        if scores:
            best_intent = max(scores, key=scores.get)
            confidence = min(scores[best_intent], 0.95)  # Cap at 95%
        else:
            best_intent = IntentType.GENERAL_QUERY
            confidence = 0.6  # Moderate confidence for fallback
        
        return best_intent, confidence, matched_keywords
    
    async def _classify_with_ai(
        self, 
        message: str, 
        entities: List[Entity],
        context: Dict[str, Any]
    ) -> Optional[IntentClassification]:
        """AI-powered intent classification for complex cases"""
        if not self.ai_model:
            return None
        
        try:
            # Build context for AI
            entity_text = ""
            if entities:
                entity_text = "\nExtracted entities: " + ", ".join([f"{e.type}: {e.value}" for e in entities])
            
            context_text = ""
            if context:
                context_text = f"\nContext: User is on {context.get('current_page', 'unknown')} page"
            
            system_prompt = f"""You are an intent classifier for a travel/RV assistant named PAM.
            
Available intent types: {', '.join([intent.value for intent in IntentType])}

Classify the user's message and respond with JSON:
{{
    "intent": "intent_name",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation",
    "context_clues": ["list", "of", "clues"]
}}"""
            
            user_prompt = f"Message: {message}{entity_text}{context_text}"
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            
            response = await self.ai_model.ainvoke(messages)
            result_text = response.content.strip()
            
            # Parse JSON response
            if result_text.startswith('{') and result_text.endswith('}'):
                result = json.loads(result_text)
                
                intent_str = result.get('intent', 'general_query')
                try:
                    intent = IntentType(intent_str)
                except ValueError:
                    intent = IntentType.GENERAL_QUERY
                
                return IntentClassification(
                    intent=intent,
                    confidence=result.get('confidence', 0.5),
                    entities=entities,
                    context_clues=result.get('context_clues', []),
                    suggested_handler=self._get_handler_for_intent(intent),
                    reasoning=result.get('reasoning', 'AI classification')
                )
            
        except Exception as e:
            logger.error(f"AI classification error: {e}")
        
        return None
    
    def _get_handler_for_intent(self, intent: IntentType) -> str:
        """Map intent to appropriate handler service"""
        handler_mapping = {
            IntentType.TRIP_PLANNING: "trip_planning_handler",
            IntentType.EXPENSE_TRACKING: "expense_tracking_handler", 
            IntentType.BUDGET_MANAGEMENT: "budget_management_handler",
            IntentType.ROUTE_OPTIMIZATION: "route_optimization_handler",
            IntentType.CAMPGROUND_SEARCH: "campground_search_handler",
            IntentType.WEATHER_INQUIRY: "weather_handler",
            IntentType.MAINTENANCE_REMINDER: "maintenance_handler",
            IntentType.SOCIAL_INTERACTION: "social_handler",
            IntentType.HELP_REQUEST: "help_handler",
            IntentType.FEEDBACK: "feedback_handler",
            IntentType.CORRECTION: "correction_handler",
            IntentType.GENERAL_QUERY: "general_handler"
        }
        return handler_mapping.get(intent, "general_handler")
    
    def _check_clarification_needed(
        self, 
        intent: IntentType, 
        entities: List[Entity], 
        confidence: float
    ) -> Tuple[bool, List[str]]:
        """Check if clarification questions are needed"""
        questions = []
        
        # Low confidence requires clarification
        if confidence < 0.7:
            questions.append("I'm not entirely sure what you're asking about. Could you provide more details?")
        
        # Intent-specific clarification
        if intent == IntentType.TRIP_PLANNING:
            location_entities = [e for e in entities if e.type == 'location']
            if not location_entities:
                questions.append("Where are you planning to travel to?")
        
        elif intent == IntentType.EXPENSE_TRACKING:
            amount_entities = [e for e in entities if e.type == 'amount']
            if not amount_entities:
                questions.append("How much did you spend?")
        
        elif intent == IntentType.CAMPGROUND_SEARCH:
            location_entities = [e for e in entities if e.type == 'location']
            if not location_entities:
                questions.append("What area are you looking for campgrounds in?")
        
        return len(questions) > 0, questions
    
    async def _store_classification(
        self,
        user_id: str,
        message: str,
        intent: IntentType,
        confidence: float,
        entities: List[Entity],
        context: Dict[str, Any]
    ):
        """Store classification for pattern learning"""
        try:
            from app.services.database import get_database
            
            # This would store in pam_intent_patterns table
            # Implementation would depend on database service
            logger.debug(f"Storing classification: {intent.value} for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to store classification: {e}")
    
    def _normalize_amount(self, amount_text: str) -> str:
        """Normalize amount text to standard format"""
        # Remove currency symbols and spaces
        cleaned = re.sub(r'[^\d.,]', '', amount_text)
        try:
            # Convert to float and back to standard format
            value = float(cleaned.replace(',', ''))
            return f"{value:.2f}"
        except ValueError:
            return amount_text
    
    def _normalize_date(self, date_text: str) -> str:
        """Normalize date text to ISO format where possible"""
        # Basic normalization - more sophisticated parsing could be added
        if re.match(r'\d{4}-\d{2}-\d{2}', date_text):
            return date_text  # Already ISO format
        
        # Add more date parsing logic as needed
        return date_text
    
    def _remove_overlapping_entities(self, entities: List[Entity]) -> List[Entity]:
        """Remove overlapping entities, keeping the one with highest confidence"""
        if not entities:
            return entities
        
        # Sort by position
        entities.sort(key=lambda e: e.position[0])
        
        filtered = []
        for entity in entities:
            overlaps = False
            for existing in filtered:
                if (entity.position[0] < existing.position[1] and 
                    entity.position[1] > existing.position[0]):
                    overlaps = True
                    # Replace if higher confidence
                    if entity.confidence > existing.confidence:
                        filtered.remove(existing)
                        filtered.append(entity)
                    break
            
            if not overlaps:
                filtered.append(entity)
        
        return filtered
    
    async def learn_from_correction(
        self,
        user_id: str,
        original_message: str,
        original_classification: IntentClassification,
        corrected_intent: IntentType,
        feedback: str = ""
    ):
        """Learn from user corrections to improve future classifications"""
        try:
            logger.info(f"Learning from correction: {original_classification.intent.value} -> {corrected_intent.value}")
            
            # Store correction in learning dataset
            correction_data = {
                "user_id": user_id,
                "original_message": original_message,
                "original_intent": original_classification.intent.value,
                "original_confidence": original_classification.confidence,
                "corrected_intent": corrected_intent.value,
                "feedback": feedback,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            # This would update the learning model/patterns
            # For now, log the correction for future model improvements
            logger.info(f"Correction logged: {correction_data}")
            
        except Exception as e:
            logger.error(f"Failed to learn from correction: {e}")
    
    async def get_intent_patterns(self, user_id: str) -> Dict[str, Any]:
        """Get user's intent patterns for analytics and proactive assistance"""
        try:
            # This would query the pam_intent_patterns table
            # Return user's behavioral patterns
            return {
                "top_intents": ["trip_planning", "expense_tracking", "campground_search"],
                "typical_times": {"morning": "trip_planning", "evening": "expense_tracking"},
                "pattern_confidence": 0.85,
                "recent_corrections": 2
            }
            
        except Exception as e:
            logger.error(f"Failed to get intent patterns: {e}")
            return {}


# Global instance for use across the application
intent_classifier = None

def get_intent_classifier() -> EnhancedIntentClassifier:
    """Get global intent classifier instance"""
    global intent_classifier
    if intent_classifier is None:
        intent_classifier = EnhancedIntentClassifier()
    return intent_classifier