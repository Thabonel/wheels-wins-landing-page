# Medical Document Viewer Feature

**Implemented:** December 2025
**Status:** Production
**Commit:** `4e1f4f5c`

---

## Overview

The Medical Document Viewer provides in-app preview for medical documents with automatic text extraction for AI search capabilities. This feature eliminates the need for external applications and enables PAM AI to reference document contents.

---

## Features

### 1. In-App Document Preview

| Format | Preview Type | Notes |
|--------|--------------|-------|
| Markdown (.md, .markdown) | Rendered HTML | Uses react-markdown |
| Text (.txt, .csv) | Monospace display | Preserves formatting |
| PDF (.pdf) | Native iframe | Browser's PDF viewer |
| Images (.jpg, .png, .gif, .webp, .bmp, .tiff) | Native `<img>` | Full resolution |
| Office (.doc, .docx, .xls, .xlsx) | Download UI | Clean "Download" button |

### 2. Fullscreen Document Viewing

- Toggle button in document header (Maximize/Minimize icons)
- Uses browser Fullscreen API
- Escape key exits fullscreen
- State tracked via `isFullscreen` React state

### 3. Text Extraction During Upload

Automatic text extraction enables AI search on document contents:

| Source | Method | Library | Progress |
|--------|--------|---------|----------|
| PDF files | Text layer extraction | pdfjs-dist | Page-by-page % |
| Images | OCR (Optical Character Recognition) | Tesseract.js | Recognition % |
| Text files | Direct read | Native File API | Instant |
| Markdown | Direct read | Native File API | Instant |

### 4. Enhanced Document Header

- Document icon with type-based coloring
- Title with metadata
- Type badge (Lab Result, Prescription, etc.)
- Upload date
- Fullscreen toggle button

---

## Architecture

### Frontend Components

```
src/components/you/medical/
├── MedicalDocuments.tsx       # Main viewer with preview dialog
├── DocumentUploadDialog.tsx   # Upload form with extraction
└── MedicalDashboard.tsx       # Dashboard with quick actions
```

### Key Files Modified

1. **`MedicalDocuments.tsx`**
   - Added fullscreen state and toggle
   - Added text content fetching for .txt/.md files
   - Added ReactMarkdown rendering
   - Consolidated action buttons (removed duplicates)
   - Enhanced header with metadata

2. **`DocumentUploadDialog.tsx`**
   - Added PDF text extraction (pdfjs-dist)
   - Added image OCR (Tesseract.js)
   - Added progress indicator during extraction
   - Stores extracted text in `ocr_text` column

### Dependencies Added

```json
{
  "react-markdown": "^9.x",
  "pdfjs-dist": "^4.x",
  "tesseract.js": "^5.x"
}
```

---

## Database Integration

### `medical_records` Table

```sql
CREATE TABLE medical_records (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    summary TEXT,
    tags TEXT[],
    test_date DATE,
    document_url TEXT,          -- Supabase Storage path
    content_json JSONB,         -- Structured data (future)
    ocr_text TEXT,              -- Extracted text for AI search
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### Text Extraction Flow

```
User uploads file
       ↓
DocumentUploadDialog.tsx
       ↓
extractTextContent(file)
       ├── isPdfFile? → extractPdfText() → pdfjs-dist
       ├── isImageFile? → extractImageText() → Tesseract.js
       └── isTextFile? → file.text() → Native API
       ↓
Extracted text stored in ocr_text column
       ↓
Available for PAM AI search queries
```

---

## Usage

### Viewing Documents

1. Navigate to You > Medical Records > Documents tab
2. Click on any document card
3. Preview dialog opens with:
   - Document preview (format-specific)
   - Metadata header
   - Action buttons (Open in Tab, Download)
4. Click Maximize for fullscreen viewing

### Uploading Documents

1. Click "Upload Document" button
2. Drag & drop or click to select file
3. Fill in metadata (title, type, date, tags)
4. Progress indicator shows extraction status
5. Click "Upload Document" to save

### Supported Upload Formats

```
image/*                         # All image types
application/pdf                 # PDF documents
.doc, .docx                     # Word documents
.txt, .md, .markdown, .csv      # Text files
```

---

## AI Integration

### PAM Search Capability

The `ocr_text` column enables PAM to search medical document contents:

```typescript
// Example: Search for cholesterol-related documents
const { data } = await supabase
  .from('medical_records')
  .select('*')
  .eq('user_id', userId)
  .ilike('ocr_text', '%cholesterol%');
```

### Future Enhancements

1. **Full-text search index** - PostgreSQL tsvector on ocr_text
2. **AI summarization** - Claude summarizes documents on upload
3. **Entity extraction** - Extract medications, conditions, dates
4. **Health insights** - AI analyzes patterns across documents

---

## Performance Considerations

### OCR Processing Time

| File Type | Typical Time | Notes |
|-----------|--------------|-------|
| PDF (10 pages) | 2-5 seconds | Depends on text density |
| Image (photo) | 3-10 seconds | Depends on image size |
| Text file | < 100ms | Direct read |

### Optimization Strategies

1. **Progress indicators** - User sees extraction progress
2. **Background processing** - UI remains responsive
3. **Error handling** - Graceful fallback if extraction fails
4. **Lazy loading** - Text content fetched on-demand for preview

---

## Security

### Data Protection

- Documents stored in private Supabase bucket
- RLS policies enforce user_id isolation
- Signed URLs expire after short period
- No document content sent to external services (OCR runs client-side)

### Privacy Considerations

- OCR processing happens in browser (client-side)
- Extracted text stored in user's own database row
- HIPAA-compliant data handling principles

---

## Testing Checklist

- [ ] Upload markdown file - renders with formatting
- [ ] Upload text file - displays as monospace
- [ ] Upload PDF - shows in iframe, extracts text
- [ ] Upload image - displays, runs OCR with progress
- [ ] Upload Word doc - shows download UI
- [ ] Check database - `ocr_text` populated
- [ ] Fullscreen toggle works
- [ ] No duplicate action buttons
- [ ] Mobile responsive preview

---

## Troubleshooting

### OCR Not Working

1. Check browser console for Tesseract errors
2. Verify image is readable (not too blurry)
3. Check network - Tesseract loads worker from CDN

### PDF Not Rendering

1. Check if PDF is password-protected
2. Verify signed URL is valid
3. Check browser PDF viewer settings

### Text Not Extracted

1. Check file type is supported
2. Verify `ocr_text` column exists in table
3. Check upload error in console

---

## Related Documentation

- [MEDICAL_ARCHITECTURE_PLAN.md](./MEDICAL_ARCHITECTURE_PLAN.md)
- [AI_HEALTH_CONSULTATION_DESIGN.md](./AI_HEALTH_CONSULTATION_DESIGN.md)
- [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md)
- [PAM_SYSTEM_ARCHITECTURE.md](./PAM_SYSTEM_ARCHITECTURE.md)

---

**Last Updated:** December 2025
