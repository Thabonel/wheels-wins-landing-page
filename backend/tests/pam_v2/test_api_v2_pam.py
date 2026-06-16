"""
Tests for the Pam V2 HTTP streaming turn endpoint.

Uses a minimal FastAPI app to avoid triggering the full backend startup.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncIterator, Dict, List

import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient

from app.api.deps import get_current_user as deps_get_current_user
from app.api.v2 import pam as pam_api
from app.core.feature_flags import FeatureFlags, get_feature_flags
from app.services.pam_v2.idempotency import idempotency_guard
from app.services.pam_v2.models import (
    FakeModelClient,
    FinishEvent,
    ModelClientConfig,
    ScriptedResponse,
    TextDeltaEvent,
)
from app.services.pam_v2.runtime import PamV2Runtime, RuntimeConfig
from app.services.pam_v2.tools.catalog import ToolCatalog


class FakeExecutor:
    def __init__(self):
        self.calls: List[Any] = []

    async def execute(self, call, context, approved: bool = False):
        from app.services.pam_v2.tools.types import ToolResult

        self.calls.append(call)
        return ToolResult(success=True, data={}, summary="ok")


def _make_runtime(responses: List[ScriptedResponse]) -> PamV2Runtime:
    config = ModelClientConfig(model="fake")
    client = FakeModelClient(config, responses=responses)
    return PamV2Runtime(client, FakeExecutor(), ToolCatalog(), RuntimeConfig())


class FakeUser:
    user_id = "user_1"
    email = "user@example.com"
    role = "user"
    permissions = []
    session_id = "sess_1"
    mfa_verified = True
    requires_mfa = False


async def fake_get_current_user():
    return FakeUser()


def make_test_app(
    enabled: bool = True,
    provider: str = "openai",
    model: str = "gpt-test",
) -> FastAPI:
    app = FastAPI()

    def fake_get_feature_flags():
        flags = FeatureFlags()
        flags.PAM_V2_ENABLED = enabled
        flags.PAM_V2_PROVIDER = provider
        flags.PAM_V2_MODEL = model
        return flags

    # Override with the same function object that the router's Depends uses
    app.dependency_overrides[pam_api.get_current_user] = fake_get_current_user
    app.dependency_overrides[get_feature_flags] = fake_get_feature_flags

    app.include_router(pam_api.router, prefix="/api/v2/pam")

    return app


def parse_sse(response) -> List[Dict[str, Any]]:
    events = []
    for line in response.iter_text():
        for sub in line.split("\n"):
            sub = sub.strip()
            if sub.startswith("data: "):
                payload = sub[6:]
                if payload:
                    events.append(json.loads(payload))
    return events


class TestPamV2TurnEndpoint:
    def setup_method(self):
        idempotency_guard.clear()
    def test_feature_flag_disabled_returns_error(self):
        app = make_test_app(enabled=False)
        with TestClient(app) as client:
            response = client.post("/api/v2/pam/turn", json={"message": "Hi"})
        assert response.status_code == 403
        assert response.json()["code"] == "not_enabled"

    def test_stream_direct_answer(self, monkeypatch):
        app = make_test_app(enabled=True)
        monkeypatch.setattr(
            pam_api,
            "_create_v2_runtime",
            lambda provider, model, api_key: _make_runtime(
                [ScriptedResponse(events=[TextDeltaEvent("Hello!"), FinishEvent("completed")])]
            ),
        )
        monkeypatch.setenv("OPENAI_API_KEY", "sk-test")

        with TestClient(app) as client:
            response = client.post(
                "/api/v2/pam/turn",
                json={"message": "Hi"},
                headers={"Accept": "text/event-stream"},
            )

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")

        events = parse_sse(response)
        assert events[0]["event"] == "turn_started"
        assert events[-1]["event"] == "turn_completed"
        assert events[-1]["finish_reason"] == "completed"

    def test_stream_includes_text_delta(self, monkeypatch):
        app = make_test_app(enabled=True)
        monkeypatch.setattr(
            pam_api,
            "_create_v2_runtime",
            lambda provider, model, api_key: _make_runtime(
                [ScriptedResponse(events=[TextDeltaEvent("Sunny."), FinishEvent("completed")])]
            ),
        )
        monkeypatch.setenv("OPENAI_API_KEY", "sk-test")

        with TestClient(app) as client:
            response = client.post("/api/v2/pam/turn", json={"message": "Weather?"})

        events = parse_sse(response)
        deltas = [e for e in events if e["event"] == "text_delta"]
        assert deltas
        assert "".join(e["delta"] for e in deltas) == "Sunny."

    def test_missing_api_key_returns_error(self, monkeypatch):
        app = make_test_app(enabled=True)
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)

        with TestClient(app) as client:
            response = client.post("/api/v2/pam/turn", json={"message": "Hi"})
        assert response.status_code == 503
        assert response.json()["code"] == "provider_not_configured"

    def test_unsupported_provider_returns_error(self, monkeypatch):
        app = make_test_app(enabled=True, provider="gemini", model="gemini-1")
        monkeypatch.setenv("OPENAI_API_KEY", "sk-test")

        with TestClient(app) as client:
            response = client.post("/api/v2/pam/turn", json={"message": "Hi"})
        assert response.status_code == 400
        assert response.json()["code"] == "unsupported_provider"

    def test_disconnect_stops_stream(self, monkeypatch):
        app = make_test_app(enabled=True)

        class SlowRuntime:
            async def run(self, user_message, tool_context, history=None, extra_context=None):
                yield {"event": "turn_started"}
                await asyncio.sleep(60)
                yield {"event": "turn_completed"}

        monkeypatch.setattr(pam_api, "_create_v2_runtime", lambda provider, model, api_key: SlowRuntime())
        monkeypatch.setenv("OPENAI_API_KEY", "sk-test")

        with TestClient(app) as client:
            with client.stream("POST", "/api/v2/pam/turn", json={"message": "Hi"}) as response:
                _ = next(response.iter_text())

        assert response.status_code == 200

    def test_duplicate_client_message_id_returns_conflict(self, monkeypatch):
        app = make_test_app(enabled=True)
        monkeypatch.setenv("OPENAI_API_KEY", "sk-test")

        with TestClient(app) as client:
            first = client.post(
                "/api/v2/pam/turn",
                json={"message": "First", "client_message_id": "dup_1"},
            )
            assert first.status_code == 200

            second = client.post(
                "/api/v2/pam/turn",
                json={"message": "Second", "client_message_id": "dup_1"},
            )
            assert second.status_code == 409
            assert second.json()["code"] == "duplicate_message"
