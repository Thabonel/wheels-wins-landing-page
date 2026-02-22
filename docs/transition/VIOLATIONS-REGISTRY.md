# Supabase Dependency Violations Registry

> Living document - updated as migrations progress.
> Generated from full codebase audit on 2026-02-08.

---

## Summary

| Category | Count | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| Frontend: Direct Database Mutations | 20 files, 43 calls | 20 | 0 | 0 | 0 |
| Frontend: RPC Calls | 16 files, 31 calls | 0 | 16 | 0 | 0 |
| Frontend: Auth Coupling | 55+ files, 120+ calls | 0 | 10 | 45 | 0 |
| Frontend: Storage Coupling | 8 files, 21 calls | 0 | 8 | 0 | 0 |
| Frontend: Client Imports | 203 files | 0 | 0 | 185 | 18 |
| Backend: Supabase Client Usage | 120+ files | 4 | 116 | 0 | 0 |
| Backend: RPC Calls | 25+ files, 55+ calls | 0 | 25 | 0 | 0 |
| Backend: Auth / JWT Coupling | 25+ files | 0 | 15 | 10 | 0 |
| Configuration Coupling | 12 files, 6 env vars | 2 | 4 | 6 | 0 |
| **Total** | **~490 violations** | **26** | **194** | **246** | **18** |

---

## Frontend: Direct Database Mutations (Phase 4)

Files that call `supabase.from('table').insert/update/delete/upsert()` - bypassing the backend entirely.

| File | Line(s) | Table/Operation | Severity | Status |
|---|---|---|---|---|
| src/hooks/useExpenseActions.ts | 89 | `expenses.insert()` | critical | pending |
| src/hooks/useExpenseActions.ts | 170 | `budget_categories.insert()` | critical | pending |
| src/components/wins/expenses/CategoryManagementModal.tsx | 51 | `budgets.insert()` | critical | pending |
| src/components/wins/tips/useTipsData.ts | 131 | `financial_tips.update()` | critical | pending |
| src/components/transition/ShakedownLogger.tsx | 229 | `shakedown_trips.insert()` | critical | pending |
| src/components/transition/ShakedownLogger.tsx | 283 | `shakedown_issues.insert()` | critical | pending |
| src/components/transition/AddModificationDialog.tsx | 191 | `transition_vehicle_mods.insert()` | critical | pending |
| src/components/transition/CommunityHub.tsx | 212 | `user_tags.insert()` | critical | pending |
| src/components/transition/CommunityHub.tsx | 255 | `user_tags.delete()` | critical | pending |
| src/components/transition/CommunityHub.tsx | 287 | `community_messages.insert()` | critical | pending |
| src/components/transition/CommunityHub.tsx | 319 | `community_connections.insert()` | critical | pending |
| src/components/social/SocialHustleBoard.tsx | 86 | `hustle_ideas.update()` | critical | pending |
| src/components/social/SocialHustleBoard.tsx | 128 | `money_maker_ideas.insert()` | critical | pending |
| src/components/social/SocialMarketplace.tsx | 73 | `marketplace_listings.select()` (direct read) | critical | pending |
| src/components/social/useSocialData.ts | 139 | `social_posts.insert()` | critical | pending |
| src/components/social/useSocialData.ts | 150 | `social_groups.insert()` | critical | pending |
| src/services/digistore24Service.ts | 117 | `analytics_events.insert()` | critical | pending |
| src/lib/authLogging.ts | 32 | `user_login_history.insert()` | critical | pending |
| src/lib/authLogging.ts | 43 | `user_active_sessions.insert()` | critical | pending |
| src/pages/Shop.tsx | 80 | `affiliate_product_clicks.insert()` | critical | pending |
| src/components/shop/ProductCard.tsx | 62 | `product_issue_reports.insert()` | critical | pending |
| src/components/wheels/storage/useStorageData.ts | 39-41 | `storage_items/categories/locations.select()` | critical | pending |
| src/components/wheels/storage/useStorageData.ts | 120 | `storage_items.insert()` | critical | pending |
| src/services/pam/agents/MemoryAgent.ts | 473 | `pam_interactions.insert()` | critical | pending |
| src/utils/integrationTesting.ts | 535-600 | `expenses/budgets/income_entries/profiles.select()` (test reads) | critical | pending |

---

## Frontend: RPC Calls (Phase 5)

Files that call `supabase.rpc('function_name')` - these invoke PostgreSQL functions directly.

| File | Line(s) | RPC Function(s) | Severity | Status |
|---|---|---|---|---|
| src/services/enhancedSecurity.ts | 210 | `log_security_event` | high | pending |
| src/services/enhancedSecurity.ts | 233 | `check_failed_login_attempts` | high | pending |
| src/services/enhancedSecurity.ts | 253 | `check_rate_limit` | high | pending |
| src/services/tripTemplateService.ts | 756 | `increment_template_usage` | high | pending |
| src/services/pam/memoryService.ts | 189 | `find_similar_memories` | high | pending |
| src/services/pam/memoryService.ts | 478 | `delete_user_pam_memories` | high | pending |
| src/services/pam/memoryService.ts | 501 | `cleanup_expired_pam_memories` | high | pending |
| src/services/pam/memoryService.ts | 666 | `update_memory_importance` | high | pending |
| src/pages/Shop.tsx | 94 | `increment_product_clicks` | high | pending |
| src/hooks/useCommunityFeatures.ts | 344 | `calculate_trust_score` | high | pending |
| src/components/transition/ShakedownLogger.tsx | 192 | `get_shakedown_stats` | high | pending |
| src/components/transition/LaunchWeekPlanner.tsx | 133 | `get_days_until_launch` | high | pending |
| src/components/transition/LaunchWeekPlanner.tsx | 174 | `get_launch_week_progress` | high | pending |
| src/components/transition/CommunityHub.tsx | 149 | `get_user_connection_stats` | high | pending |
| src/components/transition/CommunityHub.tsx | 158 | `find_similar_users` | high | pending |
| src/components/transition/CommunityHub.tsx | 239 | `find_similar_users` | high | pending |
| src/components/transition/TransitionSupport.tsx | 194 | `check_badge_eligibility` | high | pending |
| src/components/transition/VehicleModifications.tsx | 148 | `get_vehicle_mod_stats` | high | pending |
| src/components/transition/EquipmentManager.tsx | 138 | `get_equipment_stats` | high | pending |
| src/components/transition/TransitionDashboard.tsx | 489, 603 | `get_or_create_transition_profile` | high | pending |
| src/components/you/TransitionNavigatorCard.tsx | 86 | `start_transition_profile` | high | pending |
| src/components/debug/AuthDebugPanel.tsx | 63 | `diagnose_auth_issue` | high | pending |
| src/utils/authDebug.ts | 81 | `test_manual_jwt_extraction` | high | pending |
| src/utils/authDebug.ts | 149 | `get_current_user_id` | high | pending |
| src/utils/authDebug.ts | 155 | `exec_sql` | high | pending |
| src/utils/authInvestigation.ts | 218 | `get_current_user_id` | high | pending |

---

## Frontend: Auth Coupling (Phase 3)

Files using `supabase.auth.*` methods. These must be abstracted behind an auth service.

### Core Auth (Critical Path - 10 files)

| File | Line(s) | Operations | Severity | Status |
|---|---|---|---|---|
| src/context/AuthContext.tsx | 82, 181, 283, 300, 323, 357 | `onAuthStateChange`, `getSession`, `refreshSession`, `signInWithPassword`, `signUp`, `signOut` | high | pending |
| src/pages/Login.tsx | 41 | `signInWithOAuth` | high | pending |
| src/pages/Signup.tsx | 31 | `signInWithOAuth` | high | pending |
| src/components/auth/SignupForm.tsx | 95 | `signUp` | high | pending |
| src/components/auth/UpdatePasswordForm.tsx | 30 | `updateUser` | high | pending |
| src/components/auth/PasswordResetRequestForm.tsx | 27 | `resetPasswordForEmail` | high | pending |
| src/components/settings/AccountSecurity.tsx | 38, 66 | `updateUser` (email, password) | high | pending |
| src/services/auth/config.ts | 125 | `getSession` | high | pending |
| src/integrations/supabase/client.ts | 117 | `onAuthStateChange` | high | pending |
| src/services/enhancedSecurity.ts | 28, 66, 82 | `mfa.enroll`, `mfa.verify`, `mfa.unenroll` | high | pending |

### Session/Token Management (45+ files)

| File | Line(s) | Operations | Severity | Status |
|---|---|---|---|---|
| src/services/pamService.ts | 308 | `refreshSession` | medium | pending |
| src/services/pamSavingsService.ts | 153, 615, 957 | `getSession`, `getUser` | medium | pending |
| src/services/pamCalendarService.ts | 205 | `getUser` | medium | pending |
| src/services/pamFeedbackService.ts | 196 | `getUser` | medium | pending |
| src/services/receiptService.ts | 25, 64 | `getSession` | medium | pending |
| src/services/api.ts | 62, 102 | `getSession` | medium | pending |
| src/services/edgeFunctions.ts | 114, 147, 181 | `getSession` | medium | pending |
| src/services/digistore24Service.ts | 100, 182, 211 | `getUser`, `getSession` | medium | pending |
| src/services/health-ai/healthConsultationClient.ts | 95 | `getSession` | medium | pending |
| src/services/pam/contextManager.ts | 410, 922 | `getUser`, `getSession` | medium | pending |
| src/services/pam/cache/cacheIntegration.ts | 39 | `onAuthStateChange` | medium | pending |
| src/services/pam/cache/responseCache.ts | 817 | `onAuthStateChange` | medium | pending |
| src/context/RegionContext.tsx | 72 | `getSession` | medium | pending |
| src/hooks/useCalendarEvents.ts | 73 | `getUser` | medium | pending |
| src/hooks/useSessionRecovery.ts | 27 | `getSession` | medium | pending |
| src/hooks/pam/usePamErrorRecovery.ts | 278, 282 | `getSession`, `refreshSession` | medium | pending |
| src/utils/websocketAuth.ts | 98, 120 | `getSession`, `refreshSession` | medium | pending |
| src/utils/websocketErrorRecovery.ts | 130, 164 | `getSession`, `refreshSession` | medium | pending |
| src/utils/supabasePermissionHandler.ts | 31, 57, 76 | `refreshSession`, `getSession` | medium | pending |
| src/utils/fileUploadUtils.ts | 45, 333 | `getUser` | medium | pending |
| src/utils/authErrorHandler.ts | 264, 274 | `refreshSession`, `signOut` | medium | pending |
| src/pages/CancelTrial.tsx | 49 | `signOut` | medium | pending |
| src/pages/KnowledgeSubmit.tsx | 86 | `getSession` | medium | pending |
| src/experiments/ai-sdk-poc/tools/index.ts | 57, 95, 183 | `getUser` | medium | pending |
| src/components/privacy/DataExport.tsx | 45 | `getSession` | medium | pending |
| src/components/privacy/AccountDeletion.tsx | 64, 96 | `getSession`, `signOut` | medium | pending |
| src/components/privacy/PrivacySettings.tsx | 82, 111 | `getSession` | medium | pending |
| src/components/transition/EquipmentManager.tsx | 90, 126 | `getUser` | medium | pending |
| src/components/transition/VehicleModifications.tsx | 100, 136 | `getUser` | medium | pending |
| src/components/transition/TransitionSettingsDialog.tsx | 50 | `getUser` | medium | pending |
| src/components/you/EventHandlers.ts | 9, 78, 142, 251, 315 | `getUser` | medium | pending |
| src/components/bank-statement/BankStatementConverter.tsx | 68 | `getUser` | medium | pending |
| src/components/wheels/FuelReceiptUpload.tsx | 133 | `getSession` | medium | pending |
| src/components/wins/expenses/ExpenseReceiptUpload.tsx | 126 | `getSession` | medium | pending |
| src/components/wheels/drawer-selector/services/drawerService.ts | 9, 81 | `getUser` | medium | pending |
| src/components/wheels/drawer-selector/hooks/useAuthState.ts | 11, 21 | `getSession`, `onAuthStateChange` | medium | pending |
| src/components/admin/AmazonProductsManagement.tsx | 275, 347, 410, 454, 1027 | `getSession` | medium | pending |
| src/components/admin/ShopManagement.tsx | 74, 224, 255 | `getSession` | medium | pending |
| src/components/admin/KnowledgeApproval.tsx | 40, 73, 108 | `getSession` | medium | pending |
| src/components/admin/TripScraperControl.tsx | 173 | `getSession` | medium | pending |
| src/lib/supabase-admin.ts | 83 | `getUser` | medium | pending |

---

## Frontend: Storage Coupling (Phase 6)

Files using `supabase.storage.from('bucket')` for file uploads/downloads.

| File | Line(s) | Bucket/Operation | Severity | Status |
|---|---|---|---|---|
| src/utils/fileUploadUtils.ts | 114, 139 | Upload file, get public URL | high | pending |
| src/utils/fileUploadUtils 2.ts | 114, 139 | Upload file, get public URL (duplicate) | high | pending |
| src/services/receiptService.ts | 96, 106 | Upload receipt, get public URL | high | pending |
| src/services/googleImageService.ts | 124, 140, 154, 175 | Upload image, get URL, upload blob | high | pending |
| src/services/MedicalService.ts | 11 | Upload medical document | high | pending |
| src/hooks/useUserKnowledge.ts | 149, 213 | Upload/delete knowledge files | high | pending |
| src/pages/SiteQALog.tsx | 326, 333 | Upload QA screenshot, get URL | high | pending |
| src/components/admin/TripPhotoManager.tsx | 146, 155 | Upload photo, get URL | high | pending |
| src/components/admin/TripImageManager.tsx | 139, 149 | Upload image, get URL | high | pending |
| src/components/you/medical/DocumentUploadDialog.tsx | 181, 189, 195 | Upload medical doc, create bucket, retry | high | pending |

---

## Frontend: Client Imports (Phase 4)

203 files import from `@/integrations/supabase/client` or `@/integrations/supabase`. These are the full list of files that create a dependency on the Supabase SDK in the frontend. Only unique production files listed (test mocks excluded from count).

**Total production files**: ~185 files
**Total test/debug files**: ~18 files

Key integration points (non-exhaustive list of major files):

| File | Import | Severity | Status |
|---|---|---|---|
| src/integrations/supabase/client.ts | `createClient` from `@supabase/supabase-js` | medium | pending |
| src/integrations/supabase/types.ts | Database type definitions | medium | pending |
| src/context/AuthContext.tsx | `supabase` client | medium | pending |
| src/services/pamService.ts | `supabase` client (dynamic import) | medium | pending |
| src/services/api.ts | `supabase` client | medium | pending |
| src/services/pam/tools/toolExecutor.ts | `supabase` client + `Database` types | medium | pending |
| src/services/pam/contextManager.ts | `supabase` client | medium | pending |
| src/services/pam/memoryService.ts | `supabase` client | medium | pending |
| src/services/pam/agents/MemoryAgent.ts | `supabase` client | medium | pending |
| src/services/pam/agents/WheelsAgent.ts | `supabase` client | medium | pending |
| src/services/pam/agents/WinsAgent.ts | `supabase` client | medium | pending |
| src/services/pam/agents/SocialAgent.ts | `supabase` client | medium | pending |
| src/components/header/UserMenu.tsx | `supabase` from `@/integrations/supabase` | medium | pending |
| src/components/wheels/trip-planner/TripService.tsx | `supabase` from `@/integrations/supabase` | medium | pending |

Full file list available via: `grep -rn "@/integrations/supabase" src/ --include="*.ts" --include="*.tsx"`

---

## Backend: Supabase Client Usage (Phase 1)

### Client Factory Functions (Critical - 4 files)

These are the root Supabase client creation points. All other backend usage flows through these.

| File | Line(s) | Function(s) | Severity | Status |
|---|---|---|---|---|
| backend/app/core/database.py | 42-43, 76-85 | `get_supabase()`, `get_supabase_client()`, `get_user_context_supabase_client()` | critical | pending |
| backend/app/database/supabase_client.py | 30-59 | `get_supabase()`, `get_supabase_client()`, `get_supabase_service()` | critical | pending |
| backend/app/db/supabase.py | 22 | `get_supabase_client()` | critical | pending |
| backend/app/integrations/supabase.py | 5-10 | Re-exports `get_supabase_client`, `get_supabase`, `init_supabase` | critical | pending |

### API Route Files (High - 20+ files)

| File | Line(s) | Usage Pattern | Severity | Status |
|---|---|---|---|---|
| backend/app/api/v1/trips.py | 16, 132, 160, 221, 287 | `get_supabase_client()` in route handlers | high | pending |
| backend/app/api/v1/camping.py | 12, 53, 93, 133, 155, 184, 210 | `get_supabase_client()` in camping routes | high | pending |
| backend/app/api/v1/knowledge.py | 12, 67-371 | `get_supabase_client()` across 11 route handlers | high | pending |
| backend/app/api/v1/transition.py | 26, 52, 253, 875, 1022, 1161 | Local `get_supabase_client()` + `.rpc()` calls | high | pending |
| backend/app/api/v1/privacy.py | 237-528 | `get_supabase_client()` across 6 handlers | high | pending |
| backend/app/api/v1/receipts.py | 12, 85, 181 | `get_supabase_client()` | high | pending |
| backend/app/api/v1/fuel_receipts.py | 15, 103 | `get_supabase_client()` | high | pending |
| backend/app/api/v1/chat.py | 15, 140, 188, 223 | `get_supabase_client()` | high | pending |
| backend/app/api/v1/system_settings.py | 4, 14, 25, 37 | `get_supabase_client()` | high | pending |
| backend/app/api/v1/ai_ingest.py | 39-40 | `get_supabase_client()` | high | pending |
| backend/app/api/v1/ai_structured.py | 8, 31 | `get_supabase_client()` | high | pending |
| backend/app/api/v1/trip_scraper.py | 14, 191 | `get_supabase_client()` | high | pending |
| backend/app/api/v1/digistore24.py | 15, 104, 313, 346 | `get_supabase_client()` as FastAPI Depends | high | pending |
| backend/app/api/v1/pam/savings.py | 20, 59, 117, 150, 192 | `get_supabase_client()` | high | pending |
| backend/app/api/v1/pam_main.py | 2225-5612 | `get_supabase_client()` in 8+ locations | high | pending |
| backend/app/api/v1/social.py | 37 | `current_user.get_supabase_client()` | high | pending |

### Service Layer Files (High - 40+ files)

| File | Line(s) | Usage Pattern | Severity | Status |
|---|---|---|---|---|
| backend/app/services/database.py | 78-213 | `DatabaseService` wraps client with `.rpc()` calls | high | pending |
| backend/app/services/financial_context_service.py | 178-407 | `.rpc()` for financial summaries | high | pending |
| backend/app/services/analytics/analytics.py | 8, 81, 101-440 | `.table()` queries for analytics | high | pending |
| backend/app/services/custom_routes_service.py | 2, 6, 9-37 | `.table("custom_routes")` CRUD | high | pending |
| backend/app/services/orders_service.py | 2, 6, 9-36 | `.table("shop_orders")` CRUD | high | pending |
| backend/app/services/products_service.py | 3, 7, 10-195 | `.table("shop_products/affiliate_products")` CRUD | high | pending |
| backend/app/services/profiles_service.py | 2, 6 | `.table()` for profiles | high | pending |
| backend/app/services/maintenance_service.py | 2, 6 | `.table()` for maintenance | high | pending |
| backend/app/services/savings_calculator.py | 14, 77 | `get_supabase_client()` | high | pending |
| backend/app/services/trip_scraper.py | 20, 52, 360-381 | `.table()` for scraper jobs/sources | high | pending |
| backend/app/services/camping_scraper.py | 15, 24, 270 | `get_supabase_client()` | high | pending |
| backend/app/services/usage_tracking_service.py | 18, 27 | `get_supabase_client()` | high | pending |
| backend/app/services/embeddings.py | 436 | `.rpc()` for vector search | high | pending |
| backend/app/services/vector_memory.py | 284, 332, 382 | `.rpc()` for memory operations | high | pending |
| backend/app/services/ai/ingest_service.py | 13, 27 | `get_supabase_client()` | high | pending |
| backend/app/services/ai/automation.py | 8, 17, 25 | `get_supabase_client()` | high | pending |
| backend/app/services/digistore24_marketplace.py | 15, 178 | `get_supabase_client()` | high | pending |
| backend/app/services/privacy/gdpr_service.py | 147-579 | `get_supabase_client()` in 5 methods | high | pending |
| backend/app/services/data_lifecycle/retention_service.py | 246-453 | `get_supabase_client()` in 3 methods | high | pending |
| backend/app/services/auth/mfa_service.py | 109-378 | `.table('user_mfa/user_mfa_setup')` | high | pending |
| backend/app/services/auth/session_compatibility.py | 164-235 | JWT verification | high | pending |
| backend/app/services/scraping/youtube_recipe_scraper.py | 20, 34 | `get_supabase_client()` | high | pending |
| backend/app/services/scraping/web_recipe_scraper.py | 13, 35 | `get_supabase_client()` | high | pending |
| backend/app/services/scraping/youtube_travel_scraper.py | 20, 35 | `get_supabase_client()` | high | pending |

### PAM Tool Files (High - 50+ files)

| File | Line(s) | Usage Pattern | Severity | Status |
|---|---|---|---|---|
| backend/app/services/pam/tools/budget/create_expense.py | 15 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/budget/analyze_budget.py | 15, 48 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/budget/track_savings.py | 15 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/budget/update_budget.py | 15, 61 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/budget/predict_end_of_month.py | 14 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/budget/export_budget_report.py | 14 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/budget/find_savings_opportunities.py | 14 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/budget/compare_vs_budget.py | 14, 51 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/budget/get_spending_summary.py | 15 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/trip/plan_trip.py | 13, 158 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/trip/get_fuel_log.py | 2, 39 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/trip/find_rv_parks.py | 10, 84 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/trip/save_favorite_spot.py | 11 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/trip/unit_conversion.py | 9, 35 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/fuel/fuel_crud.py | 11, 104, 247, 375, 473 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/social/create_post.py | 15 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/social/comment_on_post.py | 15, 78-79 | `get_supabase_client` + `.rpc()` | high | pending |
| backend/app/services/pam/tools/social/like_post.py | 15, 66-109 | `get_supabase_client` + `.rpc()` | high | pending |
| backend/app/services/pam/tools/social/follow_user.py | 15, 74 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/social/message_friend.py | 15 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/social/share_location.py | 15 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/social/create_event.py | 15, 115 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/social/get_feed.py | 14, 68-81 | `get_supabase_client` + `.rpc()` | high | pending |
| backend/app/services/pam/tools/social/find_nearby_rvers.py | 14, 74-77 | `get_supabase_client` + `.rpc()` | high | pending |
| backend/app/services/pam/tools/social/search_posts.py | 14, 73 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/profile/update_profile.py | 17, 102 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/profile/update_settings.py | 17, 97 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/profile/manage_privacy.py | 17, 92 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/profile/export_data.py | 18 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/profile/get_user_stats.py | 17 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/profile/create_vehicle.py | 18, 88 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/shop/get_product_details.py | 14, 63 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/shop/recommend_products.py | 14, 104 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/shop/search_products.py | 18, 150 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/admin/add_knowledge.py | 16, 143 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/admin/search_knowledge.py | 16, 123 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/meals/plan_meals.py | 11, 75 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/meals/manage_pantry.py | 11, 88 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/meals/generate_shopping_list.py | 12, 82 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/meals/manage_dietary_prefs.py | 10, 83 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/meals/search_recipes.py | 11, 85 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/meals/share_recipe.py | 10, 68 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/maintenance/maintenance_crud.py | 11, 185, 316 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/maintenance/maintenance_queries.py | 11, 68, 208 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/transition/shakedown_tools.py | 11, 101, 233, 335 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/transition/task_tools.py | 12, 73, 224, 347, 452 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/transition/progress_tools.py | 11, 61 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/transition/launch_week_tools.py | 11, 53, 209 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/transition/equipment_tools.py | 11, 87, 219, 378 | `get_supabase_client` | high | pending |
| backend/app/services/pam/tools/community/search_tips.py | 82 | `.rpc()` | high | pending |
| backend/app/services/pam/tools/community/submit_tip.py | 262, 330 | `.rpc()` | high | pending |
| backend/app/services/pam/tools/delete_calendar_event.py | 55-56 | `get_supabase_service` | high | pending |
| backend/app/services/pam/tools/update_calendar_event.py | 81-82 | `get_supabase_service` | high | pending |
| backend/app/services/pam/tools/timer_alarm_tool.py | 156, 302, 342 | `get_supabase_service` | high | pending |
| backend/app/services/pam/tools/load_user_profile.py | 5, 28 | `get_supabase_client`, `get_user_context_supabase_client` | high | pending |
| backend/app/services/pam/tools/load_social_context.py | 6, 41 | `get_supabase_client`, `get_user_context_supabase_client` | high | pending |
| backend/app/services/pam/tools/utils.py | 12, 113, 158, 198, 236 | `get_supabase_client` - safe_db_* definitions | high | pending |
| backend/app/services/pam/tools/utils/database.py | 10, 35, 76, 124, 168, 226 | `get_supabase_client` - database utilities | high | pending |

### Node Files (High - 10 files)

| File | Line(s) | Usage Pattern | Severity | Status |
|---|---|---|---|---|
| backend/app/nodes/admin_node.py | 2, 12, 16-19 | `.table()` queries | high | pending |
| backend/app/nodes/shop_node.py | 2, 12, 18-36 | `.table()` queries | high | pending |
| backend/app/nodes/wins_node.py | 3, 11, 26-404 | `.table()` + `.rpc()` | high | pending |
| backend/app/nodes/you_node.py | 7, 40-42, 187-1003 | `.table()` queries throughout | high | pending |
| backend/app/nodes/memory_node.py | 13, 19, 77-715 | `.table()` queries throughout | high | pending |
| backend/app/nodes/wheels_node.py | 7, 43, 521-779 | `.table()` queries | high | pending |
| backend/app/services/pam/nodes/admin_node.py | 2, 12 | `get_supabase_client` | high | pending |
| backend/app/services/pam/nodes/shop_node.py | 2, 12 | `get_supabase_client` | high | pending |
| backend/app/services/pam/nodes/wins_node.py | 3, 11 | `get_supabase_client` | high | pending |
| backend/app/services/pam/nodes/you_node.py | 5, 38 | `get_supabase_client` | high | pending |
| backend/app/services/pam/nodes/wheels_node.py | 5, 44 | `get_supabase_client` | high | pending |
| backend/app/services/pam/nodes/memory_node.py | 16, 23, 32 | `get_supabase` | high | pending |

### Worker/Task Files (High - 8 files)

| File | Line(s) | Usage Pattern | Severity | Status |
|---|---|---|---|---|
| backend/app/workers/tasks/cleanup_tasks.py | 5, 15, 46, 71 | `get_supabase_client` | high | pending |
| backend/app/workers/tasks/analytics_tasks.py | 5, 16, 56, 94 | `get_supabase_client` | high | pending |
| backend/app/workers/tasks/timer_tasks.py | 11, 35, 181, 213 | `get_supabase_client` | high | pending |
| backend/app/workers/tasks/notification_tasks.py | 5, 18-173 | `get_supabase_client` in 6 handlers | high | pending |
| backend/app/workers/tasks/maintenance_tasks.py | 5, 16-133 | `get_supabase_client` in 4 handlers | high | pending |
| backend/app/workers/tasks/email_tasks.py | 5 | `get_supabase_client` | high | pending |
| backend/app/workers/tasks/pam_proactive_tasks.py | 15 | `get_supabase_client` | high | pending |
| backend/app/workers/tasks/reset_quotas.py | 63, 65 | `get_supabase_client` | high | pending |
| backend/app/workers/digistore24_sync.py | 13, 69, 97 | `get_supabase_client` | high | pending |

### Infrastructure/Core Files (High - 8 files)

| File | Line(s) | Usage Pattern | Severity | Status |
|---|---|---|---|---|
| backend/app/core/proactive_monitor.py | 5, 13, 36-226 | `.table()` queries for monitoring | high | pending |
| backend/app/core/route_intelligence.py | 9, 15 | `get_supabase_client` | high | pending |
| backend/app/core/schema_validator.py | 8, 24 | `get_supabase` + `.rpc()` | high | pending |
| backend/app/core/simple_pam_service.py | 471-472 | `get_supabase` | high | pending |
| backend/app/core/unified_auth.py | 15, 32-161 | `get_supabase_service/client` + `.table()` | high | pending |
| backend/app/webhooks/stripe_webhooks.py | 8, 40 | `get_supabase_client` | high | pending |
| backend/app/services/pam/database/unified_database_service.py | 9, 221-222 | `get_supabase_client/service` | high | pending |
| backend/app/services/pam/domain_memory/storage/database_store.py | 11, 43 | `get_supabase_service` | high | pending |
| backend/app/services/pam/graph_enhanced_orchestrator.py | 20, 328 | `get_supabase_client` | high | pending |
| backend/app/services/usage/quota_manager.py | 13, 108, 197, 224, 256, 331 | `get_supabase_client` + `.rpc()` | high | pending |

---

## Backend: RPC Calls (Phase 5)

Backend files calling `.rpc('function_name')` on the Supabase client.

| File | Line(s) | RPC Function(s) | Severity | Status |
|---|---|---|---|---|
| backend/app/services/database.py | 78 | `get_conversation_history` | high | pending |
| backend/app/services/database.py | 125 | `get_user_preferences` | high | pending |
| backend/app/services/database.py | 144 | `get_or_create_pam_conversation` | high | pending |
| backend/app/services/database.py | 168, 183 | `store_pam_message` | high | pending |
| backend/app/services/database.py | 213 | `store_user_context` | high | pending |
| backend/app/services/database.py | 1388 | `get_dashboard_statistics` | high | pending |
| backend/app/services/financial_context_service.py | 178 | `get_combined_financial_context` | high | pending |
| backend/app/services/financial_context_service.py | 235 | `get_expenses_summary` | high | pending |
| backend/app/services/financial_context_service.py | 261 | `get_budgets_summary` | high | pending |
| backend/app/services/financial_context_service.py | 286 | `get_income_summary` | high | pending |
| backend/app/services/financial_context_service.py | 390 | `should_refresh_financial_context` | high | pending |
| backend/app/services/financial_context_service.py | 407 | `get_conversation_context` | high | pending |
| backend/app/services/embeddings.py | 436 | `match_documents` (vector search) | high | pending |
| backend/app/services/vector_memory.py | 284, 332, 382 | Vector memory RPCs | high | pending |
| backend/app/nodes/wins_node.py | 46 | `get_budget_status_with_expenses` | high | pending |
| backend/app/api/v1/pam_main.py | 3375, 3463 | PAM savings RPCs | high | pending |
| backend/app/api/v1/camping.py | 119 | `execute_sql` | high | pending |
| backend/app/api/v1/transition.py | 253 | `create_default_transition_tasks` | high | pending |
| backend/app/api/v1/transition.py | 875 | `get_downsizing_stats` | high | pending |
| backend/app/api/v1/transition.py | 1022 | `get_service_stats` | high | pending |
| backend/app/api/v1/transition.py | 1161 | `get_income_stats` | high | pending |
| backend/app/services/pam/tools/social/like_post.py | 75, 109 | `decrement/increment_post_likes` | high | pending |
| backend/app/services/pam/tools/social/comment_on_post.py | 79 | `increment_post_comments` | high | pending |
| backend/app/services/pam/tools/social/get_feed.py | 72, 81 | `get_user_feed`, `get_public_feed` | high | pending |
| backend/app/services/pam/tools/social/find_nearby_rvers.py | 77 | `find_nearby_users` | high | pending |
| backend/app/services/pam/tools/community/search_tips.py | 82 | Community search RPC | high | pending |
| backend/app/services/pam/tools/community/submit_tip.py | 262, 330 | Community submit + stats RPCs | high | pending |
| backend/app/services/usage/quota_manager.py | 224 | Quota update RPC | high | pending |
| backend/app/services/pam/context_engineering/session_compactor.py | 427 | Sequence RPC | high | pending |
| backend/app/services/pam/context_engineering/integration.py | 208 | Sequence RPC | high | pending |
| backend/app/services/pam/context_engineering/context_compiler.py | 385, 409 | Memory retrieval + access RPCs | high | pending |
| backend/app/services/knowledge/scalable_vector_store.py | 243 | Vector query RPC | high | pending |
| backend/app/core/schema_validator.py | 27 | `validate_profiles_has_id_column` | high | pending |

---

## Backend: Auth / JWT Coupling (Phase 3)

Backend files that verify Supabase JWT tokens or depend on Supabase auth infrastructure.

| File | Line(s) | Function/Pattern | Severity | Status |
|---|---|---|---|---|
| backend/app/api/deps.py | 434-625 | `verify_supabase_jwt_token`, `verify_supabase_jwt_token_sync`, `verify_supabase_jwt_flexible` | high | pending |
| backend/app/core/auth.py | 18-240 | `verify_token_websocket`, `verify_token`, `verify_supabase_token`, `get_current_user`, `get_current_user_id` | high | pending |
| backend/app/core/unified_auth.py | 49-211 | `verify_any_token`, `verify_supabase_token`, `verify_local_jwt`, `verify_admin_token` | high | pending |
| backend/app/core/admin_security.py | 13, 106, 186, 294 | Depends on `verify_supabase_jwt_token` | high | pending |
| backend/app/main.py | 120, 1382, 1566 | `verify_supabase_jwt_token` imports/usage | high | pending |
| backend/app/api/v1/pam_main.py | 17, 557-591, 2031, 3189-3195, 3337-5328 | `verify_supabase_jwt_token/flexible` - 15+ endpoints | high | pending |
| backend/app/api/v1/trips.py | 17, 82-279 | `verify_supabase_jwt_token` - 6 endpoints | high | pending |
| backend/app/api/v1/privacy.py | 18, 95-642 | `verify_supabase_jwt_token` - 11 endpoints | high | pending |
| backend/app/api/v1/receipts.py | 13, 38, 157 | `verify_supabase_jwt_token` | high | pending |
| backend/app/api/v1/fuel_receipts.py | 16, 65, 160, 279 | `verify_supabase_jwt_token` | high | pending |
| backend/app/api/v1/profiles.py | 6, 14, 38, 69 | `verify_supabase_jwt_token` | high | pending |
| backend/app/api/v1/user_settings.py | 8, 26, 45, 63 | `verify_supabase_jwt_token` | high | pending |
| backend/app/api/v1/intent.py | 12, 47, 133, 177, 219 | `verify_supabase_jwt_token` | high | pending |
| backend/app/api/v1/observability.py | 13, 18 | `verify_supabase_jwt_token` | high | pending |
| backend/app/api/v1/pam/savings.py | 19, 50-247 | `verify_supabase_jwt_token` - 5 endpoints | high | pending |
| backend/app/api/v1/voice_streaming.py | 18, 406 | `verify_token_websocket` | medium | pending |
| backend/app/api/v1/voice_conversation.py | 14, 86-234 | `get_current_user` - 6 endpoints | medium | pending |
| backend/app/api/v1/tts.py | 13, 60-610 | `get_current_user` - 9 endpoints | medium | pending |
| backend/app/api/v1/national_parks.py | 11, 140, 277 | `get_current_user_optional` | medium | pending |
| backend/app/api/wins.py | 5, 43-149 | `get_current_user` - 8 endpoints | medium | pending |
| backend/app/api/you.py | 5, 45-279 | `get_current_user_id` - 12 endpoints | medium | pending |
| backend/app/api/wheels.py | 6, 35-119 | `get_current_user_id` - 5 endpoints | medium | pending |
| backend/app/api/v1/auth.py | 13, 214 | `verify_token` | medium | pending |
| backend/app/services/auth/session_compatibility.py | 164-235 | JWT token verification | medium | pending |
| backend/app/api/v1/pam_simple_with_tools.py | 296-302 | `verify_supabase_jwt_flexible` | medium | pending |

---

## Configuration Coupling (Phase 6)

### Backend Configuration Files

| File | Line(s) | Variable(s) | Severity | Status |
|---|---|---|---|---|
| backend/app/core/config.py | 302, 307, 312, 317, 594-608, 647-651, 729, 869, 911-912, 941-942 | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (definition + validation + export) | critical | pending |
| backend/app/core/simple_config.py | 24-26 | `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | high | pending |
| backend/app/core/environment_config.py | 83-86, 334, 410 | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | high | pending |
| backend/app/core/infra_config.py | 42-44 | `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | medium | pending |
| backend/app/core/emergency_config.py | 19-20, 43 | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | medium | pending |
| backend/app/core/pam_config_validator.py | 115-255 | Validation for `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | medium | pending |
| backend/app/core/environment_validator.py | 24-25, 32, 54-55, 115-127 | Required/optional env var checks | medium | pending |
| backend/app/core/database.py | 42-43 | `settings.SUPABASE_URL`, `settings.SUPABASE_SERVICE_ROLE_KEY` | high | pending |
| backend/app/core/auth.py | 31, 202 | `os.getenv("SUPABASE_URL")` | high | pending |
| backend/app/core/unified_auth.py | 91 | `settings.SUPABASE_URL` | medium | pending |

### Frontend Configuration Files

| File | Line(s) | Variable(s) | Severity | Status |
|---|---|---|---|---|
| src/integrations/supabase/client.ts | 5-6, 54-74 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (main client creation) | critical | pending |
| src/config/env-validator.ts | 7-8, 31-32 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (validation) | medium | pending |
| src/config/environment.ts | 15-16, 89 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | medium | pending |
| src/lib/supabase-safe.ts | 6-7, 11-32 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | medium | pending |
| src/lib/supabase-admin.ts | 9-10 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | medium | pending |
| src/hooks/useSupabaseClient.ts | 6-7 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | medium | pending |
| src/utils/publicAssets.ts | 2 | `VITE_SUPABASE_URL` (for public asset URLs) | medium | pending |
| src/components/debug/EnvDebugger.tsx | 34-35 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | low | pending |
| src/components/admin/AmazonProductsManagement.tsx | 274, 346, 409, 453, 1026 | `VITE_SUPABASE_URL` for Edge Function URLs | medium | pending |
| src/components/admin/ShopManagement.tsx | 73, 223, 254 | `VITE_SUPABASE_URL` for Edge Function URLs | medium | pending |
| src/services/edgeFunctions.ts | 121, 154, 188 | `VITE_SUPABASE_URL` for Edge Function URLs | medium | pending |

---

## Supabase-Specific Feature Dependencies

| Feature | Files Affected | Alternative | Phase | Status |
|---|---|---|---|---|
| Supabase Auth SDK (frontend) | AuthContext.tsx, Login.tsx, Signup.tsx, 55+ files | Generic JWT/OIDC (Auth0, Clerk, custom) | 3 | pending |
| Supabase Auth JWT verification (backend) | deps.py, auth.py, unified_auth.py, 25+ API files | Standard JWT verification with `PyJWT` | 3 | pending |
| Supabase Storage (file uploads) | fileUploadUtils.ts, receiptService.ts, 8 files | S3-compatible (AWS S3, Cloudflare R2, MinIO) | 6 | pending |
| Supabase Edge Functions | edgeFunctions.ts, AmazonProductsManagement.tsx, ShopManagement.tsx | Backend API endpoints | 4 | pending |
| Supabase Query Builder (.from/.table) | 192+ frontend files, 120+ backend files | Backend: Repository pattern + raw SQL; Frontend: API calls | 1, 4 | pending |
| PostgreSQL RPC via .rpc() | 16 frontend files, 25+ backend files, 34 unique functions | Repository pattern queries in backend | 5 | pending |
| Row Level Security (RLS) | Database policies (not in codebase) | Application-level authorization in backend | 1 | pending |
| Supabase Realtime | client.ts (realtime config) | WebSocket/SSE (already have PAM WebSocket) | future | pending |

---

## How to Update This Registry

### When starting work on a violation:

1. Change Status from `pending` to `in-progress`
2. Note the PR branch name

### When a violation is resolved:

1. Change Status to `complete (PR #NNN, YYYY-MM-DD)`
2. Verify the file no longer contains the Supabase dependency
3. Update the summary counts

### When discovering a new violation:

1. Add a row to the appropriate category table
2. Increment the summary counts
3. Assign the correct severity and phase

### Re-audit command:

```bash
# Frontend direct mutations
grep -rn "supabase\.from(" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v __tests__

# Frontend RPC calls
grep -rn "\.rpc(" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# Frontend auth coupling
grep -rn "supabase\.auth" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# Frontend storage coupling
grep -rn "supabase\.storage" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# Frontend client imports
grep -rn "@/integrations/supabase" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# Backend client usage
grep -rn "get_supabase_client\|get_supabase_service\|get_supabase" backend/app/ --include="*.py"

# Backend RPC calls
grep -rn "\.rpc(" backend/app/ --include="*.py"

# Config coupling
grep -rn "SUPABASE_" backend/app/core/ --include="*.py"
grep -rn "VITE_SUPABASE" src/ --include="*.ts" --include="*.tsx"
```

---

## Migration Phase Reference

| Phase | Name | Focus | Violation Categories |
|---|---|---|---|
| 1 | Backend Repository Layer | Abstract Supabase client behind repository interfaces | Backend client creation, backend .table() usage |
| 2 | Backend API Endpoints | Expose data via REST endpoints | Backend tool files, node files, worker files |
| 3 | Auth Abstraction | Decouple from Supabase Auth | Frontend auth coupling, backend JWT verification |
| 4 | Frontend API Migration | Replace supabase.from() with API calls | Frontend mutations, reads, client imports |
| 5 | RPC to SQL Migration | Replace .rpc() calls with repository queries | Frontend RPC calls, backend RPC calls |
| 6 | Config & Environment | Remove Supabase env vars, add neutral config | Configuration coupling, storage coupling |
| 7 | Staging Cutover & Cleanup | Final testing, remove dead code, update tests | Test files, archived code |

---

## Notes

- Archive files (`backend/archive/`) are low priority - track but migrate last
- Documentation files (.md) referencing Supabase patterns are informational only - not violations
- Test mock files (vi.mock) will need updating but are not blocking
- The `src/integrations/supabase/client.ts` file is the single root of all frontend Supabase usage
- The `backend/app/core/database.py` and `backend/app/database/supabase_client.py` files are the roots of all backend Supabase usage
- Edge Function URLs (`VITE_SUPABASE_URL/functions/v1/...`) need to be replaced with backend API endpoints

---

**Last audit date**: 2026-02-08
**Next scheduled audit**: Weekly during migration
**Owner**: Engineering team
**Reviewers**: Backend architect, Frontend lead
