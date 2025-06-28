# app/nodes/memory_node.py
"""
PAM Memory Node - Conversation Memory and Context Management
Integrates with existing pam_memory table to provide context retention
"""

import json
import uuid
import re
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

from app.database.supabase_client import get_supabase

class MemoryNode:
    """Manages conversation memory and context for PAM"""
    
    def __init__(self):
        self.supabase = get_supabase()
        
        # Profile extraction patterns
        self.vehicle_patterns = {
            'type': r'(?:drive|driving|have|own|use)\s+(?:a\s+)?(\w+(?:\s+\w+)?)\s*(?:caravan|motorhome|rv|camper|trailer|van)',
            'make_model': r'(?:it\'s\s+a\s+|drive\s+a\s+|have\s+a\s+)?(\w+\s+\w+(?:\s+\d{4})?)',
            'fuel_type': r'(?:runs\s+on\s+|uses\s+|fuel\s+type\s+is\s+)?(diesel|petrol|gas|lpg|electric)',
            'fuel_efficiency': r'(\d+(?:\.\d+)?)\s*(?:l|litres?|liters?)\s*(?:per\s+)?(?:100\s*)?(?:km|kilometers?)'
        }
        
        self.travel_patterns = {
            'style': r'(?:travel\s+|like\s+to\s+travel\s+|prefer\s+)?(budget|luxury|comfort|basic|simple|fancy|expensive|cheap)',
            'camp_types': r'(?:stay\s+at\s+|prefer\s+|like\s+)?(free\s+camps?|caravan\s+parks?|national\s+parks?|powered\s+sites?|unpowered\s+sites?)',
            'drive_limit': r'(?:drive\s+|travel\s+)?(?:up\s+to\s+|about\s+|around\s+)?(\d+)\s*(?:km|kilometers?|k)(?:\s+(?:per\s+)?day)?'
        }
        
        self.budget_patterns = {
            'daily_budget': r'(?:budget\s+is\s+|spend\s+|can\s+afford\s+)?(?:\$)?(\d+)\s*(?:per\s+day|daily|a\s+day)',
            'fuel_budget': r'(?:fuel\s+budget\s+|spend\s+on\s+fuel\s+)?(?:\$)?(\d+)\s*(?:per\s+week|weekly|week)',
            'total_budget': r'(?:total\s+budget\s+|overall\s+budget\s+)?(?:\$)?(\d+)\s*(?:per\s+week|weekly|week|month|monthly)'
        }
        
    async def store_interaction(
        self, 
        user_id: str, 
        user_message: str, 
        pam_response: str,
        session_id: str,
        intent: str = None,
        intent_confidence: float = None,
        context_used: Dict = None,
        node_used: str = None,
        response_time_ms: int = None
    ) -> str:
        """Store a complete interaction in pam_memory table"""
        try:
            # Create memory record using existing pam_memory table structure
            memory_data = {
                "user_id": user_id,
                "session_id": session_id,
                "message": user_message,  # User's message
                "original_message": user_message,
                "response": pam_response,  # PAM's response
                "content": f"User: {user_message}\nPAM: {pam_response}",  # Combined for N8N compatibility
                "intent": intent,
                "intent_confidence": str(intent_confidence) if intent_confidence else None,
                "timestamp": datetime.utcnow().isoformat(),
                "context": {
                    "node_used": node_used,
                    "context_used": context_used or {},
                    "response_time_ms": response_time_ms,
                    "memory_enabled": True
                },
                "validation_passed": True,
                "response_quality": "standard",
                "response_source": "fastapi_backend"
            }
            
            result = self.supabase.table("pam_memory").insert(memory_data).execute()
            
            if result.data:
                print(f"✅ Memory stored for user {user_id}, session {session_id}")
                return result.data[0]["id"]
            else:
                print(f"❌ Failed to store memory: {result}")
                return None
                
        except Exception as e:
            print(f"❌ Error storing memory: {str(e)}")
            return None

    async def get_conversation_context(
        self, 
        user_id: str, 
        session_id: str = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """Get recent conversation context for a user"""
        try:
            query = self.supabase.table("pam_memory").select("*").eq("user_id", user_id)
            
            if session_id:
                query = query.eq("session_id", session_id)
            
            # Get recent messages ordered by timestamp
            result = query.order("timestamp", desc=True).limit(limit).execute()
            
            if not result.data:
                return {"messages": [], "context": {}, "session_id": session_id}
            
            messages = []
            combined_context = {}
            last_intent = None
            
            # Process messages in chronological order (reverse the desc order)
            for record in reversed(result.data):
                # Add user message
                if record.get("message"):
                    messages.append({
                        "role": "user",
                        "content": record["message"],
                        "timestamp": record["timestamp"]
                    })
                
                # Add PAM response
                if record.get("response"):
                    messages.append({
                        "role": "assistant", 
                        "content": record["response"],
                        "timestamp": record["timestamp"],
                        "intent": record.get("intent"),
                        "node_used": record.get("context", {}).get("node_used")
                    })
                
                # Accumulate context
                if record.get("context"):
                    combined_context.update(record["context"])
                
                # Track last intent for context continuity
                if record.get("intent"):
                    last_intent = record["intent"]
            
            print(f"✅ Retrieved {len(messages)} messages for user {user_id}")
            
            return {
                "messages": messages,
                "context": combined_context,
                "last_intent": last_intent,
                "session_id": session_id or result.data[0].get("session_id"),
                "message_count": len(messages)
            }
            
        except Exception as e:
            print(f"❌ Error retrieving context: {str(e)}")
            return {"messages": [], "context": {}, "session_id": session_id}

    async def get_user_profile_context(self, user_id: str) -> Dict[str, Any]:
        """Get user profile data for context"""
        try:
            # Get from profiles table (your existing user profile structure)
            result = self.supabase.table("profiles").select("*").eq("user_id", user_id).execute()
            
            if not result.data:
                print(f"⚠️ No profile found for user {user_id}")
                return {}
            
            profile = result.data[0]
            
            # Extract relevant context data
            context = {
                "vehicle_info": {
                    "type": profile.get("vehicle_type"),
                    "make_model": profile.get("vehicle_make_model"),
                    "fuel_type": profile.get("fuel_type"),
                    "towing": profile.get("towing"),
                    "second_vehicle": profile.get("second_vehicle")
                },
                "travel_preferences": {
                    "style": profile.get("travel_style"),
                    "max_driving": profile.get("max_driving"),
                    "camp_types": profile.get("camp_types"),
                    "accessibility": profile.get("accessibility"),
                    "pets": profile.get("pets"),
                    "budget_range": profile.get("budget_range")
                },
                "location_data": {
                    "current_latitude": float(profile["current_latitude"]) if profile.get("current_latitude") else None,
                    "current_longitude": float(profile["current_longitude"]) if profile.get("current_longitude") else None,
                    "destination_latitude": float(profile["destination_latitude"]) if profile.get("destination_latitude") else None,
                    "destination_longitude": float(profile["destination_longitude"]) if profile.get("destination_longitude") else None,
                    "travel_radius_miles": profile.get("travel_radius_miles", 50)
                },
                "personal_info": {
                    "nickname": profile.get("nickname"),
                    "region": profile.get("region"),
                    "accessibility_needs": profile.get("accessibility_needs", [])
                }
            }
            
            print(f"✅ Retrieved profile context for user {user_id}")
            return context
            
        except Exception as e:
            print(f"❌ Error retrieving profile context: {str(e)}")
            return {}

    async def get_enhanced_context(
        self, 
        user_id: str, 
        current_message: str,
        session_id: str = None
    ) -> Dict[str, Any]:
        """Get comprehensive context including conversation history and user profile"""
        try:
            # Get conversation context
            conversation_context = await self.get_conversation_context(user_id, session_id)
            
            # Get user profile context  
            profile_context = await self.get_user_profile_context(user_id)
            
            # Analyze current message for context clues
            message_context = self._analyze_message_context(current_message, conversation_context)
            
            # Create comprehensive context
            enhanced_context = {
                "user_id": user_id,
                "session_id": conversation_context.get("session_id"),
                "current_message": current_message,
                "conversation_history": conversation_context["messages"],
                "last_intent": conversation_context.get("last_intent"),
                "message_count": conversation_context.get("message_count", 0),
                "user_profile": profile_context,
                "message_analysis": message_context,
                "context_timestamp": datetime.utcnow().isoformat()
            }
            
            print(f"✅ Created enhanced context for user {user_id} with {len(conversation_context['messages'])} messages")
            return enhanced_context
            
        except Exception as e:
            print(f"❌ Error creating enhanced context: {str(e)}")
            return {"user_id": user_id, "session_id": session_id, "current_message": current_message}

    def _analyze_message_context(self, message: str, conversation_context: Dict) -> Dict[str, Any]:
        """Analyze current message for context and intent hints"""
        message_lower = message.lower()
        
        # Detect location references
        location_indicators = ["from", "to", "near", "around", "in", "at"]
        has_location_reference = any(indicator in message_lower for indicator in location_indicators)
        
        # Detect continuation phrases
        continuation_phrases = ["then", "next", "after that", "also", "and", "but"]
        is_continuation = any(phrase in message_lower for phrase in continuation_phrases)
        
        # Detect question vs statement
        is_question = message.strip().endswith("?") or any(
            message_lower.startswith(q) for q in ["what", "how", "where", "when", "why", "can", "do", "is", "are", "will"]
        )
        
        # Check for reference to previous conversation
        last_messages = conversation_context.get("messages", [])[-3:]  # Last 3 messages
        has_context_reference = any(
            word in message_lower for word in ["that", "this", "it", "there", "here"]
        ) and len(last_messages) > 0
        
        return {
            "has_location_reference": has_location_reference,
            "is_continuation": is_continuation,
            "is_question": is_question,
            "has_context_reference": has_context_reference,
            "message_length": len(message),
            "likely_needs_context": has_context_reference or is_continuation
        }

    async def save_interaction(
        self,
        user_id: str,
        user_message: str,
        pam_response: str,
        session_id: str,
        intent: str = None,
        intent_confidence: float = None,
        context_used: Dict = None,
        node_used: str = None
    ) -> bool:
        """Store a conversation interaction in pam_conversation_memory table"""
        try:
            # Get the next message sequence number for this session
            sequence_result = self.supabase.table("pam_conversation_memory")\
                .select("message_sequence")\
                .eq("user_id", user_id)\
                .eq("session_id", session_id)\
                .order("message_sequence", desc=True)\
                .limit(1)\
                .execute()
            
            next_sequence = 1
            if sequence_result.data:
                next_sequence = sequence_result.data[0]["message_sequence"] + 1
            
            # Store interaction in pam_conversation_memory table
            interaction_data = {
                "user_id": user_id,
                "session_id": session_id,
                "message_sequence": next_sequence,
                "user_message": user_message,
                "pam_response": pam_response,
                "detected_intent": intent,
                "intent_confidence": intent_confidence,
                "context_used": context_used or {},
                "node_used": node_used,
                "message_timestamp": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("pam_conversation_memory").insert(interaction_data).execute()
            
            if result.data:
                print(f"✅ Interaction saved to pam_conversation_memory for user {user_id}")
                return True
            else:
                print(f"❌ Failed to save interaction: {result}")
                return False
                
        except Exception as e:
            print(f"❌ Error saving interaction to pam_conversation_memory: {str(e)}")
            return False

    async def get_conversation_history(
        self,
        user_id: str,
        session_id: str = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Retrieve last N messages from pam_conversation_memory table"""
        try:
            query = self.supabase.table("pam_conversation_memory")\
                .select("*")\
                .eq("user_id", user_id)
            
            if session_id:
                query = query.eq("session_id", session_id)
            
            # Get recent messages ordered by message sequence
            result = query.order("message_sequence", desc=True).limit(limit).execute()
            
            if not result.data:
                print(f"ℹ️ No conversation history found for user {user_id}")
                return []
            
            # Convert to standard format and reverse to get chronological order
            messages = []
            for record in reversed(result.data):
                # Add user message
                messages.append({
                    "role": "user",
                    "content": record["user_message"],
                    "timestamp": record["message_timestamp"],
                    "sequence": record["message_sequence"]
                })
                
                # Add PAM response
                messages.append({
                    "role": "assistant",
                    "content": record["pam_response"],
                    "timestamp": record["message_timestamp"],
                    "sequence": record["message_sequence"],
                    "intent": record.get("detected_intent"),
                    "node_used": record.get("node_used")
                })
            
            print(f"✅ Retrieved {len(messages)} messages from conversation history for user {user_id}")
            return messages
            
        except Exception as e:
            print(f"❌ Error retrieving conversation history: {str(e)}")
            return []

    async def get_user_context(self, user_id: str) -> Dict[str, Any]:
        """Retrieve user preferences and context data"""
        try:
            # First, get user profile data
            profile_context = await self.get_user_profile_context(user_id)
            
            # Get recent conversation patterns for learned preferences
            recent_interactions = await self.get_conversation_history(user_id, limit=20)
            
            # Get any explicit user preferences from conversation memory
            preferences_query = self.supabase.table("pam_conversation_memory")\
                .select("user_preferences_learned")\
                .eq("user_id", user_id)\
                .not_.is_("user_preferences_learned", "null")\
                .order("message_timestamp", desc=True)\
                .limit(10)\
                .execute()
            
            # Combine learned preferences
            learned_preferences = {}
            if preferences_query.data:
                for record in preferences_query.data:
                    if record.get("user_preferences_learned"):
                        learned_preferences.update(record["user_preferences_learned"])
            
            # Build comprehensive user context
            user_context = {
                "user_id": user_id,
                "profile": profile_context,
                "learned_preferences": learned_preferences,
                "recent_interaction_count": len(recent_interactions),
                "last_activity": recent_interactions[0]["timestamp"] if recent_interactions else None,
                "context_retrieved_at": datetime.utcnow().isoformat()
            }
            
            print(f"✅ Retrieved user context for {user_id} with {len(learned_preferences)} learned preferences")
            return user_context
            
        except Exception as e:
            print(f"❌ Error retrieving user context: {str(e)}")
            return {
                "user_id": user_id,
                "profile": {},
                "learned_preferences": {},
                "error": str(e)
            }

    async def create_session_if_needed(self, user_id: str, session_id: str = None) -> str:
        """Create a new session ID if none provided or ensure session exists"""
        try:
            if not session_id:
                session_id = f"session_{uuid.uuid4().hex[:12]}"
                print(f"✅ Created new session {session_id} for user {user_id}")
            
            return session_id
            
        except Exception as e:
            print(f"❌ Error creating session: {str(e)}")
            return f"session_{uuid.uuid4().hex[:12]}"

    async def extract_profile_data(self, user_id: str, message: str, pam_response: str = None) -> Dict[str, Any]:
        """Extract profile information from user messages and update profile progressively"""
        try:
            message_lower = message.lower()
            extracted_data = {
                'vehicle_info': {},
                'travel_preferences': {},
                'budget_preferences': {},
                'interests': [],
                'has_updates': False
            }
            
            # Extract vehicle information
            vehicle_data = self._extract_vehicle_info(message_lower)
            if vehicle_data:
                extracted_data['vehicle_info'] = vehicle_data
                extracted_data['has_updates'] = True
                
            # Extract travel preferences
            travel_data = self._extract_travel_preferences(message_lower)
            if travel_data:
                extracted_data['travel_preferences'] = travel_data
                extracted_data['has_updates'] = True
                
            # Extract budget information
            budget_data = self._extract_budget_preferences(message_lower)
            if budget_data:
                extracted_data['budget_preferences'] = budget_data
                extracted_data['has_updates'] = True
                
            # Extract interests
            interests = self._extract_interests(message_lower)
            if interests:
                extracted_data['interests'] = interests
                extracted_data['has_updates'] = True
            
            # If we found profile data, save it
            if extracted_data['has_updates']:
                await self._update_user_profile(user_id, extracted_data)
                await self._save_learned_preferences(user_id, extracted_data, message)
                print(f"✅ Extracted and saved profile data for user {user_id}")
                
            return extracted_data
            
        except Exception as e:
            print(f"❌ Error extracting profile data: {str(e)}")
            return {'has_updates': False, 'error': str(e)}

    def _extract_vehicle_info(self, message: str) -> Dict[str, Any]:
        """Extract vehicle information from message"""
        vehicle_info = {}
        
        # Extract vehicle type
        for pattern_name, pattern in self.vehicle_patterns.items():
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                if pattern_name == 'type':
                    # Map common terms to standard types
                    vehicle_type = match.group(1).lower()
                    type_mapping = {
                        'caravan': 'caravan',
                        'motorhome': 'motorhome', 
                        'rv': 'motorhome',
                        'camper': 'camper_trailer',
                        'trailer': 'camper_trailer',
                        'van': 'motorhome'
                    }
                    vehicle_info['type'] = type_mapping.get(vehicle_type, vehicle_type)
                    
                elif pattern_name == 'make_model':
                    vehicle_info['make_model_year'] = match.group(1).title()
                    
                elif pattern_name == 'fuel_type':
                    fuel_type = match.group(1).lower()
                    vehicle_info['fuel_type'] = fuel_type
                    
                elif pattern_name == 'fuel_efficiency':
                    try:
                        efficiency = float(match.group(1))
                        vehicle_info['fuel_efficiency'] = efficiency
                    except ValueError:
                        pass
        
        return vehicle_info

    def _extract_travel_preferences(self, message: str) -> Dict[str, Any]:
        """Extract travel preferences from message"""
        travel_prefs = {}
        
        for pattern_name, pattern in self.travel_patterns.items():
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                if pattern_name == 'style':
                    style = match.group(1).lower()
                    # Map to standard styles
                    style_mapping = {
                        'budget': 'budget',
                        'cheap': 'budget',
                        'luxury': 'luxury',
                        'fancy': 'luxury',
                        'expensive': 'luxury',
                        'comfort': 'comfort',
                        'basic': 'budget',
                        'simple': 'budget'
                    }
                    travel_prefs['style'] = style_mapping.get(style, 'balanced')
                    
                elif pattern_name == 'camp_types':
                    camp_type = match.group(1).lower()
                    # Convert to array format
                    camp_mapping = {
                        'free camps': ['free_camps'],
                        'caravan parks': ['caravan_parks'],
                        'national parks': ['national_parks'],
                        'powered sites': ['powered_sites'],
                        'unpowered sites': ['unpowered_sites']
                    }
                    travel_prefs['camp_types'] = camp_mapping.get(camp_type, [camp_type.replace(' ', '_')])
                    
                elif pattern_name == 'drive_limit':
                    try:
                        distance = int(match.group(1))
                        travel_prefs['drive_limit'] = f"{distance}km"
                    except ValueError:
                        pass
        
        return travel_prefs

    def _extract_budget_preferences(self, message: str) -> Dict[str, Any]:
        """Extract budget preferences from message"""
        budget_prefs = {}
        
        for pattern_name, pattern in self.budget_patterns.items():
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                try:
                    amount = int(match.group(1))
                    if pattern_name == 'daily_budget':
                        budget_prefs['daily_budget'] = amount
                    elif pattern_name == 'fuel_budget':
                        budget_prefs['fuel_budget'] = amount
                    elif pattern_name == 'total_budget':
                        budget_prefs['total_budget'] = amount
                except ValueError:
                    pass
        
        return budget_prefs

    def _extract_interests(self, message: str) -> List[str]:
        """Extract interests from message"""
        interests = []
        
        # Common interest keywords
        interest_keywords = {
            'fishing': ['fish', 'fishing', 'angling'],
            'photography': ['photo', 'photography', 'pictures', 'camera'],
            'hiking': ['hike', 'hiking', 'walking', 'bushwalking'],
            'beach': ['beach', 'swimming', 'surfing', 'ocean'],
            'history': ['history', 'historical', 'heritage', 'museum'],
            'wildlife': ['wildlife', 'animals', 'birds', 'nature'],
            'adventure': ['adventure', 'thrill', 'exciting', '4wd', 'offroad'],
            'relaxation': ['relax', 'relaxing', 'peaceful', 'quiet'],
            'food_wine': ['food', 'wine', 'restaurant', 'dining', 'cuisine'],
            'cultural': ['culture', 'cultural', 'art', 'festival'],
            'national_parks': ['national park', 'parks', 'conservation'],
            'markets': ['market', 'markets', 'shopping', 'local goods']
        }
        
        for interest, keywords in interest_keywords.items():
            if any(keyword in message for keyword in keywords):
                interests.append(interest)
        
        return list(set(interests))  # Remove duplicates

    async def _update_user_profile(self, user_id: str, extracted_data: Dict[str, Any]) -> bool:
        """Update user profile with extracted data"""
        try:
            # Get existing profile
            existing_profile = self.supabase.table("profiles").select("*").eq("user_id", user_id).execute()
            
            updates = {}
            
            # Merge vehicle info
            if extracted_data.get('vehicle_info'):
                if existing_profile.data:
                    existing_vehicle = existing_profile.data[0].get('vehicle_info', {}) or {}
                    existing_vehicle.update(extracted_data['vehicle_info'])
                    updates['vehicle_info'] = existing_vehicle
                else:
                    updates['vehicle_info'] = extracted_data['vehicle_info']
            
            # Merge travel preferences
            if extracted_data.get('travel_preferences'):
                if existing_profile.data:
                    existing_travel = existing_profile.data[0].get('travel_preferences', {}) or {}
                    existing_travel.update(extracted_data['travel_preferences'])
                    updates['travel_preferences'] = existing_travel
                else:
                    updates['travel_preferences'] = extracted_data['travel_preferences']
            
            # Merge budget preferences
            if extracted_data.get('budget_preferences'):
                if existing_profile.data:
                    existing_budget = existing_profile.data[0].get('budget_preferences', {}) or {}
                    existing_budget.update(extracted_data['budget_preferences'])
                    updates['budget_preferences'] = existing_budget
                else:
                    updates['budget_preferences'] = extracted_data['budget_preferences']
            
            # Merge interests
            if extracted_data.get('interests'):
                if existing_profile.data:
                    existing_interests = existing_profile.data[0].get('interests', []) or []
                    new_interests = list(set(existing_interests + extracted_data['interests']))
                    updates['interests'] = new_interests
                else:
                    updates['interests'] = extracted_data['interests']
            
            # Update profile if we have changes
            if updates:
                if existing_profile.data:
                    # Update existing profile
                    result = self.supabase.table("profiles").update(updates).eq("user_id", user_id).execute()
                else:
                    # Create new profile
                    updates['user_id'] = user_id
                    result = self.supabase.table("profiles").insert(updates).execute()
                
                if result.data:
                    print(f"✅ Updated profile for user {user_id} with {len(updates)} fields")
                    return True
                    
            return False
            
        except Exception as e:
            print(f"❌ Error updating user profile: {str(e)}")
            return False

    async def _save_learned_preferences(self, user_id: str, extracted_data: Dict[str, Any], original_message: str) -> bool:
        """Save learned preferences to conversation memory for context"""
        try:
            # Find the most recent conversation record to update
            recent_record = self.supabase.table("pam_conversation_memory")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("message_timestamp", desc=True)\
                .limit(1)\
                .execute()
            
            if recent_record.data:
                # Update the recent record with learned preferences
                learned_prefs = {
                    'profile_updates': extracted_data,
                    'learned_from_message': original_message,
                    'learned_at': datetime.utcnow().isoformat()
                }
                
                self.supabase.table("pam_conversation_memory")\
                    .update({'user_preferences_learned': learned_prefs})\
                    .eq("id", recent_record.data[0]["id"])\
                    .execute()
                
                print(f"✅ Saved learned preferences for user {user_id}")
                return True
                
        except Exception as e:
            print(f"❌ Error saving learned preferences: {str(e)}")
            
        return False

    async def get_profile_completeness(self, user_id: str) -> Dict[str, Any]:
        """Analyze profile completeness and suggest missing information"""
        try:
            profile_result = self.supabase.table("profiles").select("*").eq("user_id", user_id).execute()
            
            if not profile_result.data:
                return {
                    'completeness_score': 0.0,
                    'missing_fields': ['vehicle_info', 'travel_preferences', 'budget_preferences'],
                    'suggestions': ['Tell me about your vehicle', 'What\'s your travel style?', 'What\'s your daily budget?']
                }
            
            profile = profile_result.data[0]
            total_fields = 8
            completed_fields = 0
            missing_fields = []
            suggestions = []
            
            # Check vehicle info
            vehicle_info = profile.get('vehicle_info', {}) or {}
            if vehicle_info.get('type'):
                completed_fields += 1
            else:
                missing_fields.append('vehicle_type')
                suggestions.append('What type of vehicle do you travel in?')
                
            if vehicle_info.get('fuel_type'):
                completed_fields += 1
            else:
                missing_fields.append('fuel_type')
                suggestions.append('What fuel type does your vehicle use?')
            
            # Check travel preferences
            travel_prefs = profile.get('travel_preferences', {}) or {}
            if travel_prefs.get('style'):
                completed_fields += 1
            else:
                missing_fields.append('travel_style')
                suggestions.append('Do you prefer budget or luxury travel?')
                
            if travel_prefs.get('camp_types'):
                completed_fields += 1
            else:
                missing_fields.append('camp_preferences')
                suggestions.append('Do you prefer free camps or caravan parks?')
            
            # Check budget preferences
            budget_prefs = profile.get('budget_preferences', {}) or {}
            if budget_prefs.get('daily_budget'):
                completed_fields += 1
            else:
                missing_fields.append('daily_budget')
                suggestions.append('What\'s your daily travel budget?')
            
            # Check basic info
            if profile.get('email'):
                completed_fields += 1
            if profile.get('region'):
                completed_fields += 1
            if profile.get('interests'):
                completed_fields += 1
            else:
                missing_fields.append('interests')
                suggestions.append('What activities do you enjoy while traveling?')
            
            completeness_score = completed_fields / total_fields
            
            return {
                'completeness_score': completeness_score,
                'missing_fields': missing_fields,
                'suggestions': suggestions[:3],  # Limit to top 3 suggestions
                'total_fields': total_fields,
                'completed_fields': completed_fields
            }
            
        except Exception as e:
            print(f"❌ Error analyzing profile completeness: {str(e)}")
            return {
                'completeness_score': 0.0,
                'missing_fields': [],
                'suggestions': [],
                'error': str(e)
            }
