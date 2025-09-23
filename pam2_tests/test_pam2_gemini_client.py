"""Unit tests for the PAM 2 Gemini client."""

import os
import sys
import types
import importlib.machinery
from dataclasses import dataclass
from pathlib import Path

import pytest


# Ensure required environment variables exist before the module loads
os.environ.setdefault("GEMINI_API_KEY", "AIzaFakeFakeFakeFakeFakeFake")
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-abcdefghijklmnopqrstuvwxyz123456")
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "eyJfake")
os.environ.setdefault("PAM2_SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("PAM2_SUPABASE_SERVICE_ROLE_KEY", "eyJfakepam2")
os.environ.setdefault("PAM2_GEMINI_API_KEY", "AIzaFakePam2KeyFakeFakeFake")
os.environ.setdefault("PAM2_ANTHROPIC_API_KEY", "sk-ant-pam2abcdefghijklmnopqrstuvwxyz")
os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@localhost:5432/db")


@dataclass
class GeminiConfig:
    """Lightweight stand-in for the production GeminiConfig."""

    api_key: str
    model: str = "gemini-1.5-flash"
    temperature: float = 0.7
    max_tokens: int = 1024
    timeout_seconds: int = 30


class GeminiAPIError(Exception):
    """Minimal GeminiAPIError stand-in for test isolation."""

    def __init__(self, message: str, error_code: str | None = None, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code or "GeminiAPIError"
        self.details = details or {}


def _prepare_stubbed_modules() -> None:
    """Inject stub modules so the Gemini client can import without heavy dependencies."""

    for name in [
        "backend.app.services.pam_2",
        "backend.app.services.pam_2.core",
        "backend.app.services.pam_2.core.types",
        "backend.app.services.pam_2.core.config",
        "backend.app.services.pam_2.core.exceptions",
        "backend.app.services.pam_2.integrations",
    ]:
        sys.modules.pop(name, None)

    backend_dir = Path(__file__).resolve().parents[1] / "backend"
    pam2_dir = backend_dir / "app" / "services" / "pam_2"

    core_types_module = types.ModuleType("backend.app.services.pam_2.core.types")
    core_types_module.GeminiConfig = GeminiConfig
    core_types_module.__spec__ = importlib.machinery.ModuleSpec(
        "backend.app.services.pam_2.core.types",
        loader=None,
        is_package=False
    )

    core_config_module = types.ModuleType("backend.app.services.pam_2.core.config")
    core_config_module.pam2_settings = types.SimpleNamespace(
        get_gemini_config=lambda: GeminiConfig(api_key="stub-key")
    )
    core_config_module.__spec__ = importlib.machinery.ModuleSpec(
        "backend.app.services.pam_2.core.config",
        loader=None,
        is_package=False
    )

    core_exceptions_module = types.ModuleType("backend.app.services.pam_2.core.exceptions")
    core_exceptions_module.GeminiAPIError = GeminiAPIError
    core_exceptions_module.__spec__ = importlib.machinery.ModuleSpec(
        "backend.app.services.pam_2.core.exceptions",
        loader=None,
        is_package=False
    )

    core_package = types.ModuleType("backend.app.services.pam_2.core")
    core_package.types = core_types_module
    core_package.config = core_config_module
    core_package.exceptions = core_exceptions_module
    core_package.__all__ = ["types", "exceptions", "config"]
    core_package.__path__ = []
    core_package.__spec__ = importlib.machinery.ModuleSpec(
        "backend.app.services.pam_2.core",
        loader=None,
        is_package=True
    )

    pam2_package = types.ModuleType("backend.app.services.pam_2")
    pam2_package.__path__ = [str(pam2_dir)]
    pam2_package.__spec__ = importlib.machinery.ModuleSpec(
        "backend.app.services.pam_2",
        loader=None,
        is_package=True
    )
    pam2_package.core = core_package

    integrations_package = types.ModuleType("backend.app.services.pam_2.integrations")
    integrations_package.__path__ = [str(pam2_dir / "integrations")]
    integrations_package.__spec__ = importlib.machinery.ModuleSpec(
        "backend.app.services.pam_2.integrations",
        loader=None,
        is_package=True
    )

    sys.modules["backend.app.services.pam_2"] = pam2_package
    sys.modules["backend.app.services.pam_2.core"] = core_package
    sys.modules["backend.app.services.pam_2.core.types"] = core_types_module
    sys.modules["backend.app.services.pam_2.core.config"] = core_config_module
    sys.modules["backend.app.services.pam_2.core.exceptions"] = core_exceptions_module
    sys.modules["backend.app.services.pam_2.integrations"] = integrations_package


_prepare_stubbed_modules()

from backend.app.services.pam_2.integrations.gemini import GeminiClient  # noqa: E402  # pylint: disable=wrong-import-position


class FakeUsageMetadata:
    """Stub usage metadata structure."""

    def __init__(self, token_count: int):
        self.total_token_count = token_count


class FakeSafetyRating:
    """Stub safety rating with ``to_dict`` helper."""

    def __init__(self, category: str = "general", probability: str = "low"):
        self.category = category
        self.probability = probability

    def to_dict(self) -> dict:
        return {"category": self.category, "probability": self.probability}


class FakeResponse:
    """Stub Gemini response object."""

    def __init__(self, text: str = "Stub response", token_count: int = 10):
        self.text = text
        self.usage_metadata = FakeUsageMetadata(token_count)
        self.candidates = [types.SimpleNamespace(safety_ratings=[FakeSafetyRating()])]


class FakeModel:
    """Stub GenerativeModel capturing prompts for assertions."""

    def __init__(self, model_name: str, generation_config: dict | None = None, response: FakeResponse | None = None):
        self.model_name = model_name
        self.generation_config = generation_config or {}
        self._response = response or FakeResponse()
        self.calls: list[str] = []

    async def generate_content_async(self, prompt: str) -> FakeResponse:
        self.calls.append(prompt)
        return self._response


@pytest.fixture
def mock_genai(monkeypatch):
    """Provide a stub ``google.generativeai`` module."""

    state: dict[str, object] = {}

    def configure(api_key: str) -> None:
        state["api_key"] = api_key

    def generative_model(model_name: str, generation_config: dict | None = None):
        model = FakeModel(model_name, generation_config)
        state["model"] = model
        return model

    module = types.ModuleType("google.generativeai")
    module.configure = configure
    module.GenerativeModel = generative_model
    module.state = state

    monkeypatch.setitem(sys.modules, "google.generativeai", module)

    yield module

    sys.modules.pop("google.generativeai", None)


@pytest.mark.asyncio
async def test_initialize_sets_up_client(mock_genai):
    """Initialize should configure generative model and warm it up."""

    config = GeminiConfig(api_key="stub-key", temperature=0.6, max_tokens=256)
    client = GeminiClient(config)

    await client.initialize()

    assert client._client is mock_genai
    assert isinstance(client._model, FakeModel)
    assert mock_genai.state["api_key"] == "stub-key"
    assert client._model.calls == ["Hello"]
    assert client._model.generation_config["temperature"] == pytest.approx(0.6)


@pytest.mark.asyncio
async def test_call_gemini_api_formats_prompt_and_returns_metadata():
    """The Gemini API wrapper should return structured data with metadata."""

    config = GeminiConfig(api_key="stub-key", timeout_seconds=5)
    client = GeminiClient(config)
    client._client = object()

    fake_response = FakeResponse(text="Gemini output", token_count=128)
    model = FakeModel(config.model, {}, fake_response)
    client._model = model

    history = [
        {"role": "user", "content": "Hi there"},
        {"role": "assistant", "content": "Hello!"}
    ]

    result = await client._call_gemini_api(
        prompt="Plan a trip to Tokyo",
        conversation_history=history,
        system_prompt="System instructions"
    )

    formatted_prompt = model.calls[0]
    assert "System instructions" in formatted_prompt
    assert "Conversation History" in formatted_prompt
    assert "user: Hi there" in formatted_prompt
    assert "assistant: Hello!" in formatted_prompt
    assert "User: Plan a trip to Tokyo" in formatted_prompt

    assert result["response"] == "Gemini output"
    assert result["model"] == config.model
    assert result["tokens_used"] == 128
    assert result["is_placeholder"] is False
    assert result["response_time_ms"] >= 0
    assert result["safety_ratings"][0]["category"] == "general"
