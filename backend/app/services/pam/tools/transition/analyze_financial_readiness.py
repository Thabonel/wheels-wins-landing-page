"""
PAM Tool: Analyze Financial Readiness

Analyzes the user's financial preparedness across the three bucket system:
- Transition Costs (one-time expenses)
- Emergency Fund (6 months expenses)
- Travel Budget (first 6 months on the road)

Provides insights and recommendations based on their funding progress.
"""

from typing import Dict, Any, List
from supabase import create_client
import os
import logging

logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase = create_client(
    os.getenv("SUPABASE_URL", ""),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
)


async def analyze_financial_readiness(user_id: str) -> Dict[str, Any]:
    """
    Analyze the user's financial readiness for their transition.

    Args:
        user_id: The user's UUID

    Returns:
        Dictionary containing:
        - buckets: Detailed stats for each financial bucket
        - overall_readiness: Overall financial readiness percentage
        - recommendations: List of recommendations
        - insights: Key insights
        - success: Success status
        - message: Human-readable summary
    """
    try:
        # Fetch transition profile
        profile_response = supabase.table("transition_profiles").select("*").eq("user_id", user_id).maybe_single().execute()

        if not profile_response.data:
            return {
                "success": False,
                "message": "No transition profile found."
            }

        profile = profile_response.data

        # Fetch all financial items
        financial_response = supabase.table("transition_financial").select("*").eq("profile_id", profile["id"]).execute()
        financial_items = financial_response.data or []

        # Group by bucket type
        buckets = {
            "transition": {"items": [], "total_estimated": 0, "total_funded": 0, "percentage": 0},
            "emergency": {"items": [], "total_estimated": 0, "total_funded": 0, "percentage": 0},
            "travel": {"items": [], "total_estimated": 0, "total_funded": 0, "percentage": 0}
        }

        for item in financial_items:
            bucket_type = item["bucket_type"]
            buckets[bucket_type]["items"].append(item)
            buckets[bucket_type]["total_estimated"] += float(item["estimated_amount"])
            buckets[bucket_type]["total_funded"] += float(item["current_amount"])

        # Calculate percentages
        for bucket_type, bucket in buckets.items():
            if bucket["total_estimated"] > 0:
                bucket["percentage"] = int((bucket["total_funded"] / bucket["total_estimated"]) * 100)
                bucket["remaining"] = bucket["total_estimated"] - bucket["total_funded"]
            else:
                bucket["percentage"] = 0
                bucket["remaining"] = 0

            # Find underfunded categories
            bucket["underfunded_categories"] = [
                {
                    "category": item["category"],
                    "estimated": float(item["estimated_amount"]),
                    "funded": float(item["current_amount"]),
                    "remaining": float(item["estimated_amount"]) - float(item["current_amount"])
                }
                for item in bucket["items"]
                if not item["is_funded"]
            ]

        # Calculate overall readiness (weighted: transition 30%, emergency 40%, travel 30%)
        overall_readiness = int(
            (buckets["transition"]["percentage"] * 0.3) +
            (buckets["emergency"]["percentage"] * 0.4) +
            (buckets["travel"]["percentage"] * 0.3)
        )

        # Generate recommendations
        recommendations = []

        # Emergency fund priority
        if buckets["emergency"]["percentage"] < 50:
            recommendations.append({
                "priority": "critical",
                "bucket": "emergency",
                "message": f"Your emergency fund is only {buckets['emergency']['percentage']}% funded. Prioritize building this to 100% before departure."
            })
        elif buckets["emergency"]["percentage"] < 80:
            recommendations.append({
                "priority": "high",
                "bucket": "emergency",
                "message": f"Your emergency fund is {buckets['emergency']['percentage']}% funded. Aim for 100% for peace of mind on the road."
            })

        # Transition costs
        if buckets["transition"]["percentage"] < 80 and buckets["transition"]["total_estimated"] > 0:
            recommendations.append({
                "priority": "high",
                "bucket": "transition",
                "message": f"You have ${buckets['transition']['remaining']:,.0f} remaining in transition costs."
            })

        # Travel budget
        if buckets["travel"]["percentage"] < 60:
            recommendations.append({
                "priority": "medium",
                "bucket": "travel",
                "message": f"Your travel budget is {buckets['travel']['percentage']}% funded. Consider increasing to avoid financial stress early on."
            })

        # Specific category recommendations
        for bucket_type in ["emergency", "transition", "travel"]:
            underfunded = buckets[bucket_type]["underfunded_categories"]
            if underfunded:
                # Sort by remaining amount (highest first)
                underfunded.sort(key=lambda x: x["remaining"], reverse=True)
                top_category = underfunded[0]
                recommendations.append({
                    "priority": "medium",
                    "bucket": bucket_type,
                    "message": f"In your {bucket_type} bucket, '{top_category['category']}' needs ${top_category['remaining']:,.0f} more."
                })

        # Generate insights
        insights = []

        total_funded = sum(b["total_funded"] for b in buckets.values())
        total_estimated = sum(b["total_estimated"] for b in buckets.values())

        insights.append(f"You've saved ${total_funded:,.0f} of your ${total_estimated:,.0f} goal ({overall_readiness}% overall)")

        if overall_readiness >= 80:
            insights.append("You're in great financial shape for your transition!")
        elif overall_readiness >= 60:
            insights.append("You're making good progress. Focus on closing the gaps.")
        else:
            insights.append("You have significant financial work to do before departure.")

        # Most funded bucket
        best_bucket = max(buckets.items(), key=lambda x: x[1]["percentage"])
        insights.append(f"Your {best_bucket[0]} bucket is your strongest at {best_bucket[1]['percentage']}%")

        # Least funded bucket
        worst_bucket = min(buckets.items(), key=lambda x: x[1]["percentage"])
        if worst_bucket[1]["percentage"] < 50:
            insights.append(f"Your {worst_bucket[0]} bucket needs the most attention ({worst_bucket[1]['percentage']}%)")

        # Generate summary message
        message = f"""Financial Readiness: {overall_readiness}%

Buckets:
• Transition Costs: {buckets['transition']['percentage']}% (${buckets['transition']['total_funded']:,.0f}/${buckets['transition']['total_estimated']:,.0f})
• Emergency Fund: {buckets['emergency']['percentage']}% (${buckets['emergency']['total_funded']:,.0f}/${buckets['emergency']['total_estimated']:,.0f})
• Travel Budget: {buckets['travel']['percentage']}% (${buckets['travel']['total_funded']:,.0f}/${buckets['travel']['total_estimated']:,.0f})

{recommendations[0]['message'] if recommendations else 'Great work! Keep building your funds.'}"""

        return {
            "success": True,
            "overall_readiness": overall_readiness,
            "buckets": {
                bucket_type: {
                    "total_estimated": bucket["total_estimated"],
                    "total_funded": bucket["total_funded"],
                    "percentage": bucket["percentage"],
                    "remaining": bucket["remaining"],
                    "underfunded_count": len(bucket["underfunded_categories"])
                }
                for bucket_type, bucket in buckets.items()
            },
            "recommendations": recommendations[:5],  # Top 5 recommendations
            "insights": insights,
            "message": message
        }

    except Exception as e:
        logger.error(f"Error analyzing financial readiness: {str(e)}")
        return {
            "success": False,
            "message": f"Error analyzing financial readiness: {str(e)}"
        }
