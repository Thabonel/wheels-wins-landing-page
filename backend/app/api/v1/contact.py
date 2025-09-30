"""
Contact Form API Endpoints
Handles contact form submissions and admin message management
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.core.supabase import get_supabase_client
from app.core.auth import get_current_user, get_admin_user

router = APIRouter(prefix="/contact", tags=["contact"])


class ContactSubmission(BaseModel):
    """Contact form submission model"""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=10, max_length=5000)
    category: str = Field(default="general", pattern="^(general|support|business|technical|feedback)$")


class ContactMessage(BaseModel):
    """Contact message response model"""
    id: str
    name: str
    email: str
    subject: str
    message: str
    status: str
    priority: str
    category: str
    user_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    read_at: Optional[datetime]
    replied_at: Optional[datetime]


class MessageUpdate(BaseModel):
    """Update contact message"""
    status: Optional[str] = Field(None, pattern="^(unread|read|replied|archived)$")
    priority: Optional[str] = Field(None, pattern="^(low|normal|high|urgent)$")


class ContactStats(BaseModel):
    """Contact message statistics"""
    total: int
    unread: int
    read: int
    replied: int
    archived: int
    by_category: dict
    by_priority: dict


@router.post("/submit", status_code=status.HTTP_201_CREATED)
async def submit_contact_form(
    submission: ContactSubmission,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Submit a contact form message.
    Anyone can submit (authenticated or anonymous).
    """
    supabase = get_supabase_client()

    # Prepare data
    data = {
        "name": submission.name,
        "email": submission.email,
        "subject": submission.subject,
        "message": submission.message,
        "category": submission.category,
        "status": "unread",
        "priority": "normal"
    }

    # Add user_id if authenticated
    if current_user:
        data["user_id"] = current_user.get("id")

    try:
        # Insert message
        response = supabase.table("contact_messages").insert(data).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to submit contact form"
            )

        return {
            "success": True,
            "message": "Your message has been submitted successfully. We'll get back to you soon!",
            "id": response.data[0]["id"]
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error submitting contact form: {str(e)}"
        )


@router.get("/messages", response_model=List[ContactMessage])
async def get_messages(
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get contact messages (admin only).
    Supports filtering by status, category, and priority.
    """
    supabase = get_supabase_client()

    try:
        query = supabase.table("contact_messages").select("*")

        # Apply filters
        if status_filter:
            query = query.eq("status", status_filter)
        if category:
            query = query.eq("category", category)
        if priority:
            query = query.eq("priority", priority)

        # Order by creation date (newest first)
        query = query.order("created_at", desc=True)

        # Pagination
        query = query.range(offset, offset + limit - 1)

        response = query.execute()

        return response.data or []

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching messages: {str(e)}"
        )


@router.get("/messages/{message_id}", response_model=ContactMessage)
async def get_message(
    message_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get a specific contact message (admin only).
    Automatically marks as read.
    """
    supabase = get_supabase_client()

    try:
        # Fetch message
        response = supabase.table("contact_messages")\
            .select("*")\
            .eq("id", message_id)\
            .single()\
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )

        message = response.data

        # Mark as read if unread
        if message["status"] == "unread":
            supabase.table("contact_messages")\
                .update({"status": "read", "read_at": datetime.utcnow().isoformat()})\
                .eq("id", message_id)\
                .execute()
            message["status"] = "read"
            message["read_at"] = datetime.utcnow().isoformat()

        return message

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching message: {str(e)}"
        )


@router.patch("/messages/{message_id}")
async def update_message(
    message_id: str,
    update: MessageUpdate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Update a contact message (admin only).
    Update status or priority.
    """
    supabase = get_supabase_client()

    try:
        # Build update data
        data = {}
        if update.status:
            data["status"] = update.status
            if update.status == "read" and "read_at" not in data:
                data["read_at"] = datetime.utcnow().isoformat()
            elif update.status == "replied":
                data["replied_at"] = datetime.utcnow().isoformat()

        if update.priority:
            data["priority"] = update.priority

        if not data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        # Update message
        response = supabase.table("contact_messages")\
            .update(data)\
            .eq("id", message_id)\
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )

        return {
            "success": True,
            "message": "Message updated successfully",
            "data": response.data[0]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating message: {str(e)}"
        )


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Delete a contact message (admin only).
    """
    supabase = get_supabase_client()

    try:
        response = supabase.table("contact_messages")\
            .delete()\
            .eq("id", message_id)\
            .execute()

        return {
            "success": True,
            "message": "Message deleted successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting message: {str(e)}"
        )


@router.get("/stats", response_model=ContactStats)
async def get_stats(admin_user: dict = Depends(get_admin_user)):
    """
    Get contact message statistics (admin only).
    """
    supabase = get_supabase_client()

    try:
        # Get all messages
        response = supabase.table("contact_messages")\
            .select("status, category, priority")\
            .execute()

        messages = response.data or []

        # Calculate stats
        total = len(messages)
        unread = sum(1 for m in messages if m["status"] == "unread")
        read = sum(1 for m in messages if m["status"] == "read")
        replied = sum(1 for m in messages if m["status"] == "replied")
        archived = sum(1 for m in messages if m["status"] == "archived")

        # By category
        by_category = {}
        for msg in messages:
            cat = msg["category"]
            by_category[cat] = by_category.get(cat, 0) + 1

        # By priority
        by_priority = {}
        for msg in messages:
            pri = msg["priority"]
            by_priority[pri] = by_priority.get(pri, 0) + 1

        return {
            "total": total,
            "unread": unread,
            "read": read,
            "replied": replied,
            "archived": archived,
            "by_category": by_category,
            "by_priority": by_priority
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching stats: {str(e)}"
        )