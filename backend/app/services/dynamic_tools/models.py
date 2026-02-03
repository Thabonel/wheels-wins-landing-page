"""
Dynamic Tool Models - Pydantic models for AI-generated tool system
"""
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class ToolGenerationStatus(str, Enum):
    """Status of tool generation process"""
    PENDING = "pending"
    GENERATING = "generating"
    VALIDATING = "validating"
    COMPILED = "compiled"
    FAILED = "failed"
    CACHED = "cached"


class SecurityViolationType(str, Enum):
    """Types of security violations detected"""
    FORBIDDEN_FUNCTION = "forbidden_function"
    FORBIDDEN_IMPORT = "forbidden_import"
    CODE_INJECTION = "code_injection"
    UNSAFE_ATTRIBUTE_ACCESS = "unsafe_attribute_access"
    NETWORK_VIOLATION = "network_violation"
    MEMORY_LIMIT_EXCEEDED = "memory_limit_exceeded"
    TIMEOUT_EXCEEDED = "timeout_exceeded"


class ToolGenerationRequest(BaseModel):
    """Request for generating a new dynamic tool"""
    user_intent: str = Field(..., description="What the user wants the tool to do")
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context for generation")
    target_data_sources: List[str] = Field(default_factory=list, description="Data sources the tool should access")
    expected_output_format: Optional[str] = Field(None, description="Expected format of tool output")
    user_id: Optional[str] = Field(None, description="User requesting the tool")

    class Config:
        extra = "allow"


class GeneratedToolCode(BaseModel):
    """Generated tool code and metadata"""
    tool_name: str = Field(..., description="Generated tool name")
    code: str = Field(..., description="Generated Python code")
    description: str = Field(..., description="Tool description")
    template_used: str = Field(..., description="Template that was used")
    generation_prompt: str = Field(..., description="Prompt used for generation")
    validation_passed: bool = Field(False, description="Whether code passed validation")
    validation_errors: List[str] = Field(default_factory=list, description="Validation errors if any")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        extra = "allow"


class GeneratedToolPattern(BaseModel):
    """Cached pattern for a generated tool"""
    id: Optional[str] = Field(None, description="Pattern ID in database")
    intent_hash: str = Field(..., description="Hash of the user intent")
    intent_keywords: List[str] = Field(default_factory=list, description="Keywords extracted from intent")
    template_type: str = Field(..., description="Template type used")
    generated_code: str = Field(..., description="Generated Python code")
    function_definition: Dict[str, Any] = Field(default_factory=dict, description="OpenAI function schema")
    success_count: int = Field(0, description="Number of successful executions")
    failure_count: int = Field(0, description="Number of failed executions")
    avg_execution_time_ms: float = Field(0.0, description="Average execution time")
    last_used: Optional[datetime] = Field(None, description="Last time pattern was used")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(True, description="Whether pattern is active")

    class Config:
        extra = "allow"


class ToolExecutionResult(BaseModel):
    """Result from executing a dynamic tool"""
    success: bool = Field(..., description="Whether execution succeeded")
    tool_name: str = Field(..., description="Name of executed tool")
    data: Any = Field(None, description="Result data from tool")
    error: Optional[str] = Field(None, description="Error message if failed")
    execution_time_ms: float = Field(0.0, description="Execution time in milliseconds")
    pattern_id: Optional[str] = Field(None, description="Pattern ID if cached")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    class Config:
        extra = "allow"


class SecurityViolation(BaseModel):
    """Security violation detected during validation"""
    violation_type: SecurityViolationType = Field(..., description="Type of violation")
    message: str = Field(..., description="Description of violation")
    line_number: Optional[int] = Field(None, description="Line number where violation occurred")
    code_snippet: Optional[str] = Field(None, description="Code snippet causing violation")
    severity: str = Field("high", description="Severity: low, medium, high, critical")

    class Config:
        extra = "allow"


class NetworkAccessRequest(BaseModel):
    """Request for network access validation"""
    url: str = Field(..., description="URL to validate")
    method: str = Field("GET", description="HTTP method")
    user_id: Optional[str] = Field(None, description="User making request")
    tool_name: Optional[str] = Field(None, description="Tool requesting access")

    class Config:
        extra = "allow"


class RateLimitStatus(BaseModel):
    """Rate limiting status for tool generation"""
    user_id: str = Field(..., description="User ID")
    generations_this_hour: int = Field(0, description="Generations in current hour")
    max_generations_per_hour: int = Field(10, description="Maximum allowed per hour")
    reset_time: datetime = Field(default_factory=datetime.utcnow, description="When limit resets")
    is_limited: bool = Field(False, description="Whether user is rate limited")

    class Config:
        extra = "allow"


@dataclass
class CompiledTool:
    """Compiled tool ready for execution"""
    tool_name: str
    code_object: Any  # Compiled code object
    tool_class: type  # The tool class
    function_definition: Dict[str, Any]
    pattern_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
