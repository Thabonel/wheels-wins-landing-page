"""
Community Knowledge Center API Routes
Endpoints for browsing, submitting, and managing community knowledge articles
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID

from app.core.database import get_supabase_client
from app.core.auth import get_current_user, require_admin
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/knowledge", tags=["knowledge"])


# Pydantic Models
class ArticleSubmission(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    content: str = Field(..., min_length=100)
    excerpt: Optional[str] = Field(None, max_length=500)
    category: str = Field(..., pattern="^(shipping|maintenance|travel_tips|camping|routes|general)$")
    tags: List[str] = Field(default_factory=list, max_items=10)
    difficulty_level: Optional[str] = Field(None, pattern="^(beginner|intermediate|advanced)$")
    estimated_read_time: Optional[int] = Field(None, ge=1, le=120)


class ArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    content: Optional[str] = Field(None, min_length=100)
    excerpt: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = Field(None, max_items=10)
    difficulty_level: Optional[str] = Field(None, pattern="^(beginner|intermediate|advanced)$")
    estimated_read_time: Optional[int] = Field(None, ge=1, le=120)


class FeedbackSubmission(BaseModel):
    is_helpful: bool
    comment: Optional[str] = Field(None, max_length=1000)


class ApprovalAction(BaseModel):
    rejection_reason: Optional[str] = None


# PUBLIC ENDPOINTS

@router.get("")
async def list_articles(
    category: Optional[str] = Query(None, pattern="^(shipping|maintenance|travel_tips|camping|routes|general)$"),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    search: Optional[str] = Query(None, description="Search in title and excerpt"),
    difficulty: Optional[str] = Query(None, pattern="^(beginner|intermediate|advanced)$"),
    sort_by: str = Query("created_at", pattern="^(created_at|views|helpful_count|title)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    List approved community knowledge articles with filters
    Public endpoint - no authentication required
    """
    try:
        supabase = get_supabase_client()

        # Base query - only approved articles
        query = supabase.table("community_knowledge").select("*").eq("status", "approved")

        # Apply filters
        if category:
            query = query.eq("category", category)

        if difficulty:
            query = query.eq("difficulty_level", difficulty)

        if tags:
            tag_list = [tag.strip() for tag in tags.split(",")]
            query = query.contains("tags", tag_list)

        if search:
            # Search in title and excerpt
            query = query.or_(f"title.ilike.%{search}%,excerpt.ilike.%{search}%")

        # Apply sorting
        query = query.order(sort_by, desc=(order == "desc"))

        # Apply pagination
        query = query.range(offset, offset + limit - 1)

        response = query.execute()

        return {
            "articles": response.data,
            "count": len(response.data),
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        logger.error(f"Error listing knowledge articles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{article_id}")
async def get_article(article_id: UUID):
    """
    Get single article by ID and increment view count
    Public endpoint - no authentication required
    """
    try:
        supabase = get_supabase_client()

        # Get article (must be approved for public access)
        response = supabase.table("community_knowledge").select("*").eq("id", str(article_id)).eq("status", "approved").single().execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Article not found")

        # Increment view count
        supabase.table("community_knowledge").update({"views": response.data["views"] + 1}).eq("id", str(article_id)).execute()

        return response.data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting article {article_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{article_id}/feedback")
async def submit_feedback(
    article_id: UUID,
    feedback: FeedbackSubmission,
    current_user = Depends(get_current_user)
):
    """
    Submit helpful/not helpful feedback on an article
    Requires authentication
    """
    try:
        supabase = get_supabase_client()

        # Check if article exists and is approved
        article = supabase.table("community_knowledge").select("id").eq("id", str(article_id)).eq("status", "approved").single().execute()

        if not article.data:
            raise HTTPException(status_code=404, detail="Article not found")

        # Upsert feedback (will update if already exists)
        feedback_data = {
            "article_id": str(article_id),
            "user_id": current_user["id"],
            "is_helpful": feedback.is_helpful,
            "comment": feedback.comment
        }

        response = supabase.table("community_knowledge_feedback").upsert(feedback_data).execute()

        return {"success": True, "message": "Feedback submitted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# AUTHENTICATED USER ENDPOINTS

@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_article(
    article: ArticleSubmission,
    current_user = Depends(get_current_user)
):
    """
    Submit new article for admin approval
    Requires authentication
    """
    try:
        supabase = get_supabase_client()

        article_data = {
            **article.dict(),
            "author_id": current_user["id"],
            "status": "pending"
        }

        response = supabase.table("community_knowledge").insert(article_data).execute()

        logger.info(f"User {current_user['id']} submitted article: {article.title}")

        return {
            "success": True,
            "article": response.data[0],
            "message": "Article submitted for review. You'll be notified when it's approved."
        }

    except Exception as e:
        logger.error(f"Error submitting article: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my/submissions")
async def get_my_submissions(
    current_user = Depends(get_current_user)
):
    """
    Get current user's submitted articles (all statuses)
    Requires authentication
    """
    try:
        supabase = get_supabase_client()

        response = supabase.table("community_knowledge").select("*").eq("author_id", current_user["id"]).order("created_at", desc=True).execute()

        return {"articles": response.data}

    except Exception as e:
        logger.error(f"Error getting user submissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{article_id}")
async def update_article(
    article_id: UUID,
    updates: ArticleUpdate,
    current_user = Depends(get_current_user)
):
    """
    Update own pending article
    Requires authentication
    """
    try:
        supabase = get_supabase_client()

        # Verify ownership and status
        article = supabase.table("community_knowledge").select("*").eq("id", str(article_id)).single().execute()

        if not article.data:
            raise HTTPException(status_code=404, detail="Article not found")

        if article.data["author_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to update this article")

        if article.data["status"] != "pending":
            raise HTTPException(status_code=400, detail="Can only update pending articles")

        # Update article
        update_data = {k: v for k, v in updates.dict().items() if v is not None}
        response = supabase.table("community_knowledge").update(update_data).eq("id", str(article_id)).execute()

        return {"success": True, "article": response.data[0]}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating article: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{article_id}")
async def delete_article(
    article_id: UUID,
    current_user = Depends(get_current_user)
):
    """
    Delete own pending article
    Requires authentication
    """
    try:
        supabase = get_supabase_client()

        # Verify ownership and status
        article = supabase.table("community_knowledge").select("*").eq("id", str(article_id)).single().execute()

        if not article.data:
            raise HTTPException(status_code=404, detail="Article not found")

        if article.data["author_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to delete this article")

        if article.data["status"] != "pending":
            raise HTTPException(status_code=400, detail="Can only delete pending articles")

        # Delete article
        supabase.table("community_knowledge").delete().eq("id", str(article_id)).execute()

        return {"success": True, "message": "Article deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting article: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ADMIN ENDPOINTS

@router.get("/admin/pending")
async def get_pending_articles(
    current_user = Depends(require_admin)
):
    """
    List pending articles for admin review
    Requires admin authentication
    """
    try:
        supabase = get_supabase_client()

        response = supabase.table("community_knowledge").select("*").eq("status", "pending").order("created_at", desc=False).execute()

        return {"articles": response.data}

    except Exception as e:
        logger.error(f"Error getting pending articles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{article_id}/approve")
async def approve_article(
    article_id: UUID,
    current_user = Depends(require_admin)
):
    """
    Approve pending article
    Requires admin authentication
    """
    try:
        supabase = get_supabase_client()

        # Get admin user ID
        admin = supabase.table("admin_users").select("id").eq("user_id", current_user["id"]).single().execute()

        update_data = {
            "status": "approved",
            "approved_by": admin.data["id"],
            "approved_at": datetime.utcnow().isoformat()
        }

        response = supabase.table("community_knowledge").update(update_data).eq("id", str(article_id)).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Article not found")

        logger.info(f"Admin {current_user['id']} approved article {article_id}")

        return {"success": True, "article": response.data[0]}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving article: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{article_id}/reject")
async def reject_article(
    article_id: UUID,
    action: ApprovalAction,
    current_user = Depends(require_admin)
):
    """
    Reject pending article with optional reason
    Requires admin authentication
    """
    try:
        supabase = get_supabase_client()

        update_data = {
            "status": "rejected",
            "rejection_reason": action.rejection_reason
        }

        response = supabase.table("community_knowledge").update(update_data).eq("id", str(article_id)).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Article not found")

        logger.info(f"Admin {current_user['id']} rejected article {article_id}")

        return {"success": True, "article": response.data[0]}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting article: {e}")
        raise HTTPException(status_code=500, detail=str(e))
