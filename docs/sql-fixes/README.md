# SQL Fixes for Supabase

**This folder contains SQL migrations and fixes for the Wheels & Wins database.**

---

## 🚨 URGENT: PAM Tables Fix (January 11, 2025)

**Issue:** "operator does not exist: bigint = uuid" error when creating PAM tables

**Quick Fix (2 minutes):**
1. Open Supabase SQL Editor
2. Copy: `00_fix_missing_pam_tables_safe.sql`
3. Paste and Run
4. Done!

**Files:**
- `00_fix_missing_pam_tables_safe.sql` - ⭐ Type-safe version (USE THIS)
- `01_diagnose_profiles_table.sql` - Diagnostic queries
- `EXECUTION_GUIDE.md` - Complete step-by-step guide
- `DATABASE_FIX_GUIDE.md` - Troubleshooting guide

This creates 4 missing PAM tables and fixes 5 broken tools:
- track_savings
- export_budget_report
- add_knowledge
- search_knowledge
- create_calendar_event

---

## 📈 PERFORMANCE OPTIMIZATION - Start with these files:

### CRITICAL - Fix 80% of performance issues:
1. `11_optimize_realtime_performance.sql` ⭐
2. `12_optimize_schema_queries.sql` ⭐

### HIGH PRIORITY - Fix 877 warnings:
3. `07_add_missing_foreign_key_indexes.sql`
4. `08_add_more_foreign_key_indexes.sql`
5. `09_remove_unused_indexes.sql`
6. `10_add_primary_key.sql`

### MEDIUM PRIORITY - Additional optimizations:
7. `01_create_foreign_key_indexes.sql`
8. `02_create_date_indexes.sql`
9. `03_create_composite_indexes.sql`
10. `04_create_category_indexes.sql`
11. `05_create_specialized_indexes.sql`
12. `06_update_statistics.sql`

## 📁 Other Files
The remaining 223 files are historical migrations, emergency fixes, and archived scripts.

**Only run the 12 numbered files above** unless you need a specific historical migration.

## ⚠️ Important Notes
- Files 1-6 may have table/column mismatches
- Focus on files 7-12 for current performance issues
- Files 11-12 address the realtime query bottleneck (80% of DB load)
- All files are clean SQL with no comments