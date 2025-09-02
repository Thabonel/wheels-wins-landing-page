"""
PAM Travel & Booking API Integration System
Comprehensive integration with major travel platforms, booking engines,
and location-based services for Australian Grey Nomad travel.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import xml.etree.ElementTree as ET
from urllib.parse import urlencode
import hashlib
import time

from app.core.config import get_settings
from app.services.database import get_database
from app.core.security import encrypt_sensitive_data, decrypt_sensitive_data

settings = get_settings()
logger = logging.getLogger(__name__)

class BookingType(Enum):
    """Types of bookings PAM can handle"""
    ACCOMMODATION = "accommodation"
    FLIGHTS = "flights"
    CAR_RENTAL = "car_rental"
    CARAVAN_PARKS = "caravan_parks"
    TOURS = "tours"
    ACTIVITIES = "activities"
    RESTAURANTS = "restaurants"
    FUEL_STOPS = "fuel_stops"

class BookingStatus(Enum):
    """Status of booking operations"""
    SEARCHING = "searching"
    FOUND = "found"
    BOOKING = "booking"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    MODIFIED = "modified"
    ERROR = "error"

class TravelProvider(Enum):
    """Supported travel service providers"""
    BOOKING_COM = "booking_com"
    EXPEDIA = "expedia"
    AIRBNB = "airbnb"
    BIG4_HOLIDAY_PARKS = "big4_holiday_parks"
    DISCOVERY_PARKS = "discovery_parks"
    WIKICAMPS = "wikicamps"
    CAMPERMATE = "campermate"
    GOOGLE_PLACES = "google_places"
    TRIPADVISOR = "tripadvisor"
    JETSTAR = "jetstar"
    QANTAS = "qantas"
    VIRGIN_AUSTRALIA = "virgin_australia"
    HERTZ = "hertz"
    AVIS = "avis"
    REDSPOT = "redspot"

@dataclass
class TravelSearchRequest:
    """Travel search parameters"""
    request_id: str
    booking_type: BookingType
    destination: str
    check_in: datetime
    check_out: datetime
    guests: int
    budget_range: Tuple[float, float]
    preferences: Dict[str, Any]
    accessibility_needs: List[str]
    user_id: str
    created_at: datetime

@dataclass
class TravelOption:
    """A single travel booking option"""
    option_id: str
    provider: TravelProvider
    booking_type: BookingType
    name: str
    description: str
    location: Dict[str, Any]
    price: float
    currency: str
    availability: Dict[str, Any]
    amenities: List[str]
    ratings: Dict[str, float]
    images: List[str]
    booking_url: str
    cancellation_policy: str
    metadata: Dict[str, Any]

@dataclass
class BookingConfirmation:
    """Booking confirmation details"""
    confirmation_id: str
    booking_reference: str
    provider: TravelProvider
    booking_type: BookingType
    traveler_details: Dict[str, Any]
    booking_details: Dict[str, Any]
    total_cost: float
    currency: str
    confirmation_status: BookingStatus
    booking_date: datetime
    cancellation_deadline: Optional[datetime]
    metadata: Dict[str, Any]

class PAMTravelBookingSystem:
    """
    Comprehensive travel booking integration system for PAM.
    
    Features:
    - Multi-provider accommodation search and booking
    - Flight comparison and booking integration
    - Car rental and RV rental services
    - Caravan park and campground reservations
    - Local activity and tour bookings
    - Restaurant reservations and recommendations
    - Fuel station and service location mapping
    - Real-time availability and pricing
    """
    
    def __init__(self):
        self.db = get_database()
        self.session = None
        
        # API credentials (encrypted in database)
        self.api_credentials = {}
        
        # Provider configurations
        self.provider_configs = {
            TravelProvider.BOOKING_COM: {
                "base_url": "https://distribution-xml.booking.com/2.7/xml",
                "rate_limit": 10,  # requests per second
                "timeout": 30,
                "supports": [BookingType.ACCOMMODATION]
            },
            TravelProvider.EXPEDIA: {
                "base_url": "https://api.expedia.com/v3",
                "rate_limit": 5,
                "timeout": 30,
                "supports": [BookingType.ACCOMMODATION, BookingType.FLIGHTS, BookingType.CAR_RENTAL]
            },
            TravelProvider.BIG4_HOLIDAY_PARKS: {
                "base_url": "https://api.big4.com.au/v2",
                "rate_limit": 3,
                "timeout": 20,
                "supports": [BookingType.CARAVAN_PARKS]
            },
            TravelProvider.WIKICAMPS: {
                "base_url": "https://api.wikicamps.com.au/v1",
                "rate_limit": 5,
                "timeout": 15,
                "supports": [BookingType.CARAVAN_PARKS, BookingType.FUEL_STOPS]
            },
            TravelProvider.GOOGLE_PLACES: {
                "base_url": "https://maps.googleapis.com/maps/api/place",
                "rate_limit": 10,
                "timeout": 10,
                "supports": [BookingType.RESTAURANTS, BookingType.ACTIVITIES, BookingType.FUEL_STOPS]
            },
            TravelProvider.QANTAS: {
                "base_url": "https://api.qantas.com/v1",
                "rate_limit": 3,
                "timeout": 25,
                "supports": [BookingType.FLIGHTS]
            }
        }
        
        # Rate limiting
        self.rate_limiters = {}
        for provider in TravelProvider:
            self.rate_limiters[provider] = []
        
        # Cache for search results
        self.search_cache = {}
        self.cache_ttl = 300  # 5 minutes
        
        # Initialize HTTP session
        asyncio.create_task(self._initialize_session())
    
    async def _initialize_session(self):
        """Initialize HTTP session and load API credentials"""
        try:
            # Create HTTP session with proper headers
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=60),
                headers={
                    "User-Agent": "PAM-Travel-Assistant/1.0",
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            )
            
            # Load encrypted API credentials
            await self._load_api_credentials()
            
            logger.info("Travel booking system initialized")
            
        except Exception as e:
            logger.error(f"Error initializing travel booking system: {e}")
    
    async def search_accommodations(
        self,
        search_request: TravelSearchRequest,
        providers: Optional[List[TravelProvider]] = None
    ) -> List[TravelOption]:
        """
        Search for accommodations across multiple providers.
        
        Args:
            search_request: Search parameters and preferences
            providers: Optional list of specific providers to search
            
        Returns:
            List of accommodation options sorted by relevance
        """
        try:
            # Filter providers that support accommodation bookings
            if not providers:
                providers = [
                    p for p, config in self.provider_configs.items()
                    if BookingType.ACCOMMODATION in config["supports"]
                ]
            
            # Check cache first
            cache_key = self._generate_cache_key(search_request, providers)
            if cache_key in self.search_cache:
                cached_result = self.search_cache[cache_key]
                if datetime.utcnow() - cached_result["timestamp"] < timedelta(seconds=self.cache_ttl):
                    return cached_result["results"]
            
            # Search across providers concurrently
            search_tasks = []
            for provider in providers:
                task = self._search_provider_accommodations(provider, search_request)
                search_tasks.append(task)
            
            # Wait for all searches to complete
            provider_results = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            # Combine and filter results
            all_options = []
            for i, result in enumerate(provider_results):
                if isinstance(result, Exception):
                    logger.error(f"Error searching {providers[i]}: {result}")
                    continue
                
                if result:
                    all_options.extend(result)
            
            # Sort by relevance score
            sorted_options = await self._rank_accommodation_options(all_options, search_request)
            
            # Cache results
            self.search_cache[cache_key] = {
                "results": sorted_options,
                "timestamp": datetime.utcnow()
            }
            
            # Store search request
            await self._store_search_request(search_request, len(sorted_options))
            
            return sorted_options
            
        except Exception as e:
            logger.error(f"Error searching accommodations: {e}")
            return []
    
    async def search_caravan_parks(
        self,
        search_request: TravelSearchRequest,
        park_preferences: Optional[Dict[str, Any]] = None
    ) -> List[TravelOption]:
        """
        Search for caravan parks and camping grounds.
        
        Args:
            search_request: Search parameters
            park_preferences: Specific caravan park preferences
            
        Returns:
            List of caravan park options
        """
        try:
            caravan_providers = [
                TravelProvider.BIG4_HOLIDAY_PARKS,
                TravelProvider.DISCOVERY_PARKS,
                TravelProvider.WIKICAMPS,
                TravelProvider.CAMPERMATE
            ]
            
            # Search caravan-specific providers
            search_tasks = []
            for provider in caravan_providers:
                if provider in self.provider_configs:
                    task = self._search_caravan_parks_provider(provider, search_request, park_preferences)
                    search_tasks.append(task)
            
            provider_results = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            # Combine results
            all_parks = []
            for result in provider_results:
                if isinstance(result, list):
                    all_parks.extend(result)
            
            # Enhanced ranking for caravan parks
            ranked_parks = await self._rank_caravan_parks(all_parks, search_request, park_preferences)
            
            return ranked_parks
            
        except Exception as e:
            logger.error(f"Error searching caravan parks: {e}")
            return []
    
    async def search_flights(
        self,
        search_request: TravelSearchRequest,
        flight_preferences: Optional[Dict[str, Any]] = None
    ) -> List[TravelOption]:
        """
        Search for flights across Australian carriers.
        
        Args:
            search_request: Search parameters
            flight_preferences: Flight-specific preferences
            
        Returns:
            List of flight options
        """
        try:
            flight_providers = [
                TravelProvider.QANTAS,
                TravelProvider.JETSTAR,
                TravelProvider.VIRGIN_AUSTRALIA,
                TravelProvider.EXPEDIA
            ]
            
            # Search flight providers
            search_tasks = []
            for provider in flight_providers:
                if provider in self.provider_configs:
                    task = self._search_flights_provider(provider, search_request, flight_preferences)
                    search_tasks.append(task)
            
            provider_results = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            # Combine and rank flights
            all_flights = []
            for result in provider_results:
                if isinstance(result, list):
                    all_flights.extend(result)
            
            ranked_flights = await self._rank_flight_options(all_flights, search_request, flight_preferences)
            
            return ranked_flights
            
        except Exception as e:
            logger.error(f"Error searching flights: {e}")
            return []
    
    async def make_booking(
        self,
        option: TravelOption,
        traveler_details: Dict[str, Any],
        payment_details: Dict[str, Any],
        user_id: str
    ) -> BookingConfirmation:
        """
        Make a booking with the selected travel option.
        
        Args:
            option: Selected travel option
            traveler_details: Traveler information
            payment_details: Payment information (encrypted)
            user_id: User making the booking
            
        Returns:
            Booking confirmation details
        """
        try:
            # Validate booking eligibility
            validation_result = await self._validate_booking_request(option, traveler_details)
            if not validation_result["valid"]:
                raise ValueError(f"Booking validation failed: {validation_result['reason']}")
            
            # Encrypt sensitive payment data
            encrypted_payment = await self._encrypt_payment_details(payment_details)
            
            # Delegate to provider-specific booking method
            if option.provider == TravelProvider.BOOKING_COM:
                confirmation = await self._book_with_booking_com(option, traveler_details, encrypted_payment)
            elif option.provider == TravelProvider.BIG4_HOLIDAY_PARKS:
                confirmation = await self._book_with_big4(option, traveler_details, encrypted_payment)
            elif option.provider == TravelProvider.QANTAS:
                confirmation = await self._book_with_qantas(option, traveler_details, encrypted_payment)
            else:
                confirmation = await self._generic_booking_flow(option, traveler_details, encrypted_payment)
            
            # Store booking confirmation
            await self._store_booking_confirmation(confirmation, user_id)
            
            # Send confirmation notifications
            await self._send_booking_notifications(confirmation, user_id)
            
            return confirmation
            
        except Exception as e:
            logger.error(f"Error making booking: {e}")
            return self._create_error_booking_confirmation(str(e))
    
    async def get_booking_status(
        self,
        confirmation_id: str,
        provider: TravelProvider
    ) -> Dict[str, Any]:
        """
        Get current status of a booking.
        
        Args:
            confirmation_id: Booking confirmation ID
            provider: Travel provider
            
        Returns:
            Current booking status and details
        """
        try:
            # Delegate to provider-specific status check
            if provider == TravelProvider.BOOKING_COM:
                status = await self._check_booking_com_status(confirmation_id)
            elif provider == TravelProvider.QANTAS:
                status = await self._check_qantas_status(confirmation_id)
            else:
                status = await self._generic_status_check(confirmation_id, provider)
            
            # Update booking status in database
            await self._update_booking_status(confirmation_id, status)
            
            return status
            
        except Exception as e:
            logger.error(f"Error checking booking status: {e}")
            return {"status": "error", "message": str(e)}
    
    async def cancel_booking(
        self,
        confirmation_id: str,
        provider: TravelProvider,
        cancellation_reason: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Cancel a booking.
        
        Args:
            confirmation_id: Booking confirmation ID
            provider: Travel provider
            cancellation_reason: Reason for cancellation
            user_id: User requesting cancellation
            
        Returns:
            Cancellation confirmation and refund details
        """
        try:
            # Check cancellation policy
            booking_details = await self._get_booking_details(confirmation_id)
            cancellation_check = await self._check_cancellation_eligibility(booking_details)
            
            if not cancellation_check["eligible"]:
                return {
                    "success": False,
                    "message": cancellation_check["reason"],
                    "fees": cancellation_check.get("fees", 0)
                }
            
            # Process cancellation with provider
            if provider == TravelProvider.BOOKING_COM:
                result = await self._cancel_booking_com(confirmation_id, cancellation_reason)
            elif provider == TravelProvider.QANTAS:
                result = await self._cancel_qantas_booking(confirmation_id, cancellation_reason)
            else:
                result = await self._generic_booking_cancellation(confirmation_id, provider, cancellation_reason)
            
            # Update booking status
            await self._update_booking_status(confirmation_id, {
                "status": BookingStatus.CANCELLED,
                "cancellation_date": datetime.utcnow(),
                "cancellation_reason": cancellation_reason
            })
            
            # Send cancellation notifications
            await self._send_cancellation_notifications(confirmation_id, user_id, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error cancelling booking: {e}")
            return {"success": False, "message": str(e)}
    
    async def get_travel_recommendations(
        self,
        user_id: str,
        location: str,
        travel_style: str,
        interests: List[str]
    ) -> Dict[str, Any]:
        """
        Get personalized travel recommendations.
        
        Args:
            user_id: User identifier
            location: Current or desired location
            travel_style: Travel style preference
            interests: List of interests
            
        Returns:
            Personalized travel recommendations
        """
        try:
            # Get user travel history and preferences
            user_profile = await self._get_user_travel_profile(user_id)
            
            # Generate location-based recommendations
            location_recs = await self._get_location_recommendations(location, interests)
            
            # Get activity recommendations
            activity_recs = await self._get_activity_recommendations(location, interests, travel_style)
            
            # Get accommodation recommendations
            accommodation_recs = await self._get_accommodation_recommendations(
                location, travel_style, user_profile
            )
            
            # Get dining recommendations
            dining_recs = await self._get_dining_recommendations(location, user_profile)
            
            # Combine and personalize recommendations
            recommendations = {
                "location": location,
                "travel_style": travel_style,
                "locations_to_visit": location_recs,
                "activities": activity_recs,
                "accommodations": accommodation_recs,
                "dining": dining_recs,
                "travel_tips": await self._generate_travel_tips(location, travel_style),
                "weather_info": await self._get_weather_forecast(location),
                "fuel_stops": await self._get_fuel_stops_route(location),
                "generated_at": datetime.utcnow().isoformat()
            }
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting travel recommendations: {e}")
            return {"error": "Failed to generate travel recommendations"}
    
    # Private methods for provider-specific implementations
    
    async def _search_provider_accommodations(
        self,
        provider: TravelProvider,
        search_request: TravelSearchRequest
    ) -> List[TravelOption]:
        """Search accommodations from a specific provider"""
        try:
            # Rate limiting check
            if not await self._check_rate_limit(provider):
                logger.warning(f"Rate limit exceeded for {provider}")
                return []
            
            # Provider-specific search logic
            if provider == TravelProvider.BOOKING_COM:
                return await self._search_booking_com(search_request)
            elif provider == TravelProvider.EXPEDIA:
                return await self._search_expedia(search_request)
            elif provider == TravelProvider.AIRBNB:
                return await self._search_airbnb(search_request)
            else:
                return await self._generic_accommodation_search(provider, search_request)
                
        except Exception as e:
            logger.error(f"Error searching {provider}: {e}")
            return []
    
    async def _search_booking_com(self, search_request: TravelSearchRequest) -> List[TravelOption]:
        """Search Booking.com for accommodations"""
        try:
            if not self.session:
                return []
            
            # Build Booking.com XML request
            xml_request = self._build_booking_com_request(search_request)
            
            # Make API call
            config = self.provider_configs[TravelProvider.BOOKING_COM]
            async with self.session.post(
                config["base_url"],
                data=xml_request,
                headers={"Content-Type": "application/xml"},
                timeout=config["timeout"]
            ) as response:
                
                if response.status != 200:
                    logger.error(f"Booking.com API error: {response.status}")
                    return []
                
                xml_response = await response.text()
                return self._parse_booking_com_response(xml_response)
                
        except Exception as e:
            logger.error(f"Error searching Booking.com: {e}")
            return []
    
    def _build_booking_com_request(self, search_request: TravelSearchRequest) -> str:
        """Build XML request for Booking.com API"""
        xml = f"""<?xml version="1.0" encoding="UTF-8"?>
        <request>
            <username>{self.api_credentials.get('booking_com_user', '')}</username>
            <password>{self.api_credentials.get('booking_com_pass', '')}</password>
            <city>{search_request.destination}</city>
            <checkin>{search_request.check_in.strftime('%Y-%m-%d')}</checkin>
            <checkout>{search_request.check_out.strftime('%Y-%m-%d')}</checkout>
            <guests>{search_request.guests}</guests>
            <currency>AUD</currency>
            <language>en</language>
        </request>"""
        
        return xml
    
    def _parse_booking_com_response(self, xml_response: str) -> List[TravelOption]:
        """Parse Booking.com XML response into TravelOption objects"""
        try:
            root = ET.fromstring(xml_response)
            options = []
            
            for hotel in root.findall(".//hotel"):
                option = TravelOption(
                    option_id=f"booking_{hotel.find('hotel_id').text}",
                    provider=TravelProvider.BOOKING_COM,
                    booking_type=BookingType.ACCOMMODATION,
                    name=hotel.find('name').text or "",
                    description=hotel.find('description').text or "",
                    location={
                        "address": hotel.find('address').text or "",
                        "city": hotel.find('city').text or "",
                        "country": hotel.find('country').text or ""
                    },
                    price=float(hotel.find('price').text or 0),
                    currency="AUD",
                    availability={"available": True},
                    amenities=self._extract_amenities(hotel),
                    ratings={"guest_rating": float(hotel.find('rating').text or 0)},
                    images=self._extract_images(hotel),
                    booking_url=hotel.find('url').text or "",
                    cancellation_policy=hotel.find('cancellation_policy').text or "",
                    metadata={"provider_id": hotel.find('hotel_id').text}
                )
                options.append(option)
            
            return options
            
        except ET.ParseError as e:
            logger.error(f"Error parsing Booking.com response: {e}")
            return []
    
    async def _rank_accommodation_options(
        self,
        options: List[TravelOption],
        search_request: TravelSearchRequest
    ) -> List[TravelOption]:
        """Rank accommodation options by relevance"""
        try:
            scored_options = []
            
            for option in options:
                score = 0.0
                
                # Price score (closer to budget = higher score)
                if search_request.budget_range:
                    min_budget, max_budget = search_request.budget_range
                    if min_budget <= option.price <= max_budget:
                        score += 30
                    else:
                        # Penalty for being outside budget
                        if option.price < min_budget:
                            score += 20
                        else:
                            over_budget = (option.price - max_budget) / max_budget
                            score += max(0, 20 - (over_budget * 20))
                
                # Rating score
                guest_rating = option.ratings.get("guest_rating", 0)
                score += min(guest_rating * 5, 25)  # Max 25 points
                
                # Amenity matching score
                preferences = search_request.preferences
                if preferences:
                    preferred_amenities = preferences.get("amenities", [])
                    matching_amenities = set(option.amenities) & set(preferred_amenities)
                    score += len(matching_amenities) * 3
                
                # Provider reliability score
                provider_scores = {
                    TravelProvider.BOOKING_COM: 20,
                    TravelProvider.EXPEDIA: 15,
                    TravelProvider.AIRBNB: 18
                }
                score += provider_scores.get(option.provider, 10)
                
                scored_options.append((option, score))
            
            # Sort by score (highest first)
            scored_options.sort(key=lambda x: x[1], reverse=True)
            
            return [option for option, score in scored_options]
            
        except Exception as e:
            logger.error(f"Error ranking accommodation options: {e}")
            return options
    
    def _generate_cache_key(self, search_request: TravelSearchRequest, providers: List[TravelProvider]) -> str:
        """Generate cache key for search request"""
        key_data = {
            "destination": search_request.destination,
            "check_in": search_request.check_in.isoformat(),
            "check_out": search_request.check_out.isoformat(),
            "guests": search_request.guests,
            "providers": [p.value for p in providers]
        }
        
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    async def _check_rate_limit(self, provider: TravelProvider) -> bool:
        """Check if provider API call is within rate limits"""
        now = time.time()
        provider_calls = self.rate_limiters[provider]
        
        # Remove calls older than 1 second
        self.rate_limiters[provider] = [call_time for call_time in provider_calls if now - call_time < 1.0]
        
        # Check if we can make another call
        config = self.provider_configs.get(provider)
        if not config:
            return True
        
        rate_limit = config["rate_limit"]
        if len(self.rate_limiters[provider]) < rate_limit:
            self.rate_limiters[provider].append(now)
            return True
        
        return False
    
    async def _store_search_request(self, search_request: TravelSearchRequest, result_count: int):
        """Store search request for analytics"""
        try:
            query = """
            INSERT INTO pam_travel_searches (
                request_id, booking_type, destination, check_in, check_out,
                guests, budget_range, preferences, result_count, created_at, user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """
            
            await self.db.execute(
                query,
                search_request.request_id,
                search_request.booking_type.value,
                search_request.destination,
                search_request.check_in,
                search_request.check_out,
                search_request.guests,
                json.dumps(list(search_request.budget_range)),
                json.dumps(search_request.preferences),
                result_count,
                search_request.created_at,
                search_request.user_id
            )
            
        except Exception as e:
            logger.error(f"Error storing search request: {e}")
    
    async def _load_api_credentials(self):
        """Load encrypted API credentials from database"""
        try:
            query = "SELECT provider, credentials FROM pam_travel_api_credentials"
            results = await self.db.fetch(query)
            
            for row in results:
                provider = row["provider"]
                encrypted_creds = row["credentials"]
                
                # Decrypt credentials
                decrypted_creds = await decrypt_sensitive_data(encrypted_creds)
                self.api_credentials.update(json.loads(decrypted_creds))
                
        except Exception as e:
            logger.error(f"Error loading API credentials: {e}")


# Global travel booking system instance
travel_booking_system = PAMTravelBookingSystem()

# Utility functions for easy integration

async def search_accommodations(
    destination: str,
    check_in: datetime,
    check_out: datetime,
    guests: int = 2,
    budget_range: Tuple[float, float] = (0, 1000),
    preferences: Optional[Dict[str, Any]] = None,
    user_id: str = "anonymous"
) -> List[TravelOption]:
    """Convenience function for accommodation search"""
    search_request = TravelSearchRequest(
        request_id=f"search_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        booking_type=BookingType.ACCOMMODATION,
        destination=destination,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
        budget_range=budget_range,
        preferences=preferences or {},
        accessibility_needs=[],
        user_id=user_id,
        created_at=datetime.utcnow()
    )
    
    return await travel_booking_system.search_accommodations(search_request)

async def search_caravan_parks(
    destination: str,
    check_in: datetime,
    check_out: datetime,
    preferences: Optional[Dict[str, Any]] = None,
    user_id: str = "anonymous"
) -> List[TravelOption]:
    """Convenience function for caravan park search"""
    search_request = TravelSearchRequest(
        request_id=f"caravan_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        booking_type=BookingType.CARAVAN_PARKS,
        destination=destination,
        check_in=check_in,
        check_out=check_out,
        guests=2,
        budget_range=(0, 500),
        preferences=preferences or {},
        accessibility_needs=[],
        user_id=user_id,
        created_at=datetime.utcnow()
    )
    
    return await travel_booking_system.search_caravan_parks(search_request, preferences)

async def get_travel_recommendations(
    user_id: str,
    location: str,
    travel_style: str = "relaxed",
    interests: List[str] = None
) -> Dict[str, Any]:
    """Convenience function for travel recommendations"""
    return await travel_booking_system.get_travel_recommendations(
        user_id=user_id,
        location=location,
        travel_style=travel_style,
        interests=interests or []
    )