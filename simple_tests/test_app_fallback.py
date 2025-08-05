import importlib
import importlib.util
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]

spec = importlib.util.spec_from_file_location("root_app", ROOT / "main.py")
app_module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(app_module)
import sys
sys.modules[spec.name] = app_module


def test_fallback_cors_and_health(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://example.com")

    def fail_load():
        raise RuntimeError("boom")

    monkeypatch.setattr(app_module, "_load_backend_app", fail_load)
    spec.loader.exec_module(app_module)

    client = TestClient(app_module.app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "error"

    assert any(m.cls is CORSMiddleware for m in app_module.app.user_middleware)
