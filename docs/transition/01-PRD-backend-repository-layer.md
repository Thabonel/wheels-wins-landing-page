# PRD: Backend Repository Layer - Phase 1

## Goal

Create a repository abstraction layer that isolates all database access behind provider-neutral interfaces, consolidating the current 4 Supabase client entry points into a single database abstraction.

## Current State

The backend has 4 different ways to get a database client:

### 1. `app/core/database.py` - Main Entry Point
Four functions providing database access:
- `get_cached_supabase_client()` - lru_cache singleton using Supabase Python SDK
- `init_supabase()` - Global variable initialization
- `get_supabase()` - Getter for global client
- `get_supabase_client()` - Alias for backward compatibility
- `get_user_context_supabase_client(user_jwt)` - User-scoped client (actually returns service client)

### 2. `app/services/database.py` - DatabaseService Class
Wrapper around Supabase client providing `.table()` API access.

### 3. `app/database/supabase_client.py` - Alternative Client
Provides `get_supabase_service()` and `get_supabase_client()` functions.

### 4. `app/core/database_pool.py` - DatabasePool Class (GOOD)
Uses asyncpg directly with raw SQL. Already provider-neutral. This is the foundation to build on.

### Usage Across Codebase
- 69 backend files reference `safe_db_*` functions or `DatabasePool`
- 118 PAM tool files import `get_supabase_client` from `app.core.database`
- `safe_db_*` utility functions in `app/services/pam/tools/utils.py` use `get_supabase_client()` and provide:
  - `safe_db_insert`
  - `safe_db_select`
  - `safe_db_update`
  - `safe_db_delete`

## Target State

### Repository Structure
Create `backend/app/repositories/` directory with:

**Core Infrastructure:**
- `base.py` - Abstract BaseRepository with standard CRUD operations

**Domain Repositories:**
- `expense_repository.py` - Expenses table operations
- `trip_repository.py` - Trips, trip_stops, trip_participants, trip_expenses
- `vehicle_repository.py` - Vehicles, maintenance_records, fuel_logs
- `profile_repository.py` - Profiles (critical: uses `id` not `user_id`)
- `social_repository.py` - Posts, comments, likes, follows, messages
- `shop_repository.py` - Affiliate_products, product_clicks, product_reports
- `budget_repository.py` - Budgets, budget_categories, recurring_expenses
- `calendar_repository.py` - Calendar_events
- `storage_repository.py` - Storage_items, storage_categories, storage_locations
- `transition_repository.py` - Transition-related tables
- `pam_repository.py` - Pam_interactions, pam_memories, pam_context
- `auth_repository.py` - Login_history, user_sessions, admin_users

### Technical Architecture
- All repositories use `DatabasePool` (asyncpg) internally - already provider-neutral
- Raw SQL in repositories (not Supabase query builder)
- The 4 Supabase client entry points consolidated into 1 that wraps asyncpg
- All 118 PAM tool files updated to use repository methods instead of `get_supabase_client()`

## Tasks

### Task 1: Create Base Repository with Async CRUD Methods

**File:** `backend/app/repositories/base.py`

**Requirements:**
- Abstract base class with common CRUD operations
- All methods use `DatabasePool` internally
- Standard method signatures:
  - `async def insert(table: str, data: dict) -> dict`
  - `async def select(table: str, filters: dict, columns: list = None) -> list[dict]`
  - `async def select_one(table: str, filters: dict, columns: list = None) -> dict | None`
  - `async def update(table: str, filters: dict, data: dict) -> list[dict]`
  - `async def delete(table: str, filters: dict) -> int`
  - `async def execute_query(query: str, params: list = None) -> list[dict]`
- Error handling with proper exception types
- Logging for all database operations
- Connection pool management

**Implementation Notes:**
- Use parameterized queries to prevent SQL injection
- Return types match existing `safe_db_*` function returns
- Support for `RETURNING *` clause on INSERT/UPDATE/DELETE

### Task 2: Create Domain-Specific Repositories

#### 2.1 ExpenseRepository (`expense_repository.py`)
**Tables:** `expenses`

**Methods:**
- `async def create_expense(user_id: str, data: dict) -> dict`
- `async def get_user_expenses(user_id: str, filters: dict = None) -> list[dict]`
- `async def get_expense_by_id(expense_id: str, user_id: str) -> dict | None`
- `async def update_expense(expense_id: str, user_id: str, data: dict) -> dict`
- `async def delete_expense(expense_id: str, user_id: str) -> bool`
- `async def get_expenses_by_date_range(user_id: str, start_date: str, end_date: str) -> list[dict]`
- `async def get_expenses_by_category(user_id: str, category: str) -> list[dict]`

#### 2.2 TripRepository (`trip_repository.py`)
**Tables:** `trips`, `trip_stops`, `trip_participants`, `trip_expenses`

**Methods:**
- `async def create_trip(user_id: str, data: dict) -> dict`
- `async def get_user_trips(user_id: str) -> list[dict]`
- `async def get_trip_by_id(trip_id: str, user_id: str) -> dict | None`
- `async def update_trip(trip_id: str, user_id: str, data: dict) -> dict`
- `async def delete_trip(trip_id: str, user_id: str) -> bool`
- `async def add_trip_stop(trip_id: str, data: dict) -> dict`
- `async def get_trip_stops(trip_id: str) -> list[dict]`
- `async def add_trip_participant(trip_id: str, user_id: str) -> dict`
- `async def get_trip_participants(trip_id: str) -> list[dict]`
- `async def add_trip_expense(trip_id: str, data: dict) -> dict`
- `async def get_trip_expenses(trip_id: str) -> list[dict]`

#### 2.3 VehicleRepository (`vehicle_repository.py`)
**Tables:** `vehicles`, `maintenance_records`, `fuel_logs`

**Methods:**
- `async def create_vehicle(user_id: str, data: dict) -> dict`
- `async def get_user_vehicles(user_id: str) -> list[dict]`
- `async def get_vehicle_by_id(vehicle_id: str, user_id: str) -> dict | None`
- `async def update_vehicle(vehicle_id: str, user_id: str, data: dict) -> dict`
- `async def delete_vehicle(vehicle_id: str, user_id: str) -> bool`
- `async def add_maintenance_record(vehicle_id: str, data: dict) -> dict`
- `async def get_maintenance_records(vehicle_id: str) -> list[dict]`
- `async def add_fuel_log(vehicle_id: str, data: dict) -> dict`
- `async def get_fuel_logs(vehicle_id: str, start_date: str = None, end_date: str = None) -> list[dict]`

#### 2.4 ProfileRepository (`profile_repository.py`)
**Tables:** `profiles` (critical: uses `id` not `user_id`)

**Methods:**
- `async def get_profile(user_id: str) -> dict | None`
- `async def create_profile(user_id: str, data: dict) -> dict`
- `async def update_profile(user_id: str, data: dict) -> dict`
- `async def delete_profile(user_id: str) -> bool`
- `async def get_profile_by_username(username: str) -> dict | None`
- `async def search_profiles(query: str, limit: int = 10) -> list[dict]`

**Special Handling:**
- All methods must use `id` column, not `user_id`
- Document this clearly in docstrings

#### 2.5 SocialRepository (`social_repository.py`)
**Tables:** `posts`, `comments`, `likes`, `follows`, `messages`

**Methods:**
- `async def create_post(user_id: str, data: dict) -> dict`
- `async def get_user_posts(user_id: str) -> list[dict]`
- `async def get_post_by_id(post_id: str) -> dict | None`
- `async def update_post(post_id: str, user_id: str, data: dict) -> dict`
- `async def delete_post(post_id: str, user_id: str) -> bool`
- `async def create_comment(post_id: str, user_id: str, data: dict) -> dict`
- `async def get_post_comments(post_id: str) -> list[dict]`
- `async def toggle_like(post_id: str, user_id: str) -> dict`
- `async def get_post_likes(post_id: str) -> list[dict]`
- `async def follow_user(follower_id: str, following_id: str) -> dict`
- `async def unfollow_user(follower_id: str, following_id: str) -> bool`
- `async def get_user_followers(user_id: str) -> list[dict]`
- `async def get_user_following(user_id: str) -> list[dict]`
- `async def send_message(sender_id: str, recipient_id: str, data: dict) -> dict`
- `async def get_user_messages(user_id: str, other_user_id: str) -> list[dict]`

#### 2.6 ShopRepository (`shop_repository.py`)
**Tables:** `affiliate_products`, `product_clicks`, `product_reports`

**Methods:**
- `async def get_active_products(filters: dict = None) -> list[dict]`
- `async def get_product_by_id(product_id: str) -> dict | None`
- `async def search_products(query: str, category: str = None) -> list[dict]`
- `async def track_product_click(product_id: str, user_id: str = None) -> dict`
- `async def report_product(product_id: str, user_id: str, reason: str) -> dict`
- `async def get_product_clicks(product_id: str) -> int`

#### 2.7 BudgetRepository (`budget_repository.py`)
**Tables:** `budgets`, `budget_categories`, `recurring_expenses`

**Methods:**
- `async def create_budget(user_id: str, data: dict) -> dict`
- `async def get_user_budgets(user_id: str) -> list[dict]`
- `async def get_budget_by_id(budget_id: str, user_id: str) -> dict | None`
- `async def update_budget(budget_id: str, user_id: str, data: dict) -> dict`
- `async def delete_budget(budget_id: str, user_id: str) -> bool`
- `async def create_budget_category(budget_id: str, data: dict) -> dict`
- `async def get_budget_categories(budget_id: str) -> list[dict]`
- `async def create_recurring_expense(user_id: str, data: dict) -> dict`
- `async def get_recurring_expenses(user_id: str) -> list[dict]`

#### 2.8 CalendarRepository (`calendar_repository.py`)
**Tables:** `calendar_events`

**Methods:**
- `async def create_event(user_id: str, data: dict) -> dict`
- `async def get_user_events(user_id: str, start_date: str = None, end_date: str = None) -> list[dict]`
- `async def get_event_by_id(event_id: str, user_id: str) -> dict | None`
- `async def update_event(event_id: str, user_id: str, data: dict) -> dict`
- `async def delete_event(event_id: str, user_id: str) -> bool`

#### 2.9 StorageRepository (`storage_repository.py`)
**Tables:** `storage_items`, `storage_categories`, `storage_locations`

**Methods:**
- `async def create_storage_item(user_id: str, data: dict) -> dict`
- `async def get_user_storage_items(user_id: str, filters: dict = None) -> list[dict]`
- `async def update_storage_item(item_id: str, user_id: str, data: dict) -> dict`
- `async def delete_storage_item(item_id: str, user_id: str) -> bool`
- `async def create_storage_category(user_id: str, name: str) -> dict`
- `async def get_storage_categories(user_id: str) -> list[dict]`
- `async def create_storage_location(user_id: str, name: str) -> dict`
- `async def get_storage_locations(user_id: str) -> list[dict]`

#### 2.10 TransitionRepository (`transition_repository.py`)
**Tables:** Transition-related tables (TBD based on transition schema)

**Methods:** TBD based on actual transition requirements

#### 2.11 PamRepository (`pam_repository.py`)
**Tables:** `pam_interactions`, `pam_memories`, `pam_context`

**Methods:**
- `async def save_interaction(user_id: str, data: dict) -> dict`
- `async def get_user_interactions(user_id: str, limit: int = 50) -> list[dict]`
- `async def save_memory(user_id: str, data: dict) -> dict`
- `async def search_memories(user_id: str, query: str) -> list[dict]`
- `async def save_context(user_id: str, data: dict) -> dict`
- `async def get_user_context(user_id: str) -> dict | None`

#### 2.12 AuthRepository (`auth_repository.py`)
**Tables:** `login_history`, `user_sessions`, `admin_users`

**Methods:**
- `async def log_login(user_id: str, data: dict) -> dict`
- `async def get_login_history(user_id: str, limit: int = 50) -> list[dict]`
- `async def create_session(user_id: str, data: dict) -> dict`
- `async def get_active_sessions(user_id: str) -> list[dict]`
- `async def invalidate_session(session_id: str) -> bool`
- `async def is_admin(user_id: str) -> bool`
- `async def get_admin_user(user_id: str) -> dict | None`

### Task 3: Migrate safe_db_* Functions to Use Repositories

**File:** `app/services/pam/tools/utils.py`

**Current Functions:**
- `safe_db_insert(table, data, user_id=None)`
- `safe_db_select(table, filters, user_id=None)`
- `safe_db_update(table, filters, data, user_id=None)`
- `safe_db_delete(table, filters, user_id=None)`

**Migration Strategy:**
1. Create `app/services/pam/tools/repository_utils.py` with new implementations
2. New functions route to appropriate repository based on table name
3. Keep same function signatures for backward compatibility
4. Add deprecation warnings to old functions
5. Update all callers to use new functions

**Table to Repository Mapping:**
```python
TABLE_REPOSITORY_MAP = {
    'expenses': ExpenseRepository,
    'trips': TripRepository,
    'trip_stops': TripRepository,
    'trip_participants': TripRepository,
    'trip_expenses': TripRepository,
    'vehicles': VehicleRepository,
    'maintenance_records': VehicleRepository,
    'fuel_logs': VehicleRepository,
    'profiles': ProfileRepository,
    'posts': SocialRepository,
    'comments': SocialRepository,
    'likes': SocialRepository,
    'follows': SocialRepository,
    'messages': SocialRepository,
    'affiliate_products': ShopRepository,
    'product_clicks': ShopRepository,
    'product_reports': ShopRepository,
    'budgets': BudgetRepository,
    'budget_categories': BudgetRepository,
    'recurring_expenses': BudgetRepository,
    'calendar_events': CalendarRepository,
    'storage_items': StorageRepository,
    'storage_categories': StorageRepository,
    'storage_locations': StorageRepository,
    'pam_interactions': PamRepository,
    'pam_memories': PamRepository,
    'pam_context': PamRepository,
    'login_history': AuthRepository,
    'user_sessions': AuthRepository,
    'admin_users': AuthRepository,
}
```

### Task 4: Update PAM Tool Files (118 files)

**Group by Tool Category:**

#### Budget Tools (10 files)
- `app/services/pam/tools/budget/create_expense.py`
- `app/services/pam/tools/budget/analyze_budget.py`
- `app/services/pam/tools/budget/track_savings.py`
- `app/services/pam/tools/budget/set_budget_alert.py`
- `app/services/pam/tools/budget/create_recurring_expense.py`
- `app/services/pam/tools/budget/update_expense.py`
- `app/services/pam/tools/budget/delete_expense.py`
- `app/services/pam/tools/budget/get_expense_by_id.py`
- `app/services/pam/tools/budget/get_expenses_by_category.py`
- `app/services/pam/tools/budget/get_expenses_by_date.py`

**Migration:**
- Replace `get_supabase_client()` with `ExpenseRepository` or `BudgetRepository`
- Update all database calls to use repository methods
- Test each tool individually

#### Trip Tools (10+ files)
- `app/services/pam/tools/trip/plan_trip.py`
- `app/services/pam/tools/trip/find_rv_parks.py`
- `app/services/pam/tools/trip/optimize_route.py`
- `app/services/pam/tools/trip/add_trip_stop.py`
- `app/services/pam/tools/trip/update_trip.py`
- `app/services/pam/tools/trip/delete_trip.py`
- `app/services/pam/tools/trip/get_trip_by_id.py`
- `app/services/pam/tools/trip/add_trip_participant.py`
- `app/services/pam/tools/trip/get_trip_participants.py`
- `app/services/pam/tools/trip/add_trip_expense.py`
- (Additional trip tools as they exist)

**Migration:**
- Replace `get_supabase_client()` with `TripRepository`
- Update all database calls to use repository methods

#### Social Tools (10 files)
- `app/services/pam/tools/social/create_post.py`
- `app/services/pam/tools/social/message_friend.py`
- `app/services/pam/tools/social/comment_on_post.py`
- `app/services/pam/tools/social/like_post.py`
- `app/services/pam/tools/social/follow_user.py`
- `app/services/pam/tools/social/unfollow_user.py`
- `app/services/pam/tools/social/get_post_comments.py`
- `app/services/pam/tools/social/get_post_likes.py`
- `app/services/pam/tools/social/get_followers.py`
- `app/services/pam/tools/social/get_following.py`

**Migration:**
- Replace `get_supabase_client()` with `SocialRepository`
- Update all database calls to use repository methods

#### Shop Tools (5 files)
- `app/services/pam/tools/shop/search_products.py`
- `app/services/pam/tools/shop/add_to_cart.py`
- `app/services/pam/tools/shop/checkout.py`
- `app/services/pam/tools/shop/track_click.py`
- `app/services/pam/tools/shop/report_product.py`

**Migration:**
- Replace `get_supabase_client()` with `ShopRepository`
- Update all database calls to use repository methods

#### Profile Tools (5+ files)
- `app/services/pam/tools/profile/update_profile.py`
- `app/services/pam/tools/profile/get_profile.py`
- `app/services/pam/tools/profile/update_settings.py`
- `app/services/pam/tools/profile/search_users.py`
- (Additional profile tools as they exist)

**Migration:**
- Replace `get_supabase_client()` with `ProfileRepository`
- Update all database calls to use repository methods
- Ensure `id` vs `user_id` handling is correct

#### Calendar Tools (3 files)
- `app/services/pam/tools/calendar/create_event.py`
- `app/services/pam/tools/calendar/update_event.py`
- `app/services/pam/tools/calendar/delete_event.py`

**Migration:**
- Replace `get_supabase_client()` with `CalendarRepository`
- Update all database calls to use repository methods

#### Vehicle/Maintenance Tools (estimated 10 files)
- Tools for vehicle management, maintenance tracking, fuel logs

**Migration:**
- Replace `get_supabase_client()` with `VehicleRepository`
- Update all database calls to use repository methods

#### Storage Tools (estimated 10 files)
- Tools for storage item management, organization

**Migration:**
- Replace `get_supabase_client()` with `StorageRepository`
- Update all database calls to use repository methods

#### Admin Tools (2 files)
- `app/services/pam/tools/admin/add_knowledge.py`
- `app/services/pam/tools/admin/search_knowledge.py`

**Migration:**
- Replace `get_supabase_client()` with appropriate repository
- Update all database calls to use repository methods

#### Remaining Tools (estimated 63 files)
- Community, transition, and other tools

**Migration Strategy:**
1. Identify which repository each tool should use based on tables accessed
2. Replace `get_supabase_client()` imports with repository imports
3. Instantiate repository in tool function
4. Replace all `.table()` calls with repository methods
5. Test each tool after migration

### Task 5: Update Remaining Backend Services

#### 5.1 DatabaseService (`app/services/database.py`)
**Current State:** Wrapper around Supabase client with `.table()` API

**Migration:**
- Refactor to use repositories internally
- Keep public API for backward compatibility
- Add deprecation warnings
- Document migration path for consumers

#### 5.2 PAM Core Services
**Files:**
- `app/services/pam/orchestrator.py`
- `app/services/pam/tool_executor.py`
- `app/services/pam/context_manager.py`

**Migration:**
- Replace Supabase client calls with repository methods
- Update dependency injection to provide repositories
- Test full PAM flow after migration

#### 5.3 API Endpoints
**Files:** All files in `app/api/v1/`

**Migration:**
- Replace Supabase client calls with repository methods
- Update dependency injection
- Ensure consistent error handling
- Test all endpoints after migration

#### 5.4 Background Jobs/Workers
**Files:** Any celery tasks or background workers

**Migration:**
- Replace Supabase client calls with repository methods
- Test job execution

### Task 6: Deprecate Redundant Supabase Client Modules

**Files to Deprecate:**
1. `app/core/database.py` - Keep only minimal interface wrapping repositories
2. `app/services/database.py` - Mark as deprecated
3. `app/database/supabase_client.py` - Mark as deprecated

**Strategy:**
1. Add deprecation warnings to all functions
2. Update documentation to point to repositories
3. Create migration guide for consumers
4. Plan removal date (suggest 3 months after Phase 1 completion)

**What to Keep:**
- `app/core/database_pool.py` - This is the foundation, keep as-is
- Minimal shim in `app/core/database.py` for backward compatibility

### Task 7: Add Integration Tests for Each Repository

**Test Structure:**
Create `backend/tests/integration/repositories/` with test files for each repository:

- `test_base_repository.py`
- `test_expense_repository.py`
- `test_trip_repository.py`
- `test_vehicle_repository.py`
- `test_profile_repository.py`
- `test_social_repository.py`
- `test_shop_repository.py`
- `test_budget_repository.py`
- `test_calendar_repository.py`
- `test_storage_repository.py`
- `test_pam_repository.py`
- `test_auth_repository.py`

**Test Requirements:**
- Use test database (not production)
- Test all CRUD operations
- Test error conditions (not found, constraint violations)
- Test user isolation (user A cannot access user B's data)
- Test special cases (profiles using `id`, not `user_id`)
- Mock-free tests (use real database with test data)

**Test Fixtures:**
- Create test users
- Create test data for each domain
- Clean up after each test

## Key Design Decisions

### 1. Build on DatabasePool (asyncpg)
**Rationale:** DatabasePool is already provider-neutral, uses raw SQL, and provides excellent performance. No need to reinvent connection pooling.

**Implementation:** All repositories inherit from BaseRepository which uses DatabasePool internally.

### 2. Use Raw SQL in Repositories
**Rationale:**
- Provider-neutral (works with any PostgreSQL)
- Better performance than ORM
- Explicit and auditable
- Easier to optimize queries

**Trade-off:** More verbose than query builders, but worth it for flexibility.

### 3. Keep Same Function Signatures
**Rationale:** Minimize caller changes during migration. Functions like `safe_db_insert()` keep their signatures but route through repositories internally.

**Implementation:** New `repository_utils.py` provides backward-compatible wrappers.

### 4. Profiles Table Special Handling
**Critical:** The `profiles` table uses `id` as the primary key, not `user_id`. All other tables use `user_id`.

**Implementation:** ProfileRepository documents this clearly and handles the difference internally. Callers pass `user_id`, repository queries on `id`.

### 5. Repository Instantiation
**Pattern:** Use dependency injection where possible, but allow direct instantiation for simple cases.

**Example:**
```python
# Direct instantiation
expense_repo = ExpenseRepository()
expenses = await expense_repo.get_user_expenses(user_id)

# Dependency injection (FastAPI)
def endpoint(expense_repo: ExpenseRepository = Depends(get_expense_repository)):
    expenses = await expense_repo.get_user_expenses(user_id)
```

### 6. Error Handling
**Pattern:** Repositories raise specific exceptions, callers handle them.

**Exception Types:**
- `RepositoryNotFoundError` - Record not found
- `RepositoryPermissionError` - User lacks permission
- `RepositoryConstraintError` - Database constraint violation
- `RepositoryError` - Generic database error

### 7. Logging
**Pattern:** Log at repository level for debugging, but don't expose sensitive data.

**Implementation:**
```python
logger.info(f"Creating expense for user {user_id}")
logger.debug(f"Expense data: {sanitize_for_logging(data)}")
```

## Estimated Effort

### File Counts
- **13 repository files** to create (base + 12 domain repositories)
- **118 PAM tool files** to update
- **69+ backend files** using safe_db_* or DatabasePool
- **3 Supabase client modules** to deprecate
- **13+ test files** to create

### Time Estimates (Developer Days)
- Task 1 (Base Repository): 2 days
- Task 2 (Domain Repositories): 10 days (0.5-1 day per repository)
- Task 3 (Migrate safe_db_*): 2 days
- Task 4 (Update PAM Tools): 15 days (118 files, ~8 files/day)
- Task 5 (Update Backend Services): 5 days
- Task 6 (Deprecate Modules): 1 day
- Task 7 (Integration Tests): 8 days

**Total Estimated Effort:** 43 developer days (8-9 weeks for 1 developer)

### Risk Mitigation
- Start with 1-2 repositories as proof of concept
- Migrate 1 PAM tool category fully before moving to next
- Run full test suite after each repository migration
- Keep backward compatibility during transition

## Verification

### Phase 1 Completion Criteria

**Code Quality:**
- [ ] All 13 repositories created and documented
- [ ] All repositories use DatabasePool internally
- [ ] All repositories have comprehensive docstrings
- [ ] Code passes linting and type checking

**Migration Completeness:**
- [ ] All 118 PAM tool files migrated
- [ ] All backend services migrated
- [ ] safe_db_* functions updated to use repositories
- [ ] No direct Supabase client usage in business logic

**Testing:**
- [ ] All repositories have integration tests
- [ ] All tests pass
- [ ] Test coverage >80% for repositories
- [ ] PAM tools tested with repository implementation

**Documentation:**
- [ ] Repository usage guide created
- [ ] Migration guide for future developers
- [ ] API documentation updated
- [ ] Deprecation notices added to old modules

**Deployment:**
- [ ] Changes deployed to staging
- [ ] Full regression test on staging
- [ ] Performance benchmarks meet or exceed baseline
- [ ] No production incidents

### Success Metrics

**Performance:**
- Query latency: <200ms for 95th percentile (same as current)
- Connection pool efficiency: >90% utilization
- Zero connection leaks

**Reliability:**
- Zero data loss during migration
- Zero breaking changes to API contracts
- Backward compatibility maintained

**Developer Experience:**
- Repository API is intuitive
- Code is self-documenting
- Easy to add new repositories
- Clear error messages

## Rollback

### Rollback Strategy

**If Critical Issues Found:**
1. All old Supabase client entry points still exist (deprecated but functional)
2. Can revert file-by-file back to `get_supabase_client()` usage
3. Database schema unchanged - no migration risk
4. Roll back deployment to previous version

**Rollback Triggers:**
- >10% increase in error rate
- >20% increase in query latency
- Data integrity issues detected
- Critical functionality broken

**Rollback Process:**
1. Revert backend deployment to previous version
2. Monitor error rates and latency
3. Investigate root cause
4. Fix issues in development
5. Re-deploy when stable

### Partial Rollback

**If One Repository Has Issues:**
- Can revert just that repository's callers back to old client
- Other repositories continue using new pattern
- Isolate issue to single domain

### Safe Migration Path

**Recommended Approach:**
1. Create repositories alongside old clients (coexistence)
2. Migrate one PAM tool category at a time
3. Test thoroughly after each category
4. Monitor production metrics continuously
5. Only deprecate old clients after 100% migration + 2 weeks stability

**Canary Deployment:**
- Route 5% of traffic to repository-based endpoints
- Monitor for issues
- Gradually increase to 100% over 2 weeks

## Next Steps

**After Phase 1 Completion:**
- Phase 2: Add caching layer to repositories
- Phase 3: Implement read replicas for query optimization
- Phase 4: Add database migration tooling
- Phase 5: Optimize query patterns identified during migration

**Immediate Action Items:**
1. Review and approve this PRD
2. Create feature branch for repository work
3. Set up integration test infrastructure
4. Implement BaseRepository as proof of concept
5. Choose 1 simple repository (CalendarRepository) as pilot

## References

**Related Documentation:**
- `docs/DATABASE_SCHEMA_REFERENCE.md` - Database schemas
- `docs/PAM_SYSTEM_ARCHITECTURE.md` - PAM overview
- `backend/docs/architecture.md` - System architecture
- `CLAUDE.md` - Project instructions

**Key Files:**
- `backend/app/core/database_pool.py` - Foundation to build on
- `backend/app/services/pam/tools/utils.py` - Current safe_db_* implementation
- `backend/app/core/database.py` - Main client entry point to replace

---

**Document Status:** Draft for Review
**Created:** 2026-02-08
**Author:** Engineering Team
**Reviewers:** TBD
