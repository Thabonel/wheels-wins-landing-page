"""
Message Size Validation Middleware for PAM API

Provides comprehensive message size validation with:
- Different size limits for different message types
- Smart content analysis and validation
- Memory-efficient size checking
- Detailed error reporting
- Integration with security middleware
"""

import json
import sys
from typing import Dict, Any, Tuple, Optional, Union
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class MessageType(Enum):
    """Types of messages with different size requirements"""
    WEBSOCKET_TEXT = "websocket_text"
    WEBSOCKET_JSON = "websocket_json"
    REST_API_CHAT = "rest_api_chat"
    VOICE_SYNTHESIS = "voice_synthesis"
    FEEDBACK = "feedback"
    FILE_UPLOAD = "file_upload"
    ATTACHMENT = "attachment"
    CONTEXT_DATA = "context_data"

class MessageSizeConfig:
    """Configuration for message size limits"""
    
    # Base limits (in bytes)
    LIMITS = {
        MessageType.WEBSOCKET_TEXT: 65536,      # 64KB - WebSocket text messages
        MessageType.WEBSOCKET_JSON: 131072,     # 128KB - WebSocket JSON messages  
        MessageType.REST_API_CHAT: 32768,       # 32KB - REST API chat messages
        MessageType.VOICE_SYNTHESIS: 10240,     # 10KB - Voice synthesis text
        MessageType.FEEDBACK: 4096,             # 4KB - Feedback submissions
        MessageType.FILE_UPLOAD: 10485760,      # 10MB - File uploads
        MessageType.ATTACHMENT: 5242880,        # 5MB - Attachment references
        MessageType.CONTEXT_DATA: 16384,        # 16KB - Context/metadata
    }
    
    # Character limits for text content
    CHARACTER_LIMITS = {
        MessageType.WEBSOCKET_TEXT: 10000,      # 10K characters
        MessageType.REST_API_CHAT: 5000,        # 5K characters  
        MessageType.VOICE_SYNTHESIS: 2000,      # 2K characters (reasonable for TTS)
        MessageType.FEEDBACK: 1000,             # 1K characters
        MessageType.CONTEXT_DATA: 2000,         # 2K characters
    }
    
    # Field-specific limits
    FIELD_LIMITS = {
        'message': 5000,           # Main message content
        'content': 5000,           # Alternative message field
        'title': 200,              # Titles and subjects
        'description': 1000,       # Descriptions
        'feedback_text': 1000,     # Feedback text
        'user_id': 100,            # User identifiers
        'session_id': 100,         # Session identifiers
        'filename': 255,           # File names
        'url': 2048,               # URLs and links
    }

class MessageSizeValidationResult:
    """Result of message size validation"""
    
    def __init__(self, valid: bool, reason: str = "", size_bytes: int = 0, 
                 limit_bytes: int = 0, field_violations: Dict[str, str] = None):
        self.valid = valid
        self.reason = reason
        self.size_bytes = size_bytes
        self.limit_bytes = limit_bytes
        self.field_violations = field_violations or {}
        self.violation_count = len(self.field_violations)

class MessageSizeValidator:
    """Advanced message size validator with comprehensive checking"""
    
    def __init__(self):
        self.config = MessageSizeConfig()
        self.validation_stats = {
            "total_validations": 0,
            "size_violations": 0,
            "field_violations": 0,
            "largest_message_seen": 0
        }
        
    def validate_message(self, 
                        message_data: Union[str, dict, bytes], 
                        message_type: MessageType,
                        user_id: Optional[str] = None) -> MessageSizeValidationResult:
        """
        Comprehensive message size validation
        
        Args:
            message_data: The message content to validate
            message_type: Type of message for appropriate limits
            user_id: User ID for logging purposes
            
        Returns:
            MessageSizeValidationResult with validation details
        """
        self.validation_stats["total_validations"] += 1
        
        try:
            # Convert message to bytes for accurate size measurement
            if isinstance(message_data, str):
                message_bytes = message_data.encode('utf-8')
                message_size = len(message_bytes)
            elif isinstance(message_data, dict):
                # Serialize to JSON for size calculation
                json_str = json.dumps(message_data, separators=(',', ':'))
                message_bytes = json_str.encode('utf-8')
                message_size = len(message_bytes)
            elif isinstance(message_data, bytes):
                message_bytes = message_data
                message_size = len(message_bytes)
            else:
                # Convert to string representation
                str_repr = str(message_data)
                message_bytes = str_repr.encode('utf-8')
                message_size = len(message_bytes)
            
            # Update statistics
            if message_size > self.validation_stats["largest_message_seen"]:
                self.validation_stats["largest_message_seen"] = message_size
            
            # Get size limit for this message type
            size_limit = self.config.LIMITS.get(message_type, self.config.LIMITS[MessageType.WEBSOCKET_TEXT])
            
            # Check overall size limit
            if message_size > size_limit:
                self.validation_stats["size_violations"] += 1
                logger.warning(f"Message size violation: {message_size} bytes > {size_limit} bytes limit for {message_type.value}")
                
                return MessageSizeValidationResult(
                    valid=False,
                    reason=f"Message size {self._format_bytes(message_size)} exceeds limit of {self._format_bytes(size_limit)} for {message_type.value}",
                    size_bytes=message_size,
                    limit_bytes=size_limit
                )
            
            # If it's a dictionary, validate individual fields
            field_violations = {}
            if isinstance(message_data, dict):
                field_violations = self._validate_dict_fields(message_data)
                
                if field_violations:
                    self.validation_stats["field_violations"] += 1
                    logger.warning(f"Field size violations for user {user_id}: {field_violations}")
                    
                    return MessageSizeValidationResult(
                        valid=False,
                        reason="One or more fields exceed size limits",
                        size_bytes=message_size,
                        limit_bytes=size_limit,
                        field_violations=field_violations
                    )
            
            # Validation passed
            return MessageSizeValidationResult(
                valid=True,
                reason="Message size validation passed",
                size_bytes=message_size,
                limit_bytes=size_limit
            )
            
        except Exception as e:
            logger.error(f"Message size validation error: {str(e)}")
            return MessageSizeValidationResult(
                valid=False,
                reason=f"Validation error: {str(e)}",
                size_bytes=0,
                limit_bytes=0
            )
    
    def _validate_dict_fields(self, data: dict) -> Dict[str, str]:
        """Validate individual fields in a dictionary"""
        violations = {}
        
        for field_name, field_value in data.items():
            if isinstance(field_value, str):
                field_limit = self.config.FIELD_LIMITS.get(field_name)
                if field_limit and len(field_value) > field_limit:
                    violations[field_name] = f"Field '{field_name}' length {len(field_value)} exceeds limit {field_limit}"
            
            elif isinstance(field_value, (list, dict)):
                # Check nested structures
                try:
                    nested_json = json.dumps(field_value)
                    nested_size = len(nested_json.encode('utf-8'))
                    
                    # Use a reasonable limit for nested structures
                    nested_limit = 16384  # 16KB for nested data
                    if nested_size > nested_limit:
                        violations[field_name] = f"Nested field '{field_name}' size {self._format_bytes(nested_size)} exceeds limit {self._format_bytes(nested_limit)}"
                        
                except Exception as e:
                    violations[field_name] = f"Could not validate nested field '{field_name}': {str(e)}"
        
        return violations
    
    def _format_bytes(self, bytes_count: int) -> str:
        """Format byte count in human-readable format"""
        if bytes_count < 1024:
            return f"{bytes_count}B"
        elif bytes_count < 1024 * 1024:
            return f"{bytes_count/1024:.1f}KB"
        elif bytes_count < 1024 * 1024 * 1024:
            return f"{bytes_count/(1024*1024):.1f}MB"
        else:
            return f"{bytes_count/(1024*1024*1024):.1f}GB"
    
    def validate_text_content(self, text: str, message_type: MessageType) -> MessageSizeValidationResult:
        """Validate text content with character limits"""
        if not isinstance(text, str):
            return MessageSizeValidationResult(
                valid=False,
                reason="Content must be a string"
            )
        
        # Check character limit
        char_limit = self.config.CHARACTER_LIMITS.get(message_type)
        if char_limit and len(text) > char_limit:
            return MessageSizeValidationResult(
                valid=False,
                reason=f"Text length {len(text)} characters exceeds limit of {char_limit} for {message_type.value}",
                size_bytes=len(text.encode('utf-8'))
            )
        
        # Also check byte size
        return self.validate_message(text, message_type)
    
    def validate_json_size(self, json_data: dict, message_type: MessageType = MessageType.WEBSOCKET_JSON) -> MessageSizeValidationResult:
        """Validate JSON data size efficiently"""
        return self.validate_message(json_data, message_type)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get validation statistics"""
        return {
            **self.validation_stats,
            "message_limits": {
                msg_type.value: {
                    "bytes_limit": limit,
                    "formatted_limit": self._format_bytes(limit)
                }
                for msg_type, limit in self.config.LIMITS.items()
            },
            "character_limits": {
                msg_type.value: limit
                for msg_type, limit in self.config.CHARACTER_LIMITS.items()
            },
            "field_limits": dict(self.config.FIELD_LIMITS)
        }
    
    def reset_statistics(self):
        """Reset validation statistics"""
        self.validation_stats = {
            "total_validations": 0,
            "size_violations": 0,
            "field_violations": 0,
            "largest_message_seen": 0
        }

# Global message size validator instance
message_validator = MessageSizeValidator()

# Convenience functions for different message types
async def validate_websocket_message(message_data: Union[str, dict], user_id: str = None) -> MessageSizeValidationResult:
    """Validate WebSocket message size"""
    message_type = MessageType.WEBSOCKET_JSON if isinstance(message_data, dict) else MessageType.WEBSOCKET_TEXT
    return message_validator.validate_message(message_data, message_type, user_id)

async def validate_rest_api_message(message_data: dict, user_id: str = None) -> MessageSizeValidationResult:
    """Validate REST API message size"""
    return message_validator.validate_message(message_data, MessageType.REST_API_CHAT, user_id)

async def validate_voice_text(text: str, user_id: str = None) -> MessageSizeValidationResult:
    """Validate voice synthesis text size"""
    return message_validator.validate_text_content(text, MessageType.VOICE_SYNTHESIS)

async def validate_feedback_message(feedback_data: dict, user_id: str = None) -> MessageSizeValidationResult:
    """Validate feedback message size"""
    return message_validator.validate_message(feedback_data, MessageType.FEEDBACK, user_id)

async def validate_context_data(context_data: dict, user_id: str = None) -> MessageSizeValidationResult:
    """Validate context data size"""
    return message_validator.validate_message(context_data, MessageType.CONTEXT_DATA, user_id)

# Legacy compatibility functions
def validate_websocket_message_size(data: dict) -> Tuple[bool, str]:
    """Legacy compatibility function for existing code"""
    result = message_validator.validate_message(data, MessageType.WEBSOCKET_JSON)
    return result.valid, result.reason if not result.valid else "Valid"