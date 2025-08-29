"""
Entity Extraction Module
Reusable entity extraction logic that can be used across all PAM orchestrators.
Extracted from the original orchestrator.py to enable code reuse.
"""

import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class EntityType(Enum):
    """Types of entities that can be extracted"""
    LOCATION = "location"
    BUDGET = "budget"  
    TIME = "time"
    VEHICLE = "vehicle"
    PERSON = "person"
    ACTIVITY = "activity"
    EXPENSE_CATEGORY = "expense_category"
    DURATION = "duration"
    DISTANCE = "distance"


@dataclass
class ExtractedEntity:
    """Represents an extracted entity with metadata"""
    entity_type: EntityType
    value: str
    normalized_value: Any
    confidence: float
    source_text: str
    position: Tuple[int, int]  # Start and end positions in text
    metadata: Dict[str, Any] = None


class EntityExtractor:
    """
    Unified entity extraction service for PAM orchestrators.
    
    This class provides consistent entity extraction across different orchestrators,
    ensuring that location patterns, budget patterns, time patterns, etc. are
    handled uniformly throughout the system.
    """
    
    def __init__(self):
        self.patterns = self._initialize_patterns()
        self.location_cache = {}
        self.normalization_cache = {}
        
    def _initialize_patterns(self) -> Dict[str, List[Tuple[str, str]]]:
        """Initialize regex patterns for entity extraction"""
        return {
            "location": [
                # Cities and states
                (r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s+([A-Z]{2})\b', 'city_state'),
                # National parks
                (r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+National\s+Park\b', 'national_park'),
                # Campgrounds
                (r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Campground|RV\s+Park|KOA)\b', 'campground'),
                # General locations
                (r'\b(?:in|to|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b', 'general_location'),
            ],
            
            "budget": [
                # Specific amounts
                (r'\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b', 'dollar_amount'),
                # Budget ranges
                (r'\$(\d+(?:,\d{3})*)\s*(?:-|to)\s*\$(\d+(?:,\d{3})*)', 'budget_range'),
                # Budget descriptors
                (r'\b(cheap|budget|affordable|expensive|luxury)\b', 'budget_descriptor'),
                # Spending limits
                (r'\bunder\s+\$(\d+(?:,\d{3})*)\b', 'budget_limit'),
            ],
            
            "time": [
                # Specific dates
                (r'\b(\d{1,2})/(\d{1,2})/(\d{2,4})\b', 'date_mdy'),
                (r'\b(\d{4})-(\d{1,2})-(\d{1,2})\b', 'date_ymd'),
                # Relative dates
                (r'\b(next|this)\s+(week|month|year|weekend)\b', 'relative_date'),
                (r'\b(tomorrow|today|yesterday)\b', 'relative_day'),
                # Seasons and months
                (r'\b(spring|summer|fall|autumn|winter)\b', 'season'),
                (r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\b', 'month'),
                # Duration
                (r'\b(\d+)\s+(day|week|month|year)s?\b', 'duration'),
            ],
            
            "vehicle": [
                # RV types
                (r'\b(Class\s+[ABC]|motorhome|travel\s+trailer|fifth\s+wheel|popup|tent\s+trailer)\b', 'rv_type'),
                # Vehicle makes/models
                (r'\b(Winnebago|Airstream|Forest\s+River|Jayco|Thor|Fleetwood)\b', 'rv_brand'),
                # Vehicle features
                (r'\b(\d+)\s*(?:ft|foot|feet)\b', 'vehicle_length'),
            ],
            
            "expense_category": [
                # Common expense categories
                (r'\b(fuel|gas|groceries|food|camping|lodging|maintenance|repairs|entertainment)\b', 'expense_category'),
                # Specific expense types
                (r'\b(propane|diesel|tolls|parking|laundry|supplies)\b', 'expense_subcategory'),
            ],
            
            "activity": [
                # Activities and interests
                (r'\b(hiking|fishing|biking|sightseeing|photography|bird\s*watching)\b', 'outdoor_activity'),
                (r'\b(museums?|restaurants?|shopping|beaches?|parks?)\b', 'attraction_type'),
            ]
        }
    
    def extract_entities(self, text: str) -> List[ExtractedEntity]:
        """
        Extract all entities from the given text.
        
        Args:
            text: The text to extract entities from
            
        Returns:
            List of ExtractedEntity objects
        """
        entities = []
        
        # Process each entity type
        for entity_type_str, patterns in self.patterns.items():
            entity_type = EntityType(entity_type_str)
            
            for pattern, pattern_type in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                
                for match in matches:
                    entity = self._create_entity(
                        entity_type, match, pattern_type, text
                    )
                    if entity:
                        entities.append(entity)
        
        # Remove overlapping entities (keep highest confidence)
        entities = self._resolve_overlaps(entities)
        
        # Sort by position in text
        entities.sort(key=lambda e: e.position[0])
        
        return entities
    
    def _create_entity(
        self, 
        entity_type: EntityType, 
        match: re.Match, 
        pattern_type: str, 
        source_text: str
    ) -> Optional[ExtractedEntity]:
        """Create an ExtractedEntity from a regex match"""
        try:
            value = match.group().strip()
            normalized_value = self._normalize_entity(entity_type, value, match)
            confidence = self._calculate_confidence(entity_type, value, pattern_type)
            
            return ExtractedEntity(
                entity_type=entity_type,
                value=value,
                normalized_value=normalized_value,
                confidence=confidence,
                source_text=source_text,
                position=(match.start(), match.end()),
                metadata={
                    "pattern_type": pattern_type,
                    "match_groups": match.groups()
                }
            )
        except Exception as e:
            logger.warning(f"Error creating entity from match: {e}")
            return None
    
    def _normalize_entity(
        self, 
        entity_type: EntityType, 
        value: str, 
        match: re.Match
    ) -> Any:
        """Normalize entity values to standard formats"""
        
        if entity_type == EntityType.BUDGET:
            return self._normalize_budget(value, match)
        elif entity_type == EntityType.TIME:
            return self._normalize_time(value, match)
        elif entity_type == EntityType.LOCATION:
            return self._normalize_location(value)
        elif entity_type == EntityType.VEHICLE:
            return self._normalize_vehicle(value)
        elif entity_type == EntityType.DURATION:
            return self._normalize_duration(value, match)
        else:
            return value.lower().strip()
    
    def _normalize_budget(self, value: str, match: re.Match) -> Dict[str, Any]:
        """Normalize budget values to standard format"""
        try:
            # Remove $ and commas, convert to float
            if match.groups():
                # Handle budget ranges
                if len(match.groups()) == 2:
                    min_val = float(match.group(1).replace(',', ''))
                    max_val = float(match.group(2).replace(',', ''))
                    return {
                        "type": "range",
                        "min": min_val,
                        "max": max_val,
                        "currency": "USD"
                    }
                else:
                    # Single amount
                    amount = float(match.group(1).replace(',', ''))
                    return {
                        "type": "amount",
                        "value": amount,
                        "currency": "USD"
                    }
            else:
                # Budget descriptor
                descriptors = {
                    "cheap": {"type": "descriptor", "level": "low"},
                    "budget": {"type": "descriptor", "level": "low"},
                    "affordable": {"type": "descriptor", "level": "medium"},
                    "expensive": {"type": "descriptor", "level": "high"},
                    "luxury": {"type": "descriptor", "level": "premium"}
                }
                return descriptors.get(value.lower(), {"type": "descriptor", "level": "unknown"})
        except (ValueError, IndexError):
            return {"type": "unknown", "raw_value": value}
    
    def _normalize_time(self, value: str, match: re.Match) -> Dict[str, Any]:
        """Normalize time values to standard format"""
        groups = match.groups()
        
        try:
            if len(groups) == 3:
                # Date format
                if '/' in value:  # MM/DD/YYYY
                    month, day, year = groups
                    if len(year) == 2:
                        year = f"20{year}"
                elif '-' in value:  # YYYY-MM-DD
                    year, month, day = groups
                
                return {
                    "type": "date",
                    "year": int(year),
                    "month": int(month),
                    "day": int(day),
                    "iso_date": f"{year}-{month:0>2}-{day:0>2}"
                }
            elif len(groups) == 2:
                # Relative time or duration
                if groups[0] in ["next", "this"]:
                    return {
                        "type": "relative",
                        "modifier": groups[0],
                        "unit": groups[1],
                        "from_now": datetime.now()
                    }
                else:
                    # Duration
                    return {
                        "type": "duration",
                        "value": int(groups[0]),
                        "unit": groups[1]
                    }
            else:
                # Single word time references
                time_mappings = {
                    "today": {"type": "relative", "days_offset": 0},
                    "tomorrow": {"type": "relative", "days_offset": 1},
                    "yesterday": {"type": "relative", "days_offset": -1},
                    "spring": {"type": "season", "season": "spring"},
                    "summer": {"type": "season", "season": "summer"},
                    "fall": {"type": "season", "season": "fall"},
                    "autumn": {"type": "season", "season": "fall"},
                    "winter": {"type": "season", "season": "winter"}
                }
                return time_mappings.get(value.lower(), {"type": "unknown", "raw_value": value})
        except (ValueError, IndexError):
            return {"type": "unknown", "raw_value": value}
    
    def _normalize_location(self, value: str) -> Dict[str, Any]:
        """Normalize location values"""
        # Cache location lookups for performance
        if value in self.location_cache:
            return self.location_cache[value]
        
        normalized = {
            "type": "location",
            "name": value.title(),
            "raw_value": value,
            "coordinates": None,  # Could be populated by geocoding service
            "place_type": self._classify_location_type(value)
        }
        
        self.location_cache[value] = normalized
        return normalized
    
    def _classify_location_type(self, location: str) -> str:
        """Classify the type of location"""
        location_lower = location.lower()
        
        if "national park" in location_lower:
            return "national_park"
        elif any(term in location_lower for term in ["campground", "rv park", "koa"]):
            return "campground"
        elif any(term in location_lower for term in ["beach", "lake", "river"]):
            return "natural_feature"
        elif "," in location and len(location.split(",")[-1].strip()) == 2:
            return "city_state"
        else:
            return "general_location"
    
    def _normalize_vehicle(self, value: str) -> Dict[str, Any]:
        """Normalize vehicle information"""
        value_lower = value.lower()
        
        if "class" in value_lower:
            return {
                "type": "rv_type",
                "category": value.title(),
                "is_motorized": True
            }
        elif any(term in value_lower for term in ["trailer", "popup"]):
            return {
                "type": "rv_type", 
                "category": value.title(),
                "is_motorized": False
            }
        elif value_lower in ["winnebago", "airstream", "forest river", "jayco", "thor", "fleetwood"]:
            return {
                "type": "brand",
                "name": value.title()
            }
        else:
            return {
                "type": "unknown",
                "raw_value": value
            }
    
    def _normalize_duration(self, value: str, match: re.Match) -> Dict[str, Any]:
        """Normalize duration values"""
        groups = match.groups()
        if len(groups) >= 2:
            try:
                duration_value = int(groups[0])
                unit = groups[1]
                
                # Convert to days for standardization
                unit_multipliers = {
                    "day": 1,
                    "week": 7,
                    "month": 30,
                    "year": 365
                }
                
                days = duration_value * unit_multipliers.get(unit, 1)
                
                return {
                    "type": "duration",
                    "value": duration_value,
                    "unit": unit,
                    "total_days": days
                }
            except ValueError:
                pass
        
        return {"type": "unknown", "raw_value": value}
    
    def _calculate_confidence(
        self, 
        entity_type: EntityType, 
        value: str, 
        pattern_type: str
    ) -> float:
        """Calculate confidence score for extracted entity"""
        base_confidence = 0.7
        
        # Pattern type specific adjustments
        pattern_confidence = {
            "city_state": 0.9,
            "national_park": 0.95,
            "dollar_amount": 0.9,
            "date_mdy": 0.85,
            "date_ymd": 0.9,
            "rv_type": 0.8,
            "expense_category": 0.75
        }
        
        confidence = pattern_confidence.get(pattern_type, base_confidence)
        
        # Length-based adjustments
        if len(value) < 3:
            confidence -= 0.1
        elif len(value) > 50:
            confidence -= 0.05
        
        # Common word filtering
        common_words = ["the", "and", "or", "in", "at", "to", "for", "of", "with"]
        if value.lower() in common_words:
            confidence = 0.1
        
        return max(0.0, min(1.0, confidence))
    
    def _resolve_overlaps(self, entities: List[ExtractedEntity]) -> List[ExtractedEntity]:
        """Resolve overlapping entities by keeping the highest confidence ones"""
        if len(entities) <= 1:
            return entities
        
        # Sort by position for overlap detection
        sorted_entities = sorted(entities, key=lambda e: e.position[0])
        resolved = []
        
        for entity in sorted_entities:
            # Check for overlaps with already resolved entities
            has_overlap = False
            for resolved_entity in resolved:
                if self._entities_overlap(entity, resolved_entity):
                    # Keep the higher confidence entity
                    if entity.confidence > resolved_entity.confidence:
                        resolved.remove(resolved_entity)
                        resolved.append(entity)
                    has_overlap = True
                    break
            
            if not has_overlap:
                resolved.append(entity)
        
        return resolved
    
    def _entities_overlap(self, entity1: ExtractedEntity, entity2: ExtractedEntity) -> bool:
        """Check if two entities overlap in the source text"""
        start1, end1 = entity1.position
        start2, end2 = entity2.position
        
        return not (end1 <= start2 or end2 <= start1)
    
    def extract_by_type(self, text: str, entity_type: EntityType) -> List[ExtractedEntity]:
        """Extract only entities of a specific type"""
        all_entities = self.extract_entities(text)
        return [e for e in all_entities if e.entity_type == entity_type]
    
    def get_best_entity(self, text: str, entity_type: EntityType) -> Optional[ExtractedEntity]:
        """Get the highest confidence entity of a specific type"""
        entities = self.extract_by_type(text, entity_type)
        if not entities:
            return None
        
        return max(entities, key=lambda e: e.confidence)
    
    def get_entity_summary(self, entities: List[ExtractedEntity]) -> Dict[str, Any]:
        """Get a summary of extracted entities"""
        summary = {
            "total_entities": len(entities),
            "by_type": {},
            "high_confidence": [],
            "low_confidence": []
        }
        
        for entity in entities:
            entity_type = entity.entity_type.value
            if entity_type not in summary["by_type"]:
                summary["by_type"][entity_type] = []
            
            summary["by_type"][entity_type].append({
                "value": entity.value,
                "confidence": entity.confidence,
                "normalized": entity.normalized_value
            })
            
            if entity.confidence >= 0.8:
                summary["high_confidence"].append(entity.value)
            elif entity.confidence < 0.5:
                summary["low_confidence"].append(entity.value)
        
        return summary