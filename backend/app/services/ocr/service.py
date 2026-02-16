"""Unified OCR service - single pipeline for all document text extraction.

Pipeline: cache -> PDF text -> Google Vision -> Claude Vision -> Gemini
"""
import hashlib
import io
import time
from typing import Optional

from app.services.ocr.models import OCRResult
from app.core.logging import get_logger

logger = get_logger(__name__)


def get_supabase_client():
    """Import supabase client lazily to avoid circular imports in tests."""
    from app.core.database import get_supabase_client as _get
    return _get()


class OCRService:
    """Unified OCR service with caching, fallback chain, and structured logging."""

    # --- Hashing ---

    def _compute_hash(self, file_bytes: bytes) -> str:
        """Compute SHA256 hash of file bytes, prefixed with 'sha256:'."""
        digest = hashlib.sha256(file_bytes).hexdigest()
        return f"sha256:{digest}"

    # --- Cache ---

    async def _check_cache(self, file_hash: str) -> Optional[OCRResult]:
        """Check ocr_cache table for a previous result with this hash."""
        try:
            client = get_supabase_client()
            response = (
                client.table("ocr_cache")
                .select("*")
                .eq("file_hash", file_hash)
                .execute()
            )
            if response.data and len(response.data) > 0:
                row = response.data[0]
                return OCRResult(
                    text=row["ocr_text"],
                    confidence=row.get("confidence", 0.0),
                    confidence_method=row.get("confidence_method", "none"),
                    method=row.get("method", "unknown"),
                    cached=True,
                    file_hash=file_hash,
                    page_count=row.get("page_count", 1),
                )
            return None
        except Exception as e:
            logger.warning(f"Cache lookup failed: {e}")
            return None

    async def _save_cache(self, file_hash: str, result: OCRResult) -> None:
        """Store OCR result in ocr_cache table."""
        try:
            client = get_supabase_client()
            client.table("ocr_cache").upsert({
                "file_hash": file_hash,
                "ocr_text": result.text,
                "confidence": result.confidence,
                "confidence_method": result.confidence_method,
                "method": result.method,
                "page_count": result.page_count,
            }).execute()
        except Exception as e:
            logger.warning(f"Cache save failed: {e}")

    # --- PDF text extraction ---

    def _try_pdf_text(self, file_bytes: bytes) -> Optional[str]:
        """Extract text from a digital PDF using pdfplumber. Returns None if
        no text found (scanned PDF) or if file is not a valid PDF."""
        try:
            import pdfplumber
        except ImportError:
            logger.warning("pdfplumber not installed, skipping PDF text extraction")
            return None

        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                pages_text = []
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        pages_text.append(text)
                if pages_text:
                    return "\n\n".join(pages_text)
            return None
        except Exception as e:
            logger.debug(f"PDF text extraction failed: {e}")
            return None

    # --- Image preprocessing ---

    def _preprocess_image(self, file_bytes: bytes, filename: str) -> bytes:
        """Preprocess image: HEIC conversion, EXIF rotation, resize, RGB convert."""
        from PIL import Image, ImageOps

        # Try HEIC conversion
        is_heic = filename.lower().endswith((".heic", ".heif"))
        if is_heic:
            try:
                import pillow_heif
                heif_file = pillow_heif.read_heif(file_bytes)
                img = Image.frombytes(
                    heif_file.mode, heif_file.size, heif_file.data,
                    "raw", heif_file.mode, heif_file.stride,
                )
            except ImportError:
                logger.warning("pillow-heif not installed, cannot convert HEIC server-side")
                return file_bytes
        else:
            img = Image.open(io.BytesIO(file_bytes))

        # Apply EXIF rotation using standard Pillow method
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass  # No EXIF or no orientation tag

        # Resize to max 2048px on longest side
        max_dim = 2048
        if max(img.size) > max_dim:
            ratio = max_dim / max(img.size)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)

        # Convert to RGB
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Save as JPEG
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=95)
        return buf.getvalue()

    # --- OCR Providers ---

    async def _ocr_google_vision(self, image_bytes: bytes) -> OCRResult:
        """Extract text using Google Cloud Vision API (non-generative, no hallucination)."""
        from google.cloud import vision

        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=image_bytes)
        response = client.text_detection(image=image)

        if response.error.message:
            raise Exception(f"Google Vision API error: {response.error.message}")

        annotations = response.text_annotations
        if not annotations:
            return OCRResult(
                text="",
                confidence=0.0,
                confidence_method="google_vision_per_word",
                method="google_cloud_vision",
            )

        full_text = annotations[0].description.strip()

        # Calculate average word confidence from full_text_annotation
        word_confidences = []
        if response.full_text_annotation:
            for page in response.full_text_annotation.pages:
                for block in page.blocks:
                    for paragraph in block.paragraphs:
                        for word in paragraph.words:
                            word_confidences.append(word.confidence)

        avg_confidence = (
            sum(word_confidences) / len(word_confidences)
            if word_confidences
            else 0.8
        )

        return OCRResult(
            text=full_text,
            confidence=round(avg_confidence, 4),
            confidence_method="google_vision_per_word",
            method="google_cloud_vision",
        )

    async def _ocr_claude(self, image_bytes: bytes) -> OCRResult:
        """Extract text using Claude Vision (VLM fallback)."""
        import base64
        import anthropic
        from app.core.config import settings

        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        b64 = base64.b64encode(image_bytes).decode()

        message = await client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "Extract ALL text from this document image exactly as it appears. "
                            "Return only the raw text, preserving line breaks and layout. "
                            "Do not add any commentary, headers, or formatting."
                        ),
                    },
                ],
            }],
        )

        text = message.content[0].text.strip()

        # VLM confidence is heuristic-based
        confidence = 0.8 if len(text) > 10 else 0.5

        return OCRResult(
            text=text,
            confidence=confidence,
            confidence_method="heuristic",
            method="claude_vision",
        )

    async def _ocr_gemini(self, image_bytes: bytes) -> OCRResult:
        """Extract text using Gemini Flash (second VLM fallback)."""
        import base64
        import google.generativeai as genai
        from app.core.config import settings

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-2.0-flash-lite")

        b64 = base64.b64encode(image_bytes).decode()

        response = model.generate_content([
            {
                "mime_type": "image/jpeg",
                "data": b64,
            },
            "Extract ALL text from this document image exactly as it appears. "
            "Return only the raw text, preserving line breaks and layout. "
            "Do not add any commentary, headers, or formatting.",
        ])

        text = response.text.strip()
        confidence = 0.75 if len(text) > 10 else 0.4

        return OCRResult(
            text=text,
            confidence=confidence,
            confidence_method="heuristic",
            method="gemini",
        )

    # --- Main pipeline ---

    async def extract_text(
        self,
        file_bytes: bytes,
        filename: str,
        sensitivity: str = "standard",
    ) -> OCRResult:
        """Main entry point. Runs the full OCR pipeline with caching and fallbacks.

        Args:
            file_bytes: Raw file bytes
            filename: Original filename (used for type detection)
            sensitivity: "standard" (full pipeline) or "high" (non-generative only)

        Returns:
            OCRResult with extracted text, confidence, and metadata
        """
        start_time = time.time()
        file_hash = self._compute_hash(file_bytes)
        methods_tried = []

        if len(file_bytes) == 0:
            return OCRResult(
                text="",
                confidence=0.0,
                confidence_method="none",
                method="none",
                file_hash=file_hash,
            )

        # 1. Check cache
        cached = await self._check_cache(file_hash)
        if cached:
            cached.processing_time_ms = int((time.time() - start_time) * 1000)
            return cached

        # 2. Try PDF text extraction (free, 100% accurate for digital PDFs)
        is_pdf = filename.lower().endswith(".pdf")
        if is_pdf:
            pdf_text = self._try_pdf_text(file_bytes)
            if pdf_text and pdf_text.strip():
                result = OCRResult(
                    text=pdf_text,
                    confidence=1.0,
                    confidence_method="pdf_text_exact",
                    method="pdf_text",
                    file_hash=file_hash,
                    processing_time_ms=int((time.time() - start_time) * 1000),
                )
                await self._save_cache(file_hash, result)
                return result

        # 3. Preprocess image
        try:
            image_bytes = self._preprocess_image(file_bytes, filename)
        except Exception as e:
            logger.warning(f"Image preprocessing failed, using raw bytes: {e}")
            image_bytes = file_bytes

        # 4. Primary: Google Cloud Vision (non-generative, no hallucination)
        try:
            methods_tried.append("google_cloud_vision")
            result = await self._ocr_google_vision(image_bytes)
            result.file_hash = file_hash
            result.processing_time_ms = int((time.time() - start_time) * 1000)
            await self._save_cache(file_hash, result)
            return result
        except Exception as e:
            logger.warning(f"Google Vision failed: {e}")
            fallback_reason = f"google_vision_{type(e).__name__}"

        # If sensitivity=high, stop here - no VLM processing for sensitive docs
        if sensitivity == "high":
            elapsed = int((time.time() - start_time) * 1000)
            return OCRResult(
                text="",
                confidence=0.0,
                confidence_method="none",
                method="none",
                file_hash=file_hash,
                processing_time_ms=elapsed,
            )

        # 5. Fallback: Claude Vision
        try:
            methods_tried.append("claude_vision")
            result = await self._ocr_claude(image_bytes)
            result.file_hash = file_hash
            result.processing_time_ms = int((time.time() - start_time) * 1000)
            await self._save_cache(file_hash, result)
            return result
        except Exception as e:
            logger.warning(f"Claude Vision failed: {e}")

        # 6. Second fallback: Gemini
        try:
            methods_tried.append("gemini")
            result = await self._ocr_gemini(image_bytes)
            result.file_hash = file_hash
            result.processing_time_ms = int((time.time() - start_time) * 1000)
            await self._save_cache(file_hash, result)
            return result
        except Exception as e:
            logger.error(f"All OCR methods failed. Tried: {methods_tried}. Last error: {e}")

        # All failed
        elapsed = int((time.time() - start_time) * 1000)
        return OCRResult(
            text="",
            confidence=0.0,
            confidence_method="none",
            method="none",
            file_hash=file_hash,
            processing_time_ms=elapsed,
        )
