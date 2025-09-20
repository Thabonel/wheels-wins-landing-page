"""
Debug Profile Access Endpoint
Temporary endpoint to debug profile integration issues
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Any
import logging
from app.core.auth import verify_jwt_token, get_jwt_from_request
from app.services.pam.tools.load_user_profile import LoadUserProfileTool

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/debug/profile/{user_id}")
async def debug_profile_access(
    user_id: str,
    request: Request,
    token_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Debug endpoint to test profile access for PAM integration
    Shows exactly what profile data is available and why profile integration might fail
    """
    try:
        logger.info(f"🔍 DEBUG ENDPOINT: Testing profile access for user: {user_id}")
        logger.info(f"🔍 DEBUG ENDPOINT: Token data: {token_data}")

        # Extract raw JWT token from request
        jwt_token = await get_jwt_from_request(request)
        logger.info(f"🔍 DEBUG ENDPOINT: JWT token length: {len(jwt_token) if jwt_token else 'None'}")

        # Test profile tool access
        profile_tool = LoadUserProfileTool(user_jwt=jwt_token)
        profile_result = await profile_tool.execute(user_id)

        logger.info(f"🔍 DEBUG ENDPOINT: Profile result: {profile_result}")

        # Also test simple profile query detection
        test_messages = [
            "what vehicle am i driving",
            "hi there",
            "my car details"
        ]

        # Import simple gemini service to test profile query detection
        from app.services.pam.simple_gemini_service import SimpleGeminiService
        gemini_service = SimpleGeminiService()

        query_detection_results = {}
        for msg in test_messages:
            is_profile_query = gemini_service._is_profile_query(msg)
            query_detection_results[msg] = is_profile_query
            logger.info(f"🔍 DEBUG ENDPOINT: Message '{msg}' -> Profile query: {is_profile_query}")

        return {
            "success": True,
            "user_id": user_id,
            "token_valid": bool(token_data),
            "token_user_id": token_data.get("sub") if token_data else None,
            "jwt_token_available": bool(jwt_token),
            "profile_result": profile_result,
            "query_detection_test": query_detection_results,
            "debug_info": {
                "message": "Profile access test completed",
                "timestamp": "2025-09-20T07:40:00Z"
            }
        }

    except Exception as e:
        logger.error(f"❌ DEBUG ENDPOINT: Profile access failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "user_id": user_id,
            "debug_info": {
                "message": "Profile access test failed",
                "timestamp": "2025-09-20T07:40:00Z"
            }
        }