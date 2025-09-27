# 🚧 Pam 2.0 – Track B Scaffold (Trip Planning, Wins, Maintenance)

"""
This scaffold extends Track A by adding the **core PAM modules**:
- Trip Planning (Wheels)
- Wins (Budget + Expenses)
- Maintenance (Vehicle Logs)

Each module is modular, <300 lines, and integrates with Supabase.
"""

from fastapi import APIRouter
from main import app, supabase
from datetime import datetime

# --- Trip Planning Router ---
trip_router = APIRouter(prefix="/trips", tags=["Trips"])

@trip_router.post("/log")
def log_trip(user_id: str, start: str, end: str, route: dict, stops: dict):
    response = supabase.table("trips").insert({
        "user_id": user_id,
        "start": start,
        "end": end,
        "route": route,
        "stops": stops
    }).execute()
    return {"status": "logged", "trip": response.data}

@trip_router.get("/summary/{user_id}")
def trip_summary(user_id: str):
    trips = supabase.table("trips").select("*").eq("user_id", user_id).execute()
    return {"trips": trips.data}

# --- Wins (Budget + Expenses) Router ---
budget_router = APIRouter(prefix="/budget", tags=["Budget"])

@budget_router.post("/expense")
def add_expense(user_id: str, amount: float, category: str):
    response = supabase.table("expenses").insert({
        "user_id": user_id,
        "amount": amount,
        "category": category,
        "created_at": datetime.utcnow().isoformat()
    }).execute()
    return {"status": "expense_added", "expense": response.data}

@budget_router.get("/status/{user_id}")
def budget_status(user_id: str):
    expenses = supabase.table("expenses").select("*").eq("user_id", user_id).execute()
    total = sum(e["amount"] for e in expenses.data)
    return {"total_spent": total, "expenses": expenses.data}

# --- Maintenance Router ---
maint_router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

@maint_router.post("/log")
def log_maintenance(user_id: str, item: str, details: str):
    response = supabase.table("maintenance").insert({
        "user_id": user_id,
        "item": item,
        "details": details,
        "created_at": datetime.utcnow().isoformat()
    }).execute()
    return {"status": "maintenance_logged", "maintenance": response.data}

@maint_router.get("/history/{user_id}")
def maintenance_history(user_id: str):
    logs = supabase.table("maintenance").select("*").eq("user_id", user_id).execute()
    return {"maintenance": logs.data}

# --- Register Routers ---
app.include_router(trip_router)
app.include_router(budget_router)
app.include_router(maint_router)