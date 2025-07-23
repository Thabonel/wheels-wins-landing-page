from fastapi import APIRouter, HTTPException

from agents.pam.onboarding import handle_onboarding

router = APIRouter()

@router.post("/onboarding")
async def submit_onboarding(payload: dict):
    """Accept onboarding data from the frontend and store it via PAM."""
    result = handle_onboarding(payload)
    if result.startswith("Error"):
        raise HTTPException(status_code=400, detail=result)
    return {"message": result}
