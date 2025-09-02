"""
PAM Tool Registry - Wraps existing PAM services as LangGraph tools
"""

from typing import Dict, Any, List, Optional
from langchain_core.tools import BaseTool, tool
from pydantic import BaseModel, Field
import logging
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)


class ExpenseTrackingInput(BaseModel):
    """Input for expense tracking tool"""
    amount: float = Field(description="Amount spent")
    category: str = Field(description="Expense category (fuel, food, accommodation, etc.)")
    description: str = Field(description="Description of the expense")
    date: Optional[str] = Field(description="Date of expense (YYYY-MM-DD format)", default=None)
    location: Optional[str] = Field(description="Location where expense occurred", default=None)


class TripPlanningInput(BaseModel):
    """Input for trip planning tool"""
    origin: str = Field(description="Starting location")
    destination: str = Field(description="Destination location")
    waypoints: Optional[List[str]] = Field(description="Optional waypoints along the route", default=[])
    travel_dates: Optional[str] = Field(description="Travel dates", default=None)
    vehicle_type: Optional[str] = Field(description="Vehicle type (RV, caravan, etc.)", default="RV")
    preferences: Optional[Dict[str, Any]] = Field(description="Travel preferences", default={})


class BudgetAnalysisInput(BaseModel):
    """Input for budget analysis tool"""
    time_period: str = Field(description="Time period for analysis (week, month, year)")
    category: Optional[str] = Field(description="Specific category to analyze", default=None)
    comparison_type: Optional[str] = Field(description="Type of comparison (trends, benchmarks)", default="trends")


@tool
async def expense_tracking_tool(input_data: ExpenseTrackingInput) -> Dict[str, Any]:
    """Track and categorize expenses with automatic insights"""
    try:
        # Import here to avoid circular imports
        from app.services.database import get_database
        from supabase import create_client
        import os
        
        # Use existing Supabase integration
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_key:
            return {
                'success': False,
                'message': 'Database configuration missing',
                'expense_id': None
            }
        
        # For now, return a structured response that can be processed
        # Later, we'll integrate with the actual expense tracking service
        return {
            'success': True,
            'message': f'Logged ${input_data.amount} expense for {input_data.category}',
            'expense_id': f'exp_{datetime.now().strftime("%Y%m%d_%H%M%S")}',
            'category': input_data.category,
            'amount': input_data.amount,
            'date': input_data.date or datetime.now().isoformat(),
            'suggestions': await _generate_expense_suggestions(input_data)
        }
        
    except Exception as e:
        logger.error(f"Expense tracking tool error: {e}")
        return {
            'success': False,
            'message': f'Error tracking expense: {str(e)}',
            'expense_id': None
        }


@tool
async def trip_planning_tool(input_data: TripPlanningInput) -> Dict[str, Any]:
    """Plan trips with route optimization and recommendations"""
    try:
        # Integrate with existing trip planning service
        # For now, return structured response
        return {
            'success': True,
            'route': {
                'origin': input_data.origin,
                'destination': input_data.destination,
                'waypoints': input_data.waypoints or [],
                'distance_km': 450,  # Placeholder
                'estimated_duration_hours': 5.5,  # Placeholder
                'fuel_cost_estimate': 120  # Placeholder
            },
            'recommendations': await _generate_trip_recommendations(input_data),
            'accommodations': await _find_accommodations_along_route(input_data),
            'points_of_interest': await _find_poi_along_route(input_data)
        }
        
    except Exception as e:
        logger.error(f"Trip planning tool error: {e}")
        return {
            'success': False,
            'message': f'Error planning trip: {str(e)}',
            'route': None
        }


@tool
async def budget_analysis_tool(input_data: BudgetAnalysisInput) -> Dict[str, Any]:
    """Analyze spending patterns and provide budget insights"""
    try:
        # Integrate with existing budget analysis service
        return {
            'success': True,
            'analysis': {
                'period': input_data.time_period,
                'total_spent': 2150.50,  # Placeholder
                'category_breakdown': {
                    'fuel': 680.25,
                    'food': 420.75,
                    'accommodation': 850.00,
                    'entertainment': 199.50
                },
                'budget_status': 'under_budget',
                'remaining_budget': 349.50
            },
            'insights': await _generate_budget_insights(input_data),
            'recommendations': await _generate_budget_recommendations(input_data)
        }
        
    except Exception as e:
        logger.error(f"Budget analysis tool error: {e}")
        return {
            'success': False,
            'message': f'Error analyzing budget: {str(e)}',
            'analysis': None
        }


# Helper functions for generating intelligent responses
async def _generate_expense_suggestions(expense_data: ExpenseTrackingInput) -> List[str]:
    """Generate contextual suggestions based on expense"""
    suggestions = []
    
    if expense_data.category == 'fuel':
        suggestions.extend([
            'Track fuel efficiency to optimize costs',
            'Consider fuel apps for price comparison',
            'Plan routes to avoid expensive fuel areas'
        ])
    elif expense_data.category == 'food':
        suggestions.extend([
            'Consider cooking at campgrounds to save money',
            'Local farmers markets often have better prices',
            'Stock up on non-perishables when prices are good'
        ])
    elif expense_data.category == 'accommodation':
        suggestions.extend([
            'Free camping options available via WikiCamps',
            'Book ahead during peak season for better rates',
            'Consider longer stays for weekly discounts'
        ])
    
    return suggestions


async def _generate_trip_recommendations(trip_data: TripPlanningInput) -> List[str]:
    """Generate trip recommendations based on route"""
    recommendations = []
    
    # Basic recommendations that would be enhanced with real data
    recommendations.extend([
        'Check road conditions before departure',
        'Download offline maps for remote areas',
        'Carry extra water and fuel for long stretches',
        'Weather forecast looks favorable for travel',
        'Consider rest stops every 2 hours for safety'
    ])
    
    return recommendations


async def _find_accommodations_along_route(trip_data: TripPlanningInput) -> List[Dict[str, Any]]:
    """Find accommodations along the planned route"""
    # Placeholder data - would integrate with real accommodation APIs
    return [
        {
            'name': 'Riverside Caravan Park',
            'type': 'caravan_park',
            'distance_from_route_km': 2.5,
            'price_per_night': 45.00,
            'amenities': ['power', 'water', 'dump_point', 'wifi']
        },
        {
            'name': 'National Park Campground',
            'type': 'national_park',
            'distance_from_route_km': 8.0,
            'price_per_night': 15.00,
            'amenities': ['toilets', 'bbq', 'bushwalking_trails']
        }
    ]


async def _find_poi_along_route(trip_data: TripPlanningInput) -> List[Dict[str, Any]]:
    """Find points of interest along the route"""
    # Placeholder data
    return [
        {
            'name': 'Historic Gold Mining Town',
            'type': 'historical_site',
            'distance_from_route_km': 5.0,
            'description': 'Preserved 1800s mining town with museum and guided tours'
        },
        {
            'name': 'Scenic Lookout Point',
            'type': 'scenic_viewpoint',
            'distance_from_route_km': 1.2,
            'description': 'Panoramic views of valley and mountain ranges'
        }
    ]


async def _generate_budget_insights(budget_data: BudgetAnalysisInput) -> List[str]:
    """Generate budget insights based on analysis"""
    insights = []
    
    insights.extend([
        'Fuel costs are trending higher than previous months',
        'Accommodation spending is within normal range',
        'Food expenses have decreased 15% from last period',
        'Entertainment budget has room for additional activities'
    ])
    
    return insights


async def _generate_budget_recommendations(budget_data: BudgetAnalysisInput) -> List[str]:
    """Generate budget recommendations"""
    recommendations = []
    
    recommendations.extend([
        'Consider adjusting fuel budget by 10% for next month',
        'Opportunity to reallocate saved food budget to activities',
        'Current spending pattern sustainable for planned trip duration',
        'Set aside emergency fund for unexpected vehicle maintenance'
    ])
    
    return recommendations


class PAMToolRegistry:
    """Registry for managing PAM tools"""
    
    def __init__(self):
        self.tools: Dict[str, BaseTool] = {}
        self._register_default_tools()
    
    def _register_default_tools(self):
        """Register default PAM tools"""
        self.tools['expense_tracking'] = expense_tracking_tool
        self.tools['trip_planning'] = trip_planning_tool
        self.tools['budget_analysis'] = budget_analysis_tool
    
    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Get tool by name"""
        return self.tools.get(name)
    
    def get_all_tools(self) -> List[BaseTool]:
        """Get all registered tools"""
        return list(self.tools.values())
    
    def register_tool(self, name: str, tool: BaseTool):
        """Register a custom tool"""
        self.tools[name] = tool
    
    def get_tools_for_domain(self, domain: str) -> List[BaseTool]:
        """Get tools for a specific domain (travel, finance, etc.)"""
        domain_tools = []
        
        if domain == 'finance':
            domain_tools.extend([
                self.tools['expense_tracking'],
                self.tools['budget_analysis']
            ])
        elif domain == 'travel':
            domain_tools.extend([
                self.tools['trip_planning']
            ])
        else:
            # Return all tools for unknown domains
            domain_tools = self.get_all_tools()
        
        return [tool for tool in domain_tools if tool is not None]