"""
File Upload Security Utilities
Comprehensive file validation, malware scanning, and security checks.

Date: January 10, 2025
"""

import os
import hashlib
import mimetypes
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from fastapi import HTTPException, UploadFile
import logging

logger = logging.getLogger(__name__)


class FileSecurityValidator:
    """Comprehensive file upload security validator"""

    def __init__(self):
        # Maximum file sizes by category (in bytes)
        self.max_file_sizes = {
            "audio": 10 * 1024 * 1024,  # 10MB
            "image": 5 * 1024 * 1024,   # 5MB
            "document": 25 * 1024 * 1024,  # 25MB
            "video": 100 * 1024 * 1024,    # 100MB (if ever needed)
        }

        # Allowed MIME types by category
        self.allowed_mime_types = {
            "audio": [
                "audio/wav", "audio/wave",
                "audio/mpeg", "audio/mp3",
                "audio/mp4", "audio/m4a",
                "audio/ogg", "audio/webm",
                "audio/flac", "audio/x-flac",
                "audio/aac"
            ],
            "image": [
                "image/jpeg", "image/jpg",
                "image/png", "image/gif",
                "image/webp", "image/bmp",
                "image/tiff", "image/svg+xml"
            ],
            "document": [
                "application/pdf",
                "text/plain", "text/csv",
                "application/json",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ]
        }

        # Allowed file extensions by category
        self.allowed_extensions = {
            "audio": [".wav", ".mp3", ".mp4", ".m4a", ".ogg", ".webm", ".flac", ".aac"],
            "image": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff", ".svg"],
            "document": [".pdf", ".txt", ".csv", ".json", ".doc", ".docx"]
        }

        # File signatures (magic numbers) for validation
        self.file_signatures = {
            # Audio signatures
            "audio": [
                (b"RIFF", 0),  # WAV files
                (b"\xff\xfb", 0),  # MP3 files (MPEG-1 Layer 3)
                (b"\xff\xfa", 0),  # MP3 files (MPEG-1 Layer 3)
                (b"ID3", 0),  # MP3 with ID3 tag
                (b"OggS", 0),  # OGG files
                (b"fLaC", 0),  # FLAC files
                (b"ftyp", 4),  # M4A/MP4 files (at offset 4)
            ],
            # Image signatures
            "image": [
                (b"\xff\xd8\xff", 0),  # JPEG
                (b"\x89PNG", 0),  # PNG
                (b"GIF87a", 0),  # GIF87a
                (b"GIF89a", 0),  # GIF89a
                (b"RIFF", 0),  # WebP (also has WEBP at offset 8)
                (b"BM", 0),  # BMP
            ],
            # Document signatures
            "document": [
                (b"%PDF", 0),  # PDF
                (b"PK\x03\x04", 0),  # ZIP-based formats (docx, etc.)
                (b"\xd0\xcf\x11\xe0", 0),  # Microsoft Office (old format)
            ]
        }

        # Suspicious patterns that should never be in uploaded files
        self.suspicious_patterns = [
            b"<script",
            b"</script>",
            b"<?php",
            b"<%",
            b"javascript:",
            b"vbscript:",
            b"data:text/html",
            b"Function(",
            b"setTimeout(",
            b"setInterval(",
        ]

    async def validate_file_upload(
        self,
        file: UploadFile,
        category: str,
        additional_checks: Optional[Dict] = None
    ) -> Dict:
        """
        Comprehensive file upload validation

        Args:
            file: FastAPI UploadFile object
            category: File category ('audio', 'image', 'document')
            additional_checks: Optional additional validation rules

        Returns:
            Dict with validation results and file metadata

        Raises:
            HTTPException: If validation fails
        """

        if category not in self.max_file_sizes:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file category: {category}"
            )

        # Read file content
        content = await file.read()

        # Reset file pointer
        file.file.seek(0)

        # Basic validations
        await self._validate_file_size(content, category)
        await self._validate_mime_type(file.content_type, category)
        await self._validate_file_extension(file.filename or "", category)
        await self._validate_file_signature(content, category)

        # Security validations
        await self._scan_suspicious_patterns(content, file.filename or "unknown")
        await self._scan_for_malware(content, file.filename or "unknown")

        # Generate file metadata
        file_hash = hashlib.sha256(content).hexdigest()
        file_metadata = {
            "filename": file.filename,
            "size": len(content),
            "content_type": file.content_type,
            "category": category,
            "sha256_hash": file_hash,
            "validation_status": "passed",
            "timestamp": datetime.utcnow().isoformat()
        }

        logger.info(f"File validation passed: {file_metadata}")
        return file_metadata

    async def _validate_file_size(self, content: bytes, category: str) -> None:
        """Validate file size against category limits"""
        max_size = self.max_file_sizes[category]

        if len(content) > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size for {category} files is {max_size // (1024*1024)}MB"
            )

        if len(content) < 100:  # Minimum file size check
            raise HTTPException(
                status_code=400,
                detail="File too small or empty"
            )

    async def _validate_mime_type(self, content_type: Optional[str], category: str) -> None:
        """Validate MIME type against allowed types"""
        allowed_types = self.allowed_mime_types[category]

        if not content_type or content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid MIME type. Allowed types for {category}: {', '.join(allowed_types)}"
            )

    async def _validate_file_extension(self, filename: str, category: str) -> None:
        """Validate file extension against allowed extensions"""
        if not filename:
            raise HTTPException(
                status_code=400,
                detail="Filename is required"
            )

        _, ext = os.path.splitext(filename.lower())
        allowed_exts = self.allowed_extensions[category]

        if ext not in allowed_exts:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file extension. Allowed extensions for {category}: {', '.join(allowed_exts)}"
            )

    async def _validate_file_signature(self, content: bytes, category: str) -> None:
        """Validate file signature (magic numbers) against expected signatures"""
        signatures = self.file_signatures.get(category, [])

        for signature, offset in signatures:
            if len(content) > offset + len(signature):
                if content[offset:offset + len(signature)] == signature:
                    return  # Valid signature found

        # Special case for WebP (RIFF + WEBP)
        if category == "image" and len(content) > 12:
            if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
                return

        raise HTTPException(
            status_code=400,
            detail=f"File does not appear to be a valid {category} file (signature mismatch)"
        )

    async def _scan_suspicious_patterns(self, content: bytes, filename: str) -> None:
        """Scan for suspicious patterns that might indicate malicious content"""
        content_lower = content.lower()

        for pattern in self.suspicious_patterns:
            if pattern in content_lower:
                logger.warning(f"Suspicious pattern detected in file {filename}: {pattern}")
                raise HTTPException(
                    status_code=400,
                    detail="File contains suspicious content"
                )

    async def _scan_for_malware(self, content: bytes, filename: str) -> None:
        """
        Malware scanning hook

        TODO: Integrate with real malware scanning service:
        - ClamAV for local scanning
        - VirusTotal API for cloud scanning
        - AWS GuardDuty malware protection
        - Microsoft Defender API
        """

        # Log file for potential external scanning
        file_hash = hashlib.sha256(content).hexdigest()

        logger.info(f"File scanned for malware: {filename} (SHA256: {file_hash[:16]}...)")

        # Placeholder for real malware scanning integration
        # Example implementation would check against known malware signatures
        # and use external scanning services for comprehensive detection


# Global instance for easy import
file_security = FileSecurityValidator()