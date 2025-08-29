
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from ..domain.wheels import (
    Trip, Location, RouteSegment, MaintenanceItem, FuelLog, 
    TravelPlan, VehicleStatus, TripStatus, RouteType, LocationType, MaintenanceStatus
)

class TripPlanRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    origin: str = Field(..., description="Starting location name or address")
    destination: Optional[str] = Field(None, description="Destination location name or address")
    start_date: date
    end_date: Optional[date] = None
    budget: Optional[float] = Field(None, ge=0)
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    @validator('end_date')
    def end_date_after_start(cls, v, values):
        if v and 'start_date' in values and v <= values['start_date']:
            raise ValueError('End date must be after start date')
        return v

class RouteRequest(BaseModel):
    origin: str
    destination: str
    waypoints: List[str] = Field(default_factory=list)
    route_type: RouteType = RouteType.HIGHWAY
    avoid_tolls: bool = False
    avoid_highways: bool = False
    vehicle_restrictions: Optional[Dict[str, Any]] = None

class LocationSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    radius_km: int = Field(50, ge=1, le=500)
    location_types: Optional[List[LocationType]] = None
    amenities: Optional[List[str]] = None
    rv_friendly: Optional[bool] = None
    max_length: Optional[int] = None

class TripUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[TripStatus] = None
    end_date: Optional[date] = None
    budget: Optional[float] = Field(None, ge=0)
    actual_cost: Optional[float] = Field(None, ge=0)

class MaintenanceCreateRequest(BaseModel):
    vehicle_component: str = Field(..., min_length=1, max_length=100)
    task_description: str = Field(..., min_length=1, max_length=500)
    scheduled_date: Optional[date] = None
    cost: Optional[float] = Field(None, ge=0)
    service_provider: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)

class MaintenanceUpdateRequest(BaseModel):
    status: Optional[MaintenanceStatus] = None
    completed_date: Optional[date] = None
    odometer_reading: Optional[int] = Field(None, ge=0)
    cost: Optional[float] = Field(None, ge=0)
    service_provider: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)
    receipt_url: Optional[str] = None

class FuelLogCreateRequest(BaseModel):
    date: date
    fuel_type: str = Field(..., min_length=1, max_length=50)
    gallons: float = Field(..., gt=0)
    price_per_gallon: float = Field(..., gt=0)
    location_name: str = Field(..., min_length=1, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    odometer_reading: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=500)
    receipt_url: Optional[str] = None

class WeatherRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    days: int = Field(7, ge=1, le=14)

class TripResponse(BaseModel):
    trip: Trip
    estimated_costs: Dict[str, float]
    route_summary: Dict[str, Any]
    weather_forecast: Optional[List[Dict[str, Any]]] = None

class RouteResponse(BaseModel):
    route_segments: List[RouteSegment]
    total_distance_miles: float
    estimated_time_hours: float
    fuel_costs: Dict[str, float]
    recommended_stops: List[Location]

class LocationSearchResponse(BaseModel):
    locations: List[Location]
    total_found: int
    search_center: Optional[Dict[str, float]] = None

class MaintenanceScheduleResponse(BaseModel):
    upcoming: List[MaintenanceItem]
    overdue: List[MaintenanceItem]
    completed_recent: List[MaintenanceItem]
    alerts: List[str] = Field(default_factory=list)

class FuelEfficiencyResponse(BaseModel):
    current_mpg: Optional[float] = None
    average_mpg: Optional[float] = None
    trend: str  # improving, declining, stable
    cost_per_mile: Optional[float] = None
    monthly_summary: List[Dict[str, Any]] = Field(default_factory=list)

class VehicleStatusResponse(BaseModel):
    status: VehicleStatus
    maintenance_due: List[MaintenanceItem]
    fuel_range_miles: Optional[float] = None
    next_service_location: Optional[Location] = None


class ItineraryRequest(BaseModel):
    """Parameters for generating a daily itinerary"""
    start: str
    end: str
    duration_days: int = Field(..., ge=1)
    interests: List[str] = Field(default_factory=list)


class ItineraryStop(BaseModel):
    name: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    interest: Optional[str] = None


class ItineraryDay(BaseModel):
    day: int
    stops: List[ItineraryStop]


class ItineraryResponse(BaseModel):
    start: str
    end: str
    days: List[ItineraryDay]
