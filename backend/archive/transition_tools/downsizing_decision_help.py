"""Downsizing Decision Help Tool for PAM

Provides AI-powered guidance for making keep/sell/donate decisions
based on item characteristics, emotional difficulty, and value.

Example usage:
- "PAM, should I keep my grandmother's china?"
- "Help me decide what to do with my old books"
- "Is this worth selling or should I donate it?"
"""

import logging
from typing import Any, Dict, Optional

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def downsizing_decision_help(
    user_id: str,
    item_name: str,
    category: Optional[str] = None,
    estimated_value: Optional[float] = None,
    emotional_difficulty: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Help user make decisions about what to keep/sell/donate
    
    Args:
        user_id: UUID of the user
        item_name: Name of the item to get help with
        category: Optional category (furniture, electronics, etc.)
        estimated_value: Optional estimated resale value
        emotional_difficulty: Optional emotional difficulty rating (1-5)
        
    Returns:
        Dict with decision recommendations and rationale
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        
        # Get user's transition profile
        profile_result = supabase.table("transition_profiles").select("*").eq("user_id", user_id).maybe_single().execute()
        
        if not profile_result.data:
            return {
                "success": False,
                "error": "No transition profile found"
            }
        
        profile = profile_result.data
        
        # Build decision logic based on criteria
        recommendations = []
        decision_score = {
            "keep": 0,
            "sell": 0,
            "donate": 0,
            "store": 0
        }
        
        # Factor 1: Emotional difficulty
        if emotional_difficulty:
            if emotional_difficulty >= 4:
                decision_score["store"] += 3
                recommendations.append(f"High emotional value ({emotional_difficulty}/5) - consider storing temporarily")
            elif emotional_difficulty <= 2:
                decision_score["sell"] += 1
                decision_score["donate"] += 1
                recommendations.append("Lower emotional attachment makes it easier to let go")
        
        # Factor 2: Estimated value
        if estimated_value:
            if estimated_value >= 100:
                decision_score["sell"] += 3
                recommendations.append(f"High resale value (${estimated_value:.2f}) - worth selling")
            elif estimated_value >= 50:
                decision_score["sell"] += 2
                recommendations.append(f"Moderate value (${estimated_value:.2f}) - selling could help fund your transition")
            else:
                decision_score["donate"] += 2
                recommendations.append(f"Low resale value (${estimated_value:.2f}) - donating is faster and gets a tax deduction")
        
        # Factor 3: Category-specific advice
        if category:
            cat_lower = category.lower()
            
            if "furniture" in cat_lower:
                decision_score["sell"] += 1
                recommendations.append("Furniture is bulky - sell locally or donate for quick pickup")
            elif "electronics" in cat_lower:
                decision_score["sell"] += 2
                recommendations.append("Electronics can be sold online quickly")
            elif "clothing" in cat_lower:
                decision_score["donate"] += 2
                recommendations.append("Clothing is best donated - little resale value, easy to donate")
            elif "books" in cat_lower:
                decision_score["donate"] += 2
                recommendations.append("Books have low resale value - donate to libraries or schools")
        
        # Factor 4: Utility in RV life
        rv_essentials = ["kitchen", "bedding", "tools", "camping"]
        if category and any(essential in category.lower() for essential in rv_essentials):
            decision_score["keep"] += 3
            recommendations.append(f"Category '{category}' is useful for RV life - consider keeping")
        
        # Determine top recommendation
        top_decision = max(decision_score, key=decision_score.get)
        top_score = decision_score[top_decision]
        
        # Generate rationale
        if top_score == 0:
            rationale = "Based on the information provided, I need more details to make a strong recommendation."
        else:
            rationale = f"I recommend you **{top_decision}** this item."
        
        logger.info(f"Provided decision help for '{item_name}' for user {user_id}: {top_decision}")
        
        return {
            "success": True,
            "item_name": item_name,
            "recommendation": top_decision,
            "decision_scores": decision_score,
            "rationale": rationale,
            "recommendations": recommendations,
            "message": f"For '{item_name}', I suggest you {top_decision} it. {rationale}"
        }
        
    except Exception as e:
        logger.error(f"Error providing decision help: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
