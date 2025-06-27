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

    async def set_user_preferences(self, user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Set user preferences for the system"""
        try:
            query = """
                INSERT INTO user_preferences 
                (user_id, dashboard_layout, notification_preferences, privacy_settings)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id) DO UPDATE
                SET dashboard_layout = COALESCE($2, user_preferences.dashboard_layout),
                    notification_preferences = COALESCE($3, user_preferences.notification_preferences),
                    privacy_settings = COALESCE($4, user_preferences.privacy_settings)
            """
            
            await self.database_service.execute_write(
                query,
                user_id,
                preferences.get('dashboard_layout'),
                preferences.get('notification_preferences'),
                preferences.get('privacy_settings')
            )
            
            return {"success": True, "message": "Preferences updated"}
            
        except Exception as e:
            logger.error(f"Error setting preferences: {e}")
            return {"success": False, "error": str(e)}

    async def get_personalized_dashboard(self, user_id: str) -> Dict[str, Any]:
        """Get personalized dashboard data for the user"""
        try:
            # Fetch user's dashboard preferences
            prefs = await self._fetch_user_preferences(user_id)
            
            # Get various dashboard components
            calendar_events = await self._fetch_calendar_events(user_id)
            trip_status = await self._fetch_trip_status(user_id)
            budget_summary = await self._fetch_budget_summary(user_id)
            todos = await self._fetch_user_todos(user_id)
            
            return {
                "success": True,
                "dashboard": {
                    "layout": prefs.get('dashboard_layout', 'default'),
                    "widgets": {
                        "calendar": calendar_events,
                        "trip_status": trip_status,
                        "budget": budget_summary,
                        "todos": todos
                    },
                    "last_updated": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting dashboard: {e}")
            return {"success": False, "error": str(e)}

    async def schedule_maintenance_reminder(self, user_id: str, maintenance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Schedule a maintenance reminder for the user's vehicle"""
        try:
            maintenance_type = maintenance_data.get('type')
            due_date = maintenance_data.get('due_date')
            mileage_due = maintenance_data.get('mileage_due')
            notes = maintenance_data.get('notes', '')
            
            query = """
                INSERT INTO maintenance_reminders
                (user_id, maintenance_type, due_date, mileage_due, notes, is_active)
                VALUES ($1, $2, $3, $4, $5, true)
                RETURNING id
            """
            
            result = await self.database_service.execute_single(
                query, user_id, maintenance_type, due_date, mileage_due, notes
            )
            
            return {
                "success": True,
                "reminder_id": result['id'] if result else None,
                "message": f"Maintenance reminder set for {maintenance_type}"
            }
            
        except Exception as e:
            logger.error(f"Error scheduling maintenance: {e}")
            return {"success": False, "error": str(e)}

    async def get_travel_timeline(self, user_id: str, timeframe: str = "month") -> Dict[str, Any]:
        """Get user's travel timeline for planning"""
        try:
            # Calculate date range
            start_date = datetime.now()
            if timeframe == "week":
                end_date = start_date + timedelta(days=7)
            elif timeframe == "month":
                end_date = start_date + timedelta(days=30)
            else:
                end_date = start_date + timedelta(days=90)
            
            # Get travel events
            query = """
                SELECT * FROM travel_plans
                WHERE user_id = $1 
                AND start_date BETWEEN $2 AND $3
                ORDER BY start_date
            """
            
            events = await self.database_service.execute_many(
                query, user_id, start_date, end_date
            )
            
            return {
                "success": True,
                "timeline": {
                    "timeframe": timeframe,
                    "events": events or [],
                    "total_days": (end_date - start_date).days
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting travel timeline: {e}")
            return {"success": False, "error": str(e)}


    async def create_calendar_event(self, user_id: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new calendar event"""
        try:
            title = event_data.get('title')
            description = event_data.get('description', '')
            start_time = event_data.get('start_time')
            duration_hours = event_data.get('duration_hours', 1)
            location = event_data.get('location', '')
            event_type = event_data.get('type', 'general')
            
            # Parse start time
            if isinstance(start_time, str):
                start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            else:
                start_dt = start_time
                
            end_dt = start_dt + timedelta(hours=duration_hours)
            
            # Store in database
            query = """
                INSERT INTO calendar_events 
                (user_id, title, description, start_time, end_time, location, event_type)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            """
            
            result = await self.database_service.execute_single(
                query, user_id, title, description, start_dt, end_dt, location, event_type
            )
            
            return {
                "success": True,
                "event_id": result['id'] if result else None,
                "message": f"Created '{title}' for {start_dt.strftime('%B %d at %I:%M %p')}"
            }
            
        except Exception as e:
            logger.error(f"Error creating calendar event: {e}")
            return {"success": False, "error": str(e)}

    async def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Get complete user profile"""
        try:
            query = """
                SELECT u.*, p.travel_style, p.budget_preferences, p.vehicle_info
                FROM users u
                LEFT JOIN user_profiles p ON u.id = p.user_id
                WHERE u.id = $1
            """
            
            profile = await self.database_service.execute_single(query, user_id)
            return profile or {}
            
        except Exception as e:
            logger.error(f"Error getting user profile: {e}")
            return {}

    async def update_user_profile(self, user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile information"""
        try:
            # Update main user info if provided
            if any(key in profile_data for key in ['name', 'email', 'phone']):
                user_query = """
                    UPDATE users 
                    SET name = COALESCE($2, name),
                        email = COALESCE($3, email),
                        phone = COALESCE($4, phone),
                        updated_at = NOW()
                    WHERE id = $1
                """
                await self.database_service.execute_write(
                    user_query,
                    user_id,
                    profile_data.get('name'),
                    profile_data.get('email'),
                    profile_data.get('phone')
                )
            
            # Update profile details
            profile_query = """
                INSERT INTO user_profiles (user_id, travel_style, budget_preferences, vehicle_info)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id) DO UPDATE
                SET travel_style = COALESCE($2, user_profiles.travel_style),
                    budget_preferences = COALESCE($3, user_profiles.budget_preferences),
                    vehicle_info = COALESCE($4, user_profiles.vehicle_info)
            """
            
            await self.database_service.execute_write(
                profile_query,
                user_id,
                profile_data.get('travel_style'),
                profile_data.get('budget_preferences'),
                profile_data.get('vehicle_info')
            )
            
            return {"success": True, "message": "Profile updated successfully"}
            
        except Exception as e:
            logger.error(f"Error updating profile: {e}")
            return {"success": False, "error": str(e)}

you_node = YouNode()
