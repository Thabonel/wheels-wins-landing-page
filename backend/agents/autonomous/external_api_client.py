"""
External API Client for Trip Assistant
Handles integration with fuel, weather, and RV park APIs.
"""
import asyncio
import aiohttp
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from app.core.logging import get_logger

logger = get_logger(__name__)


class ExternalApiClient:
    """
    Client for integrating with external travel-related APIs
    """

    def __init__(self):
        """
        Initialize External API Client
        """
        self.logger = logger
        self.timeout = 10
        self.max_retries = 3
        self.rate_limit_delay = 1.0
        self.session = None

    async def _get_session(self):
        """Get or create aiohttp session"""
        if not self.session:
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            )
        return self.session

    async def _make_api_request(self, url: str, method: str = 'GET', **kwargs) -> Dict[str, Any]:
        """
        Make API request with retry logic and rate limiting

        Args:
            url: API endpoint URL
            method: HTTP method
            **kwargs: Additional request parameters

        Returns:
            API response data

        Raises:
            Exception: If all retry attempts fail
        """
        session = await self._get_session()

        for attempt in range(self.max_retries):
            try:
                async with session.request(method, url, **kwargs) as response:
                    response.raise_for_status()
                    return await response.json()

            except Exception as e:
                if attempt == self.max_retries - 1:
                    raise e

                # Wait before retry
                await asyncio.sleep(self.rate_limit_delay * (attempt + 1))

        raise Exception("Max retries exceeded")

    async def get_fuel_prices(self, location: Dict[str, float], radius: int = 25) -> Dict[str, Any]:
        """
        Get fuel prices near a location

        Args:
            location: {'lat': float, 'lng': float}
            radius: Search radius in miles

        Returns:
            Fuel price data
        """
        try:
            # For minimal implementation, return mock data structure
            # In full implementation, this would call GasBuddy API
            return {
                'stations': [
                    {
                        'name': f'Sample Station near {location["lat"]:.2f},{location["lng"]:.2f}',
                        'address': 'Sample Address',
                        'lat': location['lat'] + 0.01,
                        'lng': location['lng'] + 0.01,
                        'prices': {'regular': 3.45, 'premium': 3.85},
                        'updated': datetime.now().isoformat()
                    }
                ]
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to get fuel prices: {e}")
            return {'error': str(e), 'stations': []}

    async def get_weather_data(self, location: Dict[str, float]) -> Dict[str, Any]:
        """
        Get weather data for a location

        Args:
            location: {'lat': float, 'lng': float}

        Returns:
            Weather data
        """
        try:
            # For minimal implementation, return mock data structure
            # In full implementation, this would call weather API
            return {
                'current': {
                    'temp': 70.0,
                    'condition': 'Clear',
                    'wind_mph': 5.0,
                    'visibility': 10.0
                },
                'forecast': [
                    {
                        'date': datetime.now().strftime('%Y-%m-%d'),
                        'high': 75,
                        'low': 55,
                        'condition': 'Sunny',
                        'precipitation_chance': 10
                    }
                ],
                'alerts': []
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to get weather data: {e}")
            return {'error': str(e), 'current': {}, 'forecast': [], 'alerts': []}

    async def get_rv_parks(self, location: Dict[str, float], check_in: str, check_out: str) -> Dict[str, Any]:
        """
        Get RV park availability near a location

        Args:
            location: {'lat': float, 'lng': float}
            check_in: Check-in date (YYYY-MM-DD)
            check_out: Check-out date (YYYY-MM-DD)

        Returns:
            RV park data
        """
        try:
            # For minimal implementation, return mock data structure
            # In full implementation, this would call RV park APIs
            return {
                'parks': [
                    {
                        'name': f'Sample RV Park near {location["lat"]:.2f},{location["lng"]:.2f}',
                        'address': 'Sample Park Address',
                        'lat': location['lat'] + 0.02,
                        'lng': location['lng'] + 0.02,
                        'amenities': ['hookups', 'wifi', 'showers'],
                        'available_sites': 8,
                        'price_per_night': 45.0,
                        'rating': 4.1
                    }
                ]
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to get RV parks: {e}")
            return {'error': str(e), 'parks': []}

    async def close(self):
        """Close aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None