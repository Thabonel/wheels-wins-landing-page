# Codebase Baseline Metrics
**Generated:** October 8, 2025
**Tool:** Knip v5.x (open source, ISC license)

## 🎯 Dead Code Analysis Results

### Summary (Knip Scan - v5.64.2)
- **Unused files:** 288 files
- **Unused exports:** 112 exports
- **Unused types:** 90 exported types
- **Unused enum members:** 2 members
- **Unused dependencies:** 1 package
- **Unused devDependencies:** 1 package

### Current Codebase Size
```
Frontend TypeScript files: 851 files
Frontend LOC: 209,706 lines
Backend Python files: 512 files
Backend LOC: 162,516 lines
Total LOC: 372,222 lines
```

**Dead Code Percentage:**
- Unused files: 288 / 851 = **33.8% of frontend files**
- This aligns with Meta's 30-50% reduction target

## 📊 Estimated Cleanup Potential

Based on Knip analysis:
- **288 unused files** → Potential to remove (pending production verification)
- **112 unused exports** → Can clean up once files verified
- **1+1 unused dependencies** → Can remove from package.json (~2 packages)

**Expected code reduction:** 30-50% (based on Meta's results with similar ratios)

## ⚠️ CRITICAL: Do NOT Delete Yet!

**Next Steps (Per ENTERPRISE_DEAD_CODE_REMOVAL_PLAN.md):**
1. ✅ Knip installed and baseline established
2. ⏳ Deploy production usage tracking (Week 1)
3. ⏳ Monitor for 14 days (October 8-22, 2025)
4. ⏳ Combine Knip results with production logs (Week 3)
5. ⏳ Delete in micro-batches with testing (Week 3-4)

**Confidence Level:** Will increase from LOW → HIGH after production monitoring

## 🔍 Sample Unused Files (Top 20)

$(npx knip --reporter compact 2>&1 | grep "^src/" | head -20)

See full list: Run \`npx knip\`

## 📈 Progress Tracking

| Date | Files Deleted | Tests Pass | Production Stable | Notes |
|------|---------------|------------|-------------------|-------|
| Oct 8 | 0 | ✅ | ✅ | Baseline established |
| Oct 22 | TBD | TBD | TBD | After monitoring period |
| Oct 29 | TBD | TBD | TBD | After cleanup Week 1 |
| Nov 5 | TBD | TBD | TBD | Cleanup complete |

**Target:** Remove 30-50% of unused code safely
