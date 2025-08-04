# Task: [Task Name]

## Goals
- [Primary objective]
- [Secondary objectives]
- [Success criteria]

## Context
- Current state: [What exists now]
- Desired state: [What we want to achieve]
- Constraints: [Technical/business limitations]

## Steps
1. **Analysis Phase**
   - [ ] Review existing code/architecture
   - [ ] Identify dependencies and impacts
   - [ ] Document current behavior

2. **Design Phase**
   - [ ] Create technical design
   - [ ] Define data models/schemas
   - [ ] Plan API changes

3. **Implementation Phase**
   - [ ] Implement core functionality
   - [ ] Add error handling
   - [ ] Update documentation

4. **Testing Phase**
   - [ ] Write unit tests
   - [ ] Add integration tests
   - [ ] Manual testing checklist

5. **Deployment Phase**
   - [ ] Update environment variables
   - [ ] Database migrations
   - [ ] Update CHANGELOG.md

## Technical Details
- **Files to modify**: 
  - `path/to/file1.ts`
  - `path/to/file2.py`
- **New files to create**:
  - `path/to/newfile.ts`
- **Dependencies to add**:
  - `package-name` (if any)

## Risks & Mitigations
- **Risk**: [Potential issue]
  - **Mitigation**: [How to handle]

## Success Metrics
- [ ] Feature works as specified
- [ ] All tests pass
- [ ] No performance regression
- [ ] Documentation updated

## Notes
- [Any additional context or considerations]

---

## Example Usage:

# Task: Add PDF Verification System

## Goals
- Support 3 PDF types: invoice, receipt, contract
- Validate structure and metadata
- Output results to markdown
- Integrate with existing document management

## Context
- Current state: Manual PDF review process is error-prone
- Desired state: Automated validation with clear reports
- Constraints: Must work with existing Supabase storage

## Steps
1. **Analysis Phase**
   - [ ] Review current PDF handling in storage service
   - [ ] Analyze existing document types and structures
   - [ ] Check current validation approaches

2. **Design Phase**
   - [ ] Design verification rules per document type
   - [ ] Create validation schema with Zod
   - [ ] Plan API endpoint structure

3. **Implementation Phase**
   - [ ] Create PDF parser service
   - [ ] Implement type-specific validators
   - [ ] Build markdown report generator
   - [ ] Add API endpoints

4. **Testing Phase**
   - [ ] Unit tests for each validator
   - [ ] Integration tests with sample PDFs
   - [ ] Edge case testing (corrupted files, wrong types)

5. **Deployment Phase**
   - [ ] Update API documentation
   - [ ] Add feature flag if needed
   - [ ] Update CHANGELOG.md

## Technical Details
- **Files to modify**: 
  - `backend/app/services/storage.py`
  - `backend/app/api/v1/endpoints/documents.py`
- **New files to create**:
  - `backend/app/services/pdf_validator.py`
  - `backend/app/schemas/document_validation.py`
- **Dependencies to add**:
  - `pypdf2` or `pdfplumber` for PDF parsing

## Risks & Mitigations
- **Risk**: Large PDFs could timeout
  - **Mitigation**: Add file size limits and async processing
- **Risk**: Malformed PDFs could crash parser
  - **Mitigation**: Wrap in try-catch with graceful degradation

## Success Metrics
- [ ] 95% accuracy in document type detection
- [ ] Processing time under 5 seconds per document
- [ ] Clear error messages for validation failures
- [ ] Zero crashes from malformed inputs

## Notes
- Consider future support for OCR if PDFs are scanned
- May want to add webhook notifications for validation results