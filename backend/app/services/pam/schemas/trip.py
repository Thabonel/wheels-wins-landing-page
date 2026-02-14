"""
Pydantic validation schemas for Trip tools

Amendment #4: Input validation for all 10 trip tools
"""

from pydantic import Field, validator
from typing import Optional, List
from enum import Enum
from decimal import Decimal

from app.services.pam.schemas.base import BaseToolInput, LocationInput, AmountInput, DateInput

VALID_MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
]


class UnitsSystem(str, Enum):
    """Valid unit systems"""
    METRIC = "metric"
    IMPERIAL = "imperial"


class OptimizationType(str, Enum):
    """Route optimization types"""
    COST = "cost"
    TIME = "time"
    BALANCED = "balanced"


class PlanTripInput(BaseToolInput, DateInput):
    """Validation for plan_trip tool"""

    origin: str = Field(..., min_length=1, max_length=500, description="Starting location")
    destination: str = Field(..., min_length=1, max_length=500, description="End location")
    budget: Optional[Decimal] = Field(None, gt=0, max_digits=10, decimal_places=2, description="Trip budget (optional)")
    stops: Optional[List[str]] = Field(None, description="Intermediate stops")
    start_date: Optional[str] = Field(None, description="Trip start date (ISO format)")

    @validator("origin", "destination")
    def validate_locations(cls, v):
        """Clean up location strings"""
        v = v.strip()
        if not v:
            raise ValueError("Location cannot be empty")
        return v

    @validator("budget")
    def validate_budget(cls, v):
        """Ensure reasonable budget"""
        if v and v > 100_000:
            raise ValueError("Budget must be less than $100,000")
        return round(v, 2) if v else None

    @validator("stops")
    def validate_stops(cls, v):
        """Validate stops list"""
        if v:
            if len(v) > 20:
                raise ValueError("Maximum 20 stops allowed")
            # Clean up each stop
            return [stop.strip() for stop in v if stop.strip()]
        return v


class FindRVParksInput(BaseToolInput, LocationInput):
    """Validation for find_rv_parks tool"""

    radius_miles: int = Field(50, gt=0, le=500, description="Search radius in miles")
    amenities: Optional[List[str]] = Field(None, description="Required amenities")
    max_price: Optional[Decimal] = Field(None, gt=0, max_digits=7, decimal_places=2, description="Maximum price per night")

    @validator("max_price")
    def validate_price(cls, v):
        """Ensure reasonable price"""
        if v and v > Decimal('1000.00'):
            raise ValueError("max_price must be less than $1,000/night")
        return v  # Decimal already has precision

    @validator("amenities")
    def validate_amenities(cls, v):
        """Clean up amenities list"""
        if v:
            valid_amenities = [
                "water", "electric", "sewer", "wifi", "laundry",
                "shower", "pool", "pet_friendly", "full_hookup"
            ]
            cleaned = [a.strip().lower().replace(" ", "_") for a in v]
            # Warn about invalid amenities but don't fail
            return [a for a in cleaned if a]
        return v


class GetWeatherForecastInput(BaseToolInput, LocationInput):
    """Validation for get_weather_forecast tool"""

    days: int = Field(7, gt=0, le=7, description="Number of forecast days (max 7 for free tier)")
    units: UnitsSystem = Field(UnitsSystem.IMPERIAL, description="Temperature units")


class CalculateGasCostInput(BaseToolInput):
    """Validation for calculate_gas_cost tool"""

    distance_miles: float = Field(..., gt=0, description="Trip distance in miles")
    mpg: float = Field(..., gt=0, le=50, description="Vehicle MPG")
    gas_price: Optional[Decimal] = Field(None, gt=0, max_digits=5, decimal_places=2, description="Gas price per gallon (optional, uses current price)")

    @validator("distance_miles")
    def validate_distance(cls, v):
        """Ensure reasonable distance"""
        if v > 10_000:
            raise ValueError("distance_miles must be less than 10,000 miles")
        return round(v, 2)

    @validator("mpg")
    def validate_mpg(cls, v):
        """Ensure reasonable MPG"""
        if v < 1:
            raise ValueError("mpg must be at least 1")
        if v > 50:
            raise ValueError("mpg must be less than 50 (check your RV specs)")
        return round(v, 2)

    @validator("gas_price")
    def validate_gas_price(cls, v):
        """Ensure reasonable gas price"""
        if v:
            if v > Decimal('20.00'):
                raise ValueError("gas_price must be less than $20/gallon")
            if v < Decimal('0.50'):
                raise ValueError("gas_price must be at least $0.50/gallon")
        return v  # Decimal already has precision


class FindCheapGasInput(BaseToolInput):
    """Validation for find_cheap_gas tool"""

    latitude: float = Field(..., ge=-90, le=90, description="Latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude")
    radius_miles: int = Field(10, gt=0, le=50, description="Search radius (max 50 miles)")
    fuel_type: str = Field("regular", description="Fuel type (regular, diesel, premium)")

    @validator("fuel_type")
    def validate_fuel_type(cls, v):
        """Ensure valid fuel type"""
        valid_types = ["regular", "diesel", "premium", "e85"]
        v = v.lower().strip()
        if v not in valid_types:
            return "regular"
        return v


class OptimizeRouteInput(BaseToolInput):
    """Validation for optimize_route tool"""

    origin: str = Field(..., min_length=1, max_length=500, description="Starting location")
    destination: str = Field(..., min_length=1, max_length=500, description="End location")
    stops: Optional[List[str]] = Field(None, description="Intermediate stops to optimize")
    optimization_type: OptimizationType = Field(OptimizationType.BALANCED, description="Optimization priority")

    @validator("origin", "destination")
    def validate_locations(cls, v):
        """Clean up location strings"""
        v = v.strip()
        if not v:
            raise ValueError("Location cannot be empty")
        return v

    @validator("stops")
    def validate_stops(cls, v):
        """Validate stops list"""
        if v:
            if len(v) > 10:
                raise ValueError("Maximum 10 stops for optimization")
            return [stop.strip() for stop in v if stop.strip()]
        return v


class GetRoadConditionsInput(BaseToolInput):
    """Validation for get_road_conditions tool"""

    route: str = Field(..., min_length=1, max_length=500, description="Route name or highway (e.g., 'I-80')")
    start_location: Optional[str] = Field(None, max_length=500, description="Starting point on route")
    end_location: Optional[str] = Field(None, max_length=500, description="Ending point on route")

    @validator("route")
    def validate_route(cls, v):
        """Clean up route name"""
        return v.strip().upper()


class FindAttractionsInput(BaseToolInput, LocationInput):
    """Validation for find_attractions tool"""

    radius_miles: int = Field(50, gt=0, le=200, description="Search radius in miles")
    attraction_types: Optional[List[str]] = Field(None, description="Types of attractions")
    limit: int = Field(20, gt=0, le=100, description="Maximum number of results")

    @validator("attraction_types")
    def validate_attraction_types(cls, v):
        """Clean up attraction types"""
        if v:
            valid_types = [
                "national_park", "state_park", "museum", "historic_site",
                "scenic_view", "hiking", "camping", "restaurant", "shopping"
            ]
            return [t.strip().lower().replace(" ", "_") for t in v if t.strip()]
        return v


class EstimateTravelTimeInput(BaseToolInput):
    """Validation for estimate_travel_time tool"""

    origin: str = Field(..., min_length=1, max_length=500, description="Starting location")
    destination: str = Field(..., min_length=1, max_length=500, description="End location")
    stops: Optional[List[str]] = Field(None, description="Intermediate stops")
    include_breaks: bool = Field(True, description="Include recommended rest breaks")

    @validator("origin", "destination")
    def validate_locations(cls, v):
        """Clean up location strings"""
        v = v.strip()
        if not v:
            raise ValueError("Location cannot be empty")
        return v

    @validator("stops")
    def validate_stops(cls, v):
        """Validate stops list"""
        if v:
            if len(v) > 20:
                raise ValueError("Maximum 20 stops allowed")
            return [stop.strip() for stop in v if stop.strip()]
        return v


class SaveFavoriteSpotInput(BaseToolInput, LocationInput):
    """Validation for save_favorite_spot tool"""

    name: str = Field(..., min_length=1, max_length=200, description="Name for this spot")
    category: str = Field(..., min_length=1, max_length=100, description="Category (campground, attraction, etc)")
    notes: Optional[str] = Field(None, max_length=1000, description="Notes about this spot")
    rating: Optional[int] = Field(None, ge=1, le=5, description="Rating (1-5 stars)")

    @validator("name", "category")
    def validate_text_fields(cls, v):
        """Clean up text fields"""
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty")
        return v


class SuggestSeasonalRouteInput(BaseToolInput):
    """Validation for suggest_seasonal_route tool"""

    origin: str = Field(..., min_length=1, max_length=500, description="Starting location")
    destination_region: str = Field(..., min_length=1, max_length=500, description="Target region")
    travel_month: Optional[str] = Field(None, max_length=20, description="Travel month (e.g. 'may')")
    duration_weeks: Optional[int] = Field(None, gt=0, le=52, description="Migration duration in weeks")
    budget: Optional[Decimal] = Field(None, gt=0, max_digits=10, decimal_places=2, description="Total budget")

    @validator("origin", "destination_region")
    def validate_locations(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Location cannot be empty")
        return v

    @validator("travel_month")
    def validate_travel_month(cls, v):
        if v is None:
            return v
        v = v.strip().lower()
        if v and v not in VALID_MONTHS:
            raise ValueError(f"Invalid month: {v}")
        return v

    @validator("budget")
    def validate_budget(cls, v):
        if v and v > 100_000:
            raise ValueError("Budget must be less than $100,000")
        return round(v, 2) if v else None


class FindLongstayParksInput(BaseToolInput):
    """Validation for find_longstay_parks tool"""

    region: str = Field(..., min_length=1, max_length=500, description="Region to search")
    min_stay_days: Optional[int] = Field(30, gt=0, le=365, description="Minimum stay in days")
    max_monthly_rate: Optional[float] = Field(None, gt=0, description="Maximum monthly rate")
    amenities: Optional[List[str]] = Field(None, description="Required amenities")

    @validator("region")
    def validate_region(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Region cannot be empty")
        return v

    @validator("max_monthly_rate")
    def validate_rate(cls, v):
        if v and v > 10_000:
            raise ValueError("Monthly rate must be less than $10,000")
        return round(v, 2) if v else None

    @validator("amenities")
    def validate_amenities(cls, v):
        if v:
            return [a.strip().lower() for a in v if a.strip()]
        return v


class SeasonalWeatherCheckInput(BaseToolInput):
    """Validation for seasonal_weather_check tool"""

    region: str = Field(..., min_length=1, max_length=500, description="Region to check")
    month: str = Field(..., min_length=1, max_length=20, description="Month to check")

    @validator("region")
    def validate_region(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Region cannot be empty")
        return v

    @validator("month")
    def validate_month(cls, v):
        v = v.strip().lower()
        if not v:
            raise ValueError("Month cannot be empty")
        if v not in VALID_MONTHS:
            raise ValueError(f"Invalid month: {v}")
        return v
