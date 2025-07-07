import asyncio
import math
from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional
from app.database.supabase_client import get_supabase_client
from app.core.logging import setup_logging

logger = setup_logging("proactive_monitor")

class ProactiveMonitor:
    def __init__(self):
        self.supabase = get_supabase_client()
        
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in miles using Haversine formula"""
        R = 3959  # Earth's radius in miles
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_lat / 2) ** 2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    async def get_active_users(self) -> List[Dict[str, Any]]:
        """Get users who have been active in the last 24 hours"""
        try:
            # Get users with recent PAM interactions
            cutoff_time = datetime.now() - timedelta(hours=24)
            
            result = self.supabase.table("pam_conversation_sessions")\
                .select("user_id, profiles(email, region)")\
                .gte("updated_at", cutoff_time.isoformat())\
                .eq("is_active", True)\
                .execute()
            
            # Deduplicate users
            active_users = {}
            for session in result.data:
                user_id = session["user_id"]
                if user_id not in active_users:
                    active_users[user_id] = {
                        "user_id": user_id,
                        "email": session.get("profiles", {}).get("email", "unknown"),
                        "region": session.get("profiles", {}).get("region", "Australia")
                    }
            
            logger.info(f"Found {len(active_users)} active users")
            return list(active_users.values())
            
        except Exception as e:
            logger.error(f"Error getting active users: {str(e)}")
            return []
    
    async def check_nearby_attractions(self, user_id: str, user_location: Dict[str, float]) -> List[Dict[str, Any]]:
        """Check for nearby attractions based on user location"""
        try:
            lat = user_location.get("latitude")
            lon = user_location.get("longitude")
            
            if not lat or not lon:
                return []
            
            # Get local events within 50 miles
            events_result = self.supabase.table("local_events")\
                .select("*")\
                .gte("start_date", date.today().isoformat())\
                .execute()
            
            nearby_attractions = []
            for event in events_result.data:
                if event.get("latitude") and event.get("longitude"):
                    distance = self.calculate_distance(
                        lat, lon, 
                        float(event["latitude"]), 
                        float(event["longitude"])
                    )
                    
                    if distance <= 50:  # Within 50 miles
                        nearby_attractions.append({
                            "type": "event",
                            "name": event["event_name"],
                            "description": event.get("description", ""),
                            "distance_miles": round(distance, 1),
                            "start_date": event["start_date"],
                            "location": event.get("address", ""),
                            "is_free": event.get("is_free", False)
                        })
            
            # Get camping locations within 30 miles
            camping_result = self.supabase.table("camping_locations")\
                .select("*")\
                .execute()
            
            for location in camping_result.data:
                if location.get("latitude") and location.get("longitude"):
                    distance = self.calculate_distance(
                        lat, lon,
                        float(location["latitude"]),
                        float(location["longitude"])
                    )
                    
                    if distance <= 30:  # Within 30 miles
                        nearby_attractions.append({
                            "type": "camping",
                            "name": location["name"],
                            "description": f"{location['type']} - {location.get('amenities', {}).get('description', '')}",
                            "distance_miles": round(distance, 1),
                            "price_per_night": location.get("price_per_night"),
                            "rv_friendly": location.get("amenities", {}).get("rv_friendly", False)
                        })
            
            # Sort by distance
            nearby_attractions.sort(key=lambda x: x["distance_miles"])
            
            return nearby_attractions[:5]  # Return top 5 closest
            
        except Exception as e:
            logger.error(f"Error checking nearby attractions: {str(e)}")
            return []
    
    async def monitor_weather_on_routes(self, user_id: str) -> List[Dict[str, Any]]:
        """Monitor weather changes on planned routes"""
        try:
            # This would integrate with weather API in a real implementation
            # For now, return sample weather alerts based on location patterns
            
            weather_alerts = []
            
            # Get user's recent travel patterns from calendar events
            events_result = self.supabase.table("calendar_events")\
                .select("*")\
                .eq("user_id", user_id)\
                .gte("date", date.today().isoformat())\
                .lte("date", (date.today() + timedelta(days=7)).isoformat())\
                .execute()
            
            for event in events_result.data:
                if event.get("location"):
                    # Simulate weather check (would use real weather API)
                    weather_alerts.append({
                        "type": "weather",
                        "location": event["location"],
                        "date": event["date"],
                        "alert": "Possible rain expected - check road conditions",
                        "severity": "medium",
                        "recommendation": "Consider waterproof gear and check alternate routes"
                    })
            
            return weather_alerts[:3]  # Return up to 3 alerts
            
        except Exception as e:
            logger.error(f"Error monitoring weather: {str(e)}")
            return []
    
    async def check_fuel_prices_on_route(self, user_id: str, route_coordinates: List[Dict[str, float]]) -> List[Dict[str, Any]]:
        """Alert for fuel prices along planned route"""
        try:
            fuel_alerts = []
            
            # Get fuel stations along route
            stations_result = self.supabase.table("fuel_stations")\
                .select("*")\
                .execute()
            
            if not route_coordinates:
                return []
            
            # Check stations within 5 miles of route points
            for coord in route_coordinates:
                lat = coord.get("latitude")
                lon = coord.get("longitude")
                
                if not lat or not lon:
                    continue
                
                for station in stations_result.data:
                    if station.get("latitude") and station.get("longitude"):
                        distance = self.calculate_distance(
                            lat, lon,
                            float(station["latitude"]),
                            float(station["longitude"])
                        )
                        
                        if distance <= 5:  # Within 5 miles of route
                            regular_price = station.get("regular_price", 0)
                            diesel_price = station.get("diesel_price", 0)
                            
                            # Alert if prices are particularly good or bad
                            if regular_price and regular_price < 1.50:  # Good price
                                fuel_alerts.append({
                                    "type": "fuel_deal",
                                    "station_name": station["station_name"],
                                    "address": station["address"],
                                    "regular_price": regular_price,
                                    "diesel_price": diesel_price,
                                    "distance_from_route": round(distance, 1),
                                    "alert": f"Great fuel price: ${regular_price}/L at {station['station_name']}",
                                    "rv_friendly": station.get("rv_friendly", False)
                                })
            
            # Remove duplicates and sort by price
            unique_alerts = {}
            for alert in fuel_alerts:
                key = alert["station_name"] + alert["address"]
                if key not in unique_alerts or alert["regular_price"] < unique_alerts[key]["regular_price"]:
                    unique_alerts[key] = alert
            
            return list(unique_alerts.values())[:3]  # Return top 3 deals
            
        except Exception as e:
            logger.error(f"Error checking fuel prices: {str(e)}")
            return []
    
    async def check_vehicle_maintenance(self, user_id: str) -> List[Dict[str, Any]]:
        """Check for upcoming vehicle maintenance"""
        try:
            maintenance_alerts = []
            
            # Get maintenance records for user
            records_result = self.supabase.table("maintenance_records")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("date", desc=True)\
                .execute()
            
            for record in records_result.data:
                alerts = []
                
                # Check date-based maintenance
                next_due_date = record.get("next_due_date")
                if next_due_date:
                    due_date = datetime.strptime(next_due_date, "%Y-%m-%d").date()
                    days_until_due = (due_date - date.today()).days
                    
                    if days_until_due <= 7:  # Due within a week
                        alerts.append({
                            "type": "maintenance_due",
                            "task": record["task"],
                            "due_date": next_due_date,
                            "days_until_due": days_until_due,
                            "urgency": "high" if days_until_due <= 3 else "medium",
                            "alert": f"{record['task']} due in {days_until_due} days"
                        })
                
                # Check mileage-based maintenance (if we had current odometer reading)
                next_due_mileage = record.get("next_due_mileage")
                if next_due_mileage:
                    # This would need current odometer reading to calculate
                    # For now, simulate based on maintenance history
                    alerts.append({
                        "type": "maintenance_mileage",
                        "task": record["task"],
                        "due_mileage": next_due_mileage,
                        "urgency": "medium",
                        "alert": f"{record['task']} - check mileage"
                    })
                
                maintenance_alerts.extend(alerts)
            
            return maintenance_alerts[:5]  # Return up to 5 alerts
            
        except Exception as e:
            logger.error(f"Error checking vehicle maintenance: {str(e)}")
            return []
    
    async def create_alert_notification(self, user_id: str, alerts: List[Dict[str, Any]]) -> bool:
        """Create notification for user alerts"""
        try:
            if not alerts:
                return True
            
            # Create a consolidated alert message
            alert_summary = {
                "user_id": user_id,
                "alert_count": len(alerts),
                "alerts": alerts,
                "created_at": datetime.now().isoformat(),
                "priority": "high" if any(alert.get("urgency") == "high" for alert in alerts) else "medium"
            }
            
            # In a real implementation, this would:
            # 1. Send push notification to user's device
            # 2. Create in-app notification
            # 3. Send email if urgency is high
            # 4. Store in notifications table
            
            logger.info(f"Created alert notification for user {user_id} with {len(alerts)} alerts")
            return True
            
        except Exception as e:
            logger.error(f"Error creating alert notification: {str(e)}")
            return False
    
    async def run_proactive_checks(self) -> Dict[str, Any]:
        """Run all proactive checks for active users"""
        try:
            start_time = datetime.now()
            active_users = await self.get_active_users()
            
            total_alerts = 0
            processed_users = 0
            
            for user in active_users:
                user_id = user["user_id"]
                user_alerts = []
                
                try:
                    # For demo purposes, use a sample location
                    # In real implementation, get user's current location from GPS/device
                    sample_location = {"latitude": -33.8688, "longitude": 151.2093}  # Sydney
                    
                    # Check nearby attractions
                    attractions = await self.check_nearby_attractions(user_id, sample_location)
                    user_alerts.extend(attractions)
                    
                    # Monitor weather on routes
                    weather_alerts = await self.monitor_weather_on_routes(user_id)
                    user_alerts.extend(weather_alerts)
                    
                    # Check fuel prices (sample route coordinates)
                    sample_route = [sample_location, {"latitude": -33.9, "longitude": 151.3}]
                    fuel_alerts = await self.check_fuel_prices_on_route(user_id, sample_route)
                    user_alerts.extend(fuel_alerts)
                    
                    # Check vehicle maintenance
                    maintenance_alerts = await self.check_vehicle_maintenance(user_id)
                    user_alerts.extend(maintenance_alerts)
                    
                    # Create notifications if there are alerts
                    if user_alerts:
                        await self.create_alert_notification(user_id, user_alerts)
                        total_alerts += len(user_alerts)
                    
                    processed_users += 1
                    
                except Exception as e:
                    logger.error(f"Error processing alerts for user {user_id}: {str(e)}")
                    continue
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            result = {
                "success": True,
                "processed_users": processed_users,
                "total_active_users": len(active_users),
                "total_alerts_generated": total_alerts,
                "processing_time_seconds": processing_time,
                "timestamp": start_time.isoformat()
            }
            
            logger.info(f"Completed proactive checks: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error running proactive checks: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

# Global instance
proactive_monitor = ProactiveMonitor()