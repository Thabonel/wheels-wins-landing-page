"""
PAM Transition Shakedown Tools

Tools for logging practice trips and tracking issues found during shakedowns.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

from app.core.database import get_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_date_format,
    validate_positive_number,
    safe_db_insert,
)

logger = logging.getLogger(__name__)

# Valid enums
VALID_TRIP_TYPES = ["weekend", "week", "extended"]
VALID_ISSUE_CATEGORIES = ["power", "water", "comfort", "storage", "driving", "other"]
VALID_SEVERITIES = ["minor", "major", "critical"]

CONFIDENCE_RATING_MIN = 1
CONFIDENCE_RATING_MAX = 10
LOW_CONFIDENCE_THRESHOLD = 6

TRIPS_PER_100_READINESS = 4
AVG_CONFIDENCE_MULTIPLIER = 10
DEFAULT_CONFIDENCE_SCORE = 50
ISSUE_PENALTY_PER_OPEN = 10
CRITICAL_ISSUE_PENALTY = 20
MAX_ISSUE_PENALTY = 50

MAX_RECENT_TRIPS_TO_SHOW = 3


async def log_shakedown_trip(
    user_id: str,
    trip_type: str,
    start_date: str,
    end_date: str,
    destination: Optional[str] = None,
    confidence_rating: Optional[int] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Log a practice/shakedown trip.

    Shakedown trips are practice runs before the big departure to test
    the RV setup and identify issues.

    Args:
        user_id: The user's ID
        trip_type: Type of trip (weekend, week, extended)
        start_date: Trip start date (YYYY-MM-DD)
        end_date: Trip end date (YYYY-MM-DD)
        destination: Where the trip went
        confidence_rating: How confident you feel after this trip (1-10)
        notes: Additional notes about the trip

    Returns:
        Dict with logged trip details

    Raises:
        ValidationError: Invalid input parameters
        ResourceNotFoundError: Transition profile not found
        DatabaseError: Database operation failed

    Example:
        User: "Log my weekend shakedown trip to Lake Travis"
        User: "I just did a week-long practice trip, confidence 7"
        User: "Record my shakedown from Jan 15 to Jan 17"
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_date_format(start_date, "start_date")
        validate_date_format(end_date, "end_date")

        # Validate inputs
        if trip_type not in VALID_TRIP_TYPES:
            raise ValidationError(
                f"Invalid trip type. Must be one of: {', '.join(VALID_TRIP_TYPES)}",
                context={"trip_type": trip_type, "valid_trip_types": VALID_TRIP_TYPES}
            )

        if confidence_rating is not None:
            if not isinstance(confidence_rating, int) or confidence_rating < CONFIDENCE_RATING_MIN or confidence_rating > CONFIDENCE_RATING_MAX:
                raise ValidationError(
                    f"Confidence rating must be between {CONFIDENCE_RATING_MIN} and {CONFIDENCE_RATING_MAX}",
                    context={"confidence_rating": confidence_rating}
                )

        supabase = get_supabase_client()

        # Get user's transition profile
        profile_result = supabase.table("transition_profiles")\
            .select("id")\
            .eq("user_id", user_id)\
            .maybeSingle()\
            .execute()

        if not profile_result.data:
            raise ResourceNotFoundError(
                "No transition plan found. Start one at /transition in the app first.",
                context={"user_id": user_id}
            )

        profile_id = profile_result.data["id"]

        # Create shakedown trip record
        trip_data = {
            "profile_id": profile_id,
            "user_id": user_id,
            "trip_type": trip_type,
            "start_date": start_date,
            "end_date": end_date,
            "destination": destination,
            "confidence_rating": confidence_rating,
            "notes": notes
        }

        trip = await safe_db_insert("shakedown_trips", trip_data, user_id)

        # Get total trip count
        trips_result = supabase.table("shakedown_trips")\
            .select("id")\
            .eq("user_id", user_id)\
            .execute()

        total_trips = len(trips_result.data or [])

        logger.info(f"Logged shakedown trip to {destination} for user {user_id}")

        message = f"Logged your {trip_type} shakedown trip"
        if destination:
            message += f" to {destination}"
        if confidence_rating:
            message += f". Confidence: {confidence_rating}/{CONFIDENCE_RATING_MAX}"
        message += f". You've now completed {total_trips} practice trip(s)."

        if confidence_rating and confidence_rating < LOW_CONFIDENCE_THRESHOLD:
            message += f" Since confidence is below {LOW_CONFIDENCE_THRESHOLD}, consider logging any issues you encountered."

        return {
            "success": True,
            "trip": trip,
            "total_trips": total_trips,
            "message": message
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error logging shakedown trip",
            extra={"user_id": user_id, "trip_type": trip_type},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to log shakedown trip",
            context={"user_id": user_id, "trip_type": trip_type, "error": str(e)}
        )


async def add_shakedown_issue(
    user_id: str,
    category: str,
    severity: str,
    description: str,
    trip_id: Optional[str] = None,
    solution: Optional[str] = None,
    cost: Optional[float] = None
) -> Dict[str, Any]:
    """
    Track a problem found during a shakedown trip.

    Args:
        user_id: The user's ID
        category: Issue category (power, water, comfort, storage, driving, other)
        severity: Issue severity (minor, major, critical)
        description: Description of the issue
        trip_id: Associated trip ID (optional, uses most recent if not provided)
        solution: How you fixed it (marks issue as resolved)
        cost: Cost to fix the issue

    Returns:
        Dict with logged issue details

    Raises:
        ValidationError: Invalid input parameters
        ResourceNotFoundError: Transition profile not found
        DatabaseError: Database operation failed

    Example:
        User: "Found a water leak under the sink, major issue"
        User: "The fridge keeps shutting off, critical power issue"
        User: "Minor comfort issue - need better blackout curtains"
    """
    try:
        validate_uuid(user_id, "user_id")

        if trip_id:
            validate_uuid(trip_id, "trip_id")

        # Validate inputs
        if category not in VALID_ISSUE_CATEGORIES:
            raise ValidationError(
                f"Invalid category. Must be one of: {', '.join(VALID_ISSUE_CATEGORIES)}",
                context={"category": category, "valid_categories": VALID_ISSUE_CATEGORIES}
            )

        if severity not in VALID_SEVERITIES:
            raise ValidationError(
                f"Invalid severity. Must be one of: {', '.join(VALID_SEVERITIES)}",
                context={"severity": severity, "valid_severities": VALID_SEVERITIES}
            )

        if cost is not None:
            validate_positive_number(cost, "cost")

        supabase = get_supabase_client()

        # Get user's transition profile
        profile_result = supabase.table("transition_profiles")\
            .select("id")\
            .eq("user_id", user_id)\
            .maybeSingle()\
            .execute()

        if not profile_result.data:
            raise ResourceNotFoundError(
                "No transition plan found. Start one at /transition in the app first.",
                context={"user_id": user_id}
            )

        profile_id = profile_result.data["id"]

        # If no trip_id provided, get the most recent trip
        if not trip_id:
            recent_trip = supabase.table("shakedown_trips")\
                .select("id")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()

            if recent_trip.data:
                trip_id = recent_trip.data[0]["id"]

        # Create issue record
        issue_data = {
            "profile_id": profile_id,
            "user_id": user_id,
            "trip_id": trip_id,
            "category": category,
            "severity": severity,
            "description": description,
            "solution": solution,
            "cost": cost,
            "resolved": bool(solution)
        }

        issue = await safe_db_insert("shakedown_issues", issue_data, user_id)

        logger.info(f"Logged {severity} {category} issue for user {user_id}")

        message = f"Logged {severity} {category} issue: {description}"
        if solution:
            message += f" Solution recorded - marked as resolved."
        else:
            message += " Would you like me to create a task to fix this?"

        return {
            "success": True,
            "issue": issue,
            "message": message,
            "suggest_task": not bool(solution) and severity in ["major", "critical"]
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error adding shakedown issue",
            extra={"user_id": user_id, "category": category, "severity": severity},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to log shakedown issue",
            context={"user_id": user_id, "category": category, "error": str(e)}
        )


async def get_shakedown_summary(user_id: str) -> Dict[str, Any]:
    """
    Get summary of shakedown trips and issues.

    Returns statistics on practice trips completed, issues found,
    resolution rate, and overall readiness assessment.

    Args:
        user_id: The user's ID

    Returns:
        Dict with shakedown summary

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed

    Example:
        User: "How are my shakedown trips going?"
        User: "What issues have I found during practice trips?"
        User: "Am I ready based on my shakedowns?"
    """
    try:
        validate_uuid(user_id, "user_id")

        supabase = get_supabase_client()

        trips_result = supabase.table("shakedown_trips")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("start_date", desc=True)\
            .execute()

        trips = trips_result.data or []

        issues_result = supabase.table("shakedown_issues")\
            .select("*")\
            .eq("user_id", user_id)\
            .execute()

        issues = issues_result.data or []

        trips_by_type = {"weekend": 0, "week": 0, "extended": 0}
        confidence_ratings = []

        for trip in trips:
            trip_type = trip.get("trip_type", "weekend")
            trips_by_type[trip_type] = trips_by_type.get(trip_type, 0) + 1
            if trip.get("confidence_rating"):
                confidence_ratings.append(trip["confidence_rating"])

        avg_confidence = round(sum(confidence_ratings) / len(confidence_ratings), 1) if confidence_ratings else None

        issues_by_category = {}
        issues_by_severity = {"minor": 0, "major": 0, "critical": 0}
        resolved_count = 0
        total_cost = 0

        for issue in issues:
            cat = issue.get("category", "other")
            sev = issue.get("severity", "minor")
            issues_by_category[cat] = issues_by_category.get(cat, 0) + 1
            issues_by_severity[sev] = issues_by_severity.get(sev, 0) + 1

            if issue.get("resolved"):
                resolved_count += 1
            if issue.get("cost"):
                total_cost += issue["cost"]

        total_issues = len(issues)
        open_issues = total_issues - resolved_count
        resolution_rate = round((resolved_count / total_issues * 100) if total_issues > 0 else 100)

        trip_score = min(100, len(trips) * TRIPS_PER_100_READINESS)
        confidence_score = (avg_confidence * AVG_CONFIDENCE_MULTIPLIER) if avg_confidence else DEFAULT_CONFIDENCE_SCORE
        issue_penalty = min(MAX_ISSUE_PENALTY, open_issues * ISSUE_PENALTY_PER_OPEN + issues_by_severity["critical"] * CRITICAL_ISSUE_PENALTY)
        readiness_score = max(0, round((trip_score + confidence_score) / 2 - issue_penalty))

        message_parts = []
        message_parts.append(f"You've completed {len(trips)} shakedown trip(s).")

        if avg_confidence:
            message_parts.append(f"Average confidence: {avg_confidence}/{CONFIDENCE_RATING_MAX}.")

        if total_issues > 0:
            message_parts.append(f"Found {total_issues} issues, {resolved_count} resolved, {open_issues} open.")
            if issues_by_severity["critical"] > 0:
                message_parts.append(f"Warning: {issues_by_severity['critical']} critical issue(s) need attention!")
        else:
            message_parts.append("No issues logged yet.")

        message_parts.append(f"Shakedown readiness: {readiness_score}%.")

        return {
            "success": True,
            "trips": {
                "total": len(trips),
                "by_type": trips_by_type,
                "average_confidence": avg_confidence,
                "recent_trips": trips[:MAX_RECENT_TRIPS_TO_SHOW]
            },
            "issues": {
                "total": total_issues,
                "resolved": resolved_count,
                "open": open_issues,
                "resolution_rate": resolution_rate,
                "by_category": issues_by_category,
                "by_severity": issues_by_severity,
                "total_repair_cost": total_cost
            },
            "readiness_score": readiness_score,
            "message": " ".join(message_parts)
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error getting shakedown summary",
            extra={"user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to retrieve shakedown summary",
            context={"user_id": user_id, "error": str(e)}
        )
