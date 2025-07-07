from typing import Dict, List, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from app.core.logging import setup_logging
from app.core.database import get_supabase_client

logger = setup_logging("you_node")


@dataclass
class CalendarEvent:
    id: str
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    location: str
    event_type: str
    reminder_set: bool
    attendees: List[str]


@dataclass
class UserPreference:
    category: str
    preference_key: str
    value: Any
    confidence_score: float
    last_updated: datetime


class YouNode:
    """Handles personal dashboard, calendar, and profile management"""

    def __init__(self):
        self.logger = setup_logging("you_node")
        self.supabase = get_supabase_client()

    async def create_calendar_event(
        self, user_id: str, event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a new calendar event"""
        try:
            title = event_data.get("title")
            description = event_data.get("description", "")
            start_time = event_data.get("start_time")
            duration_hours = event_data.get("duration_hours", 1)
            location = event_data.get("location", "")
            event_type = event_data.get("type", "general")

            # Parse start time
            if isinstance(start_time, str):
                start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
            else:
                start_dt = start_time

            end_dt = start_dt + timedelta(hours=duration_hours)

            # Check for conflicts
            conflicts = await self._check_calendar_conflicts(user_id, start_dt, end_dt)

            # Generate suggestions if needed
            suggestions = await self._generate_event_suggestions(
                title, event_type, location
            )

            event_id = f"event_{user_id}_{datetime.now().timestamp()}"

            event = CalendarEvent(
                id=event_id,
                title=title,
                description=description,
                start_time=start_dt,
                end_time=end_dt,
                location=location,
                event_type=event_type,
                reminder_set=True,
                attendees=[],
            )

            payload = {
                "id": event_id,
                "user_id": user_id,
                "title": title,
                "description": description,
                "date": start_dt.date().isoformat(),
                "start_time": start_dt.strftime("%H:%M:%S"),
                "end_time": end_dt.strftime("%H:%M:%S"),
                "timezone": event_data.get("timezone", "UTC"),
                "location": location,
                "type": event_type,
            }

            insert_result = (
                self.supabase.table("calendar_events").insert(payload).execute()
            )

            if not insert_result.data:
                self.logger.error(f"Error inserting calendar event: {insert_result}")
                return {
                    "success": False,
                    "error": str(insert_result),
                    "message": "Failed to save calendar event.",
                }

            return {
                "success": True,
                "data": {
                    "event": event.__dict__,
                    "conflicts": conflicts,
                    "suggestions": suggestions,
                    "reminders_set": (
                        ["15 minutes before", "1 day before"]
                        if event_type in ["appointment", "important"]
                        else ["15 minutes before"]
                    ),
                },
                "message": f"Created '{title}' for {start_dt.strftime('%B %d at %I:%M %p')}",
                "actions": [
                    {"type": "navigate", "target": "/you/calendar"},
                    {
                        "type": "highlight",
                        "element": f".calendar-event[data-id='{event_id}']",
                    },
                    {
                        "type": "show_notification",
                        "message": (
                            f"Event created! {len(conflicts)} conflicts found."
                            if conflicts
                            else "Event created successfully!"
                        ),
                        "type": "warning" if conflicts else "success",
                    },
                ],
            }

        except Exception as e:
            self.logger.error(f"Error creating calendar event: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I couldn't create your calendar event. Please check the details and try again.",
            }

    async def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Get user profile from Supabase profiles table"""
        try:
            response = (
                self.supabase.table("profiles")
                .select("*")
                .eq("user_id", user_id)
                .single()
                .execute()
            )

            if not response.data:
                # Create basic profile if none exists
                basic_profile = {
                    "user_id": user_id,
                    "email": "",
                    "region": "Australia",
                    "travel_preferences": {},
                    "vehicle_info": {},
                    "budget_preferences": {},
                }

                create_response = (
                    self.supabase.table("profiles").insert(basic_profile).execute()
                )
                return {
                    "success": True,
                    "profile": create_response.data[0],
                    "message": "Created new profile",
                }

            profile = response.data

            # Enrich profile with default values for missing data
            enriched_profile = await self._enrich_profile_data(profile)

            return {
                "success": True,
                "profile": enriched_profile,
                "completeness": await self._calculate_profile_completeness_from_data(
                    enriched_profile
                ),
            }

        except Exception as e:
            self.logger.error(f"Error fetching user profile: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Could not retrieve profile data",
            }

    async def update_user_profile(
        self, user_id: str, profile_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update user profile information in Supabase"""
        try:
            # Build update object with only provided fields
            updates = {}

            # Handle travel preferences
            if "travel_preferences" in profile_data:
                updates["travel_preferences"] = profile_data["travel_preferences"]
            elif any(
                key in profile_data
                for key in ["travel_style", "camp_types", "drive_limit"]
            ):
                # Get existing travel preferences
                existing_profile = await self.get_user_profile(user_id)
                travel_prefs = existing_profile.get("profile", {}).get(
                    "travel_preferences", {}
                )

                if "travel_style" in profile_data:
                    travel_prefs["style"] = profile_data["travel_style"]
                if "camp_types" in profile_data:
                    travel_prefs["camp_types"] = profile_data["camp_types"]
                if "drive_limit" in profile_data:
                    travel_prefs["drive_limit"] = profile_data["drive_limit"]

                updates["travel_preferences"] = travel_prefs

            # Handle vehicle info
            if "vehicle_info" in profile_data:
                updates["vehicle_info"] = profile_data["vehicle_info"]
            elif any(
                key in profile_data
                for key in ["vehicle_type", "vehicle_make_model_year", "fuel_type"]
            ):
                # Get existing vehicle info
                existing_profile = await self.get_user_profile(user_id)
                vehicle_info = existing_profile.get("profile", {}).get(
                    "vehicle_info", {}
                )

                if "vehicle_type" in profile_data:
                    vehicle_info["type"] = profile_data["vehicle_type"]
                if "vehicle_make_model_year" in profile_data:
                    vehicle_info["make_model_year"] = profile_data[
                        "vehicle_make_model_year"
                    ]
                if "fuel_type" in profile_data:
                    vehicle_info["fuel_type"] = profile_data["fuel_type"]

                updates["vehicle_info"] = vehicle_info

            # Handle budget preferences
            if "budget_preferences" in profile_data:
                updates["budget_preferences"] = profile_data["budget_preferences"]

            # Handle basic profile fields
            for field in ["email", "region", "full_name", "nickname"]:
                if field in profile_data:
                    updates[field] = profile_data[field]

            # Update the profile in Supabase
            response = (
                self.supabase.table("profiles")
                .update(updates)
                .eq("user_id", user_id)
                .execute()
            )

            if not response.data:
                return {
                    "success": False,
                    "error": "Profile not found",
                    "message": "Could not update profile - user not found",
                }

            updated_profile = response.data[0]

            # Generate personalized recommendations based on new profile
            recommendations = await self._generate_profile_recommendations(
                user_id, updates
            )

            return {
                "success": True,
                "data": {
                    "updated_fields": list(updates.keys()),
                    "profile": updated_profile,
                    "profile_completeness": await self._calculate_profile_completeness_from_data(
                        updated_profile
                    ),
                    "recommendations": recommendations,
                },
                "message": f"Updated {len(updates)} profile fields successfully!",
                "actions": [
                    {"type": "navigate", "target": "/you/profile"},
                    {"type": "update_form", "form_id": "profile-form", "data": updates},
                ],
            }

        except Exception as e:
            self.logger.error(f"Error updating profile: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I couldn't update your profile. Please try again.",
            }

    async def set_user_preferences(
        self, user_id: str, preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Set or update user preferences"""
        try:
            preference_updates = []

            for category, prefs in preferences.items():
                for key, value in prefs.items():
                    preference = UserPreference(
                        category=category,
                        preference_key=key,
                        value=value,
                        confidence_score=1.0,  # User explicitly set
                        last_updated=datetime.now(),
                    )
                    preference_updates.append(preference)

            # Apply preferences to relevant areas
            applied_changes = await self._apply_preferences_globally(
                user_id, preference_updates
            )

            return {
                "success": True,
                "data": {
                    "preferences_updated": len(preference_updates),
                    "applied_changes": applied_changes,
                    "categories_affected": list(preferences.keys()),
                },
                "message": f"Updated {len(preference_updates)} preferences across {len(preferences)} categories",
                "actions": [
                    {"type": "navigate", "target": "/you/preferences"},
                    {"type": "update_preferences", "preferences": preferences},
                    {
                        "type": "show_toast",
                        "message": "Preferences saved! Changes will take effect immediately.",
                        "type": "success",
                    },
                ],
            }

        except Exception as e:
            self.logger.error(f"Error setting preferences: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I couldn't save your preferences. Please try again.",
            }

    async def get_personalized_dashboard(self, user_id: str) -> Dict[str, Any]:
        """Generate a personalized dashboard view"""
        try:
            # Get user's current context
            user_context = await self._get_user_context(user_id)

            # Get upcoming events
            upcoming_events = await self._get_upcoming_events(user_id, days=7)

            # Get relevant insights
            insights = await self._generate_personal_insights(user_id)

            # Get quick actions based on user patterns
            quick_actions = await self._get_personalized_quick_actions(user_id)

            # Get relevant notifications
            notifications = await self._get_pending_notifications(user_id)

            dashboard_data = {
                "user_context": user_context,
                "upcoming_events": [e.__dict__ for e in upcoming_events],
                "personal_insights": insights,
                "quick_actions": quick_actions,
                "notifications": notifications,
                "dashboard_layout": await self._get_preferred_layout(user_id),
            }

            return {
                "success": True,
                "data": dashboard_data,
                "message": f"Your personalized dashboard with {len(upcoming_events)} upcoming events",
                "actions": [
                    {"type": "navigate", "target": "/you"},
                    {"type": "update_dashboard", "data": dashboard_data},
                    {
                        "type": "highlight",
                        "element": (
                            ".urgent-items"
                            if any(n.get("priority") == "high" for n in notifications)
                            else ".recent-activity"
                        ),
                    },
                ],
            }

        except Exception as e:
            self.logger.error(f"Error generating dashboard: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I couldn't load your personalized dashboard. Please try again.",
            }

    async def schedule_maintenance_reminder(
        self, user_id: str, maintenance_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Schedule vehicle or equipment maintenance reminders"""
        try:
            item_type = maintenance_data.get("type")  # vehicle, equipment, etc.
            item_name = maintenance_data.get("name")
            maintenance_type = maintenance_data.get(
                "maintenance_type"
            )  # service, inspection, etc.
            due_date = maintenance_data.get("due_date")
            current_reading = maintenance_data.get("current_reading")  # km, hours, etc.
            service_interval = maintenance_data.get("interval")

            # Calculate next due date/reading
            next_due = await self._calculate_next_maintenance(maintenance_data)

            # Create calendar events for reminders
            reminder_events = await self._create_maintenance_reminders(
                user_id, maintenance_data, next_due
            )

            return {
                "success": True,
                "data": {
                    "maintenance_scheduled": {
                        "item": f"{item_name} ({item_type})",
                        "type": maintenance_type,
                        "next_due": next_due,
                        "current_reading": current_reading,
                        "interval": service_interval,
                    },
                    "reminders_created": len(reminder_events),
                    "reminder_schedule": reminder_events,
                },
                "message": f"Scheduled {maintenance_type} reminders for {item_name}",
                "actions": [
                    {"type": "navigate", "target": "/you/calendar"},
                    {"type": "filter_calendar", "filter": "maintenance"},
                    {"type": "highlight", "element": ".maintenance-reminders"},
                ],
            }

        except Exception as e:
            self.logger.error(f"Error scheduling maintenance: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I couldn't schedule your maintenance reminder. Please try again.",
            }

    async def get_travel_timeline(
        self, user_id: str, timeframe: str = "month"
    ) -> Dict[str, Any]:
        """Get user's travel timeline and itinerary"""
        try:
            # Get travel events from calendar
            travel_events = await self._get_travel_events(user_id, timeframe)

            # Get planned trips
            planned_trips = await self._get_planned_trips(user_id)

            # Get travel history for patterns
            travel_patterns = await self._analyze_travel_patterns(user_id)

            # Generate timeline view
            timeline = await self._generate_travel_timeline(
                travel_events, planned_trips
            )

            return {
                "success": True,
                "data": {
                    "timeline": timeline,
                    "upcoming_trips": len(
                        [t for t in planned_trips if t["start_date"] > datetime.now()]
                    ),
                    "travel_patterns": travel_patterns,
                    "total_events": len(travel_events),
                },
                "message": f"Your {timeframe} travel timeline with {len(travel_events)} events",
                "actions": [
                    {"type": "navigate", "target": "/you/calendar"},
                    {"type": "switch_view", "view": "timeline"},
                    {"type": "filter_calendar", "filter": "travel"},
                ],
            }

        except Exception as e:
            self.logger.error(f"Error getting travel timeline: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I couldn't load your travel timeline. Please try again.",
            }

    # Helper methods
    async def _check_calendar_conflicts(
        self, user_id: str, start_time: datetime, end_time: datetime
    ) -> List[Dict]:
        """Check for calendar conflicts"""
        # TODO: Query actual calendar events
        # For now, return empty list (no conflicts)
        return []

    async def _generate_event_suggestions(
        self, title: str, event_type: str, location: str
    ) -> Dict[str, Any]:
        """Generate suggestions for calendar events"""
        suggestions = {
            "description_suggestions": [
                f"Reminder: {title}",
                (
                    f"Don't forget: {title} at {location}"
                    if location
                    else f"Don't forget: {title}"
                ),
            ],
            "duration_suggestions": {
                "appointment": 1,
                "travel": 8,
                "maintenance": 2,
                "social": 3,
                "general": 1,
            }.get(event_type, 1),
            "reminder_suggestions": (
                ["15 minutes", "1 hour", "1 day"]
                if event_type == "important"
                else ["15 minutes"]
            ),
        }
        return suggestions

    async def _learn_user_preferences(
        self, user_id: str, updates: Dict[str, Any]
    ) -> None:
        """Learn from user profile updates"""
        # TODO: Implement machine learning for preference detection
        pass

    async def _generate_profile_recommendations(
        self, user_id: str, profile_updates: Dict[str, Any]
    ) -> List[str]:
        """Generate recommendations based on profile updates"""
        recommendations = []

        # Check travel preferences
        travel_prefs = profile_updates.get("travel_preferences", {})
        if travel_prefs.get("style") == "budget":
            recommendations.append("Check out free camping spots in the WHEELS section")
            recommendations.append("Set up budget alerts in WINS to track expenses")
        elif travel_prefs.get("style") == "luxury":
            recommendations.append("Explore premium caravan parks with full amenities")
            recommendations.append("Consider comprehensive travel insurance")

        # Check vehicle info
        vehicle_info = profile_updates.get("vehicle_info", {})
        if vehicle_info.get("type") == "motorhome":
            recommendations.append("Look for RV-friendly fuel stations in WHEELS")
            recommendations.append("Check height clearances on your planned routes")
        elif vehicle_info.get("fuel_type") == "diesel":
            recommendations.append("Track diesel prices to find the best deals")

        # Check budget preferences
        budget_prefs = profile_updates.get("budget_preferences", {})
        if budget_prefs.get("daily_budget"):
            daily_budget = budget_prefs["daily_budget"]
            if daily_budget < 80:
                recommendations.append(
                    "Consider free camping options to stretch your budget"
                )
            elif daily_budget > 200:
                recommendations.append(
                    "You could explore premium experiences and destinations"
                )

        # Add general recommendations if profile is being updated
        if profile_updates:
            recommendations.append(
                "Update your preferences in other sections for better personalization"
            )

        return recommendations[:5]  # Limit to 5 recommendations

    async def _enrich_profile_data(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich profile with default values for missing data"""
        try:
            enriched = profile.copy()

            # Ensure travel_preferences exists and has defaults
            if not enriched.get("travel_preferences"):
                enriched["travel_preferences"] = {}

            travel_prefs = enriched["travel_preferences"]
            if not travel_prefs.get("style"):
                travel_prefs["style"] = "balanced"
            if not travel_prefs.get("camp_types"):
                travel_prefs["camp_types"] = ["caravan_parks", "free_camps"]
            if not travel_prefs.get("drive_limit"):
                travel_prefs["drive_limit"] = "500km"

            # Ensure vehicle_info exists and has defaults
            if not enriched.get("vehicle_info"):
                enriched["vehicle_info"] = {}

            vehicle_info = enriched["vehicle_info"]
            if not vehicle_info.get("type"):
                vehicle_info["type"] = "caravan"
            if not vehicle_info.get("fuel_type"):
                vehicle_info["fuel_type"] = "diesel"
            if not vehicle_info.get("fuel_efficiency"):
                vehicle_info["fuel_efficiency"] = 8.5

            # Ensure budget_preferences exists and has defaults
            if not enriched.get("budget_preferences"):
                enriched["budget_preferences"] = {}

            budget_prefs = enriched["budget_preferences"]
            if not budget_prefs.get("daily_budget"):
                budget_prefs["daily_budget"] = 100
            if not budget_prefs.get("fuel_budget"):
                budget_prefs["fuel_budget"] = 200

            # Set default region if missing
            if not enriched.get("region"):
                enriched["region"] = "Australia"

            return enriched

        except Exception as e:
            self.logger.error(f"Error enriching profile data: {e}")
            return profile

    async def _calculate_profile_completeness_from_data(
        self, profile: Dict[str, Any]
    ) -> float:
        """Calculate how complete the user's profile is based on actual data"""
        try:
            total_fields = 8
            completed_fields = 0

            # Check basic info
            if profile.get("email"):
                completed_fields += 1
            if profile.get("full_name"):
                completed_fields += 1
            if profile.get("region"):
                completed_fields += 1

            # Check travel preferences
            travel_prefs = profile.get("travel_preferences", {})
            if travel_prefs.get("style"):
                completed_fields += 1
            if travel_prefs.get("camp_types"):
                completed_fields += 1

            # Check vehicle info
            vehicle_info = profile.get("vehicle_info", {})
            if vehicle_info.get("type"):
                completed_fields += 1
            if vehicle_info.get("fuel_type"):
                completed_fields += 1

            # Check budget preferences
            budget_prefs = profile.get("budget_preferences", {})
            if budget_prefs.get("daily_budget"):
                completed_fields += 1

            return completed_fields / total_fields

        except Exception as e:
            self.logger.error(f"Error calculating profile completeness: {e}")
            return 0.5

    async def _apply_preferences_globally(
        self, user_id: str, preferences: List[UserPreference]
    ) -> List[str]:
        """Apply preferences across the platform"""
        applied_changes = []

        for pref in preferences:
            if pref.category == "display" and pref.preference_key == "theme":
                applied_changes.append(f"Applied {pref.value} theme globally")
            elif (
                pref.category == "notifications" and pref.preference_key == "frequency"
            ):
                applied_changes.append(f"Set notification frequency to {pref.value}")
            elif (
                pref.category == "privacy" and pref.preference_key == "location_sharing"
            ):
                applied_changes.append(f"Location sharing set to {pref.value}")

        return applied_changes

    async def _get_user_context(self, user_id: str) -> Dict[str, Any]:
        """Get current user context"""
        return {
            "current_location": "Brisbane, QLD",
            "last_active": "2 hours ago",
            "travel_status": "at_home",
            "profile_completeness": 0.75,
            "active_trips": 0,
            "upcoming_events": 3,
        }

    async def _get_upcoming_events(
        self, user_id: str, days: int
    ) -> List[CalendarEvent]:
        """Get upcoming calendar events"""
        # Sample events for demo
        now = datetime.now()
        return [
            CalendarEvent(
                id="event_1",
                title="Vehicle Service",
                description="Annual service at Joe's Auto",
                start_time=now + timedelta(days=3),
                end_time=now + timedelta(days=3, hours=2),
                location="Joe's Auto Service",
                event_type="maintenance",
                reminder_set=True,
                attendees=[],
            ),
            CalendarEvent(
                id="event_2",
                title="Grey Nomads Meetup",
                description="Monthly group meetup",
                start_time=now + timedelta(days=5),
                end_time=now + timedelta(days=5, hours=3),
                location="Community Center",
                event_type="social",
                reminder_set=True,
                attendees=["Sarah", "Mike", "Jenny"],
            ),
        ]

    async def _generate_personal_insights(self, user_id: str) -> List[Dict[str, Any]]:
        """Generate personalized insights"""
        return [
            {
                "type": "spending",
                "title": "Budget Performance",
                "insight": "You're 15% under budget this month - great job!",
                "action": "Consider allocating extra funds to your emergency fund",
            },
            {
                "type": "travel",
                "title": "Travel Pattern",
                "insight": "You typically travel on weekends",
                "action": "Book caravan parks early for weekend trips",
            },
            {
                "type": "maintenance",
                "title": "Vehicle Health",
                "insight": "Next service due in 2,000km",
                "action": "Consider scheduling service before your next long trip",
            },
        ]

    async def _get_personalized_quick_actions(
        self, user_id: str
    ) -> List[Dict[str, Any]]:
        """Get quick actions based on user patterns"""
        return [
            {
                "title": "Log Today's Expenses",
                "description": "Quick expense entry",
                "action": "navigate_to_wins_expenses",
                "icon": "dollar-sign",
            },
            {
                "title": "Plan Weekend Trip",
                "description": "Based on your travel patterns",
                "action": "navigate_to_wheels_planner",
                "icon": "map",
            },
            {
                "title": "Check Group Updates",
                "description": "New posts in your groups",
                "action": "navigate_to_social_feed",
                "icon": "users",
            },
        ]

    async def _get_pending_notifications(self, user_id: str) -> List[Dict[str, Any]]:
        """Get pending notifications for user"""
        return [
            {
                "id": "notif_1",
                "type": "reminder",
                "priority": "medium",
                "title": "Vehicle service reminder",
                "message": "Your vehicle service is due in 3 days",
                "action_url": "/you/calendar",
            },
            {
                "id": "notif_2",
                "type": "social",
                "priority": "low",
                "title": "New group message",
                "message": "5 new messages in Grey Nomads Queensland",
                "action_url": "/social/groups/grey_nomads_qld",
            },
        ]

    async def _get_preferred_layout(self, user_id: str) -> Dict[str, Any]:
        """Get user's preferred dashboard layout"""
        return {
            "layout": "grid",
            "widgets": ["calendar", "insights", "quick_actions", "notifications"],
            "theme": "light",
            "compact_mode": False,
        }

    async def _calculate_next_maintenance(
        self, maintenance_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate when next maintenance is due"""
        current_reading = maintenance_data.get("current_reading", 0)
        interval = maintenance_data.get("interval", 10000)

        return {
            "reading_due": current_reading + interval,
            "estimated_date": datetime.now()
            + timedelta(days=90),  # Estimate based on usage
            "type": "km_based" if "km" in str(interval) else "time_based",
        }

    async def _create_maintenance_reminders(
        self, user_id: str, maintenance_data: Dict, next_due: Dict
    ) -> List[Dict]:
        """Create reminder events for maintenance"""
        reminders = []

        # Create reminder 1 week before
        week_before = next_due["estimated_date"] - timedelta(days=7)
        reminders.append(
            {
                "date": week_before,
                "title": f"Maintenance reminder: {maintenance_data['name']}",
                "type": "advance_warning",
            }
        )

        # Create reminder on due date
        reminders.append(
            {
                "date": next_due["estimated_date"],
                "title": f"Maintenance due: {maintenance_data['name']}",
                "type": "due_date",
            }
        )

        return reminders

    async def _get_travel_events(self, user_id: str, timeframe: str) -> List[Dict]:
        """Get travel-related calendar events"""
        # TODO: Query actual travel events
        return [
            {
                "date": datetime.now() + timedelta(days=10),
                "title": "Trip to Gold Coast",
                "type": "travel",
                "duration_days": 5,
            }
        ]

    async def _get_planned_trips(self, user_id: str) -> List[Dict]:
        """Get user's planned trips"""
        return [
            {
                "id": "trip_1",
                "name": "Gold Coast Adventure",
                "start_date": datetime.now() + timedelta(days=10),
                "end_date": datetime.now() + timedelta(days=15),
                "status": "planned",
            }
        ]

    async def _analyze_travel_patterns(self, user_id: str) -> Dict[str, Any]:
        """Analyze user's travel patterns"""
        return {
            "preferred_duration": "3-5 days",
            "common_destinations": ["Queensland Coast", "NSW Mountains"],
            "travel_frequency": "monthly",
            "preferred_season": "autumn/spring",
        }

    async def _generate_travel_timeline(
        self, events: List[Dict], trips: List[Dict]
    ) -> List[Dict]:
        """Generate a combined travel timeline"""
        timeline = []

        # Combine events and trips into timeline
        for event in events:
            timeline.append(
                {
                    "date": event["date"],
                    "title": event["title"],
                    "type": "event",
                    "duration": event.get("duration_days", 1),
                }
            )

        for trip in trips:
            timeline.append(
                {
                    "date": trip["start_date"],
                    "title": trip["name"],
                    "type": "trip",
                    "duration": (trip["end_date"] - trip["start_date"]).days,
                }
            )

        # Sort by date
        timeline.sort(key=lambda x: x["date"])

        return timeline


# Create global instance
you_node = YouNode()
