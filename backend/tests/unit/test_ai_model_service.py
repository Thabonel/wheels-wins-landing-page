import pytest
from unittest.mock import AsyncMock, patch

from app.services.pam.mcp.models.ai_model_service import AIModelService

@pytest.mark.asyncio
async def test_chat_completion_retry_and_fallback():
    service = AIModelService()
    service.client = AsyncMock()
    service.client.chat.completions.create.side_effect = [Exception("fail"), Exception("fail")]

    service.fallback_client = AsyncMock()
    service.fallback_client.chat.completions.create.return_value = "ok"

    with patch.object(service.cache, "get", return_value=None) as mock_get, \
         patch.object(service.cache, "set") as mock_set:
        result = await service.chat_completion([{"role": "user", "content": "hi"}])
        assert result == "ok"
        assert service.client.chat.completions.create.call_count == 3
        service.fallback_client.chat.completions.create.assert_called_once()
        mock_set.assert_called_once()
