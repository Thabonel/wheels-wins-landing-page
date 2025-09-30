"""
PAM Hybrid System API Endpoints

Cost-optimized AI assistant using:
- GPT-4o-mini for simple queries (95% of traffic, $0.075/1M tokens)
- Claude Agent SDK for complex tasks (5% of traffic, $3/1M tokens)

Expected cost reduction: 77-90% compared to GPT-5 system
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
import json
import logging
import time
from datetime import datetime

from app.api.deps import verify_supabase_jwt_flexible
from app.core.logging import get_logger
from app.services.pam_hybrid import HybridGateway
from app.services.pam_hybrid.core.types import HybridResponse

logger = get_logger(__name__)
router = APIRouter()

# Initialize hybrid gateway (singleton)
_hybrid_gateway: Optional[HybridGateway] = None


def get_hybrid_gateway() -> HybridGateway:
    """Get or create hybrid gateway instance"""
    global _hybrid_gateway

    if _hybrid_gateway is None:
        try:
            _hybrid_gateway = HybridGateway()
            logger.info("✅ PAM Hybrid Gateway initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Hybrid Gateway: {e}", exc_info=True)
            raise

    return _hybrid_gateway


@router.get("/health")
async def health_check():
    """Health check for hybrid system"""
    try:
        gateway = get_hybrid_gateway()
        metrics = await gateway.get_metrics()

        return JSONResponse({
            "status": "healthy",
            "system": "pam_hybrid",
            "version": "3.0.0",
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": metrics
        })

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )


@router.post("/chat")
async def chat(
    message: str,
    context: Optional[Dict[str, Any]] = None,
    user_id: str = Depends(verify_supabase_jwt_flexible)
):
    """
    REST API endpoint for hybrid PAM chat

    Args:
        message: User's message
        context: Optional context dictionary
        user_id: Verified user ID from JWT

    Returns:
        HybridResponse with message, handler used, cost, latency
    """
    start_time = time.time()

    try:
        gateway = get_hybrid_gateway()

        # Process request through hybrid system
        response: HybridResponse = await gateway.process_request(
            user_id=user_id,
            message=message,
            context=context or {},
            voice_input=False
        )

        logger.info(
            f"Chat processed: user={user_id[:8]}, "
            f"handler={response.handler}, "
            f"latency={response.latency_ms}ms, "
            f"cost=${response.cost_estimate:.6f}"
        )

        return JSONResponse({
            "response": response.response,
            "handler": response.handler,
            "complexity": response.complexity.value,
            "agent_used": response.agent_used.value if response.agent_used else None,
            "tools_called": response.tools_called,
            "cost_usd": response.cost_estimate,
            "latency_ms": response.latency_ms,
            "timestamp": response.timestamp.isoformat()
        })

    except Exception as e:
        logger.error(f"Chat endpoint failed: {e}", exc_info=True)

        latency_ms = int((time.time() - start_time) * 1000)

        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to process chat request",
                "message": str(e),
                "latency_ms": latency_ms,
                "timestamp": datetime.utcnow().isoformat()
            }
        )


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: Optional[str] = None
):
    """
    WebSocket endpoint for hybrid PAM with streaming responses

    Message format:
    {
        "type": "message",
        "content": "User's message",
        "context": {...}  // Optional
    }

    Response format:
    {
        "type": "response",
        "content": "Assistant's response",
        "handler": "gpt4o-mini" or "claude-dashboard",
        "complexity": "simple" or "complex",
        "cost_usd": 0.000123,
        "latency_ms": 245
    }
    """
    try:
        # Accept WebSocket connection
        await websocket.accept()
        logger.info(f"🔗 Hybrid WebSocket connected: {user_id}")

        # TODO: Verify JWT token
        # For now, accepting connection (production should verify)

        gateway = get_hybrid_gateway()

        try:
            while True:
                # Receive message
                data = await websocket.receive_text()
                message_data = json.loads(data)

                if message_data.get("type") == "ping":
                    # Handle ping for keepalive
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    continue

                if message_data.get("type") != "message":
                    continue

                message = message_data.get("content", "")
                context = message_data.get("context", {})
                voice_input = message_data.get("voice_input", False)

                if not message:
                    continue

                # Process through hybrid system
                response: HybridResponse = await gateway.process_request(
                    user_id=user_id,
                    message=message,
                    context=context,
                    voice_input=voice_input
                )

                # Send response
                await websocket.send_json({
                    "type": "response",
                    "content": response.response,
                    "handler": response.handler,
                    "complexity": response.complexity.value,
                    "agent_used": response.agent_used.value if response.agent_used else None,
                    "tools_called": response.tools_called,
                    "cost_usd": response.cost_estimate,
                    "latency_ms": response.latency_ms,
                    "timestamp": response.timestamp.isoformat()
                })

                logger.info(
                    f"WebSocket message processed: user={user_id[:8]}, "
                    f"handler={response.handler}, "
                    f"latency={response.latency_ms}ms"
                )

        except WebSocketDisconnect:
            logger.info(f"🔌 Hybrid WebSocket disconnected: {user_id}")

        except Exception as e:
            logger.error(f"WebSocket error: {e}", exc_info=True)
            try:
                await websocket.send_json({
                    "type": "error",
                    "message": "An error occurred processing your request",
                    "timestamp": datetime.utcnow().isoformat()
                })
            except:
                pass

    except Exception as e:
        logger.error(f"WebSocket connection failed: {e}", exc_info=True)
        try:
            await websocket.close()
        except:
            pass


@router.get("/metrics")
async def get_metrics(
    user_id: str = Depends(verify_supabase_jwt_flexible)
):
    """Get system metrics (admin only in production)"""
    try:
        gateway = get_hybrid_gateway()
        metrics = await gateway.get_metrics()

        return JSONResponse({
            "metrics": metrics,
            "timestamp": datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"Metrics endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))