import asyncio
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)

class EditingHub:
    def __init__(self):
        self.connections = {}
        self.tasks = {}

    async def connect(self, websocket: WebSocket) -> str:
        await websocket.accept()
        conn_id = str(uuid.uuid4())
        self.connections[conn_id] = websocket
        logger.info(f"EditingHub connected {conn_id}")
        return conn_id

    def disconnect(self, conn_id: str):
        self.connections.pop(conn_id, None)
        task = self.tasks.pop(conn_id, None)
        if task:
            task.cancel()
        logger.info(f"EditingHub disconnected {conn_id}")

    async def send_progress(self, websocket: WebSocket, step: str, percent: int, details: str):
        await websocket.send_json({
            "type": "ProgressUpdate",
            "step": step,
            "percent": percent,
            "details": details,
        })

hub = EditingHub()

async def mock_processing(conn_id: str, websocket: WebSocket):
    steps = [
        "Analyzing script",
        "Transcribing media files",
        "Matching content to script",
        "Generating timeline",
        "Processing audio",
    ]
    total = len(steps)
    for i, step in enumerate(steps, start=1):
        await asyncio.sleep(1)
        percent = int(i / total * 100)
        await hub.send_progress(websocket, step, percent, "")
    await hub.send_progress(websocket, "Complete", 100, "")

@router.websocket("/editing")
async def editing_endpoint(websocket: WebSocket):
    conn_id = await hub.connect(websocket)
    task = asyncio.create_task(mock_processing(conn_id, websocket))
    hub.tasks[conn_id] = task
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("action") == "cancel":
                task.cancel()
                await hub.send_progress(websocket, "Cancelled", 0, "Processing cancelled")
    except WebSocketDisconnect:
        pass
    finally:
        hub.disconnect(conn_id)
