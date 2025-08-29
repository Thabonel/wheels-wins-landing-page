"""
Data Validator

Validates collected location data for quality and completeness:
- Required field validation
- Coordinate validation
- Data format validation
- Business logic validation
- Accessibility and safety checks
"""

import logging
from typing import List, Dict, Tuple, Optional
import re
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class DataValidator:
    """Service for validating location data quality"""
    
    def __init__(self, sources_config: Dict):
        self.sources_config = sources_config
        
        # Validation configuration
        self.required_fields = sources_config.get('processing', {}).get('required_fields', [
            'name', 'latitude', 'longitude', 'country'
        ])
        
        # Coordinate bounds for each country
        self.country_bounds = {
            'australia': {'lat': (-44, -10), 'lng': (113, 154)},
            'new_zealand': {'lat': (-47, -34), 'lng': (166, 179)},
            'canada': {'lat': (42, 84), 'lng': (-141, -52)},
            'united_states': {'lat': (19, 72), 'lng': (-180, -66)},
            'great_britain': {'lat': (49.9, 60.9), 'lng': (-8.2, 1.8)}
        }
        
        # Validation rules
        self.validation_rules = self._load_validation_rules()
    
    def _load_validation_rules(self) -> Dict:
        """Load validation rules configuration"""
        return {
            'name': {
                'min_length': 2,
                'max_length': 200,
                'invalid_patterns': [r'^test', r'^\d+$', r'^[^a-zA-Z]+$']
            },
            'description': {
                'min_length': 10,
                'max_length': 2000
            },
            'coordinates': {
                'precision_decimal_places': 4
            },
            'phone': {
                'patterns': [
                    r'^\+?\d{10,15}$',  # International format
                    r'^\(\d{3}\)\s?\d{3}-?\d{4}$',  # US format
                ]
            },
            'email': {
                'pattern': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            },
            'website': {
                'pattern': r'^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/?.*$'
            }
        }
    
    async def validate_batch(self, locations: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
        """Validate a batch of locations, returning valid and invalid lists"""
        
        if not locations:
            return [], []
        
        logger.info(f"Validating {len(locations)} locations")
        
        valid_locations = []
        invalid_locations = []
        
        for location in locations:
            validation_result = await self.validate_location(location)
            
            if validation_result['is_valid']:
                # Add validation metadata
                location['validation'] = {
                    'validated_at': datetime.now().isoformat(),
                    'quality_score': validation_result['quality_score'],
                    'warnings': validation_result['warnings']
                }
                valid_locations.append(location)
            else:
                # Add validation errors
                location['validation_errors'] = validation_result['errors']
                invalid_locations.append(location)
        
        logger.info(f"Validation complete: {len(valid_locations)} valid, {len(invalid_locations)} invalid")
        
        if invalid_locations:
            self._log_validation_failures(invalid_locations)
        
        return valid_locations, invalid_locations
    
    async def validate_location(self, location: Dict) -> Dict:
        """Validate a single location"""
        
        validation_result = {
            'is_valid': True,
            'quality_score': 0,
            'errors': [],
            'warnings': []
        }
        
        # Required fields validation
        validation_result = self._validate_required_fields(location, validation_result)
        
        # Coordinate validation
        validation_result = self._validate_coordinates(location, validation_result)
        
        # Data format validation
        validation_result = self._validate_data_formats(location, validation_result)
        
        # Business logic validation
        validation_result = self._validate_business_logic(location, validation_result)
        
        # Calculate quality score
        validation_result['quality_score'] = self._calculate_quality_score(location, validation_result)
        
        # Determine overall validity
        validation_result['is_valid'] = len(validation_result['errors']) == 0
        
        return validation_result
    
    def _validate_required_fields(self, location: Dict, result: Dict) -> Dict:
        """Validate required fields are present and not empty"""
        
        for field in self.required_fields:
            value = location.get(field)
            
            if value is None or (isinstance(value, str) and not value.strip()):
                result['errors'].append(f"Required field '{field}' is missing or empty")
            elif isinstance(value, str) and len(value.strip()) == 0:
                result['errors'].append(f"Required field '{field}' is empty")
        
        return result
    
    def _validate_coordinates(self, location: Dict, result: Dict) -> Dict:
        """Validate coordinate data"""
        
        latitude = location.get('latitude')
        longitude = location.get('longitude')
        country = location.get('country')
        
        # Check if coordinates exist and are numeric
        if latitude is None or longitude is None:
            result['errors'].append("Coordinates (latitude/longitude) are required")
            return result
        
        try:
            lat = float(latitude)
            lng = float(longitude)
        except (ValueError, TypeError):
            result['errors'].append("Coordinates must be valid numbers")
            return result
        
        # Check coordinate ranges
        if not (-90 <= lat <= 90):
            result['errors'].append(f"Latitude {lat} is out of valid range (-90 to 90)")
        
        if not (-180 <= lng <= 180):
            result['errors'].append(f"Longitude {lng} is out of valid range (-180 to 180)")
        
        # Check coordinates are within country bounds
        if country and country in self.country_bounds:
            bounds = self.country_bounds[country]
            lat_range = bounds['lat']
            lng_range = bounds['lng']
            
            if not (lat_range[0] <= lat <= lat_range[1]):
                result['warnings'].append(f"Latitude {lat} seems outside typical bounds for {country}")
            
            if not (lng_range[0] <= lng <= lng_range[1]):
                result['warnings'].append(f"Longitude {lng} seems outside typical bounds for {country}")
        
        # Check coordinate precision
        lat_precision = self._get_decimal_precision(lat)
        lng_precision = self._get_decimal_precision(lng)
        min_precision = self.validation_rules['coordinates']['precision_decimal_places']
        
        if lat_precision < min_precision or lng_precision < min_precision:
            result['warnings'].append(f"Coordinate precision is low (lat: {lat_precision}, lng: {lng_precision} decimal places)")
        
        return result
    
    def _validate_data_formats(self, location: Dict, result: Dict) -> Dict:
        """Validate data format for various fields"""
        
        # Name validation
        name = location.get('name', '')
        if name:
            name_rules = self.validation_rules['name']
            
            if len(name) < name_rules['min_length']:
                result['errors'].append(f"Name too short (minimum {name_rules['min_length']} characters)")
            elif len(name) > name_rules['max_length']:
                result['errors'].append(f"Name too long (maximum {name_rules['max_length']} characters)")
            
            # Check for invalid name patterns
            for pattern in name_rules['invalid_patterns']:
                if re.match(pattern, name, re.IGNORECASE):
                    result['warnings'].append(f"Name matches suspicious pattern: {pattern}")
        
        # Description validation
        description = location.get('description', '')
        if description:
            desc_rules = self.validation_rules['description']
            
            if len(description) < desc_rules['min_length']:
                result['warnings'].append(f"Description is very short (less than {desc_rules['min_length']} characters)")
            elif len(description) > desc_rules['max_length']:
                result['warnings'].append(f"Description is very long (more than {desc_rules['max_length']} characters)")
        
        # Phone validation
        phone = location.get('phone', '')
        if phone:
            phone_valid = False
            for pattern in self.validation_rules['phone']['patterns']:
                if re.match(pattern, phone):
                    phone_valid = True
                    break
            
            if not phone_valid:
                result['warnings'].append("Phone number format appears invalid")
        
        # Email validation
        email = location.get('email', '')
        if email:
            email_pattern = self.validation_rules['email']['pattern']
            if not re.match(email_pattern, email):
                result['warnings'].append("Email format appears invalid")
        
        # Website validation
        website = location.get('website', '') or location.get('official_website', '')
        if website:
            website_pattern = self.validation_rules['website']['pattern']
            if not re.match(website_pattern, website):
                result['warnings'].append("Website URL format appears invalid")
        
        return result
    
    def _validate_business_logic(self, location: Dict, result: Dict) -> Dict:
        """Validate business logic and consistency"""
        
        data_type = location.get('data_type', '')
        
        # Type-specific validation
        if data_type == 'camping_spots':
            result = self._validate_camping_spot(location, result)
        elif data_type == 'national_parks':
            result = self._validate_national_park(location, result)
        elif data_type == 'attractions':
            result = self._validate_attraction(location, result)
        elif data_type == 'swimming_spots':
            result = self._validate_swimming_spot(location, result)
        
        # Price validation
        price = location.get('price_per_night') or location.get('cost_per_night')
        is_free = location.get('is_free', False)
        
        if is_free and price and float(price) > 0:
            result['warnings'].append("Location marked as free but has a price listed")
        elif not is_free and price and float(price) == 0:
            result['warnings'].append("Location not marked as free but price is 0")
        
        # Accessibility validation
        rv_accessible = location.get('rv_accessible')
        if rv_accessible is None:
            result['warnings'].append("RV accessibility not specified")
        
        return result
    
    def _validate_camping_spot(self, location: Dict, result: Dict) -> Dict:
        """Validate camping spot specific fields"""
        
        camping_type = location.get('camping_type', '')
        if not camping_type:
            result['warnings'].append("Camping type not specified")
        
        # Validate amenities structure
        amenities = location.get('amenities', {})
        if amenities and not isinstance(amenities, dict):
            result['warnings'].append("Amenities should be a dictionary/object")
        
        # Check for essential camping amenities
        if isinstance(amenities, dict):
            essential_amenities = ['water', 'toilets']
            for amenity in essential_amenities:
                if amenity not in amenities:
                    result['warnings'].append(f"Essential amenity '{amenity}' not specified")
        
        return result
    
    def _validate_national_park(self, location: Dict, result: Dict) -> Dict:
        """Validate national park specific fields"""
        
        # Parks should typically have descriptions
        if not location.get('description'):
            result['warnings'].append("National park missing description")
        
        # Parks should have activities
        activities = location.get('activities', [])
        if not activities or len(activities) == 0:
            result['warnings'].append("National park has no activities listed")
        
        # Validate entrance fees structure
        entrance_fees = location.get('entrance_fees', {})
        if entrance_fees and not isinstance(entrance_fees, dict):
            result['warnings'].append("Entrance fees should be a dictionary/object")
        
        return result
    
    def _validate_attraction(self, location: Dict, result: Dict) -> Dict:
        """Validate attraction specific fields"""
        
        attraction_type = location.get('attraction_type', '')
        if not attraction_type:
            result['warnings'].append("Attraction type not specified")
        
        # Validate rating if present
        rating = location.get('rating')
        if rating is not None:
            try:
                rating_float = float(rating)
                if not (0 <= rating_float <= 5):
                    result['warnings'].append("Rating should be between 0 and 5")
            except (ValueError, TypeError):
                result['warnings'].append("Rating should be a number")
        
        return result
    
    def _validate_swimming_spot(self, location: Dict, result: Dict) -> Dict:
        """Validate swimming spot specific fields"""
        
        swimming_type = location.get('swimming_type', '')
        if not swimming_type:
            result['warnings'].append("Swimming type not specified")
        
        water_type = location.get('water_type', '')
        if not water_type:
            result['warnings'].append("Water type not specified")
        
        # Validate water type values
        valid_water_types = ['saltwater', 'freshwater', 'chlorinated', 'mineral', 'thermal']
        if water_type and water_type not in valid_water_types:
            result['warnings'].append(f"Water type '{water_type}' is not a standard value")
        
        return result
    
    def _calculate_quality_score(self, location: Dict, result: Dict) -> int:
        """Calculate a quality score from 0-100 based on data completeness"""
        
        score = 100
        
        # Deduct points for errors (major issues)
        score -= len(result['errors']) * 20
        
        # Deduct points for warnings (minor issues)
        score -= len(result['warnings']) * 5
        
        # Add points for data completeness
        optional_fields = [
            'description', 'phone', 'email', 'website', 'address',
            'opening_hours', 'amenities', 'activities', 'images'
        ]
        
        present_optional_fields = sum(1 for field in optional_fields if location.get(field))
        completeness_bonus = (present_optional_fields / len(optional_fields)) * 20
        score += completeness_bonus
        
        # Add points for source reliability
        data_source = location.get('data_source', '')
        source_reliability = self.sources_config.get('source_reliability', {}).get(data_source, 5)
        reliability_bonus = (source_reliability / 10) * 10
        score += reliability_bonus
        
        # Ensure score is within bounds
        return max(0, min(100, int(score)))
    
    def _get_decimal_precision(self, number: float) -> int:
        """Get the number of decimal places in a number"""
        
        number_str = str(number)
        if '.' in number_str:
            return len(number_str.split('.')[1])
        return 0
    
    def _log_validation_failures(self, invalid_locations: List[Dict]):
        """Log validation failures for analysis"""
        
        error_summary = {}
        warning_summary = {}
        
        for location in invalid_locations:
            errors = location.get('validation_errors', [])
            
            for error in errors:
                error_summary[error] = error_summary.get(error, 0) + 1
        
        logger.info("Validation failure summary:")
        for error, count in sorted(error_summary.items(), key=lambda x: x[1], reverse=True):
            logger.info(f"  {error}: {count} locations")
    
    def get_validation_stats(self, locations: List[Dict]) -> Dict:
        """Generate validation statistics for a dataset"""
        
        if not locations:
            return {}
        
        total_locations = len(locations)
        valid_count = sum(1 for loc in locations if loc.get('validation', {}).get('quality_score', 0) > 0)
        
        quality_scores = [loc.get('validation', {}).get('quality_score', 0) for loc in locations]
        avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0
        
        # Count completeness
        completeness_stats = {}
        fields_to_check = ['description', 'phone', 'email', 'website', 'images', 'amenities']
        
        for field in fields_to_check:
            count = sum(1 for loc in locations if loc.get(field))
            completeness_stats[field] = {
                'count': count,
                'percentage': (count / total_locations) * 100
            }
        
        return {
            'total_locations': total_locations,
            'valid_locations': valid_count,
            'validation_rate': (valid_count / total_locations) * 100,
            'average_quality_score': round(avg_quality, 1),
            'field_completeness': completeness_stats
        }