# PRD - Unified OCR Service

## 1. Context & Goals

### Problem
The app has **8 separate OCR/text extraction implementations** scattered across frontend and backend:

| # | Implementation | File | What It Does |
|---|---------------|------|-------------|
| 1 | Tesseract.js (Web Worker) | `src/hooks/useReceiptScanner.ts` | Receipt image OCR with fallback to Vision API |
| 2 | Tesseract.js (main thread) | `src/components/you/medical/DocumentUploadDialog.tsx` | Medical document image OCR - **fails silently, produces NULL ocr_text** |
| 3 | Tesseract.js (via documentParser) | `src/services/bankStatement/documentParser.ts` | Bank statement image OCR |
| 4 | Claude Vision | `backend/app/api/v1/receipt_parsing.py` (`/receipts/parse-vision`) | Universal receipt image-to-JSON extraction |
| 5 | Claude Vision | `backend/app/api/v1/fuel_receipts.py` (`/fuel/parse-receipt-vision`) | Fuel receipt image-to-JSON extraction |
| 6 | PDF.js | `src/components/you/medical/DocumentUploadDialog.tsx` | Medical PDF text extraction |
| 7 | PDF.js (via documentParser) | `src/services/bankStatement/documentParser.ts` | Bank statement PDF text extraction |
| 8 | pdfplumber | `backend/app/services/bank_statement/pdf_parser.py` | Backend bank statement PDF parsing |

**Consequences:**
- Medical documents uploaded with `ocr_text = NULL` because client-side Tesseract fails silently on complex documents
- No fallback chain where most needed (medical, bank statements)
- Inconsistent error handling across 8 implementations
- Duplicate code maintenance burden
- HEIC conversion duplicated between frontend implementations

### Who It's For
- **End users**: Upload receipts, medical documents, bank statements, fuel receipts
- **Admin/PAM**: Search medical records by content (requires `ocr_text` populated)
- **Developers**: Single service to maintain instead of 8

### Why Now
- Medical document search is broken - PAM cannot search documents with NULL `ocr_text`
- Recent receipt upload debugging (Feb 2026) exposed fragility of client-side OCR pipeline
- Google Cloud Vision free tier (1,000 units/month) covers current volume at zero cost

### In-Scope Goals
- Build ONE unified backend OCR service at `POST /api/v1/ocr/extract`
- Pipeline: cache check -> PDF text extraction (pdfplumber) -> Google Cloud Vision (primary) -> Claude Vision (fallback) -> Gemini (second fallback)
- `sensitivity` parameter for medical docs (restricts to non-generative OCR only)
- SHA256 file hash caching to prevent duplicate processing
- Migrate all 8 upload paths to call the new backend endpoint
- Backfill NULL `ocr_text` in `medical_records` table
- Remove `tesseract.js` frontend dependency
- Structured logging for every OCR request

### Out-of-Scope / Non-Goals
- Async job queue for multi-page PDFs (defer to Phase 2 - current volume doesn't justify complexity)
- Real-time streaming OCR progress (defer)
- Admin dashboard for OCR stats (defer - structured logs are queryable)
- Changing the receipt/fuel parsing logic (the text-to-structured-data parsers stay as-is)
- Google Cloud BAA/HIPAA compliance verification (operational task, not code)

---

## 2. Current State (Repo-Informed)

### Backend (FastAPI on Render)
- **Main app**: `backend/app/main.py` - ~950 lines, routes registered at L69-119, L950-951
- **Receipt parsing**: `backend/app/api/v1/receipt_parsing.py` - Claude Vision at `/receipts/parse-vision`, regex at `/receipts/parse-text`
- **Fuel receipts**: `backend/app/api/v1/fuel_receipts.py` - File upload at `/fuel/upload-receipt`, Claude Vision at `/fuel/parse-receipt-vision`, regex at `/fuel/parse-receipt-text`
- **Bank statement PDF parser**: `backend/app/services/bank_statement/pdf_parser.py` - uses pdfplumber
- **Auth**: JWT via `verify_supabase_jwt_token` from `app.api.deps`
- **CSRF**: Exempt paths in `backend/app/core/xss_csrf_protection.py` L428-444 - `/api/v1/fuel` and `/api/v1/receipts` already exempt
- **Dependencies**: `requirements-core.txt` has Pillow 12.1.0, anthropic>=0.45.0. `requirements.txt` adds google-generativeai>=0.8.0
- **Tests**: pytest in `backend/tests/`, conftest at `backend/tests/conftest.py` with mock_supabase_client, mock_user_id fixtures
- **Existing OCR test**: `backend/tests/unit/test_universal_receipt_parser.py`

### Frontend (React + Vite)
- **Receipt scanner**: `src/hooks/useReceiptScanner.ts` - Tesseract.js v7 with Web Worker, HEIC conversion, preprocesses images, falls back to `/receipts/parse-vision`
- **OCR Worker**: `src/hooks/useOCRWorker.ts` + `src/workers/ocrWorker.ts` - manages Tesseract Web Worker lifecycle
- **SmartReceiptScanner**: `src/components/shared/SmartReceiptScanner.tsx` - UI wrapper used by ExpenseReceiptUpload and FuelReceiptUpload
- **Medical upload**: `src/components/you/medical/DocumentUploadDialog.tsx` - PDF.js + Tesseract.js, stores result in `ocr_text` column
- **Bank statement parser**: `src/services/bankStatement/documentParser.ts` - 1078 lines, handles PDF/Image/CSV/TXT
- **Package deps**: tesseract.js v7.0.0, pdfjs-dist v5.4.449, heic2any v0.0.4

### Key Architecture Points
- Backend URL resolved dynamically: staging vs production in `useReceiptScanner.ts` L7-14
- All receipt endpoints require JWT (`Authorization: Bearer {token}`)
- `BACKEND_URL` pattern is reused - new OCR endpoint follows same pattern
- Medical records stored in `medical_records` table with `ocr_text` TEXT column and `document_url` pointing to Supabase Storage

### Risks / Unknowns / Assumptions
- **ASSUMPTION**: Google Cloud Vision API can be enabled using existing Google Cloud project (we already have `google-generativeai` and `google-api-python-client` dependencies). **Verify**: Check Google Cloud console for Vision API availability.
- **ASSUMPTION**: `pdfplumber` is already installed (referenced in bank statement parser). **Verify**: `pip show pdfplumber` in backend environment.
- **RISK**: Google Cloud Vision requires a service account key or API key. Must be added to backend `.env` as `GOOGLE_CLOUD_VISION_KEY` or via service account JSON.
- **RISK**: Render deployment may need `pillow-heif` system dependencies (libheif). May need to use pure-Python fallback or skip server-side HEIC and keep client-side conversion.
- **UNKNOWN**: Exact cost impact. Free tier covers 1,000 units/month. Current volume is estimated at ~100 docs/month.

---

## 3. User Stories

1. **As a user uploading a receipt photo**, I want text extraction to happen reliably on the backend so that my receipt data is always parsed, even if my browser is slow or my image format is unusual.

2. **As a user uploading a medical document (PDF or image)**, I want the text to be extracted and stored so that PAM can search my medical records by content.

3. **As a user uploading a bank statement**, I want the text extraction to use the same reliable pipeline so that transaction parsing works consistently.

4. **As an iPhone user uploading a HEIC photo**, I want the system to handle format conversion automatically without me needing to know about file formats.

5. **As a developer maintaining the OCR code**, I want a single service with clear logging so that I can debug extraction failures in one place instead of eight.

6. **As an admin running a backfill**, I want to retroactively extract text from medical documents that were uploaded before this fix, so that all documents become searchable.

---

## 4. Success Criteria (Verifiable)

### Functional
- [ ] **SC-1**: `POST /api/v1/ocr/extract` accepts `multipart/form-data` with a file and returns `{ text, confidence, method, cached, processing_time_ms, file_hash }`
- [ ] **SC-2**: Digital PDFs return extracted text via pdfplumber without calling any external API
- [ ] **SC-3**: JPEG/PNG images return extracted text via Google Cloud Vision API
- [ ] **SC-4**: When Google Vision fails, Claude Vision is used as fallback; when Claude fails, Gemini is used
- [ ] **SC-5**: `sensitivity=high` parameter restricts processing to non-generative OCR only (Google Vision) - no VLM fallback
- [ ] **SC-6**: Same file uploaded twice returns cached result (matched by SHA256 hash) with `cached: true`
- [ ] **SC-7**: Medical document upload (`DocumentUploadDialog.tsx`) calls `/api/v1/ocr/extract` and stores result in `ocr_text`
- [ ] **SC-8**: Receipt scanner (`useReceiptScanner.ts`) calls `/api/v1/ocr/extract` instead of Tesseract.js
- [ ] **SC-9**: Fuel receipt upload calls `/api/v1/ocr/extract` instead of client-side OCR
- [ ] **SC-10**: Bank statement upload calls `/api/v1/ocr/extract` for image/scanned PDF extraction
- [ ] **SC-11**: `tesseract.js` removed from `package.json`
- [ ] **SC-12**: Backfill script processes `medical_records WHERE ocr_text IS NULL AND document_url IS NOT NULL`

### Non-Functional
- [ ] **SC-13**: OCR endpoint responds in <10s for single-page images (p95)
- [ ] **SC-14**: Endpoint returns 413 for files >10MB
- [ ] **SC-15**: Endpoint returns 401 for unauthenticated requests
- [ ] **SC-16**: Every OCR request is logged with: user_id, file_hash, file_type, file_size_bytes, method_used, confidence, processing_time_ms, success, error

### Edge Cases
- [ ] **SC-17**: Empty/corrupt PDF returns `{ text: "", confidence: 0, method: "none" }` - not a 500 error
- [ ] **SC-18**: Unsupported file type (e.g., .docx) returns 415 with clear error message
- [ ] **SC-19**: All three OCR providers unavailable returns 503 with `"All OCR methods failed"` message
- [ ] **SC-20**: Zero-byte file returns 400 with `"Empty file"` message

---

## 5. Test Plan

### Test Categories Required
- **Unit tests** (backend): OCR service internals - cache, preprocessing, provider calls
- **Integration tests** (backend): Full endpoint test with mocked providers
- **Frontend tests**: Verify components call new endpoint (existing test patterns)

### Test Cases Mapped to Success Criteria

#### Unit Tests (`backend/tests/unit/test_ocr_service.py`)

| Test | Criteria | Mock | Description |
|------|----------|------|-------------|
| `test_pdf_text_extraction` | SC-2 | pdfplumber (real, test PDF fixture) | Digital PDF -> text without API call |
| `test_pdf_text_extraction_empty` | SC-17 | pdfplumber (real, empty PDF) | Empty PDF returns empty text, no error |
| `test_cache_hit` | SC-6 | Supabase client | Same hash returns cached result |
| `test_cache_miss_then_store` | SC-6 | Supabase + Vision | First call stores in cache, second returns cached |
| `test_google_vision_primary` | SC-3 | google.cloud.vision mock | Image -> Vision API -> text |
| `test_claude_fallback_on_vision_failure` | SC-4 | Vision fails, Anthropic mock | Vision error -> Claude fallback |
| `test_gemini_fallback_on_claude_failure` | SC-4 | Vision+Claude fail, Gemini mock | Both fail -> Gemini fallback |
| `test_all_providers_fail` | SC-19 | All mocked to fail | Returns structured error, no crash |
| `test_sensitivity_high_skips_vlm` | SC-5 | Vision mock | sensitivity=high -> no Claude/Gemini called |
| `test_file_hash_deterministic` | SC-6 | None | Same bytes -> same SHA256 hash |
| `test_preprocessing_heic` | - | Pillow | HEIC bytes -> JPEG conversion (if pillow-heif available) |
| `test_preprocessing_rotation` | - | Pillow | EXIF rotation applied correctly |
| `test_confidence_google_vision` | SC-1 | Vision mock with word confidences | Confidence calculated from per-word scores |
| `test_confidence_vlm_heuristic` | SC-1 | Claude mock | VLM confidence uses heuristic (0.8 base) |
| `test_logging_on_success` | SC-16 | Vision mock + log capture | Structured log emitted with all fields |
| `test_logging_on_failure` | SC-16 | All fail + log capture | Error log emitted with details |

#### Integration Tests (`backend/tests/integration/test_ocr_endpoint.py`)

| Test | Criteria | Mock | Description |
|------|----------|------|-------------|
| `test_extract_jpeg_authenticated` | SC-1, SC-15 | Vision mock | JWT + JPEG -> 200 with text |
| `test_extract_unauthenticated` | SC-15 | None | No JWT -> 401 |
| `test_extract_oversized_file` | SC-14 | None | 11MB file -> 413 |
| `test_extract_unsupported_type` | SC-18 | None | .docx -> 415 |
| `test_extract_empty_file` | SC-20 | None | 0 bytes -> 400 |
| `test_extract_pdf_digital` | SC-2 | None (real pdfplumber) | Digital PDF -> text without API |
| `test_extract_with_sensitivity_high` | SC-5 | Vision mock | sensitivity=high header -> non-generative only |
| `test_extract_returns_cache_hit` | SC-6 | Vision mock + Supabase | Second upload of same file -> cached: true |

### Test Data/Fixtures Needed
- `backend/tests/fixtures/test_receipt.jpg` - Small JPEG receipt image (~50KB)
- `backend/tests/fixtures/test_digital.pdf` - PDF with embedded text (digital, not scanned)
- `backend/tests/fixtures/test_empty.pdf` - Empty/blank PDF
- Create fixtures programmatically where possible (Pillow for images, reportlab for PDFs)

### What to Mock vs Integrate
- **Mock**: Google Cloud Vision API, Anthropic API, Gemini API, Supabase storage (for backfill)
- **Integrate (real)**: pdfplumber (local, no API), Pillow preprocessing, SHA256 hashing, FastAPI TestClient

---

## 6. Implementation Plan (Small Slices)

### Slice 1: Database Migration + Pydantic Models

**What changes:**
- Create `backend/app/services/ocr/__init__.py`
- Create `backend/app/services/ocr/models.py` with `OCRResult`, `OCRRequest` Pydantic models
- Create Supabase migration for `ocr_cache` table

**Tests FIRST:**
- `test_ocr_result_model_validation` - model accepts valid data, rejects invalid
- `test_ocr_result_serialization` - model serializes to expected JSON shape

**Commands:**
```bash
cd backend && python -m pytest tests/unit/test_ocr_service.py::test_ocr_result_model_validation -v
cd backend && python -m pytest tests/unit/test_ocr_service.py::test_ocr_result_serialization -v
```

**Expected output:** 2 tests pass

**Commit:** `feat(ocr): add OCR models and cache table migration`

---

### Slice 2: Core OCR Service - Cache + PDF Text

**What changes:**
- Create `backend/app/services/ocr/service.py` with:
  - `OCRService` class
  - `extract_text(file_bytes, filename, sensitivity)` entry point
  - `_compute_hash(file_bytes)` - SHA256
  - `_check_cache(file_hash)` - query ocr_cache table
  - `_save_cache(file_hash, result)` - insert into ocr_cache
  - `_try_pdf_text(file_bytes)` - pdfplumber extraction

**Tests FIRST:**
```
test_pdf_text_extraction
test_pdf_text_extraction_empty
test_cache_hit
test_cache_miss_then_store
test_file_hash_deterministic
```

**Commands:**
```bash
cd backend && python -m pytest tests/unit/test_ocr_service.py -k "pdf_text or cache or hash" -v
```

**Expected output:** 5 tests pass

**Commit:** `feat(ocr): add cache layer and PDF text extraction`

---

### Slice 3: Google Cloud Vision Integration

**What changes:**
- Add `google-cloud-vision` to `backend/requirements.txt`
- Add `_ocr_google_vision(image_bytes)` method to `OCRService`
- Add `GOOGLE_CLOUD_VISION_KEY` to config

**Tests FIRST:**
```
test_google_vision_primary
test_confidence_google_vision
```

**Commands:**
```bash
cd backend && python -m pytest tests/unit/test_ocr_service.py -k "google_vision" -v
```

**Expected output:** 2 tests pass

**Commit:** `feat(ocr): add Google Cloud Vision as primary OCR`

---

### Slice 4: Claude + Gemini Fallbacks

**What changes:**
- Add `_ocr_claude(image_bytes)` - uses existing anthropic client
- Add `_ocr_gemini(image_bytes)` - uses existing google-generativeai client
- Wire fallback chain in `extract_text()`
- Implement `sensitivity=high` guard

**Tests FIRST:**
```
test_claude_fallback_on_vision_failure
test_gemini_fallback_on_claude_failure
test_all_providers_fail
test_sensitivity_high_skips_vlm
test_confidence_vlm_heuristic
```

**Commands:**
```bash
cd backend && python -m pytest tests/unit/test_ocr_service.py -k "fallback or sensitivity or vlm" -v
```

**Expected output:** 5 tests pass

**Regression:** Re-run all previous OCR tests
```bash
cd backend && python -m pytest tests/unit/test_ocr_service.py -v
```

**Commit:** `feat(ocr): add Claude and Gemini fallback chain`

---

### Slice 5: Image Preprocessing

**What changes:**
- Add `_preprocess_image(file_bytes, filename)` to `OCRService`
  - HEIC->JPEG via pillow-heif (if available) or skip (client handles it)
  - EXIF auto-rotation via Pillow
  - Resize to max 2048px on longest side
  - Convert to RGB
- Add `pillow-heif` to requirements.txt (optional dependency with try/except)

**Tests FIRST:**
```
test_preprocessing_rotation
test_preprocessing_heic (skip if pillow-heif not installed)
test_preprocessing_resize
test_preprocessing_rgb_conversion
```

**Commands:**
```bash
cd backend && python -m pytest tests/unit/test_ocr_service.py -k "preprocessing" -v
```

**Expected output:** 3-4 tests pass

**Commit:** `feat(ocr): add image preprocessing pipeline`

---

### Slice 6: API Endpoint + Structured Logging

**What changes:**
- Create `backend/app/api/v1/ocr.py` with `POST /api/v1/ocr/extract`
  - Accept: `multipart/form-data` with `file` field and optional `sensitivity` query param
  - JWT required via `verify_supabase_jwt_token`
  - Max upload: 10MB
  - Allowed types: image/jpeg, image/png, image/gif, image/webp, image/heic, image/heif, image/bmp, image/tiff, application/pdf
  - Returns: OCRResult JSON
- Register router in `backend/app/main.py`
- Add structured logging to every request (success + failure)
- Add `/api/v1/ocr` to CSRF exempt paths

**Tests FIRST (integration):**
```
test_extract_jpeg_authenticated
test_extract_unauthenticated
test_extract_oversized_file
test_extract_unsupported_type
test_extract_empty_file
test_extract_pdf_digital
test_extract_with_sensitivity_high
test_extract_returns_cache_hit
test_logging_on_success
test_logging_on_failure
```

**Commands:**
```bash
cd backend && python -m pytest tests/integration/test_ocr_endpoint.py -v
cd backend && python -m pytest tests/unit/test_ocr_service.py -v  # regression
```

**Expected output:** All integration + unit tests pass

**Commit:** `feat(ocr): add /api/v1/ocr/extract endpoint with logging`

---

### Slice 7: Migrate Medical Document Upload

**What changes:**
- `src/components/you/medical/DocumentUploadDialog.tsx`:
  - Remove `import * as pdfjsLib from 'pdfjs-dist'`
  - Remove `import Tesseract from 'tesseract.js'`
  - Remove `pdfjsLib.GlobalWorkerOptions.workerSrc` setup
  - Remove `extractPdfText()` and `extractImageText()` functions
  - Replace `extractTextContent()` to call `POST /api/v1/ocr/extract` with `sensitivity=high`
  - Keep: file upload to Supabase Storage, form UI, progress indication

**Tests FIRST:**
- Verify component renders and submits (existing pattern or new test)
- Manual smoke: upload a PDF medical doc, verify `ocr_text` is populated in database

**Commands:**
```bash
npm run type-check
npm run build
```

**Expected output:** No TypeScript errors, build succeeds

**Commit:** `refactor(medical): migrate document upload to backend OCR service`

---

### Slice 8: Migrate Receipt Scanner

**What changes:**
- `src/hooks/useReceiptScanner.ts`:
  - Remove `import Tesseract from 'tesseract.js'`
  - Remove `import { useOCRWorker } from './useOCRWorker'`
  - Remove all Tesseract processing logic (L282-380)
  - Replace with: call `POST /api/v1/ocr/extract` with the file, then pass returned text to `/receipts/parse-text`
  - Keep: HEIC client-side conversion (heic2any), file validation, preview URL, upload to `/fuel/upload-receipt`
  - Keep: Vision API fallback via `/receipts/parse-vision` if text parsing returns low confidence
- `src/components/shared/SmartReceiptScanner.tsx`: No changes needed (just uses the hook)

**Tests FIRST:**
```bash
npm run type-check
npm run build
```

**Commands:**
```bash
npm run type-check && npm run build
```

**Expected output:** Clean build

**Commit:** `refactor(receipts): migrate scanner to backend OCR service`

---

### Slice 9: Migrate Fuel Receipt Upload

**What changes:**
- `src/components/wheels/FuelReceiptUpload.tsx`:
  - If it uses `useReceiptScanner` hook -> already migrated by Slice 8
  - If it calls `/fuel/parse-receipt-vision` directly -> update to use `/api/v1/ocr/extract` first, then `/fuel/parse-receipt-text`

**Tests FIRST:**
```bash
npm run type-check
```

**Commit:** `refactor(fuel): migrate fuel receipt to backend OCR service`

---

### Slice 10: Migrate Bank Statement Parser

**What changes:**
- `src/services/bankStatement/documentParser.ts`:
  - Remove Tesseract.js and PDF.js OCR logic for scanned documents
  - Keep: CSV/TXT parsing, transaction regex parsing, bank detection logic
  - For PDF/image extraction: call `/api/v1/ocr/extract`, feed returned text into existing transaction parser

**Tests FIRST:**
```bash
npm run type-check && npm run build
```

**Commit:** `refactor(bank): migrate statement parser to backend OCR service`

---

### Slice 11: Consolidate Backend Vision Endpoints

**What changes:**
- `backend/app/api/v1/receipt_parsing.py`: Remove `/receipts/parse-vision` endpoint. Keep `/receipts/parse-text`.
- `backend/app/api/v1/fuel_receipts.py`: Remove `/fuel/parse-receipt-vision` endpoint. Keep `/fuel/upload-receipt` and `/fuel/parse-receipt-text`.

**IMPORTANT**: Only do this after verifying all frontend callers have been migrated away from these endpoints.

**Tests FIRST:**
```bash
cd backend && python -m pytest tests/ -v --timeout=30
```

**Expected output:** All tests pass (no tests should reference removed endpoints; update any that do)

**Commit:** `refactor(api): remove legacy vision OCR endpoints`

---

### Slice 12: Remove Frontend OCR Dependencies

**What changes:**
- `package.json`: Remove `tesseract.js` dependency
- Delete `src/workers/ocrWorker.ts`
- Delete `src/hooks/useOCRWorker.ts`
- Keep `pdfjs-dist` if used for PDF viewing (not just OCR) - verify first
- Keep `heic2any` for client-side HEIC conversion

**Tests FIRST:**
```bash
npm run type-check && npm run build
```

**Verify no remaining imports:**
```bash
grep -r "tesseract" src/ --include="*.ts" --include="*.tsx"
grep -r "ocrWorker" src/ --include="*.ts" --include="*.tsx"
```

**Expected output:** No matches, clean build

**Commit:** `chore: remove tesseract.js and OCR worker dependencies`

---

### Slice 13: Medical Records Backfill Script

**What changes:**
- Create `backend/app/services/ocr/backfill.py`:
  - Query `medical_records WHERE ocr_text IS NULL AND document_url IS NOT NULL`
  - For each: download file from Supabase Storage, run through `OCRService.extract_text()`, update `ocr_text`
  - Dry-run mode by default
  - Progress logging

**Tests FIRST:**
```
test_backfill_identifies_null_records
test_backfill_updates_ocr_text
test_backfill_dry_run_no_writes
```

**Commands:**
```bash
cd backend && python -m pytest tests/unit/test_ocr_backfill.py -v
```

**Commit:** `feat(ocr): add medical records backfill script`

---

### Slice 14: Full Regression + Cleanup

**What changes:**
- Run full test suite
- Run quality checks
- Verify all 8 original OCR paths now route through `/api/v1/ocr/extract`

**Commands:**
```bash
cd backend && python -m pytest tests/ -v --timeout=60
npm run quality:check:full
npm run type-check
npm run build
```

**Expected output:** All pass

**Commit:** None (validation only)

---

## 7. Git Workflow Rules

### Branch
```
feature/unified-ocr-service
```

### Commit Cadence
- Commit after every slice (14 total slices)
- Each commit message format: `type(scope): description`
  - Types: `feat`, `refactor`, `chore`, `test`, `fix`
  - Scopes: `ocr`, `medical`, `receipts`, `fuel`, `bank`, `api`

### After Each Slice
1. Run targeted tests for that slice
2. Run regression: `cd backend && python -m pytest tests/unit/test_ocr_service.py -v`

### After Every 3 Slices
1. Full backend tests: `cd backend && python -m pytest tests/ -v --timeout=60`
2. Full frontend checks: `npm run type-check && npm run build`

### If a Change Breaks a Prior Feature
1. **Stop** - do not proceed to next slice
2. Fix the regression in the current slice
3. Re-run all tests before continuing
4. If fix requires reverting, use `git revert` not `git reset`

---

## 8. Commands (Repo-Specific)

### Install
```bash
# Backend
cd backend && pip install -r requirements.txt

# Frontend
npm install
```

### Unit Tests
```bash
cd backend && python -m pytest tests/unit/ -v --timeout=30
```

### Integration Tests
```bash
cd backend && python -m pytest tests/integration/ -v --timeout=60
```

### Lint/Typecheck
```bash
# Frontend
npm run type-check
npm run lint

# Backend (if configured)
cd backend && python -m flake8 app/ --max-line-length=120 || true
```

### Build
```bash
npm run build
```

### Local Run
```bash
# Backend (port 8000)
cd backend && uvicorn app.main:app --reload --port 8000

# Frontend (port 8080)
npm run dev
```

### Quality Check (All)
```bash
npm run quality:check:full
```

---

## 9. Observability / Logging

### What to Log (Every OCR Request)
```python
logger.info("ocr_request", extra={
    "user_id": user_id,
    "file_hash": file_hash,
    "file_type": content_type,
    "file_size_bytes": len(file_bytes),
    "method_used": result.method,  # "cache" | "pdf_text" | "google_vision" | "claude_vision" | "gemini"
    "confidence": result.confidence,
    "confidence_method": result.confidence_method,
    "processing_time_ms": elapsed_ms,
    "success": True,
    "cached": result.cached,
    "sensitivity": sensitivity,
    "fallback_used": fallback_used,
    "fallback_reason": fallback_reason,  # e.g., "google_vision_timeout"
})
```

### On Failure
```python
logger.error("ocr_request_failed", extra={
    "user_id": user_id,
    "file_hash": file_hash,
    "file_type": content_type,
    "file_size_bytes": len(file_bytes),
    "error_type": type(e).__name__,
    "error_message": str(e),
    "methods_tried": methods_tried,  # ["google_vision", "claude_vision"]
    "processing_time_ms": elapsed_ms,
})
```

### Smoke Test Verification
After deployment, verify logging with:
```bash
# Upload a test receipt via curl
curl -X POST https://wheels-wins-backend-staging.onrender.com/api/v1/ocr/extract \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test_receipt.jpg"

# Check Render logs for "ocr_request" entries
```

### Alert Triggers (Manual Check Until Dashboard Built)
- Fallback rate >20% in 1 hour -> primary OCR provider issue
- Success rate <90% -> systemic problem
- Average confidence <0.7 -> quality degradation

---

## 10. Rollout / Migration Plan

### Phase 1: Deploy Backend (No Frontend Changes)
1. Push Slices 1-6 to `staging` branch
2. Deploy backend to staging Render instance
3. Verify: `curl -X POST /api/v1/ocr/extract` works on staging
4. The new endpoint exists alongside old endpoints - zero risk

### Phase 2: Migrate Frontend (One Path at a Time)
5. Push Slice 7 (medical) -> test medical upload on staging
6. Push Slices 8-10 (receipts, fuel, bank) -> test each on staging
7. Each migration is independent - can revert one without affecting others

### Phase 3: Cleanup
8. After all frontend paths confirmed working on staging:
   - Push Slice 11 (remove old vision endpoints)
   - Push Slice 12 (remove tesseract.js)
9. Run backfill (Slice 13) on production after full deployment

### Rollback Plan
- **Backend rollback**: Old vision endpoints remain active until Slice 11. If new OCR endpoint has issues, frontend can be reverted to use old endpoints.
- **Frontend rollback**: Each component is migrated independently. Revert specific component file to restore old behavior.
- **Cache table**: `ocr_cache` table is additive - dropping it has no impact on existing functionality.

### Feature Flag (Simple)
Not needed. The migration is file-level: each frontend component either calls the old endpoint or the new one. Git revert is the "feature flag".

---

## 11. Agent Notes

### Agent Notes - Session Log
- (timestamp) ...

### Agent Notes - Decisions
- Decision / rationale / alternatives

### Agent Notes - Open Questions
- Is `pdfplumber` already installed in the Render deployment? Check with `pip show pdfplumber`.
- Does `pillow-heif` install cleanly on Render (Linux)? May need to add `libheif-dev` to build. Fallback: skip server-side HEIC, rely on client-side heic2any conversion.
- Should `pdfjs-dist` be kept in frontend? Check if it's used for PDF viewing anywhere besides OCR.
- Google Cloud Vision API key vs service account - which setup fits Render better? API key is simpler. Service account JSON needs to be base64-encoded in env var.

### Agent Notes - Regression Checklist
- [ ] `cd backend && python -m pytest tests/unit/test_ocr_service.py -v`
- [ ] `cd backend && python -m pytest tests/integration/test_ocr_endpoint.py -v`
- [ ] `cd backend && python -m pytest tests/unit/test_universal_receipt_parser.py -v`
- [ ] `npm run type-check`
- [ ] `npm run build`
- [ ] `npm run quality:check:full`
- [ ] Manual: Upload JPEG receipt through UI -> data extracted
- [ ] Manual: Upload PDF medical doc through UI -> ocr_text populated
- [ ] Manual: Upload HEIC photo from iPhone -> auto-converts, data extracted
- [ ] Manual: Upload bank statement PDF -> transactions parsed
