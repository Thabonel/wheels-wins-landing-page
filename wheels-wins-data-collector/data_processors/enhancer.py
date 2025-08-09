"""
Data Enhancer

Enhances location data using AI and additional sources:
- Generates missing descriptions using AI
- Enriches with additional metadata
- Standardizes data formats
- Adds semantic tags and categories
- Improves search optimization
"""

import logging
from typing import List, Dict, Optional
import asyncio
from datetime import datetime
import json
import re

logger = logging.getLogger(__name__)

class DataEnhancer:
    """Service for enhancing location data with AI and additional sources"""
    
    def __init__(self, sources_config: Dict):
        self.sources_config = sources_config
        
        # Enhancement configuration
        self.enhancement_config = sources_config.get('processing', {}).get('ai_enhancement', {})
        self.ai_enabled = self.enhancement_config.get('enabled', True)
        self.max_description_length = self.enhancement_config.get('description_max_length', 300)
        
        # OpenAI configuration (would be used for real AI enhancement)
        self.openai_key = sources_config.get('api_keys', {}).get('openai_key')
        
        # Standard tags and categories
        self.standard_tags = self._load_standard_tags()
        self.standard_amenities = self._load_standard_amenities()
    
    def _load_standard_tags(self) -> Dict:
        """Load standardized tags for each location type"""
        return {
            'national_parks': [
                'nature', 'outdoors', 'hiking', 'wildlife', 'scenic',
                'conservation', 'protected_area', 'trails', 'camping'
            ],
            'camping_spots': [
                'camping', 'outdoors', 'rv', 'tent', 'campfire',
                'nature', 'budget_travel', 'adventure'
            ],
            'attractions': [
                'tourism', 'sightseeing', 'landmark', 'culture',
                'history', 'entertainment', 'family_friendly'
            ],
            'swimming_spots': [
                'swimming', 'water', 'beach', 'recreation',
                'summer', 'family_friendly', 'outdoors'
            ]
        }
    
    def _load_standard_amenities(self) -> Dict:
        """Load standardized amenity mappings"""
        return {
            'restroom': ['toilet', 'bathroom', 'restrooms', 'wc', 'lavatory'],
            'drinking_water': ['water', 'potable_water', 'tap', 'fountain'],
            'electricity': ['power', 'electric', 'hookup', 'plug'],
            'wifi': ['internet', 'wi-fi', 'wireless'],
            'parking': ['car_park', 'parking_lot', 'vehicle_access'],
            'picnic_area': ['picnic', 'tables', 'bbq', 'barbecue'],
            'shower': ['showers', 'bathroom_facilities'],
            'dump_station': ['waste', 'sanitary', 'dump_point'],
            'playground': ['kids_area', 'children', 'play_area'],
            'pet_friendly': ['dogs_allowed', 'pets', 'animals_ok']
        }
    
    async def enhance_batch(self, locations: List[Dict]) -> List[Dict]:
        """Enhance a batch of locations"""
        
        if not locations:
            return locations
        
        logger.info(f"Enhancing {len(locations)} locations")
        
        enhanced_locations = []
        
        # Process in batches for efficiency
        batch_size = 10
        for i in range(0, len(locations), batch_size):
            batch = locations[i:i + batch_size]
            
            # Enhance each location in the batch
            enhanced_batch = await asyncio.gather(
                *[self.enhance_location(location) for location in batch]
            )
            
            enhanced_locations.extend(enhanced_batch)
            
            # Log progress
            if (i + batch_size) % 100 == 0:
                logger.info(f"Enhanced {i + batch_size}/{len(locations)} locations")
        
        logger.info(f"Enhancement complete for {len(enhanced_locations)} locations")
        
        return enhanced_locations
    
    async def enhance_location(self, location: Dict) -> Dict:
        """Enhance a single location"""
        
        enhanced = location.copy()
        
        # Add enhancement timestamp
        enhanced['enhancement'] = {
            'enhanced_at': datetime.now().isoformat(),
            'enhancements_applied': []
        }
        
        # Apply various enhancements
        enhanced = await self._enhance_description(enhanced)
        enhanced = self._standardize_amenities(enhanced)
        enhanced = self._add_semantic_tags(enhanced)
        enhanced = self._improve_naming(enhanced)
        enhanced = self._add_search_keywords(enhanced)
        enhanced = self._standardize_data_formats(enhanced)
        enhanced = self._add_accessibility_info(enhanced)
        enhanced = self._add_seasonal_info(enhanced)
        
        return enhanced
    
    async def _enhance_description(self, location: Dict) -> Dict:
        """Enhance or generate description using AI"""
        
        description = location.get('description', '').strip()
        
        # Check if description needs enhancement
        needs_generation = not description
        needs_enhancement = (
            description and 
            len(description) < 50 and 
            self.enhancement_config.get('enhance_existing_descriptions', False)
        )
        
        if not (needs_generation or needs_enhancement):
            return location
        
        # Generate or enhance description
        if self.ai_enabled and self.openai_key:
            # In real implementation, this would call OpenAI API
            # For now, generate a template-based description
            enhanced_description = self._generate_template_description(location)
        else:
            enhanced_description = self._generate_template_description(location)
        
        if enhanced_description:
            location['description'] = enhanced_description
            location['enhancement']['enhancements_applied'].append('description_generated')
        
        return location
    
    def _generate_template_description(self, location: Dict) -> str:
        """Generate a template-based description when AI is not available"""
        
        name = location.get('name', 'This location')
        data_type = location.get('data_type', 'location')
        country = location.get('country', '')
        state = location.get('state_province', '')
        
        # Type-specific templates
        templates = {
            'national_parks': (
                f"{name} is a stunning national park located in {state}, {country}. "
                f"This protected area offers visitors the chance to experience pristine natural beauty, "
                f"diverse wildlife, and numerous outdoor activities. The park features well-maintained trails, "
                f"scenic viewpoints, and opportunities for camping and wildlife observation."
            ),
            'camping_spots': (
                f"{name} is a {'free' if location.get('is_free') else 'paid'} camping area in {state}, {country}. "
                f"This {'RV-friendly' if location.get('rv_accessible') else ''} site provides campers with "
                f"{'basic' if location.get('is_free') else 'full'} amenities and access to the surrounding natural area. "
                f"It's an ideal spot for outdoor enthusiasts looking to experience the local wilderness."
            ),
            'attractions': (
                f"{name} is a popular tourist attraction in {state}, {country}. "
                f"Visitors can enjoy {'this ' + location.get('attraction_type', 'attraction').replace('_', ' ')} "
                f"which offers a unique glimpse into the local culture and history. "
                f"The site is {'easily accessible' if location.get('rv_accessible') else 'worth the journey'} "
                f"and provides a memorable experience for travelers of all ages."
            ),
            'swimming_spots': (
                f"{name} is a beautiful {location.get('swimming_type', 'swimming spot').replace('_', ' ')} "
                f"located in {state}, {country}. This {location.get('water_type', 'water')} location "
                f"offers refreshing swimming opportunities in a natural setting. "
                f"{'Facilities are available' if location.get('facilities') else 'It offers a natural swimming experience'} "
                f"for visitors looking to cool off and enjoy the water."
            )
        }
        
        template = templates.get(data_type, f"{name} is a location in {state}, {country}.")
        
        # Clean up template
        template = re.sub(r'\s+', ' ', template)  # Remove extra spaces
        template = template.replace(' ,', ',')  # Fix comma spacing
        
        # Truncate if too long
        if len(template) > self.max_description_length:
            template = template[:self.max_description_length - 3] + '...'
        
        return template
    
    def _standardize_amenities(self, location: Dict) -> Dict:
        """Standardize amenity names and format"""
        
        amenities = location.get('amenities', {})
        
        if not amenities or not isinstance(amenities, dict):
            return location
        
        standardized_amenities = {}
        
        # Map to standard amenity names
        for amenity, value in amenities.items():
            amenity_lower = amenity.lower()
            standardized_name = amenity
            
            # Find standard name
            for standard, variations in self.standard_amenities.items():
                if amenity_lower == standard or amenity_lower in variations:
                    standardized_name = standard
                    break
            
            standardized_amenities[standardized_name] = value
        
        # Add inferred amenities
        if location.get('data_type') == 'camping_spots':
            if location.get('is_free'):
                standardized_amenities['free_camping'] = True
            if location.get('rv_accessible'):
                standardized_amenities['rv_accessible'] = True
        
        location['amenities'] = standardized_amenities
        
        if standardized_amenities != amenities:
            location['enhancement']['enhancements_applied'].append('amenities_standardized')
        
        return location
    
    def _add_semantic_tags(self, location: Dict) -> Dict:
        """Add semantic tags for better searchability"""
        
        existing_tags = location.get('tags', [])
        data_type = location.get('data_type', '')
        
        # Start with type-specific tags
        semantic_tags = list(self.standard_tags.get(data_type, []))
        
        # Add location-specific tags
        if location.get('is_free'):
            semantic_tags.extend(['free', 'budget', 'no_cost'])
        
        if location.get('rv_accessible'):
            semantic_tags.extend(['rv_friendly', 'motorhome', 'caravan'])
        
        if location.get('swimming_type'):
            swimming_type = location['swimming_type']
            if 'beach' in swimming_type:
                semantic_tags.extend(['beach', 'ocean', 'coast'])
            elif 'lake' in swimming_type:
                semantic_tags.extend(['lake', 'freshwater'])
            elif 'waterfall' in swimming_type:
                semantic_tags.extend(['waterfall', 'cascade'])
        
        # Add activity-based tags
        activities = location.get('activities', [])
        for activity in activities:
            activity_lower = activity.lower()
            if 'hik' in activity_lower:
                semantic_tags.extend(['hiking', 'trails', 'walking'])
            elif 'swim' in activity_lower:
                semantic_tags.extend(['swimming', 'water_sports'])
            elif 'camp' in activity_lower:
                semantic_tags.extend(['camping', 'overnight'])
            elif 'fish' in activity_lower:
                semantic_tags.extend(['fishing', 'angling'])
        
        # Combine with existing tags
        all_tags = list(set(existing_tags + semantic_tags))
        
        location['tags'] = all_tags
        location['enhancement']['enhancements_applied'].append('semantic_tags_added')
        
        return location
    
    def _improve_naming(self, location: Dict) -> Dict:
        """Improve location naming consistency"""
        
        name = location.get('name', '')
        if not name:
            return location
        
        original_name = name
        
        # Title case formatting
        name = self._smart_title_case(name)
        
        # Remove redundant suffixes
        redundant_suffixes = [
            ' - Australia', ' - New Zealand', ' - Canada', 
            ' - United States', ' - Great Britain', ' - UK'
        ]
        for suffix in redundant_suffixes:
            if name.endswith(suffix):
                name = name[:-len(suffix)]
        
        # Standardize common abbreviations
        abbreviations = {
            'Natl': 'National',
            'Nat\'l': 'National',
            'St': 'State',
            'Mt': 'Mount',
            'Mtn': 'Mountain',
            'Pk': 'Park',
            'Rec': 'Recreation',
            'Cmpgrd': 'Campground',
            'Cg': 'Campground'
        }
        
        for abbr, full in abbreviations.items():
            name = re.sub(r'\b' + abbr + r'\b', full, name)
        
        if name != original_name:
            location['name'] = name
            location['original_name'] = original_name
            location['enhancement']['enhancements_applied'].append('name_improved')
        
        return location
    
    def _smart_title_case(self, text: str) -> str:
        """Apply smart title case formatting"""
        
        # Words that should remain lowercase
        lowercase_words = {
            'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for',
            'from', 'in', 'into', 'of', 'on', 'or', 'the', 'to',
            'with', 'via', 'de', 'del', 'la', 'las', 'los'
        }
        
        # Words that should remain uppercase
        uppercase_words = {'RV', 'USA', 'UK', 'NSW', 'QLD', 'VIC', 'WA', 'SA', 'NT', 'ACT', 'NZ'}
        
        words = text.split()
        titled_words = []
        
        for i, word in enumerate(words):
            # First and last words are always capitalized
            if i == 0 or i == len(words) - 1:
                titled_words.append(word.capitalize())
            elif word.upper() in uppercase_words:
                titled_words.append(word.upper())
            elif word.lower() in lowercase_words:
                titled_words.append(word.lower())
            else:
                titled_words.append(word.capitalize())
        
        return ' '.join(titled_words)
    
    def _add_search_keywords(self, location: Dict) -> Dict:
        """Add search keywords for better discoverability"""
        
        keywords = []
        
        # Extract keywords from name
        name = location.get('name', '')
        name_words = re.findall(r'\w+', name.lower())
        keywords.extend(name_words)
        
        # Extract keywords from description
        description = location.get('description', '')
        if description:
            # Get important words (excluding common words)
            desc_words = re.findall(r'\w{4,}', description.lower())
            keywords.extend(desc_words[:10])  # Limit to avoid bloat
        
        # Add location keywords
        keywords.append(location.get('country', '').lower())
        keywords.append(location.get('state_province', '').lower())
        
        # Add type keywords
        data_type = location.get('data_type', '').replace('_', ' ')
        keywords.extend(data_type.split())
        
        # Remove duplicates and empty strings
        keywords = list(set(filter(None, keywords)))
        
        location['search_keywords'] = keywords
        location['enhancement']['enhancements_applied'].append('search_keywords_added')
        
        return location
    
    def _standardize_data_formats(self, location: Dict) -> Dict:
        """Standardize various data formats"""
        
        # Standardize country names
        country_mapping = {
            'usa': 'united_states',
            'us': 'united_states',
            'uk': 'great_britain',
            'gb': 'great_britain',
            'nz': 'new_zealand',
            'aus': 'australia',
            'ca': 'canada'
        }
        
        country = location.get('country', '').lower()
        if country in country_mapping:
            location['country'] = country_mapping[country]
        
        # Standardize boolean fields
        boolean_fields = ['is_free', 'rv_accessible', 'reservations_required', 'pet_friendly']
        for field in boolean_fields:
            if field in location:
                value = location[field]
                if isinstance(value, str):
                    location[field] = value.lower() in ['true', 'yes', '1', 'y']
        
        # Standardize price fields
        price_fields = ['price_per_night', 'cost_per_night', 'entrance_fee']
        for field in price_fields:
            if field in location and location[field] is not None:
                try:
                    # Convert to float and ensure it's positive
                    location[field] = abs(float(location[field]))
                except (ValueError, TypeError):
                    # If can't convert, remove the field
                    del location[field]
        
        location['enhancement']['enhancements_applied'].append('data_formats_standardized')
        
        return location
    
    def _add_accessibility_info(self, location: Dict) -> Dict:
        """Add or enhance accessibility information"""
        
        accessibility = location.get('accessibility', {})
        
        if not isinstance(accessibility, dict):
            accessibility = {}
        
        # Infer accessibility from other fields
        if location.get('rv_accessible'):
            accessibility['rv_accessible'] = True
            accessibility['vehicle_accessible'] = True
        
        # Check amenities for accessibility features
        amenities = location.get('amenities', {})
        if amenities.get('wheelchair_access') or amenities.get('accessible_facilities'):
            accessibility['wheelchair_accessible'] = True
        
        if amenities.get('paved_paths') or amenities.get('boardwalk'):
            accessibility['mobility_friendly'] = True
        
        # Add based on location type
        data_type = location.get('data_type', '')
        if data_type == 'public_pool':
            accessibility['lifeguard_available'] = True
            accessibility['shallow_area'] = True
        
        if accessibility:
            location['accessibility'] = accessibility
            location['enhancement']['enhancements_applied'].append('accessibility_info_added')
        
        return location
    
    def _add_seasonal_info(self, location: Dict) -> Dict:
        """Add seasonal information based on location and type"""
        
        seasonal_info = location.get('seasonal_info', {})
        
        if not isinstance(seasonal_info, dict):
            seasonal_info = {}
        
        # Add seasonal info based on country and type
        country = location.get('country', '')
        data_type = location.get('data_type', '')
        
        # Swimming spots seasonal info
        if data_type == 'swimming_spots':
            if country in ['australia', 'new_zealand']:
                seasonal_info['best_season'] = 'December to March'
                seasonal_info['water_temp_range'] = '18-25°C'
            elif country in ['canada', 'united_states']:
                seasonal_info['best_season'] = 'June to September'
                seasonal_info['water_temp_range'] = '15-22°C'
            elif country == 'great_britain':
                seasonal_info['best_season'] = 'June to August'
                seasonal_info['water_temp_range'] = '12-18°C'
        
        # Camping seasonal info
        elif data_type == 'camping_spots':
            latitude = location.get('latitude', 0)
            
            # Northern hemisphere
            if latitude > 0:
                if latitude > 50:  # Far north
                    seasonal_info['peak_season'] = 'June to August'
                    seasonal_info['weather_warning'] = 'Extreme cold possible October to April'
                else:  # Temperate
                    seasonal_info['peak_season'] = 'May to September'
            else:  # Southern hemisphere
                seasonal_info['peak_season'] = 'November to March'
        
        if seasonal_info:
            location['seasonal_info'] = seasonal_info
            location['enhancement']['enhancements_applied'].append('seasonal_info_added')
        
        return location