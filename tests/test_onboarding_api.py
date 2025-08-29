import os
import sys
from pathlib import Path
import pytest
from httpx import AsyncClient

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.main import app

if os.getenv("RUN_API_TESTS") != "1":
    pytest.skip("Skipping API tests", allow_module_level=True)

@pytest.fixture
async def test_client() -> AsyncClient:
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.mark.asyncio
async def test_onboarding_endpoint(test_client: AsyncClient):
    payload = {
        "full_name": "Jane Doe",
        "nickname": "jane",
        "email": "jane@example.com",
        "region": "US",
        "travel_style": "solo",
        "vehicle_type": "RV",
        "make_model_year": "2020",
        "fuel_type": "diesel",
        "daily_drive_limit": "100",
        "towing_info": "none",
        "second_vehicle": "none",
        "preferred_camp_types": "RV Park",
        "pet_info": "none",
        "accessibility_needs": "none",
        "age_range": "30-40",
    }
    response = await test_client.post("/api/v1/onboarding", json=payload)
    assert response.status_code == 200
    assert "successfully" in response.json().get("message", "")
