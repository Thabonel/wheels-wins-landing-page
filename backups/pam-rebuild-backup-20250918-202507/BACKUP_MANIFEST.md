# PAM Rebuild Backup Manifest
**Created**: 2025-09-18 20:25:07
**Purpose**: Complete backup before PAM system rebuild
**Restore Command**: See restoration instructions below

## Backup Contents

### Frontend Files Backed Up (175 files)
**Location**: `frontend-src/`
- All PAM components: `src/components/pam/`
- PAM-related hooks: `src/hooks/pam/`
- PAM services: `src/services/pam*/`
- PAM utilities: `src/utils/pam*`
- PAM types: `src/types/pamTypes.ts`
- PAM pages: `src/pages/PAM*`
- PAM analytics: `src/components/admin/pam-analytics/`
- PAM tests: All test files containing "pam" or "PAM"

### Backend Files Backed Up (140 files)
**Location**: `backend/`
- Main API endpoint: `app/api/v1/pam.py`
- PAM services: `app/services/pam/`
- PAM agents: `app/agents/pam/`
- PAM models: `app/models/*/pam.py`
- PAM core services: `app/core/*pam*`
- PAM guardrails: `app/guardrails/pam_guardrails.yaml`
- PAM tools and MCP: `app/services/pam/mcp/`, `app/services/pam/tools/`
- Test files: All PAM-related tests

### Configuration Files
- `package.json` - Frontend dependencies
- `requirements.txt` - Backend dependencies

## Critical Files to Restore if Needed

### High Priority Frontend Files:
1. `src/components/pam/SimplePAM.tsx` - Main PAM component
2. `src/hooks/pam/` - All PAM hooks (WebSocket implementations)
3. `src/services/pamService.ts` - Core PAM service
4. `src/services/pam/` - Advanced PAM services

### High Priority Backend Files:
1. `backend/app/api/v1/pam.py` - Main WebSocket endpoint
2. `backend/app/services/claude_ai_service.py` - Claude integration
3. `backend/app/core/personalized_pam_agent.py` - Core PAM logic
4. `backend/app/services/pam/` - All PAM service modules

## Restoration Instructions

### Quick Restore (if rebuild fails):
```bash
# Restore all PAM frontend files
rsync -av backups/pam-rebuild-backup-20250918-202507/frontend-src/ src/

# Restore all PAM backend files
rsync -av backups/pam-rebuild-backup-20250918-202507/backend/ backend/

# Restore configuration
cp backups/pam-rebuild-backup-20250918-202507/package.json .
cp backups/pam-rebuild-backup-20250918-202507/requirements.txt backend/
```

### Selective Restore:
```bash
# Restore only specific components
cp -r backups/pam-rebuild-backup-20250918-202507/frontend-src/components/pam/ src/components/
cp backups/pam-rebuild-backup-20250918-202507/backend/app/api/v1/pam.py backend/app/api/v1/
```

## Pre-Rebuild State Summary

### Current PAM Architecture Issues (From Analysis):
1. **Component Duplication**: 4+ different WebSocket implementations
2. **Technical Debt**: Multiple PAM components serving similar purposes
3. **Missing Features**: Session management, advanced analytics tables
4. **Performance Optimization**: Bundle splitting needed

### Files That Will Be Rebuilt:
- Unified PAM component (consolidating SimplePAM.tsx and others)
- Single WebSocket implementation (replacing 4 different versions)
- Enhanced PAM service architecture
- Improved database schema integration

### Files to Keep as Reference:
- Working WebSocket implementations for fallback
- Existing PAM prompt engineering
- Tool integrations that are working
- Analytics components that are functional

## Verification

Run this command to verify backup integrity:
```bash
find backups/pam-rebuild-backup-20250918-202507 -type f | wc -l
# Should show 320+ files backed up
```

## Notes
- This backup includes ALL PAM-related code before the major rebuild
- Frontend backup: 175 files, 449KB total
- Backend backup: 140 files, 720KB total
- Total backup size: ~1.2MB
- Backup is comprehensive and allows for complete restoration