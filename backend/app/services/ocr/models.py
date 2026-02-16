"""Pydantic models for the unified OCR service."""
from pydantic import BaseModel


class OCRResult(BaseModel):
    """Result from OCR text extraction."""
    text: str
    confidence: float
    confidence_method: str  # "google_vision_per_word" | "heuristic" | "none"
    method: str  # "cache" | "pdf_text" | "google_cloud_vision" | "claude_vision" | "gemini" | "none"
    cached: bool = False
    processing_time_ms: int = 0
    file_hash: str = ""
    page_count: int = 1
