import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from supabase import create_client, Client
import os

# Setup test client
client = TestClient(app)

# Setup Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

@pytest.fixture(scope="module")
def test_user():
    # Create a test user in Supabase auth
    email = "testuser@example.com"
    password = "password123"
    user = supabase.auth.sign_up({"email": email, "password": password})
    yield user
    # Cleanup user
    supabase.auth.admin.delete_user(user.user.id)

@pytest.fixture(scope="module")
def auth_header(test_user):
    # Sign in to get JWT
    response = supabase.auth.sign_in_with_password({
        "email": test_user.user.email,
        "password": "password123"
    })
    jwt = response.session.access_token
    return {"Authorization": f"Bearer {jwt}"}

def test_create_post(auth_header):
    response = client.post(
        "/community/posts",
        json={"content": "Hello, community! This is a test post."},
        headers=auth_header
    )
    assert response.status_code == 200
    assert response.json()["content"] == "Hello, community! This is a test post."

def test_get_feed(auth_header):
    response = client.get("/community/feed", headers=auth_header)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(post["content"] == "Hello, community! This is a test post." for post in data)

def test_get_my_posts(auth_header):
    response = client.get("/community/my-posts", headers=auth_header)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert all(post["user_id"] is not None for post in data)