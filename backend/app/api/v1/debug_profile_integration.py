"""
Debug Profile Integration Endpoint
Comprehensive diagnostics for PAM profile integration issues
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
import logging
from datetime import datetime

from app.core.database import get_user_context_supabase_client, get_supabase
from app.services.pam.tools.load_user_profile import LoadUserProfileTool
from app.services.pam.simple_gemini_service import get_simple_gemini_service
from app.api.deps import verify_supabase_jwt_flexible
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Request

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/test-unimog-profile")
async def test_unimog_profile():
    """
    Test if Unimog U1700 profile data can be accessed correctly
    This tests the exact vehicle configuration the user has
    """
    try:
        logger.info("🚐 Testing Unimog U1700 profile access...")

        # Simulate the user's vehicle data structure
        mock_profile_data = {
            "success": True,
            "data": {
                "profile_exists": True,
                "vehicle_info": {
                    "type": "Unimog RV",  # Enhanced type as processed by _extract_vehicle_info
                    "original_type": "4 X 4",
                    "make_model_year": "Unimog U1700",
                    "fuel_type": "Diesel"
                },
                "personal_details": {
                    "full_name": "Test User",
                    "region": "Australia"
                }
            }
        }

        # Test profile query detection
        simple_service = await get_simple_gemini_service()
        test_message = "what vehicle do i drive"
        is_profile_query = simple_service._is_profile_query(test_message)

        # Test prompt building with the mock data
        enhanced_prompt = simple_service._build_prompt(test_message, {}, mock_profile_data)

        # Test response generation
        if simple_service.is_initialized:
            response = await simple_service.generate_response(test_message, {}, "mock_user_id", "mock_jwt")
        else:
            response = "Simple Gemini Service not initialized"

        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "test_results": {
                "vehicle_data": mock_profile_data["data"]["vehicle_info"],
                "profile_query_detected": is_profile_query,
                "enhanced_prompt_length": len(enhanced_prompt),
                "prompt_contains_unimog": "Unimog" in enhanced_prompt,
                "prompt_contains_vehicle": "Vehicle:" in enhanced_prompt,
                "response_preview": response[:200] + "..." if len(response) > 200 else response,
                "service_initialized": simple_service.is_initialized
            }
        }

    except Exception as e:
        logger.error(f"❌ Unimog profile test failed: {e}")
        return {
            "status": "error",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }

@router.post("/profile-integration-debug")
async def debug_profile_integration(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
):
    """
    Comprehensive debug endpoint for PAM profile integration
    Tests every step of the profile loading pipeline
    """
    try:
        # Step 1: Validate JWT token
        logger.info("🔍 DEBUG STEP 1: Validating JWT token...")

        try:
            payload = await verify_supabase_jwt_flexible(request, credentials)
            if not payload:
                return {
                    "status": "error",
                    "step": "jwt_validation",
                    "error": "Invalid JWT token",
                    "timestamp": datetime.utcnow().isoformat()
                }

            token_user_id = payload.get('sub')
            token_role = payload.get('role', 'authenticated')

            logger.info(f"✅ JWT validated: user_id={token_user_id}, role={token_role}")

        except Exception as jwt_error:
            return {
                "status": "error",
                "step": "jwt_validation",
                "error": str(jwt_error),
                "timestamp": datetime.utcnow().isoformat()
            }

        # Step 2: Test profile query detection
        logger.info("🔍 DEBUG STEP 2: Testing profile query detection...")

        test_message = "what vehicle do i drive"
        simple_service = await get_simple_gemini_service()

        if not simple_service.is_initialized:
            return {
                "status": "error",
                "step": "service_initialization",
                "error": "Simple Gemini Service not initialized",
                "timestamp": datetime.utcnow().isoformat()
            }

        is_profile_query = simple_service._is_profile_query(test_message)
        logger.info(f"✅ Profile query detection: '{test_message}' -> {is_profile_query}")

        # Step 3: Test direct profile loading
        logger.info("🔍 DEBUG STEP 3: Testing direct profile loading...")

        try:
            profile_tool = LoadUserProfileTool(user_jwt=credentials.credentials)
            profile_result = await profile_tool.execute(token_user_id)

            logger.info(f"✅ Profile tool result: {profile_result}")

        except Exception as profile_error:
            logger.error(f"❌ Profile loading failed: {profile_error}")
            profile_result = {"success": False, "error": str(profile_error)}

        # Step 4: Test database access directly
        logger.info("🔍 DEBUG STEP 4: Testing database access...")

        try:
            # Test service role client
            service_client = get_supabase()
            service_profile = service_client.table("profiles").select("user_id, vehicle_type, make_model_year, fuel_type").eq("user_id", token_user_id).execute()

            logger.info(f"✅ Service role query result: {service_profile.data}")

        except Exception as db_error:
            logger.error(f"❌ Database access failed: {db_error}")
            service_profile = {"data": None, "error": str(db_error)}

        # Step 5: Test user context client
        logger.info("🔍 DEBUG STEP 5: Testing user context client...")

        try:
            user_client = get_user_context_supabase_client(credentials.credentials)
            user_profile = user_client.table("profiles").select("user_id, vehicle_type, make_model_year, fuel_type").eq("user_id", token_user_id).execute()

            logger.info(f"✅ User context query result: {user_profile.data}")

        except Exception as user_error:
            logger.error(f"❌ User context access failed: {user_error}")
            user_profile = {"data": None, "error": str(user_error)}

        # Step 6: Test full Simple Gemini Service flow
        logger.info("🔍 DEBUG STEP 6: Testing full Simple Gemini Service flow...")

        try:
            full_response = await simple_service.generate_response(
                message=test_message,
                context={},
                user_id=token_user_id,
                user_jwt=credentials.credentials
            )

            logger.info(f"✅ Full service response: {full_response[:200]}...")

        except Exception as service_error:
            logger.error(f"❌ Full service failed: {service_error}")
            full_response = f"Error: {service_error}"

        # Return comprehensive debug results
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "debug_results": {
                "step1_jwt_validation": {
                    "success": True,
                    "token_user_id": token_user_id,
                    "token_role": token_role
                },
                "step2_profile_query_detection": {
                    "test_message": test_message,
                    "is_profile_query": is_profile_query,
                    "service_initialized": simple_service.is_initialized
                },
                "step3_profile_tool": {
                    "result": profile_result
                },
                "step4_service_role_db": {
                    "result": service_profile.data if hasattr(service_profile, 'data') else service_profile
                },
                "step5_user_context_db": {
                    "result": user_profile.data if hasattr(user_profile, 'data') else user_profile
                },
                "step6_full_service": {
                    "response": full_response[:500] + "..." if len(full_response) > 500 else full_response
                }
            }
        }

    except Exception as e:
        logger.error(f"❌ Debug endpoint failed: {e}")
        return {
            "status": "error",
            "step": "general_error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }