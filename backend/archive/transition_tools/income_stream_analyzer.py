"""Income Stream Analyzer Tool for PAM

Analyzes user's income stream setup progress and provides recommendations
for reaching their monthly income goals before departure.

Example usage:
- "PAM, how are my income streams coming along?"
- "Am I on track to hit my income goal?"
- "Which income streams should I prioritize?"
"""

import logging
from typing import Any, Dict, Optional

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def income_stream_analyzer(
    user_id: str,
    include_recommendations: bool = True,
    **kwargs
) -> Dict[str, Any]:
    """
    Analyze user's income stream setup and progress
    
    Args:
        user_id: UUID of the user
        include_recommendations: Whether to include setup recommendations
        
    Returns:
        Dict with income analysis and recommendations
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        
        # Get user's transition profile
        profile_result = supabase.table("transition_profiles").select("id").eq("user_id", user_id).maybe_single().execute()
        
        if not profile_result.data:
            return {
                "success": False,
                "error": "No transition profile found"
            }
        
        profile_id = profile_result.data["id"]
        
        # Get income statistics
        stats_result = supabase.rpc("get_income_stats", {
            "p_profile_id": profile_id
        }).execute()
        
        if not stats_result.data or len(stats_result.data) == 0:
            return {
                "success": False,
                "error": "No income streams found. Start planning your income sources!"
            }
        
        stats = stats_result.data[0]
        
        # Get individual streams for detailed analysis
        streams_result = supabase.table("income_streams").select("*").eq("profile_id", profile_id).execute()
        streams = streams_result.data or []
        
        # Analyze income diversity
        income_types = {
            "remote_work": stats["remote_work_count"],
            "freelance": stats["freelance_count"],
            "passive": stats["passive_count"],
            "seasonal": stats["seasonal_count"]
        }
        
        diversity_score = sum(1 for count in income_types.values() if count > 0)
        
        # Categorize streams by status
        planning_streams = []
        setting_up_streams = []
        active_streams = []
        
        for stream in streams:
            if stream["status"] == "planning":
                planning_streams.append(stream)
            elif stream["status"] == "setting_up":
                setting_up_streams.append(stream)
            elif stream["status"] == "active":
                active_streams.append(stream)
        
        # Generate recommendations
        recommendations = []
        
        if include_recommendations:
            # Income diversity recommendation
            if diversity_score <= 1:
                recommendations.append("⚠️ Low income diversity. Consider adding different income types for stability.")
            elif diversity_score == 2:
                recommendations.append("💡 Good to have 2 income types. Adding a third would increase resilience.")
            else:
                recommendations.append("✅ Excellent income diversity across multiple types!")
            
            # Setup completion recommendation
            if stats["setup_completion_percentage"] < 25:
                recommendations.append("🔨 Focus on completing setup checklists for your streams.")
            elif stats["setup_completion_percentage"] < 75:
                recommendations.append("📈 Good progress on setup! Keep working through your checklists.")
            else:
                recommendations.append("🎯 Almost ready! Just a few more setup tasks to complete.")
            
            # Active income recommendation
            if stats["active_streams"] == 0:
                recommendations.append("🚀 Prioritize getting at least one stream active before departure.")
            elif stats["active_streams"] < 2:
                recommendations.append("💪 Having 2+ active income streams provides better security.")
            
            # Income gap analysis
            income_gap = stats["total_monthly_estimate"] - stats["total_actual_monthly"]
            if income_gap > 0 and stats["active_streams"] > 0:
                recommendations.append(f"📊 Current income gap: ${income_gap:.2f}/month. Activate more streams!")
            
            # Prioritization advice
            if setting_up_streams:
                high_value_setting_up = [s for s in setting_up_streams if s["monthly_estimate"] >= 1000]
                if high_value_setting_up:
                    stream_names = ", ".join([s["stream_name"] for s in high_value_setting_up[:2]])
                    recommendations.append(f"🎯 Prioritize: {stream_names} (high monthly value)")
        
        logger.info(f"Analyzed income streams for user {user_id}: {stats['active_streams']} active, {diversity_score} types")
        
        return {
            "success": True,
            "stats": stats,
            "diversity_score": diversity_score,
            "planning_count": len(planning_streams),
            "setting_up_count": len(setting_up_streams),
            "active_count": len(active_streams),
            "recommendations": recommendations,
            "message": f"You have {stats['total_streams']} income streams ({stats['active_streams']} active). "
                      f"Estimated monthly: ${stats['total_monthly_estimate']:.2f}, "
                      f"Actual: ${stats['total_actual_monthly']:.2f}. "
                      f"Setup: {stats['setup_completion_percentage']}% complete."
        }
        
    except Exception as e:
        logger.error(f"Error analyzing income streams: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
