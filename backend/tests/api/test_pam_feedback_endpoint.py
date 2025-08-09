import os
import pytest
from httpx import AsyncClient

if os.getenv("RUN_API_TESTS") != "1":
    pytest.skip("Skipping API tests", allow_module_level=True)


class TestPamFeedbackEndpoint:
    """Tests for the /api/v1/pam/feedback endpoint."""

    @pytest.mark.asyncio
    async def test_pam_thumb_feedback(self, test_client: AsyncClient):
        payload = {
            "message_id": "msg-123",
            "thumbs_up": True
        }
        response = await test_client.post("/api/v1/pam/feedback", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Feedback recorded"

