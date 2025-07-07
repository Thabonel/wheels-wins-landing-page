from fastapi import WebSocket

async def stream_wav_over_websocket(websocket: WebSocket, wav_data: bytes, chunk_size: int = 4096) -> None:
    """Stream WAV audio data over a WebSocket connection."""
    for start in range(0, len(wav_data), chunk_size):
        await websocket.send_bytes(wav_data[start:start + chunk_size])
    await websocket.send_json({"event": "audio_end"})

__all__ = ["stream_wav_over_websocket"]
