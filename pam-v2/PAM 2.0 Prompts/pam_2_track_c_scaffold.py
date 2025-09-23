# 🚧 Pam 2.0 – Track C Scaffold (Community & Social)

"""
This scaffold introduces Community & Social features:
- Community posts (trip sharing)
- Community feed (aggregated posts)
- Integration with Supabase
"""

from fastapi import APIRouter
from main import app, supabase
from datetime import datetime

# --- Community Router ---
community_router = APIRouter(prefix="/community", tags=["Community"])

@community_router.post("/post")
def create_post(user_id: str, title: str, content: str, location: str = None):
    response = supabase.table("community_posts").insert({
        "user_id": user_id,
        "title": title,
        "content": content,
        "location": location,
        "created_at": datetime.utcnow().isoformat()
    }).execute()
    return {"status": "post_created", "post": response.data}

@community_router.get("/feed")
def get_feed(limit: int = 10):
    posts = supabase.table("community_posts").select("*").order("created_at", desc=True).limit(limit).execute()
    return {"feed": posts.data}

@community_router.get("/user/{user_id}")
def get_user_posts(user_id: str):
    posts = supabase.table("community_posts").select("*").eq("user_id", user_id).execute()
    return {"posts": posts.data}

# --- Register Router ---
app.include_router(community_router)

# --- Supabase Schema (SQL) ---
"""
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read posts" ON community_posts FOR SELECT USING (true);
CREATE POLICY "Users can insert own posts" ON community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own posts" ON community_posts FOR SELECT USING (auth.uid() = user_id);
"""