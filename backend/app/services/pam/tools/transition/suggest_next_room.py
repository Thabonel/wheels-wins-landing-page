"""Suggest Next Room Tool for PAM

Intelligently suggests which room to tackle next based on:
- Completion status
- Number of items
- Emotional difficulty
- User's departure timeline

Example usage:
- "PAM, which room should I work on next?"
- "What's the best room to start with?"
- "Help me decide where to focus today"
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def suggest_next_room(
    user_id: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Suggest the next room to work on based on intelligent prioritization
    
    Args:
        user_id: UUID of the user
        
    Returns:
        Dict with suggested room and rationale
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        
        # Get user's transition profile
        profile_result = supabase.table("transition_profiles").select("id, departure_date").eq("user_id", user_id).maybe_single().execute()
        
        if not profile_result.data:
            return {
                "success": False,
                "error": "No transition profile found"
            }
        
        profile_id = profile_result.data["id"]
        departure_date = datetime.fromisoformat(profile_result.data["departure_date"])
        days_until_departure = (departure_date.date() - datetime.utcnow().date()).days
        
        # Get all rooms
        rooms_result = supabase.table("transition_rooms").select("*").eq("profile_id", profile_id).execute()
        
        if not rooms_result.data:
            return {
                "success": False,
                "error": "No rooms found. Add your rooms first!"
            }
        
        rooms = rooms_result.data
        
        # Calculate scores for each room
        room_scores = []
        
        for room in rooms:
            # Skip completed rooms
            if room["status"] == "completed":
                continue
            
            # Get items for this room
            items_result = supabase.table("transition_items").select("decision, emotional_difficulty").eq("room_id", room["id"]).execute()
            items = items_result.data or []
            
            total_items = len(items)
            decided_items = sum(1 for item in items if item.get("decision"))
            undecided_items = total_items - decided_items
            
            # Skip rooms with no items
            if total_items == 0:
                continue
            
            # Calculate average emotional difficulty
            emotional_items = [item for item in items if item.get("emotional_difficulty")]
            avg_emotional_difficulty = sum(item["emotional_difficulty"] for item in emotional_items) / len(emotional_items) if emotional_items else 3
            
            # Scoring algorithm
            score = 0
            reasons = []
            
            # Factor 1: In-progress rooms get priority (momentum)
            if room["status"] == "in_progress":
                score += 20
                reasons.append("Already started - maintain momentum")
            
            # Factor 2: Rooms with fewer items are faster wins
            if total_items <= 10:
                score += 15
                reasons.append(f"Small room ({total_items} items) - quick win")
            elif total_items <= 25:
                score += 10
                reasons.append(f"Medium room ({total_items} items)")
            else:
                score += 5
                reasons.append(f"Large room ({total_items} items) - tackle early")
            
            # Factor 3: Lower emotional difficulty = easier to start
            if avg_emotional_difficulty <= 2:
                score += 15
                reasons.append("Low emotional difficulty - easier decisions")
            elif avg_emotional_difficulty <= 3:
                score += 10
            else:
                score += 5
                reasons.append("High emotional difficulty - may take more time")
            
            # Factor 4: Urgency based on departure timeline
            if days_until_departure <= 30:
                score += 20
                reasons.append("⚠️ URGENT: Departure in 30 days")
            elif days_until_departure <= 60:
                score += 15
                reasons.append("⏰ Departure in 2 months")
            elif days_until_departure <= 90:
                score += 10
            
            # Factor 5: Partial completion bonus
            if decided_items > 0:
                completion_percent = (decided_items / total_items) * 100
                if 10 <= completion_percent < 50:
                    score += 10
                    reasons.append(f"Partially done ({int(completion_percent)}%) - finish it")
            
            # Factor 6: Common room types prioritization
            room_type_priority = {
                "storage": 5,      # Often easiest
                "garage": 5,       # Often easiest
                "office": 10,      # Medium priority
                "living_room": 15, # Important for daily life
                "bedroom": 15,     # Important for daily life
                "kitchen": 12,     # Useful items
                "bathroom": 8,     # Fewer items usually
                "other": 5
            }
            score += room_type_priority.get(room["room_type"], 5)
            
            room_scores.append({
                "room": room,
                "score": score,
                "reasons": reasons,
                "total_items": total_items,
                "decided_items": decided_items,
                "undecided_items": undecided_items,
                "avg_emotional_difficulty": round(avg_emotional_difficulty, 1)
            })
        
        if not room_scores:
            return {
                "success": False,
                "error": "All rooms are complete or have no items!"
            }
        
        # Sort by score (highest first)
        room_scores.sort(key=lambda x: x["score"], reverse=True)
        
        # Get top recommendation
        top_room = room_scores[0]
        
        # Get top 3 alternatives
        alternatives = []
        for room_data in room_scores[1:4]:
            alternatives.append({
                "name": room_data["room"]["name"],
                "room_type": room_data["room"]["room_type"],
                "undecided_items": room_data["undecided_items"],
                "score": room_data["score"]
            })
        
        logger.info(f"Suggested next room for user {user_id}: {top_room['room']['name']} (score: {top_room['score']})")
        
        return {
            "success": True,
            "suggested_room": {
                "name": top_room["room"]["name"],
                "room_type": top_room["room"]["room_type"],
                "status": top_room["room"]["status"],
                "total_items": top_room["total_items"],
                "decided_items": top_room["decided_items"],
                "undecided_items": top_room["undecided_items"]
            },
            "score": top_room["score"],
            "reasons": top_room["reasons"],
            "alternatives": alternatives,
            "days_until_departure": days_until_departure,
            "message": f"I recommend tackling **{top_room['room']['name']}** next. "
                      f"{top_room['undecided_items']} items to decide on. "
                      f"Reasons: {', '.join(top_room['reasons'][:2])}."
        }
        
    except Exception as e:
        logger.error(f"Error suggesting next room: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
