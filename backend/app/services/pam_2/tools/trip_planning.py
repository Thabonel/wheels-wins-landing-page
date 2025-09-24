"""
Trip planning function tools for PAM 2.0
Google Gemini function calling integration
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

async def get_destination_info(
    destination: str,
    interests: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Get comprehensive destination information for trip planning

    Args:
        destination: City or country name
        interests: List of interests (e.g., ['culture', 'food', 'adventure'])

    Returns:
        Destination information including attractions, costs, tips
    """

    try:
        # Mock destination data for demo
        destinations_data = {
            "tokyo": {
                "name": "Tokyo, Japan",
                "best_time_to_visit": "March-May (Spring) or September-November (Fall)",
                "average_budget_per_day": {
                    "budget": 80,
                    "mid_range": 150,
                    "luxury": 300,
                    "currency": "USD"
                },
                "top_attractions": [
                    "Tokyo Skytree", "Senso-ji Temple", "Shibuya Crossing",
                    "Meiji Shrine", "Tsukiji Fish Market"
                ],
                "cultural_tips": [
                    "Remove shoes when entering homes and some restaurants",
                    "Bow when greeting people",
                    "Don't tip - it's not customary in Japan"
                ],
                "transportation": {
                    "airport_to_city": "Narita Express or subway (45-60 min)",
                    "local_transport": "JR Pass for tourists, extensive subway system"
                },
                "safety_rating": "Very Safe (9/10)"
            },
            "paris": {
                "name": "Paris, France",
                "best_time_to_visit": "April-June or September-October",
                "average_budget_per_day": {
                    "budget": 70,
                    "mid_range": 120,
                    "luxury": 250,
                    "currency": "USD"
                },
                "top_attractions": [
                    "Eiffel Tower", "Louvre Museum", "Notre-Dame Cathedral",
                    "Champs-Élysées", "Montmartre"
                ],
                "cultural_tips": [
                    "Learn basic French phrases - locals appreciate the effort",
                    "Dress well - Parisians value good style",
                    "Lunch is typically 12-2pm, dinner after 7:30pm"
                ],
                "transportation": {
                    "airport_to_city": "RER B train or taxi (30-45 min)",
                    "local_transport": "Metro system covers the entire city"
                },
                "safety_rating": "Generally Safe (7/10)"
            }
        }

        # Normalize destination name for lookup
        dest_key = destination.lower().replace(" ", "").replace(",", "")

        # Find matching destination
        destination_data = None
        for key, data in destinations_data.items():
            if key in dest_key or dest_key in key:
                destination_data = data
                break

        if not destination_data:
            # Generic destination template
            destination_data = {
                "name": destination,
                "status": "Limited information available",
                "recommendations": [
                    "Research visa requirements",
                    "Check travel advisories",
                    "Book accommodations in advance",
                    "Learn basic local phrases"
                ]
            }

        # Customize based on interests if provided
        if interests:
            destination_data["personalized_recommendations"] = []
            for interest in interests:
                if interest.lower() == "food":
                    destination_data["personalized_recommendations"].append(
                        "Try local street food and traditional restaurants"
                    )
                elif interest.lower() == "culture":
                    destination_data["personalized_recommendations"].append(
                        "Visit museums and historical sites early in the day"
                    )
                elif interest.lower() == "adventure":
                    destination_data["personalized_recommendations"].append(
                        "Look for outdoor activities and day trips"
                    )

        logger.info(f"Destination info retrieved for {destination}")
        return destination_data

    except Exception as e:
        logger.error(f"Error getting destination info for {destination}: {e}")
        return {
            "error": f"Unable to retrieve information for {destination}",
            "destination": destination
        }

async def estimate_trip_cost(
    destination: str,
    duration_days: int,
    budget_type: str = "mid_range",
    travelers: int = 1
) -> Dict[str, Any]:
    """
    Estimate total trip cost for planning

    Args:
        destination: Destination city/country
        duration_days: Trip duration in days
        budget_type: Budget category (budget, mid_range, luxury)
        travelers: Number of travelers

    Returns:
        Detailed cost breakdown and estimates
    """

    try:
        # Base daily costs by budget type (USD)
        daily_costs = {
            "budget": {"accommodation": 25, "food": 20, "activities": 15, "transport": 10},
            "mid_range": {"accommodation": 80, "food": 40, "activities": 30, "transport": 20},
            "luxury": {"accommodation": 200, "food": 80, "activities": 60, "transport": 40}
        }

        if budget_type not in daily_costs:
            budget_type = "mid_range"

        costs = daily_costs[budget_type]

        # Calculate total costs
        accommodation_total = costs["accommodation"] * duration_days * travelers
        food_total = costs["food"] * duration_days * travelers
        activities_total = costs["activities"] * duration_days * travelers
        transport_total = costs["transport"] * duration_days * travelers

        # Add flight estimate (simplified)
        flight_estimate = 500 * travelers  # Base estimate

        subtotal = accommodation_total + food_total + activities_total + transport_total + flight_estimate
        emergency_fund = subtotal * 0.1  # 10% buffer
        total_estimate = subtotal + emergency_fund

        cost_breakdown = {
            "destination": destination,
            "duration_days": duration_days,
            "travelers": travelers,
            "budget_category": budget_type,
            "cost_breakdown": {
                "flights": flight_estimate,
                "accommodation": accommodation_total,
                "food": food_total,
                "activities": activities_total,
                "local_transport": transport_total,
                "emergency_buffer": round(emergency_fund, 2)
            },
            "total_estimate": round(total_estimate, 2),
            "currency": "USD",
            "savings_tips": [
                "Book flights 2-3 months in advance",
                "Consider staying in hostels or Airbnb for budget travel",
                "Eat at local markets and street food stalls",
                "Look for free walking tours and city passes"
            ]
        }

        logger.info(f"Trip cost estimated for {destination}: ${total_estimate}")
        return cost_breakdown

    except Exception as e:
        logger.error(f"Error estimating trip cost: {e}")
        return {
            "error": f"Unable to estimate costs for {destination}",
            "destination": destination
        }

async def suggest_itinerary(
    destination: str,
    duration_days: int,
    interests: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Suggest a day-by-day itinerary for a trip

    Args:
        destination: Destination city/country
        duration_days: Trip duration in days
        interests: Traveler interests for customization

    Returns:
        Day-by-day itinerary with activities and tips
    """

    try:
        # Mock itinerary templates
        base_activities = {
            1: "Arrival day - settle in, explore nearby area, light walking tour",
            2: "Major attractions and landmarks - museums, monuments",
            3: "Cultural experiences - local markets, traditional sites",
            4: "Adventure/outdoor activities or day trip to nearby area",
            5: "Shopping, final attractions, departure preparations"
        }

        itinerary = {
            "destination": destination,
            "duration": duration_days,
            "daily_plan": []
        }

        for day in range(1, min(duration_days + 1, 8)):  # Max 7 days for template
            day_plan = {
                "day": day,
                "activities": base_activities.get(day, "Flexible day - choose from remaining attractions"),
                "estimated_budget": 50,  # Base daily budget
                "tips": [
                    "Start early to avoid crowds",
                    "Stay hydrated and take breaks",
                    "Keep copies of important documents"
                ]
            }

            # Customize based on interests
            if interests:
                if "food" in [i.lower() for i in interests]:
                    day_plan["food_focus"] = "Try local specialties and visit food markets"
                if "culture" in [i.lower() for i in interests]:
                    day_plan["cultural_focus"] = "Visit museums and historical sites"
                if "adventure" in [i.lower() for i in interests]:
                    day_plan["adventure_focus"] = "Include outdoor activities or sports"

            itinerary["daily_plan"].append(day_plan)

        itinerary["general_tips"] = [
            "Purchase travel insurance",
            "Download offline maps",
            "Learn key phrases in local language",
            "Research local customs and etiquette"
        ]

        logger.info(f"Itinerary suggested for {destination} ({duration_days} days)")
        return itinerary

    except Exception as e:
        logger.error(f"Error creating itinerary: {e}")
        return {
            "error": f"Unable to create itinerary for {destination}",
            "destination": destination
        }

# Function definitions for Gemini function calling
TRIP_PLANNING_FUNCTIONS = [
    {
        "name": "get_destination_info",
        "description": "Get comprehensive information about a travel destination including attractions, costs, and cultural tips",
        "parameters": {
            "type": "object",
            "properties": {
                "destination": {
                    "type": "string",
                    "description": "City, region, or country name (e.g., 'Tokyo, Japan' or 'Iceland')"
                },
                "interests": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of travel interests (e.g., ['culture', 'food', 'adventure', 'history', 'nature'])",
                    "default": []
                }
            },
            "required": ["destination"]
        }
    },
    {
        "name": "estimate_trip_cost",
        "description": "Estimate total trip cost with detailed breakdown for budget planning",
        "parameters": {
            "type": "object",
            "properties": {
                "destination": {
                    "type": "string",
                    "description": "Travel destination"
                },
                "duration_days": {
                    "type": "integer",
                    "description": "Trip duration in days",
                    "minimum": 1,
                    "maximum": 30
                },
                "budget_type": {
                    "type": "string",
                    "description": "Budget category for cost estimates",
                    "enum": ["budget", "mid_range", "luxury"],
                    "default": "mid_range"
                },
                "travelers": {
                    "type": "integer",
                    "description": "Number of travelers",
                    "minimum": 1,
                    "maximum": 10,
                    "default": 1
                }
            },
            "required": ["destination", "duration_days"]
        }
    },
    {
        "name": "suggest_itinerary",
        "description": "Create a day-by-day itinerary for a trip with personalized recommendations",
        "parameters": {
            "type": "object",
            "properties": {
                "destination": {
                    "type": "string",
                    "description": "Travel destination"
                },
                "duration_days": {
                    "type": "integer",
                    "description": "Trip duration in days",
                    "minimum": 1,
                    "maximum": 14
                },
                "interests": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Travel interests for personalization",
                    "default": []
                }
            },
            "required": ["destination", "duration_days"]
        }
    }
]