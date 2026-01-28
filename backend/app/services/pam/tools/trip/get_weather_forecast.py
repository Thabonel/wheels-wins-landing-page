"""Get Weather Forecast Tool for PAM

Get weather conditions along a route or at a location using FREE OpenMeteo API
"""

import logging
from typing import Any, Dict, Optional
from pydantic import ValidationError

from app.services.pam.schemas.trip import GetWeatherForecastInput
from app.services.pam.tools.exceptions import (
    ValidationError as CustomValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
)

logger = logging.getLogger(__name__)

DEFAULT_FORECAST_DAYS = 7
MAX_FREE_TIER_FORECAST_DAYS = 7


async def get_weather_forecast(
    user_id: str,
    location: Optional[str] = None,
    days: Optional[int] = DEFAULT_FORECAST_DAYS,
    **kwargs
) -> Dict[str, Any]:
    try:
        validate_uuid(user_id, "user_id")

        if not location and 'context' in kwargs:
            user_loc = kwargs.get('context', {}).get('user_location', {})
            if isinstance(user_loc, dict):
                if user_loc.get('city') and user_loc.get('region'):
                    location = f"{user_loc['city']}, {user_loc['region']}"
                    logger.info(f"Using user location from context: {location}")
                elif user_loc.get('lat') and user_loc.get('lng'):
                    location = f"{user_loc['lat']},{user_loc['lng']}"
                    logger.info(f"Using user coordinates from context: {location}")

        if not location:
            raise CustomValidationError(
                "Location not provided and user location not available. Please specify a location or enable location services.",
                context={"field": "location"}
            )

        if days is not None:
            validate_positive_number(days, "days")

        try:
            validated = GetWeatherForecastInput(
                user_id=user_id,
                location=location,
                days=days
            )
        except ValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise CustomValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        from app.services.pam.tools.weather import get_weather_forecast as weather_api_call

        result = await weather_api_call(location=validated.location, days=validated.days)

        if "error" in result:
            raise CustomValidationError(
                result.get("error"),
                context={
                    "location": result.get("location"),
                    "suggestion": result.get("suggestion", "")
                }
            )
        else:
            return {
                "success": True,
                **result
            }

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error getting weather forecast",
            extra={"user_id": user_id, "location": location},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to get weather forecast",
            context={"user_id": user_id, "location": location, "error": str(e)}
        )
