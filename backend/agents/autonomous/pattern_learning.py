"""
Trip Pattern Learning System
Analyzes user travel patterns and generates personalized recommendations.
"""
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.core.logging import get_logger

logger = get_logger(__name__)


class TripPatternAnalyzer:
    """
    Analyzes user trip patterns and learns preferences for personalized recommendations
    """

    def __init__(self):
        """
        Initialize Trip Pattern Analyzer
        """
        self.logger = logger
        self.min_trips_for_pattern = 3
        self.pattern_confidence_threshold = 0.7
        self.preference_categories = [
            'trip_type', 'destination_type', 'budget_range', 'duration_range', 'season_preference'
        ]

        # Memory-keeper tools (will be set by dependency injection or mocking)
        self.mcp__memory_keeper__context_save = None
        self.mcp__memory_keeper__context_search = None

    async def analyze_trip_patterns(self, trip_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze patterns from historical trip data

        Args:
            trip_data: List of historical trip records

        Returns:
            Dictionary of detected patterns
        """
        try:
            if len(trip_data) < self.min_trips_for_pattern:
                return {
                    'trip_type_preference': {},
                    'budget_patterns': {},
                    'duration_patterns': {},
                    'seasonal_patterns': {},
                    'destination_patterns': {},
                    'confidence': 0.0,
                    'insufficient_data': True
                }

            patterns = {}

            # Analyze trip type preferences
            trip_types = {}
            for trip in trip_data:
                trip_type = trip.get('trip_type', 'unknown')
                trip_types[trip_type] = trip_types.get(trip_type, 0) + 1

            total_trips = len(trip_data)
            trip_type_prefs = {t: count/total_trips for t, count in trip_types.items()}
            patterns['trip_type_preference'] = trip_type_prefs

            # Analyze budget patterns
            budgets = [trip.get('budget', 0) for trip in trip_data if trip.get('budget')]
            if budgets:
                avg_budget = sum(budgets) / len(budgets)
                min_budget = min(budgets)
                max_budget = max(budgets)
                patterns['budget_patterns'] = {
                    'average': avg_budget,
                    'min': min_budget,
                    'max': max_budget,
                    'preferred_range': (avg_budget * 0.8, avg_budget * 1.2)
                }
            else:
                patterns['budget_patterns'] = {}

            # Analyze duration patterns
            durations = [trip.get('duration_days', 0) for trip in trip_data if trip.get('duration_days')]
            if durations:
                avg_duration = sum(durations) / len(durations)
                patterns['duration_patterns'] = {
                    'average_days': avg_duration,
                    'min_days': min(durations),
                    'max_days': max(durations)
                }
            else:
                patterns['duration_patterns'] = {}

            # Analyze seasonal patterns (simplified)
            months = []
            for trip in trip_data:
                start_date = trip.get('start_date', '')
                if start_date:
                    try:
                        month = datetime.fromisoformat(start_date).month
                        months.append(month)
                    except:
                        continue

            if months:
                month_counts = {}
                for month in months:
                    month_counts[month] = month_counts.get(month, 0) + 1
                patterns['seasonal_patterns'] = month_counts
            else:
                patterns['seasonal_patterns'] = {}

            # Analyze destination patterns (simplified)
            destinations = []
            for trip in trip_data:
                dest_list = trip.get('destinations', [])
                for dest in dest_list:
                    if dest.get('name'):
                        destinations.append(dest['name'])

            if destinations:
                dest_counts = {}
                for dest in destinations:
                    dest_counts[dest] = dest_counts.get(dest, 0) + 1
                patterns['destination_patterns'] = dest_counts
            else:
                patterns['destination_patterns'] = {}

            return patterns

        except Exception as e:
            self.logger.error(f"❌ Failed to analyze trip patterns: {e}")
            return {
                'trip_type_preference': {},
                'budget_patterns': {},
                'duration_patterns': {},
                'seasonal_patterns': {},
                'destination_patterns': {},
                'error': str(e)
            }

    async def generate_user_profile(self, user_id: str, trip_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate user profile from trip patterns

        Args:
            user_id: User identifier
            trip_data: Historical trip data

        Returns:
            User profile with preferences and confidence scores
        """
        try:
            patterns = await self.analyze_trip_patterns(trip_data)

            # Extract top preferences
            preferences = {}
            confidence_scores = {}

            # Trip type preference
            if patterns['trip_type_preference']:
                top_trip_type = max(patterns['trip_type_preference'].items(), key=lambda x: x[1])
                preferences['trip_type'] = top_trip_type[0]
                confidence_scores['trip_type'] = top_trip_type[1]

            # Budget preference
            if patterns['budget_patterns'] and patterns['budget_patterns'].get('average'):
                avg_budget = patterns['budget_patterns']['average']
                if avg_budget < 500:
                    preferences['budget_category'] = 'budget'
                elif avg_budget < 1500:
                    preferences['budget_category'] = 'moderate'
                else:
                    preferences['budget_category'] = 'premium'
                confidence_scores['budget_category'] = min(1.0, len(trip_data) / 5.0)

            # Duration preference
            if patterns['duration_patterns'] and patterns['duration_patterns'].get('average_days'):
                avg_duration = patterns['duration_patterns']['average_days']
                if avg_duration <= 3:
                    preferences['duration_preference'] = 'weekend'
                elif avg_duration <= 7:
                    preferences['duration_preference'] = 'week'
                else:
                    preferences['duration_preference'] = 'extended'
                confidence_scores['duration_preference'] = min(1.0, len(trip_data) / 3.0)

            profile = {
                'user_id': user_id,
                'preferences': preferences,
                'confidence_scores': confidence_scores,
                'total_trips_analyzed': len(trip_data),
                'last_updated': datetime.now().isoformat(),
                'raw_patterns': patterns
            }

            return profile

        except Exception as e:
            self.logger.error(f"❌ Failed to generate user profile: {e}")
            return {
                'user_id': user_id,
                'preferences': {},
                'confidence_scores': {},
                'error': str(e)
            }

    async def predict_next_trip_preferences(self, trip_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Predict preferences for next trip based on patterns

        Args:
            trip_data: Historical trip data

        Returns:
            Predictions for next trip
        """
        try:
            patterns = await self.analyze_trip_patterns(trip_data)

            predictions = {}

            # Recommend destinations based on trip type preference
            if patterns['trip_type_preference']:
                top_type = max(patterns['trip_type_preference'].items(), key=lambda x: x[1])[0]
                predictions['recommended_trip_type'] = top_type

            # Suggest budget range
            if patterns['budget_patterns'] and patterns['budget_patterns'].get('preferred_range'):
                predictions['suggested_budget_range'] = patterns['budget_patterns']['preferred_range']

            # Optimal duration
            if patterns['duration_patterns'] and patterns['duration_patterns'].get('average_days'):
                predictions['optimal_duration'] = patterns['duration_patterns']['average_days']

            # Best travel months
            if patterns['seasonal_patterns']:
                top_months = sorted(patterns['seasonal_patterns'].items(), key=lambda x: x[1], reverse=True)[:3]
                predictions['best_travel_months'] = [month for month, count in top_months]

            # Overall confidence
            confidence = min(1.0, len(trip_data) / self.min_trips_for_pattern / 2.0)
            predictions['confidence_score'] = confidence

            # Placeholder recommendations (would be more sophisticated in full implementation)
            predictions['recommended_destinations'] = ['Based on your patterns']

            return predictions

        except Exception as e:
            self.logger.error(f"❌ Failed to predict next trip preferences: {e}")
            return {
                'recommended_destinations': [],
                'suggested_budget_range': (0, 0),
                'optimal_duration': 0,
                'best_travel_months': [],
                'confidence_score': 0.0,
                'error': str(e)
            }

    async def save_learned_patterns(self, pattern_data: Dict[str, Any]) -> None:
        """
        Save learned patterns to memory-keeper

        Args:
            pattern_data: Pattern data to save
        """
        try:
            if not self.mcp__memory_keeper__context_save:
                self.logger.warning("⚠️ Memory-keeper context_save not available")
                return

            user_id = pattern_data.get('user_id')
            key = f"user_patterns_{user_id}"

            await self.mcp__memory_keeper__context_save({
                "key": key,
                "value": json.dumps(pattern_data),
                "category": "progress",
                "priority": "normal",
                "private": False
            })

            self.logger.debug(f"💾 Saved learned patterns for user {user_id}")

        except Exception as e:
            self.logger.warning(f"⚠️ Failed to save learned patterns: {e}")

    async def load_user_patterns(self, user_id: str) -> Dict[str, Any]:
        """
        Load user patterns from memory-keeper

        Args:
            user_id: User identifier

        Returns:
            Loaded pattern data or empty dict
        """
        try:
            if not self.mcp__memory_keeper__context_search:
                self.logger.warning("⚠️ Memory-keeper context_search not available")
                return {}

            results = await self.mcp__memory_keeper__context_search({
                "query": f"user_patterns_{user_id}",
                "category": "progress",
                "limit": 1,
                "sort": "created_desc"
            })

            if results and len(results) > 0:
                pattern_data = json.loads(results[0]["value"])
                return pattern_data

            return {}

        except Exception as e:
            self.logger.warning(f"⚠️ Failed to load user patterns: {e}")
            return {}