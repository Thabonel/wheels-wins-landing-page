"""Unified OCR service - single pipeline for all text extraction."""
from app.services.ocr.models import OCRResult
from app.services.ocr.service import OCRService

__all__ = ["OCRResult", "OCRService"]
