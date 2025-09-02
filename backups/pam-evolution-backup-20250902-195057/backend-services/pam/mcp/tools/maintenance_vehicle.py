"""
Maintenance and Vehicle Management Tools - Full control over vehicle operations
"""
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from langchain_core.tools import tool
from app.services.pam.database.unified_database_service import get_pam_database_service
from app.core.logging import get_logger

logger = get_logger("pam_maintenance_tools")


@tool
async def pam_log_maintenance(
    user_id: str,
    vehicle_id: str,
    maintenance_type: str,
    description: str,
    cost: float,
    service_provider: Optional[str] = None,
    next_due: Optional[str] = None
) -> Dict[str, Any]:
    """
    Log a maintenance record for a vehicle.
    
    Args:
        user_id: User ID
        vehicle_id: Vehicle identifier
        maintenance_type: Type of maintenance (e.g., 'oil_change', 'tire_rotation', 'service')
        description: Detailed description
        cost: Cost of maintenance
        service_provider: Optional service provider name
        next_due: Optional next maintenance due date
    
    Returns:
        Created maintenance record
    """
    try:
        db = await get_pam_database_service()
        table = await db.get_table("maintenance_records")
        
        record = {
            "user_id": user_id,
            "vehicle_id": vehicle_id,
            "maintenance_type": maintenance_type,
            "description": description,
            "cost": cost,
            "service_provider": service_provider,
            "service_date": datetime.utcnow().isoformat(),
            "next_due_date": next_due,
            "status": "completed"
        }
        
        result = await table.create(record)
        
        if result.get("success"):
            logger.info(f"Logged maintenance for vehicle {vehicle_id}")
            
            # Create calendar event for next maintenance if due date provided
            if next_due:
                await _create_maintenance_reminder(user_id, vehicle_id, maintenance_type, next_due)
            
            return {
                "success": True,
                "maintenance_id": result.get("data", {}).get("id"),
                "data": result.get("data")
            }
        else:
            return {"success": False, "error": result.get("error")}
            
    except Exception as e:
        logger.error(f"Failed to log maintenance: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_log_fuel(
    user_id: str,
    vehicle_id: str,
    liters: float,
    cost: float,
    odometer: int,
    fuel_type: str,
    station_id: Optional[str] = None,
    location: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Log a fuel purchase.
    
    Args:
        user_id: User ID
        vehicle_id: Vehicle identifier
        liters: Amount of fuel in liters
        cost: Total cost
        odometer: Current odometer reading
        fuel_type: Type of fuel
        station_id: Optional fuel station ID
        location: Optional location {'lat': float, 'lon': float}
    
    Returns:
        Created fuel log entry
    """
    try:
        db = await get_pam_database_service()
        table = await db.get_table("fuel_log")
        
        # Calculate price per liter
        price_per_liter = cost / liters if liters > 0 else 0
        
        # Get previous fuel log to calculate consumption
        previous_logs = await table.read(
            filters={"user_id": user_id, "vehicle_id": vehicle_id},
            limit=1
        )
        
        fuel_efficiency = None
        distance_since_last = None
        
        if previous_logs.get("success") and previous_logs.get("data"):
            last_log = previous_logs.get("data")[0]
            last_odometer = last_log.get("odometer", 0)
            if last_odometer and odometer > last_odometer:
                distance_since_last = odometer - last_odometer
                fuel_efficiency = (liters / distance_since_last) * 100  # L/100km
        
        log_entry = {
            "user_id": user_id,
            "vehicle_id": vehicle_id,
            "liters": liters,
            "cost": cost,
            "price_per_liter": price_per_liter,
            "odometer": odometer,
            "fuel_type": fuel_type,
            "station_id": station_id,
            "location": location,
            "fuel_efficiency": fuel_efficiency,
            "distance_since_last": distance_since_last,
            "logged_at": datetime.utcnow().isoformat()
        }
        
        result = await table.create(log_entry)
        
        if result.get("success"):
            # Update vehicle stats
            await _update_vehicle_stats(user_id, vehicle_id, fuel_efficiency)
            
            return {
                "success": True,
                "fuel_log_id": result.get("data", {}).get("id"),
                "fuel_efficiency": fuel_efficiency,
                "data": result.get("data")
            }
        else:
            return {"success": False, "error": result.get("error")}
            
    except Exception as e:
        logger.error(f"Failed to log fuel: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_manage_fuel_stations(
    action: str,
    station_data: Optional[Dict[str, Any]] = None,
    station_id: Optional[str] = None,
    filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Manage fuel station data (create, update, search).
    
    Args:
        action: Action to perform ('create', 'update', 'search', 'update_prices')
        station_data: Station data for create/update
        station_id: Station ID for update operations
        filters: Search filters
    
    Returns:
        Action result
    """
    try:
        db = await get_pam_database_service()
        table = await db.get_table("fuel_stations")
        
        if action == "create":
            if not station_data:
                return {"success": False, "error": "Station data required for create"}
            
            station_data["created_at"] = datetime.utcnow().isoformat()
            station_data["last_updated"] = datetime.utcnow().isoformat()
            
            result = await table.create(station_data)
            
            return {
                "success": result.get("success"),
                "station_id": result.get("data", {}).get("id"),
                "data": result.get("data")
            }
        
        elif action == "update":
            if not station_id:
                return {"success": False, "error": "Station ID required for update"}
            
            station_data = station_data or {}
            station_data["last_updated"] = datetime.utcnow().isoformat()
            
            result = await table.update(
                filters={"id": station_id},
                data=station_data
            )
            
            return {
                "success": result.get("success"),
                "updated_count": result.get("count", 0)
            }
        
        elif action == "search":
            # Search by location or filters
            result = await table.read(filters=filters)
            
            if result.get("success"):
                stations = result.get("data", [])
                
                # Sort by distance if location provided
                if filters and "location" in filters:
                    # Simple distance sorting (would need proper geospatial query)
                    pass
                
                return {
                    "success": True,
                    "stations": stations,
                    "count": len(stations)
                }
            else:
                return {"success": False, "error": result.get("error")}
        
        elif action == "update_prices":
            # Bulk update fuel prices
            if not station_data:
                return {"success": False, "error": "Price data required"}
            
            updates = []
            for station_id, prices in station_data.items():
                update_data = {
                    "fuel_prices": prices,
                    "last_updated": datetime.utcnow().isoformat()
                }
                updates.append({
                    "table": "fuel_stations",
                    "operation": "update",
                    "filters": {"id": station_id},
                    "data": update_data
                })
            
            result = await db.bulk_operation(updates)
            
            return {
                "success": result.get("success"),
                "updated_stations": len(updates),
                "results": result.get("results")
            }
        
        else:
            return {"success": False, "error": f"Unknown action: {action}"}
            
    except Exception as e:
        logger.error(f"Failed to manage fuel stations: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_get_maintenance_schedule(
    user_id: str,
    vehicle_id: Optional[str] = None,
    upcoming_days: int = 30
) -> Dict[str, Any]:
    """
    Get maintenance schedule and recommendations.
    
    Args:
        user_id: User ID
        vehicle_id: Optional specific vehicle ID
        upcoming_days: Number of days to look ahead
    
    Returns:
        Maintenance schedule and recommendations
    """
    try:
        db = await get_pam_database_service()
        table = await db.get_table("maintenance_records")
        
        # Get maintenance history
        filters = {"user_id": user_id}
        if vehicle_id:
            filters["vehicle_id"] = vehicle_id
        
        history = await table.read(filters=filters)
        
        if not history.get("success"):
            return {"success": False, "error": "Failed to fetch maintenance history"}
        
        records = history.get("data", [])
        
        # Analyze maintenance patterns
        schedule = {
            "upcoming": [],
            "overdue": [],
            "recommendations": [],
            "maintenance_summary": {}
        }
        
        current_date = datetime.utcnow()
        upcoming_cutoff = current_date + timedelta(days=upcoming_days)
        
        # Group by maintenance type
        maintenance_types = {}
        for record in records:
            maint_type = record.get("maintenance_type", "unknown")
            if maint_type not in maintenance_types:
                maintenance_types[maint_type] = []
            maintenance_types[maint_type].append(record)
        
        # Check for upcoming and overdue maintenance
        for maint_type, type_records in maintenance_types.items():
            # Sort by service date
            type_records.sort(key=lambda x: x.get("service_date", ""), reverse=True)
            
            if type_records:
                latest = type_records[0]
                next_due = latest.get("next_due_date")
                
                if next_due:
                    next_due_date = datetime.fromisoformat(next_due.replace("Z", "+00:00"))
                    
                    if next_due_date < current_date:
                        schedule["overdue"].append({
                            "type": maint_type,
                            "due_date": next_due,
                            "days_overdue": (current_date - next_due_date).days,
                            "last_service": latest.get("service_date"),
                            "vehicle_id": latest.get("vehicle_id")
                        })
                    elif next_due_date <= upcoming_cutoff:
                        schedule["upcoming"].append({
                            "type": maint_type,
                            "due_date": next_due,
                            "days_until": (next_due_date - current_date).days,
                            "last_service": latest.get("service_date"),
                            "vehicle_id": latest.get("vehicle_id")
                        })
                
                # Calculate average interval
                if len(type_records) > 1:
                    intervals = []
                    for i in range(len(type_records) - 1):
                        date1 = datetime.fromisoformat(type_records[i].get("service_date").replace("Z", "+00:00"))
                        date2 = datetime.fromisoformat(type_records[i+1].get("service_date").replace("Z", "+00:00"))
                        intervals.append((date1 - date2).days)
                    
                    avg_interval = sum(intervals) / len(intervals)
                    schedule["maintenance_summary"][maint_type] = {
                        "average_interval_days": avg_interval,
                        "total_services": len(type_records),
                        "total_cost": sum(r.get("cost", 0) for r in type_records)
                    }
        
        # Generate recommendations
        if schedule["overdue"]:
            schedule["recommendations"].append({
                "priority": "high",
                "message": f"You have {len(schedule['overdue'])} overdue maintenance items",
                "action": "Schedule these services immediately"
            })
        
        if not records:
            schedule["recommendations"].append({
                "priority": "medium",
                "message": "No maintenance history found",
                "action": "Start tracking your vehicle maintenance for better insights"
            })
        
        return {
            "success": True,
            "schedule": schedule,
            "total_records": len(records)
        }
        
    except Exception as e:
        logger.error(f"Failed to get maintenance schedule: {e}")
        return {"success": False, "error": str(e)}


async def _create_maintenance_reminder(user_id: str, vehicle_id: str, maintenance_type: str, due_date: str):
    """Create a calendar event for maintenance reminder"""
    try:
        db = await get_pam_database_service()
        calendar_table = await db.get_table("calendar_events")
        
        event = {
            "user_id": user_id,
            "title": f"Vehicle Maintenance Due: {maintenance_type}",
            "description": f"Maintenance reminder for vehicle {vehicle_id}",
            "date": due_date,
            "event_type": "maintenance_reminder",
            "metadata": {
                "vehicle_id": vehicle_id,
                "maintenance_type": maintenance_type
            }
        }
        
        await calendar_table.create(event)
        
    except Exception as e:
        logger.warning(f"Failed to create maintenance reminder: {e}")


async def _update_vehicle_stats(user_id: str, vehicle_id: str, fuel_efficiency: Optional[float]):
    """Update vehicle statistics in user profile"""
    try:
        if not fuel_efficiency:
            return
        
        db = await get_pam_database_service()
        profiles_table = await db.get_table("profiles")
        
        # Get current profile
        profile = await profiles_table.read(filters={"user_id": user_id}, limit=1)
        
        if profile.get("success") and profile.get("data"):
            current_data = profile.get("data")[0]
            vehicle_info = current_data.get("vehicle_info", {})
            
            # Update fuel efficiency with rolling average
            current_efficiency = vehicle_info.get("fuel_efficiency", fuel_efficiency)
            new_efficiency = (current_efficiency * 0.7) + (fuel_efficiency * 0.3)  # 70/30 weighted average
            
            vehicle_info["fuel_efficiency"] = round(new_efficiency, 2)
            vehicle_info["last_fuel_log"] = datetime.utcnow().isoformat()
            
            await profiles_table.update(
                filters={"user_id": user_id},
                data={"vehicle_info": vehicle_info}
            )
            
    except Exception as e:
        logger.warning(f"Failed to update vehicle stats: {e}")