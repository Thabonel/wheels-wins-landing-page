import os
import pytest
from httpx import AsyncClient

if os.getenv("RUN_API_TESTS") != "1":
    pytest.skip("Skipping API tests", allow_module_level=True)


class TestPamVoiceEndpoint:
    """Tests for the /api/v1/pam/voice endpoint."""

    @pytest.mark.asyncio
    async def test_voice_generation_success(self, test_client: AsyncClient):
        payload = {"text": "Hello from tests"}
        response = await test_client.post("/api/v1/pam/voice", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "audio" in data
        assert isinstance(data["audio"], list)

    @pytest.mark.asyncio
    async def test_voice_generation_invalid_request(self, test_client: AsyncClient):
        payload = {"text": ""}
        response = await test_client.post("/api/v1/pam/voice", json=payload)
        assert response.status_code in {400, 422}
