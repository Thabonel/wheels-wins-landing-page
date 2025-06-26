# app/core/orchestrator.py
from typing import Dict, List, Any, Optional
from enum import Enum
import json
import re
import logging
from datetime import datetime, timedelta
from app.core.config import settings
from app.nodes.wins_node import wins_node
from app.nodes.wheels_node import wheels_node
from app.nodes.social_node import social_node
from app.nodes.you_node import you_node
from app.nodes.memory_node import MemoryNode
from app.core.intelligent_conversation import IntelligentConversationHandler

# Import the enhanced route intelligence
from app.core.route_intelligence import route_intelligence

# Import the scraping function
try:
    from scraper_service.main import fetch_and_parse
    SCRAPER_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Scraper service not available: {e}")
    SCRAPER_AVAILABLE = False

logger = logging.getLogger("pam")

class EntityExtractor:
    """Extracts entities from user messages for better intent classification"""
    
    def __init__(self):
        # Location patterns
        self.location_patterns = {
            'from_to': r'(?:from\s+)([a-zA-Z\s]+?)(?:\s+to\s+)([a-zA-Z\s]+)',
            'city_names': r'\b(brisbane|sydney|melbourne|perth|adelaide|darwin|cairns|townsville|gold coast|sunshine coast|byron bay|port douglas|alice springs|broome|margaret river|hunter valley)\b',
            'state_names': r'\b(queensland|qld|new south wales|nsw|victoria|vic|south australia|sa|western australia|wa|tasmania|tas|northern territory|nt|act)\b',
            'generic_location': r'(?:in|at|near|around)\s+([a-zA-Z\s]+)',
            'postcode': r'\b(\d{4})\b'
        }
        
        # Budget patterns
        self.budget_patterns = {
            'exact_amount': r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)',
            'under_amount': r'(?:under|less than|below)\s*\$?(\d+(?:,\d{3})*)',
            'over_amount': r'(?:over|more than|above)\s*\$?(\d+(?:,\d{3})*)',
            'range': r'\$?(\d+)(?:\s*(?:to|-)\s*)\$?(\d+)',
            'budget_keywords': r'(?:budget|spend|cost|price|afford|cheap|expensive)'
        }
        
        # Time patterns
        self.time_patterns = {
            'specific_date': r'(?:on\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:\s+\d{4})?)',
            'relative_days': r'(?:in\s+)?(\d+)\s+days?',
            'relative_weeks': r'(?:in\s+)?(\d+)\s+weeks?',
            'relative_months': r'(?:in\s+)?(\d+)\s+months?',
            'next_period': r'next\s+(week|month|year|weekend)',
            'this_period': r'this\s+(week|month|year|weekend)',
            'soon': r'\b(soon|asap|quickly|urgent|immediately)\b',
            'timeframe_keywords': r'\b(today|tomorrow|yesterday|tonight|morning|afternoon|evening)\b'
        }
        
        # Vehicle patterns
        self.vehicle_patterns = {
            'vehicle_types': r'\b(caravan|motorhome|rv|camper\s*trailer|fifth\s*wheeler|pop\s*top|tent|van|truck|car)\b',
            'possessive_vehicle': r'(?:my|our|the)\s+(caravan|motorhome|rv|camper|van|truck|car)',
            'vehicle_brands': r'\b(jayco|winnebago|roadstar|coromal|crusader|nova|goldstream|retreat|leader|bushtracker|trackvan)\b',
            'vehicle_concerns': r'\b(breakdown|repair|service|maintenance|fuel|diesel|petrol|battery|tyres|engine|transmission)\b'
        }

    def extract_entities(self, message: str) -> Dict[str, Any]:
        """Extract all entities from a message"""
        message_lower = message.lower()
        entities = {
            'locations': self._extract_locations(message, message_lower),
            'budget': self._extract_budget(message, message_lower),
            'timeframe': self._extract_timeframe(message, message_lower),
            'vehicle': self._extract_vehicle(message, message_lower),
            'has_entities': False
        }
        
        # Check if any entities were found
        entities['has_entities'] = any(
            entities[category] for category in ['locations', 'budget', 'timeframe', 'vehicle']
            if isinstance(entities[category], (list, dict)) and entities[category]
        )
        
        return entities

    def _extract_locations(self, message: str, message_lower: str) -> Dict[str, Any]:
        """Extract location entities"""
        locations = {
            'origin': None,
            'destination': None,
            'mentioned_places': [],
            'has_travel_route': False
        }
        
        # Extract from-to pattern
        from_to_match = re.search(self.location_patterns['from_to'], message_lower, re.IGNORECASE)
        if from_to_match:
            locations['origin'] = from_to_match.group(1).strip().title()
            locations['destination'] = from_to_match.group(2).strip().title()
            locations['has_travel_route'] = True
        
        # Extract city names
        city_matches = re.findall(self.location_patterns['city_names'], message_lower, re.IGNORECASE)
        locations['mentioned_places'].extend([city.title() for city in city_matches])
        
        # Extract state names
        state_matches = re.findall(self.location_patterns['state_names'], message_lower, re.IGNORECASE)
        locations['mentioned_places'].extend([state.title() for state in state_matches])
        
        # Extract generic location references
        generic_matches = re.findall(self.location_patterns['generic_location'], message_lower, re.IGNORECASE)
        locations['mentioned_places'].extend([loc.strip().title() for loc in generic_matches])
        
        # Remove duplicates
        locations['mentioned_places'] = list(set(locations['mentioned_places']))
        
        return locations

    def _extract_budget(self, message: str, message_lower: str) -> Dict[str, Any]:
        """Extract budget entities"""
        budget = {
            'exact_amounts': [],
            'constraints': {},
            'has_budget_mention': False
        }
        
        # Check for budget keywords
        if re.search(self.budget_patterns['budget_keywords'], message_lower):
            budget['has_budget_mention'] = True
        
        # Extract exact amounts
        exact_matches = re.findall(self.budget_patterns['exact_amount'], message_lower)
        budget['exact_amounts'] = [float(amount.replace(',', '')) for amount in exact_matches]
        
        # Extract under/over constraints
        under_match = re.search(self.budget_patterns['under_amount'], message_lower)
        if under_match:
            budget['constraints']['max'] = float(under_match.group(1).replace(',', ''))
        
        over_match = re.search(self.budget_patterns['over_amount'], message_lower)
        if over_match:
            budget['constraints']['min'] = float(over_match.group(1).replace(',', ''))
        
        # Extract range
        range_match = re.search(self.budget_patterns['range'], message_lower)
        if range_match:
            budget['constraints']['min'] = float(range_match.group(1))
            budget['constraints']['max'] = float(range_match.group(2))
        
        return budget

    def _extract_timeframe(self, message: str, message_lower: str) -> Dict[str, Any]:
        """Extract timeframe entities"""
        timeframe = {
            'specific_dates': [],
            'relative_time': {},
            'urgency': None,
            'has_time_constraint': False
        }
        
        # Extract specific dates
        date_matches = re.findall(self.time_patterns['specific_date'], message_lower, re.IGNORECASE)
        timeframe['specific_dates'] = date_matches
        
        # Extract relative time
        days_match = re.search(self.time_patterns['relative_days'], message_lower)
        if days_match:
            timeframe['relative_time']['days'] = int(days_match.group(1))
            timeframe['has_time_constraint'] = True
        
        weeks_match = re.search(self.time_patterns['relative_weeks'], message_lower)
        if weeks_match:
            timeframe['relative_time']['weeks'] = int(weeks_match.group(1))
            timeframe['has_time_constraint'] = True
        
        # Extract next/this periods
        next_match = re.search(self.time_patterns['next_period'], message_lower)
        if next_match:
            timeframe['relative_time']['next'] = next_match.group(1)
            timeframe['has_time_constraint'] = True
        
        this_match = re.search(self.time_patterns['this_period'], message_lower)
        if this_match:
            timeframe['relative_time']['this'] = this_match.group(1)
            timeframe['has_time_constraint'] = True
        
        # Extract urgency
        if re.search(self.time_patterns['soon'], message_lower):
            timeframe['urgency'] = 'high'
            timeframe['has_time_constraint'] = True
        
        # Extract general timeframe keywords
        timeframe_matches = re.findall(self.time_patterns['timeframe_keywords'], message_lower)
        if timeframe_matches:
            timeframe['keywords'] = timeframe_matches
            timeframe['has_time_constraint'] = True
        
        return timeframe

    def _extract_vehicle(self, message: str, message_lower: str) -> Dict[str, Any]:
        """Extract vehicle entities"""
        vehicle = {
            'types_mentioned': [],
            'brands_mentioned': [],
            'concerns': [],
            'is_personal': False,
            'has_vehicle_context': False
        }
        
        # Extract vehicle types
        type_matches = re.findall(self.vehicle_patterns['vehicle_types'], message_lower, re.IGNORECASE)
        vehicle['types_mentioned'] = list(set(type_matches))
        
        # Check for possessive (my/our vehicle)
        possessive_match = re.search(self.vehicle_patterns['possessive_vehicle'], message_lower)
        if possessive_match:
            vehicle['is_personal'] = True
            vehicle['has_vehicle_context'] = True
        
        # Extract vehicle brands
        brand_matches = re.findall(self.vehicle_patterns['vehicle_brands'], message_lower, re.IGNORECASE)
        vehicle['brands_mentioned'] = list(set(brand_matches))
        
        # Extract vehicle concerns
        concern_matches = re.findall(self.vehicle_patterns['vehicle_concerns'], message_lower, re.IGNORECASE)
        vehicle['concerns'] = list(set(concern_matches))
        
        # Set has_vehicle_context if any vehicle info found
        if any([vehicle['types_mentioned'], vehicle['brands_mentioned'], vehicle['concerns'], vehicle['is_personal']]):
            vehicle['has_vehicle_context'] = True
        
        return vehicle

class ActionPlanner:
    def __init__(self):
        self.memory_node = MemoryNode()
        self.intelligent_handler = IntelligentConversationHandler()
        self.entity_extractor = EntityExtractor()
        
    def classify_intent_with_entities(self, message: str, entities: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Enhanced intent classification using extracted entities"""
        message_lower = message.lower()
        
        # Initialize intent classification
        intent_scores = {
            'wheels': 0.0,
            'wins': 0.0,
            'social': 0.0,
            'you': 0.0,
            'general': 0.1  # Base score for general
        }
        
        primary_entities = []
        confidence_factors = []
        
        # Location-based classification
        locations = entities.get('locations', {})
        if locations.get('has_travel_route') or locations.get('mentioned_places'):
            intent_scores['wheels'] += 0.8
            primary_entities.append('travel_planning')
            confidence_factors.append('travel_route_detected')
            
        # Budget-based classification
        budget = entities.get('budget', {})
        if budget.get('has_budget_mention') or budget.get('exact_amounts'):
            intent_scores['wins'] += 0.6
            primary_entities.append('budget_management')
            confidence_factors.append('budget_mention')
            
        # Time-based classification
        timeframe = entities.get('timeframe', {})
        if timeframe.get('has_time_constraint'):
            # Time constraints often relate to travel planning
            intent_scores['wheels'] += 0.4
            intent_scores['you'] += 0.3  # Could be calendar/scheduling
            primary_entities.append('time_sensitive')
            confidence_factors.append('time_constraint')
            
        # Vehicle-based classification
        vehicle = entities.get('vehicle', {})
        if vehicle.get('has_vehicle_context'):
            intent_scores['wheels'] += 0.7
            primary_entities.append('vehicle_related')
            confidence_factors.append('vehicle_context')
        
        # Keyword-based classification (enhanced)
        wheels_keywords = [
            'trip', 'travel', 'drive', 'route', 'fuel', 'camping', 'caravan park',
            'highway', 'road', 'distance', 'navigation', 'maintenance', 'service'
        ]
        wins_keywords = [
            'money', 'budget', 'cost', 'save', 'expense', 'income', 'spending',
            'financial', 'bank', 'credit', 'debt', 'investment'
        ]
        social_keywords = [
            'group', 'community', 'friend', 'share', 'post', 'marketplace',
            'buy', 'sell', 'connect', 'message', 'chat'
        ]
        you_keywords = [
            'profile', 'setting', 'preference', 'calendar', 'schedule',
            'reminder', 'personal', 'dashboard'
        ]
        
        # Score based on keyword matches
        for keyword in wheels_keywords:
            if keyword in message_lower:
                intent_scores['wheels'] += 0.2
                
        for keyword in wins_keywords:
            if keyword in message_lower:
                intent_scores['wins'] += 0.2
                
        for keyword in social_keywords:
            if keyword in message_lower:
                intent_scores['social'] += 0.2
                
        for keyword in you_keywords:
            if keyword in message_lower:
                intent_scores['you'] += 0.2
        
        # Determine primary intent
        primary_intent = max(intent_scores.items(), key=lambda x: x[1])
        confidence = min(primary_intent[1], 1.0)  # Cap at 1.0
        
        # Adjust confidence based on entity clarity
        if len(primary_entities) > 1:
            confidence *= 0.9  # Slightly reduce if multiple entity types
        elif len(primary_entities) == 1:
            confidence *= 1.1  # Boost if clear single entity type
            
        return {
            'domain': primary_intent[0],
            'confidence': confidence,
            'all_scores': intent_scores,
            'primary_entities': primary_entities,
            'confidence_factors': confidence_factors,
            'entities_detected': entities
        }
    
    def route_to_node(self, intent_data: Dict[str, Any], message: str, context: Dict[str, Any]) -> str:
        """Route to appropriate node based on intent and entities"""
        domain = intent_data.get('domain', 'general')
        entities = intent_data.get('entities_detected', {})
        
        # Special routing based on entities
        locations = entities.get('locations', {})
        if locations.get('has_travel_route'):
            return 'wheels'  # Force wheels for travel routes
            
        vehicle = entities.get('vehicle', {})
        if vehicle.get('concerns') and any(concern in ['repair', 'service', 'maintenance'] for concern in vehicle['concerns']):
            return 'wheels'  # Force wheels for vehicle maintenance
            
        budget = entities.get('budget', {})
        if budget.get('exact_amounts') or budget.get('constraints'):
            return 'wins'  # Force wins for specific budget amounts
        
        # Default to classified domain
        return domain

    async def plan(self, message: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Enhanced conversation planning with entity extraction and intent classification"""
        user_id = context.get("user_id")
        session_id = context.get("session_id")
        
        # Log full context received in orchestrator
        logger.info(f"🧠 Orchestrator received context: {json.dumps(context, indent=2)}")
        logger.info(f"🎯 Processing message: '{message}' for user: {user_id}")
        
        # Extract entities from the message
        entities = self.entity_extractor.extract_entities(message)
        logger.info(f"🔍 Extracted entities: {json.dumps(entities, indent=2)}")
        
        # Get conversation context from memory
        if user_id:
            enhanced_context = await self.memory_node.get_enhanced_context(user_id, message, session_id)
            context.update(enhanced_context)
            
            # Extract profile data from conversation
            await self.memory_node.extract_profile_data(user_id, message)
            
            logger.info(f"🧩 Enhanced context with memory")
        
        # Classify intent using entities
        intent_data = self.classify_intent_with_entities(message, entities, context)
        logger.info(f"🎯 Intent classification: {json.dumps(intent_data, indent=2)}")
        
        # Route to appropriate node
        target_node = self.route_to_node(intent_data, message, context)
        logger.info(f"🚀 Routing to node: {target_node}")
        
        # Add entities to context for node processing
        enhanced_context = {
            **context,
            'entities': entities,
            'intent_classification': intent_data,
            'target_node': target_node
        }
        
        try:
            # Use both intelligent conversation analysis and entity-based routing
            if target_node != 'general':
                # Route to specific node based on entities
                if target_node == 'wheels':
                    node_instance = wheels_node
                elif target_node == 'wins':
                    node_instance = wins_node
                elif target_node == 'social':
                    node_instance = social_node
                elif target_node == 'you':
                    node_instance = you_node
                else:
                    # Fallback to intelligent handler
                    analysis = await self.intelligent_handler.analyze_conversation(
                        current_message=message,
                        conversation_history=enhanced_context.get("conversation_history", []),
                        user_profile=enhanced_context.get("user_profile", {})
                    )
                    
                    ai_response = analysis.get("response", {})
                    result = {
                        "type": ai_response.get("type", "message"),
                        "content": ai_response.get("content", "I'm here to help! How can I assist you today?"),
                        "suggested_actions": ai_response.get("suggested_actions", [])
                    }
                    
                    # Store interaction
                    if user_id:
                        await self.memory_node.store_interaction(
                            user_id=user_id,
                            user_message=message,
                            pam_response=result.get("content", ""),
                            session_id=session_id or "default_session",
                            intent=intent_data.get('domain', 'general'),
                            intent_confidence=intent_data.get('confidence', 0.5),
                            context_used=enhanced_context,
                            node_used="intelligent_handler"
                        )
                    
                    return [result]
                
                # Process with specific node
                try:
                    if hasattr(node_instance, 'process'):
                        node_result = await node_instance.process(message, enhanced_context)
                    else:
                        # Fallback for nodes without process method
                        node_result = {
                            "type": "message",
                            "content": f"I understand you're asking about {target_node}. Let me help you with that!"
                        }
                    
                    # Store interaction
                    if user_id:
                        await self.memory_node.store_interaction(
                            user_id=user_id,
                            user_message=message,
                            pam_response=node_result.get("content", ""),
                            session_id=session_id or "default_session",
                            intent=intent_data.get('domain', 'general'),
                            intent_confidence=intent_data.get('confidence', 0.5),
                            context_used=enhanced_context,
                            node_used=target_node
                        )
                    
                    return [node_result]
                    
                except Exception as node_error:
                    logger.error(f"❌ Error in {target_node} node: {str(node_error)}")
                    # Fallback to intelligent handler
                    pass
            
            # Fallback to intelligent conversation analysis
            analysis = await self.intelligent_handler.analyze_conversation(
                current_message=message,
                conversation_history=enhanced_context.get("conversation_history", []),
                user_profile=enhanced_context.get("user_profile", {})
            )
            
            ai_response = analysis.get("response", {})
            result = {
                "type": ai_response.get("type", "message"),
                "content": ai_response.get("content", "I'm here to help! How can I assist you today?"),
                "suggested_actions": ai_response.get("suggested_actions", []),
                "entities": entities,  # Include entities in response
                "intent_info": intent_data  # Include intent classification info
            }
            
            # Store interaction in memory
            if user_id:
                await self.memory_node.store_interaction(
                    user_id=user_id,
                    user_message=message,
                    pam_response=result.get("content", ""),
                    session_id=session_id or "default_session",
                    intent=intent_data.get('domain', 'general'),
                    intent_confidence=intent_data.get('confidence', 0.5),
                    context_used=enhanced_context,
                    node_used="intelligent_handler"
                )
            
            return [result]
            
        except Exception as e:
            logger.error(f"❌ Error in enhanced planning: {str(e)}")
            # Fallback to simple response with entity info
            fallback_content = "I'm here to help with your travel planning, budgeting, and social connections."
            
            # Add entity-specific guidance
            if entities.get('locations', {}).get('has_travel_route'):
                fallback_content += " I noticed you mentioned travel locations - I can help plan your route!"
            elif entities.get('budget', {}).get('has_budget_mention'):
                fallback_content += " I see you're thinking about budget - I can help track expenses and savings!"
            elif entities.get('vehicle', {}).get('has_vehicle_context'):
                fallback_content += " I noticed you mentioned your vehicle - I can help with maintenance and travel planning!"
                
            return [{
                "type": "message",
                "content": fallback_content,
                "entities": entities,
                "error": str(e)
            }]

# Create global orchestrator instance
orchestrator = ActionPlanner()
