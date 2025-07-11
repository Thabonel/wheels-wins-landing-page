from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime

from app.services.database import get_database_service

router = APIRouter()

class TicketCreate(BaseModel):
    user_id: str
    subject: str
    message: str

class TicketStatusUpdate(BaseModel):
    status: str

@router.post("/support/tickets")
async def create_ticket(ticket: TicketCreate):
    """Create a new support ticket"""
    db_service = get_database_service()
    supabase = db_service.get_client()

    try:
        result = supabase.table("support_tickets").insert({
            "user_id": ticket.user_id,
            "subject": ticket.subject,
            "message": ticket.message,
            "status": "open",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }).execute()
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create ticket")
        return {"id": result.data[0]["id"], "status": "open"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/support/tickets")
async def list_tickets(status: str = "open"):
    """List tickets filtered by status"""
    db_service = get_database_service()
    supabase = db_service.get_client()

    try:
        query = supabase.table("support_tickets").select("*").order("created_at", desc=True)
        if status:
            query = query.eq("status", status)
        result = query.execute()
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/support/tickets/{ticket_id}")
async def update_ticket_status(ticket_id: str, update: TicketStatusUpdate):
    """Update ticket status"""
    db_service = get_database_service()
    supabase = db_service.get_client()

    try:
        result = supabase.table("support_tickets").update({
            "status": update.status,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", ticket_id).execute()
        if result.error:
            raise HTTPException(status_code=400, detail="Failed to update ticket")
        return {"id": ticket_id, "status": update.status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
