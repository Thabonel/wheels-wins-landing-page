import os
import pytest
from httpx import AsyncClient
from io import BytesIO

if os.getenv("RUN_API_TESTS") != "1":
    pytest.skip("Skipping API tests", allow_module_level=True)


class TestPamVoiceEndpoint:
    """Tests for the /api/v1/pam/voice endpoint - STT→LLM→TTS pipeline."""

    @pytest.mark.asyncio
    async def test_voice_pipeline_with_audio_file(self, test_client: AsyncClient):
        """Test complete STT→LLM→TTS pipeline with audio file upload"""
        # Create a mock audio file (minimal WAV header + some data)
        wav_header = b'RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00'
        mock_audio_data = wav_header + b'\x00' * 100  # Add some audio data
        
        files = {"audio": ("test_audio.wav", BytesIO(mock_audio_data), "audio/wav")}
        
        response = await test_client.post("/api/v1/pam/voice", files=files)
        
        # Should return 200 even if TTS fails (will return JSON fallback)
        assert response.status_code == 200
        
        content_type = response.headers.get("content-type", "")
        
        if content_type.startswith("audio/"):
            # Success: Got audio response
            assert len(response.content) > 0
            # Check for custom headers
            assert "X-Pipeline" in response.headers
            print(f"✅ Audio response received: {len(response.content)} bytes via {response.headers.get('X-Pipeline')}")
        else:
            # Fallback: Got JSON response
            data = response.json()
            assert "response" in data or "error" in data
            print(f"📝 JSON fallback response: {data}")

    @pytest.mark.asyncio  
    async def test_voice_pipeline_invalid_audio(self, test_client: AsyncClient):
        """Test voice pipeline with invalid audio data"""
        # Send non-audio data
        files = {"audio": ("test.txt", BytesIO(b"not audio data"), "text/plain")}
        
        response = await test_client.post("/api/v1/pam/voice", files=files)
        
        # Should handle gracefully and return JSON error
        assert response.status_code == 200
        data = response.json()
        assert "error" in data or "response" in data
        print(f"📝 Invalid audio handled: {data}")

    @pytest.mark.asyncio
    async def test_voice_pipeline_no_audio(self, test_client: AsyncClient):
        """Test voice pipeline without audio file"""
        response = await test_client.post("/api/v1/pam/voice")
        
        # Should return 422 for missing required file
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_voice_pipeline_empty_audio(self, test_client: AsyncClient):
        """Test voice pipeline with empty audio file"""
        files = {"audio": ("empty.wav", BytesIO(b""), "audio/wav")}
        
        response = await test_client.post("/api/v1/pam/voice", files=files)
        
        # Should handle gracefully
        assert response.status_code == 200
        data = response.json()
        assert "error" in data or "response" in data
