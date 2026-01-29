"""
Intent Classification System for PAM Financial Co-Pilot

Analyzes user spending queries to understand purchase intent and categorize spending context.
Uses simple keyword matching to identify product categories and RV context relevance.

Part of the Financial Co-Pilot MVP: Context-Aware Search functionality.
"""

import re
from typing import Dict, List, Optional, Tuple
from enum import Enum
from dataclasses import dataclass


class SpendingCategory(Enum):
    """Primary spending categories for RV living"""
    ELECTRONICS = "electronics"
    FOOD = "food"
    FUEL = "fuel"
    ACCOMMODATION = "accommodation"
    MAINTENANCE = "maintenance"
    SERVICES = "services"
    RECREATION = "recreation"
    SAFETY = "safety"
    COMMUNICATION = "communication"
    UNKNOWN = "unknown"


class RVRelevance(Enum):
    """How relevant the purchase is to mobile/RV living"""
    HIGH = "high"           # Specifically for RV/mobile use
    MEDIUM = "medium"       # General product with RV considerations
    LOW = "low"             # General purchase, minimal RV context
    UNKNOWN = "unknown"     # Cannot determine relevance


@dataclass
class IntentResult:
    """Results of intent classification"""
    category: SpendingCategory
    rv_relevance: RVRelevance
    confidence: float  # 0.0 to 1.0
    keywords_matched: List[str]
    rv_keywords_matched: List[str]
    subcategory: Optional[str] = None


class IntentClassifier:
    """
    Classifies user spending intent using keyword pattern matching.

    Designed to be simple, fast, and maintainable without ML complexity.
    """

    def __init__(self):
        """Initialize the intent classifier with keyword patterns"""

        # Category keywords (case-insensitive)
        self.category_patterns = {
            SpendingCategory.ELECTRONICS: [
                # Navigation & Entertainment
                "ipad", "tablet", "gps", "garmin", "tomtom", "navigation",
                "iphone", "android", "smartphone", "phone", "cellular",
                "laptop", "computer", "macbook", "chromebook",
                "tv", "television", "monitor", "screen", "display",
                "speaker", "bluetooth", "headphones", "sound",

                # Power & Charging
                "inverter", "battery", "solar", "panel", "charger",
                "generator", "power", "usb", "outlet", "voltage",
                "lithium", "agm", "12v", "24v", "110v", "240v",

                # Connectivity
                "router", "wifi", "internet", "hotspot", "antenna",
                "booster", "signal", "cellular", "starlink", "satellite"
            ],

            SpendingCategory.FOOD: [
                "food", "grocery", "groceries", "meal", "restaurant",
                "dining", "eat", "breakfast", "lunch", "dinner",
                "snack", "drink", "coffee", "water", "beer", "wine",
                "cook", "cooking", "recipe", "ingredient", "meat",
                "vegetables", "fruit", "bread", "milk", "cheese",
                "frozen", "canned", "pantry", "spice", "seasoning"
            ],

            SpendingCategory.FUEL: [
                "gas", "gasoline", "diesel", "fuel", "petrol",
                "propane", "lpg", "butane", "octane", "station",
                "pump", "fill", "tank", "gallon", "liter", "litre"
            ],

            SpendingCategory.ACCOMMODATION: [
                "campground", "camping", "rv park", "park", "resort",
                "site", "hookup", "hookups", "electric", "water", "sewer",
                "dump", "station", "overnight", "stay", "night",
                "reservation", "booking", "cabin", "tent", "glamping"
            ],

            SpendingCategory.MAINTENANCE: [
                "repair", "fix", "service", "maintenance", "oil", "filter",
                "tire", "tyre", "brake", "engine", "transmission",
                "coolant", "antifreeze", "windshield", "wiper", "belt",
                "hose", "gasket", "seal", "part", "component",
                "mechanic", "shop", "garage", "dealer", "warranty"
            ],

            SpendingCategory.SERVICES: [
                "insurance", "registration", "license", "inspection",
                "medical", "doctor", "dentist", "vet", "veterinary",
                "haircut", "laundry", "wash", "clean", "mail",
                "shipping", "package", "delivery", "bank", "atm"
            ],

            SpendingCategory.RECREATION: [
                "entertainment", "movie", "theater", "park", "museum",
                "tour", "activity", "attraction", "game", "sport",
                "fishing", "hiking", "biking", "kayak", "paddle",
                "beach", "mountain", "trail", "adventure", "fun"
            ],

            SpendingCategory.SAFETY: [
                "safety", "security", "alarm", "lock", "camera",
                "first aid", "medical", "fire", "extinguisher",
                "smoke", "detector", "emergency", "beacon", "radio"
            ],

            SpendingCategory.COMMUNICATION: [
                "phone", "call", "data", "plan", "carrier", "verizon",
                "att", "tmobile", "sprint", "internet", "wifi",
                "email", "social", "facebook", "instagram", "video"
            ]
        }

        # RV-specific keywords indicating high mobile living relevance
        self.rv_keywords = [
            # RV Types
            "rv", "motorhome", "coach", "trailer", "fifth wheel", "5th wheel",
            "travel trailer", "toy hauler", "camper", "caravan",

            # Mobile Living
            "mobile", "nomad", "full time", "fulltime", "living",
            "road trip", "roadtrip", "boondocking", "dry camping",

            # RV Systems
            "12v", "12 volt", "inverter", "converter", "solar", "generator",
            "propane", "lpg", "gray water", "black water", "fresh water",
            "dump station", "hookup", "shore power",

            # RV Brands
            "winnebago", "thor", "forest river", "jayco", "airstream",
            "newmar", "tiffin", "fleetwood", "coachmen", "keystone",

            # RV Equipment
            "leveling", "stabilizer", "awning", "slide out", "slideout",
            "hitch", "towing", "brake controller", "sway bar",
            "weight distribution", "tongue weight"
        ]

        # Compile regex patterns for efficiency
        self._compile_patterns()

    def _compile_patterns(self):
        """Compile regex patterns for faster matching"""
        self.compiled_category_patterns = {}
        for category, keywords in self.category_patterns.items():
            # Create word boundary pattern for each keyword
            patterns = [rf'\b{re.escape(keyword)}\b' for keyword in keywords]
            self.compiled_category_patterns[category] = re.compile(
                '|'.join(patterns),
                re.IGNORECASE
            )

        # Compile RV keyword pattern
        rv_patterns = [rf'\b{re.escape(keyword)}\b' for keyword in self.rv_keywords]
        self.compiled_rv_pattern = re.compile(
            '|'.join(rv_patterns),
            re.IGNORECASE
        )

    def classify_intent(self, query: str) -> IntentResult:
        """
        Classify the spending intent from a user query.

        Args:
            query: User's search/purchase query

        Returns:
            IntentResult with classification details
        """
        if not query or not query.strip():
            return IntentResult(
                category=SpendingCategory.UNKNOWN,
                rv_relevance=RVRelevance.UNKNOWN,
                confidence=0.0,
                keywords_matched=[],
                rv_keywords_matched=[]
            )

        query_lower = query.lower().strip()

        # Find category matches
        category_scores = {}
        all_keywords_matched = []

        for category, pattern in self.compiled_category_patterns.items():
            matches = pattern.findall(query)
            if matches:
                # Score based on number and quality of matches
                score = len(matches)
                # Boost score for exact phrase matches
                for match in matches:
                    if len(match) > 4:  # Longer keywords are more specific
                        score += 0.5

                category_scores[category] = score
                all_keywords_matched.extend(matches)

        # Determine best category
        if category_scores:
            best_category = max(category_scores.items(), key=lambda x: x[1])
            category = best_category[0]
            category_confidence = min(best_category[1] / 3.0, 1.0)  # Normalize
        else:
            category = SpendingCategory.UNKNOWN
            category_confidence = 0.0

        # Find RV relevance
        rv_matches = self.compiled_rv_pattern.findall(query)
        rv_keywords_matched = list(set(rv_matches))  # Remove duplicates

        # Determine RV relevance level
        if len(rv_keywords_matched) >= 2:
            rv_relevance = RVRelevance.HIGH
            rv_confidence = 0.9
        elif len(rv_keywords_matched) == 1:
            rv_relevance = RVRelevance.MEDIUM
            rv_confidence = 0.7
        elif self._has_mobile_context(query_lower):
            rv_relevance = RVRelevance.MEDIUM
            rv_confidence = 0.6
        elif category in [SpendingCategory.FUEL, SpendingCategory.ACCOMMODATION]:
            # These categories are always relevant to RV life
            rv_relevance = RVRelevance.MEDIUM
            rv_confidence = 0.5
        else:
            rv_relevance = RVRelevance.LOW
            rv_confidence = 0.3

        # Calculate overall confidence
        overall_confidence = (category_confidence + rv_confidence) / 2.0

        # Determine subcategory for some categories
        subcategory = self._determine_subcategory(category, query_lower)

        return IntentResult(
            category=category,
            rv_relevance=rv_relevance,
            confidence=overall_confidence,
            keywords_matched=list(set(all_keywords_matched)),
            rv_keywords_matched=rv_keywords_matched,
            subcategory=subcategory
        )

    def _has_mobile_context(self, query: str) -> bool:
        """Check for implicit mobile/travel context"""
        mobile_context_keywords = [
            "portable", "compact", "travel", "lightweight", "rechargeable",
            "battery operated", "cordless", "wireless", "mobile", "on the go",
            "road", "journey", "trip", "adventure", "outdoor", "camping"
        ]

        return any(keyword in query for keyword in mobile_context_keywords)

    def _determine_subcategory(self, category: SpendingCategory, query: str) -> Optional[str]:
        """Determine subcategory based on specific keywords"""

        subcategory_patterns = {
            SpendingCategory.ELECTRONICS: {
                "navigation": ["gps", "garmin", "navigation", "maps"],
                "entertainment": ["tv", "tablet", "ipad", "streaming", "netflix"],
                "power": ["solar", "battery", "inverter", "generator"],
                "communication": ["phone", "wifi", "router", "hotspot"]
            },
            SpendingCategory.FOOD: {
                "dining": ["restaurant", "dining", "takeout", "delivery"],
                "groceries": ["grocery", "supermarket", "walmart", "costco"],
                "cooking": ["ingredient", "recipe", "spice", "seasoning"]
            },
            SpendingCategory.ACCOMMODATION: {
                "rv_parks": ["rv park", "resort", "campground"],
                "boondocking": ["boondocking", "dry camping", "free camping"],
                "urban": ["parking", "overnight", "walmart", "casino"]
            }
        }

        if category in subcategory_patterns:
            for subcat, keywords in subcategory_patterns[category].items():
                if any(keyword in query for keyword in keywords):
                    return subcat

        return None

    def get_category_context(self, category: SpendingCategory) -> Dict[str, str]:
        """Get RV-specific context for a spending category"""

        context_map = {
            SpendingCategory.ELECTRONICS: {
                "title": "Electronics & Tech",
                "rv_considerations": "Consider power consumption, 12V compatibility, cellular connectivity for remote areas, and mounting/storage solutions",
                "common_issues": "Power draw, signal reception, vibration resistance, space constraints"
            },
            SpendingCategory.FOOD: {
                "title": "Food & Dining",
                "rv_considerations": "Factor in refrigeration space, propane usage for cooking, storage constraints, and access to grocery stores",
                "common_issues": "Limited fridge space, propane costs, pantry storage, fresh produce spoilage"
            },
            SpendingCategory.FUEL: {
                "title": "Fuel & Energy",
                "rv_considerations": "Plan for varying fuel prices by region, diesel vs gas costs, and propane availability",
                "common_issues": "Fuel efficiency with towing, propane refill locations, price fluctuations"
            },
            SpendingCategory.ACCOMMODATION: {
                "title": "Accommodation & Camping",
                "rv_considerations": "Check hookup availability, rig size restrictions, seasonal pricing, and reservation requirements",
                "common_issues": "Size restrictions, hookup types, seasonal availability, booking windows"
            },
            SpendingCategory.MAINTENANCE: {
                "title": "Maintenance & Repairs",
                "rv_considerations": "Find mobile mechanics or RV-specific service centers, factor in emergency repair costs",
                "common_issues": "Finding qualified techs, parts availability, emergency roadside service"
            },
            SpendingCategory.SERVICES: {
                "title": "Services & Utilities",
                "rv_considerations": "Look for mobile-accessible services, mail forwarding, and nomad-friendly providers",
                "common_issues": "Address requirements, service availability, temporary vs permanent needs"
            },
            SpendingCategory.RECREATION: {
                "title": "Recreation & Entertainment",
                "rv_considerations": "Consider outdoor activities, regional attractions, and weather-dependent options",
                "common_issues": "Seasonal access, weather dependency, equipment storage, activity costs"
            },
            SpendingCategory.SAFETY: {
                "title": "Safety & Security",
                "rv_considerations": "Focus on portable solutions, battery backup, and easy installation/removal",
                "common_issues": "Power requirements, false alarms, theft protection, emergency communication"
            },
            SpendingCategory.COMMUNICATION: {
                "title": "Communication & Connectivity",
                "rv_considerations": "Prioritize coverage in remote areas, data limits, and equipment compatibility",
                "common_issues": "Rural coverage, data costs, equipment complexity, multiple carrier needs"
            }
        }

        return context_map.get(category, {
            "title": "General Purchase",
            "rv_considerations": "Consider storage space, power requirements, and mobile compatibility",
            "common_issues": "Space constraints, weight limits, durability requirements"
        })


# Singleton instance for easy import
intent_classifier = IntentClassifier()