"""Seasonal Weather Check Tool for PAM

Provide historical/typical weather patterns for a region and month.
Knowledge-based (not API-based) - Australian climate patterns are stable
enough to provide reliable guidance from stored knowledge.
"""

import logging
from typing import Any, Dict, Optional
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.trip import SeasonalWeatherCheckInput
from app.services.pam.tools.exceptions import (
    ValidationError as CustomValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import validate_uuid

logger = logging.getLogger(__name__)

MAX_KNOWLEDGE_RESULTS = 5

# Hardcoded seasonal patterns as fallback when knowledge base has no match
SEASONAL_PATTERNS = {
    "queensland": {
        "jan": {"temp_min": 23, "temp_max": 33, "rainfall_mm": 160, "advisory": "Wet season - cyclone risk in far north, extreme humidity"},
        "feb": {"temp_min": 23, "temp_max": 33, "rainfall_mm": 180, "advisory": "Peak wet season - flooding possible, roads may close"},
        "mar": {"temp_min": 22, "temp_max": 31, "rainfall_mm": 140, "advisory": "Wet season continuing - still humid and stormy"},
        "apr": {"temp_min": 19, "temp_max": 28, "rainfall_mm": 70, "advisory": "Transitioning to dry - improving conditions"},
        "may": {"temp_min": 15, "temp_max": 25, "rainfall_mm": 40, "advisory": "Dry season starting - excellent travel weather"},
        "jun": {"temp_min": 12, "temp_max": 23, "rainfall_mm": 30, "advisory": "Dry season - perfect Grey Nomad weather"},
        "jul": {"temp_min": 11, "temp_max": 22, "rainfall_mm": 25, "advisory": "Dry season peak - cool mornings, warm days, clear skies"},
        "aug": {"temp_min": 12, "temp_max": 24, "rainfall_mm": 20, "advisory": "Dry season - warming slightly, still excellent"},
        "sep": {"temp_min": 15, "temp_max": 27, "rainfall_mm": 25, "advisory": "Warming up - good but getting warmer in the north"},
        "oct": {"temp_min": 18, "temp_max": 29, "rainfall_mm": 50, "advisory": "Pre-wet buildup starting in far north"},
        "nov": {"temp_min": 21, "temp_max": 31, "rainfall_mm": 80, "advisory": "Getting hot and humid - wet season approaching"},
        "dec": {"temp_min": 22, "temp_max": 32, "rainfall_mm": 130, "advisory": "Wet season starting - storms, humidity increasing"},
    },
    "victoria": {
        "jan": {"temp_min": 14, "temp_max": 26, "rainfall_mm": 45, "advisory": "Summer - warm, fire risk in rural areas"},
        "feb": {"temp_min": 14, "temp_max": 26, "rainfall_mm": 45, "advisory": "Summer - check fire danger ratings daily"},
        "mar": {"temp_min": 13, "temp_max": 24, "rainfall_mm": 50, "advisory": "Autumn arriving - pleasant, less fire risk"},
        "apr": {"temp_min": 10, "temp_max": 20, "rainfall_mm": 55, "advisory": "Autumn - cooling, good last-chance camping weather"},
        "may": {"temp_min": 8, "temp_max": 16, "rainfall_mm": 55, "advisory": "Getting cold - many nomads heading north now"},
        "jun": {"temp_min": 6, "temp_max": 13, "rainfall_mm": 50, "advisory": "Winter - cold, frost, short days. Most nomads gone north"},
        "jul": {"temp_min": 5, "temp_max": 13, "rainfall_mm": 50, "advisory": "Coldest month - frost, fog, not ideal for caravan living"},
        "aug": {"temp_min": 6, "temp_max": 14, "rainfall_mm": 50, "advisory": "Late winter - still cold but days lengthening"},
        "sep": {"temp_min": 8, "temp_max": 17, "rainfall_mm": 55, "advisory": "Spring arriving - nomads starting to return south"},
        "oct": {"temp_min": 9, "temp_max": 20, "rainfall_mm": 65, "advisory": "Spring - warming, wildflowers, good camping starting"},
        "nov": {"temp_min": 11, "temp_max": 22, "rainfall_mm": 55, "advisory": "Warming nicely - great caravan weather returning"},
        "dec": {"temp_min": 13, "temp_max": 25, "rainfall_mm": 55, "advisory": "Summer starting - parks booking out for holidays"},
    },
    "northern territory": {
        "jan": {"temp_min": 25, "temp_max": 34, "rainfall_mm": 350, "advisory": "Wet season - DO NOT TRAVEL. Roads flood, parks close"},
        "feb": {"temp_min": 25, "temp_max": 34, "rainfall_mm": 320, "advisory": "Peak wet - cyclone risk, extreme humidity, dangerous conditions"},
        "mar": {"temp_min": 24, "temp_max": 34, "rainfall_mm": 280, "advisory": "Wet season continuing - flooding widespread"},
        "apr": {"temp_min": 22, "temp_max": 34, "rainfall_mm": 80, "advisory": "Wet season ending - roads slowly reopening"},
        "may": {"temp_min": 19, "temp_max": 32, "rainfall_mm": 15, "advisory": "Dry season starting - roads opening, perfect conditions beginning"},
        "jun": {"temp_min": 17, "temp_max": 31, "rainfall_mm": 3, "advisory": "Dry season - excellent weather, parks opening, book ahead"},
        "jul": {"temp_min": 16, "temp_max": 31, "rainfall_mm": 1, "advisory": "Peak dry season - clear skies, no humidity, perfect"},
        "aug": {"temp_min": 17, "temp_max": 33, "rainfall_mm": 3, "advisory": "Dry season - warming slightly, still excellent, events season"},
        "sep": {"temp_min": 21, "temp_max": 35, "rainfall_mm": 15, "advisory": "Getting hot - last month of dry season, leave by end of month"},
        "oct": {"temp_min": 24, "temp_max": 36, "rainfall_mm": 60, "advisory": "Buildup season - hot, humid, storms starting. Time to leave"},
        "nov": {"temp_min": 25, "temp_max": 35, "rainfall_mm": 130, "advisory": "Wet season starting - leave immediately if still in Top End"},
        "dec": {"temp_min": 25, "temp_max": 34, "rainfall_mm": 250, "advisory": "Full wet season - roads closing, DO NOT TRAVEL"},
    },
    "western australia": {
        "jan": {"temp_min": 18, "temp_max": 32, "rainfall_mm": 15, "advisory": "Summer in south - hot. Cyclone season in north - AVOID north of Geraldton"},
        "feb": {"temp_min": 18, "temp_max": 32, "rainfall_mm": 15, "advisory": "Peak cyclone risk in north. South is hot but manageable"},
        "mar": {"temp_min": 16, "temp_max": 30, "rainfall_mm": 20, "advisory": "Cyclone season continues in north. Autumn starting in south"},
        "apr": {"temp_min": 13, "temp_max": 26, "rainfall_mm": 40, "advisory": "Good time to head north - cyclone season ending"},
        "may": {"temp_min": 10, "temp_max": 22, "rainfall_mm": 100, "advisory": "Winter rains in south, dry season starting in north - head north"},
        "jun": {"temp_min": 8, "temp_max": 19, "rainfall_mm": 150, "advisory": "Wet winter in Perth/south. Kimberley dry season - perfect up north"},
        "jul": {"temp_min": 7, "temp_max": 18, "rainfall_mm": 160, "advisory": "Coldest/wettest in south. Wildflowers starting in Midwest"},
        "aug": {"temp_min": 8, "temp_max": 19, "rainfall_mm": 120, "advisory": "Wildflower season in Midwest. Kimberley still excellent"},
        "sep": {"temp_min": 9, "temp_max": 21, "rainfall_mm": 80, "advisory": "Wildflower peak! Great time for Midwest/Goldfields. North getting hot"},
        "oct": {"temp_min": 11, "temp_max": 24, "rainfall_mm": 45, "advisory": "Spring in south - warming, wildflowers. Leave Kimberley by now"},
        "nov": {"temp_min": 14, "temp_max": 28, "rainfall_mm": 25, "advisory": "Warming - good in south, getting dangerous in north"},
        "dec": {"temp_min": 16, "temp_max": 31, "rainfall_mm": 15, "advisory": "Summer - hot in south, cyclone season starting in north"},
    },
    "south australia": {
        "jan": {"temp_min": 17, "temp_max": 30, "rainfall_mm": 20, "advisory": "Hot summer - fire risk. Adelaide Hills cooler alternative"},
        "feb": {"temp_min": 17, "temp_max": 30, "rainfall_mm": 20, "advisory": "Summer continues - check fire danger daily"},
        "mar": {"temp_min": 15, "temp_max": 27, "rainfall_mm": 25, "advisory": "Autumn starting - vintage/harvest season in wine regions"},
        "apr": {"temp_min": 12, "temp_max": 22, "rainfall_mm": 35, "advisory": "Pleasant autumn - good caravan weather"},
        "may": {"temp_min": 9, "temp_max": 18, "rainfall_mm": 55, "advisory": "Cooling - many nomads departing for north"},
        "jun": {"temp_min": 7, "temp_max": 15, "rainfall_mm": 50, "advisory": "Winter - cold nights, mild days. Barossa quiet and peaceful"},
        "jul": {"temp_min": 6, "temp_max": 15, "rainfall_mm": 55, "advisory": "Coldest month - frost common, short days"},
        "aug": {"temp_min": 7, "temp_max": 16, "rainfall_mm": 50, "advisory": "Late winter - almond blossom in Adelaide Hills"},
        "sep": {"temp_min": 8, "temp_max": 18, "rainfall_mm": 45, "advisory": "Spring arriving - warming, good time to return"},
        "oct": {"temp_min": 10, "temp_max": 22, "rainfall_mm": 40, "advisory": "Spring - Murray River region pleasant, wine country green"},
        "nov": {"temp_min": 13, "temp_max": 25, "rainfall_mm": 30, "advisory": "Warming nicely - excellent caravan weather"},
        "dec": {"temp_min": 15, "temp_max": 28, "rainfall_mm": 25, "advisory": "Summer starting - coastal parks booking out for holidays"},
    },
    "tasmania": {
        "jan": {"temp_min": 11, "temp_max": 22, "rainfall_mm": 45, "advisory": "Peak summer - mild and beautiful, parks busy"},
        "feb": {"temp_min": 11, "temp_max": 22, "rainfall_mm": 40, "advisory": "Summer continues - warm days, cool nights"},
        "mar": {"temp_min": 10, "temp_max": 20, "rainfall_mm": 45, "advisory": "Autumn arriving - colours in Cradle Mountain region"},
        "apr": {"temp_min": 8, "temp_max": 17, "rainfall_mm": 55, "advisory": "Cooling - last good month for caravan touring"},
        "may": {"temp_min": 6, "temp_max": 14, "rainfall_mm": 50, "advisory": "Cold and wet - not ideal for caravanning"},
        "jun": {"temp_min": 4, "temp_max": 12, "rainfall_mm": 55, "advisory": "Winter - cold, frost, snow on mountains. Most nomads gone"},
        "jul": {"temp_min": 3, "temp_max": 11, "rainfall_mm": 60, "advisory": "Coldest month - not recommended for caravan travel"},
        "aug": {"temp_min": 4, "temp_max": 12, "rainfall_mm": 60, "advisory": "Late winter - still cold, spring approaching"},
        "sep": {"temp_min": 5, "temp_max": 14, "rainfall_mm": 55, "advisory": "Early spring - cool but improving"},
        "oct": {"temp_min": 7, "temp_max": 16, "rainfall_mm": 60, "advisory": "Spring - warming, wildflowers starting"},
        "nov": {"temp_min": 8, "temp_max": 18, "rainfall_mm": 55, "advisory": "Late spring - good touring weather returning"},
        "dec": {"temp_min": 10, "temp_max": 20, "rainfall_mm": 50, "advisory": "Summer starting - book ahead for Christmas parks"},
    },
    "new south wales": {
        "jan": {"temp_min": 18, "temp_max": 28, "rainfall_mm": 90, "advisory": "Summer - warm coast, hot inland. Fire risk in bush areas"},
        "feb": {"temp_min": 18, "temp_max": 28, "rainfall_mm": 100, "advisory": "Warmest/wettest month. Bushfire risk continues"},
        "mar": {"temp_min": 17, "temp_max": 26, "rainfall_mm": 100, "advisory": "Autumn starting - pleasant coast, cooling inland"},
        "apr": {"temp_min": 14, "temp_max": 23, "rainfall_mm": 80, "advisory": "Excellent touring weather - mild, clear, less crowded"},
        "may": {"temp_min": 10, "temp_max": 19, "rainfall_mm": 75, "advisory": "Cooling - good transit month heading north"},
        "jun": {"temp_min": 8, "temp_max": 17, "rainfall_mm": 100, "advisory": "Winter - Blue Mountains cold, coast mild, inland frosty"},
        "jul": {"temp_min": 7, "temp_max": 17, "rainfall_mm": 60, "advisory": "Coldest month - frost inland, mild coast"},
        "aug": {"temp_min": 8, "temp_max": 18, "rainfall_mm": 55, "advisory": "Late winter - whale watching starts on south coast"},
        "sep": {"temp_min": 10, "temp_max": 20, "rainfall_mm": 55, "advisory": "Spring - warming, wildflowers in Blue Mountains"},
        "oct": {"temp_min": 13, "temp_max": 23, "rainfall_mm": 65, "advisory": "Spring - great touring weather returning"},
        "nov": {"temp_min": 15, "temp_max": 25, "rainfall_mm": 75, "advisory": "Warming up - excellent caravan weather"},
        "dec": {"temp_min": 17, "temp_max": 27, "rainfall_mm": 70, "advisory": "Summer starting - coastal parks booking out"},
    },
}

MONTH_ABBREVS = {
    "january": "jan", "february": "feb", "march": "mar", "april": "apr",
    "may": "may", "june": "jun", "july": "jul", "august": "aug",
    "september": "sep", "october": "oct", "november": "nov", "december": "dec",
    "jan": "jan", "feb": "feb", "mar": "mar", "apr": "apr",
    "jun": "jun", "jul": "jul", "aug": "aug",
    "sep": "sep", "oct": "oct", "nov": "nov", "dec": "dec",
}


def _match_region(region: str) -> Optional[str]:
    """Match a user region string to a known state/territory key."""
    region_lower = region.lower().strip()
    for key in SEASONAL_PATTERNS:
        if key in region_lower or region_lower in key:
            return key
    # Try common abbreviations
    abbrevs = {
        "qld": "queensland", "vic": "victoria", "nsw": "new south wales",
        "nt": "northern territory", "wa": "western australia",
        "sa": "south australia", "tas": "tasmania",
        "top end": "northern territory", "kimberley": "western australia",
        "darwin": "northern territory", "melbourne": "victoria",
        "sydney": "new south wales", "brisbane": "queensland",
        "perth": "western australia", "adelaide": "south australia",
        "hobart": "tasmania", "cairns": "queensland",
        "gold coast": "queensland", "hervey bay": "queensland",
        "murray river": "victoria", "echuca": "victoria",
        "gippsland": "victoria", "barossa": "south australia",
        "broome": "western australia", "exmouth": "western australia",
    }
    for abbrev, state in abbrevs.items():
        if abbrev in region_lower:
            return state
    return None


async def seasonal_weather_check(
    user_id: str,
    region: str,
    month: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Check typical seasonal weather patterns for a region and month.

    Uses knowledge base data and hardcoded Australian climate patterns
    to provide travel timing guidance.

    Args:
        user_id: UUID of the user
        region: Region to check (e.g. "Top End", "Victoria", "Hervey Bay")
        month: Month to check (e.g. "may", "july", "october")

    Returns:
        Dict with temperature ranges, rainfall, and travel advisories
    """
    try:
        validate_uuid(user_id, "user_id")

        if not region or not region.strip():
            raise CustomValidationError(
                "Region is required",
                context={"field": "region"}
            )

        if not month or not month.strip():
            raise CustomValidationError(
                "Month is required",
                context={"field": "month"}
            )

        try:
            validated = SeasonalWeatherCheckInput(
                user_id=user_id,
                region=region,
                month=month,
            )
        except ValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise CustomValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        # Normalize month
        month_abbrev = MONTH_ABBREVS.get(validated.month.lower().strip())
        if not month_abbrev:
            raise CustomValidationError(
                f"Unrecognized month: {validated.month}",
                context={"field": "month", "value": validated.month}
            )

        # Match region to known state
        matched_region = _match_region(validated.region)

        # Get hardcoded weather data
        weather_data = None
        if matched_region and matched_region in SEASONAL_PATTERNS:
            weather_data = SEASONAL_PATTERNS[matched_region].get(month_abbrev)

        # Query knowledge base for additional context
        supabase = get_supabase_client()
        knowledge_response = supabase.table("pam_admin_knowledge").select(
            "title, content"
        ).eq(
            "is_active", True
        ).contains(
            "tags", ["weather-windows"]
        ).limit(MAX_KNOWLEDGE_RESULTS).execute()

        knowledge_context = ""
        if knowledge_response.data:
            for entry in knowledge_response.data:
                content = entry.get("content", "")
                if validated.month.lower() in content.lower() or validated.region.lower() in content.lower():
                    knowledge_context = entry.get("content", "")[:500]
                    break

        if weather_data:
            result = {
                "success": True,
                "region": validated.region,
                "matched_state": matched_region,
                "month": validated.month,
                "temperature_min_c": weather_data["temp_min"],
                "temperature_max_c": weather_data["temp_max"],
                "average_rainfall_mm": weather_data["rainfall_mm"],
                "travel_advisory": weather_data["advisory"],
                "knowledge_context": knowledge_context,
                "message": (
                    f"In {validated.region} during {validated.month}: "
                    f"expect {weather_data['temp_min']}-{weather_data['temp_max']}C, "
                    f"~{weather_data['rainfall_mm']}mm rainfall. "
                    f"{weather_data['advisory']}"
                ),
            }
        else:
            result = {
                "success": True,
                "region": validated.region,
                "matched_state": matched_region,
                "month": validated.month,
                "temperature_min_c": None,
                "temperature_max_c": None,
                "average_rainfall_mm": None,
                "travel_advisory": "No specific weather data available for this region. Check BOM (Bureau of Meteorology) for current forecasts.",
                "knowledge_context": knowledge_context,
                "message": (
                    f"I don't have specific weather patterns for {validated.region} "
                    f"in {validated.month}. Check the Bureau of Meteorology (bom.gov.au) "
                    f"for detailed forecasts."
                ),
            }

        logger.info(
            f"Weather check for {validated.region} in {validated.month} "
            f"for user {validated.user_id}: matched={matched_region}"
        )

        return result

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error checking seasonal weather",
            extra={"user_id": user_id, "region": region, "month": month},
            exc_info=True,
        )
        raise DatabaseError(
            "Failed to check seasonal weather",
            context={"user_id": user_id, "region": region, "error": str(e)},
        )
