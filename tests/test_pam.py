import os
import sys
from pathlib import Path
import pytest
from httpx import AsyncClient

# Ensure backend package is importable
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.main import app

# Skip API tests unless enabled
if os.getenv("RUN_API_TESTS") != "1":
    pytest.skip("Skipping API tests", allow_module_level=True)

@pytest.fixture
async def test_client() -> AsyncClient:
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.mark.asyncio
async def test_pam_chat_hello(test_client: AsyncClient):
    response = await test_client.post("/api/v1/pam/chat", json={"message": "Hello"})
    assert response.status_code == 200
    data = response.json()
    for field in ["answer_display", "answer_speech", "answer_ssml", "target_node"]:
        assert field in data
    assert len(data["answer_speech"].split()) <= 70


@pytest.mark.asyncio
async def test_pam_route_wheels(test_client: AsyncClient):
    response = await test_client.post("/api/v1/pam/chat", json={"message": "Log $10 fuel"})
    assert response.status_code == 200
    data = response.json()
    assert data["target_node"] == "wheels"


@pytest.mark.asyncio
async def test_pam_route_wins(test_client: AsyncClient):
    response = await test_client.post("/api/v1/pam/chat", json={"message": "Add coffee expense $5"})
    assert response.status_code == 200
    data = response.json()
    assert data["target_node"] == "wins"
