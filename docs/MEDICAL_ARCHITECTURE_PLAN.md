# Medical Module Architecture Plan

## Component Structure (Adapted from Doctor Dok)

### Core Components to Build

#### 1. **MedicalDashboard.tsx**
Based on Doctor Dok's record management approach:
- Overview of all medical data
- Quick access cards for Documents, Medications, Emergency Info
- Recent activity timeline
- Quick actions (upload document, add medication)

#### 2. **MedicalDocuments.tsx** ✅ ENHANCED (December 2025)
Inspired by `record-form.tsx` and `record-item.tsx`:
- Document upload with drag & drop ✅
- Document categorization (lab results, prescriptions, etc.) ✅
- List view with search/filter ✅
- **In-app document preview** ✅ (NEW - December 2025)
  - Markdown files render with formatting (react-markdown)
  - Text/CSV files display in monospace
  - PDF files in native iframe viewer
  - Images with native display
  - Office documents show clean download UI
- **Fullscreen document viewing mode** ✅ (NEW)
- **OCR text extraction during upload** ✅ (IMPLEMENTED)
  - PDF text extraction via pdfjs-dist
  - Image OCR via Tesseract.js with progress indicator
  - Plain text/markdown direct reading
  - Extracted text stored in `ocr_text` column for PAM AI search

#### 3. **MedicalMedications.tsx**
Simplified medication tracking:
- Add/edit medication form
- Active medications list
- Refill reminders
- Dosage schedule view

#### 4. **MedicalEmergency.tsx**
Critical information display:
- Emergency contacts
- Blood type & allergies
- Medical conditions
- Insurance information
- Printable emergency card

#### 5. **MedicalTimeline.tsx**
Health history visualization:
- Chronological event display
- Filter by type
- Search functionality

### Data Flow Architecture

```
User → You Page → Medical Section
                      ↓
              MedicalContext (State Management)
                      ↓
              Supabase (Data Storage)
                      ↓
              - medical_records table
              - medical_medications table
              - medical_emergency_info table
```

### Key Differences from Doctor Dok

| Doctor Dok | Our Implementation |
|------------|-------------------|
| Next.js App Router | React Router nested routes |
| SQLite + Drizzle | Supabase PostgreSQL |
| Server Components | Client-side React |
| Encrypted attachments | Supabase Storage with RLS |
| Complex record types | Simplified medical types |
| AI parsing (required) | OCR optional enhancement |

### Component Patterns to Follow

1. **Form Handling**: Use our existing React Hook Form + Zod pattern
2. **UI Components**: Use our Shadcn/Radix components
3. **State Management**: MedicalContext similar to AuthContext
4. **File Upload**: Adapt to use Supabase Storage
5. **Error Handling**: Use our existing error boundaries
6. **Loading States**: Follow our existing patterns

### Dependencies ✅ INSTALLED (December 2025)

```json
{
  "tesseract.js": "^5.1.1",   // OCR for images ✅ INSTALLED
  "pdfjs-dist": "^4.x",       // PDF text extraction ✅ INSTALLED
  "react-markdown": "^9.x"    // Markdown rendering ✅ INSTALLED
}
```

**Note:** `pdf-parse` replaced with `pdfjs-dist` for better browser compatibility.

### File Structure

```
src/
├── types/
│   └── medical.ts ✅ (created)
├── contexts/
│   └── MedicalContext.tsx (to create)
├── components/
│   └── you/
│       └── medical/
│           ├── MedicalDashboard.tsx
│           ├── MedicalDocuments.tsx
│           ├── MedicalMedications.tsx
│           ├── MedicalEmergency.tsx
│           ├── MedicalTimeline.tsx
│           ├── components/
│           │   ├── DocumentUpload.tsx
│           │   ├── MedicationForm.tsx
│           │   ├── EmergencyCard.tsx
│           │   └── TimelineEntry.tsx
│           └── utils/
│               ├── ocr.ts
│               └── medical-helpers.ts
└── pages/
    └── You.tsx (to enhance)
```

### Integration Points

1. **You Page**: Add Medical Records section below calendar
2. **Routing**: Add subroutes under `/you/medical/*`
3. **Navigation**: Cards in You page linking to subroutes
4. **Database**: Three new tables in Supabase
5. **Storage**: New bucket for medical documents
6. **Auth**: Use existing auth system and RLS

### Security Considerations

1. **Data Isolation**: Medical data only accessible by owner
2. **RLS Policies**: Strict row-level security
3. **Document Storage**: Private Supabase bucket
4. **No Encryption**: Rely on Supabase security (unlike Doctor Dok)
5. **Feature Flags**: Control rollout and disable if needed

### Mobile Optimizations

1. **Camera Upload**: Direct photo capture for documents
2. **Responsive Design**: Mobile-first approach
3. **Offline Support**: Cache emergency info locally
4. **Touch Targets**: Large buttons for RV use
5. **Quick Actions**: One-tap medication logging

### MVP Features (Phase 1) - COMPLETE ✅

1. ✅ Basic document upload and viewing
2. ✅ Simple medication list
3. ✅ Emergency contact card
4. ✅ **OCR text extraction** (IMPLEMENTED December 2025)
   - PDF text extraction with pdfjs-dist
   - Image OCR with Tesseract.js
   - Progress indicator during extraction
5. ✅ **In-app document preview** (IMPLEMENTED December 2025)
   - Markdown, text, PDF, image rendering
   - Fullscreen mode
6. ✅ **AI Health Consultation** (IMPLEMENTED)
7. ❌ Reminders (Future enhancement)

### Testing Strategy

1. **Unit Tests**: Component logic
2. **Integration Tests**: Supabase operations
3. **E2E Tests**: User flows
4. **Mobile Tests**: Responsive design
5. **Performance Tests**: Document upload speed

## Next Steps

1. Create Supabase schema (Phase 3)
2. Add dependencies (Phase 4)
3. Build medical components (Phase 5-7)
4. Integrate with You page (Phase 5)
5. Add routing (Phase 6)
6. Test thoroughly (Phase 8)

---

This plan takes the best concepts from Doctor Dok while adapting them to our existing architecture and avoiding complexity we don't need.