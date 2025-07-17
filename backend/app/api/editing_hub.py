import asyncio
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.logging import get_logger
from app.services.script_analysis.openai_script_analyzer import (
    OpenAIScriptAnalyzer,
)

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

async def process_script(conn_id: str, websocket: WebSocket, script: str):
    """Process a script using OpenAI and stream progress."""

    analyzer = OpenAIScriptAnalyzer()
    try:
        await hub.send_progress(websocket, "Analyzing script", 10, "Starting")
        analysis = await analyzer.analyze_script(script)
        await hub.send_progress(websocket, "Analyzing script", 100, "Complete")
        await websocket.send_json({"type": "AnalysisResult", "data": analysis.model_dump()})
    except Exception as e:
        await hub.send_progress(websocket, "Error", 0, str(e))

@router.websocket("/editing")
async def editing_endpoint(websocket: WebSocket):
    conn_id = await hub.connect(websocket)
    # Wait for the first message containing the script
    init_data = await websocket.receive_json()
    script = init_data.get("script", "")

    task = asyncio.create_task(process_script(conn_id, websocket, script))
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
