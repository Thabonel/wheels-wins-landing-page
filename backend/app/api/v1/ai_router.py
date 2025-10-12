from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.services.ai.provider_interface import AIMessage
from app.services.ai.router import ModelRouter, RouteRequest

router = APIRouter(prefix="/api/v1/ai/router", tags=["ai-router"])


class RouteMessage(BaseModel):
    role: str
    content: str


class RouteInput(BaseModel):
    user_id: str
    messages: List[RouteMessage]
    needs_tools: bool = False
    long_context: bool = False
    streaming: bool = False
    priority: str = "normal"


class CompleteInput(RouteInput):
    temperature: float = 0.7
    max_tokens: Optional[int] = None


router_state = {"router": ModelRouter()}


@router.post("/recommend")
async def recommend_route(payload: RouteInput):
    router = router_state["router"]
    messages = [AIMessage(role=m.role, content=m.content) for m in payload.messages]
    req = RouteRequest(
        user_id=payload.user_id,
        messages=messages,
        needs_tools=payload.needs_tools,
        long_context=payload.long_context,
        streaming=payload.streaming,
        priority=payload.priority,
    )
    decision = router.recommend(req)
    return {
        "provider": decision.provider,
        "model": decision.model,
        "reason": decision.reason,
        "estimated_cost_usd": decision.estimated_cost_usd,
        "fallback_chain": decision.fallback_chain,
        "capabilities": decision.capabilities,
    }


@router.post("/complete")
async def route_and_complete(payload: CompleteInput):
    router = router_state["router"]
    messages = [AIMessage(role=m.role, content=m.content) for m in payload.messages]
    req = RouteRequest(
        user_id=payload.user_id,
        messages=messages,
        needs_tools=payload.needs_tools,
        long_context=payload.long_context,
        streaming=payload.streaming,
        priority=payload.priority,
    )
    try:
        resp = await router.complete(req, temperature=payload.temperature, max_tokens=payload.max_tokens)
        return {
            "content": resp.content,
            "model": resp.model,
            "provider": resp.provider,
            "usage": resp.usage,
            "latency_ms": resp.latency_ms,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics")
async def router_metrics():
    router = router_state["router"]
    try:
        return router.get_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
