"""
Enhanced Authentication API Module
Includes MFA, session management, and compatibility layer
"""

from fastapi import APIRouter
from . import mfa, sessions

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Include sub-routers
router.include_router(mfa.router)
router.include_router(sessions.router)