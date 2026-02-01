"""
Timezone Utilities for PAM System

Provides centralized timezone handling for all PAM tools and services.
Fixes the time synchronization issue where PAM reports incorrect local time.

The root cause is that the backend was using UTC time while frontend sends
timezone info that was being ignored.

Author: Backend Architect
Date: February 2026
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)

# Timezone finder for coordinate-based detection (optional dependency)
try:
    from timezonefinder import TimezoneFinder
    TIMEZONE_FINDER_AVAILABLE = True
    logger.debug("TimezoneFinder available for coordinate-based timezone detection")
except ImportError:
    TIMEZONE_FINDER_AVAILABLE = False
    logger.warning("TimezoneFinder not available - coordinate-based timezone detection disabled")


def extract_user_timezone_from_context(context: Dict[str, Any]) -> Optional[str]:
    """
    Extract user's timezone from PAM context object.

    Frontend sends timezone in user_location.timezone but various parts of the
    backend look for it in different places. This function standardizes the extraction.

    Args:
        context: PAM context dictionary

    Returns:
        IANA timezone string (e.g., "America/New_York") or None if not found
    """
    # Strategy 1: Direct timezone field (legacy support)
    if 'timezone' in context and context['timezone']:
        return context['timezone']

    # Strategy 2: Extract from user_location.timezone (current frontend format)
    if 'user_location' in context:
        user_location = context['user_location']
        if isinstance(user_location, dict) and 'timezone' in user_location:
            return user_location['timezone']

    # Strategy 3: Extract from userLocation.timezone (camelCase variant)
    if 'userLocation' in context:
        user_location = context['userLocation']
        if isinstance(user_location, dict) and 'timezone' in user_location:
            return user_location['timezone']

    logger.debug("No timezone found in context")
    return None


def detect_user_timezone(context: Dict[str, Any]) -> Tuple[ZoneInfo, str, str]:
    """
    Detect user's timezone with multiple fallback strategies.

    This function combines explicit timezone detection with coordinate-based
    detection as fallbacks.

    Strategy:
    1. Extract timezone from context (browser-detected timezone)
    2. Try coordinate-based detection if TimezoneFinder available
    3. Fall back to UTC

    Args:
        context: PAM context dictionary

    Returns:
        tuple: (ZoneInfo object, timezone_string, detection_method)
    """
    # Strategy 1: Use explicit timezone from context
    timezone_str = extract_user_timezone_from_context(context)
    if timezone_str:
        try:
            user_timezone = ZoneInfo(timezone_str)
            logger.info(f"✅ Timezone detected from context: {timezone_str}")
            return user_timezone, timezone_str, "context"
        except Exception as e:
            logger.warning(f"❌ Invalid timezone in context '{timezone_str}': {e}")

    # Strategy 2: Try coordinate-based detection
    if TIMEZONE_FINDER_AVAILABLE and 'user_location' in context:
        user_loc = context['user_location']
        lat = user_loc.get('lat') or user_loc.get('latitude')
        lng = user_loc.get('lng') or user_loc.get('longitude')

        if lat and lng:
            try:
                tf = TimezoneFinder()
                detected_timezone = tf.timezone_at(lat=lat, lng=lng)
                if detected_timezone:
                    user_timezone = ZoneInfo(detected_timezone)
                    logger.info(f"✅ Timezone detected from coordinates ({lat}, {lng}): {detected_timezone}")
                    return user_timezone, detected_timezone, "coordinates"
            except Exception as e:
                logger.warning(f"❌ Failed to detect timezone from coordinates ({lat}, {lng}): {e}")

    # Strategy 3: Fall back to UTC
    logger.warning("⚠️  No timezone detected - falling back to UTC")
    return ZoneInfo('UTC'), 'UTC', "fallback"


def get_user_local_time(context: Dict[str, Any]) -> datetime:
    """
    Get the current time in the user's timezone.

    This replaces datetime.utcnow() calls throughout the codebase to provide
    timezone-aware local time.

    Args:
        context: PAM context dictionary

    Returns:
        Current datetime in user's timezone
    """
    user_timezone, timezone_str, detection_method = detect_user_timezone(context)
    user_time = datetime.now(user_timezone)

    logger.debug(f"🕐 User local time: {user_time.strftime('%Y-%m-%d %I:%M:%S %p %Z')} "
                f"(detected via {detection_method})")

    return user_time


def format_datetime_for_user(dt: datetime, context: Dict[str, Any]) -> str:
    """
    Format a datetime for display to the user in their timezone.

    Args:
        dt: Datetime object (can be naive UTC or timezone-aware)
        context: PAM context dictionary

    Returns:
        Formatted datetime string in user's timezone
    """
    user_timezone, timezone_str, detection_method = detect_user_timezone(context)

    # If datetime is naive, assume it's UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo('UTC'))

    # Convert to user's timezone
    user_dt = dt.astimezone(user_timezone)

    return user_dt.strftime('%Y-%m-%d %I:%M:%S %p %Z')


def get_temporal_context_for_user(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate temporal context using user's local time instead of UTC.

    This replaces the hardcoded UTC temporal context in advanced_context.py

    Args:
        context: PAM context dictionary

    Returns:
        Dictionary with temporal context in user's timezone
    """
    user_timezone, timezone_str, detection_method = detect_user_timezone(context)
    now = datetime.now(user_timezone)

    temporal_context = {
        "current_time": now.isoformat(),
        "current_time_formatted": now.strftime('%Y-%m-%d %I:%M:%S %p %Z'),
        "hour_of_day": now.hour,
        "day_of_week": now.weekday(),
        "is_weekend": now.weekday() >= 5,
        "is_business_hours": 9 <= now.hour <= 17,
        "season": _get_season(now),
        "timezone": timezone_str,
        "timezone_detection_method": detection_method,
        "utc_offset": now.strftime('%z')
    }

    logger.debug(f"🌍 Temporal context: {now.strftime('%I:%M %p %Z')} "
                f"({detection_method} detection)")

    return temporal_context


def convert_utc_to_user_timezone(utc_dt: datetime, context: Dict[str, Any]) -> datetime:
    """
    Convert a UTC datetime to user's timezone.

    Args:
        utc_dt: UTC datetime object (can be naive or timezone-aware)
        context: PAM context dictionary

    Returns:
        Datetime object in user's timezone
    """
    user_timezone, _, _ = detect_user_timezone(context)

    # Ensure UTC datetime is timezone-aware
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=ZoneInfo('UTC'))

    return utc_dt.astimezone(user_timezone)


def parse_user_time_to_utc(time_str: str, context: Dict[str, Any]) -> datetime:
    """
    Parse a time string from user input and convert to UTC.

    Useful for processing user-provided times that should be stored in UTC.

    Args:
        time_str: Time string in user's timezone
        context: PAM context dictionary

    Returns:
        UTC datetime object
    """
    user_timezone, timezone_str, _ = detect_user_timezone(context)

    # Parse the time string (assumes ISO format or common formats)
    try:
        # Try parsing ISO format first
        if 'T' in time_str:
            user_dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
            if user_dt.tzinfo is None:
                user_dt = user_dt.replace(tzinfo=user_timezone)
        else:
            # Simple format parsing (add more formats as needed)
            user_dt = datetime.strptime(time_str, '%Y-%m-%d %H:%M')
            user_dt = user_dt.replace(tzinfo=user_timezone)

        # Convert to UTC
        utc_dt = user_dt.astimezone(ZoneInfo('UTC'))
        return utc_dt

    except Exception as e:
        logger.error(f"❌ Failed to parse time '{time_str}' in timezone {timezone_str}: {e}")
        raise ValueError(f"Invalid time format: {time_str}")


def _get_season(date: datetime) -> str:
    """
    Determine season from date.

    Note: This assumes Northern Hemisphere. Could be enhanced to detect
    hemisphere from timezone/coordinates.
    """
    month = date.month
    if month in [12, 1, 2]:
        return "winter"
    elif month in [3, 4, 5]:
        return "spring"
    elif month in [6, 7, 8]:
        return "summer"
    else:  # [9, 10, 11]
        return "autumn"


def get_timezone_info(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get comprehensive timezone information for debugging and logging.

    Args:
        context: PAM context dictionary

    Returns:
        Dictionary with timezone debugging information
    """
    user_timezone, timezone_str, detection_method = detect_user_timezone(context)
    now_utc = datetime.now(ZoneInfo('UTC'))
    now_user = datetime.now(user_timezone)

    return {
        "timezone": timezone_str,
        "detection_method": detection_method,
        "utc_time": now_utc.isoformat(),
        "local_time": now_user.isoformat(),
        "utc_formatted": now_utc.strftime('%Y-%m-%d %I:%M:%S %p UTC'),
        "local_formatted": now_user.strftime('%Y-%m-%d %I:%M:%S %p %Z'),
        "offset": now_user.strftime('%z'),
        "offset_hours": now_user.utcoffset().total_seconds() / 3600 if now_user.utcoffset() else 0,
        "is_dst": now_user.dst() is not None and now_user.dst().total_seconds() > 0
    }


# Legacy compatibility functions for existing code

def normalize_context_timezone(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize timezone data in context for backward compatibility.

    Ensures 'timezone' field is populated from user_location.timezone
    so existing code that expects context['timezone'] continues to work.

    Args:
        context: PAM context dictionary

    Returns:
        Updated context with normalized timezone field
    """
    timezone_str = extract_user_timezone_from_context(context)
    if timezone_str and 'timezone' not in context:
        context = context.copy()  # Don't mutate original
        context['timezone'] = timezone_str
        logger.debug(f"🔄 Normalized timezone in context: {timezone_str}")

    return context