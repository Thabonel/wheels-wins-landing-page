"""
Pam V2 HTTP API

Versioned, provider-neutral endpoints for the rebuilt Pam assistant.
V1 endpoints remain untouched in backend/app/api/v1/pam/.
"""

from __future__ import annotations

import asyncio
import json
import os
import uuid
from typing import Any, AsyncIterator, Dict

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse, StreamingResponse

from app.api.deps import CurrentUser, get_current_user
from app.core.feature_flags import FeatureFlags, get_feature_flags
from app.models.schemas.pam_v2 import (
    ErrorEvent,
    PamHealthResponseV2,
    PamTurnRequestV2,
    PamV2ErrorDetail,
    TurnCompletedEvent,
)
from app.services.pam_v2.models import ModelClientConfig, OpenAIResponsesClient
from app.services.pam_v2.models.fake import EchoModelClient
from app.services.pam_v2.runtime import PamV2Runtime, RuntimeConfig
from app.services.pam_v2.tools.executor import get_executor
from app.services.pam_v2.tools.types import ToolContext


router = APIRouter(tags=["PAM V2"])


def _create_v2_runtime(provider: str, model: str, api_key: str) -> PamV2Runtime:
    """Factory for the V2 runtime; separated for testability.

    Falls back to EchoModelClient when the OpenAI key is missing or does not
    look like a real OpenAI key.  Set a valid OPENAI_API_KEY environment
    variable on Render to switch back to the full OpenAI provider.
    """
    if provider == "echo":
        model_client = EchoModelClient(ModelClientConfig(model=model, api_key=""))
    elif provider == "openai":
        if not api_key or not api_key.startswith("sk-"):
            model_client = EchoModelClient(ModelClientConfig(model="echo", api_key=""))
        else:
            client_config = ModelClientConfig(model=model, api_key=api_key)
            model_client = OpenAIResponsesClient(client_config)
    else:
        raise ValueError(f"Unsupported V2 provider: {provider}")

    executor = get_executor()
    return PamV2Runtime(model_client, executor, executor.catalog, RuntimeConfig())


@router.get(
    "/health",
    response_model=PamHealthResponseV2,
    status_code=status.HTTP_200_OK,
    summary="Pam V2 health and capability check",
)
async def pam_v2_health() -> PamHealthResponseV2:
    """Return Pam V2 status without making any model calls."""
    flags = get_feature_flags()
    return PamHealthResponseV2(
        status="ok",
        pam_v2_enabled=flags.PAM_V2_ENABLED,
        provider=flags.PAM_V2_PROVIDER,
        model=flags.PAM_V2_MODEL,
        environment="development",  # overridden by runtime config in later PRDs
    )


@router.post("/turn")
async def pam_v2_turn(
    request: Request,
    turn_request: PamTurnRequestV2,
    current_user: CurrentUser = Depends(get_current_user),
    flags: FeatureFlags = Depends(get_feature_flags),
) -> StreamingResponse:
    """Stream one Pam V2 text turn as server-sent events."""
    if not flags.PAM_V2_ENABLED:
        return _error_response("not_enabled", "Pam V2 is not enabled", status.HTTP_403_FORBIDDEN)

    from app.services.pam_v2.idempotency import idempotency_guard

    if idempotency_guard.is_processed(turn_request.client_message_id):
        return _error_response(
            "duplicate_message",
            "This message has already been processed",
            status.HTTP_409_CONFLICT,
        )

    idempotency_guard.mark_processed(turn_request.client_message_id)

    provider = flags.PAM_V2_PROVIDER or "openai"
    model = flags.PAM_V2_MODEL
    if not model:
        return _error_response("model_not_configured", "PAM_V2_MODEL is not set", status.HTTP_503_SERVICE_UNAVAILABLE)

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return _error_response(
            "provider_not_configured",
            "OpenAI API key is not configured",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    trace_id = str(uuid.uuid4())
    tool_context = ToolContext(
        user_id=current_user.user_id,
        trace_id=trace_id,
        conversation_id=turn_request.conversation_id,
        client_message_id=turn_request.client_message_id,
        locale=turn_request.locale,
        timezone=turn_request.timezone,
    )

    try:
        runtime = _create_v2_runtime(provider, model, api_key)
    except ValueError as exc:
        return _error_response("unsupported_provider", str(exc), status.HTTP_400_BAD_REQUEST)

    async def event_stream() -> AsyncIterator[str]:
        try:
            async for event in runtime.run(
                user_message=turn_request.message,
                tool_context=tool_context,
            ):
                if await request.is_disconnected():
                    break
                yield f"data: {event.model_dump_json()}\n\n"
        except asyncio.CancelledError:
            return
        except Exception:
            error = ErrorEvent(
                event="error",
                trace_id=trace_id,
                sequence=0,
                code="runtime_error",
                message="An unexpected error occurred. Please try again.",
            )
            completed = TurnCompletedEvent(
                event="turn_completed",
                trace_id=trace_id,
                sequence=1,
                conversation_id=turn_request.conversation_id,
                client_message_id=turn_request.client_message_id,
                finish_reason="error",
            )
            yield f"data: {error.model_dump_json()}\n\n"
            yield f"data: {completed.model_dump_json()}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


def _error_response(code: str, message: str, status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=json.loads(
            PamV2ErrorDetail(code=code, message=message, trace_id=str(uuid.uuid4())).model_dump_json()
        ),
    )
