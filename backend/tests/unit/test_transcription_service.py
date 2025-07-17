import pytest
from unittest.mock import patch

from app.services.transcription import TranscriptionService, TranscriptionResult


@pytest.mark.asyncio
async def test_transcribe_media_success():
    service = TranscriptionService()
    service.api_key = "test"
    with patch.object(service, '_upload_to_assemblyai', return_value='upload'), \
         patch.object(service, '_start_transcription', return_value='id'), \
         patch.object(service, '_store_result', return_value=None), \
         patch.object(service, '_get_transcript', side_effect=[
             {'status': 'processing', 'words': [1], 'word_count': 10},
             {'status': 'completed', 'text': 'hello', 'utterances': [], 'words': [1]*10, 'word_count': 10}
         ]):

        result = await service.transcribe_media('file.wav', 'file1')

    assert isinstance(result, TranscriptionResult)
    assert result.text == 'hello'
