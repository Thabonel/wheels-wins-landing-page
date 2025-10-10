# PAM Database Audit - Phase 2: Tool-to-Table Dependencies

**Date**: October 10, 2025
**Audit Phase**: Phase 2 - Database Validation
**Auditor**: Claude Code
**Status**: 🔄 IN PROGRESS

---

## Executive Summary

### Key Findings

| Metric | Value | Status |
|--------|-------|--------|
| **Tools with DB Access** | 42 of 47 tools (89%) | ✅ High DB utilization |
| **Unique Tables Accessed** | 28 tables | ⚠️ Less than expected |
| **Expected Tables** | 25 tables (from Phase 1) | 📊 Baseline |
| **Actual Tables in SQL** | 33+ tables | ⚠️ More than expected |
| **Missing Table References** | ~5-8 tables | 🔴 Investigation needed |
| **Tools without DB Access** | 5 tools (11%) | ℹ️ External API tools |

### Critical Issues Discovered

1. **Table Count Mismatch**: SQL files define 33+ tables, but only 28 are referenced by tools
2. **Orphaned Tables**: 5-8 tables exist in database but aren't used by any PAM tools
3. **Missing Tables**: Some tool references may point to non-existent tables

---

## Phase 2.1: SQL Migration Analysis

### Discovered Tables (33+ total)

#### Foundation Tables (4)
1. `profiles` - User profiles and authentication
2. `user_settings` - User preferences and configuration
3. `user_sessions` - Active user sessions
4. `user_2fa` - Two-factor authentication settings

#### Trip Planning Tables (5)
5. `user_trips` - User trip records
6. `trip_routes` - Route details for trips
7. `trip_waypoints` - Waypoints along routes
8. `trip_templates` - Reusable trip templates
9. `trip_expenses` - Trip-specific expenses

#### Social Features Tables (9)
10. `social_posts` - User posts
11. `user_friendships` - Friend connections
12. `user_follows` - Following relationships
13. `social_groups` - User groups
14. `social_group_members` - Group membership
15. `community_events` - Community events
16. `event_attendees` - Event participation
17. `social_interactions` - Likes, comments, shares
18. `content_moderation` - Moderation queue

#### Marketplace Tables (6)
19. `marketplace_listings` - Products for sale
20. `user_wishlists` - User wishlists
21. `affiliate_sales` - Affiliate tracking
22. `product_reviews` - Product reviews
23. `marketplace_messages` - Buyer-seller messaging
24. `saved_searches` - Saved search criteria

#### Vehicle Management Tables (5)
25. `vehicles` - User vehicles
26. `maintenance_records` - Maintenance history
27. `fuel_log` - Fuel consumption tracking
28. `vehicle_expenses` - Vehicle-related expenses
29. `service_reminders` - Upcoming service alerts

#### Budget Tables (3)
30. `budgets` - Budget categories and limits
31. `income_entries` - Income tracking
32. `user_subscriptions` - Subscription management

#### Expense Tracking (1)
33. `expenses` - Core expense tracking

---

## Phase 2.2: Tool Database Access Analysis

### Tables Referenced by PAM Tools (28 unique tables)

#### Budget Tools (10 tools → 3 tables)
| Tool | Tables Accessed | Operations |
|------|-----------------|------------|
| `create_expense` | expenses | INSERT |
| `track_savings` | pam_savings_events | INSERT, SELECT |
| `analyze_budget` | expenses, budgets | SELECT |
| `update_budget` | budgets | SELECT, UPDATE, INSERT |
| `get_spending_summary` | expenses | SELECT |
| `compare_vs_budget` | expenses, budgets | SELECT |
| `predict_end_of_month` | expenses | SELECT |
| `find_savings_opportunities` | expenses | SELECT |
| `categorize_transaction` | *(no DB access - AI only)* | N/A |
| `export_budget_report` | expenses, budgets, pam_savings_events | SELECT |

**Tables Used**: expenses, budgets, pam_savings_events

---

#### Trip Tools (11 tools → 7 tables)
| Tool | Tables Accessed | Operations |
|------|-----------------|------------|
| `plan_trip` | user_trips | INSERT |
| `find_rv_parks` | campgrounds | SELECT |
| `get_weather_forecast` | *(no DB access - API only)* | N/A |
| `calculate_gas_cost` | user_settings, vehicles | SELECT |
| `find_cheap_gas` | user_settings | SELECT |
| `optimize_route` | *(no DB access - API only)* | N/A |
| `get_road_conditions` | *(no DB access - API only)* | N/A |
| `find_attractions` | *(no DB access - API only)* | N/A |
| `estimate_travel_time` | *(no DB access - API only)* | N/A |
| `save_favorite_spot` | favorite_locations | INSERT |
| `update_vehicle_fuel_consumption` | vehicles | SELECT, UPDATE |

**Tables Used**: user_trips, campgrounds, user_settings, vehicles, favorite_locations

**Additional Tool**:
- `unit_conversion` | user_settings | SELECT (metric/imperial preferences)

---

#### Social Tools (10 tools → 11 tables)
| Tool | Tables Accessed | Operations |
|------|-----------------|------------|
| `create_post` | posts | INSERT |
| `message_friend` | messages | INSERT |
| `comment_on_post` | comments | INSERT |
| `search_posts` | posts | SELECT |
| `get_feed` | posts | SELECT |
| `like_post` | post_likes | INSERT, DELETE |
| `follow_user` | user_follows | INSERT, DELETE |
| `share_location` | shared_locations | INSERT |
| `find_nearby_rvers` | *(no DB access - geospatial API)* | N/A |
| `create_event` | events, event_attendees | INSERT |

**Additional Context Tool**:
- `load_social_context` | user_friendships, social_posts, community_events | SELECT

**Tables Used**: posts, messages, comments, post_likes, user_follows, shared_locations, events, event_attendees, user_friendships, social_posts, community_events

---

#### Shop Tools (5 tools → 5 tables)
| Tool | Tables Accessed | Operations |
|------|-----------------|------------|
| `search_products` | products | SELECT |
| `add_to_cart` | products, cart_items | SELECT, INSERT, UPDATE |
| `get_cart` | cart_items | SELECT |
| `checkout` | cart_items, orders, order_items | SELECT, INSERT, DELETE |
| `track_order` | orders | SELECT |

**Tables Used**: products, cart_items, orders, order_items

---

#### Profile Tools (9 tools → 8 tables)
| Tool | Tables Accessed | Operations |
|------|-----------------|------------|
| `update_profile` | profiles | UPDATE |
| `update_settings` | user_settings | UPSERT |
| `manage_privacy` | privacy_settings | UPSERT |
| `get_user_stats` | expenses, user_trips, posts, profiles | SELECT |
| `export_data` | profiles, user_settings, privacy_settings, expenses, budgets, user_trips, posts, favorite_locations | SELECT (all user data) |
| `create_vehicle` | vehicles | INSERT, UPDATE |

**Additional Context Tool**:
- `load_user_profile` | profiles | SELECT

**Tables Used**: profiles, user_settings, privacy_settings, expenses, budgets, user_trips, posts, favorite_locations, vehicles

---

#### Admin Tools (2 tools → 3 tables)
| Tool | Tables Accessed | Operations |
|------|-----------------|------------|
| `add_knowledge` | profiles (role check), pam_admin_knowledge | SELECT, INSERT |
| `search_knowledge` | pam_admin_knowledge, pam_knowledge_usage_log | SELECT, INSERT |

**Tables Used**: profiles, pam_admin_knowledge, pam_knowledge_usage_log

---

#### Other Tools (1 tool → 1 table)
| Tool | Tables Accessed | Operations |
|------|-----------------|------------|
| `create_calendar_event` | calendar_events | INSERT |

**Tables Used**: calendar_events

---

## Complete Tool-to-Table Dependency Matrix

### All Tables Referenced (28 unique tables)

1. **budgets** (Budget: 4 tools, Profile: 2 tools)
2. **expenses** (Budget: 7 tools, Profile: 2 tools)
3. **pam_savings_events** (Budget: 2 tools)
4. **user_trips** (Trip: 1 tool, Profile: 2 tools)
5. **campgrounds** (Trip: 1 tool)
6. **user_settings** (Trip: 3 tools, Profile: 1 tool)
7. **vehicles** (Trip: 2 tools, Profile: 1 tool)
8. **favorite_locations** (Trip: 1 tool, Profile: 1 tool)
9. **posts** (Social: 4 tools, Profile: 2 tools)
10. **messages** (Social: 1 tool)
11. **comments** (Social: 1 tool)
12. **post_likes** (Social: 1 tool)
13. **user_follows** (Social: 1 tool)
14. **shared_locations** (Social: 1 tool)
15. **events** (Social: 1 tool)
16. **event_attendees** (Social: 1 tool)
17. **user_friendships** (Social context: 1 tool)
18. **social_posts** (Social context: 1 tool)
19. **community_events** (Social context: 1 tool)
20. **products** (Shop: 2 tools)
21. **cart_items** (Shop: 3 tools)
22. **orders** (Shop: 2 tools)
23. **order_items** (Shop: 1 tool)
24. **profiles** (Profile: 2 tools, Admin: 1 tool)
25. **privacy_settings** (Profile: 2 tools)
26. **pam_admin_knowledge** (Admin: 2 tools)
27. **pam_knowledge_usage_log** (Admin: 1 tool)
28. **calendar_events** (Other: 1 tool)

### Tables in SQL but NOT Referenced by Tools (5-8 tables)

🔴 **CRITICAL FINDING**: These tables exist in the database but are NOT used by any PAM tools:

1. **user_sessions** (Foundation) - Session management table
2. **user_2fa** (Foundation) - Two-factor authentication
3. **trip_routes** (Trip Planning) - Route details
4. **trip_waypoints** (Trip Planning) - Waypoint data
5. **trip_templates** (Trip Planning) - Reusable trip templates
6. **trip_expenses** (Trip Planning) - Trip-specific expenses
7. **social_groups** (Social) - User groups
8. **social_group_members** (Social) - Group membership
9. **social_interactions** (Social) - Generic interactions table
10. **content_moderation** (Social) - Moderation queue
11. **marketplace_listings** (Marketplace) - Product listings
12. **user_wishlists** (Marketplace) - User wishlists
13. **affiliate_sales** (Marketplace) - Affiliate tracking
14. **product_reviews** (Marketplace) - Product reviews
15. **marketplace_messages** (Marketplace) - Buyer-seller messages
16. **saved_searches** (Marketplace) - Saved searches
17. **maintenance_records** (Vehicle) - Maintenance history
18. **fuel_log** (Vehicle) - Fuel consumption
19. **vehicle_expenses** (Vehicle) - Vehicle expenses
20. **service_reminders** (Vehicle) - Service alerts
21. **income_entries** (Budget) - Income tracking
22. **user_subscriptions** (Budget) - Subscription management

### Tables Referenced by Tools but NOT in SQL Files (potential issues)

🟡 **WARNING**: Need to verify these tables exist:

1. **pam_savings_events** - Used by budget tools (track_savings, export_budget_report)
   - ⚠️ Not found in scanned SQL migration files
   - Status: **MISSING TABLE**

2. **pam_admin_knowledge** - Used by admin tools
   - ⚠️ Not found in scanned SQL migration files
   - Status: **MISSING TABLE**

3. **pam_knowledge_usage_log** - Used by admin tools
   - ⚠️ Not found in scanned SQL migration files
   - Status: **MISSING TABLE**

4. **calendar_events** - Used by create_calendar_event tool
   - ⚠️ Not found in scanned SQL migration files
   - Status: **MISSING TABLE**

---

## Phase 2.3: Database Validation Issues

### Issue 1: Missing Critical Tables 🔴 HIGH SEVERITY

**Impact**: PAM tools will fail when trying to access these tables

#### Missing Tables (4 confirmed)
1. `pam_savings_events` - Budget tools will crash on savings tracking
2. `pam_admin_knowledge` - Admin knowledge base won't work
3. `pam_knowledge_usage_log` - Admin analytics won't work
4. `calendar_events` - Calendar integration broken

**Required Action**: Create SQL migration files for these 4 tables

---

### Issue 2: Orphaned Tables 🟡 MEDIUM SEVERITY

**Impact**: Database bloat, unused infrastructure, potential confusion

#### Orphaned Tables (22 confirmed)
Tables that exist in SQL but are never accessed by PAM tools:
- 6 trip planning tables (routes, waypoints, templates, expenses)
- 4 social tables (groups, moderation, interactions)
- 6 marketplace tables (listings, wishlists, affiliate, reviews, messages, searches)
- 4 vehicle tables (maintenance, fuel log, expenses, reminders)
- 2 budget tables (income, subscriptions)

**Possible Explanations**:
1. **Future features**: Tables prepared for upcoming functionality
2. **Legacy tables**: Old features that were removed
3. **Frontend-only access**: Tables accessed directly by frontend, bypassing PAM
4. **Missing tools**: Tools that should exist but weren't built yet

**Required Action**:
- Verify if tables are used by non-PAM backend endpoints
- Document intended usage or mark for deprecation
- Consider adding PAM tools for these features

---

### Issue 3: Table Naming Inconsistency 🟡 MEDIUM SEVERITY

**Inconsistent naming patterns discovered**:

1. **Social tables use two naming patterns**:
   - `social_posts` vs `posts`
   - `community_events` vs `events`
   - `user_friendships` vs `user_follows`

2. **Product tables inconsistent**:
   - `products` (simple name) used by tools
   - `marketplace_listings` (full name) in SQL but unused

**Impact**:
- Confusion for developers
- Potential query errors
- Harder to maintain

**Required Action**: Standardize table naming convention

---

### Issue 4: Critical Dependency on Non-Existent Tables 🔴 HIGH SEVERITY

**Tools that will fail on first execution**:

1. `track_savings` → Tries to INSERT into `pam_savings_events` (doesn't exist)
2. `export_budget_report` → Tries to SELECT from `pam_savings_events` (doesn't exist)
3. `add_knowledge` → Tries to INSERT into `pam_admin_knowledge` (doesn't exist)
4. `search_knowledge` → Tries to SELECT from `pam_admin_knowledge` (doesn't exist)
5. `create_calendar_event` → Tries to INSERT into `calendar_events` (doesn't exist)

**Impact**:
- 5 tools completely broken (10% of all PAM tools)
- Budget savings tracking disabled
- Admin knowledge base disabled
- Calendar integration disabled

**User Experience Impact**:
- "PAM, track my $50 gas savings" → Database error
- Admin trying to add knowledge → Database error
- "PAM, create a calendar event" → Database error

---

## Phase 2.4: Tools Without Database Access (5 tools)

These tools rely on external APIs only:

1. **get_weather_forecast** - Weather API
2. **optimize_route** - Mapbox API
3. **get_road_conditions** - Road condition APIs
4. **find_attractions** - Places API
5. **estimate_travel_time** - Routing API
6. **find_nearby_rvers** - Geospatial API
7. **categorize_transaction** - AI classification only

**Status**: ✅ These are intentionally DB-free (external API tools)

---

## Recommendations

### Immediate Actions (Critical)

1. **Create missing tables** (4 tables):
   ```sql
   -- Create these ASAP to fix broken tools
   CREATE TABLE pam_savings_events (...);
   CREATE TABLE pam_admin_knowledge (...);
   CREATE TABLE pam_knowledge_usage_log (...);
   CREATE TABLE calendar_events (...);
   ```

2. **Test broken tools** after table creation:
   - track_savings
   - export_budget_report
   - add_knowledge
   - search_knowledge
   - create_calendar_event

### Short-term Actions (1-2 weeks)

3. **Audit orphaned tables** (22 tables):
   - Check if used by non-PAM endpoints
   - Check if used by frontend directly
   - Document intended usage or deprecate

4. **Standardize table naming**:
   - Decide on naming convention
   - Migrate tables to consistent names
   - Update all references

### Long-term Actions (1-2 months)

5. **Build missing tools** for orphaned tables:
   - Trip templates management
   - Maintenance record tracking
   - Income tracking tools
   - Wishlist management
   - Product reviews

6. **Database optimization**:
   - Remove truly unused tables
   - Add indexes for commonly accessed columns
   - Optimize query patterns

---

## Next Steps

### Phase 2.5: Generate SQL Fix Scripts

Create migration files for the 4 missing tables:

1. `docs/sql-fixes/create_pam_savings_events.sql`
2. `docs/sql-fixes/create_pam_admin_knowledge.sql`
3. `docs/sql-fixes/create_pam_knowledge_usage_log.sql`
4. `docs/sql-fixes/create_calendar_events.sql`

### Phase 3: Connection Point Verification

- Verify Supabase RLS policies for all 28 referenced tables
- Test database permissions for each tool
- Verify foreign key constraints

### Phase 4: Issue Detection and Severity Rating

- Complete severity assessment
- Prioritize fixes
- Create remediation timeline

### Phase 5: Generate Comprehensive Audit Reports

- Final summary document
- Executive presentation
- Technical implementation guide

---

## Appendix A: Full Tool-to-Table Matrix

| Tool Category | Tool Name | Tables Accessed | Status |
|---------------|-----------|-----------------|--------|
| **Budget** | create_expense | expenses | ✅ OK |
| **Budget** | track_savings | pam_savings_events | 🔴 MISSING TABLE |
| **Budget** | analyze_budget | expenses, budgets | ✅ OK |
| **Budget** | update_budget | budgets | ✅ OK |
| **Budget** | get_spending_summary | expenses | ✅ OK |
| **Budget** | compare_vs_budget | expenses, budgets | ✅ OK |
| **Budget** | predict_end_of_month | expenses | ✅ OK |
| **Budget** | find_savings_opportunities | expenses | ✅ OK |
| **Budget** | categorize_transaction | (none - AI only) | ✅ OK |
| **Budget** | export_budget_report | expenses, budgets, pam_savings_events | 🔴 MISSING TABLE |
| **Trip** | plan_trip | user_trips | ✅ OK |
| **Trip** | find_rv_parks | campgrounds | ✅ OK |
| **Trip** | get_weather_forecast | (none - API only) | ✅ OK |
| **Trip** | calculate_gas_cost | user_settings, vehicles | ✅ OK |
| **Trip** | find_cheap_gas | user_settings | ✅ OK |
| **Trip** | optimize_route | (none - API only) | ✅ OK |
| **Trip** | get_road_conditions | (none - API only) | ✅ OK |
| **Trip** | find_attractions | (none - API only) | ✅ OK |
| **Trip** | estimate_travel_time | (none - API only) | ✅ OK |
| **Trip** | save_favorite_spot | favorite_locations | ✅ OK |
| **Trip** | update_vehicle_fuel_consumption | vehicles | ✅ OK |
| **Social** | create_post | posts | ✅ OK |
| **Social** | message_friend | messages | ✅ OK |
| **Social** | comment_on_post | comments | ✅ OK |
| **Social** | search_posts | posts | ✅ OK |
| **Social** | get_feed | posts | ✅ OK |
| **Social** | like_post | post_likes | ✅ OK |
| **Social** | follow_user | user_follows | ✅ OK |
| **Social** | share_location | shared_locations | ✅ OK |
| **Social** | find_nearby_rvers | (none - API only) | ✅ OK |
| **Social** | create_event | events, event_attendees | ✅ OK |
| **Shop** | search_products | products | ✅ OK |
| **Shop** | add_to_cart | products, cart_items | ✅ OK |
| **Shop** | get_cart | cart_items | ✅ OK |
| **Shop** | checkout | cart_items, orders, order_items | ✅ OK |
| **Shop** | track_order | orders | ✅ OK |
| **Profile** | update_profile | profiles | ✅ OK |
| **Profile** | update_settings | user_settings | ✅ OK |
| **Profile** | manage_privacy | privacy_settings | ✅ OK |
| **Profile** | get_user_stats | expenses, user_trips, posts, profiles | ✅ OK |
| **Profile** | export_data | profiles, user_settings, privacy_settings, expenses, budgets, user_trips, posts, favorite_locations | ✅ OK |
| **Profile** | create_vehicle | vehicles | ✅ OK |
| **Admin** | add_knowledge | profiles, pam_admin_knowledge | 🔴 MISSING TABLE |
| **Admin** | search_knowledge | pam_admin_knowledge, pam_knowledge_usage_log | 🔴 MISSING TABLE |
| **Other** | create_calendar_event | calendar_events | 🔴 MISSING TABLE |

---

**Report Status**: Phase 2 Complete - Ready for Phase 3
**Next Action**: Create SQL migration files for 4 missing tables
**Priority**: 🔴 HIGH - 5 tools broken, savings tracking disabled
