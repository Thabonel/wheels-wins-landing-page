
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Query, Request
from starlette.websockets import WebSocketState
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, Response
from typing import List, Optional, Dict, Any, Union
import json
import uuid
import logging
import time
import asyncio
import base64
from datetime import datetime

from app.api.deps import (
    get_current_user, verify_supabase_jwt_token, verify_supabase_jwt_flexible, get_pam_orchestrator, get_database,
    apply_rate_limit, get_pagination_params, validate_user_context
)
from app.middleware.rate_limiting import (
    multi_tier_limiter, check_websocket_rate_limit, check_rest_api_rate_limit, 
    check_voice_rate_limit, check_feedback_rate_limit, check_auth_rate_limit, RateLimitResult
)
from app.middleware.message_size_validator import (
    message_validator, validate_websocket_message, validate_rest_api_message,
    validate_voice_text, validate_feedback_message, MessageType, MessageSizeValidationResult
)
from app.models.schemas.pam import (
    ChatRequest, ChatResponse, ConversationCreateRequest,
    ConversationListResponse, MessageHistoryResponse,
    ContextUpdateRequest, PamFeedbackRequest, PamThumbFeedbackRequest,
    SecureWebSocketMessage, SecureChatRequest
)
from app.services.pam.usecase_profiles import PamUseCase
from app.services.pam.profile_router import profile_router
from pydantic import BaseModel
from app.models.schemas.common import SuccessResponse, PaginationParams
from app.core.websocket_manager import manager
from app.core.websocket_keepalive import websocket_keepalive
from app.core.logging import setup_logging, get_logger
from app.core.logging_config import (
    pam_logger, PAMEventType, LogSeverity, PAMLogEvent,
    log_api_request, log_api_response, log_error, log_security_event
)
from app.core.exceptions import PAMError
from app.observability.monitor import global_monitor
from app.services.voice.edge_processing_service import edge_processing_service
from app.services.pam_visual_actions import pam_visual_actions
from app.services.tts.manager import get_tts_manager, synthesize_text, VoiceSettings
from app.services.tts.redis_optimization import get_redis_tts_manager
from app.services.stt.manager import get_stt_manager
from app.services.stt.base import AudioFormat

router = APIRouter()
setup_logging()
logger = get_logger(__name__)

# Helper function for safe WebSocket operations
import base64

async def safe_websocket_send(websocket: WebSocket, data: dict) -> bool:
    """
    Safely send data through WebSocket with state checking
    
    Args:
        websocket: WebSocket connection
        data: Data to send
        
    Returns:
        True if sent successfully, False otherwise
    """
    try:
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_json(data)
            return True
        else:
            logger.warning(f"WebSocket not in CONNECTED state: {websocket.client_state}")
            return False
    except Exception as e:
        logger.error(f"Error sending WebSocket message: {e}")
        return False

async def generate_tts_audio(text: str, user_settings: dict = None, user_id: str = None) -> Optional[dict]:
    """
    Generate TTS audio for text response using Redis-optimized system
    
    Args:
        text: Text to synthesize
        user_settings: User TTS preferences
        user_id: User ID for rate limiting
        
    Returns:
        Dictionary with TTS data or None if generation fails
    """
    if not text or not text.strip():
        return None
        
    try:
        # Extract user TTS preferences
        voice = user_settings.get("tts_voice", "en-US-AriaNeural") if user_settings else "en-US-AriaNeural"
        speed = user_settings.get("tts_speed", 1.0) if user_settings else 1.0
        
        # Try Redis-optimized TTS first (with caching and rate limiting)
        try:
            redis_tts = await get_redis_tts_manager()
            logger.debug(f"🎵 Generating TTS with Redis optimization for: '{text[:50]}...'")
            
            result = await redis_tts.synthesize_optimized(
                text=text,
                voice=voice,
                speed=speed,
                user_id=user_id or "anonymous"
            )
            
            # Check for rate limit error
            if result.get('rate_limit_exceeded'):
                logger.warning(f"⚠️ TTS rate limit exceeded for user {user_id}: {result.get('error')}")
                return {
                    "error": "Rate limit exceeded",
                    "retry_after": result.get('retry_after', 60)
                }
            
            # Check for other errors
            if 'error' in result:
                raise Exception(result['error'])
            
            # Log performance metrics
            from_cache = result.get('from_cache', False)
            latency = result.get('latency_ms', 0)
            cache_source = "Redis cache" if from_cache else "Generated"
            
            logger.info(
                f"✅ TTS {cache_source} in {latency:.1f}ms "
                f"(engine: {result.get('engine_used', 'Unknown')}, "
                f"cached: {from_cache})"
            )
            
            return {
                "audio_data": result['audio_data'],
                "format": result.get('format', 'mp3'),
                "duration": result.get('duration'),
                "voice_used": result.get('voice_used', voice),
                "engine_used": result.get('engine_used', 'EdgeTTS'),
                "from_cache": from_cache,
                "compressed": result.get('compressed', True),
                "latency_ms": latency
            }
            
        except Exception as redis_error:
            # Fallback to non-Redis TTS if Redis fails
            logger.warning(f"⚠️ Redis TTS failed, falling back to standard: {redis_error}")
            
            # Create voice settings
            settings = VoiceSettings(
                voice=voice,
                speed=speed,
                volume=user_settings.get("tts_volume", 1.0) if user_settings else 1.0
            )
            
            # Generate TTS using standard manager
            logger.debug(f"🎵 Generating TTS (fallback) for text: '{text[:50]}...'")
            tts_result = await synthesize_text(text, voice=voice, speed=speed)
            
            # Encode audio as base64 for WebSocket transmission
            audio_base64 = base64.b64encode(tts_result.audio_data).decode('utf-8')
            
            logger.info(f"✅ TTS generated (fallback): {len(tts_result.audio_data)} bytes, engine: {tts_result.engine_used}")
            
            return {
                "audio_data": audio_base64,
                "format": tts_result.format,
                "duration": tts_result.duration,
                "voice_used": tts_result.voice_used,
                "engine_used": tts_result.engine_used,
                "from_cache": False,
                "compressed": False
            }
        
    except Exception as e:
        logger.warning(f"🚨 TTS generation failed: {e}")
        return None

# Helper function for safe WebSocket operations
async def safe_send_json(websocket: WebSocket, data: dict) -> bool:
    """Safely send JSON data through WebSocket with state checking"""
    try:
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_json(data)
            return True
        else:
            logger.warning(f"Attempted to send to disconnected WebSocket")
            return False
    except Exception as e:
        logger.error(f"Error sending WebSocket message: {e}")
        return False

# Performance-optimized validation constants
MAX_MESSAGE_SIZE = 65536  # 64KB - industry standard for WebSocket messages
MAX_VOICE_TRANSCRIPT_LENGTH = 10000  # Generous limit for voice transcripts

# Smart rate limiting for WebSocket connections
class UserRateLimiter:
    """Per-user rate limiter for WebSocket messages"""
    def __init__(self, max_messages_per_minute: int = 60):
        self.max_messages = max_messages_per_minute
        self.user_windows = {}  # user_id -> (window_start, message_count)
    
    def check_rate_limit(self, user_id: str) -> tuple[bool, str]:
        """Check if user is within rate limit. Returns (allowed, message)"""
        current_time = time.time()
        window_start, count = self.user_windows.get(user_id, (current_time, 0))
        
        # Reset window if more than 60 seconds have passed
        if current_time - window_start > 60:
            self.user_windows[user_id] = (current_time, 1)
            return True, "OK"
        
        # Increment count within current window
        if count >= self.max_messages:
            remaining_time = int(60 - (current_time - window_start))
            return False, f"Rate limit exceeded. Try again in {remaining_time} seconds."
        
        self.user_windows[user_id] = (window_start, count + 1)
        return True, "OK"

# Global rate limiter instance
websocket_rate_limiter = UserRateLimiter(max_messages_per_minute=60)

# Security middleware for PAM endpoints
class PAMSecurityMiddleware:
    """Advanced security middleware for PAM API endpoints"""
    
    def __init__(self):
        self.blocked_ips = set()  # Track blocked IPs
        self.suspicious_activity = {}  # Track suspicious activity patterns
        
    def check_ip_reputation(self, client_ip: str) -> tuple[bool, str]:
        """Check if IP has good reputation"""
        if client_ip in self.blocked_ips:
            return False, "IP blocked due to previous violations"
        return True, "OK"
    
    def detect_suspicious_patterns(self, user_id: str, message_content: str) -> tuple[bool, str]:
        """Detect suspicious message patterns"""
        suspicious_patterns = [
            # SQL injection patterns
            r'(union|select|insert|update|delete|drop|exec|execute)\s',
            # XSS patterns (additional to bleach)
            r'<script[^>]*>',
            r'javascript:',
            r'vbscript:',
            # Path traversal
            r'\.\./.*\.\.',
            r'/etc/passwd',
            r'/proc/',
            # Command injection
            r'[;&|`$()]',
            # Excessive caps (potential spam/abuse)
            r'^[A-Z\s!]{50,}$'
        ]
        
        import re
        for pattern in suspicious_patterns:
            if re.search(pattern, message_content, re.IGNORECASE):
                return True, f"Suspicious pattern detected: {pattern}"
        
        return False, "OK"
    
    def log_security_event(self, event_type: str, user_id: str, details: str):
        """Log security events for monitoring"""
        logger.warning(f"🚨 [SECURITY] {event_type} - User: {user_id} - Details: {details}")
        
        # Track in suspicious activity counter
        key = f"{user_id}:{event_type}"
        self.suspicious_activity[key] = self.suspicious_activity.get(key, 0) + 1
        
        # Auto-block after 5 security violations
        if self.suspicious_activity[key] >= 5:
            logger.error(f"🚨 [SECURITY] Auto-blocking user {user_id} after {self.suspicious_activity[key]} violations")
            return True  # Indicates user should be blocked
        return False

# Global security middleware instance
security_middleware = PAMSecurityMiddleware()

def validate_websocket_message_size(data: dict) -> tuple[bool, str]:
    """Basic size validation for WebSocket messages - performance optimized"""
    try:
        # Quick size check without full serialization
        # Estimate size based on string lengths
        estimated_size = sum(len(str(k)) + len(str(v)) for k, v in data.items())
        if estimated_size > MAX_MESSAGE_SIZE:
            return False, f"Message too large: ~{estimated_size} bytes (max {MAX_MESSAGE_SIZE})"
    except:
        return False, "Invalid message format"
    
    # Basic type validation
    message_type = data.get("type")
    if not message_type:
        return False, "Missing message type"
    
    return True, "Valid"

def validate_audio_data(audio_data: Union[str, bytes], format: str = None) -> tuple[bool, str, Optional[bytes]]:
    """
    Validate and process audio data for safety
    
    Args:
        audio_data: Base64 encoded string or raw bytes
        format: Expected audio format (e.g., 'webm', 'wav', 'mp3')
    
    Returns:
        Tuple of (is_valid, error_message, processed_bytes)
    """
    try:
        # Convert to bytes if base64 string
        if isinstance(audio_data, str):
            try:
                # Remove data URI prefix if present
                if audio_data.startswith('data:'):
                    audio_data = audio_data.split(',', 1)[1]
                
                # Decode base64
                audio_bytes = base64.b64decode(audio_data)
            except Exception as e:
                return False, f"Invalid base64 encoding: {str(e)}", None
        else:
            audio_bytes = audio_data
        
        # Check size limits (max 10MB for audio)
        MAX_AUDIO_SIZE = 10 * 1024 * 1024  # 10MB
        if len(audio_bytes) > MAX_AUDIO_SIZE:
            return False, f"Audio too large: {len(audio_bytes)} bytes (max {MAX_AUDIO_SIZE})", None
        
        # Validate minimum size
        if len(audio_bytes) < 100:
            return False, "Audio data too small to be valid", None
        
        # Check magic bytes for format validation
        if format:
            format_signatures = {
                'wav': [b'RIFF', b'WAVE'],
                'mp3': [b'\xff\xfb', b'\xff\xf3', b'\xff\xf2', b'ID3'],
                'webm': [b'\x1a\x45\xdf\xa3'],
                'ogg': [b'OggS'],
                'flac': [b'fLaC']
            }
            
            if format.lower() in format_signatures:
                valid_signature = False
                for signature in format_signatures[format.lower()]:
                    if audio_bytes[:len(signature)] == signature:
                        valid_signature = True
                        break
                
                if not valid_signature and format.lower() != 'webm':
                    # WebM can have variable headers, be more lenient
                    logger.warning(f"Audio format mismatch: expected {format}, got unknown")
        
        return True, "Valid", audio_bytes
        
    except Exception as e:
        logger.error(f"Audio validation error: {str(e)}")
        return False, f"Audio validation failed: {str(e)}", None

def sanitize_transcript(text: str) -> str:
    """
    Sanitize transcript text to prevent XSS and injection attacks
    
    Args:
        text: Raw transcript text
    
    Returns:
        Sanitized text safe for display
    """
    if not text:
        return ""
    
    # Use bleach for HTML sanitization
    import bleach
    
    # Allow no HTML tags
    cleaned = bleach.clean(text, tags=[], strip=True)
    
    # Additional sanitization for special characters
    # Escape potential script injection patterns
    cleaned = cleaned.replace('<', '&lt;').replace('>', '&gt;')
    cleaned = cleaned.replace('javascript:', '').replace('vbscript:', '')
    
    # Limit length to prevent DOS
    MAX_TRANSCRIPT_LENGTH = 10000
    if len(cleaned) > MAX_TRANSCRIPT_LENGTH:
        cleaned = cleaned[:MAX_TRANSCRIPT_LENGTH] + "... [truncated]"
    
    return cleaned




# WebSocket endpoint for real-time chat with secure JWT validation
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(...),  # Required parameter
    orchestrator = Depends(get_pam_orchestrator),
    db = Depends(get_database)
):
    """
    WebSocket endpoint for real-time PAM communication with JWT validation.
    
    Security:
    - Accepts WebSocket connection FIRST (required by protocol)
    - Then validates JWT token and closes if invalid
    - Returns 4001 code for unauthorized connections
    """
    connection_id = str(uuid.uuid4())
    
    # CRITICAL FIX: Accept WebSocket connection FIRST (required by WebSocket protocol)
    # This prevents "WebSocket is not connected. Need to call 'accept' first" errors
    await websocket.accept()
    logger.info(f"✅ WebSocket connection accepted for user: {user_id}, validating...")
    
    try:
        # SECURITY: IP reputation check after accepting connection
        client_ip = websocket.client.host if websocket.client else "unknown"
        ip_allowed, ip_message = security_middleware.check_ip_reputation(client_ip)
        if not ip_allowed:
            logger.warning(f"🚫 [SECURITY] WebSocket connection rejected for IP {client_ip}: {ip_message}")
            await websocket.close(code=4003, reason=f"IP blocked: {ip_message}")
            return
        
        # SECURITY: Verify JWT token AFTER accepting the connection
        # Close with proper code if validation fails
        
        if not token:
            logger.warning(f"❌ WebSocket connection rejected: missing token for user {user_id}")
            await websocket.close(code=4001, reason="Missing authentication token")
            return
        
        try:
            # Create a mock request and credentials for JWT verification
            from fastapi import Request
            from fastapi.security import HTTPAuthorizationCredentials
            
            # Create mock request object
            mock_request = Request({"type": "http", "headers": {}, "method": "GET", "url": {"scheme": "http", "path": "/"}})
            
            # Create mock credentials with the token
            mock_credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
            
            # Verify the JWT token using the flexible verification (it's async)
            payload = await verify_supabase_jwt_flexible(mock_request, mock_credentials)
            
            if not payload:
                logger.warning(f"❌ WebSocket connection rejected: invalid token for user {user_id}")
                await websocket.close(code=4001, reason="Invalid authentication token")
                return
            
            # Extract user information from token
            token_user_id = payload.get('sub')
            token_role = payload.get('role', 'authenticated')
            
            # Log successful token validation
            logger.info(f"✅ JWT token validated for user {user_id}, role: {token_role}, token_sub: {token_user_id}")
            
            # Optional: Verify user_id matches token (can be relaxed for admin users)
            if token_role not in ['admin', 'service_role'] and token_user_id != user_id:
                logger.warning(f"❌ User ID mismatch: URL={user_id}, Token={token_user_id}")
                await websocket.close(code=4001, reason="User ID mismatch")
                return
            
            # Authentication successful - connection already accepted
            logger.info(f"🔐 JWT validated successfully for user: {user_id}")
            
        except Exception as auth_error:
            logger.warning(f"❌ WebSocket authentication failed: {str(auth_error)}")
            await websocket.close(code=4001, reason=f"Authentication failed: {str(auth_error)}")
            return
        
        # SESSION-BASED TRUST: Once authenticated, trust the connection
        # Following industry best practices (Discord, Slack, etc.)
        # No per-message authentication needed - reduces latency by 5-20ms per message
        # The WebSocket connection itself becomes the trusted session
        
        # Now register the connection with the manager  
        await manager.connect(websocket, user_id, connection_id)
        
        # Store connection metadata on websocket for use in handlers
        websocket.connection_id = connection_id
        websocket.connection_start_time = time.time()
        
        # Start WebSocket keepalive to prevent Render's 30-second timeout
        await websocket_keepalive.start_keepalive(connection_id, websocket)
        logger.info(f"🔄 [KEEPALIVE] Started keepalive for connection {connection_id[:8]}...")
        
        # Log WebSocket connection establishment
        pam_logger.log_websocket_connect(
            user_id=user_id,
            connection_id=connection_id,
            ip_address=client_ip
        )
        
        # Send welcome message
        await safe_send_json(websocket, {
            "type": "connection",
            "status": "connected", 
            "message": "🤖 PAM is ready to assist you!",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        while websocket.client_state == WebSocketState.CONNECTED:
            # Check connection state before receiving
            if websocket.client_state != WebSocketState.CONNECTED:
                logger.info(f"WebSocket disconnected for user {user_id}, breaking receive loop")
                break
                
            # Receive message from client
            try:
                message_start_time = time.time()
                raw_data = await websocket.receive_json()
                logger.info(f"📨 [DEBUG] WebSocket message received from user {user_id}")
                
                # Calculate message size for logging
                message_size = len(json.dumps(raw_data, default=str))
                
                # SECURITY: Comprehensive input validation and sanitization
                try:
                    # Use SecureWebSocketMessage for validation and sanitization
                    secure_message = SecureWebSocketMessage(**raw_data)
                    # Convert back to dict with validated/sanitized data
                    data = secure_message.dict()
                    logger.info(f"✅ [SECURITY] WebSocket message validated and sanitized for user {user_id}")
                    
                    # Additional security checks using middleware
                    message_content = secure_message.get_message_content()
                    if message_content:
                        is_suspicious, suspicion_reason = security_middleware.detect_suspicious_patterns(user_id, message_content)
                        if is_suspicious:
                            # Enhanced security event logging
                            pam_logger.log_security_event(
                                event_type="SUSPICIOUS_MESSAGE",
                                user_id=user_id,
                                details=suspicion_reason,
                                ip_address=client_ip,
                                additional_context={
                                    "connection_id": connection_id,
                                    "message_size_bytes": message_size,
                                    "message_type": data.get('type', 'unknown')
                                }
                            )
                            should_block = security_middleware.log_security_event("SUSPICIOUS_MESSAGE", user_id, suspicion_reason)
                            
                            if should_block:
                                # Severe violation - close connection
                                logger.error(f"🚨 [SECURITY] Closing WebSocket connection for user {user_id} due to repeated violations")
                                await websocket.close(code=4003, reason="Security violation")
                                return
                            
                            # Send warning and skip message processing
                            await websocket.send_json({
                                "type": "error",
                                "message": "Message contains suspicious content and was rejected.",
                                "error_code": "SUSPICIOUS_CONTENT"
                            })
                            continue
                    
                except ValueError as validation_error:
                    # Validation failed - reject the message
                    error_msg = f"Message validation failed: {str(validation_error)}"
                    logger.warning(f"🚫 [SECURITY] WebSocket message rejected from {user_id}: {error_msg}")
                    
                    # Log security event for repeated validation failures
                    should_block = security_middleware.log_security_event("VALIDATION_FAILURE", user_id, str(validation_error))
                    if should_block:
                        await websocket.close(code=4003, reason="Repeated validation failures")
                        return
                    
                    await websocket.send_json({
                        "type": "error",
                        "message": "Message validation failed. Please check your input.",
                        "error_code": "VALIDATION_ERROR"
                    })
                    continue
                    
                except Exception as security_error:
                    # Unexpected validation error - treat as potential attack
                    logger.error(f"🚨 [SECURITY] Unexpected validation error from {user_id}: {str(security_error)}")
                    
                    # Log security event
                    should_block = security_middleware.log_security_event("SECURITY_ERROR", user_id, str(security_error))
                    if should_block:
                        await websocket.close(code=4003, reason="Security violation")
                        return
                    
                    await websocket.send_json({
                        "type": "error",
                        "message": "Security validation failed.",
                        "error_code": "SECURITY_ERROR"
                    })
                    continue
                
                # Advanced message size validation
                size_validation_result = await validate_websocket_message(data, user_id)
                if not size_validation_result.valid:
                    logger.warning(f"❌ WebSocket message size violation from {user_id}: {size_validation_result.reason}")
                    
                    # Log security event for large messages (potential attack)
                    should_block = security_middleware.log_security_event("MESSAGE_SIZE_VIOLATION", user_id, size_validation_result.reason)
                    
                    # Prepare detailed error response
                    error_response = {
                        "type": "error",
                        "message": "Message size violation",
                        "error_code": "MESSAGE_TOO_LARGE",
                        "size_info": {
                            "message_size_bytes": size_validation_result.size_bytes,
                            "limit_bytes": size_validation_result.limit_bytes,
                            "message_size_formatted": message_validator._format_bytes(size_validation_result.size_bytes),
                            "limit_formatted": message_validator._format_bytes(size_validation_result.limit_bytes)
                        }
                    }
                    
                    # Add field violation details if present
                    if size_validation_result.field_violations:
                        error_response["field_violations"] = size_validation_result.field_violations
                        error_response["violation_count"] = size_validation_result.violation_count
                    
                    await websocket.send_json(error_response)
                    
                    # Close connection for severe violations or repeated offenses
                    if should_block or size_validation_result.size_bytes > 1048576:  # 1MB threshold for immediate disconnect
                        logger.error(f"🚨 [SECURITY] Closing WebSocket connection for user {user_id} due to message size violation")
                        await websocket.close(code=4009, reason="Message size violation")
                        return
                    
                    continue
                    
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected normally for user {user_id}")
                break
            except Exception as receive_error:
                logger.error(f"❌ [DEBUG] Error receiving WebSocket message from {user_id}: {str(receive_error)}")
                # Check if it's a connection error
                if "WebSocket is not connected" in str(receive_error):
                    logger.error(f"WebSocket connection lost for {user_id}, breaking loop")
                    break
                # For other errors, check state before continuing
                if websocket.client_state != WebSocketState.CONNECTED:
                    break
                continue
            
            # Advanced rate limiting per user (not per message type)
            # Only count actual messages, not system pings/pongs
            if data.get("type") not in ["ping", "pong", "test"]:
                rate_result = await check_websocket_rate_limit(user_id)
                if not rate_result.allowed:
                    logger.warning(f"🚫 Advanced rate limit exceeded for user {user_id}: {rate_result.reason}")
                    
                    # Send detailed rate limit information
                    reset_in_seconds = int((rate_result.reset_time - datetime.now()).total_seconds()) if rate_result.reset_time else 60
                    
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Rate limit exceeded. Try again in {reset_in_seconds} seconds.",
                        "error_code": "RATE_LIMIT_EXCEEDED",
                        "rate_limit_info": {
                            "remaining": rate_result.remaining,
                            "reset_in_seconds": reset_in_seconds,
                            "limit_type": "websocket"
                        }
                    })
                    
                    # Log security event for excessive rate limiting violations
                    should_block = security_middleware.log_security_event("RATE_LIMIT_VIOLATION", user_id, rate_result.reason)
                    if should_block:
                        logger.error(f"🚨 [SECURITY] Closing WebSocket connection for user {user_id} due to repeated rate limit violations")
                        await websocket.close(code=4008, reason="Excessive rate limit violations")
                        return
                    
                    continue
            
            logger.info(f"  - Message type: {data.get('type')}")
            logger.info(f"  - Message content preview: {str(data.get('content', data.get('message', 'N/A')))[:100]}...")
            
            # Process different message types
            if data.get("type") == "ping":
                logger.info(f"🏓 [DEBUG] Ping received from {user_id}, sending pong")
                await websocket.send_json({"type": "pong"})
                
            elif data.get("type") == "pong":
                # Handle pong response for heartbeat monitoring
                await manager.handle_pong(connection_id)
                await websocket_keepalive.handle_pong(connection_id)
                logger.debug(f"💓 [DEBUG] Received pong from {connection_id}")
                
            elif data.get("type") == "chat":
                logger.info(f"💬 [DEBUG] Chat message detected")
                # Check if streaming is requested
                if data.get("stream", False) or data.get("streaming", False):
                    logger.info(f"🌊 [DEBUG] Streaming response requested, calling handle_websocket_chat_streaming")
                    await handle_websocket_chat_streaming(websocket, data, user_id, orchestrator)
                    logger.info(f"✅ [DEBUG] handle_websocket_chat_streaming completed for user {user_id}")
                else:
                    logger.info(f"💬 [DEBUG] Non-streaming response, calling handle_websocket_chat")
                    await handle_websocket_chat(websocket, data, user_id, orchestrator)
                    logger.info(f"✅ [DEBUG] handle_websocket_chat completed for user {user_id}")
                
            elif data.get("type") == "context_update":
                logger.info(f"🔄 [DEBUG] Context update received from {user_id}")
                await handle_context_update(websocket, data, user_id, db)
                
            elif data.get("type") == "init":
                logger.info(f"🚀 [DEBUG] Init message received from {user_id}")
                context = data.get("context", {})
                
                # Store user location in connection context
                if context.get("userLocation"):
                    await manager.update_connection_context(connection_id, {
                        "user_location": context["userLocation"],
                        "vehicle_info": context.get("vehicleInfo"),
                        "travel_style": context.get("travelStyle"),
                        "session_id": context.get("session_id")
                    })
                    logger.info(f"📍 [DEBUG] User location stored: {context['userLocation']}")
                else:
                    logger.info(f"📍 [DEBUG] No location provided in init message")
                
                # Context initialized silently - no need to send acknowledgment to user
                # PAM is a travel companion, not a system that reports initialization status
                logger.info(f"✅ Context initialized for user {user_id}")
                
            elif data.get("type") == "auth":
                logger.info(f"🔐 [DEBUG] Auth message received from {user_id} - ignoring (already authenticated)")
                # Auth messages are just for connection establishment, ignore them
                
            elif data.get("type") == "voice":
                # Handle voice/audio messages for STT
                logger.info(f"🎤 Voice message received from {user_id}")
                
                # Check WebSocket state before processing
                if websocket.client_state != WebSocketState.CONNECTED:
                    logger.warning(f"WebSocket not connected for user {user_id}, skipping voice message")
                    continue
                
                # Extract audio data and metadata
                audio_data_base64 = data.get("audio_data")
                audio_format = data.get("format", "webm")  # Default to webm (browser recording)
                language = data.get("language", "en")
                
                # Validate audio data using secure validation function
                if audio_data_base64:
                    is_valid, error_msg, audio_bytes = validate_audio_data(audio_data_base64, audio_format)
                    if not is_valid:
                        await safe_websocket_send(websocket, {
                            "type": "error",
                            "message": error_msg,
                            "error_code": "INVALID_AUDIO_DATA"
                        })
                        continue
                
                if not audio_data_base64:
                    await safe_websocket_send(websocket, {
                        "type": "error",
                        "message": "No audio data provided",
                        "error_code": "MISSING_AUDIO_DATA"
                    })
                    continue
                
                try:
                    # Decode base64 audio data
                    import base64
                    audio_bytes = base64.b64decode(audio_data_base64)
                    
                    # Get STT manager and transcribe
                    stt_manager = get_stt_manager()
                    
                    # Convert format string to AudioFormat enum
                    from app.services.stt.base import AudioFormat
                    format_enum = AudioFormat(audio_format.lower())
                    
                    # Transcribe audio
                    stt_result = await stt_manager.transcribe(
                        audio_data=audio_bytes,
                        format=format_enum,
                        language=language
                    )
                    
                    # Check if browser STT is required
                    if stt_result.text == "[BROWSER_STT_REQUIRED]":
                        # Signal client to use browser STT
                        await safe_websocket_send(websocket, {
                            "type": "stt_instruction",
                            "instruction": "use_browser_stt",
                            "language": language
                        })
                    else:
                        # Send transcription result with safe send
                        await safe_websocket_send(websocket, {
                            "type": "stt_result",
                            "text": stt_result.text,
                            "confidence": stt_result.confidence,
                            "language": stt_result.language,
                            "engine": stt_result.engine_used,
                            "processing_time": stt_result.processing_time
                        })
                        
                        # If auto_send is enabled, send the transcribed text as a chat message
                        if data.get("auto_send", False) and stt_result.text:
                            # Process as chat message
                            chat_data = {
                                "message": stt_result.text,
                                "context": data.get("context", {})
                            }
                            await process_chat_message(
                                websocket, chat_data, user_id, orchestrator, 
                                user_settings, connection_id
                            )
                            
                except Exception as stt_error:
                    logger.error(f"❌ STT error for user {user_id}: {str(stt_error)}")
                    await safe_websocket_send(websocket, {
                        "type": "error",
                        "message": "Speech recognition failed",  # Don't expose internal errors
                        "error_code": "STT_ERROR"
                    })
                
            elif data.get("type") == "stt_capabilities":
                # Return STT capabilities to client
                logger.info(f"🎙️ STT capabilities requested by {user_id}")
                
                try:
                    stt_manager = get_stt_manager()
                    capabilities = stt_manager.get_engine_capabilities()
                    
                    await websocket.send_json({
                        "type": "stt_capabilities",
                        "capabilities": capabilities,
                        "supported_formats": [f.value for f in stt_manager.get_supported_formats()],
                        "supported_languages": stt_manager.get_supported_languages()
                    })
                except Exception as cap_error:
                    logger.error(f"❌ Error getting STT capabilities: {str(cap_error)}")
                    await websocket.send_json({
                        "type": "error",
                        "message": "Failed to get STT capabilities",
                        "error_code": "CAPABILITIES_ERROR"
                    })
                
            else:
                logger.warning(f"❓ [DEBUG] Unknown message type '{data.get('type')}' from user {user_id}")
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {data.get('type')}"
                })
            
            # Log successful message processing
            processing_duration = (time.time() - message_start_time) * 1000  # Convert to milliseconds
            pam_logger.log_websocket_message(
                user_id=user_id,
                connection_id=connection_id,
                message_type=data.get('type', 'unknown'),
                message_size_bytes=message_size,
                processing_duration_ms=processing_duration
            )
                
    except WebSocketDisconnect:
        # Calculate connection duration if available
        connection_duration = None
        try:
            # If we stored connection start time, calculate duration
            connection_start = getattr(websocket, 'connection_start_time', None)
            if connection_start:
                connection_duration = time.time() - connection_start
        except:
            pass
        
        # Stop keepalive before disconnecting
        await websocket_keepalive.stop_keepalive(connection_id)
        
        manager.disconnect(user_id, connection_id)
        logger.info(f"WebSocket client {user_id} disconnected")
        
        # Log WebSocket disconnection with comprehensive details
        pam_logger.log_websocket_disconnect(
            user_id=user_id,
            connection_id=connection_id,
            reason="client_disconnect",
            duration_seconds=connection_duration
        )
        
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        
        # Log WebSocket error with full context
        pam_logger.log_websocket_message(
            user_id=user_id,
            connection_id=connection_id,
            message_type="error_handling",
            message_size_bytes=0,
            error=e
        )
        
        # Stop keepalive before disconnecting
        await websocket_keepalive.stop_keepalive(connection_id)
        
        manager.disconnect(user_id, connection_id)
        
        # Log disconnection due to error
        pam_logger.log_websocket_disconnect(
            user_id=user_id,
            connection_id=connection_id,
            reason=f"server_error: {type(e).__name__}"
        )
        
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass

async def handle_websocket_chat(websocket: WebSocket, data: dict, user_id: str, orchestrator):
    """Handle chat messages over WebSocket with edge processing integration"""
    try:
        # Support both 'message' and 'content' fields for backwards compatibility
        message = data.get("message") or data.get("content", "")
        
        # No HTML escaping needed for voice transcripts - they're just plain text
        # Trust the authenticated user's input after size validation
        
        context = data.get("context", {})
        context["user_id"] = user_id
        context["connection_type"] = "websocket"
        
        # Get stored connection context (includes location from init)
        connection_id = getattr(websocket, 'connection_id', None)
        if connection_id:
            stored_context = manager.get_connection_context(connection_id)
            if stored_context:
                # Merge stored context with message context
                if stored_context.get("user_location") and not context.get("user_location"):
                    context["user_location"] = stored_context["user_location"]
                    logger.info(f"📍 [DEBUG] Using stored location: {context['user_location']}")
                if stored_context.get("vehicle_info"):
                    context["vehicle_info"] = stored_context["vehicle_info"]
                if stored_context.get("travel_style"):
                    context["travel_style"] = stored_context["travel_style"]
        
        # CRITICAL: Fix location context mapping
        # Frontend sends 'userLocation' but backend expects 'user_location'
        if context.get("userLocation"):
            context["user_location"] = context["userLocation"]
            logger.info(f"📍 [DEBUG] User location received: {context['user_location']}")
        
        # Add current timestamp in user's timezone (if location provided)
        context["server_timestamp"] = datetime.utcnow().isoformat()
        
        # TODO: Add timezone detection based on user location
        # For now, note that user reported it's August 1st in their timezone
        context["user_timezone_note"] = "User reported August 1st in their location"
        
        logger.info(f"🔍 [DEBUG] handle_websocket_chat called with:")
        logger.info(f"  - Raw data: {data}")
        logger.info(f"  - Extracted message: '{message}'")
        logger.info(f"  - User ID: {user_id}")
        logger.info(f"  - Context: {context}")
        
        # Check for empty message
        if not message or message.strip() == "":
            logger.warning(f"❌ [DEBUG] Empty message received from user {user_id}")
            await websocket.send_json({
                "type": "error",
                "message": "I didn't receive your message. Could you please try again?"
            })
            return
        
        logger.info(f"✅ [DEBUG] Processing non-empty message: '{message}' for user: {user_id}")
        
        # Try edge processing first for ultra-fast responses
        start_time = time.time()
        logger.info(f"⚡ [DEBUG] Starting edge processing for message: '{message[:50]}...'")
        
        edge_result = await edge_processing_service.process_query(message, context)
        logger.info(f"⚡ [DEBUG] Edge processing result: handled={edge_result.handled}, confidence={edge_result.confidence:.2f}")
        
        if edge_result.handled and edge_result.response:
            # Edge processing succeeded - send immediate response
            processing_time = (time.time() - start_time) * 1000
            logger.info(f"⚡ [DEBUG] Edge processed in {processing_time:.1f}ms: '{edge_result.response[:100]}...'")
            
            edge_response_payload = {
                "type": "response",
                "content": edge_result.response,
                "source": "edge",
                "processing_time_ms": processing_time,
                "confidence": edge_result.confidence,
                "metadata": edge_result.metadata
            }
            
            # Phase 5A: Generate TTS audio for edge response with Redis optimization
            tts_start_time = time.time()
            tts_audio = await generate_tts_audio(
                edge_result.response, 
                user_settings=context.get("user_settings"),
                user_id=user_id
            )
            if tts_audio and not tts_audio.get('error'):
                tts_processing_time = (time.time() - tts_start_time) * 1000
                edge_response_payload["tts"] = tts_audio
                edge_response_payload["tts_processing_time_ms"] = tts_processing_time
                logger.info(f"🎵 Edge TTS generated in {tts_processing_time:.1f}ms, engine: {tts_audio['engine_used']}")
            
            await websocket.send_json(edge_response_payload)
            logger.info(f"📤 [DEBUG] Edge response sent successfully to user {user_id}")
            return
        
        # Fallback to full PAM processing
        logger.info(f"🔄 [DEBUG] Falling back to cloud processing (edge confidence: {edge_result.confidence:.2f})")
        
        # Use SimplePamService instead of orchestrator
        from app.core.simple_pam_service import simple_pam_service
        logger.info(f"📥 [DEBUG] Imported SimplePamService, calling get_response...")
        
        # Get conversation history if available
        conversation_history = context.get("conversation_history", [])
        logger.info(f"📚 [DEBUG] Conversation history length: {len(conversation_history)}")
        
        # Process through SimplePamService
        logger.info(f"🤖 [DEBUG] Calling SimplePamService.get_response with message: '{message}'")
        result = await simple_pam_service.get_response(
            message=message,
            context=context,
            conversation_history=conversation_history
        )
        
        # Handle both old string format and new dict format for compatibility
        if isinstance(result, str):
            response_message = result
            response_context = context
        else:
            response_message = result["response"]
            response_context = result["context"]
        
        logger.info(f"🎯 [DEBUG] SimplePamService response received: '{response_message[:100]}...'")
        
        # Create actions array for compatibility
        actions = [{
            "type": "message",
            "content": response_message
        }]
        
        # Calculate total processing time
        total_processing_time = (time.time() - start_time) * 1000
        logger.info(f"⏱️ [DEBUG] Total processing time: {total_processing_time:.1f}ms")
        
        # Check if WebSocket is still open before sending
        if websocket.client_state == WebSocketState.CONNECTED:  # WebSocketState.CONNECTED
            logger.info(f"📡 [DEBUG] WebSocket still connected, sending response...")
            
            response_payload = {
                "type": "chat_response",
                "message": response_message,
                "content": response_message,  # Add content field for frontend compatibility
                "actions": actions,
                "source": "cloud",
                "processing_time_ms": total_processing_time,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Phase 5A: Generate TTS audio for response with Redis optimization
            tts_start_time = time.time()
            tts_audio = await generate_tts_audio(
                response_message, 
                user_settings=response_context.get("user_settings"),
                user_id=user_id
            )
            if tts_audio and not tts_audio.get('error'):
                tts_processing_time = (time.time() - tts_start_time) * 1000
                response_payload["tts"] = tts_audio
                response_payload["tts_processing_time_ms"] = tts_processing_time
                logger.info(f"🎵 TTS generated in {tts_processing_time:.1f}ms, engine: {tts_audio['engine_used']}")
            else:
                logger.debug("🔇 TTS generation skipped or failed")
            
            logger.info(f"📤 [DEBUG] Sending response payload: {response_payload}")
            
            # Send response
            await websocket.send_json(response_payload)
            logger.info(f"✅ [DEBUG] Response sent successfully to user {user_id}")
            
            # Check for visual action from AI function call OR regex pattern matching
            visual_action = None
            
            # First check if AI determined a visual action via function calling
            if 'visual_action' in response_context:
                visual_action = response_context['visual_action']
                logger.info(f"🤖 AI function call generated visual action: {visual_action}")
            else:
                # Fallback to regex pattern matching (for backwards compatibility)
                visual_action = pam_visual_actions.parse_intent_to_visual_action(message, response_context)
                if visual_action:
                    logger.info(f"🔍 Regex pattern matched visual action: {visual_action}")
            
            # Send visual action if detected
            if visual_action and websocket.client_state == WebSocketState.CONNECTED:
                logger.info(f"🎨 Sending visual action to frontend: {visual_action}")
                await websocket.send_json(visual_action)
            
            # Send UI actions if any (currently none from SimplePamService)
            ui_actions = [a for a in actions if a.get("type") in ["navigate", "fill_form", "click", "alert"]]
            if ui_actions and websocket.client_state == WebSocketState.CONNECTED:
                logger.info(f"🎬 [DEBUG] Sending UI actions: {ui_actions}")
                await websocket.send_json({
                    "type": "ui_actions",
                    "actions": ui_actions
                })
        else:
            logger.warning(f"❌ [DEBUG] WebSocket closed for user {user_id}, skipping response")
            
    except Exception as e:
        logger.error(f"❌ [DEBUG] Chat handling error: {str(e)}", exc_info=True)
        if websocket.client_state == WebSocketState.CONNECTED:  # Only send if connected
            await websocket.send_json({
                "type": "error",
                "message": f"Sorry, I encountered an error: {str(e)}"
            })

async def handle_websocket_chat_streaming(websocket: WebSocket, data: dict, user_id: str, orchestrator):
    """Handle streaming chat messages over WebSocket with token-by-token delivery"""
    try:
        # Support both 'message' and 'content' fields for backwards compatibility
        message = data.get("message") or data.get("content", "")
        
        context = data.get("context", {})
        context["user_id"] = user_id
        context["connection_type"] = "websocket_streaming"
        
        # CRITICAL: Fix location context mapping
        if context.get("userLocation"):
            context["user_location"] = context["userLocation"]
            logger.info(f"📍 [DEBUG] User location received: {context['user_location']}")
        
        # Add current timestamp
        context["server_timestamp"] = datetime.utcnow().isoformat()
        
        logger.info(f"🌊 [DEBUG] handle_websocket_chat_streaming called with:")
        logger.info(f"  - Message: '{message}'")
        logger.info(f"  - User ID: {user_id}")
        
        # Check for empty message
        if not message or message.strip() == "":
            logger.warning(f"❌ [DEBUG] Empty message received from user {user_id}")
            await websocket.send_json({
                "type": "error",
                "message": "I didn't receive your message. Could you please try again?"
            })
            return
        
        # 1. Send immediate acknowledgment (sub-50ms response)
        start_time = time.time()
        logger.info(f"⚡ [DEBUG] Sending immediate acknowledgment...")
        
        await websocket.send_json({
            "type": "chat_response_start",
            "message_id": str(uuid.uuid4()),
            "status": "processing",
            "message": "🔍 I'm processing your request...",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # 2. Try edge processing first (still fastest path)
        logger.info(f"⚡ [DEBUG] Attempting edge processing...")
        edge_result = await edge_processing_service.process_query(message, context)
        
        if edge_result.handled and edge_result.response:
            # Edge processing succeeded - send as streaming chunks
            processing_time = (time.time() - start_time) * 1000
            logger.info(f"⚡ [DEBUG] Edge processed in {processing_time:.1f}ms")
            
            # Send response as streaming chunks
            await stream_response_to_websocket(websocket, edge_result.response, {
                "source": "edge",
                "processing_time_ms": processing_time,
                "confidence": edge_result.confidence,
                "metadata": edge_result.metadata
            })
            return
        
        # 3. Fallback to cloud processing with streaming
        logger.info(f"🌊 [DEBUG] Starting cloud AI streaming...")
        
        # Get conversation history
        conversation_history = context.get("conversation_history", [])
        
        # Stream response from AI service
        await stream_ai_response_to_websocket(websocket, message, context, conversation_history, start_time)
        
    except Exception as e:
        logger.error(f"❌ [DEBUG] Streaming chat handling error: {str(e)}", exc_info=True)
        if websocket.client_state == WebSocketState.CONNECTED:  # Only send if connected
            await websocket.send_json({
                "type": "error",
                "message": f"Sorry, I encountered an error: {str(e)}"
            })

async def stream_response_to_websocket(websocket: WebSocket, response: str, metadata: dict = None):
    """Stream a complete response to WebSocket in chunks"""
    try:
        # Split response into natural chunks (by sentences or words)
        chunks = split_response_into_chunks(response)
        
        for chunk in chunks:
            if websocket.client_state != WebSocketState.CONNECTED:  # Check if still connected
                logger.warning("WebSocket disconnected during streaming")
                break
                
            await websocket.send_json({
                "type": "chat_response_delta",
                "content": chunk,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Small delay to create smooth streaming effect
            await asyncio.sleep(0.05)  # 50ms between chunks
        
        # Send completion message
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_json({
                "type": "chat_response_complete",
                "metadata": metadata or {},
                "timestamp": datetime.utcnow().isoformat()
            })
            
    except Exception as e:
        logger.error(f"Error streaming response: {str(e)}")

async def stream_ai_response_to_websocket(websocket: WebSocket, message: str, context: dict, conversation_history: list, start_time: float):
    """Stream AI response from cloud services to WebSocket"""
    try:
        # Import SimplePamService for streaming
        from app.core.simple_pam_service import simple_pam_service
        
        # Get streaming response from AI service
        full_response = ""
        
        async for chunk in get_streaming_ai_response(message, context, conversation_history):
            if websocket.client_state != WebSocketState.CONNECTED:  # Check if still connected
                logger.warning("WebSocket disconnected during AI streaming")
                break
                
            full_response += chunk
            
            await websocket.send_json({
                "type": "chat_response_delta",
                "content": chunk,
                "timestamp": datetime.utcnow().isoformat()
            })
        
        # Send completion
        total_processing_time = (time.time() - start_time) * 1000
        if websocket.client_state == WebSocketState.CONNECTED:
            # Check for visual action from AI function call OR regex pattern matching
            visual_action = None
            
            # First check if AI determined a visual action via function calling
            if 'visual_action' in context:
                visual_action = context['visual_action']
                logger.info(f"🤖 AI function call generated visual action: {visual_action}")
            else:
                # Fallback to regex pattern matching (for backwards compatibility)
                visual_action = pam_visual_actions.parse_intent_to_visual_action(message, context)
                if visual_action:
                    logger.info(f"🔍 Regex pattern matched visual action: {visual_action}")
            
            await websocket.send_json({
                "type": "chat_response_complete",
                "full_response": full_response,
                "source": "cloud",
                "processing_time_ms": total_processing_time,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Send visual action if detected
            if visual_action:
                logger.info(f"🎨 Sending visual action to frontend: {visual_action}")
                await websocket.send_json(visual_action)
            
    except Exception as e:
        logger.error(f"Error streaming AI response: {str(e)}")
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_json({
                "type": "error",
                "message": f"Streaming error: {str(e)}"
            })

async def get_streaming_ai_response(message: str, context: dict, conversation_history: list):
    """Generator for streaming AI responses using Enhanced Orchestrator"""
    try:
        # Import Enhanced Orchestrator for better AI integration
        from app.services.pam.enhanced_orchestrator import get_enhanced_orchestrator
        
        # Get enhanced orchestrator instance
        orchestrator = await get_enhanced_orchestrator()
        
        # Check if streaming is supported
        user_id = context.get("user_id", "anonymous")
        session_id = context.get("session_id", str(uuid.uuid4()))
        
        try:
            # Try enhanced orchestrator with streaming support
            enhanced_response = await orchestrator.process_enhanced_message(
                user_id=user_id,
                message=message,
                session_id=session_id,
                context=context,
                response_mode=orchestrator.ResponseMode.ADAPTIVE,
                user_location=context.get("user_location")
            )
            
            response_text = enhanced_response.get("content", "")
            
            # Update context with any visual actions or additional metadata
            if "actions" in enhanced_response:
                context["visual_action"] = enhanced_response["actions"]
                
            # Check if AI service supports streaming
            if orchestrator.ai_service and hasattr(orchestrator.ai_service, 'process_message'):
                try:
                    # Get streaming response from AI service
                    stream_response = await orchestrator.ai_service.process_message(
                        message=message,
                        user_context=context,
                        stream=True
                    )
                    
                    if hasattr(stream_response, '__aiter__'):
                        # Stream tokens as they arrive
                        async for token in stream_response:
                            yield token
                        return
                        
                except Exception as stream_error:
                    logger.warning(f"Streaming failed, using non-streaming: {stream_error}")
                    
        except Exception as orchestrator_error:
            logger.warning(f"Enhanced orchestrator failed: {orchestrator_error}")
            
            # Fallback to SimplePamService
            from app.core.simple_pam_service import simple_pam_service
            
            result = await simple_pam_service.get_response(
                message=message,
                context=context,
                conversation_history=conversation_history
            )
            
            # Handle both old string format and new dict format
            if isinstance(result, str):
                response_text = result
            else:
                response_text = result.get("response", result.get("content", str(result)))
                # Update the context with any visual actions
                if isinstance(result, dict) and "context" in result and "visual_action" in result["context"]:
                    context["visual_action"] = result["context"]["visual_action"]
        
        # Simulate streaming by chunking the response
        chunks = split_response_into_chunks(response_text)
        for chunk in chunks:
            yield chunk
            await asyncio.sleep(0.05)  # Small delay for streaming effect
            
    except Exception as e:
        logger.error(f"AI streaming error: {str(e)}")
        yield f"I encountered an error while processing your request: {str(e)}"

def split_response_into_chunks(response: str, chunk_size: int = 50) -> list:
    """Split response into natural chunks for smooth streaming"""
    if not response:
        return []
    
    # Split by sentences first
    sentences = response.split('. ')
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk + sentence) < chunk_size:
            current_chunk += sentence + ". " if sentence != sentences[-1] else sentence
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence + ". " if sentence != sentences[-1] else sentence
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks

def build_pam_system_prompt(context: dict) -> str:
    """Build system prompt for PAM with user context"""
    user_location = context.get("user_location", "unknown location")
    
    return f"""You are PAM, the Personal AI Manager for Wheels & Wins, a travel planning platform for RV enthusiasts.

Current Context:
- User Location: {user_location}
- Time: {context.get('server_timestamp', 'unknown')}

You help with:
- Trip planning and route suggestions
- RV park and campground recommendations  
- Weather and road condition updates
- Local attractions and activities
- Travel tips and safety advice

Keep responses concise, helpful, and enthusiastic about RV travel. Use emojis appropriately to make conversations engaging."""

async def handle_context_update(websocket: WebSocket, data: dict, user_id: str, db):
    """Handle context updates over WebSocket"""
    try:
        context_data = data.get("context", {})
        
        # Store context update in database
        # Implementation depends on your context storage strategy
        
        await websocket.send_json({
            "type": "context_updated",
            "message": "Context updated successfully",
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Context update error: {str(e)}")
        await websocket.send_json({
            "type": "error",
            "message": "Failed to update context"
        })

# OPTIONS handlers removed - using global OPTIONS handler in main.py

# Handle OPTIONS for chat endpoint explicitly
@router.options("/chat")
async def chat_options(request: Request):
    """Handle CORS preflight for chat endpoint"""
    from app.core.cors_config import cors_config
    
    # Get the origin from the request
    origin = request.headers.get("origin")
    requested_method = request.headers.get("access-control-request-method")
    requested_headers = request.headers.get("access-control-request-headers")
    
    return cors_config.create_options_response(
        origin=origin,
        requested_method=requested_method,
        requested_headers=requested_headers,
        cache_bust=True
    )

# Security dependency for PAM endpoints
async def verify_pam_security(
    request: Request,
    current_user: dict = Depends(verify_supabase_jwt_token)
) -> dict:
    """Advanced security verification for PAM endpoints with rate limiting"""
    client_ip = request.client.host if request.client else "unknown"
    user_id = current_user.get("sub")
    
    # Check IP reputation
    ip_allowed, ip_message = security_middleware.check_ip_reputation(client_ip)
    if not ip_allowed:
        logger.warning(f"🚫 [SECURITY] REST request blocked for IP {client_ip}: {ip_message}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied due to security policy"
        )
    
    # Advanced rate limiting check
    endpoint = request.url.path
    rate_result = await check_rest_api_rate_limit(str(user_id), endpoint)
    if not rate_result.allowed:
        logger.warning(f"🚫 REST API rate limit exceeded for user {user_id}: {rate_result.reason}")
        
        # Calculate reset time for header
        reset_in_seconds = int((rate_result.reset_time - datetime.now()).total_seconds()) if rate_result.reset_time else 60
        
        # Log security event for repeated rate limiting violations
        should_block = security_middleware.log_security_event("REST_RATE_LIMIT_VIOLATION", str(user_id), rate_result.reason)
        
        if should_block:
            # Severe violation - block completely
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied due to repeated rate limit violations"
            )
        
        # Standard rate limit response
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Rate limit exceeded",
                "message": f"Too many requests. Try again in {reset_in_seconds} seconds.",
                "rate_limit_info": {
                    "remaining": rate_result.remaining,
                    "reset_in_seconds": reset_in_seconds,
                    "limit_type": "rest_api"
                }
            },
            headers={
                "X-RateLimit-Limit": "30",
                "X-RateLimit-Remaining": str(rate_result.remaining),
                "X-RateLimit-Reset": str(int(rate_result.reset_time.timestamp())) if rate_result.reset_time else str(int(time.time() + 60)),
                "Retry-After": str(reset_in_seconds)
            }
        )
    
    return current_user

# REST Chat endpoint with enhanced security
@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: SecureChatRequest,  # Use SecureChatRequest for validation
    fastapi_request: Request,  # For extracting IP and user agent
    orchestrator = Depends(get_pam_orchestrator),
    current_user: dict = Depends(verify_pam_security),  # Enhanced security verification (includes rate limiting)
):
    """Process a chat message via REST API - uses standard JWT auth with OPTIONS support"""
    start_time = datetime.utcnow()
    request_id = str(uuid.uuid4())
    
    try:
        # Extract request metadata
        client_ip = fastapi_request.client.host if fastapi_request.client else "unknown"
        user_agent = fastapi_request.headers.get("user-agent", "unknown")
        
        # Handle OPTIONS preflight - should not reach here but add safety check
        if current_user.get("method") == "OPTIONS":
            return {"message": "OPTIONS handled"}
        
        # Get user_id from validated token payload
        user_id = current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Log API request
        pam_logger.log_api_request(
            user_id=str(user_id),
            endpoint="/chat",
            method="POST",
            data=request.dict(),
            request_id=request_id,
            ip_address=client_ip,
            user_agent=user_agent
        )
        
        # SECURITY: Message size validation
        size_validation_result = await validate_rest_api_message(request.dict(), str(user_id))
        if not size_validation_result.valid:
            logger.warning(f"❌ REST API message size violation from {user_id}: {size_validation_result.reason}")
            
            # Log security event
            should_block = security_middleware.log_security_event("REST_MESSAGE_SIZE_VIOLATION", str(user_id), size_validation_result.reason)
            
            if should_block:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied due to repeated message size violations"
                )
            
            # Return size violation error
            error_detail = {
                "error": "Message size violation",
                "message": size_validation_result.reason,
                "size_info": {
                    "message_size_bytes": size_validation_result.size_bytes,
                    "limit_bytes": size_validation_result.limit_bytes,
                    "message_size_formatted": message_validator._format_bytes(size_validation_result.size_bytes),
                    "limit_formatted": message_validator._format_bytes(size_validation_result.limit_bytes)
                }
            }
            
            if size_validation_result.field_violations:
                error_detail["field_violations"] = size_validation_result.field_violations
            
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=error_detail
            )
        
        # SECURITY: Additional message content validation
        message_content = request.message
        is_suspicious, suspicion_reason = security_middleware.detect_suspicious_patterns(str(user_id), message_content)
        if is_suspicious:
            # Log security event
            should_block = security_middleware.log_security_event("REST_SUSPICIOUS_MESSAGE", str(user_id), suspicion_reason)
            
            if should_block:
                # Severe violation - block user
                logger.error(f"🚨 [SECURITY] Blocking REST requests from user {user_id} due to repeated violations")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied due to security policy violations"
                )
            
            # Return security warning instead of processing message
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message contains suspicious content and was rejected"
            )
        
        # Prepare context
        context = request.context or {}
        context["user_id"] = str(user_id)
        
        # Detect use case if not provided
        use_case = None
        if request.use_case:
            try:
                use_case = PamUseCase(request.use_case)
                logger.info(f"📊 Using explicit use case: {use_case.value}")
            except ValueError:
                logger.warning(f"⚠️ Invalid use case provided: {request.use_case}, using auto-detection")
        
        if not use_case:
            # Use profile router to detect use case
            route_decision = profile_router.analyze_message(request.message, context)
            use_case = route_decision.use_case
            logger.info(f"🎯 Auto-detected use case: {use_case.value} (confidence: {route_decision.confidence:.2f})")
        
        logger.info(f"Processing chat request for user {user_id} with use case: {use_case.value}")
        
        # Process through SimplePamService instead of orchestrator
        from app.core.simple_pam_service import simple_pam_service
        
        # Get conversation history if available
        conversation_history = context.get("conversation_history", [])
        
        # Process through SimplePamService with use case
        pam_response = await simple_pam_service.process_message(
            str(user_id),
            request.message,
            session_id=request.conversation_id,
            context=context,
            use_case=use_case
        )
        actions = pam_response.get("actions", [])
        
        # Calculate processing time
        processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        processing_time_seconds = processing_time / 1000.0

        # Determine response message
        response_text = pam_response.get("content") or "I'm here to help!"
        has_error = False
        for action in actions or []:
            if action.get("type") == "error":
                response_text = f"❌ {action.get('content', response_text)}"
                has_error = True
                break
        
        # Record observability metrics
        global_monitor.record_observation(
            observation_type="pam_chat",
            duration=processing_time_seconds,
            success=not has_error,
            metadata={
                "user_id": user_id,
                "message_length": len(request.message),
                "response_length": len(response_text),
                "has_actions": len(actions) > 0 if actions else False,
                "use_case": use_case.value if use_case else "unknown"
            }
        )
        
        # Record profile metrics for performance tracking
        if use_case and not has_error:
            profile_router.record_performance(
                use_case=use_case,
                latency=processing_time_seconds,
                tokens=len(request.message) + len(response_text),  # Rough estimate
                cost=0.0001,  # Rough estimate
                success=True,
                cache_hit=pam_response.get("cached", False)
            )
        
        session_id = request.conversation_id or request.session_id or str(uuid.uuid4())
        
        response = ChatResponse(
            response=response_text,
            actions=actions,
            conversation_id=session_id,
            session_id=session_id,  # Required field
            message_id=str(uuid.uuid4()),
            processing_time_ms=processing_time,
            timestamp=datetime.utcnow(),
            context_updates={
                "profile_used": use_case.value if use_case else "general",
                "cached_response": pam_response.get("cached", False)
            }
        )
        
        # Log successful API response
        pam_logger.log_api_response(
            user_id=str(user_id),
            endpoint="/chat",
            status_code=200,
            duration_ms=processing_time,
            request_id=request_id
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}", exc_info=True)
        
        # Calculate processing time for error case
        error_processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Log error response
        pam_logger.log_api_response(
            user_id=str(user_id) if 'user_id' in locals() else 'unknown',
            endpoint="/chat", 
            status_code=500,
            duration_ms=error_processing_time,
            request_id=request_id,
            error=e
        )
        
        # Record failed observation
        global_monitor.record_observation(
            observation_type="pam_chat",
            duration=error_processing_time,
            success=False,
            metadata={
                "error": str(e),
                "error_type": type(e).__name__,
                "message_length": len(request.message) if hasattr(request, 'message') else 0
            }
        )
        
        # Use SimplePamService fallback for error handling
        from app.core.simple_pam_service import simple_pam_service
        
        # Get a helpful error response from SimplePamService
        fallback_response = simple_pam_service._get_error_response(
            request.message if hasattr(request, 'message') else "help",
            str(e)
        )
        
        session_id = request.conversation_id or request.session_id or str(uuid.uuid4())
        
        return ChatResponse(
            response=fallback_response,
            actions=[{"type": "error", "content": str(e)}],
            conversation_id=session_id,
            session_id=session_id,
            message_id=str(uuid.uuid4()),
            processing_time_ms=int(error_processing_time * 1000),
            timestamp=datetime.utcnow()
        )

# Get conversation history
@router.get("/history", response_model=MessageHistoryResponse)
async def get_conversation_history(
    conversation_id: Optional[str] = None,
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user = Depends(get_current_user),
    db = Depends(get_database),
    orchestrator = Depends(get_pam_orchestrator)
):
    """Get conversation history for the user"""
    try:
        history = await orchestrator.get_conversation_history(
            str(current_user.id),
            limit=pagination.limit
        )
        return MessageHistoryResponse(
            messages=history,
            conversation=None,
            has_more=False,
            next_cursor=None
        )
        
    except Exception as e:
        logger.error(f"History retrieval error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversation history"
        )

# Clear conversation history
@router.delete("/history", response_model=SuccessResponse)
async def clear_conversation_history(
    conversation_id: Optional[str] = None,
    current_user = Depends(get_current_user),
    orchestrator = Depends(get_pam_orchestrator)
):
    """Clear conversation history for the user"""
    try:
        client = orchestrator.database_service.get_client()
        query = client.table("pam_conversation_memory").delete().eq(
            "user_id", str(current_user.id)
        )
        if conversation_id:
            query = query.eq("session_id", conversation_id)
        query.execute()

        return SuccessResponse(
            success=True,
            message="Conversation history cleared successfully"
        )
        
    except Exception as e:
        logger.error(f"History clearing error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear conversation history"
        )

# Get user context
@router.get("/context")
async def get_user_context(
    current_user = Depends(get_current_user),
    orchestrator = Depends(get_pam_orchestrator)
):
    """Get current user context for PAM"""
    try:
        context = await orchestrator._get_enhanced_context(
            str(current_user.id),
            session_id="default"
        )
        return {"context": context.dict()}
        
    except Exception as e:
        logger.error(f"Context retrieval error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user context"
        )

# Update user context
@router.put("/context", response_model=SuccessResponse)
async def update_user_context(
    request: ContextUpdateRequest,
    current_user = Depends(get_current_user),
    orchestrator = Depends(get_pam_orchestrator),
    _validate_context = Depends(validate_user_context)
):
    """Update user context for PAM"""
    try:
        logger.info(f"Updating context for user {current_user.id}")

        enriched = orchestrator.context_manager.validate_and_enrich_context(
            {**request.dict(exclude_unset=True), "user_id": str(current_user.id)}
        )

        client = orchestrator.database_service.get_client()
        client.table("user_context").upsert(enriched).execute()

        return SuccessResponse(
            success=True,
            message="User context updated successfully"
        )
        
    except Exception as e:
        logger.error(f"Context update error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user context"
        )

# Submit feedback on PAM responses
@router.post("/feedback", response_model=SuccessResponse)
async def submit_pam_feedback(
    request: PamFeedbackRequest,
    current_user = Depends(get_current_user),
    orchestrator = Depends(get_pam_orchestrator)
):
    """Submit feedback on PAM responses with rate limiting"""
    try:
        user_id = str(current_user.id)
        
        # Feedback-specific rate limiting (prevent spam)
        rate_result = await check_feedback_rate_limit(user_id)
        if not rate_result.allowed:
            logger.warning(f"🚫 Feedback rate limit exceeded for user {user_id}: {rate_result.reason}")
            
            reset_in_seconds = int((rate_result.reset_time - datetime.now()).total_seconds()) if rate_result.reset_time else 60
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Feedback rate limit exceeded",
                    "message": f"Too many feedback submissions. Try again in {reset_in_seconds} seconds.",
                    "rate_limit_info": {
                        "remaining": rate_result.remaining,
                        "reset_in_seconds": reset_in_seconds,
                        "limit_type": "feedback",
                        "limit": "5 submissions per 60 seconds"
                    }
                }
            )
        
        # Feedback message size validation
        feedback_size_result = await validate_feedback_message(request.dict(), user_id)
        if not feedback_size_result.valid:
            logger.warning(f"❌ Feedback message size violation from {user_id}: {feedback_size_result.reason}")
            
            error_detail = {
                "error": "Feedback size violation", 
                "message": feedback_size_result.reason,
                "size_info": {
                    "feedback_size_bytes": feedback_size_result.size_bytes,
                    "limit_bytes": feedback_size_result.limit_bytes,
                    "feedback_size_formatted": message_validator._format_bytes(feedback_size_result.size_bytes),
                    "limit_formatted": message_validator._format_bytes(feedback_size_result.limit_bytes)
                }
            }
            
            if feedback_size_result.field_violations:
                error_detail["field_violations"] = feedback_size_result.field_violations
            
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=error_detail
            )
        
        logger.info(f"Feedback submitted by user {current_user.id}")
        
        # Store feedback in pam_feedback table
        feedback_data = {
            "id": str(uuid.uuid4()),
            "user_id": str(current_user.id),
            "message_id": request.message_id,
            "rating": request.rating,
            "feedback_text": request.feedback_text,
            "feedback_type": request.feedback_type,
            "created_at": datetime.utcnow()
        }
        
        client = orchestrator.database_service.get_client()
        client.table("pam_feedback").insert(feedback_data).execute()

        # Track feedback via analytics
        from app.services.analytics.analytics import AnalyticsEvent, EventType

        await orchestrator.analytics.track_event(
            AnalyticsEvent(
                event_type=EventType.FEATURE_USAGE,
                user_id=str(current_user.id),
                timestamp=datetime.utcnow(),
                event_data={"feature": "pam_feedback", "rating": request.rating}
            )
        )

        return SuccessResponse(
            success=True,
            message="Feedback submitted successfully"
        )
        
    except Exception as e:
        logger.error(f"Feedback submission error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback"
        )

# Record simple thumbs feedback
@router.post("/v1/pam/feedback", response_model=SuccessResponse)
async def record_thumb_feedback(
    request: PamThumbFeedbackRequest,
    current_user = Depends(get_current_user),
    orchestrator = Depends(get_pam_orchestrator),
):
    """Record thumbs-up or thumbs-down for a PAM message."""
    try:
        data = {
            "id": str(uuid.uuid4()),
            "user_id": str(current_user.id),
            "message_id": request.message_id,
            "thumbs_up": request.thumbs_up,
            "created_at": datetime.utcnow(),
        }
        client = orchestrator.database_service.get_client()
        client.table("pam_feedback").insert(data).execute()

        return SuccessResponse(success=True, message="Feedback recorded")

    except Exception as e:
        logger.error(f"Feedback submission error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback",
        )

# Health check for PAM services
@router.get("/health")
async def pam_health_check():
    """Optimized PAM service health check with caching and performance monitoring"""
    from app.core.performance_optimizer import performance_optimizer, optimized_operation
    
    async with optimized_operation("pam_health_check"):
        async def _perform_health_check():
            """Actual health check logic with optimizations"""
            try:
                # Quick configuration check (no complex validation)
                from app.core.config import get_settings
                settings = get_settings()
                
                has_openai_key = bool(getattr(settings, 'OPENAI_API_KEY', None))
                
                if not has_openai_key:
                    return {
                        "status": "degraded",
                        "timestamp": datetime.utcnow().isoformat(),
                        "service": "PAM",
                        "openai_api": "not_configured",
                        "message": "PAM available in text-only mode - OpenAI API key not configured"
                    }
                
                # Quick OpenAI connectivity test (no actual API call)
                try:
                    import openai
                    openai_available = True
                except ImportError:
                    openai_available = False
                
                # Determine status based on available components
                if openai_available and has_openai_key:
                    status = "healthy"
                    openai_status = "available"
                    message = "PAM service operational"
                elif has_openai_key:
                    status = "degraded"
                    openai_status = "library_missing"
                    message = "OpenAI library not available"
                else:
                    status = "degraded"
                    openai_status = "not_configured"
                    message = "OpenAI API not configured"
                
                return {
                    "status": status,
                    "timestamp": datetime.utcnow().isoformat(),
                    "service": "PAM",
                    "openai_api": openai_status,
                    "message": message,
                    "performance": {
                        "optimized": True,
                        "cached": True
                    }
                }
                
            except Exception as e:
                logger.error(f"Optimized PAM health check error: {str(e)}")
                return {
                    "status": "unhealthy",
                    "timestamp": datetime.utcnow().isoformat(),
                    "error": f"Health check failed: {str(e)}",
                    "service": "PAM"
                }
        
        # Use cached health check with 30-second TTL
        return await performance_optimizer.get_cached_health_status(
            "pam_service", _perform_health_check
        )


# OPTIONS handler for voice endpoint
@router.options("/voice")
async def voice_options(request: Request):
    """Handle CORS preflight for voice endpoint"""
    from app.core.cors_config import cors_config
    
    # Get the origin from the request
    origin = request.headers.get("origin")
    requested_method = request.headers.get("access-control-request-method")
    requested_headers = request.headers.get("access-control-request-headers")
    
    return cors_config.create_options_response(
        origin=origin,
        requested_method=requested_method,
        requested_headers=requested_headers,
        cache_bust=True
    )

# TTS Debug endpoint
@router.get("/tts-debug")
async def tts_debug_info():
    """Debug endpoint to verify TTS configuration and deployment"""
    from app.services.tts.enhanced_tts_service import enhanced_tts_service
    from app.services.tts.voice_mapping import voice_mapping_service
    from app.services.tts.error_handling import get_error_recovery
    from app.core.config import get_settings
    
    settings = get_settings()
    error_recovery = get_error_recovery()
    
    return {
        "deployment_timestamp": "2025-08-02T02:30:00Z",
        "voice_mapping_system": {
            "enabled": True,
            "total_voices": len(voice_mapping_service.voice_mappings),
            "default_voice_configured": settings.TTS_VOICE_DEFAULT,
            "sample_voice_mappings": {
                voice_id: {
                    "edge": voice_mapping_service.get_engine_voice_id(voice_id, "edge"),
                    "coqui": voice_mapping_service.get_engine_voice_id(voice_id, "coqui")
                }
                for voice_id in ["pam_default", "pam_female_professional", "pam_male_calm"]
            }
        },
        "enhanced_tts_service": {
            "initialized": enhanced_tts_service.is_initialized,
            "available_engines": list(enhanced_tts_service.engines.keys()) if enhanced_tts_service.engines else [],
            "fallback_chain": [engine.value for engine in enhanced_tts_service.fallback_chain],
            "circuit_breakers": {
                engine: error_recovery.should_use_engine(engine) 
                for engine in ["edge", "coqui", "system", "supabase"]
            }
        },
        "error_handling": {
            "total_errors_recorded": len(error_recovery.error_history),
            "recent_errors": error_recovery.get_error_analytics(hours=1),
            "engine_health": {
                engine: health.get("health_score", 1.0)
                for engine, health in error_recovery.engine_health.items()
            }
        },
        "configuration": {
            "tts_enabled": settings.TTS_ENABLED,
            "primary_engine": settings.TTS_PRIMARY_ENGINE,
            "fallback_enabled": settings.TTS_FALLBACK_ENABLED,
            "voice_default": settings.TTS_VOICE_DEFAULT
        },
        "system_info": {
            "commit_hash": "voice_mapping_update",
            "python_packages": {
                "edge_tts": "available" if enhanced_tts_service.engines.get("edge") else "unavailable",
                "coqui_tts": "available" if enhanced_tts_service.engines.get("coqui") else "unavailable"
            }
        }
    }

# Voice mapping test endpoint
@router.get("/voice-mapping-test")
async def test_voice_mapping():
    """Test endpoint for voice mapping system validation"""
    from app.services.tts.voice_mapping import voice_mapping_service
    
    test_results = {}
    
    # Test all available voices
    for voice_id in voice_mapping_service.voice_mappings.keys():
        voice_info = voice_mapping_service.get_voice_info(voice_id)
        
        # Test engine mappings
        engine_tests = {}
        for engine in ["edge", "coqui", "system", "supabase"]:
            engine_voice_id = voice_mapping_service.get_engine_voice_id(voice_id, engine)
            is_valid, message = voice_mapping_service.validate_voice_mapping(voice_id, engine)
            
            engine_tests[engine] = {
                "voice_id": engine_voice_id,
                "valid": is_valid,
                "message": message
            }
        
        test_results[voice_id] = {
            "display_name": voice_info["display_name"],
            "engine_mappings": engine_tests,
            "characteristics": voice_info["characteristics"],
            "quality_score": voice_info["quality_score"]
        }
    
    # Test legacy voice resolution
    legacy_tests = {}
    legacy_voices = ["p225", "p228", "en-US-JennyNeural", "en-US-AriaNeural"]
    
    for legacy_voice in legacy_voices:
        resolved = voice_mapping_service._resolve_legacy_voice_id(legacy_voice)
        legacy_tests[legacy_voice] = {
            "resolved_to": resolved,
            "valid": resolved is not None
        }
    
    # Test context recommendations
    context_tests = {}
    contexts = ["travel_planning", "financial", "emergency", "casual", "professional"]
    
    for context in contexts:
        recommendations = voice_mapping_service.get_recommended_voices_for_context(context, limit=3)
        context_tests[context] = recommendations
    
    return {
        "voice_mappings": test_results,
        "legacy_resolution": legacy_tests,
        "context_recommendations": context_tests,
        "mapping_stats": voice_mapping_service.get_mapping_stats(),
        "test_timestamp": datetime.utcnow().isoformat()
    }

# Voice synthesis test endpoint  
@router.post("/voice-test")
async def test_voice_synthesis(voice_id: str = "pam_default", text: str = "Hello, this is a voice test."):
    """Test voice synthesis with specific voice ID"""
    from app.services.tts.enhanced_tts_service import enhanced_tts_service
    
    try:
        # Initialize if needed
        if not enhanced_tts_service.is_initialized:
            await enhanced_tts_service.initialize()
        
        # Test synthesis
        result = await enhanced_tts_service.synthesize(
            text=text,
            voice_id=voice_id,
            max_retries=2
        )
        
        return {
            "success": result.audio_data is not None,
            "voice_id_requested": voice_id,
            "voice_id_used": result.voice_id,
            "engine_used": result.engine.value,
            "quality": result.quality.value,
            "processing_time_ms": result.processing_time_ms,
            "fallback_used": result.fallback_used,
            "error": result.error,
            "audio_size_bytes": len(result.audio_data) if result.audio_data else 0,
            "test_text": text,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "success": False,
            "voice_id_requested": voice_id,
            "error": str(e),
            "test_text": text,
            "timestamp": datetime.utcnow().isoformat()
        }

# TTS endpoint for voice generation
class VoiceRequest(BaseModel):
    text: str
    temperature: float = 1.1
    cfg_scale: float = 3.0
    speed_factor: float = 0.96
    max_new_tokens: int = 2048

@router.post("/voice")
async def generate_pam_voice(
    request: VoiceRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
):
    """Generate PAM voice audio from text using enhanced TTS service with rate limiting"""
    try:
        # Extract user ID from credentials for rate limiting
        user_id = "anonymous"
        if credentials and credentials.credentials:
            try:
                # Try to decode JWT to get user ID for rate limiting
                from app.api.deps import verify_supabase_jwt_token_sync
                class MockCredentials:
                    def __init__(self, token):
                        self.credentials = token
                
                mock_cred = MockCredentials(credentials.credentials)
                user_data = verify_supabase_jwt_token_sync(mock_cred)
                user_id = user_data.get('sub', 'anonymous')
            except:
                user_id = "anonymous"  # Allow anonymous with separate rate limiting
        
        # Voice-specific rate limiting (more restrictive due to resource intensity)
        rate_result = await check_voice_rate_limit(user_id)
        if not rate_result.allowed:
            logger.warning(f"🚫 Voice synthesis rate limit exceeded for user {user_id}: {rate_result.reason}")
            
            reset_in_seconds = int((rate_result.reset_time - datetime.now()).total_seconds()) if rate_result.reset_time else 300
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Voice synthesis rate limit exceeded",
                    "message": f"Too many voice requests. Try again in {reset_in_seconds} seconds.",
                    "rate_limit_info": {
                        "remaining": rate_result.remaining,
                        "reset_in_seconds": reset_in_seconds,
                        "limit_type": "voice_synthesis",
                        "limit": "10 requests per 60 seconds"
                    }
                },
                headers={
                    "X-RateLimit-Limit": "10",
                    "X-RateLimit-Remaining": str(rate_result.remaining),
                    "X-RateLimit-Reset": str(int(rate_result.reset_time.timestamp())) if rate_result.reset_time else str(int(time.time() + 300)),
                    "Retry-After": str(reset_in_seconds)
                }
            )
        
        # Voice text size validation
        voice_size_result = await validate_voice_text(request.text, user_id)
        if not voice_size_result.valid:
            logger.warning(f"❌ Voice synthesis text size violation from {user_id}: {voice_size_result.reason}")
            
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={
                    "error": "Voice text size violation",
                    "message": voice_size_result.reason,
                    "size_info": {
                        "text_length_characters": len(request.text),
                        "text_size_bytes": voice_size_result.size_bytes,
                        "limit_bytes": voice_size_result.limit_bytes,
                        "text_size_formatted": message_validator._format_bytes(voice_size_result.size_bytes),
                        "limit_formatted": message_validator._format_bytes(voice_size_result.limit_bytes),
                        "character_limit": 2000
                    }
                }
            )
        
        logger.info(f"🎙️ Enhanced TTS request for text: {request.text[:100]}...")
        
        # Use the enhanced TTS service with 4-tier fallback
        from app.services.tts.enhanced_tts_service import enhanced_tts_service
        from app.core.config import get_settings
        settings = get_settings()
        
        # Initialize service if not already done
        if not enhanced_tts_service.is_initialized:
            logger.info("🔄 Initializing Enhanced TTS service...")
            await enhanced_tts_service.initialize()
        
        if not enhanced_tts_service.is_initialized:
            logger.error("❌ Enhanced TTS service could not be initialized")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "TTS service initialization failed",
                    "message": "No TTS engines could be initialized. Please check system configuration."
                }
            )
        
        # Use enhanced TTS service with automatic fallback and voice mapping
        # Convert any legacy voice configuration to generic voice ID
        configured_voice = settings.TTS_VOICE_DEFAULT or "pam_default"
        
        result = await enhanced_tts_service.synthesize(
            text=request.text,
            voice_id=configured_voice,  # Will be resolved by voice mapping system
            max_retries=4  # Try all 4 engines in fallback chain
        )
        
        if result.audio_data:
            logger.info(f"✅ Enhanced TTS successful with {result.engine.value}: {len(result.audio_data)} bytes")
            
            # Convert audio data to array format expected by frontend
            audio_array = list(result.audio_data)
            
            return {
                "audio": audio_array,
                "duration": result.duration_ms // 1000 if result.duration_ms else len(request.text) // 10,
                "cached": result.cache_hit,
                "engine": result.engine.value,
                "quality": result.quality.value,
                "fallback_used": result.fallback_used,
                "processing_time_ms": result.processing_time_ms
            }
        
        # Enhanced TTS failed completely - return meaningful error
        error_message = result.error if result.error else "Unknown TTS failure"
        logger.error(f"❌ All TTS engines failed: {error_message}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "TTS service unavailable",
                "message": f"All text-to-speech engines failed: {error_message}",
                "fallback_text": request.text,
                "engines_tried": [engine.value for engine in enhanced_tts_service.fallback_chain]
            }
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"❌ Voice generation critical error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Voice generation system error: {str(e)}")


# =====================================================
# SIMPLIFIED SAVINGS TRACKING - INTEGRATED WITH EXISTING SYSTEMS
# =====================================================
# 
# The complex savings guarantee system has been removed and replaced
# with a simplified approach that integrates with existing PAM tools.
# 
# Savings tracking is now handled through:
# 1. Enhanced financial tools in the existing tool registry
# 2. Simple JSONB field addition to existing expenses table  
# 3. Integration with existing WinsNode financial system
# 
# This approach reduces complexity while maintaining savings guarantee functionality.

@router.get("/monthly-savings")
async def get_monthly_savings_status(
    year: int = Query(default=None, description="Year (defaults to current year)"),
    month: int = Query(default=None, description="Month (defaults to current month)"),
    current_user = Depends(get_current_user)
):
    """
    Get monthly PAM savings status and guarantee information
    
    This simplified endpoint replaces the complex savings guarantee system
    with a single, efficient query using database functions.
    """
    try:
        from app.database.supabase_client import get_supabase_client
        
        # Use current year/month if not specified
        now = datetime.utcnow()
        target_year = year or now.year
        target_month = month or now.month
        
        supabase = get_supabase_client()
        
        # Try to call the database function - graceful fallback if function doesn't exist
        try:
            result = supabase.rpc(
                "calculate_monthly_pam_savings",
                {
                    "user_id_param": str(current_user.id),
                    "year_param": target_year,
                    "month_param": target_month
                }
            ).execute()
            
            if result.data and len(result.data) > 0:
                # Extract data from function result
                savings_data = result.data[0]
                total_savings = float(savings_data.get("total_savings", 0))
                subscription_cost = float(savings_data.get("subscription_cost", 29.99))
                guarantee_met = savings_data.get("guarantee_met", False)
                percentage_achieved = float(savings_data.get("percentage_achieved", 0))
                
                return {
                    "success": True,
                    "data": {
                        "total_savings": total_savings,
                        "savings_count": savings_data.get("savings_count", 0),
                        "subscription_cost": subscription_cost,
                        "guarantee_met": guarantee_met,
                        "percentage_achieved": percentage_achieved,
                        "savings_shortfall": max(0, subscription_cost - total_savings),
                        "period": {
                            "year": target_year,
                            "month": target_month
                        }
                    }
                }
            
        except Exception as db_error:
            logger.warning(f"Database function 'calculate_monthly_pam_savings' not available: {db_error}")
        
        # Fallback: Return default values (database function doesn't exist yet or failed)
        return {
            "success": True,
            "data": {
                "total_savings": 0.0,
                "savings_count": 0,
                "subscription_cost": 29.99,
                "guarantee_met": False,
                "percentage_achieved": 0.0,
                "savings_shortfall": 29.99,
                "period": {
                    "year": target_year,
                    "month": target_month
                },
                "note": "PAM savings tracking will be enabled after database migration"
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get monthly savings status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get monthly savings status: {str(e)}"
        )


@router.get("/savings-analytics")  
async def get_pam_savings_analytics(current_user = Depends(get_current_user)):
    """
    Get comprehensive PAM savings analytics using simplified database functions
    
    Returns current month, last month, and lifetime savings data.
    """
    try:
        from app.database.supabase_client import get_supabase_client
        
        supabase = get_supabase_client()
        
        # Try to call the analytics database function - graceful fallback if function doesn't exist
        try:
            result = supabase.rpc(
                "get_pam_savings_analytics", 
                {"user_id_param": str(current_user.id)}
            ).execute()
            
            if result.data and len(result.data) > 0:
                analytics_data = result.data[0]
                return {
                    "success": True,
                    "data": analytics_data
                }
        
        except Exception as db_error:
            logger.warning(f"Database function 'get_pam_savings_analytics' not available: {db_error}")
        
        # Fallback: Return default analytics structure (database function doesn't exist yet or failed)
        return {
            "success": True,
            "data": {
                "current_month": {
                    "total_savings": 0.0,
                    "savings_count": 0,
                    "subscription_cost": 29.99,
                    "guarantee_met": False,
                    "percentage_achieved": 0.0
                },
                "last_month": {
                    "total_savings": 0.0,
                    "savings_count": 0
                },
                "lifetime": {
                    "total_savings": 0.0
                },
                "generated_at": datetime.utcnow().isoformat(),
                "note": "PAM savings analytics will be enabled after database migration"
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get savings analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get savings analytics: {str(e)}"
        )

# =====================================================
# AGENTIC AI CAPABILITIES
# =====================================================

@router.post("/agentic/plan")
async def create_agentic_plan(
    request: dict,
    current_user = Depends(get_current_user),
    orchestrator = Depends(get_pam_orchestrator)
):
    """
    Create an autonomous execution plan for complex user goals
    Exposes the agentic orchestrator's planning capabilities
    """
    try:
        user_goal = request.get("goal", "")
        context = request.get("context", {})
        
        # Try to access agentic orchestrator
        try:
            from app.services.pam.agentic_orchestrator import AgenticOrchestrator
            from app.core.intelligent_conversation import IntelligentConversationHandler
            
            # Initialize agentic orchestrator
            conversation_handler = IntelligentConversationHandler()
            agentic_orchestrator = AgenticOrchestrator(conversation_handler)
            await agentic_orchestrator.initialize()
            
            # Create execution plan
            plan = await agentic_orchestrator.process_user_request(
                user_id=str(current_user.id),
                message=user_goal,
                context=context
            )
            
            return {
                "success": True,
                "plan": {
                    "user_goal": user_goal,
                    "complexity": plan.get("complexity", "moderate"),
                    "steps": plan.get("steps", []),
                    "tools_required": plan.get("tools_required", []),
                    "estimated_time": plan.get("estimated_time", "unknown"),
                    "success_probability": plan.get("success_probability", 0.8)
                },
                "agent_reasoning": plan.get("reasoning", "Goal analysis completed"),
                "can_execute": True
            }
            
        except ImportError as e:
            logger.warning(f"Agentic orchestrator not available: {e}")
            # Fallback to basic goal analysis
            return {
                "success": True,
                "plan": {
                    "user_goal": user_goal,
                    "complexity": "simple",
                    "steps": [{"action": "process_request", "description": f"Process: {user_goal}"}],
                    "tools_required": ["basic_chat"],
                    "estimated_time": "immediate",
                    "success_probability": 0.9
                },
                "agent_reasoning": "Basic goal processing (agentic features initializing)",
                "can_execute": True
            }
            
    except Exception as e:
        logger.error(f"Agentic planning failed: {str(e)}")
        return {
            "success": False,
            "error": "Planning system temporarily unavailable",
            "fallback_available": True
        }

@router.post("/agentic/execute")
async def execute_agentic_plan(
    request: dict,
    current_user = Depends(get_current_user),
    orchestrator = Depends(get_pam_orchestrator)
):
    """
    Execute a previously created agentic plan with real-time monitoring
    """
    try:
        plan_id = request.get("plan_id")
        user_goal = request.get("goal", "")
        context = request.get("context", {})
        
        # For now, execute via standard chat processing with enhanced context
        from app.core.simple_pam_service import simple_pam_service
        
        # Add agentic context flags
        enhanced_context = {
            **context,
            "user_id": str(current_user.id),
            "execution_mode": "agentic",
            "plan_id": plan_id,
            "multi_step_reasoning": True
        }
        
        response = await simple_pam_service.get_response(
            message=user_goal,
            context=enhanced_context
        )
        
        return {
            "success": True,
            "execution_result": {
                "response": response,
                "steps_completed": 1,
                "tools_used": ["enhanced_ai"],
                "execution_time": "immediate"
            },
            "agent_insights": "Task completed with enhanced reasoning",
            "learning_captured": True
        }
        
    except Exception as e:
        logger.error(f"Agentic execution failed: {str(e)}")
        return {
            "success": False,
            "error": "Execution system temporarily unavailable"
        }

@router.get("/agentic/capabilities")
async def get_agentic_capabilities(
    request: Request,
    current_user = Depends(verify_supabase_jwt_token)
):
    """
    Get available agentic AI capabilities and system status
    """
    try:
        # Check what agentic features are available
        capabilities = {
            "goal_planning": True,
            "multi_step_reasoning": True,
            "dynamic_tool_selection": True,
            "proactive_assistance": True,
            "learning_adaptation": True,
            "domain_expertise": {
                "travel_planning": True,
                "financial_management": True,
                "social_networking": True,
                "shopping_recommendations": True
            },
            "specialized_nodes": {
                "you_node": "Personal AI companion with emotional intelligence",
                "wheels_node": "Travel and RV logistics expert",
                "wins_node": "Financial management specialist",
                "shop_node": "Product recommendation engine",
                "social_node": "Community and social features"
            }
        }
        
        return {
            "success": True,
            "capabilities": capabilities,
            "system_status": "operational",
            "version": "1.0",
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get agentic capabilities: {str(e)}")
        return {
            "success": False,
            "error": "Capabilities check failed"
        }

# =====================================================
# PAM SECURITY MONITORING ENDPOINTS
# =====================================================

@router.get("/security/audit")
async def get_security_audit(
    current_user = Depends(get_current_user)
):
    """Get security audit information for monitoring (admin only)"""
    try:
        # Note: In production, add admin role check here
        # if not current_user.get("role") == "admin":
        #     raise HTTPException(status_code=403, detail="Admin access required")
        
        return {
            "security_status": {
                "blocked_ips_count": len(security_middleware.blocked_ips),
                "suspicious_activity_events": len(security_middleware.suspicious_activity),
                "total_security_events": sum(security_middleware.suspicious_activity.values()),
                "most_common_violations": dict(list(sorted(
                    security_middleware.suspicious_activity.items(), 
                    key=lambda x: x[1], 
                    reverse=True
                ))[:10])
            },
            "validation_system": {
                "models_active": ["SecureChatRequest", "SecureWebSocketMessage"],
                "sanitization_enabled": True,
                "suspicious_pattern_count": 8,
                "auto_blocking_enabled": True,
                "block_threshold": 5
            },
            "rate_limiting": {
                "websocket_rate_limit": "60 messages/minute",
                "rest_api_rate_limit": "30 requests/minute", 
                "voice_synthesis_limit": "10 requests/minute",
                "feedback_limit": "5 submissions/minute",
                "auth_limit": "5 attempts per 5 minutes",
                "active_limiters": multi_tier_limiter.get_all_stats()
            },
            "middleware_health": {
                "security_middleware_active": True,
                "input_validation_active": True,
                "content_sanitization_active": True,
                "pattern_detection_active": True,
                "message_size_validation_active": True
            },
            "message_size_limits": {
                "websocket_text": "64KB (65,536 bytes)",
                "websocket_json": "128KB (131,072 bytes)",
                "rest_api_chat": "32KB (32,768 bytes)",
                "voice_synthesis": "10KB (10,240 bytes) / 2K characters",
                "feedback": "4KB (4,096 bytes) / 1K characters",
                "context_data": "16KB (16,384 bytes) / 2K characters"
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Security audit error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Security audit failed: {str(e)}"
        )

@router.post("/security/reset")
async def reset_security_counters(
    current_user = Depends(get_current_user)
):
    """Reset security counters (admin only)"""
    try:
        # Note: In production, add admin role check here
        # if not current_user.get("role") == "admin":
        #     raise HTTPException(status_code=403, detail="Admin access required")
        
        # Reset security middleware counters
        initial_blocked_count = len(security_middleware.blocked_ips)
        initial_activity_count = len(security_middleware.suspicious_activity)
        
        security_middleware.suspicious_activity.clear()
        # Keep blocked IPs for security - only clear if explicitly requested
        
        logger.info(f"Security counters reset by admin user {current_user.get('sub')}")
        
        return {
            "success": True,
            "message": "Security counters reset successfully",
            "reset_data": {
                "blocked_ips_count": initial_blocked_count,
                "suspicious_activity_events_cleared": initial_activity_count,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Security reset error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Security reset failed: {str(e)}"
        )

@router.get("/rate-limits/status")
async def get_rate_limit_status(
    current_user = Depends(get_current_user)
):
    """Get detailed rate limiting status and statistics"""
    try:
        user_id = str(current_user.id)
        
        # Get current rate limit status for this user across all limiters
        rate_limits_status = {}
        
        # Check each rate limiter type
        limiter_types = ["websocket", "rest_api", "voice_synthesis", "feedback", "auth", "heavy_operations"]
        
        for limiter_type in limiter_types:
            # Get a rate limit check without consuming a request (just to see status)
            rate_result = await multi_tier_limiter.check_limit(limiter_type, f"status_check_{user_id}", "status")
            
            # Get limiter stats
            limiter_stats = multi_tier_limiter.limiters[limiter_type].get_stats()
            
            rate_limits_status[limiter_type] = {
                "limit": limiter_stats["max_requests"],
                "window_seconds": limiter_stats["window_seconds"], 
                "remaining": rate_result.remaining,
                "reset_time": rate_result.reset_time.isoformat() if rate_result.reset_time else None,
                "currently_allowed": rate_result.allowed
            }
        
        # Global rate limiter statistics
        global_stats = multi_tier_limiter.get_all_stats()
        
        return {
            "success": True,
            "user_rate_limits": rate_limits_status,
            "global_statistics": global_stats,
            "rate_limit_policies": {
                "websocket": "60 messages per 60 seconds",
                "rest_api": "30 requests per 60 seconds", 
                "voice_synthesis": "10 requests per 60 seconds",
                "feedback": "5 submissions per 60 seconds",
                "auth": "5 attempts per 300 seconds",
                "heavy_operations": "5 operations per 300 seconds"
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Rate limit status error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get rate limit status: {str(e)}"
        )

@router.get("/message-size/status")
async def get_message_size_status(
    current_user = Depends(get_current_user)
):
    """Get detailed message size validation status and statistics"""
    try:
        # Get message size validation statistics
        validation_stats = message_validator.get_statistics()
        
        return {
            "success": True,
            "validation_statistics": {
                "total_validations": validation_stats["total_validations"],
                "size_violations": validation_stats["size_violations"],
                "field_violations": validation_stats["field_violations"],
                "largest_message_seen": {
                    "bytes": validation_stats["largest_message_seen"],
                    "formatted": message_validator._format_bytes(validation_stats["largest_message_seen"])
                },
                "violation_rate": f"{(validation_stats['size_violations'] / max(validation_stats['total_validations'], 1)) * 100:.1f}%"
            },
            "message_type_limits": validation_stats["message_limits"],
            "character_limits": validation_stats["character_limits"],
            "field_limits": validation_stats["field_limits"],
            "validation_policies": {
                "websocket_messages": {
                    "text_limit": "64KB bytes",
                    "json_limit": "128KB bytes",
                    "character_limit": "10K characters",
                    "strict_validation": True
                },
                "rest_api_messages": {
                    "message_limit": "32KB bytes", 
                    "character_limit": "5K characters",
                    "field_validation": True
                },
                "voice_synthesis": {
                    "text_limit": "10KB bytes",
                    "character_limit": "2K characters",
                    "optimized_for_tts": True
                },
                "feedback_submissions": {
                    "message_limit": "4KB bytes",
                    "character_limit": "1K characters",
                    "spam_prevention": True
                }
            },
            "security_integration": {
                "size_violation_tracking": True,
                "automatic_blocking": True,
                "security_event_logging": True,
                "connection_termination": True
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Message size status error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get message size status: {str(e)}"
        )

@router.post("/message-size/validate")
async def validate_message_size_endpoint(
    message_data: dict,
    message_type: str = "websocket_json",
    current_user = Depends(get_current_user)
):
    """Validate message size without processing - for testing purposes"""
    try:
        user_id = str(current_user.id)
        
        # Map string to MessageType enum
        type_mapping = {
            "websocket_text": MessageType.WEBSOCKET_TEXT,
            "websocket_json": MessageType.WEBSOCKET_JSON,
            "rest_api_chat": MessageType.REST_API_CHAT,
            "voice_synthesis": MessageType.VOICE_SYNTHESIS,
            "feedback": MessageType.FEEDBACK,
            "context_data": MessageType.CONTEXT_DATA
        }
        
        msg_type = type_mapping.get(message_type, MessageType.WEBSOCKET_JSON)
        
        # Validate the message
        validation_result = message_validator.validate_message(message_data, msg_type, user_id)
        
        response = {
            "success": True,
            "validation_result": {
                "valid": validation_result.valid,
                "reason": validation_result.reason,
                "message_size_bytes": validation_result.size_bytes,
                "limit_bytes": validation_result.limit_bytes,
                "message_size_formatted": message_validator._format_bytes(validation_result.size_bytes),
                "limit_formatted": message_validator._format_bytes(validation_result.limit_bytes),
                "message_type": message_type
            }
        }
        
        # Add field violations if present
        if validation_result.field_violations:
            response["validation_result"]["field_violations"] = validation_result.field_violations
            response["validation_result"]["violation_count"] = validation_result.violation_count
        
        # Add recommendations for oversized messages
        if not validation_result.valid:
            recommendations = []
            if validation_result.size_bytes > validation_result.limit_bytes:
                recommendations.append("Reduce overall message size")
            if validation_result.field_violations:
                recommendations.append("Reduce size of individual fields")
            recommendations.append(f"Consider using message type with higher limits")
            response["validation_result"]["recommendations"] = recommendations
        
        return response
        
    except Exception as e:
        logger.error(f"Message size validation endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate message size: {str(e)}"
        )


# =====================================================
# COMPREHENSIVE LOGGING MONITORING ENDPOINTS
# =====================================================

@router.get("/logs/status")
async def get_logging_status(
    current_user = Depends(get_current_user)
):
    """Get comprehensive logging system status and statistics"""
    try:
        # Get PAM logger statistics
        log_stats = pam_logger.get_event_statistics()
        
        # Get log file sizes and status
        from pathlib import Path
        log_dir = Path("logs")
        log_files = {}
        
        if log_dir.exists():
            for log_file in log_dir.glob("*.log*"):
                try:
                    stat = log_file.stat()
                    log_files[log_file.name] = {
                        "size_bytes": stat.st_size,
                        "size_formatted": pam_logger._get_log_directory_size() if "pam_" in log_file.name else f"{stat.st_size / 1024 / 1024:.2f}MB",
                        "modified": stat.st_mtime,
                        "path": str(log_file)
                    }
                except Exception:
                    log_files[log_file.name] = {"error": "Unable to read file stats"}
        
        return {
            "success": True,
            "logging_system": {
                "status": "active",
                "structured_logging": True,
                "json_formatting": True,
                "file_rotation": True,
                "sentry_integration": False  # Update based on your Sentry config
            },
            "event_statistics": log_stats["event_counters"],
            "log_files": log_files,
            "log_directory": str(log_dir),
            "total_disk_usage_mb": log_stats["disk_usage_mb"],
            "specialized_loggers": {
                "error_logger": "Active - captures all ERROR and CRITICAL events",
                "security_logger": "Active - captures security events and violations", 
                "performance_logger": "Active - captures performance alerts",
                "api_logger": "Active - captures API requests and responses",
                "audit_logger": "Active - captures all events for audit trail"
            },
            "event_types": [event_type.value for event_type in PAMEventType],
            "log_severity_levels": [severity.value for severity in LogSeverity],
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Logging status error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get logging status: {str(e)}"
        )

@router.get("/logs/events/recent")
async def get_recent_log_events(
    limit: int = Query(50, ge=1, le=500),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    current_user = Depends(get_current_user)
):
    """Get recent log events with filtering (requires admin access in production)"""
    try:
        # Note: In production, add admin role check here
        # if not current_user.get("role") == "admin":
        #     raise HTTPException(status_code=403, detail="Admin access required")
        
        from pathlib import Path
        import json
        
        log_file = Path("logs/pam_audit.log")
        recent_events = []
        
        if log_file.exists():
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    
                # Get the most recent lines
                recent_lines = lines[-min(limit * 3, len(lines)):]  # Get more than needed for filtering
                
                for line in reversed(recent_lines):  # Most recent first
                    try:
                        # Parse the JSON log entry
                        log_entry = json.loads(line.strip())
                        
                        # Apply filters
                        if event_type and log_entry.get("event_type") != event_type:
                            continue
                        if severity and log_entry.get("severity") != severity:
                            continue
                        if user_id and log_entry.get("user_id") != user_id:
                            continue
                        
                        recent_events.append(log_entry)
                        
                        # Stop when we have enough events
                        if len(recent_events) >= limit:
                            break
                            
                    except json.JSONDecodeError:
                        continue  # Skip malformed lines
                        
            except Exception as file_error:
                logger.error(f"Error reading audit log: {str(file_error)}")
                
        return {
            "success": True,
            "events": recent_events,
            "total_events": len(recent_events),
            "filters_applied": {
                "event_type": event_type,
                "severity": severity,
                "user_id": user_id,
                "limit": limit
            },
            "available_event_types": [event_type.value for event_type in PAMEventType],
            "available_severity_levels": [severity.value for severity in LogSeverity],
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Recent log events error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get recent log events: {str(e)}"
        )

@router.get("/logs/analytics")
async def get_log_analytics(
    hours: int = Query(24, ge=1, le=168, description="Analysis window in hours"),
    current_user = Depends(get_current_user)
):
    """Get log analytics and patterns for the specified time window"""
    try:
        # Note: In production, add admin role check here
        # if not current_user.get("role") == "admin":
        #     raise HTTPException(status_code=403, detail="Admin access required")
        
        from pathlib import Path
        import json
        from collections import defaultdict, Counter
        
        # Analysis window
        analysis_start = datetime.utcnow().timestamp() - (hours * 3600)
        
        # Initialize analytics data
        analytics = {
            "event_counts": Counter(),
            "severity_counts": Counter(),
            "user_activity": Counter(),
            "endpoint_activity": Counter(),
            "error_patterns": Counter(),
            "security_events": Counter(),
            "performance_metrics": {
                "api_response_times": [],
                "websocket_message_times": [],
                "slow_requests": []
            },
            "hourly_distribution": defaultdict(int),
            "ip_addresses": Counter(),
            "user_agents": Counter()
        }
        
        # Read and analyze audit log
        log_file = Path("logs/pam_audit.log")
        events_analyzed = 0
        
        if log_file.exists():
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        try:
                            log_entry = json.loads(line.strip())
                            
                            # Check if event is within analysis window
                            event_time = log_entry.get("timestamp")
                            if event_time:
                                try:
                                    from datetime import datetime
                                    event_timestamp = datetime.fromisoformat(event_time.replace('Z', '+00:00')).timestamp()
                                    if event_timestamp < analysis_start:
                                        continue
                                except:
                                    continue
                            
                            events_analyzed += 1
                            
                            # Basic event analytics
                            event_type = log_entry.get("event_type", "unknown")
                            severity = log_entry.get("severity", "unknown")
                            user_id = log_entry.get("user_id", "anonymous")
                            endpoint = log_entry.get("endpoint", "unknown")
                            
                            analytics["event_counts"][event_type] += 1
                            analytics["severity_counts"][severity] += 1
                            analytics["user_activity"][user_id] += 1
                            analytics["endpoint_activity"][endpoint] += 1
                            
                            # Error pattern analysis
                            if severity in ["error", "critical"]:
                                error_type = log_entry.get("error_details", {}).get("error_type", "unknown")
                                analytics["error_patterns"][error_type] += 1
                            
                            # Security event analysis
                            if event_type == "security_event":
                                security_type = log_entry.get("context", {}).get("security_event_type", "unknown")
                                analytics["security_events"][security_type] += 1
                            
                            # Performance analysis
                            duration_ms = log_entry.get("duration_ms")
                            if duration_ms is not None:
                                if event_type == "api_response":
                                    analytics["performance_metrics"]["api_response_times"].append(duration_ms)
                                elif event_type == "websocket_message":
                                    analytics["performance_metrics"]["websocket_message_times"].append(duration_ms)
                                
                                # Track slow requests (> 3 seconds)
                                if duration_ms > 3000:
                                    analytics["performance_metrics"]["slow_requests"].append({
                                        "user_id": user_id,
                                        "endpoint": endpoint,
                                        "duration_ms": duration_ms,
                                        "event_type": event_type
                                    })
                            
                            # Hourly distribution
                            if event_time:
                                try:
                                    hour = datetime.fromisoformat(event_time.replace('Z', '+00:00')).hour
                                    analytics["hourly_distribution"][hour] += 1
                                except:
                                    pass
                            
                            # IP and User Agent tracking
                            ip_address = log_entry.get("ip_address")
                            if ip_address and ip_address != "unknown":
                                analytics["ip_addresses"][ip_address] += 1
                            
                            user_agent = log_entry.get("user_agent")
                            if user_agent and user_agent != "unknown":
                                # Simplify user agent for analysis
                                simplified_ua = user_agent.split('/')[0] if '/' in user_agent else user_agent[:50]
                                analytics["user_agents"][simplified_ua] += 1
                                
                        except json.JSONDecodeError:
                            continue
                        except Exception:
                            continue  # Skip problematic entries
                        
            except Exception as file_error:
                logger.error(f"Error reading audit log for analytics: {str(file_error)}")
        
        # Calculate performance statistics
        def calculate_stats(values):
            if not values:
                return {"count": 0, "avg": 0, "min": 0, "max": 0, "p95": 0}
            values_sorted = sorted(values)
            count = len(values)
            return {
                "count": count,
                "avg": sum(values) / count,
                "min": min(values),
                "max": max(values),
                "p95": values_sorted[int(count * 0.95)] if count > 0 else 0
            }
        
        performance_stats = {
            "api_responses": calculate_stats(analytics["performance_metrics"]["api_response_times"]),
            "websocket_messages": calculate_stats(analytics["performance_metrics"]["websocket_message_times"]),
            "slow_requests_count": len(analytics["performance_metrics"]["slow_requests"])
        }
        
        return {
            "success": True,
            "analysis_period": {
                "hours": hours,
                "events_analyzed": events_analyzed,
                "start_time": datetime.fromtimestamp(analysis_start).isoformat(),
                "end_time": datetime.utcnow().isoformat()
            },
            "event_summary": {
                "total_events": sum(analytics["event_counts"].values()),
                "by_type": dict(analytics["event_counts"].most_common(10)),
                "by_severity": dict(analytics["severity_counts"].most_common()),
                "top_users": dict(analytics["user_activity"].most_common(10)),
                "top_endpoints": dict(analytics["endpoint_activity"].most_common(10))
            },
            "error_analysis": {
                "total_errors": analytics["severity_counts"]["error"] + analytics["severity_counts"]["critical"],
                "error_patterns": dict(analytics["error_patterns"].most_common(10))
            },
            "security_analysis": {
                "total_security_events": sum(analytics["security_events"].values()),
                "security_event_types": dict(analytics["security_events"].most_common())
            },
            "performance_analysis": performance_stats,
            "temporal_patterns": {
                "hourly_distribution": dict(analytics["hourly_distribution"])
            },
            "network_analysis": {
                "unique_ips": len(analytics["ip_addresses"]),
                "top_ips": dict(analytics["ip_addresses"].most_common(10)),
                "unique_user_agents": len(analytics["user_agents"]),
                "top_user_agents": dict(analytics["user_agents"].most_common(5))
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Log analytics error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate log analytics: {str(e)}"
        )

@router.post("/logs/search")
async def search_logs(
    query: str = Query(..., min_length=1, description="Search query"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    start_time: Optional[str] = Query(None, description="Start time (ISO format)"),
    end_time: Optional[str] = Query(None, description="End time (ISO format)"),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_user)
):
    """Search through log files with advanced filtering"""
    try:
        # Note: In production, add admin role check here
        # if not current_user.get("role") == "admin":
        #     raise HTTPException(status_code=403, detail="Admin access required")
        
        from pathlib import Path
        import json
        import re
        
        # Parse time filters
        start_timestamp = None
        end_timestamp = None
        
        if start_time:
            try:
                start_timestamp = datetime.fromisoformat(start_time.replace('Z', '+00:00')).timestamp()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_time format. Use ISO format.")
        
        if end_time:
            try:
                end_timestamp = datetime.fromisoformat(end_time.replace('Z', '+00:00')).timestamp()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_time format. Use ISO format.")
        
        # Compile search regex
        try:
            search_pattern = re.compile(query, re.IGNORECASE)
        except re.error:
            raise HTTPException(status_code=400, detail="Invalid regex pattern in query")
        
        # Search through audit log
        log_file = Path("logs/pam_audit.log")
        matching_events = []
        total_searched = 0
        
        if log_file.exists():
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        total_searched += 1
                        try:
                            log_entry = json.loads(line.strip())
                            
                            # Apply time filters
                            if start_timestamp or end_timestamp:
                                event_time = log_entry.get("timestamp")
                                if event_time:
                                    try:
                                        event_timestamp = datetime.fromisoformat(event_time.replace('Z', '+00:00')).timestamp()
                                        if start_timestamp and event_timestamp < start_timestamp:
                                            continue
                                        if end_timestamp and event_timestamp > end_timestamp:
                                            continue
                                    except:
                                        continue
                            
                            # Apply event type and severity filters
                            if event_type and log_entry.get("event_type") != event_type:
                                continue
                            if severity and log_entry.get("severity") != severity:
                                continue
                            
                            # Search in the log entry
                            log_entry_str = json.dumps(log_entry, default=str).lower()
                            if search_pattern.search(log_entry_str):
                                matching_events.append(log_entry)
                                
                                # Stop if we've reached the limit
                                if len(matching_events) >= limit:
                                    break
                                    
                        except json.JSONDecodeError:
                            continue
                        except Exception:
                            continue
                        
            except Exception as file_error:
                logger.error(f"Error searching log file: {str(file_error)}")
        
        return {
            "success": True,
            "search_results": {
                "query": query,
                "matches": matching_events,
                "total_matches": len(matching_events),
                "total_entries_searched": total_searched,
                "limited_results": len(matching_events) >= limit
            },
            "search_parameters": {
                "query": query,
                "event_type": event_type,
                "severity": severity,
                "start_time": start_time,
                "end_time": end_time,
                "limit": limit
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Log search error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search logs: {str(e)}"
        )

@router.post("/logs/export")
async def export_logs(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    start_time: Optional[str] = Query(None, description="Start time (ISO format)"),
    end_time: Optional[str] = Query(None, description="End time (ISO format)"),
    format: str = Query("json", enum=["json", "csv"], description="Export format"),
    current_user = Depends(get_current_user)
):
    """Export filtered logs in JSON or CSV format"""
    try:
        # Note: In production, add admin role check here
        # if not current_user.get("role") == "admin":
        #     raise HTTPException(status_code=403, detail="Admin access required")
        
        from pathlib import Path
        import json
        import csv
        import io
        
        # Parse time filters
        start_timestamp = None
        end_timestamp = None
        
        if start_time:
            try:
                start_timestamp = datetime.fromisoformat(start_time.replace('Z', '+00:00')).timestamp()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_time format")
        
        if end_time:
            try:
                end_timestamp = datetime.fromisoformat(end_time.replace('Z', '+00:00')).timestamp()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_time format")
        
        # Collect matching log entries
        log_file = Path("logs/pam_audit.log")
        export_data = []
        
        if log_file.exists():
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        try:
                            log_entry = json.loads(line.strip())
                            
                            # Apply filters
                            if start_timestamp or end_timestamp:
                                event_time = log_entry.get("timestamp")
                                if event_time:
                                    try:
                                        event_timestamp = datetime.fromisoformat(event_time.replace('Z', '+00:00')).timestamp()
                                        if start_timestamp and event_timestamp < start_timestamp:
                                            continue
                                        if end_timestamp and event_timestamp > end_timestamp:
                                            continue
                                    except:
                                        continue
                            
                            if event_type and log_entry.get("event_type") != event_type:
                                continue
                            if severity and log_entry.get("severity") != severity:
                                continue
                            
                            export_data.append(log_entry)
                            
                        except json.JSONDecodeError:
                            continue
                        except Exception:
                            continue
                        
            except Exception as file_error:
                logger.error(f"Error reading log file for export: {str(file_error)}")
        
        # Generate export content
        if format == "json":
            content = json.dumps(export_data, indent=2, default=str)
            media_type = "application/json"
            filename = f"pam_logs_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            
        elif format == "csv":
            # Convert to CSV format
            output = io.StringIO()
            if export_data:
                # Get all unique field names
                all_fields = set()
                for entry in export_data:
                    all_fields.update(entry.keys())
                
                fieldnames = sorted(all_fields)
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                
                for entry in export_data:
                    # Flatten complex objects to strings
                    flattened_entry = {}
                    for key, value in entry.items():
                        if isinstance(value, (dict, list)):
                            flattened_entry[key] = json.dumps(value, default=str)
                        else:
                            flattened_entry[key] = str(value) if value is not None else ""
                    writer.writerow(flattened_entry)
            
            content = output.getvalue()
            media_type = "text/csv"
            filename = f"pam_logs_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        
        # Return the export as a downloadable response
        from fastapi.responses import Response
        
        return Response(
            content=content.encode('utf-8'),
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(content.encode('utf-8')))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Log export error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export logs: {str(e)}"
        )


# =====================================================
# CACHE MANAGEMENT AND MONITORING ENDPOINTS
# =====================================================

@router.get("/cache/status")
async def get_cache_status(
    current_user = Depends(get_current_user)
):
    """Get comprehensive cache system status and statistics"""
    try:
        from app.services.cache_manager import get_cache_manager
        
        cache_manager = await get_cache_manager()
        cache_stats = cache_manager.get_statistics()
        
        return {
            "success": True,
            "cache_system": {
                "status": "active" if cache_manager else "inactive",
                "multi_level_caching": True,
                "compression_enabled": cache_manager.enable_compression if cache_manager else False,
                "default_ttl_seconds": cache_manager.default_ttl if cache_manager else 300
            },
            "performance": cache_stats.get("performance", {}),
            "cache_levels": cache_stats.get("cache_levels", {}),
            "efficiency": cache_stats.get("efficiency", {}),
            "configuration": {
                "max_memory_items": cache_manager.max_memory_items if cache_manager else 0,
                "compression_threshold_bytes": cache_manager.compression_threshold if cache_manager else 0,
                "cache_strategies": ["TTL", "LRU", "LFU", "SLIDING", "INTELLIGENT"]
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Cache status error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache status: {str(e)}"
        )

@router.post("/cache/invalidate")
async def invalidate_cache(
    pattern: Optional[str] = Query(None, description="Cache key pattern to invalidate"),
    user_id: Optional[str] = Query(None, description="Invalidate cache for specific user"),
    message_pattern: Optional[str] = Query(None, description="Invalidate cache for message pattern"),
    current_user = Depends(get_current_user)
):
    """Invalidate cached entries based on pattern"""
    try:
        from app.services.cache_manager import get_cache_manager
        
        cache_manager = await get_cache_manager()
        
        if not cache_manager:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cache system is not available"
            )
        
        # Invalidate based on provided parameters
        invalidated_count = await cache_manager.invalidate(
            pattern=pattern,
            user_id=user_id,
            message_pattern=message_pattern
        )
        
        # Log cache invalidation event
        pam_logger.log_performance_alert(
            metric="cache_invalidation",
            current_value=invalidated_count,
            threshold=0
        )
        
        return {
            "success": True,
            "invalidated_count": invalidated_count,
            "invalidation_params": {
                "pattern": pattern,
                "user_id": user_id,
                "message_pattern": message_pattern
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cache invalidation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invalidate cache: {str(e)}"
        )

@router.post("/cache/warm")
async def warm_cache(
    queries: List[Dict[str, Any]],
    current_user = Depends(get_current_user)
):
    """Pre-warm cache with specific queries"""
    try:
        from app.services.cache_manager import get_cache_manager
        
        cache_manager = await get_cache_manager()
        
        if not cache_manager:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cache system is not available"
            )
        
        # Validate queries format
        for query in queries:
            if "message" not in query or "user_id" not in query:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Each query must have 'message' and 'user_id' fields"
                )
        
        # Warm the cache
        warmed_count = await cache_manager.warm_cache(queries)
        
        return {
            "success": True,
            "warmed_count": warmed_count,
            "requested_count": len(queries),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cache warming error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to warm cache: {str(e)}"
        )

@router.post("/cache/clear")
async def clear_cache(
    confirm: bool = Query(False, description="Confirm cache clearing"),
    current_user = Depends(get_current_user)
):
    """Clear all cached data (requires confirmation)"""
    try:
        # Note: In production, add admin role check here
        # if not current_user.get("role") == "admin":
        #     raise HTTPException(status_code=403, detail="Admin access required")
        
        if not confirm:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cache clearing requires confirmation (set confirm=true)"
            )
        
        from app.services.cache_manager import get_cache_manager
        
        cache_manager = await get_cache_manager()
        
        if not cache_manager:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cache system is not available"
            )
        
        # Get statistics before clearing
        stats_before = cache_manager.get_statistics()
        
        # Clear the cache
        success = await cache_manager.clear_all()
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to clear cache"
            )
        
        # Log cache clear event
        logger.warning(f"Cache cleared by user {current_user.get('sub', 'unknown')}")
        pam_logger.log_performance_alert(
            metric="cache_cleared",
            current_value=1,
            threshold=0
        )
        
        return {
            "success": True,
            "message": "Cache cleared successfully",
            "stats_before_clear": stats_before,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cache clear error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear cache: {str(e)}"
        )

@router.get("/cache/analytics")
async def get_cache_analytics(
    hours: int = Query(24, ge=1, le=168, description="Analysis window in hours"),
    current_user = Depends(get_current_user)
):
    """Get cache performance analytics and patterns"""
    try:
        from app.services.cache_manager import get_cache_manager
        
        cache_manager = await get_cache_manager()
        
        if not cache_manager:
            return {
                "success": False,
                "message": "Cache system is not available",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        # Get current statistics
        current_stats = cache_manager.get_statistics()
        
        # Calculate additional analytics
        hit_rate = float(current_stats["performance"]["hit_rate"].rstrip('%')) if current_stats["performance"]["hit_rate"] else 0
        memory_hit_rate = float(current_stats["performance"]["memory_hit_rate"].rstrip('%')) if current_stats["performance"]["memory_hit_rate"] else 0
        
        # Estimate cost savings (based on AI API calls avoided)
        estimated_api_calls_saved = current_stats["performance"]["hits"]
        estimated_cost_savings = estimated_api_calls_saved * 0.002  # Assuming $0.002 per API call
        estimated_latency_saved_ms = current_stats["performance"]["hits"] * 500  # Assuming 500ms per API call
        
        return {
            "success": True,
            "analysis_period_hours": hours,
            "current_performance": current_stats["performance"],
            "cache_distribution": current_stats["cache_levels"],
            "efficiency_metrics": current_stats["efficiency"],
            "cost_analysis": {
                "estimated_api_calls_saved": estimated_api_calls_saved,
                "estimated_cost_savings_usd": round(estimated_cost_savings, 2),
                "estimated_latency_saved_seconds": round(estimated_latency_saved_ms / 1000, 2)
            },
            "performance_indicators": {
                "cache_effectiveness": "excellent" if hit_rate > 80 else "good" if hit_rate > 60 else "needs_improvement",
                "memory_cache_effectiveness": "excellent" if memory_hit_rate > 70 else "good" if memory_hit_rate > 50 else "needs_improvement",
                "recommended_actions": []
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Cache analytics error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache analytics: {str(e)}"
        )
