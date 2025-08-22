"""
Bank Statement Processing API
Secure, privacy-focused bank statement parsing and anonymization
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, delete

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.auth import get_current_user
from app.services.database import get_db_session
from app.services.bank_statement.pdf_parser import PDFStatementParser
from app.services.bank_statement.anonymizer import ServerSideAnonymizer
from app.models.bank_processing import (
    BankProcessingSession,
    AnonymizedTransaction,
    DataRetentionPolicy,
    BankProcessingAuditLog
)

logger = get_logger(__name__)
settings = get_settings()
security = HTTPBearer()

router = APIRouter(prefix="/bank-statements", tags=["bank-statements"])

# Maximum file sizes (in bytes)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'pdf', 'csv', 'xls', 'xlsx'}

@router.post("/parse-pdf")
async def parse_pdf_statement(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Parse PDF bank statement with server-side processing
    Requires authentication and follows strict privacy guidelines
    """
    try:
        # Log the request
        await log_audit_action(
            db=db,
            user_id=current_user.id,
            session_id=session_id,
            action="upload",
            ip_address="0.0.0.0",  # Would get from request
            metadata={"file_name": file.filename, "file_size": file.size}
        )
        
        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="No file provided"
            )
        
        file_extension = file.filename.split('.')[-1].lower()
        if file_extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        if file.size and file.size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // 1024 // 1024}MB"
            )
        
        # Verify session belongs to user
        session_query = select(BankProcessingSession).where(
            BankProcessingSession.id == session_id,
            BankProcessingSession.user_id == current_user.id
        )
        session_result = await db.execute(session_query)
        session_record = session_result.scalar_one_or_none()
        
        if not session_record:
            raise HTTPException(
                status_code=404,
                detail="Session not found"
            )
        
        # Update session status
        await db.execute(
            update(BankProcessingSession)
            .where(BankProcessingSession.id == session_id)
            .values(processing_status="processing")
        )
        await db.commit()
        
        # Read file content
        file_content = await file.read()
        
        # Parse PDF
        pdf_parser = PDFStatementParser()
        raw_transactions = await pdf_parser.parse_pdf_bytes(file_content)
        
        # Anonymize transactions
        anonymizer = ServerSideAnonymizer()
        anonymized_result = await anonymizer.anonymize_transactions(raw_transactions)
        
        # Log processing completion
        await log_audit_action(
            db=db,
            user_id=current_user.id,
            session_id=session_id,
            action="process",
            metadata={
                "transactions_found": len(anonymized_result["transactions"]),
                "redacted_fields": anonymized_result["redacted_fields"]
            }
        )
        
        # Update session
        await db.execute(
            update(BankProcessingSession)
            .where(BankProcessingSession.id == session_id)
            .values(
                processing_status="completed",
                processed_at=datetime.utcnow(),
                transaction_count=len(anonymized_result["transactions"])
            )
        )
        await db.commit()
        
        return {
            "success": True,
            "transactions": anonymized_result["transactions"],
            "redacted_fields": anonymized_result["redacted_fields"],
            "processing_time_ms": anonymized_result.get("processing_time_ms", 0)
        }
        
    except Exception as e:
        logger.error(f"PDF parsing failed for user {current_user.id}: {str(e)}")
        
        # Update session with error
        if 'session_id' in locals():
            await db.execute(
                update(BankProcessingSession)
                .where(BankProcessingSession.id == session_id)
                .values(
                    processing_status="failed",
                    error_message=str(e)
                )
            )
            await db.commit()
        
        raise HTTPException(
            status_code=500,
            detail="Failed to process PDF statement"
        )

@router.post("/sessions")
async def create_processing_session(
    file_name: str,
    file_size: int,
    file_type: str,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Create a new bank statement processing session"""
    try:
        # Get user's retention policy
        retention_query = select(DataRetentionPolicy).where(
            DataRetentionPolicy.user_id == current_user.id
        )
        retention_result = await db.execute(retention_query)
        retention_policy = retention_result.scalar_one_or_none()
        
        # Use default retention if not set
        retention_days = retention_policy.retention_days if retention_policy else 30
        auto_delete_at = datetime.utcnow() + timedelta(days=retention_days)
        
        # Create session
        session_id = str(uuid.uuid4())
        session_data = {
            "id": session_id,
            "user_id": current_user.id,
            "file_name": file_name,
            "file_size_bytes": file_size,
            "file_type": file_type.lower(),
            "processing_status": "pending",
            "auto_delete_at": auto_delete_at,
            "created_at": datetime.utcnow()
        }
        
        await db.execute(insert(BankProcessingSession).values(**session_data))
        await db.commit()
        
        return {
            "session_id": session_id,
            "auto_delete_at": auto_delete_at.isoformat(),
            "retention_days": retention_days
        }
        
    except Exception as e:
        logger.error(f"Failed to create session for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to create processing session"
        )

@router.get("/sessions/{session_id}")
async def get_session_status(
    session_id: str,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Get the status of a processing session"""
    try:
        session_query = select(BankProcessingSession).where(
            BankProcessingSession.id == session_id,
            BankProcessingSession.user_id == current_user.id
        )
        session_result = await db.execute(session_query)
        session_record = session_result.scalar_one_or_none()
        
        if not session_record:
            raise HTTPException(
                status_code=404,
                detail="Session not found"
            )
        
        return {
            "id": session_record.id,
            "file_name": session_record.file_name,
            "status": session_record.processing_status,
            "transaction_count": session_record.transaction_count,
            "processed_at": session_record.processed_at,
            "error_message": session_record.error_message,
            "auto_delete_at": session_record.auto_delete_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve session"
        )

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Delete a processing session and all associated data"""
    try:
        # Verify ownership
        session_query = select(BankProcessingSession).where(
            BankProcessingSession.id == session_id,
            BankProcessingSession.user_id == current_user.id
        )
        session_result = await db.execute(session_query)
        session_record = session_result.scalar_one_or_none()
        
        if not session_record:
            raise HTTPException(
                status_code=404,
                detail="Session not found"
            )
        
        # Delete transactions first (foreign key constraint)
        await db.execute(
            delete(AnonymizedTransaction).where(
                AnonymizedTransaction.session_id == session_id
            )
        )
        
        # Mark session as deleted
        await db.execute(
            update(BankProcessingSession)
            .where(BankProcessingSession.id == session_id)
            .values(
                processing_status="deleted",
                deleted_at=datetime.utcnow()
            )
        )
        
        # Log deletion
        await log_audit_action(
            db=db,
            user_id=current_user.id,
            session_id=session_id,
            action="delete",
            metadata={"manual_deletion": True}
        )
        
        await db.commit()
        
        return {"success": True, "message": "Session deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete session"
        )

@router.get("/retention-policy")
async def get_retention_policy(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Get user's data retention policy"""
    try:
        policy_query = select(DataRetentionPolicy).where(
            DataRetentionPolicy.user_id == current_user.id
        )
        policy_result = await db.execute(policy_query)
        policy = policy_result.scalar_one_or_none()
        
        if not policy:
            # Create default policy
            default_policy = {
                "user_id": current_user.id,
                "retention_days": 30,
                "auto_delete_enabled": True,
                "delete_after_import": True,
                "anonymization_level": "high"
            }
            
            await db.execute(insert(DataRetentionPolicy).values(**default_policy))
            await db.commit()
            
            return default_policy
        
        return {
            "retention_days": policy.retention_days,
            "auto_delete_enabled": policy.auto_delete_enabled,
            "delete_after_import": policy.delete_after_import,
            "anonymization_level": policy.anonymization_level
        }
        
    except Exception as e:
        logger.error(f"Failed to get retention policy for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve retention policy"
        )

@router.put("/retention-policy")
async def update_retention_policy(
    retention_days: int,
    auto_delete_enabled: bool = True,
    delete_after_import: bool = True,
    anonymization_level: str = "high",
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Update user's data retention policy"""
    try:
        # Validate inputs
        if not 0 <= retention_days <= 365:
            raise HTTPException(
                status_code=400,
                detail="Retention days must be between 0 and 365"
            )
        
        if anonymization_level not in ["low", "medium", "high"]:
            raise HTTPException(
                status_code=400,
                detail="Anonymization level must be low, medium, or high"
            )
        
        # Update or create policy
        policy_data = {
            "retention_days": retention_days,
            "auto_delete_enabled": auto_delete_enabled,
            "delete_after_import": delete_after_import,
            "anonymization_level": anonymization_level,
            "updated_at": datetime.utcnow()
        }
        
        # Try to update existing policy
        update_result = await db.execute(
            update(DataRetentionPolicy)
            .where(DataRetentionPolicy.user_id == current_user.id)
            .values(**policy_data)
        )
        
        if update_result.rowcount == 0:
            # Create new policy
            policy_data["user_id"] = current_user.id
            await db.execute(insert(DataRetentionPolicy).values(**policy_data))
        
        await db.commit()
        
        return {"success": True, "message": "Retention policy updated"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update retention policy for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update retention policy"
        )

async def log_audit_action(
    db: AsyncSession,
    user_id: str,
    session_id: str,
    action: str,
    ip_address: str = "0.0.0.0",
    user_agent: str = None,
    metadata: Dict[str, Any] = None
):
    """Log an audit action for GDPR compliance"""
    try:
        audit_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_id": session_id,
            "action": action,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "metadata": metadata or {},
            "created_at": datetime.utcnow()
        }
        
        await db.execute(insert(BankProcessingAuditLog).values(**audit_data))
        
    except Exception as e:
        logger.error(f"Failed to log audit action: {str(e)}")
        # Don't raise exception as this is non-critical

# Background task to clean up expired sessions
@router.post("/cleanup-expired")
async def cleanup_expired_sessions(
    db: AsyncSession = Depends(get_db_session)
):
    """
    Background task to clean up expired sessions
    This would typically be called by a scheduled job
    """
    try:
        # Find expired sessions
        expired_query = select(BankProcessingSession).where(
            BankProcessingSession.auto_delete_at < datetime.utcnow(),
            BankProcessingSession.deleted_at.is_(None),
            BankProcessingSession.processing_status != "deleted"
        )
        
        expired_result = await db.execute(expired_query)
        expired_sessions = expired_result.scalars().all()
        
        cleanup_count = 0
        for session in expired_sessions:
            # Delete associated transactions
            await db.execute(
                delete(AnonymizedTransaction).where(
                    AnonymizedTransaction.session_id == session.id
                )
            )
            
            # Mark session as deleted
            await db.execute(
                update(BankProcessingSession)
                .where(BankProcessingSession.id == session.id)
                .values(
                    processing_status="deleted",
                    deleted_at=datetime.utcnow()
                )
            )
            
            # Log auto-deletion
            await log_audit_action(
                db=db,
                user_id=session.user_id,
                session_id=session.id,
                action="auto_delete",
                metadata={"reason": "expired"}
            )
            
            cleanup_count += 1
        
        await db.commit()
        
        logger.info(f"Cleaned up {cleanup_count} expired sessions")
        return {"cleaned_up": cleanup_count}
        
    except Exception as e:
        logger.error(f"Failed to cleanup expired sessions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to cleanup expired sessions"
        )