# app/nodes/memory_node.py
"""
PAM Memory Node - Conversation Memory and Context Management
Integrates with existing pam_memory table to provide context retention
"""

import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

from app.database.supabase_client import get_supabase

class MemoryNode:
    """Manages conversation memory and context for PAM"""
    
    def __init__(self):
        self.supabase = get_supabase()
        
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