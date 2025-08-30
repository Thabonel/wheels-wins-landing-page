"""
PAM AI SDK Endpoint
Vercel AI SDK compatible endpoint for streaming chat responses
"""

import os
import json
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
import asyncio
from datetime import datetime

from app.api.deps import get_current_user
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = "gpt-4o-mini"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000
    stream: Optional[bool] = True

class ChatResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Dict[str, Any]]

async def stream_openai_response(messages: List[Dict[str, str]], model: str, temperature: float, max_tokens: int):
    """Stream responses from OpenAI API in AI SDK compatible format"""
    
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    headers = {
        "Authorization": f"Bearer {openai_api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True
    }
    
    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30.0
        ) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                logger.error(f"OpenAI API error: {error_text}")
                raise HTTPException(status_code=response.status_code, detail="OpenAI API error")
            
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]  # Remove "data: " prefix
                    if data == "[DONE]":
                        yield f"data: [DONE]\n\n"
                        break
                    yield f"data: {data}\n\n"

async def stream_anthropic_response(messages: List[Dict[str, str]], model: str, temperature: float, max_tokens: int):
    """Stream responses from Anthropic API in AI SDK compatible format"""
    
    anthropic_api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC-WHEELS-KEY")
    if not anthropic_api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")
    
    headers = {
        "x-api-key": anthropic_api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
    }
    
    # Convert messages to Anthropic format
    system_message = ""
    anthropic_messages = []
    
    for msg in messages:
        if msg["role"] == "system":
            system_message = msg["content"]
        else:
            anthropic_messages.append({
                "role": "user" if msg["role"] == "user" else "assistant",
                "content": msg["content"]
            })
    
    payload = {
        "model": model if model.startswith("claude") else "claude-3-sonnet-20240229",
        "messages": anthropic_messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True
    }
    
    if system_message:
        payload["system"] = system_message
    
    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=payload,
            timeout=30.0
        ) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                logger.error(f"Anthropic API error: {error_text}")
                raise HTTPException(status_code=response.status_code, detail="Anthropic API error")
            
            # Convert Anthropic SSE to OpenAI-compatible format for AI SDK
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    try:
                        event = json.loads(data)
                        
                        # Convert Anthropic events to OpenAI format
                        if event.get("type") == "content_block_delta":
                            openai_event = {
                                "id": "chatcmpl-" + str(datetime.now().timestamp()),
                                "object": "chat.completion.chunk",
                                "created": int(datetime.now().timestamp()),
                                "model": model,
                                "choices": [{
                                    "index": 0,
                                    "delta": {
                                        "content": event.get("delta", {}).get("text", "")
                                    },
                                    "finish_reason": None
                                }]
                            }
                            yield f"data: {json.dumps(openai_event)}\n\n"
                        
                        elif event.get("type") == "message_stop":
                            openai_event = {
                                "id": "chatcmpl-" + str(datetime.now().timestamp()),
                                "object": "chat.completion.chunk",
                                "created": int(datetime.now().timestamp()),
                                "model": model,
                                "choices": [{
                                    "index": 0,
                                    "delta": {},
                                    "finish_reason": "stop"
                                }]
                            }
                            yield f"data: {json.dumps(openai_event)}\n\n"
                            yield "data: [DONE]\n\n"
                            
                    except json.JSONDecodeError:
                        continue

@router.post("/chat")
async def chat_completion(
    request: ChatRequest,
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """
    AI SDK compatible chat endpoint with streaming support
    Supports both OpenAI and Anthropic models
    """
    
    try:
        # Convert messages to dict format
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Log the request
        logger.info(f"AI SDK chat request - User: {current_user.get('id') if current_user else 'anonymous'}, Model: {request.model}")
        
        # Determine which API to use based on model
        if request.model.startswith("claude"):
            # Use Anthropic API
            if request.stream:
                return StreamingResponse(
                    stream_anthropic_response(
                        messages,
                        request.model,
                        request.temperature,
                        request.max_tokens
                    ),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "X-Accel-Buffering": "no"  # Disable nginx buffering
                    }
                )
            else:
                # Non-streaming Anthropic response
                raise HTTPException(status_code=501, detail="Non-streaming Anthropic not implemented yet")
        
        else:
            # Use OpenAI API
            if request.stream:
                return StreamingResponse(
                    stream_openai_response(
                        messages,
                        request.model,
                        request.temperature,
                        request.max_tokens
                    ),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "X-Accel-Buffering": "no"  # Disable nginx buffering
                    }
                )
            else:
                # Non-streaming OpenAI response
                raise HTTPException(status_code=501, detail="Non-streaming OpenAI not implemented yet")
    
    except Exception as e:
        logger.error(f"Chat completion error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """Health check for AI SDK endpoint"""
    return {
        "status": "healthy",
        "service": "pam-ai-sdk",
        "timestamp": datetime.now().isoformat(),
        "models_available": [
            "gpt-4o-mini",
            "gpt-4o",
            "claude-3-sonnet-20240229",
            "claude-3-opus-20240229"
        ]
    }