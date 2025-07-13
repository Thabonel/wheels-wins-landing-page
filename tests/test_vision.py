import os
import sys
import base64
from pathlib import Path
from fastapi.testclient import TestClient
import pytest

# Ensure backend package is importable
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

# Provide minimal settings for FastAPI app
os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("SUPABASE_KEY", "key")
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("OPENAI_API_KEY", "dummy")

from app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_analyze_screenshot_no_typeerror(client):
    img_data = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAJ+8CbkAAAAASUVORK5CYII="
    )
    files = {"image": ("test.png", img_data, "image/png")}
    response = client.post(
        "/api/v1/vision/analyze-screenshot",
        files=files,
        headers={"Authorization": "Bearer invalid"},
    )
    assert response.status_code >= 400
    assert "object dict" not in response.text.lower()
