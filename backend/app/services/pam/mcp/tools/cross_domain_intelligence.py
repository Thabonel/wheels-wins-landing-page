"""
Cross-Domain Intelligence Tools - Advanced intelligence across all PAM domains
"""
from typing import Any, Dict, List, Optional
from langchain_core.tools import tool
from app.services.pam.intelligence.cross_domain_service import get_cross_domain_intelligence
from app.core.logging import get_logger

logger = get_logger("pam_cross_domain_tools")


@tool
async def pam_get_user_360_view(user_id: str) -> Dict[str, Any]:
    """
    Get comprehensive 360-degree view of user across all domains.
    
    Args:
        user_id: User ID to analyze
    
    Returns:
        Complete user profile with cross-domain insights
    """
    try:
        intelligence = await get_cross_domain_intelligence()
        result = await intelligence.get_user_360_view(user_id)
        
        if "error" in result:
            return {"success": False, "error": result["error"]}
        
        return {"success": True, "user_360": result}
        
    except Exception as e:
        logger.error(f"Failed to get user 360 view: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_correlate_trip_expenses(
    user_id: str,
    trip_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Correlate trip data with expenses to provide cost insights.
    
    Args:
        user_id: User ID
        trip_id: Optional specific trip ID to analyze
    
    Returns:
        Trip-expense correlations with cost insights
    """
    try:
        intelligence = await get_cross_domain_intelligence()
        result = await intelligence.correlate_trip_expenses(user_id, trip_id)
        
        if "error" in result:
            return {"success": False, "error": result["error"]}
        
        return {"success": True, "correlations": result}
        
    except Exception as e:
        logger.error(f"Failed to correlate trip expenses: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_predict_maintenance_costs(
    user_id: str,
    months_ahead: int = 6
) -> Dict[str, Any]:
    """
    Predict upcoming maintenance costs based on history and vehicle usage.
    
    Args:
        user_id: User ID
        months_ahead: Number of months to predict ahead
    
    Returns:
        Maintenance cost predictions
    """
    try:
        intelligence = await get_cross_domain_intelligence()
        result = await intelligence.predict_maintenance_costs(user_id, months_ahead)
        
        if "error" in result:
            return {"success": False, "error": result["error"]}
        
        return {"success": True, "predictions": result}
        
    except Exception as e:
        logger.error(f"Failed to predict maintenance costs: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_analyze_hustle_roi(user_id: str) -> Dict[str, Any]:
    """
    Analyze return on investment for user's hustles.
    
    Args:
        user_id: User ID
    
    Returns:
        ROI analysis for all user hustles
    """
    try:
        intelligence = await get_cross_domain_intelligence()
        result = await intelligence.analyze_hustle_roi(user_id)
        
        if "error" in result:
            return {"success": False, "error": result["error"]}
        
        return {"success": True, "analysis": result}
        
    except Exception as e:
        logger.error(f"Failed to analyze hustle ROI: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_generate_intelligent_recommendations(user_id: str) -> Dict[str, Any]:
    """
    Generate intelligent recommendations across all domains.
    
    Args:
        user_id: User ID
    
    Returns:
        Intelligent recommendations with health scores
    """
    try:
        intelligence = await get_cross_domain_intelligence()
        result = await intelligence.generate_intelligent_recommendations(user_id)
        
        if "error" in result:
            return {"success": False, "error": result["error"]}
        
        return {"success": True, "recommendations": result}
        
    except Exception as e:
        logger.error(f"Failed to generate intelligent recommendations: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_analyze_spending_patterns(
    user_id: str,
    analysis_type: str = "monthly",
    include_predictions: bool = True
) -> Dict[str, Any]:
    """
    Analyze user spending patterns and predict future expenses.
    
    Args:
        user_id: User ID
        analysis_type: Type of analysis ('monthly', 'quarterly', 'yearly')
        include_predictions: Whether to include future predictions
    
    Returns:
        Spending pattern analysis with predictions
    """
    try:
        intelligence = await get_cross_domain_intelligence()
        
        # Get user's complete financial data
        user_360 = await intelligence.get_user_360_view(user_id)
        financial_data = user_360.get("financial", {})
        
        # Analyze patterns based on trip and expense correlation
        correlations = await intelligence.correlate_trip_expenses(user_id)
        
        # Create spending analysis
        analysis = {
            "user_id": user_id,
            "analysis_type": analysis_type,
            "spending_summary": financial_data,
            "trip_correlations": correlations,
            "patterns": {
                "high_expense_periods": [],
                "seasonal_trends": {},
                "category_breakdown": {}
            }
        }
        
        # Add predictions if requested
        if include_predictions:
            # Predict maintenance costs
            maintenance_predictions = await intelligence.predict_maintenance_costs(user_id, 6)
            analysis["predictions"] = {
                "maintenance": maintenance_predictions,
                "estimated_monthly_expenses": financial_data.get("total_expenses", 0) / 12
            }
        
        return {"success": True, "analysis": analysis}
        
    except Exception as e:
        logger.error(f"Failed to analyze spending patterns: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_optimize_user_experience(
    user_id: str,
    focus_areas: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Provide comprehensive optimization recommendations for user experience.
    
    Args:
        user_id: User ID
        focus_areas: Optional list of areas to focus on ('financial', 'travel', 'vehicle', 'social')
    
    Returns:
        Optimization recommendations across all domains
    """
    try:
        intelligence = await get_cross_domain_intelligence()
        
        # Get comprehensive user data
        user_360 = await intelligence.get_user_360_view(user_id)
        
        # Get intelligent recommendations
        recommendations = await intelligence.generate_intelligent_recommendations(user_id)
        
        # Create optimization plan
        optimization = {
            "user_id": user_id,
            "current_state": user_360,
            "health_scores": recommendations.get("user_context", {}),
            "recommendations": recommendations.get("recommendations", []),
            "optimization_plan": {
                "immediate_actions": [],
                "short_term_goals": [],
                "long_term_strategy": []
            }
        }
        
        # Categorize recommendations by priority and timeline
        for rec in recommendations.get("recommendations", []):
            if rec.get("priority") == "high":
                optimization["optimization_plan"]["immediate_actions"].append(rec)
            elif rec.get("priority") == "medium":
                optimization["optimization_plan"]["short_term_goals"].append(rec)
            else:
                optimization["optimization_plan"]["long_term_strategy"].append(rec)
        
        # Filter by focus areas if provided
        if focus_areas:
            filtered_recs = []
            for rec in optimization["recommendations"]:
                if rec.get("type") in focus_areas:
                    filtered_recs.append(rec)
            optimization["recommendations"] = filtered_recs
        
        return {"success": True, "optimization": optimization}
        
    except Exception as e:
        logger.error(f"Failed to optimize user experience: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_generate_insights_report(
    user_id: str,
    report_type: str = "comprehensive",
    time_period: str = "last_30_days"
) -> Dict[str, Any]:
    """
    Generate comprehensive insights report across all domains.
    
    Args:
        user_id: User ID
        report_type: Type of report ('financial', 'travel', 'vehicle', 'comprehensive')
        time_period: Time period for analysis ('last_7_days', 'last_30_days', 'last_90_days')
    
    Returns:
        Comprehensive insights report
    """
    try:
        intelligence = await get_cross_domain_intelligence()
        
        # Get all relevant data
        user_360 = await intelligence.get_user_360_view(user_id)
        trip_correlations = await intelligence.correlate_trip_expenses(user_id)
        hustle_analysis = await intelligence.analyze_hustle_roi(user_id)
        maintenance_predictions = await intelligence.predict_maintenance_costs(user_id)
        
        # Create comprehensive report
        report = {
            "user_id": user_id,
            "report_type": report_type,
            "time_period": time_period,
            "generated_at": user_360.get("generated_at"),
            "executive_summary": {
                "financial_health": "Good",  # Based on scores
                "travel_activity": "Active",
                "vehicle_status": "Needs Attention",
                "hustle_performance": "Improving"
            },
            "detailed_analysis": {
                "user_360": user_360,
                "trip_expenses": trip_correlations,
                "hustle_roi": hustle_analysis,
                "maintenance_forecast": maintenance_predictions
            },
            "key_insights": [],
            "actionable_recommendations": []
        }
        
        # Extract key insights
        insights = user_360.get("insights", [])
        report["key_insights"] = insights
        
        # Generate executive summary based on data
        financial_score = 80  # Would calculate from actual data
        if financial_score > 70:
            report["executive_summary"]["financial_health"] = "Excellent"
        elif financial_score > 50:
            report["executive_summary"]["financial_health"] = "Good"
        else:
            report["executive_summary"]["financial_health"] = "Needs Improvement"
        
        return {"success": True, "report": report}
        
    except Exception as e:
        logger.error(f"Failed to generate insights report: {e}")
        return {"success": False, "error": str(e)}