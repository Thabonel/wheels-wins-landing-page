import logging
from typing import List, Dict, Any
from dataclasses import dataclass
from datetime import datetime

from app.services.pam.proactive.triggers import (
    TravelPatternTrigger,
    FinancialTrigger,
    CalendarTrigger
)
from app.services.pam.proactive.data_integration import get_proactive_data, get_comprehensive_user_context

logger = logging.getLogger(__name__)

@dataclass
class ProactiveSuggestion:
    """Represents a proactive suggestion for the user"""
    type: str
    priority: str  # low, medium, high, urgent
    message: str
    actions: List[str]
    data: Dict[str, Any]
    created_at: datetime

class ProactiveSuggestionEngine:
    """Analyzes user context and generates proactive suggestions"""

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.data_integrator = None
        self.triggers = [
            TravelPatternTrigger(),
            FinancialTrigger(),
            CalendarTrigger()
        ]

    async def initialize(self):
        """Initialize the suggestion engine with data integrator"""
        if not self.data_integrator:
            self.data_integrator = await get_proactive_data()

    async def analyze_and_suggest(self, user_data: Dict[str, Any]) -> List[ProactiveSuggestion]:
        """Analyze user data and generate relevant suggestions"""
        suggestions = []

        for trigger in self.triggers:
            try:
                if await trigger.should_trigger(user_data):
                    suggestion_data = await trigger.generate_suggestion(user_data)

                    suggestion = ProactiveSuggestion(
                        type=suggestion_data["type"],
                        priority=suggestion_data["priority"],
                        message=suggestion_data["message"],
                        actions=suggestion_data["actions"],
                        data=suggestion_data.get("data", {}),
                        created_at=datetime.now()
                    )

                    suggestions.append(suggestion)
                    logger.info(f"Generated {suggestion.type} suggestion for user {self.user_id}")

            except Exception as e:
                logger.error(f"Error with trigger {trigger.__class__.__name__}: {e}")
                continue

        # Sort by priority (urgent > high > medium > low)
        priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        suggestions.sort(key=lambda s: priority_order.get(s.priority, 3))

        return suggestions

    async def get_user_context(self) -> Dict[str, Any]:
        """
        Gather comprehensive user context using enhanced data integration

        Uses the new comprehensive context function for complete user analysis.
        """
        logger.info(f"Gathering comprehensive user context for {self.user_id}")

        try:
            # Use the enhanced comprehensive context function
            context = await get_comprehensive_user_context(self.user_id)

            # Add additional context needed for suggestion triggers
            await self.initialize()

            # Enhance with weather forecast
            user_location = await self.data_integrator.get_user_location(self.user_id)
            weather_forecast = await self.data_integrator.get_weather_forecast(user_id=self.user_id)

            # Add travel events analysis
            travel_events_analysis = await self.data_integrator.get_travel_events_analysis(self.user_id)

            # Restructure context for backward compatibility with triggers
            enhanced_context = {
                # Core data (backward compatible)
                "fuel_level": context.get("travel", {}).get("fuel_level", 75.0),
                "current_location": user_location,
                "monthly_spending": context.get("financial", {}).get("monthly_spending", 0.0),
                "monthly_budget": context.get("financial", {}).get("monthly_budget", 0.0),
                "upcoming_events": context.get("calendar", {}).get("upcoming_events", []),
                "weather_forecast": weather_forecast,
                "recent_expenses": [],  # Will be populated below
                "travel_patterns": context.get("travel", {}).get("patterns", {}),

                # Enhanced data
                "user_profile": context.get("user_profile", {}),
                "financial_analysis": context.get("financial", {}),
                "travel_analysis": context.get("travel", {}),
                "maintenance_status": context.get("maintenance", {}),
                "travel_events_analysis": travel_events_analysis,
                "data_quality": context.get("data_quality", {}),
                "context_timestamp": context.get("context_timestamp"),

                # Derived insights
                "budget_utilization": context.get("financial", {}).get("budget_utilization", 0),
                "needs_immediate_attention": self._assess_immediate_needs(context, travel_events_analysis),
                "planning_opportunities": self._identify_planning_opportunities(context, travel_events_analysis)
            }

            # Get recent expenses with details for better analysis
            recent_expenses = await self.data_integrator.get_recent_expenses(self.user_id, limit=10)
            enhanced_context["recent_expenses"] = [exp.get("amount", 0) for exp in recent_expenses]
            enhanced_context["recent_expenses_detailed"] = recent_expenses

            logger.info(f"Enhanced user context gathered for {self.user_id}: "
                       f"fuel={enhanced_context['fuel_level']}%, "
                       f"spending=${enhanced_context['monthly_spending']:.2f}, "
                       f"budget=${enhanced_context['monthly_budget']:.2f}, "
                       f"events={len(enhanced_context['upcoming_events'])}, "
                       f"budget_util={enhanced_context['budget_utilization']:.1f}%")

            return enhanced_context

        except Exception as e:
            logger.error(f"Error gathering enhanced user context for {self.user_id}: {e}")
            # Fallback to basic context
            return await self._get_basic_context_fallback()

    def _assess_immediate_needs(self, context: Dict[str, Any], travel_analysis: Dict[str, Any]) -> List[str]:
        """Assess what needs immediate attention"""
        immediate_needs = []

        # Check fuel level
        fuel_level = context.get("travel", {}).get("fuel_level", 75)
        if fuel_level < 25:
            immediate_needs.append("critical_fuel_low")
        elif fuel_level < 50:
            immediate_needs.append("fuel_low")

        # Check budget utilization
        budget_util = context.get("financial", {}).get("budget_utilization", 0)
        if budget_util > 90:
            immediate_needs.append("budget_exceeded")
        elif budget_util > 75:
            immediate_needs.append("budget_warning")

        # Check maintenance
        maintenance = context.get("maintenance", {})
        if maintenance.get("overdue_maintenance"):
            immediate_needs.append("maintenance_overdue")
        elif maintenance.get("health_score", 100) < 70:
            immediate_needs.append("maintenance_needed")

        # Check travel planning urgency
        planning_urgency = travel_analysis.get("planning_urgency", "low")
        if planning_urgency == "high":
            immediate_needs.append("urgent_travel_planning")

        return immediate_needs

    def _identify_planning_opportunities(self, context: Dict[str, Any], travel_analysis: Dict[str, Any]) -> List[str]:
        """Identify planning opportunities"""
        opportunities = []

        # Travel planning opportunities
        travel_events = travel_analysis.get("travel_events", [])
        if travel_events:
            opportunities.append("trip_planning_available")

        # Budget optimization opportunities
        budget_util = context.get("financial", {}).get("budget_utilization", 0)
        if budget_util < 50:
            opportunities.append("budget_optimization")

        # Fuel efficiency opportunities
        travel_patterns = context.get("travel", {}).get("patterns", {})
        fuel_efficiency = travel_patterns.get("fuel_efficiency", 0)
        if fuel_efficiency > 0 and fuel_efficiency < 15:
            opportunities.append("fuel_efficiency_improvement")

        # Maintenance scheduling opportunities
        maintenance = context.get("maintenance", {})
        upcoming_maintenance = maintenance.get("upcoming_maintenance", [])
        if upcoming_maintenance:
            opportunities.append("maintenance_scheduling")

        return opportunities

    async def _get_basic_context_fallback(self) -> Dict[str, Any]:
        """Fallback to basic context if enhanced context fails"""
        try:
            await self.initialize()

            return {
                "fuel_level": await self.data_integrator.get_fuel_level(self.user_id),
                "current_location": await self.data_integrator.get_user_location(self.user_id),
                "monthly_spending": await self.data_integrator.get_monthly_spending(self.user_id),
                "monthly_budget": await self.data_integrator.get_monthly_budget(self.user_id),
                "upcoming_events": await self.data_integrator.get_upcoming_events(self.user_id),
                "weather_forecast": await self.data_integrator.get_weather_forecast(user_id=self.user_id),
                "recent_expenses": [exp.get("amount", 0) for exp in await self.data_integrator.get_recent_expenses(self.user_id)],
                "travel_patterns": await self.data_integrator.get_travel_patterns(self.user_id),
                "budget_utilization": 0,
                "needs_immediate_attention": [],
                "planning_opportunities": []
            }

        except Exception as e:
            logger.error(f"Error in fallback context for {self.user_id}: {e}")
            return {
                "fuel_level": 75.0,
                "current_location": {},
                "monthly_spending": 0.0,
                "monthly_budget": 0.0,
                "upcoming_events": [],
                "weather_forecast": {"clear_days": 3},
                "recent_expenses": [],
                "travel_patterns": {"avg_trip_length": 250, "preferred_fuel_stops": 2},
                "budget_utilization": 0,
                "needs_immediate_attention": [],
                "planning_opportunities": []
            }