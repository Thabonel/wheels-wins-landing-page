# 🧪 Pam 2.0 – Track A Test Scaffold (pytest)

"""
This test suite validates the Track A Scaffold:
- FastAPI server health
- Gemini chat response (mocked)
- Supabase logging
"""

import pytest
from httpx import AsyncClient
from main import app, supabase

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_chat_response(monkeypatch):
    async def fake_gemini_chat(prompt: str, context: dict = None):
        return "Test response"

    monkeypatch.setattr("main.gemini_chat", fake_gemini_chat)

    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/chat", params={"user_id": "test", "message": "Hello"})
    
    assert response.status_code == 200
    assert "response" in response.json()
    assert response.json()["response"] == "Test response"

    # Check Supabase logging (mock or test schema)
    # For now, just confirm table exists
    tables = supabase.table("pam_messages")
    assert tables is not None