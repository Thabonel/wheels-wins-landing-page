"""
Edge Processing Service for Voice Queries
Provides local processing for common queries to reduce latency and improve offline capabilities
Inspired by clevaway/J.A.R.V.I.S offline processing patterns
"""

import asyncio
import logging
import time
import re
import json
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import math

logger = logging.getLogger(__name__)

class QueryCategory(Enum):
    TIME_DATE = "time_date"
    WEATHER = "weather"
    NAVIGATION = "navigation"
    VEHICLE_STATUS = "vehicle_status"
    QUICK_FACTS = "quick_facts"
    CALCULATIONS = "calculations"
    CONTROLS = "controls"
    STATUS_CHECK = "status_check"
    COMMON_QUESTIONS = "common_questions"
    TRAVEL_INFO = "travel_info"

class ProcessingSource(Enum):
    EDGE = "edge"
    CACHE = "cache"
    FALLBACK = "fallback"

@dataclass
class EdgeQuery:
    id: str
    patterns: List[str]
    response: str
    category: QueryCategory
    confidence_threshold: float = 0.7
    context_required: Optional[List[str]] = None
    dynamic_data: bool = False
    cache_ttl: int = 300  # seconds

@dataclass
class ProcessingResult:
    handled: bool
    response: Optional[str] = None
    confidence: float = 0.0
    processing_time_ms: float = 0.0
    source: ProcessingSource = ProcessingSource.FALLBACK
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class QueryMatch:
    query: EdgeQuery
    confidence: float
    matched_pattern: str
    extracted_entities: Dict[str, Any] = field(default_factory=dict)

class EdgeProcessingService:
    """
    High-performance edge processing service for common voice queries
    Processes frequently asked questions locally without cloud API calls
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = {
            "enabled": True,
            "confidence_threshold": 0.7,
            "max_processing_time_ms": 50,  # Ultra-fast processing
            "cache_enabled": True,
            "fuzzy_matching": True,
            "learning_enabled": True,
            **(config or {})
        }
        
        # Query storage
        self.queries: Dict[str, EdgeQuery] = {}
        self.query_cache: Dict[str, Dict[str, Any]] = {}
        self.learning_data: Dict[str, Dict[str, Any]] = {}
        
        # Performance tracking
        self.metrics = {
            "total_queries": 0,
            "edge_handled": 0,
            "cache_hits": 0,
            "fallback_needed": 0,
            "avg_processing_time": 0.0,
            "total_processing_time": 0.0
        }
        
        # Context data
        self.context_data: Dict[str, Any] = {}
        
        # Initialize common queries
        self._initialize_common_queries()
        
        # Load learning data
        self._load_learning_data()
        
        logger.info("🚀 Edge Processing Service initialized")
    
    def _initialize_common_queries(self):
        """Initialize common queries that can be processed locally"""
        
        # Time and date queries
        self.add_query(EdgeQuery(
            id="current_time",
            patterns=[
                "what time is it",
                "current time",
                "what is the time",
                "tell me the time",
                "time please"
            ],
            response="dynamic:current_time",
            category=QueryCategory.TIME_DATE,
            confidence_threshold=0.8,
            dynamic_data=True,
            cache_ttl=60
        ))
        
        self.add_query(EdgeQuery(
            id="current_date",
            patterns=[
                "what date is it",
                "what is today",
                "current date",
                "today's date",
                "what day is it"
            ],
            response="dynamic:current_date",
            category=QueryCategory.TIME_DATE,
            confidence_threshold=0.8,
            dynamic_data=True,
            cache_ttl=3600
        ))
        
        # Simple calculations
        self.add_query(EdgeQuery(
            id="simple_calculation",
            patterns=[
                "calculate {num1} plus {num2}",
                "what is {num1} plus {num2}",
                "{num1} plus {num2}",
                "{num1} add {num2}",
                "{num1} minus {num2}",
                "{num1} times {num2}",
                "{num1} divided by {num2}",
                "{num1} multiplied by {num2}"
            ],
            response="dynamic:calculate",
            category=QueryCategory.CALCULATIONS,
            confidence_threshold=0.8,
            dynamic_data=True,
            cache_ttl=3600
        ))
        
        # Vehicle status (demonstration with mock data)
        self.add_query(EdgeQuery(
            id="fuel_level",
            patterns=[
                "how much fuel",
                "fuel level",
                "gas level",
                "fuel remaining",
                "how much gas"
            ],
            response="dynamic:fuel_status",
            category=QueryCategory.VEHICLE_STATUS,
            confidence_threshold=0.8,
            dynamic_data=True,
            cache_ttl=30
        ))
        
        self.add_query(EdgeQuery(
            id="battery_status",
            patterns=[
                "battery level",
                "battery status",
                "how much battery",
                "power level",
                "charge level"
            ],
            response="dynamic:battery_status",
            category=QueryCategory.VEHICLE_STATUS,
            confidence_threshold=0.8,
            dynamic_data=True,
            cache_ttl=60
        ))
        
        # PAM help and information
        self.add_query(EdgeQuery(
            id="pam_help",
            patterns=[
                "help",
                "what can you do",
                "commands",
                "how to use",
                "what are your features"
            ],
            response="I can help with navigation, weather, vehicle status, calculations, and travel planning. I can also process many common questions instantly without needing an internet connection. Just ask me naturally!",
            category=QueryCategory.COMMON_QUESTIONS,
            confidence_threshold=0.8,
            cache_ttl=86400
        ))
        
        self.add_query(EdgeQuery(
            id="pam_intro",
            patterns=[
                "who are you",
                "what are you",
                "introduce yourself",
                "tell me about yourself"
            ],
            response="I'm PAM, your Personal Assistant for Motorhomes. I'm designed to help with travel planning, navigation, RV management, and can answer many questions instantly using local processing for ultra-fast responses.",
            category=QueryCategory.COMMON_QUESTIONS,
            confidence_threshold=0.8,
            cache_ttl=86400
        ))
        
        # Travel information
        self.add_query(EdgeQuery(
            id="trip_status",
            patterns=[
                "how far",
                "distance to destination",
                "miles to go",
                "how many miles",
                "remaining distance"
            ],
            response="dynamic:trip_distance",
            category=QueryCategory.TRAVEL_INFO,
            confidence_threshold=0.7,
            dynamic_data=True,
            cache_ttl=300
        ))
        
        self.add_query(EdgeQuery(
            id="arrival_time",
            patterns=[
                "when will we arrive",
                "arrival time",
                "eta",
                "estimated arrival",
                "when do we get there"
            ],
            response="dynamic:arrival_time",
            category=QueryCategory.TRAVEL_INFO,
            confidence_threshold=0.8,
            dynamic_data=True,
            cache_ttl=300
        ))
        
        # Quick facts
        self.add_query(EdgeQuery(
            id="pi_value",
            patterns=[
                "what is pi",
                "value of pi",
                "pi number"
            ],
            response="Pi is approximately 3.14159265359",
            category=QueryCategory.QUICK_FACTS,
            confidence_threshold=0.9,
            cache_ttl=86400
        ))
        
        self.add_query(EdgeQuery(
            id="speed_of_light",
            patterns=[
                "speed of light",
                "how fast is light",
                "light speed"
            ],
            response="The speed of light is approximately 299,792,458 meters per second",
            category=QueryCategory.QUICK_FACTS,
            confidence_threshold=0.9,
            cache_ttl=86400
        ))
    
    async def process_query(self, query: str, context: Dict[str, Any] = None) -> ProcessingResult:
        """Process a query using edge computing for ultra-fast responses"""
        
        if not self.config["enabled"]:
            return ProcessingResult(handled=False, source=ProcessingSource.FALLBACK)
        
        start_time = time.time()
        self.metrics["total_queries"] += 1
        
        try:
            # Normalize query
            normalized_query = self._normalize_query(query)
            
            # Check cache first
            if self.config["cache_enabled"]:
                cached_result = self._check_cache(normalized_query)
                if cached_result:
                    processing_time = (time.time() - start_time) * 1000
                    self._update_metrics(processing_time, ProcessingSource.CACHE)
                    
                    return ProcessingResult(
                        handled=True,
                        response=cached_result["response"],
                        confidence=0.95,
                        processing_time_ms=processing_time,
                        source=ProcessingSource.CACHE
                    )
            
            # Find best matching query
            match = self._find_best_match(normalized_query, context)
            
            if match and match.confidence >= self.config["confidence_threshold"]:
                # Generate response
                response = await self._generate_response(match, context)
                processing_time = (time.time() - start_time) * 1000
                
                # Check processing time limit
                if processing_time > self.config["max_processing_time_ms"]:
                    logger.warning(f"Edge processing exceeded time limit: {processing_time:.2f}ms")
                    return ProcessingResult(
                        handled=False,
                        confidence=match.confidence,
                        processing_time_ms=processing_time,
                        source=ProcessingSource.FALLBACK
                    )
                
                # Cache successful result
                if self.config["cache_enabled"] and response:
                    self._cache_result(normalized_query, response, match.query.cache_ttl)
                
                # Update learning data
                if self.config["learning_enabled"]:
                    self._update_learning_data(match.matched_pattern, match.confidence)
                
                self._update_metrics(processing_time, ProcessingSource.EDGE)
                
                return ProcessingResult(
                    handled=True,
                    response=response,
                    confidence=match.confidence,
                    processing_time_ms=processing_time,
                    source=ProcessingSource.EDGE,
                    metadata={
                        "category": match.query.category.value,
                        "pattern": match.matched_pattern,
                        "entities": match.extracted_entities
                    }
                )
            
            # No match found
            processing_time = (time.time() - start_time) * 1000
            self._update_metrics(processing_time, ProcessingSource.FALLBACK)
            
            return ProcessingResult(
                handled=False,
                confidence=match.confidence if match else 0,
                processing_time_ms=processing_time,
                source=ProcessingSource.FALLBACK
            )
            
        except Exception as e:
            logger.error(f"Edge query processing error: {e}")
            processing_time = (time.time() - start_time) * 1000
            
            return ProcessingResult(
                handled=False,
                confidence=0,
                processing_time_ms=processing_time,
                source=ProcessingSource.FALLBACK
            )
    
    def _normalize_query(self, query: str) -> str:
        """Normalize query for better matching"""
        return re.sub(r'[^\w\s]', ' ', query.lower()).strip()
    
    def _find_best_match(self, query: str, context: Dict[str, Any] = None) -> Optional[QueryMatch]:
        """Find the best matching query pattern"""
        
        best_match = None
        highest_confidence = 0
        
        for query_id, edge_query in self.queries.items():
            for pattern in edge_query.patterns:
                confidence, entities = self._calculate_pattern_confidence(query, pattern)
                
                if confidence > highest_confidence and confidence >= edge_query.confidence_threshold:
                    # Check context requirements
                    if edge_query.context_required and context:
                        if not all(key in context for key in edge_query.context_required):
                            continue
                    
                    best_match = QueryMatch(
                        query=edge_query,
                        confidence=confidence,
                        matched_pattern=pattern,
                        extracted_entities=entities
                    )
                    highest_confidence = confidence
        
        return best_match
    
    def _calculate_pattern_confidence(self, query: str, pattern: str) -> Tuple[float, Dict[str, Any]]:
        """Calculate confidence score and extract entities from pattern matching"""
        
        entities = {}
        
        # Handle exact matches
        if query == pattern:
            return 1.0, entities
        
        # Handle entity patterns like {num1} plus {num2}
        if '{' in pattern and '}' in pattern:
            confidence, entities = self._match_entity_pattern(query, pattern)
            return confidence, entities
        
        # Simple token-based matching
        query_tokens = set(query.split())
        pattern_tokens = set(pattern.split())
        
        if not pattern_tokens:
            return 0.0, entities
        
        # Calculate overlap
        intersection = query_tokens.intersection(pattern_tokens)
        confidence = len(intersection) / len(pattern_tokens)
        
        # Boost confidence for complete phrase matches
        if pattern in query:
            confidence = max(confidence, 0.9)
        
        # Apply fuzzy matching if enabled
        if self.config["fuzzy_matching"]:
            fuzzy_confidence = self._fuzzy_match(query_tokens, pattern_tokens)
            confidence = max(confidence, fuzzy_confidence * 0.8)
        
        return confidence, entities
    
    def _match_entity_pattern(self, query: str, pattern: str) -> Tuple[float, Dict[str, Any]]:
        """Match patterns with entities like {num1} plus {num2}"""
        
        entities = {}
        
        # Convert pattern to regex
        regex_pattern = pattern
        entity_names = []
        
        # Find all entities in pattern
        entity_matches = re.findall(r'\{([^}]+)\}', pattern)
        for entity_name in entity_matches:
            entity_names.append(entity_name)
            if 'num' in entity_name:
                regex_pattern = regex_pattern.replace(f'{{{entity_name}}}', r'(-?\d+(?:\.\d+)?)')
            else:
                regex_pattern = regex_pattern.replace(f'{{{entity_name}}}', r'(\S+)')
        
        # Try to match
        match = re.search(regex_pattern, query)
        if match:
            # Extract entities
            for i, entity_name in enumerate(entity_names):
                if i < len(match.groups()):
                    entities[entity_name] = match.group(i + 1)
            
            # Calculate confidence based on match quality
            confidence = 0.9 if len(entities) == len(entity_names) else 0.5
            return confidence, entities
        
        return 0.0, entities
    
    def _fuzzy_match(self, tokens1: set, tokens2: set) -> float:
        """Simple fuzzy matching based on character similarity"""
        
        if not tokens1 or not tokens2:
            return 0.0
        
        max_similarity = 0
        for token1 in tokens1:
            for token2 in tokens2:
                similarity = self._string_similarity(token1, token2)
                max_similarity = max(max_similarity, similarity)
        
        return max_similarity
    
    def _string_similarity(self, s1: str, s2: str) -> float:
        """Calculate string similarity using simple character overlap"""
        
        if s1 == s2:
            return 1.0
        
        if not s1 or not s2:
            return 0.0
        
        # Character-based similarity
        set1 = set(s1.lower())
        set2 = set(s2.lower())
        intersection = set1.intersection(set2)
        union = set1.union(set2)
        
        return len(intersection) / len(union) if union else 0.0
    
    async def _generate_response(self, match: QueryMatch, context: Dict[str, Any] = None) -> Optional[str]:
        """Generate response for matched query"""
        
        try:
            response = match.query.response
            
            if response.startswith("dynamic:"):
                # Handle dynamic responses
                dynamic_type = response.split(":", 1)[1]
                return self._generate_dynamic_response(dynamic_type, match.extracted_entities, context)
            else:
                # Static response
                return response
                
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return None
    
    def _generate_dynamic_response(self, response_type: str, entities: Dict[str, Any], context: Dict[str, Any] = None) -> str:
        """Generate dynamic responses based on type"""
        
        try:
            if response_type == "current_time":
                return f"It's currently {datetime.now().strftime('%I:%M %p')}"
            
            elif response_type == "current_date":
                return f"Today is {datetime.now().strftime('%A, %B %d, %Y')}"
            
            elif response_type == "calculate":
                return self._perform_calculation(entities)
            
            elif response_type == "fuel_status":
                # Mock fuel level - in production, this would connect to vehicle systems
                fuel_level = 75  # Could come from context or vehicle API
                return f"Fuel level is at {fuel_level}%"
            
            elif response_type == "battery_status":
                # Mock battery level - in production, this would connect to vehicle systems
                battery_level = 85  # Could come from context or vehicle API
                return f"Battery is at {battery_level}%"
            
            elif response_type == "trip_distance":
                # Mock trip distance - in production, this would come from navigation system
                distance = 125  # Could come from context or navigation API
                return f"Approximately {distance} miles remaining to your destination"
            
            elif response_type == "arrival_time":
                # Mock arrival time - in production, this would come from navigation system
                eta = datetime.now() + timedelta(hours=2, minutes=30)
                return f"Estimated arrival time is {eta.strftime('%I:%M %p')}"
            
            else:
                return "I'm not sure how to handle that request."
                
        except Exception as e:
            logger.error(f"Error generating dynamic response: {e}")
            return "I'm having trouble processing that request."
    
    def _perform_calculation(self, entities: Dict[str, Any]) -> str:
        """Perform simple calculations"""
        
        try:
            # Extract numbers and operation
            num1_str = entities.get("num1", "")
            num2_str = entities.get("num2", "")
            
            if not num1_str or not num2_str:
                return "I need two numbers to perform a calculation."
            
            num1 = float(num1_str)
            num2 = float(num2_str)
            
            # Determine operation from original pattern
            # This is simplified - in production, you'd want more sophisticated parsing
            if "plus" in entities.get("operation", ""):
                result = num1 + num2
                operation = "plus"
            elif "minus" in entities.get("operation", ""):
                result = num1 - num2
                operation = "minus"
            elif "times" in entities.get("operation", "") or "multiplied" in entities.get("operation", ""):
                result = num1 * num2
                operation = "times"
            elif "divided" in entities.get("operation", ""):
                if num2 == 0:
                    return "Cannot divide by zero."
                result = num1 / num2
                operation = "divided by"
            else:
                # Default to addition
                result = num1 + num2
                operation = "plus"
            
            # Format result
            if result.is_integer():
                return f"{num1_str} {operation} {num2_str} equals {int(result)}"
            else:
                return f"{num1_str} {operation} {num2_str} equals {result:.2f}"
                
        except ValueError:
            return "Please provide valid numbers for calculation."
        except Exception as e:
            logger.error(f"Calculation error: {e}")
            return "I'm having trouble with that calculation."
    
    def _check_cache(self, query: str) -> Optional[Dict[str, Any]]:
        """Check if query result is cached"""
        
        cached = self.query_cache.get(query)
        if cached and time.time() - cached["timestamp"] < cached["ttl"]:
            self.metrics["cache_hits"] += 1
            return cached
        
        if cached:
            del self.query_cache[query]
        
        return None
    
    def _cache_result(self, query: str, response: str, ttl: int):
        """Cache query result"""
        
        self.query_cache[query] = {
            "response": response,
            "timestamp": time.time(),
            "ttl": ttl
        }
        
        # Limit cache size
        if len(self.query_cache) > 100:
            oldest_key = min(self.query_cache.keys(), 
                           key=lambda k: self.query_cache[k]["timestamp"])
            del self.query_cache[oldest_key]
    
    def _update_learning_data(self, pattern: str, confidence: float):
        """Update learning data for pattern optimization"""
        
        if pattern not in self.learning_data:
            self.learning_data[pattern] = {
                "frequency": 0,
                "avg_confidence": 0.0,
                "last_used": 0
            }
        
        data = self.learning_data[pattern]
        data["frequency"] += 1
        data["avg_confidence"] = (data["avg_confidence"] + confidence) / 2
        data["last_used"] = time.time()
    
    def _update_metrics(self, processing_time: float, source: ProcessingSource):
        """Update performance metrics"""
        
        self.metrics["total_processing_time"] += processing_time
        self.metrics["avg_processing_time"] = (
            self.metrics["total_processing_time"] / self.metrics["total_queries"]
        )
        
        if source == ProcessingSource.EDGE:
            self.metrics["edge_handled"] += 1
        elif source == ProcessingSource.CACHE:
            self.metrics["cache_hits"] += 1
        elif source == ProcessingSource.FALLBACK:
            self.metrics["fallback_needed"] += 1
    
    def _load_learning_data(self):
        """Load learning data from storage"""
        # In production, this would load from a persistent store
        pass
    
    def _save_learning_data(self):
        """Save learning data to storage"""
        # In production, this would save to a persistent store
        pass
    
    # Public API methods
    def add_query(self, query: EdgeQuery):
        """Add a new query pattern"""
        self.queries[query.id] = query
        logger.info(f"Added edge query: {query.id}")
    
    def remove_query(self, query_id: str):
        """Remove a query pattern"""
        if query_id in self.queries:
            del self.queries[query_id]
            logger.info(f"Removed edge query: {query_id}")
    
    def update_context(self, key: str, value: Any):
        """Update context data"""
        self.context_data[key] = value
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        return self.metrics.copy()
    
    def get_config(self) -> Dict[str, Any]:
        """Get configuration"""
        return self.config.copy()
    
    def update_config(self, new_config: Dict[str, Any]):
        """Update configuration"""
        self.config.update(new_config)
        logger.info("Edge processing config updated")
    
    def clear_cache(self):
        """Clear query cache"""
        self.query_cache.clear()
        logger.info("Edge processing cache cleared")

# Global edge processing service instance
edge_processing_service = EdgeProcessingService()