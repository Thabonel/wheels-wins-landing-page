"""
Free API Configuration for PAM Web Scraper
Provides configuration and helpers for free, no-auth-required APIs
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import hashlib
import json

class FreeAPIsConfig:
    """Configuration for free API integrations"""
    
    # API Endpoints (all free, no authentication required)
    APIS = {
        # Search & Information
        'duckduckgo': {
            'search': 'https://api.duckduckgo.com/',
            'instant': 'https://api.duckduckgo.com/',
            'images': 'https://duckduckgo.com/i.js',
            'params': {
                'format': 'json',
                'no_html': '1',
                'skip_disambig': '1'
            }
        },
        
        # Geocoding & Places
        'nominatim': {
            'search': 'https://nominatim.openstreetmap.org/search',
            'reverse': 'https://nominatim.openstreetmap.org/reverse',
            'params': {
                'format': 'json',
                'addressdetails': '1',
                'extratags': '1',
                'namedetails': '1'
            }
        },
        
        # Weather (no API key required)
        'open_meteo': {
            'forecast': 'https://api.open-meteo.com/v1/forecast',
            'historical': 'https://archive-api.open-meteo.com/v1/archive',
            'params': {
                'current_weather': 'true',
                'hourly': 'temperature_2m,precipitation,windspeed_10m',
                'daily': 'temperature_2m_max,temperature_2m_min,precipitation_sum',
                'timezone': 'auto'
            }
        },
        
        # Australian Fuel Prices
        'fuel_australia': {
            'nsw': 'https://api.onegov.nsw.gov.au/FuelCheck/v1/fuel/prices',
            'wa': 'https://www.fuelwatch.wa.gov.au/fuelwatch/fuelWatchRSS',
            'params': {
                'format': 'json'
            }
        },
        
        # US Recreation & Camping
        'recreation_gov': {
            'facilities': 'https://ridb.recreation.gov/api/v1/facilities',
            'campsites': 'https://ridb.recreation.gov/api/v1/campsites',
            'activities': 'https://ridb.recreation.gov/api/v1/activities',
            'params': {
                'limit': 50,
                'offset': 0
            }
        },
        
        # Country Information
        'rest_countries': {
            'all': 'https://restcountries.com/v3.1/all',
            'name': 'https://restcountries.com/v3.1/name/',
            'code': 'https://restcountries.com/v3.1/alpha/',
            'params': {
                'fields': 'name,capital,region,subregion,languages,currencies,timezones,borders'
            }
        },
        
        # Exchange Rates
        'exchange_rates': {
            'latest': 'https://api.exchangerate-api.com/v4/latest/',
            'params': {}
        },
        
        # USGS Data (earthquakes, geological)
        'usgs': {
            'earthquakes': 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
            'params': {}
        },
        
        # News & Content
        'wikipedia': {
            'search': 'https://en.wikipedia.org/w/api.php',
            'content': 'https://en.wikipedia.org/w/api.php',
            'params': {
                'format': 'json',
                'action': 'opensearch'
            }
        },
        
        # Public Transportation
        'transit_land': {
            'stops': 'https://transit.land/api/v2/rest/stops',
            'routes': 'https://transit.land/api/v2/rest/routes',
            'params': {
                'per_page': 50
            }
        }
    }
    
    # Query routing rules
    QUERY_ROUTES = {
        'weather': ['open_meteo', 'nominatim'],
        'camping': ['recreation_gov', 'nominatim', 'duckduckgo'],
        'fuel': ['fuel_australia', 'nominatim'],
        'location': ['nominatim', 'open_meteo'],
        'country': ['rest_countries', 'wikipedia'],
        'currency': ['exchange_rates', 'rest_countries'],
        'earthquake': ['usgs'],
        'transit': ['transit_land', 'nominatim'],
        'general': ['duckduckgo', 'wikipedia']
    }
    
    # Cache TTL settings (in seconds)
    CACHE_TTL = {
        'weather': 1800,  # 30 minutes
        'fuel': 3600,  # 1 hour
        'geocoding': 86400,  # 24 hours
        'country': 604800,  # 1 week
        'general': 3600,  # 1 hour
        'default': 3600  # 1 hour
    }
    
    @classmethod
    def get_api_url(cls, api_name: str, endpoint: str = None) -> str:
        """Get API URL for a specific service"""
        if api_name not in cls.APIS:
            raise ValueError(f"Unknown API: {api_name}")
        
        api_config = cls.APIS[api_name]
        
        if endpoint and endpoint in api_config:
            return api_config[endpoint]
        elif 'search' in api_config:
            return api_config['search']
        else:
            # Return first endpoint found
            for key, value in api_config.items():
                if key != 'params' and isinstance(value, str):
                    return value
        
        raise ValueError(f"No valid endpoint found for {api_name}")
    
    @classmethod
    def get_default_params(cls, api_name: str) -> Dict[str, Any]:
        """Get default parameters for an API"""
        if api_name not in cls.APIS:
            return {}
        return cls.APIS[api_name].get('params', {}).copy()
    
    @classmethod
    def route_query(cls, query: str) -> List[str]:
        """Determine which APIs to use based on query content"""
        query_lower = query.lower()
        
        # Check for specific keywords
        for keyword, apis in cls.QUERY_ROUTES.items():
            if keyword in query_lower:
                return apis
        
        # Default to general search
        return cls.QUERY_ROUTES['general']
    
    @classmethod
    def get_cache_ttl(cls, query_type: str) -> int:
        """Get cache TTL for a query type"""
        return cls.CACHE_TTL.get(query_type, cls.CACHE_TTL['default'])
    
    @classmethod
    def get_cache_key(cls, api_name: str, params: Dict[str, Any]) -> str:
        """Generate cache key for API request"""
        # Sort params for consistent hashing
        sorted_params = json.dumps(params, sort_keys=True)
        key_string = f"{api_name}:{sorted_params}"
        return hashlib.md5(key_string.encode()).hexdigest()
    
    @classmethod
    def parse_duckduckgo_instant(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse DuckDuckGo instant answer response"""
        results = {
            'source': 'duckduckgo',
            'type': data.get('Type', 'unknown'),
            'results': []
        }
        
        # Abstract text (main answer)
        if data.get('Abstract'):
            results['results'].append({
                'title': data.get('Heading', 'Answer'),
                'description': data['Abstract'],
                'url': data.get('AbstractURL', ''),
                'source': data.get('AbstractSource', '')
            })
        
        # Definition
        if data.get('Definition'):
            results['results'].append({
                'title': 'Definition',
                'description': data['Definition'],
                'url': data.get('DefinitionURL', ''),
                'source': data.get('DefinitionSource', '')
            })
        
        # Answer (for calculations, conversions, etc.)
        if data.get('Answer'):
            results['results'].append({
                'title': 'Direct Answer',
                'description': data['Answer'],
                'type': data.get('AnswerType', 'calculation')
            })
        
        # Related topics
        for topic in data.get('RelatedTopics', [])[:5]:
            if isinstance(topic, dict) and topic.get('Text'):
                results['results'].append({
                    'title': topic.get('Text', '').split(' - ')[0] if ' - ' in topic.get('Text', '') else 'Related',
                    'description': topic.get('Text', ''),
                    'url': topic.get('FirstURL', '')
                })
        
        # Infobox data
        if data.get('Infobox'):
            infobox = data['Infobox']
            if infobox.get('content'):
                for item in infobox['content'][:3]:
                    if item.get('label') and item.get('value'):
                        results['results'].append({
                            'title': item['label'],
                            'description': item['value'],
                            'type': 'infobox'
                        })
        
        return results
    
    @classmethod
    def parse_nominatim_results(cls, data: List[Dict[str, Any]], max_results: int = 5) -> Dict[str, Any]:
        """Parse Nominatim geocoding results"""
        results = {
            'source': 'nominatim',
            'type': 'geocoding',
            'results': []
        }
        
        for item in data[:max_results]:
            result = {
                'title': item.get('display_name', ''),
                'type': item.get('type', ''),
                'class': item.get('class', ''),
                'importance': item.get('importance', 0),
                'lat': float(item.get('lat', 0)),
                'lon': float(item.get('lon', 0)),
                'boundingbox': item.get('boundingbox', []),
                'address': {}
            }
            
            # Extract address components
            if item.get('address'):
                result['address'] = {
                    'road': item['address'].get('road', ''),
                    'suburb': item['address'].get('suburb', ''),
                    'city': item['address'].get('city', item['address'].get('town', '')),
                    'state': item['address'].get('state', ''),
                    'postcode': item['address'].get('postcode', ''),
                    'country': item['address'].get('country', '')
                }
            
            # Extra tags (opening hours, website, etc.)
            if item.get('extratags'):
                result['extra'] = {
                    'website': item['extratags'].get('website', ''),
                    'opening_hours': item['extratags'].get('opening_hours', ''),
                    'phone': item['extratags'].get('phone', ''),
                    'cuisine': item['extratags'].get('cuisine', '')
                }
            
            results['results'].append(result)
        
        return results
    
    @classmethod
    def parse_open_meteo_weather(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Open-Meteo weather data"""
        results = {
            'source': 'open_meteo',
            'type': 'weather',
            'location': {
                'latitude': data.get('latitude', 0),
                'longitude': data.get('longitude', 0),
                'elevation': data.get('elevation', 0),
                'timezone': data.get('timezone', '')
            },
            'current': {},
            'forecast': []
        }
        
        # Current weather
        if data.get('current_weather'):
            current = data['current_weather']
            results['current'] = {
                'temperature': current.get('temperature', 0),
                'windspeed': current.get('windspeed', 0),
                'winddirection': current.get('winddirection', 0),
                'weathercode': current.get('weathercode', 0),
                'time': current.get('time', '')
            }
        
        # Daily forecast
        if data.get('daily'):
            daily = data['daily']
            times = daily.get('time', [])
            max_temps = daily.get('temperature_2m_max', [])
            min_temps = daily.get('temperature_2m_min', [])
            precipitation = daily.get('precipitation_sum', [])
            
            for i in range(min(7, len(times))):  # 7-day forecast
                results['forecast'].append({
                    'date': times[i] if i < len(times) else '',
                    'temperature_max': max_temps[i] if i < len(max_temps) else 0,
                    'temperature_min': min_temps[i] if i < len(min_temps) else 0,
                    'precipitation': precipitation[i] if i < len(precipitation) else 0
                })
        
        return results
    
    @classmethod
    def format_for_pam(cls, api_results: Dict[str, Any], query: str) -> str:
        """Format API results for PAM's response"""
        source = api_results.get('source', 'unknown')
        result_type = api_results.get('type', 'general')
        
        if source == 'duckduckgo':
            if not api_results.get('results'):
                return f"No specific information found for '{query}'."
            
            response = []
            for result in api_results['results'][:3]:
                if result.get('type') == 'calculation':
                    response.append(f"Answer: {result['description']}")
                else:
                    title = result.get('title', '')
                    desc = result.get('description', '')
                    if title and desc:
                        response.append(f"{title}: {desc}")
            
            return '\n\n'.join(response)
        
        elif source == 'nominatim':
            if not api_results.get('results'):
                return f"No locations found for '{query}'."
            
            response = []
            for result in api_results['results'][:3]:
                name = result.get('title', '')
                place_type = result.get('type', '').replace('_', ' ').title()
                address = result.get('address', {})
                
                location_str = f"{name}"
                if place_type:
                    location_str += f" ({place_type})"
                
                # Add address details
                if address:
                    addr_parts = []
                    if address.get('road'):
                        addr_parts.append(address['road'])
                    if address.get('city'):
                        addr_parts.append(address['city'])
                    if address.get('state'):
                        addr_parts.append(address['state'])
                    if address.get('country'):
                        addr_parts.append(address['country'])
                    
                    if addr_parts:
                        location_str += f"\nAddress: {', '.join(addr_parts)}"
                
                # Add coordinates for mapping
                if result.get('lat') and result.get('lon'):
                    location_str += f"\nCoordinates: {result['lat']:.4f}, {result['lon']:.4f}"
                
                response.append(location_str)
            
            return '\n\n'.join(response)
        
        elif source == 'open_meteo':
            location = api_results.get('location', {})
            current = api_results.get('current', {})
            forecast = api_results.get('forecast', [])
            
            response = []
            
            # Current conditions
            if current:
                temp = current.get('temperature', 0)
                wind = current.get('windspeed', 0)
                response.append(f"Current Weather:\nTemperature: {temp}°C\nWind Speed: {wind} km/h")
            
            # Forecast
            if forecast:
                response.append("\n7-Day Forecast:")
                for day in forecast[:7]:
                    date = day.get('date', '')
                    max_temp = day.get('temperature_max', 0)
                    min_temp = day.get('temperature_min', 0)
                    precip = day.get('precipitation', 0)
                    response.append(f"{date}: {min_temp}°C - {max_temp}°C, Precipitation: {precip}mm")
            
            return '\n'.join(response)
        
        # Generic fallback
        return f"Found information from {source} about '{query}'."