"""
YOU Node - Personal Dashboard Data Provider
Provides comprehensive personal data for the user's dashboard display.
"""

import json
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
import logging

from backend.app.services.database import get_database_service
from backend.app.models.domain.pam import PamResponse
from backend.app.services.pam.nodes.base_node import BaseNode

logger = logging.getLogger(__name__)

class YouNode(BaseNode):
    """YOU node - Personal dashboard data aggregation and management"""
    
    def __init__(self):
        super().__init__("you")
        self.database_service = None
    
    async def initialize(self):
        """Initialize YOU node"""
        self.database_service = await get_database_service()
        logger.info("YOU node initialized")
    
    async def process(self, input_data: Dict[str, Any]) -> PamResponse:
        """Generate comprehensive personal dashboard data"""
        if not self.database_service:
            await self.initialize()
        
        user_id = input_data.get('user_id')
        request_type = input_data.get('request_type', 'full_dashboard')
        
        try:
            if request_type == 'calendar_data':
                return await self._get_calendar_data(user_id)
            elif request_type == 'trip_status':
                return await self._get_trip_status(user_id)
            elif request_type == 'budget_summary':
                return await self._get_budget_summary(user_id)
            elif request_type == 'todos':
                return await self._get_todos(user_id)
            elif request_type == 'pam_suggestions':
                return await self._get_pam_daily_suggestions(user_id)
            elif request_type == 'subscription_status':
                return await self._get_subscription_status(user_id)
            else:
                return await self._get_full_dashboard_data(user_id)
                
        except Exception as e:
            logger.error(f"YOU node processing error: {e}")
            return PamResponse(
                content="Dashboard data temporarily unavailable",
                confidence=0.5,
                requires_followup=False
            )
    
    async def _get_full_dashboard_data(self, user_id: str) -> PamResponse:
        """Get all dashboard components in one response"""
        try:
            # Run all dashboard queries concurrently for speed
            dashboard_tasks = [
                self._fetch_calendar_events(user_id),
                self._fetch_trip_status(user_id),
                self._fetch_budget_summary(user_id),
                self._fetch_user_todos(user_id),
                self._generate_pam_suggestions(user_id),
                self._fetch_subscription_info(user_id),
                self._fetch_user_preferences(user_id)
            ]
            
            results = await asyncio.gather(*dashboard_tasks, return_exceptions=True)
            
            calendar_data, trip_status, budget_summary, todos, pam_suggestions, subscription, preferences = results
            
            dashboard_data = {
                'calendar': calendar_data if not isinstance(calendar_data, Exception) else {},
                'trip_status': trip_status if not isinstance(trip_status, Exception) else {},
                'budget_summary': budget_summary if not isinstance(budget_summary, Exception) else {},
                'todos': todos if not isinstance(todos, Exception) else [],
                'pam_suggestions': pam_suggestions if not isinstance(pam_suggestions, Exception) else {},
                'subscription': subscription if not isinstance(subscription, Exception) else {},
                'preferences': preferences if not isinstance(preferences, Exception) else {},
                'last_updated': datetime.now().isoformat()
            }
            
            return PamResponse(
                content=json.dumps(dashboard_data),
                confidence=1.0,
                requires_followup=False
            )
            
        except Exception as e:
            logger.error(f"Full dashboard data error: {e}")
            return PamResponse(
                content=json.dumps({'error': 'Dashboard temporarily unavailable'}),
                confidence=0.3,
                requires_followup=False
            )
    
    async def _fetch_calendar_events(self, user_id: str) -> Dict[str, Any]:
        """Fetch calendar events populated by PAM"""
        try:
            # Get events for the next 30 days
            start_date = date.today()
            end_date = start_date + timedelta(days=30)
            
            query = """
                SELECT id, title, description, start_time, end_time, event_type, 
                       location, all_day, created_by_pam, pam_confidence, reminders
                FROM user_calendar_events 
                WHERE user_id = $1 
                AND date(start_time) BETWEEN $2 AND $3
                ORDER BY start_time ASC
            """
            
            events = await self.database_service.execute_query(
                query, user_id, start_date, end_date,
                cache_key=f"calendar:{user_id}", cache_ttl=300
            )
            
            # Format events for calendar display
            formatted_events = []
            for event in events:
                formatted_events.append({
                    'id': event['id'],
                    'title': event['title'],
                    'description': event['description'],
                    'start': event['start_time'].isoformat(),
                    'end': event['end_time'].isoformat(),
                    'type': event['event_type'],
                    'location': event['location'],
                    'allDay': event['all_day'],
                    'createdByPam': event['created_by_pam'],
                    'pamConfidence': event['pam_confidence'],
                    'reminders': event['reminders'] or []
                })
            
            return {
                'events': formatted_events,
                'total_events': len(formatted_events),
                'pam_created_count': len([e for e in formatted_events if e['createdByPam']])
            }
            
        except Exception as e:
            logger.error(f"Calendar fetch error: {e}")
            return {'events': [], 'error': 'Calendar data unavailable'}
    
    async def _fetch_trip_status(self, user_id: str) -> Dict[str, Any]:
        """Fetch current trip status and next destination"""
        try:
            # Get current trip information
            trip_query = """
                SELECT current_location, next_destination, departure_date, 
                       estimated_arrival, distance_remaining, route_progress
                FROM user_current_trips 
                WHERE user_id = $1 AND status = 'active'
                ORDER BY created_at DESC 
                LIMIT 1
            """
            
            current_trip = await self.database_service.execute_single(trip_query, user_id)
            
            if not current_trip:
                return {'status': 'no_active_trip', 'message': 'No active trip planned'}
            
            # Get weather for next destination
            weather_data = await self._get_destination_weather(current_trip['next_destination'])
            
            # Calculate trip metrics
            days_until_departure = None
            if current_trip['departure_date']:
                days_until_departure = (current_trip['departure_date'] - date.today()).days
            
            return {
                'status': 'active_trip',
                'current_location': current_trip['current_location'],
                'next_destination': current_trip['next_destination'],
                'departure_date': current_trip['departure_date'].isoformat() if current_trip['departure_date'] else None,
                'estimated_arrival': current_trip['estimated_arrival'].isoformat() if current_trip['estimated_arrival'] else None,
                'distance_remaining': current_trip['distance_remaining'],
                'route_progress': current_trip['route_progress'],
                'days_until_departure': days_until_departure,
                'destination_weather': weather_data
            }
            
        except Exception as e:
            logger.error(f"Trip status fetch error: {e}")
            return {'status': 'error', 'message': 'Trip status unavailable'}
    
    async def _fetch_budget_summary(self, user_id: str) -> Dict[str, Any]:
        """Fetch weekly budget breakdown"""
        try:
            # Get current week's expenses
            week_start = date.today() - timedelta(days=date.today().weekday())
            week_end = week_start + timedelta(days=6)
            
            expense_query = """
                SELECT category, SUM(amount) as total
                FROM expenses 
                WHERE user_id = $1 
                AND date BETWEEN $2 AND $3
                GROUP BY category
                ORDER BY total DESC
            """
            
            expenses = await self.database_service.execute_query(
                expense_query, user_id, week_start, week_end,
                cache_key=f"budget_week:{user_id}:{week_start}", cache_ttl=1800
            )
            
            # Get budget targets
            budget_query = """
                SELECT category, weekly_target 
                FROM budget_categories 
                WHERE user_id = $1
            """
            
            budgets = await self.database_service.execute_query(budget_query, user_id)
            budget_targets = {b['category']: b['weekly_target'] for b in budgets}
            
            # Calculate summary
            total_spent = sum(float(exp['total']) for exp in expenses)
            total_budget = sum(budget_targets.values())
            
            expense_breakdown = {}
            for exp in expenses:
                category = exp['category']
                spent = float(exp['total'])
                target = budget_targets.get(category, 0)
                
                expense_breakdown[category] = {
                    'spent': spent,
                    'target': target,
                    'percentage': (spent / target * 100) if target > 0 else 0,
                    'status': 'over' if spent > target else 'under' if target > 0 else 'no_budget'
                }
            
            return {
                'week_start': week_start.isoformat(),
                'week_end': week_end.isoformat(),
                'total_spent': total_spent,
                'total_budget': total_budget,
                'remaining_budget': total_budget - total_spent,
                'expense_breakdown': expense_breakdown,
                'budget_status': 'over' if total_spent > total_budget else 'on_track'
            }
            
        except Exception as e:
            logger.error(f"Budget summary fetch error: {e}")
            return {'error': 'Budget data unavailable'}
    
    async def _fetch_user_todos(self, user_id: str) -> List[Dict[str, Any]]:
        """Fetch user's todos and tasks"""
        try:
            query = """
                SELECT id, title, description, due_date, priority, completed,
                       category, created_by_pam, pam_suggestion_type
                FROM user_todos 
                WHERE user_id = $1 
                AND (completed = false OR completed_at > NOW() - INTERVAL '7 days')
                ORDER BY 
                    CASE priority 
                        WHEN 'high' THEN 1 
                        WHEN 'medium' THEN 2 
                        WHEN 'low' THEN 3 
                    END,
                    due_date ASC NULLS LAST
                LIMIT 20
            """
            
            todos = await self.database_service.execute_query(
                query, user_id,
                cache_key=f"todos:{user_id}", cache_ttl=300
            )
            
            formatted_todos = []
            for todo in todos:
                formatted_todos.append({
                    'id': todo['id'],
                    'title': todo['title'],
                    'description': todo['description'],
                    'due_date': todo['due_date'].isoformat() if todo['due_date'] else None,
                    'priority': todo['priority'],
                    'completed': todo['completed'],
                    'category': todo['category'],
                    'created_by_pam': todo['created_by_pam'],
                    'pam_suggestion_type': todo['pam_suggestion_type'],
                    'overdue': todo['due_date'] < date.today() if todo['due_date'] else False
                })
            
            return formatted_todos
            
        except Exception as e:
            logger.error(f"Todos fetch error: {e}")
            return []
    
    async def _generate_pam_suggestions(self, user_id: str) -> Dict[str, Any]:
        """Generate PAM's daily suggestions"""
        try:
            # Get user context for suggestions
            user_location = await self._get_user_current_location(user_id)
            recent_expenses = await self._get_recent_expense_patterns(user_id)
            travel_plans = await self._get_upcoming_travel_plans(user_id)
            
            suggestions = {
                'expenses': [],
                'fuel_stations': [],
                'campgrounds': [],
                'activities': [],
                'maintenance': []
            }
            
            # Generate expense suggestions based on patterns
            if recent_expenses:
                expense_suggestions = await self._analyze_expense_patterns_for_suggestions(user_id, recent_expenses)
                suggestions['expenses'] = expense_suggestions
            
            # Generate fuel station suggestions if traveling
            if travel_plans:
                fuel_suggestions = await self._generate_fuel_suggestions(user_location, travel_plans)
                suggestions['fuel_stations'] = fuel_suggestions
            
            # Generate campground suggestions
            campground_suggestions = await self._generate_campground_suggestions(user_location, travel_plans)
            suggestions['campgrounds'] = campground_suggestions
            
            # Generate activity suggestions
            activity_suggestions = await self._generate_activity_suggestions(user_location)
            suggestions['activities'] = activity_suggestions
            
            # Generate maintenance reminders
            maintenance_suggestions = await self._generate_maintenance_suggestions(user_id)
            suggestions['maintenance'] = maintenance_suggestions
            
            return {
                'generated_at': datetime.now().isoformat(),
                'location_based': user_location,
                'suggestions': suggestions,
                'total_suggestions': sum(len(v) for v in suggestions.values())
            }
            
        except Exception as e:
            logger.error(f"PAM suggestions generation error: {e}")
            return {'error': 'Suggestions temporarily unavailable'}
    
    async def _fetch_subscription_info(self, user_id: str) -> Dict[str, Any]:
        """Fetch user's subscription status"""
        try:
            query = """
                SELECT subscription_type, status, trial_end_date, billing_cycle,
                       next_billing_date, features_access, video_course_access
                FROM user_subscriptions 
                WHERE user_id = $1 AND status IN ('active', 'trial')
                ORDER BY created_at DESC 
                LIMIT 1
            """
            
            subscription = await self.database_service.execute_single(query, user_id)
            
            if not subscription:
                return {
                    'status': 'no_subscription',
                    'message': 'No active subscription found'
                }
            
            # Calculate trial days remaining
            trial_days_remaining = None
            if subscription['trial_end_date']:
                trial_days_remaining = (subscription['trial_end_date'] - date.today()).days
            
            return {
                'subscription_type': subscription['subscription_type'],
                'status': subscription['status'],
                'trial_end_date': subscription['trial_end_date'].isoformat() if subscription['trial_end_date'] else None,
                'trial_days_remaining': trial_days_remaining,
                'billing_cycle': subscription['billing_cycle'],
                'next_billing_date': subscription['next_billing_date'].isoformat() if subscription['next_billing_date'] else None,
                'features_access': subscription['features_access'],
                'video_course_access': subscription['video_course_access'],
                'needs_upgrade': trial_days_remaining is not None and trial_days_remaining <= 3
            }
            
        except Exception as e:
            logger.error(f"Subscription info fetch error: {e}")
            return {'error': 'Subscription data unavailable'}
    
    # Helper methods for data fetching
    async def _get_destination_weather(self, destination: str) -> Dict[str, Any]:
        """Get weather for destination"""
        # This would integrate with weather API
        return {
            'temperature': 72,
            'condition': 'Partly Cloudy',
            'forecast': '3-day forecast data'
        }
    
    async def _get_user_current_location(self, user_id: str) -> str:
        """Get user's current location"""
        try:
            query = "SELECT current_location FROM user_profiles WHERE user_id = $1"
            result = await self.database_service.execute_single(query, user_id)
            return result['current_location'] if result else 'Unknown'
        except:
            return 'Unknown'
    
    async def _get_recent_expense_patterns(self, user_id: str) -> List[Dict]:
        """Analyze recent expense patterns"""
        try:
            query = """
                SELECT category, AVG(amount) as avg_amount, COUNT(*) as frequency
                FROM expenses 
                WHERE user_id = $1 
                AND date >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY category
            """
            return await self.database_service.execute_query(query, user_id)
        except:
            return []
    
    async def _get_upcoming_travel_plans(self, user_id: str) -> Dict:
        """Get upcoming travel plans"""
        try:
            query = """
                SELECT next_destination, departure_date, estimated_arrival
                FROM user_current_trips 
                WHERE user_id = $1 AND status = 'planned'
                ORDER BY departure_date ASC LIMIT 1
            """
            result = await self.database_service.execute_single(query, user_id)
            return result or {}
        except:
            return {}
    
    # Suggestion generation methods
    async def _analyze_expense_patterns_for_suggestions(self, user_id: str, recent_expenses: List) -> List[Dict]:
        """Generate expense-related suggestions"""
        suggestions = []
        
        for expense in recent_expenses:
            if expense['avg_amount'] > 100:  # High spending category
                suggestions.append({
                    'type': 'expense_alert',
                    'message': f"High spending in {expense['category']} - consider reviewing",
                    'category': expense['category'],
                    'avg_amount': expense['avg_amount']
                })
        
        return suggestions[:3]  # Limit to top 3
    
    async def _generate_fuel_suggestions(self, location: str, travel_plans: Dict) -> List[Dict]:
        """Generate fuel station suggestions"""
        # This would integrate with fuel price APIs
        return [
            {
                'station_name': 'Flying J',
                'price': '$3.45/gal',
                'distance': '2.3 miles',
                'rv_friendly': True
            }
        ]
    
    async def _generate_campground_suggestions(self, location: str, travel_plans: Dict) -> List[Dict]:
        """Generate campground suggestions"""
        # This would integrate with campground APIs
        return [
            {
                'name': 'State Park Campground',
                'price': '$35/night',
                'availability': 'Available',
                'rating': 4.5
            }
        ]
    
    async def _generate_activity_suggestions(self, location: str) -> List[Dict]:
        """Generate activity suggestions"""
        return [
            {
                'activity': 'Local hiking trail',
                'distance': '1.5 miles away',
                'type': 'outdoor'
            }
        ]
    
    async def _generate_maintenance_suggestions(self, user_id: str) -> List[Dict]:
        """Generate RV maintenance suggestions"""
        try:
            query = """
                SELECT task, next_due_date, priority 
                FROM maintenance_schedule 
                WHERE user_id = $1 
                AND next_due_date <= CURRENT_DATE + INTERVAL '30 days'
                ORDER BY next_due_date ASC
            """
            
            maintenance_items = await self.database_service.execute_query(query, user_id)
            
            return [
                {
                    'task': item['task'],
                    'due_date': item['next_due_date'].isoformat(),
                    'priority': item['priority']
                }
                for item in maintenance_items
            ]
        except:
            return []
    
    async def _fetch_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Fetch user preferences for dashboard customization"""
        try:
            query = """
                SELECT dashboard_layout, news_sources, notification_preferences,
                       timezone, currency, measurement_units
                FROM user_preferences 
                WHERE user_id = $1
            """
            
            prefs = await self.database_service.execute_single(query, user_id)
            return prefs or {}
        except:
            return {}

# Global YOU node instance
you_node = YouNode()
