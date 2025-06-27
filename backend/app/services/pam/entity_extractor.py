import re
from typing import Dict, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class EntityExtractor:
    """Extracts entities from user messages for better intent classification"""
    
    def __init__(self):
        # Location patterns
        self.location_patterns = {
            'from_to': r'(?:from\s+)([a-zA-Z\s]+?)(?:\s+to\s+)([a-zA-Z\s]+)',
            'city_names': r'\b(brisbane|sydney|melbourne|perth|adelaide|darwin|cairns|townsville|gold coast|sunshine coast|byron bay|port douglas|alice springs|broome|margaret river|hunter valley)\b',
            'state_names': r'\b(queensland|qld|new south wales|nsw|victoria|vic|south australia|sa|western australia|wa|tasmania|tas|northern territory|nt|act)\b',
            'generic_location': r'(?:in|at|near|around)\s+([a-zA-Z\s]+)',
            'postcode': r'\b(\d{4})\b'
        }
        
        # Budget patterns
        self.budget_patterns = {
            'exact_amount': r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)',
            'under_amount': r'(?:under|less than|below)\s*\$?(\d+(?:,\d{3})*)',
            'over_amount': r'(?:over|more than|above)\s*\$?(\d+(?:,\d{3})*)',
            'range': r'\$?(\d+)(?:\s*(?:to|-)\s*)\$?(\d+)',
            'budget_keywords': r'(?:budget|spend|cost|price|afford|cheap|expensive)'
        }
        
        # Time patterns
        self.time_patterns = {
            'specific_date': r'(?:on\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:\s+\d{4})?)',
            'relative_days': r'(?:in\s+)?(\d+)\s+days?',
            'relative_weeks': r'(?:in\s+)?(\d+)\s+weeks?',
            'relative_months': r'(?:in\s+)?(\d+)\s+months?',
            'next_period': r'next\s+(week|month|year|weekend)',
            'this_period': r'this\s+(week|month|year|weekend)',
            'soon': r'\b(soon|asap|quickly|urgent|immediately)\b',
            'timeframe_keywords': r'\b(today|tomorrow|yesterday|tonight|morning|afternoon|evening)\b'
        }
        
        # Vehicle patterns
        self.vehicle_patterns = {
            'vehicle_types': r'\b(caravan|motorhome|rv|camper\s*trailer|fifth\s*wheeler|pop\s*top|tent|van|truck|car)\b',
            'possessive_vehicle': r'(?:my|our|the)\s+(caravan|motorhome|rv|camper|van|truck|car)',
            'vehicle_brands': r'\b(jayco|winnebago|roadstar|coromal|crusader|nova|goldstream|retreat|leader|bushtracker|trackvan)\b',
            'vehicle_concerns': r'\b(breakdown|repair|service|maintenance|fuel|diesel|petrol|battery|tyres|engine|transmission)\b'
        }

    def extract_entities(self, message: str) -> Dict[str, Any]:
        """Extract all entities from a message"""
        message_lower = message.lower()
        entities = {
            'locations': self._extract_locations(message, message_lower),
            'budget': self._extract_budget(message, message_lower),
            'timeframe': self._extract_timeframe(message, message_lower),
            'vehicle': self._extract_vehicle(message, message_lower),
            'has_entities': False
        }
        
        # Check if any entities were found
        entities['has_entities'] = any(
            entities[category] for category in ['locations', 'budget', 'timeframe', 'vehicle']
            if isinstance(entities[category], (list, dict)) and entities[category]
        )
        
        return entities

    def _extract_locations(self, message: str, message_lower: str) -> Dict[str, Any]:
        """Extract location entities"""
        locations = {
            'origin': None,
            'destination': None,
            'mentioned_places': [],
            'has_travel_route': False
        }
        
        # Extract from-to pattern
        from_to_match = re.search(self.location_patterns['from_to'], message_lower, re.IGNORECASE)
        if from_to_match:
            locations['origin'] = from_to_match.group(1).strip().title()
            locations['destination'] = from_to_match.group(2).strip().title()
            locations['has_travel_route'] = True
        
        # Extract city names
        city_matches = re.findall(self.location_patterns['city_names'], message_lower, re.IGNORECASE)
        locations['mentioned_places'].extend([city.title() for city in city_matches])
        
        # Extract state names
        state_matches = re.findall(self.location_patterns['state_names'], message_lower, re.IGNORECASE)
        locations['mentioned_places'].extend([state.title() for state in state_matches])
        
        # Extract generic location references
        generic_matches = re.findall(self.location_patterns['generic_location'], message_lower, re.IGNORECASE)
        locations['mentioned_places'].extend([loc.strip().title() for loc in generic_matches])
        
        # Remove duplicates
        locations['mentioned_places'] = list(set(locations['mentioned_places']))
        
        return locations

    def _extract_budget(self, message: str, message_lower: str) -> Dict[str, Any]:
        """Extract budget entities"""
        budget = {
            'exact_amounts': [],
            'constraints': {},
            'has_budget_mention': False
        }
        
        # Check for budget keywords
        if re.search(self.budget_patterns['budget_keywords'], message_lower):
            budget['has_budget_mention'] = True
        
        # Extract exact amounts
        exact_matches = re.findall(self.budget_patterns['exact_amount'], message_lower)
        budget['exact_amounts'] = [float(amount.replace(',', '')) for amount in exact_matches]
        
        # Extract under/over constraints
        under_match = re.search(self.budget_patterns['under_amount'], message_lower)
        if under_match:
            budget['constraints']['max'] = float(under_match.group(1).replace(',', ''))
        
        over_match = re.search(self.budget_patterns['over_amount'], message_lower)
        if over_match:
            budget['constraints']['min'] = float(over_match.group(1).replace(',', ''))
        
        # Extract range
        range_match = re.search(self.budget_patterns['range'], message_lower)
        if range_match:
            budget['constraints']['min'] = float(range_match.group(1))
            budget['constraints']['max'] = float(range_match.group(2))
        
        return budget

    def _extract_timeframe(self, message: str, message_lower: str) -> Dict[str, Any]:
        """Extract timeframe entities"""
        timeframe = {
            'specific_dates': [],
            'relative_time': {},
            'urgency': None,
            'has_time_constraint': False
        }
        
        # Extract specific dates
        date_matches = re.findall(self.time_patterns['specific_date'], message_lower, re.IGNORECASE)
        timeframe['specific_dates'] = date_matches
        
        # Extract relative time
        days_match = re.search(self.time_patterns['relative_days'], message_lower)
        if days_match:
            timeframe['relative_time']['days'] = int(days_match.group(1))
            timeframe['has_time_constraint'] = True
        
        weeks_match = re.search(self.time_patterns['relative_weeks'], message_lower)
        if weeks_match:
            timeframe['relative_time']['weeks'] = int(weeks_match.group(1))
            timeframe['has_time_constraint'] = True
        
        # Extract next/this periods
        next_match = re.search(self.time_patterns['next_period'], message_lower)
        if next_match:
            timeframe['relative_time']['next'] = next_match.group(1)
            timeframe['has_time_constraint'] = True
        
        this_match = re.search(self.time_patterns['this_period'], message_lower)
        if this_match:
            timeframe['relative_time']['this'] = this_match.group(1)
            timeframe['has_time_constraint'] = True
        
        # Extract urgency
        if re.search(self.time_patterns['soon'], message_lower):
            timeframe['urgency'] = 'high'
            timeframe['has_time_constraint'] = True
        
        # Extract general timeframe keywords
        timeframe_matches = re.findall(self.time_patterns['timeframe_keywords'], message_lower)
        if timeframe_matches:
            timeframe['keywords'] = timeframe_matches
            timeframe['has_time_constraint'] = True
        
        return timeframe

    def _extract_vehicle(self, message: str, message_lower: str) -> Dict[str, Any]:
        """Extract vehicle entities"""
        vehicle = {
            'types_mentioned': [],
            'brands_mentioned': [],
            'concerns': [],
            'is_personal': False,
            'has_vehicle_context': False
        }
        
        # Extract vehicle types
        type_matches = re.findall(self.vehicle_patterns['vehicle_types'], message_lower, re.IGNORECASE)
        vehicle['types_mentioned'] = list(set(type_matches))
        
        # Check for possessive (my/our vehicle)
        possessive_match = re.search(self.vehicle_patterns['possessive_vehicle'], message_lower)
        if possessive_match:
            vehicle['is_personal'] = True
            vehicle['has_vehicle_context'] = True
        
        # Extract vehicle brands
        brand_matches = re.findall(self.vehicle_patterns['vehicle_brands'], message_lower, re.IGNORECASE)
        vehicle['brands_mentioned'] = list(set(brand_matches))
        
        # Extract vehicle concerns
        concern_matches = re.findall(self.vehicle_patterns['vehicle_concerns'], message_lower, re.IGNORECASE)
        vehicle['concerns'] = list(set(concern_matches))
        
        # Set has_vehicle_context if any vehicle info found
        if any([vehicle['types_mentioned'], vehicle['brands_mentioned'], vehicle['concerns'], vehicle['is_personal']]):
            vehicle['has_vehicle_context'] = True
        
        return vehicle

