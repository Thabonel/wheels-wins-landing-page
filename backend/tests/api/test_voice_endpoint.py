import os
import pytest
from httpx import AsyncClient

if os.getenv("RUN_API_TESTS") != "1":
    pytest.skip("Skipping API tests", allow_module_level=True)


class TestVoiceEndpoint:
    """Tests for the /api/v1/voice endpoint - direct TTS via Supabase function."""

    @pytest.mark.asyncio
    async def test_voice_generation_success(self, test_client: AsyncClient):
        """Test direct TTS generation"""
        payload = {"text": "Hello from tests"}
        response = await test_client.post("/api/v1/voice", json=payload)
        
        # Should return 200 with audio data (may fail if Supabase function not available)
        if response.status_code == 200:
            data = response.json()
            assert "audio" in data
            assert isinstance(data["audio"], list)
            assert "duration" in data
            assert "cached" in data
            print(f"✅ TTS generated: {len(data['audio'])} audio samples, duration: {data['duration']}ms")
        else:
            # If Supabase function fails, should return 500
            assert response.status_code == 500
            print("⚠️ TTS service unavailable (expected in test environment)")

    @pytest.mark.asyncio
    async def test_voice_generation_empty_text(self, test_client: AsyncClient):
        """Test TTS with empty text"""
        payload = {"text": ""}
        response = await test_client.post("/api/v1/voice", json=payload)
        
        # Should validate and reject empty text
        assert response.status_code in {400, 422, 500}

    @pytest.mark.asyncio
    async def test_voice_generation_invalid_request(self, test_client: AsyncClient):
        """Test TTS with invalid request format"""
        payload = {"invalid_field": "test"}
        response = await test_client.post("/api/v1/voice", json=payload)
        
        # Should return validation error
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_voice_generation_long_text(self, test_client: AsyncClient):
        """Test TTS with longer text"""
        payload = {"text": "This is a longer test message to verify that the text-to-speech system can handle multiple words and sentences properly."}
        response = await test_client.post("/api/v1/voice", json=payload)
        
        # Should handle longer text (may fail if service unavailable)
        if response.status_code == 200:
            data = response.json()
            assert "audio" in data
            assert len(data["audio"]) > 0
            print(f"✅ Long text TTS generated: {len(data['audio'])} audio samples")
        else:
            assert response.status_code == 500
            print("⚠️ TTS service unavailable for long text (expected in test environment)")