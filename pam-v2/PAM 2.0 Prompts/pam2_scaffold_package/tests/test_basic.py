from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_chat():
    res = client.post("/chat", json={"message": "hello", "user_id": "test"})
    assert res.status_code == 200
    assert "PAM heard" in res.json()["response"]
