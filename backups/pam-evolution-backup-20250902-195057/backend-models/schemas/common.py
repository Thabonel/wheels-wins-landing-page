
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Generic, TypeVar
from datetime import datetime

T = TypeVar('T')

class PaginationParams(BaseModel):
    page: int = Field(1, ge=1, description="Page number starting from 1")
    limit: int = Field(20, ge=1, le=100, description="Number of items per page")
    sort_by: Optional[str] = Field(None, description="Field to sort by")
    sort_order: Optional[str] = Field("asc", pattern="^(asc|desc)$", description="Sort order")

class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool

class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    meta: PaginationMeta
    success: bool = True

class SuccessResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = None

class HealthCheckResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    services: Dict[str, str]
    uptime: float

class FileUploadResponse(BaseModel):
    success: bool
    file_url: str
    file_name: str
    file_size: int
    content_type: str
    uploaded_at: datetime

class BulkOperationResponse(BaseModel):
    success: bool
    processed: int
    failed: int
    errors: List[str] = Field(default_factory=list)
    results: List[Dict[str, Any]] = Field(default_factory=list)
