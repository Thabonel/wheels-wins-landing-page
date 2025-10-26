"""Analyze Room Progress Tool for PAM

Provides detailed analysis of downsizing progress across all rooms,
helping users understand what's complete and what needs attention.

Example usage:
- "PAM, how's my downsizing progress?"
- "Show me which rooms still need work"
- "What percentage of my house is done?"
"""

import logging
from typing import Any, Dict, Optional

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def analyze_room_progress(
    user_id: str,
    include_details: bool = True,
    **kwargs
) -> Dict[str, Any]:
    """
    Analyze user's room-by-room downsizing progress
    
    Args:
        user_id: UUID of the user
        include_details: Whether to include room-by-room breakdown
        
    Returns:
        Dict with progress analysis and recommendations
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        
        # Get user's transition profile
        profile_result = supabase.table("transition_profiles").select("id").eq("user_id", user_id).maybe_single().execute()
        
        if not profile_result.data:
            return {
                "success": False,
                "error": "No transition profile found. Start your transition planning first!"
            }
        
        profile_id = profile_result.data["id"]
        
        # Get comprehensive downsizing stats
        stats_result = supabase.rpc("get_downsizing_stats", {
            "p_profile_id": profile_id
        }).execute()
        
        if not stats_result.data or len(stats_result.data) == 0:
            return {
                "success": False,
                "error": "No downsizing data found. Add some rooms and items first!"
            }
        
        stats = stats_result.data[0]
        
        # Get room details if requested
        room_details = None
        if include_details:
            rooms_result = supabase.table("transition_rooms").select("*").eq("profile_id", profile_id).execute()
            
            if rooms_result.data:
                room_details = []
                for room in rooms_result.data:
                    # Get items for this room
                    items_result = supabase.table("transition_items").select("decision").eq("room_id", room["id"]).execute()
                    
                    total_items = room["total_items"]
                    decided_items = sum(1 for item in items_result.data if item.get("decision"))
                    progress = int((decided_items / total_items * 100)) if total_items > 0 else 0
                    
                    room_details.append({
                        "name": room["name"],
                        "type": room["room_type"],
                        "status": room["status"],
                        "total_items": total_items,
                        "decided_items": decided_items,
                        "progress": progress
                    })
        
        # Generate recommendations
        recommendations = []
        
        if stats["overall_completion"] < 25:
            recommendations.append("You're just getting started. Focus on one room at a time.")
        elif stats["overall_completion"] < 50:
            recommendations.append("Good progress! Keep the momentum going.")
        elif stats["overall_completion"] < 75:
            recommendations.append("Over halfway there! The finish line is in sight.")
        else:
            recommendations.append("Almost done! Just a few more items to decide on.")
        
        if stats["parking_lot_count"] > 5:
            recommendations.append(f"You have {stats['parking_lot_count']} items in the parking lot. Time to make final decisions!")
        
        if stats["sell_count"] > 0:
            recommendations.append(f"You're planning to sell {stats['sell_count']} items worth ${stats['estimated_sale_value']:.2f}. List them soon!")
        
        logger.info(f"Analyzed room progress for user {user_id}: {stats['overall_completion']}% complete")
        
        return {
            "success": True,
            "stats": stats,
            "room_details": room_details,
            "recommendations": recommendations,
            "message": f"You're {stats['overall_completion']}% done with downsizing. {stats['decided_items']} of {stats['total_items']} items decided."
        }
        
    except Exception as e:
        logger.error(f"Error analyzing room progress: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
