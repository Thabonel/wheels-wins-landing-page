
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

class TripStatus(str, Enum):
    PLANNED = "planned"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class RouteType(str, Enum):
    HIGHWAY = "highway"
    SCENIC = "scenic"
    BACKROAD = "backroad"
    OFFROAD = "offroad"

class MaintenanceStatus(str, Enum):
    COMPLETED = "completed"
    OVERDUE = "overdue"
    UPCOMING = "upcoming"
    SCHEDULED = "scheduled"

class LocationType(str, Enum):
    CAMPGROUND = "campground"
    BOONDOCKING = "boondocking"
    PARKING = "parking"
    FUEL_STATION = "fuel_station"
    REPAIR_SHOP = "repair_shop"
    ATTRACTION = "attraction"
    WAYPOINT = "waypoint"

class Location(BaseModel):
    id: Optional[str] = None
    name: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    location_type: LocationType
    description: Optional[str] = None
    amenities: List[str] = Field(default_factory=list)
    rating: Optional[float] = None
    price_per_night: Optional[float] = None
    rv_friendly: bool = True
    max_length: Optional[int] = None
    hookups: List[str] = Field(default_factory=list)
    phone: Optional[str] = None
    website: Optional[str] = None
    hours: Optional[str] = None

class RouteSegment(BaseModel):
    start_location: Location
    end_location: Location
    distance_miles: float
    estimated_time_hours: float
    route_type: RouteType = RouteType.HIGHWAY
    waypoints: List[Location] = Field(default_factory=list)
    notes: Optional[str] = None
    fuel_stops: List[Location] = Field(default_factory=list)

class Trip(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    status: TripStatus = TripStatus.PLANNED
    start_date: date
    end_date: Optional[date] = None
    origin: Location
    destination: Optional[Location] = None
    route_segments: List[RouteSegment] = Field(default_factory=list)
    planned_stops: List[Location] = Field(default_factory=list)
    total_distance_miles: Optional[float] = None
    estimated_duration_days: Optional[int] = None
    budget: Optional[float] = None
    actual_cost: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    
    @validator('end_date')
    def end_date_after_start(cls, v, values):
        if v and 'start_date' in values and v <= values['start_date']:
            raise ValueError('End date must be after start date')
        return v

class MaintenanceItem(BaseModel):
    id: str
    user_id: str
    vehicle_component: str
    task_description: str
    status: MaintenanceStatus
    scheduled_date: Optional[date] = None
    completed_date: Optional[date] = None
    odometer_reading: Optional[int] = None
    cost: Optional[float] = None
    service_provider: Optional[str] = None
    notes: Optional[str] = None
    receipt_url: Optional[str] = None
    next_service_date: Optional[date] = None
    next_service_mileage: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class FuelLog(BaseModel):
    id: str
    user_id: str
    date: date
    location: Location
    fuel_type: str
    gallons: float
    price_per_gallon: float
    total_cost: float
    odometer_reading: Optional[int] = None
    mpg: Optional[float] = None
    notes: Optional[str] = None
    receipt_url: Optional[str] = None
    created_at: datetime

class TravelPlan(BaseModel):
    id: str
    user_id: str
    name: str
    trips: List[Trip] = Field(default_factory=list)
    total_budget: Optional[float] = None
    estimated_duration_days: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool = True

class VehicleStatus(BaseModel):
    user_id: str
    current_location: Optional[Location] = None
    current_odometer: Optional[int] = None
    fuel_level_percent: Optional[float] = None
    last_maintenance_date: Optional[date] = None
    next_maintenance_due: Optional[date] = None
    maintenance_alerts: List[str] = Field(default_factory=list)
    updated_at: datetime
