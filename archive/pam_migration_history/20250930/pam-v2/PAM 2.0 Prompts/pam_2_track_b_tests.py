# 🧪 Pam 2.0 – Track B Test Scaffold (pytest)

"""
This test suite validates the Track B Scaffold:
- Trip Planning (log + summary)
- Wins (expenses + budget status)
- Maintenance (log + history)
"""

import pytest
from httpx import AsyncClient
from main import app, supabase

@pytest.mark.asyncio
async def test_log_trip(monkeypatch):
    monkeypatch.setattr(supabase.table("trips"), "insert", lambda data: type("obj", (object,), {"data": [data]}))
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/trips/log", params={
            "user_id": "test",
            "start": "2025-09-01",
            "end": "2025-09-10",
            "route": {"from": "A", "to": "B"},
            "stops": {"1": "Townsville"}
        })
    assert response.status_code == 200
    assert response.json()["status"] == "logged"

@pytest.mark.asyncio
async def test_add_expense(monkeypatch):
    monkeypatch.setattr(supabase.table("expenses"), "insert", lambda data: type("obj", (object,), {"data": [data]}))
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/budget/expense", params={
            "user_id": "test",
            "amount": 50,
            "category": "fuel"
        })
    assert response.status_code == 200
    assert response.json()["status"] == "expense_added"

@pytest.mark.asyncio
async def test_log_maintenance(monkeypatch):
    monkeypatch.setattr(supabase.table("maintenance"), "insert", lambda data: type("obj", (object,), {"data": [data]}))
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/maintenance/log", params={
            "user_id": "test",
            "item": "Oil Change",
            "details": "Changed at 10,000km"
        })
    assert response.status_code == 200
    assert response.json()["status"] == "maintenance_logged"