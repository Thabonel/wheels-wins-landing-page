"""
Advanced Input Validation Middleware
Comprehensive request validation with schema validation, sanitization, and security checks.
"""

import json
import re
import html
import urllib.parse
from typing import Dict, List, Any, Optional, Union, Type
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from pydantic import BaseModel, ValidationError
from app.core.logging import get_logger

logger = get_logger(__name__)


class ValidationRuleType(Enum):
    """Types of validation rules"""
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    EMAIL = "email"
    UUID = "uuid"
    URL = "url"
    DATE = "date"
    DATETIME = "datetime"
    ARRAY = "array"
    OBJECT = "object"


@dataclass
class ValidationRule:
    """Individual validation rule"""
    field_name: str
    rule_type: ValidationRuleType
    required: bool = False
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[Union[int, float]] = None
    max_value: Optional[Union[int, float]] = None
    pattern: Optional[str] = None
    allowed_values: Optional[List[str]] = None
    sanitize: bool = True
    custom_validator: Optional[callable] = None


class RequestValidator:
    """Advanced request validator with security-focused validation"""
    
    def __init__(self):
        # Predefined validation schemas for common endpoints
        self.validation_schemas = {
            "/api/auth/login": [
                ValidationRule("email", ValidationRuleType.EMAIL, required=True, max_length=255),
                ValidationRule("password", ValidationRuleType.STRING, required=True, min_length=8, max_length=128),
            ],
            "/api/auth/signup": [
                ValidationRule("email", ValidationRuleType.EMAIL, required=True, max_length=255),
                ValidationRule("password", ValidationRuleType.STRING, required=True, min_length=8, max_length=128),
                ValidationRule("full_name", ValidationRuleType.STRING, required=True, min_length=2, max_length=100),
                ValidationRule("terms_accepted", ValidationRuleType.BOOLEAN, required=True),
            ],
            "/api/expenses": [
                ValidationRule("amount", ValidationRuleType.FLOAT, required=True, min_value=0.01, max_value=1000000),
                ValidationRule("description", ValidationRuleType.STRING, required=True, min_length=1, max_length=500),
                ValidationRule("category", ValidationRuleType.STRING, required=True, max_length=50),
                ValidationRule("date", ValidationRuleType.DATE, required=True),
                ValidationRule("tags", ValidationRuleType.ARRAY, required=False),
            ],
            "/api/social/posts": [
                ValidationRule("content", ValidationRuleType.STRING, required=True, min_length=1, max_length=5000),
                ValidationRule("visibility", ValidationRuleType.STRING, required=False, allowed_values=["public", "friends", "private"]),
                ValidationRule("tags", ValidationRuleType.ARRAY, required=False),
                ValidationRule("location", ValidationRuleType.STRING, required=False, max_length=200),
            ],
            "/api/pam/chat": [
                ValidationRule("message", ValidationRuleType.STRING, required=True, min_length=1, max_length=10000),
                ValidationRule("context", ValidationRuleType.OBJECT, required=False),
                ValidationRule("session_id", ValidationRuleType.UUID, required=False),
            ],
            "/api/profiles": [
                ValidationRule("full_name", ValidationRuleType.STRING, required=False, min_length=2, max_length=100),
                ValidationRule("bio", ValidationRuleType.STRING, required=False, max_length=1000),
                ValidationRule("location", ValidationRuleType.STRING, required=False, max_length=200),
                ValidationRule("website", ValidationRuleType.URL, required=False),
                ValidationRule("birth_date", ValidationRuleType.DATE, required=False),
            ]
        }
        
        # Dangerous patterns to detect
        self.dangerous_patterns = [
            r"<\s*script[^>]*>.*?</\s*script\s*>",  # Script tags
            r"javascript\s*:",                        # JavaScript protocol
            r"vbscript\s*:",                         # VBScript protocol
            r"data\s*:.*?base64",                    # Data URI with base64
            r"on\w+\s*=",                           # Event handlers (onclick, onload, etc.)
            r"expression\s*\(",                      # CSS expressions
            r"eval\s*\(",                           # JavaScript eval
            r"<\s*iframe[^>]*>",                    # Iframe tags
            r"<\s*object[^>]*>",                    # Object tags
            r"<\s*embed[^>]*>",                     # Embed tags
            r"<\s*link[^>]*>",                      # Link tags
            r"<\s*meta[^>]*>",                      # Meta tags
            r"@import",                             # CSS imports
            r"\.\.[\\/]",                           # Path traversal
            r"\x00",                                # Null bytes
        ]
        
        # Compile patterns for performance
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.dangerous_patterns]
    
    def validate_request(self, request: Request, body: str) -> Optional[Dict[str, Any]]:
        """Validate request against defined schema"""
        
        # Get validation schema for endpoint
        schema = self._get_validation_schema(request.url.path, request.method)
        if not schema:
            # No specific schema, perform basic security validation
            return self._basic_security_validation(request, body)
        
        try:
            # Parse request body for POST/PUT/PATCH requests
            if request.method in ["POST", "PUT", "PATCH"] and body:
                try:
                    data = json.loads(body)
                except json.JSONDecodeError:
                    return {
                        "error": "Invalid JSON",
                        "message": "Request body must be valid JSON",
                        "field": "body"
                    }
            else:
                data = {}
            
            # Add query parameters to validation data
            for key, value in request.query_params.items():
                data[key] = value
            
            # Validate against schema
            validation_errors = []
            sanitized_data = {}
            
            for rule in schema:
                field_value = data.get(rule.field_name)
                
                # Check required fields
                if rule.required and (field_value is None or field_value == ""):
                    validation_errors.append({
                        "field": rule.field_name,
                        "error": "required",
                        "message": f"Field '{rule.field_name}' is required"
                    })
                    continue
                
                # Skip validation if field is optional and not provided
                if field_value is None or field_value == "":
                    continue
                
                # Validate field
                field_error = self._validate_field(field_value, rule)
                if field_error:
                    validation_errors.append({
                        "field": rule.field_name,
                        "error": field_error["type"],
                        "message": field_error["message"]
                    })
                else:
                    # Sanitize and store valid field
                    sanitized_data[rule.field_name] = self._sanitize_field(field_value, rule)
            
            # Return validation errors if any
            if validation_errors:
                return {
                    "error": "Validation Error",
                    "message": "One or more fields failed validation",
                    "validation_errors": validation_errors
                }
            
            # Store sanitized data in request state
            request.state.validated_data = sanitized_data
            
            return None  # No errors
        
        except Exception as e:
            logger.error(f"Request validation error: {e}")
            return {
                "error": "Validation Error",
                "message": "Failed to validate request",
                "details": str(e)
            }
    
    def _get_validation_schema(self, path: str, method: str) -> Optional[List[ValidationRule]]:
        """Get validation schema for endpoint"""
        # Try exact match first
        key = f"{method.upper()} {path}"
        if key in self.validation_schemas:
            return self.validation_schemas[key]
        
        # Try path-only match
        if path in self.validation_schemas:
            return self.validation_schemas[path]
        
        # Try prefix matching
        for schema_path, schema in self.validation_schemas.items():
            if path.startswith(schema_path.split()[0] if ' ' in schema_path else schema_path):
                return schema
        
        return None
    
    def _validate_field(self, value: Any, rule: ValidationRule) -> Optional[Dict[str, str]]:
        """Validate individual field"""
        
        # Type validation
        if rule.rule_type == ValidationRuleType.STRING:
            if not isinstance(value, str):
                return {"type": "type_error", "message": f"Field must be a string"}
            
            # Length validation
            if rule.min_length and len(value) < rule.min_length:
                return {"type": "min_length", "message": f"Field must be at least {rule.min_length} characters"}
            if rule.max_length and len(value) > rule.max_length:
                return {"type": "max_length", "message": f"Field must be at most {rule.max_length} characters"}
            
            # Pattern validation
            if rule.pattern and not re.match(rule.pattern, value):
                return {"type": "pattern", "message": f"Field does not match required pattern"}
            
            # Allowed values validation
            if rule.allowed_values and value not in rule.allowed_values:
                return {"type": "allowed_values", "message": f"Field must be one of: {', '.join(rule.allowed_values)}"}
            
            # Security validation
            security_error = self._check_security_patterns(value)
            if security_error:
                return security_error
        
        elif rule.rule_type == ValidationRuleType.INTEGER:
            try:
                int_value = int(value)
                if rule.min_value and int_value < rule.min_value:
                    return {"type": "min_value", "message": f"Field must be at least {rule.min_value}"}
                if rule.max_value and int_value > rule.max_value:
                    return {"type": "max_value", "message": f"Field must be at most {rule.max_value}"}
            except (ValueError, TypeError):
                return {"type": "type_error", "message": "Field must be an integer"}
        
        elif rule.rule_type == ValidationRuleType.FLOAT:
            try:
                float_value = float(value)
                if rule.min_value and float_value < rule.min_value:
                    return {"type": "min_value", "message": f"Field must be at least {rule.min_value}"}
                if rule.max_value and float_value > rule.max_value:
                    return {"type": "max_value", "message": f"Field must be at most {rule.max_value}"}
            except (ValueError, TypeError):
                return {"type": "type_error", "message": "Field must be a number"}
        
        elif rule.rule_type == ValidationRuleType.BOOLEAN:
            if not isinstance(value, bool) and value not in ["true", "false", "1", "0", 1, 0]:
                return {"type": "type_error", "message": "Field must be a boolean"}
        
        elif rule.rule_type == ValidationRuleType.EMAIL:
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, str(value)):
                return {"type": "format", "message": "Field must be a valid email address"}
        
        elif rule.rule_type == ValidationRuleType.UUID:
            try:
                uuid.UUID(str(value))
            except ValueError:
                return {"type": "format", "message": "Field must be a valid UUID"}
        
        elif rule.rule_type == ValidationRuleType.URL:
            url_pattern = r'^https?://[^\s/$.?#].[^\s]*$'
            if not re.match(url_pattern, str(value)):
                return {"type": "format", "message": "Field must be a valid URL"}
        
        elif rule.rule_type == ValidationRuleType.DATE:
            try:
                datetime.strptime(str(value), '%Y-%m-%d')
            except ValueError:
                return {"type": "format", "message": "Field must be a valid date (YYYY-MM-DD)"}
        
        elif rule.rule_type == ValidationRuleType.DATETIME:
            try:
                datetime.fromisoformat(str(value).replace('Z', '+00:00'))
            except ValueError:
                return {"type": "format", "message": "Field must be a valid datetime (ISO format)"}
        
        elif rule.rule_type == ValidationRuleType.ARRAY:
            if not isinstance(value, list):
                return {"type": "type_error", "message": "Field must be an array"}
            
            # Validate array length
            if rule.min_length and len(value) < rule.min_length:
                return {"type": "min_length", "message": f"Array must have at least {rule.min_length} items"}
            if rule.max_length and len(value) > rule.max_length:
                return {"type": "max_length", "message": f"Array must have at most {rule.max_length} items"}
        
        elif rule.rule_type == ValidationRuleType.OBJECT:
            if not isinstance(value, dict):
                return {"type": "type_error", "message": "Field must be an object"}
        
        # Custom validation
        if rule.custom_validator:
            try:
                if not rule.custom_validator(value):
                    return {"type": "custom", "message": "Field failed custom validation"}
            except Exception as e:
                return {"type": "custom_error", "message": f"Custom validation error: {str(e)}"}
        
        return None
    
    def _check_security_patterns(self, value: str) -> Optional[Dict[str, str]]:
        """Check for dangerous security patterns"""
        for pattern in self.compiled_patterns:
            if pattern.search(value):
                logger.warning(f"Dangerous pattern detected: {pattern.pattern} in value: {value[:100]}...")
                return {
                    "type": "security_violation",
                    "message": "Input contains potentially dangerous content"
                }
        
        return None
    
    def _sanitize_field(self, value: Any, rule: ValidationRule) -> Any:
        """Sanitize field value"""
        if not rule.sanitize:
            return value
        
        if isinstance(value, str):
            # HTML escape
            value = html.escape(value)
            
            # Remove null bytes
            value = value.replace('\x00', '')
            
            # Normalize whitespace
            value = ' '.join(value.split())
            
            # URL decode (to prevent double-encoding attacks)
            try:
                decoded = urllib.parse.unquote(value)
                # Check if decoding revealed dangerous patterns
                if not self._check_security_patterns(decoded):
                    value = decoded
            except:
                pass  # Keep original if decoding fails
        
        elif isinstance(value, list):
            # Recursively sanitize array items
            value = [self._sanitize_field(item, rule) for item in value]
        
        elif isinstance(value, dict):
            # Recursively sanitize object values
            value = {k: self._sanitize_field(v, rule) for k, v in value.items()}
        
        return value
    
    def _basic_security_validation(self, request: Request, body: str) -> Optional[Dict[str, Any]]:
        """Basic security validation for endpoints without specific schemas"""
        
        # Check URL for dangerous patterns
        url_check = self._check_security_patterns(str(request.url))
        if url_check:
            return {
                "error": "Security Violation",
                "message": "URL contains potentially dangerous content",
                "location": "url"
            }
        
        # Check headers for dangerous patterns
        for header, value in request.headers.items():
            # Skip common headers that might contain legitimate patterns that resemble dangerous ones
            # e.g., 'baggage' for Sentry tracing, 'user-agent' for complex strings
            if header.lower() in ['authorization', 'cookie', 'baggage', 'user-agent']:  
                continue

            header_check = self._check_security_patterns(value)
            if header_check:
                return {
                    "error": "Security Violation",
                    "message": f"Header '{header}' contains potentially dangerous content",
                    "location": "headers"
                }
        
        # Check body for dangerous patterns
        if body:
            body_check = self._check_security_patterns(body)
            if body_check:
                return {
                    "error": "Security Violation",
                    "message": "Request body contains potentially dangerous content",
                    "location": "body"
                }
        
        return None


class InputValidationMiddleware(BaseHTTPMiddleware):
    """Input validation middleware with comprehensive security checks"""
    
    def __init__(self, app, max_request_size: int = 10 * 1024 * 1024):  # 10MB default
        super().__init__(app)
        self.validator = RequestValidator()
        self.max_request_size = max_request_size
        self.exempt_paths = [
            "/health",
            "/docs",
            "/openapi.json",
            "/favicon.ico",
            "/metrics"
        ]
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip validation for exempt paths
        if any(request.url.path.startswith(path) for path in self.exempt_paths):
            return await call_next(request)
        
        # Skip validation for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Check request size
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_request_size:
            logger.warning(f"Request too large: {content_length} bytes from {request.client.host}")
            return JSONResponse(
                status_code=413,
                content={
                    "error": "Request Too Large",
                    "message": f"Request size exceeds maximum allowed size of {self.max_request_size} bytes",
                    "max_size": self.max_request_size
                }
            )
        
        # Read request body
        body = ""
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body_bytes = await request.body()
                
                # Check actual body size
                if len(body_bytes) > self.max_request_size:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "error": "Request Too Large",
                            "message": f"Request body exceeds maximum allowed size",
                            "max_size": self.max_request_size
                        }
                    )
                
                body = body_bytes.decode('utf-8', errors='ignore')
            except UnicodeDecodeError:
                return JSONResponse(
                    status_code=400,
                    content={
                        "error": "Invalid Encoding",
                        "message": "Request body must be valid UTF-8"
                    }
                )
            except Exception as e:
                logger.error(f"Error reading request body: {e}")
                return JSONResponse(
                    status_code=400,
                    content={
                        "error": "Invalid Request",
                        "message": "Unable to read request body"
                    }
                )
        
        # Validate request
        validation_error = self.validator.validate_request(request, body)
        if validation_error:
            logger.warning(
                f"Request validation failed for {request.client.host} "
                f"on {request.method} {request.url.path}: {validation_error.get('message', 'Unknown error')}"
            )
            
            return JSONResponse(
                status_code=400,
                content={
                    **validation_error,
                    "request_id": getattr(request.state, 'request_id', 'unknown')
                }
            )
        
        # Process request
        return await call_next(request)


def setup_input_validation_middleware(app, max_request_size: int = 10 * 1024 * 1024):
    """Setup input validation middleware"""
    app.add_middleware(InputValidationMiddleware, max_request_size=max_request_size)
    logger.info("Input validation middleware configured")