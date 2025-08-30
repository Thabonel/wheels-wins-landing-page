# Medical Feature Rollback Procedures

## Current State Baseline
- **Date**: August 30, 2025
- **Branch**: feature/medical-records-submenu
- **Base Branch**: staging
- **Last Working Commit**: d6ca4ac4 (staging branch)

## Backup Locations
- Package.json backup: `docs/backup-package-20250830.json`
- Database schema: Supabase automatic backups
- Git branch: `backup/20250830_132211_pam_intelligent_conversation_complete`

## Quick Rollback Steps

### 1. Code Rollback
```bash
# If on feature branch with issues
git checkout staging
git branch -D feature/medical-records-submenu

# If changes were merged to staging
git checkout staging
git reset --hard d6ca4ac4
git push --force-with-lease origin staging
```

### 2. Database Rollback
```sql
-- If medical tables were created, drop them
DROP TABLE IF EXISTS medical_emergency_info CASCADE;
DROP TABLE IF EXISTS medical_medications CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
```

### 3. Package.json Restore
```bash
# Restore original package.json
cp docs/backup-package-20250830.json package.json
npm install
```

### 4. Environment Variables
```bash
# Remove any medical-related env vars
# VITE_MEDICAL_ENABLED=false
```

## Testing After Rollback
1. Run `npm test` to verify tests pass
2. Run `npm run build:netlify` to verify build
3. Test You page and Calendar functionality
4. Verify all existing tabs work (You, Wheels, Wins, Social, Shop)

## Emergency Contacts
- If rollback fails, restore from backup branch:
  ```bash
  git checkout backup/20250830_132211_pam_intelligent_conversation_complete
  ```

## Medical Feature Components to Remove (if added)
- `/src/components/you/medical/` (entire folder)
- `/src/contexts/MedicalContext.tsx`
- Medical routes in `App.tsx`
- Medical section in `You.tsx`

## Dependencies to Remove (if added)
- tesseract.js
- pdf-parse
- Any other medical-specific packages

## Feature Flags to Disable
```typescript
// In src/config/features.ts
export const features = {
  medicalRecords: false // Set to false or remove
};
```

## Verification Checklist
- [ ] You page loads correctly
- [ ] Calendar functionality works
- [ ] All navigation tabs function
- [ ] No console errors
- [ ] Build process succeeds
- [ ] Tests pass

## Notes
- This rollback plan assumes medical feature is isolated
- All medical code is contained in specific folders
- Database changes are in separate tables
- No modifications to existing core functionality

---
Document created: August 30, 2025
Last updated: August 30, 2025