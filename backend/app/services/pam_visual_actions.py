"""
PAM Visual Actions Service
Handles visual site control commands for PAM
"""

import json
import logging
import re
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dateutil import parser as date_parser

logger = logging.getLogger(__name__)

class PamVisualActionsService:
    """Service for handling PAM's visual site control actions"""
    
    def __init__(self):
        self.visual_action_mappings = {
            "book_appointment": self._parse_appointment_action,
            "log_expense": self._parse_expense_action,
            "navigate": self._parse_navigation_action,
            "create_trip": self._parse_trip_action,
            "add_calendar_event": self._parse_calendar_action,
            "show_location": self._parse_location_action,
            "update_profile": self._parse_profile_action,
        }
    
    def parse_intent_to_visual_action(self, message: str, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse natural language intent into visual action commands
        Returns a visual action object that can be sent to the frontend
        """
        message_lower = message.lower()
        
        # Appointment booking patterns
        if any(phrase in message_lower for phrase in ["book appointment", "schedule meeting", "set up meeting", "meet with"]):
            return self._extract_appointment_details(message, context)
        
        # Expense logging patterns
        if any(phrase in message_lower for phrase in ["spent", "paid", "bought", "expense", "cost me"]):
            return self._extract_expense_details(message, context)
        
        # Navigation patterns
        if any(phrase in message_lower for phrase in ["go to", "navigate to", "open", "show me"]):
            return self._extract_navigation_details(message, context)
        
        # Trip planning patterns
        if any(phrase in message_lower for phrase in ["plan trip", "create trip", "road trip", "travel to"]):
            return self._extract_trip_details(message, context)
        
        return None
    
    def _extract_appointment_details(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract appointment details from natural language"""
        
        # Extract person name (simplified - in production would use NER)
        # Escape user input for regex safety
        safe_message = re.escape(message)
        person_pattern = r'with\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'
        person_match = re.search(person_pattern, message)  # Use original for pattern matching
        person = person_match.group(1) if person_match else "Unknown"
        
        # Extract date
        tomorrow_keywords = ["tomorrow", "tmrw", "next day"]
        date = None
        for keyword in tomorrow_keywords:
            if keyword in message.lower():
                date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
                break
        
        if not date:
            # Try to parse other date formats
            date_match = re.search(r'(\d{1,2}/\d{1,2}(?:/\d{2,4})?)', message)
            if date_match:
                try:
                    parsed_date = date_parser.parse(date_match.group(1))
                    date = parsed_date.strftime("%Y-%m-%d")
                except (ValueError, TypeError) as e:
                    logger.warning(f"Failed to parse date: {e}")
                    date = datetime.now().strftime("%Y-%m-%d")
            else:
                date = datetime.now().strftime("%Y-%m-%d")
        
        # Extract time
        time_match = re.search(r'at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}(?:am|pm))', message.lower())
        if time_match:
            time_str = time_match.group(1)
            # Normalize time format
            if ':' not in time_str and ('am' in time_str or 'pm' in time_str):
                time_str = time_str.replace('am', ':00 AM').replace('pm', ':00 PM')
            elif ':' not in time_str:
                time_str = f"{time_str}:00"
            time = time_str
        else:
            time = "09:00"
        
        return {
            "type": "visual_action",
            "action": {
                "action": "book_appointment",
                "parameters": {
                    "person": person,
                    "date": date,
                    "time": time,
                    "description": f"Appointment with {person}"
                }
            },
            "feedback_message": f"I'll book an appointment with {person} for {date} at {time}"
        }
    
    def _extract_expense_details(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract expense details from natural language"""
        
        # Extract amount
        amount_match = re.search(r'\$?(\d+(?:\.\d{2})?)', message)
        try:
            amount = float(amount_match.group(1)) if amount_match else 0.0
        except (ValueError, AttributeError):
            amount = 0.0
        
        # Determine category based on keywords
        category_mappings = {
            "fuel": ["fuel", "gas", "petrol", "diesel", "fill up"],
            "food": ["food", "meal", "restaurant", "groceries", "lunch", "dinner", "breakfast"],
            "maintenance": ["maintenance", "repair", "service", "oil change", "tire"],
            "camping": ["camping", "campground", "campsite", "rv park"],
            "entertainment": ["entertainment", "movie", "activity", "fun"],
            "supplies": ["supplies", "equipment", "gear", "tools"],
            "other": []  # Default
        }
        
        category = "other"
        message_lower = message.lower()
        for cat, keywords in category_mappings.items():
            if any(keyword in message_lower for keyword in keywords):
                category = cat
                break
        
        # Extract description
        description = f"{category.capitalize()} expense"
        if "on" in message_lower:
            desc_match = re.search(r'on\s+(.+?)(?:\.|$)', message)
            if desc_match:
                description = desc_match.group(1).strip()
        
        return {
            "type": "visual_action",
            "action": {
                "action": "log_expense",
                "parameters": {
                    "amount": amount,
                    "category": category,
                    "description": description
                }
            },
            "feedback_message": f"I'll log a ${amount:.2f} {category} expense for you"
        }
    
    def _extract_navigation_details(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract navigation details from natural language"""
        # Map common phrases to routes
        route_mappings = {
            "/wheels": ["wheels", "trip", "routes", "map", "navigation"],
            "/wins": ["wins", "finance", "expense", "budget", "money"],
            "/social": ["social", "community", "friends", "groups", "posts"],
            "/you": ["dashboard", "profile", "calendar", "appointments", "settings"],
            "/shop": ["shop", "store", "buy", "purchase", "products"]
        }
        
        message_lower = message.lower()
        target_route = "/"
        
        for route, keywords in route_mappings.items():
            if any(keyword in message_lower for keyword in keywords):
                target_route = route
                break
        
        return {
            "type": "visual_action",
            "action": {
                "action": "navigate",
                "parameters": {
                    "route": target_route,
                    "description": f"Navigating to {target_route.replace('/', '').capitalize()} page"
                }
            },
            "feedback_message": f"I'll take you to the {target_route.replace('/', '').capitalize()} page"
        }
    
    def _extract_trip_details(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract trip planning details from natural language"""
        
        # Extract destination
        destination_match = re.search(r'to\s+([A-Z][a-zA-Z\s]+?)(?:\s+on|\s+in|\s+from|$)', message)
        try:
            destination = destination_match.group(1).strip() if destination_match else "Unknown Destination"
        except AttributeError:
            destination = "Unknown Destination"
        
        return {
            "type": "visual_action",
            "action": {
                "action": "create_trip",
                "parameters": {
                    "destination": destination,
                    "navigate_first": True
                }
            },
            "feedback_message": f"I'll help you plan a trip to {destination}"
        }
    
    def _parse_appointment_action(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Parse appointment booking action"""
        return {
            "action": "book_appointment",
            "parameters": args
        }
    
    def _parse_expense_action(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Parse expense logging action"""
        return {
            "action": "log_expense",
            "parameters": args
        }
    
    def _parse_navigation_action(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Parse navigation action"""
        return {
            "action": "navigate",
            "parameters": args
        }
    
    def _parse_trip_action(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Parse trip creation action"""
        return {
            "action": "create_trip",
            "parameters": args
        }
    
    def _parse_calendar_action(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Parse calendar event action"""
        return {
            "action": "add_calendar_event",
            "parameters": args
        }
    
    def _parse_location_action(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Parse location display action"""
        return {
            "action": "show_location",
            "parameters": args
        }
    
    def _parse_profile_action(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Parse profile update action"""
        return {
            "action": "update_profile",
            "parameters": args
        }

# Singleton instance
pam_visual_actions = PamVisualActionsService()