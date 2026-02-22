# Phase 4 PRD: Frontend API Migration

**Status**: Planning
**Priority**: High
**Dependencies**: Phase 2 (Backend REST API)

---

## Goal

Migrate all 216 frontend files that currently import Supabase SDK to instead use a centralized API client that communicates with the backend REST API. This eliminates direct database access from the frontend, enforces business logic through the backend, and improves security and maintainability.

---

## Current State

### Problem Summary

**216 files** in `src/` currently import from `@supabase/supabase-js`. These files directly interact with the database, bypassing backend business logic, validation, and audit trails. This creates:

- **Security risks**: Direct database mutations bypass backend validation
- **Data integrity risks**: No centralized business logic enforcement
- **Maintenance burden**: Database schema changes require frontend updates
- **Audit gaps**: No centralized logging of data operations
- **Testing complexity**: Must mock Supabase SDK in every test

### File Categories

#### 1. Direct Database Mutations (Highest Priority)

Files that use `supabase.from('table').insert/update/delete/upsert()` - these bypass the backend entirely:

**Expenses (2 files)**:
- `src/hooks/expenses/useExpenseActions.ts` - expense CRUD operations
- `src/components/wins/CategoryManagementModal.tsx` - category management

**Social (5 files)**:
- `src/pages/Social/SocialHustleBoard.tsx` - hustle board post mutations
- `src/pages/Social/SocialMarketplace.tsx` - marketplace listing mutations
- `src/pages/Social/CommunityHub.tsx` - 4 mutations (posts, comments, groups, events)

**Shop (2 files)**:
- `src/pages/shop/Shop.tsx` - product interactions
- `src/components/shop/ProductCard.tsx` - cart operations

**Transition (3 files)**:
- `src/pages/Transition/ShakedownLogger.tsx` - 2 mutations (shakedown logs)
- `src/components/transition/AddModificationDialog.tsx` - vehicle modifications

**Storage/Profile (3 files)**:
- `src/hooks/useStorageData.ts` - storage unit mutations
- `src/hooks/useTipsData.ts` - financial tips mutations
- `src/contexts/auth/authLogging.ts` - 2 mutations (login logs, session logs)

**Analytics (1 file)**:
- `src/services/analytics/digistore24Service.ts` - product analytics

**PAM (1 file)**:
- `src/services/pam/agents/MemoryAgent.ts` - PAM memory storage

#### 2. Direct Database Reads (Medium Priority)

Files that use `supabase.from('table').select()`:

**Social (2 files)**:
- `src/pages/Social/SocialMarketplace.tsx` - fetch listings
- `src/pages/Social/SocialHustleBoard.tsx` - fetch posts

**Storage (1 file)**:
- `src/hooks/useStorageData.ts` - 3 parallel selects (units, items, payments)

**Debug/Investigation (2 files)**:
- `src/utils/integrationTesting.ts` - test queries
- `src/utils/auth/authInvestigation.ts` - auth debugging

**Hooks (12 files)**:
- `src/hooks/expenses/useBudgetSummary.ts`
- `src/hooks/social/useSocialPosts.ts`
- `src/hooks/profile/useProfile.ts`
- `src/hooks/trips/useTripData.ts`
- `src/hooks/shop/useShoppingData.ts`
- `src/hooks/pam/usePamData.ts`
- `src/hooks/transition/useTransitionData.ts`
- `src/hooks/admin/useAdminData.ts`
- `src/hooks/calendar/useCalendarData.ts`
- `src/hooks/community/useCommunityData.ts`
- `src/hooks/knowledge/useKnowledgeData.ts`
- `src/hooks/feedback/useFeedbackData.ts`

#### 3. Auth Operations (Keep For Now)

Files using `supabase.auth.*` - these stay as Supabase auth for now (Phase 3 backend only):

- `src/contexts/AuthContext.tsx`
- `src/utils/auth/authSessionManager.ts`
- `src/pages/auth/Login.tsx`
- `src/pages/auth/Signup.tsx`
- `src/components/auth/SignupForm.tsx`
- `src/components/auth/UpdatePasswordForm.tsx`
- `src/components/auth/PasswordResetRequestForm.tsx`

#### 4. RPC Calls (Deferred to Phase 5)

Files using `supabase.rpc()` - deferred to Phase 5 (Database Function Migration).

#### 5. Test/Debug Only (Low Priority)

- `src/utils/testing/tools.integration.test.ts`
- `src/utils/auth/authTestSuite.ts`
- `src/utils/auth/authDebug.ts`
- `src/utils/testing/supabaseTestUtils.ts`

---

## Target State

### New API Client Architecture

Build on existing `src/services/api.ts` which already provides:

```typescript
// Existing foundation
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 30000): Promise<Response>

export async function authenticatedFetch(path: string, options: RequestInit = {}): Promise<Response>

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response>
```

### New API Client: `src/services/apiClient.ts`

Create domain-specific API methods that wrap `authenticatedFetch()`:

```typescript
// Expenses API
export const expensesApi = {
  create: (data: CreateExpenseRequest) =>
    authenticatedFetch('/api/v1/expenses', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  list: (params?: ExpenseQueryParams) =>
    authenticatedFetch(`/api/v1/expenses${params ? `?${new URLSearchParams(params)}` : ''}`),

  get: (id: string) =>
    authenticatedFetch(`/api/v1/expenses/${id}`),

  update: (id: string, data: UpdateExpenseRequest) =>
    authenticatedFetch(`/api/v1/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: string) =>
    authenticatedFetch(`/api/v1/expenses/${id}`, {
      method: 'DELETE'
    }),

  categories: {
    list: () => authenticatedFetch('/api/v1/expenses/categories'),
    create: (data: CreateCategoryRequest) =>
      authenticatedFetch('/api/v1/expenses/categories', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: UpdateCategoryRequest) =>
      authenticatedFetch(`/api/v1/expenses/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      authenticatedFetch(`/api/v1/expenses/categories/${id}`, {
        method: 'DELETE'
      }),
  },

  budget: {
    summary: (startDate?: string, endDate?: string) =>
      authenticatedFetch(`/api/v1/expenses/budget/summary?start=${startDate}&end=${endDate}`),
    calculations: () =>
      authenticatedFetch('/api/v1/expenses/budget/calculations'),
  }
};

// Social API
export const socialApi = {
  posts: {
    list: (params?: PostQueryParams) =>
      authenticatedFetch(`/api/v1/social/posts${params ? `?${new URLSearchParams(params)}` : ''}`),
    create: (data: CreatePostRequest) =>
      authenticatedFetch('/api/v1/social/posts', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: UpdatePostRequest) =>
      authenticatedFetch(`/api/v1/social/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      authenticatedFetch(`/api/v1/social/posts/${id}`, {
        method: 'DELETE'
      }),
  },

  comments: {
    list: (postId: string) =>
      authenticatedFetch(`/api/v1/social/posts/${postId}/comments`),
    create: (postId: string, data: CreateCommentRequest) =>
      authenticatedFetch(`/api/v1/social/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
  },

  groups: {
    list: () => authenticatedFetch('/api/v1/social/groups'),
    create: (data: CreateGroupRequest) =>
      authenticatedFetch('/api/v1/social/groups', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
  },

  marketplace: {
    listings: (params?: ListingQueryParams) =>
      authenticatedFetch(`/api/v1/social/marketplace${params ? `?${new URLSearchParams(params)}` : ''}`),
    create: (data: CreateListingRequest) =>
      authenticatedFetch('/api/v1/social/marketplace', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
  },

  hustleBoard: {
    ideas: () => authenticatedFetch('/api/v1/social/hustle-board'),
    submit: (data: SubmitIdeaRequest) =>
      authenticatedFetch('/api/v1/social/hustle-board', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
  }
};

// Shop API
export const shopApi = {
  products: {
    list: (params?: ProductQueryParams) =>
      authenticatedFetch(`/api/v1/shop/products${params ? `?${new URLSearchParams(params)}` : ''}`),
    get: (id: string) =>
      authenticatedFetch(`/api/v1/shop/products/${id}`),
  },

  cart: {
    add: (productId: string, quantity: number) =>
      authenticatedFetch('/api/v1/shop/cart', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity })
      }),
    list: () => authenticatedFetch('/api/v1/shop/cart'),
    remove: (itemId: string) =>
      authenticatedFetch(`/api/v1/shop/cart/${itemId}`, {
        method: 'DELETE'
      }),
  },

  analytics: {
    track: (event: ShoppingEvent) =>
      authenticatedFetch('/api/v1/shop/analytics', {
        method: 'POST',
        body: JSON.stringify(event)
      }),
  }
};

// Trips API
export const tripsApi = {
  list: (params?: TripQueryParams) =>
    authenticatedFetch(`/api/v1/trips${params ? `?${new URLSearchParams(params)}` : ''}`),

  create: (data: CreateTripRequest) =>
    authenticatedFetch('/api/v1/trips', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  get: (id: string) =>
    authenticatedFetch(`/api/v1/trips/${id}`),

  update: (id: string, data: UpdateTripRequest) =>
    authenticatedFetch(`/api/v1/trips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: string) =>
    authenticatedFetch(`/api/v1/trips/${id}`, {
      method: 'DELETE'
    }),

  templates: {
    list: () => authenticatedFetch('/api/v1/trips/templates'),
    create: (data: CreateTemplateRequest) =>
      authenticatedFetch('/api/v1/trips/templates', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
  },

  fuel: {
    log: (data: FuelLogEntry) =>
      authenticatedFetch('/api/v1/trips/fuel', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    history: (vehicleId?: string) =>
      authenticatedFetch(`/api/v1/trips/fuel${vehicleId ? `?vehicle_id=${vehicleId}` : ''}`),
  },

  maintenance: {
    log: (data: MaintenanceLogEntry) =>
      authenticatedFetch('/api/v1/trips/maintenance', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    history: (vehicleId?: string) =>
      authenticatedFetch(`/api/v1/trips/maintenance${vehicleId ? `?vehicle_id=${vehicleId}` : ''}`),
  }
};

// Profile API
export const profileApi = {
  get: () => authenticatedFetch('/api/v1/profile'),

  update: (data: UpdateProfileRequest) =>
    authenticatedFetch('/api/v1/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  settings: {
    get: () => authenticatedFetch('/api/v1/profile/settings'),
    update: (data: UpdateSettingsRequest) =>
      authenticatedFetch('/api/v1/profile/settings', {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
  },

  privacy: {
    get: () => authenticatedFetch('/api/v1/profile/privacy'),
    update: (data: PrivacySettingsRequest) =>
      authenticatedFetch('/api/v1/profile/privacy', {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
  },

  subscription: {
    get: () => authenticatedFetch('/api/v1/profile/subscription'),
    update: (data: SubscriptionUpdateRequest) =>
      authenticatedFetch('/api/v1/profile/subscription', {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
  }
};

// PAM API
export const pamApi = {
  websocket: (userId: string, token: string) =>
    `${API_BASE_URL.replace('http', 'ws')}/api/v1/pam/ws/${userId}?token=${token}`,

  calendar: {
    events: () => authenticatedFetch('/api/v1/pam/calendar'),
    create: (data: CreateEventRequest) =>
      authenticatedFetch('/api/v1/pam/calendar', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
  },

  memory: {
    save: (data: MemorySaveRequest) =>
      authenticatedFetch('/api/v1/pam/memory', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    search: (query: string) =>
      authenticatedFetch(`/api/v1/pam/memory/search?q=${encodeURIComponent(query)}`),
  },

  feedback: {
    submit: (data: FeedbackRequest) =>
      authenticatedFetch('/api/v1/pam/feedback', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
  },

  savings: {
    analyze: (params: SavingsAnalysisParams) =>
      authenticatedFetch('/api/v1/pam/savings/analyze', {
        method: 'POST',
        body: JSON.stringify(params)
      }),
  }
};

// Transition API
export const transitionApi = {
  dashboard: () => authenticatedFetch('/api/v1/transition/dashboard'),

  shakedown: {
    logs: () => authenticatedFetch('/api/v1/transition/shakedown'),
    create: (data: CreateShakedownLogRequest) =>
      authenticatedFetch('/api/v1/transition/shakedown', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
  },

  modifications: {
    list: (vehicleId?: string) =>
      authenticatedFetch(`/api/v1/transition/modifications${vehicleId ? `?vehicle_id=${vehicleId}` : ''}`),
    create: (data: CreateModificationRequest) =>
      authenticatedFetch('/api/v1/transition/modifications', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
  },

  equipment: {
    list: () => authenticatedFetch('/api/v1/transition/equipment'),
    create: (data: CreateEquipmentRequest) =>
      authenticatedFetch('/api/v1/transition/equipment', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
  }
};

// Admin API
export const adminApi = {
  dashboard: () => authenticatedFetch('/api/v1/admin/dashboard'),

  users: {
    list: (params?: UserQueryParams) =>
      authenticatedFetch(`/api/v1/admin/users${params ? `?${new URLSearchParams(params)}` : ''}`),
    get: (id: string) =>
      authenticatedFetch(`/api/v1/admin/users/${id}`),
    update: (id: string, data: UpdateUserRequest) =>
      authenticatedFetch(`/api/v1/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
  },

  moderation: {
    queue: () => authenticatedFetch('/api/v1/admin/moderation'),
    approve: (contentId: string) =>
      authenticatedFetch(`/api/v1/admin/moderation/${contentId}/approve`, {
        method: 'POST'
      }),
    reject: (contentId: string, reason: string) =>
      authenticatedFetch(`/api/v1/admin/moderation/${contentId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      }),
  },

  support: {
    tickets: () => authenticatedFetch('/api/v1/admin/support'),
    respond: (ticketId: string, data: TicketResponseRequest) =>
      authenticatedFetch(`/api/v1/admin/support/${ticketId}/respond`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
  },

  analytics: {
    overview: () => authenticatedFetch('/api/v1/admin/analytics'),
    reports: (params?: ReportQueryParams) =>
      authenticatedFetch(`/api/v1/admin/analytics/reports${params ? `?${new URLSearchParams(params)}` : ''}`),
  },

  knowledge: {
    articles: () => authenticatedFetch('/api/v1/admin/knowledge'),
    create: (data: CreateArticleRequest) =>
      authenticatedFetch('/api/v1/admin/knowledge', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: UpdateArticleRequest) =>
      authenticatedFetch(`/api/v1/admin/knowledge/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
  }
};
```

### Migration Strategy: Batched by Feature Area

Migrate in 9 batches, each corresponding to a functional area. Each batch is a separate commit for easy rollback.

---

## Tasks

### Task 1: Create API Client Foundation

**File**: `src/services/apiClient.ts`

1. Create new file with domain-specific API methods (structure shown above)
2. Import and wrap existing `authenticatedFetch()` and `apiFetch()` from `src/services/api.ts`
3. Define TypeScript interfaces for all request/response types
4. Add JSDoc comments for each API method
5. Export all API namespaces

**Verification**:
- TypeScript compiles without errors
- All API methods return properly typed responses

---

### Task 2: Batch 1 - Expenses Migration

**Files** (5 files):
- `src/hooks/expenses/useExpenseActions.ts`
- `src/components/wins/CategoryManagementModal.tsx`
- `src/hooks/expenses/useBudgetSummary.ts`
- `src/hooks/expenses/useBudgetCalculations.ts`
- `src/services/expensesService.ts`

**Changes**:
1. Replace `import { supabase } from '@/lib/supabase'` with `import { expensesApi } from '@/services/apiClient'`
2. Replace `supabase.from('expenses').insert(data)` with `expensesApi.create(data)`
3. Replace `supabase.from('expenses').select()` with `expensesApi.list()`
4. Replace `supabase.from('expenses').update(data).eq('id', id)` with `expensesApi.update(id, data)`
5. Replace `supabase.from('expenses').delete().eq('id', id)` with `expensesApi.delete(id)`
6. Replace category operations with `expensesApi.categories.*`
7. Replace budget operations with `expensesApi.budget.*`
8. Update error handling to parse API error responses

**Verification**:
- Expense creation/editing works
- Budget summary displays correctly
- Category management functions
- npm run build passes
- Tests pass

---

### Task 3: Batch 2 - Social Migration

**Files** (12 files):
- `src/pages/Social/SocialHustleBoard.tsx`
- `src/pages/Social/SocialMarketplace.tsx`
- `src/pages/Social/CommunityHub.tsx`
- `src/pages/Social/SocialFeed.tsx`
- `src/pages/Social/SocialGroups.tsx`
- `src/hooks/social/useSocialData.ts`
- `src/hooks/social/useSocialPosts.ts`
- `src/components/social/SubmitIdeaForm.tsx`
- `src/components/social/CreateGroupForm.tsx`
- `src/components/social/CreateListingForm.tsx`
- `src/components/social/ShareToHustleBoardModal.tsx`
- `src/hooks/community/useCommunityFeatures.ts`

**Changes**:
1. Replace `import { supabase }` with `import { socialApi }`
2. Replace post operations with `socialApi.posts.*`
3. Replace comment operations with `socialApi.comments.*`
4. Replace group operations with `socialApi.groups.*`
5. Replace marketplace operations with `socialApi.marketplace.*`
6. Replace hustle board operations with `socialApi.hustleBoard.*`

**Verification**:
- Social feed loads posts
- Creating posts/comments works
- Marketplace listings display
- Hustle board submissions work
- Group creation functions

---

### Task 4: Batch 3 - Shop Migration

**Files** (8 files):
- `src/pages/shop/Shop.tsx`
- `src/components/shop/ProductCard.tsx`
- `src/components/shop/ProductsData.ts`
- `src/pages/admin/shop/ShopManagement.tsx`
- `src/pages/admin/shop/AmazonProductsManagement.tsx`
- `src/hooks/shop/useShoppingBehavior.ts`
- `src/hooks/shop/useShoppingAnalytics.ts`
- `src/hooks/shop/useShoppingProfile.ts`

**Changes**:
1. Replace `import { supabase }` with `import { shopApi }`
2. Replace product queries with `shopApi.products.*`
3. Replace cart operations with `shopApi.cart.*`
4. Replace analytics tracking with `shopApi.analytics.*`

**Verification**:
- Shop page loads products
- Product filtering works
- Add to cart functions
- Shopping analytics track events

---

### Task 5: Batch 4 - Trips/Wheels Migration

**Files** (15 files):
- `src/services/TripService.tsx`
- `src/services/tripService.ts`
- `src/services/tripTemplateService.ts`
- `src/pages/wheels/FreshTripPlanner.tsx`
- `src/pages/wheels/SavedTrips.tsx`
- `src/pages/wheels/FuelLog.tsx`
- `src/components/wheels/FuelReceiptUpload.tsx`
- `src/pages/wheels/VehicleMaintenance.tsx`
- `src/hooks/useStorageData.ts`
- `src/services/drawerService.ts`
- `src/hooks/trips/useTripSync.ts`
- `src/hooks/trips/useTripStatus.ts`
- `src/hooks/trips/useTripData.ts`
- `src/services/tripDataPipeline.ts`
- `src/utils/storage/storageUtils.ts`

**Changes**:
1. Replace `import { supabase }` with `import { tripsApi }`
2. Replace trip CRUD operations with `tripsApi.*`
3. Replace template operations with `tripsApi.templates.*`
4. Replace fuel logging with `tripsApi.fuel.*`
5. Replace maintenance logging with `tripsApi.maintenance.*`
6. Replace storage operations with appropriate API calls

**Verification**:
- Trip planning works
- Saved trips load correctly
- Fuel logging functions
- Maintenance tracking works
- Storage management operational

---

### Task 6: Batch 5 - Profile/Settings Migration

**Files** (12 files):
- `src/pages/settings/ProfileSettings.tsx`
- `src/components/profile/ProfileCompletion.tsx`
- `src/pages/Profile.tsx`
- `src/hooks/profile/useProfile.ts`
- `src/hooks/profile/useUserSettings.ts`
- `src/pages/settings/PrivacySettings.tsx`
- `src/pages/settings/AccountDeletion.tsx`
- `src/pages/settings/AccountSecurity.tsx`
- `src/pages/settings/TransitionSettings.tsx`
- `src/pages/settings/SubscriptionSettings.tsx`
- `src/services/userSettingsService.ts`
- `src/contexts/RegionContext.tsx`

**Changes**:
1. Replace `import { supabase }` with `import { profileApi }`
2. Replace profile queries with `profileApi.get()`
3. Replace profile updates with `profileApi.update()`
4. Replace settings operations with `profileApi.settings.*`
5. Replace privacy operations with `profileApi.privacy.*`
6. Replace subscription operations with `profileApi.subscription.*`

**Verification**:
- Profile page displays user data
- Profile editing saves correctly
- Settings changes persist
- Privacy settings update
- Subscription management works

---

### Task 7: Batch 6 - PAM Migration

**Files** (10 files):
- `src/services/pamService.ts`
- `src/services/pam/pamCalendarService.ts`
- `src/services/pam/pamFeedbackService.ts`
- `src/services/pam/pamSavingsService.ts`
- `src/services/pam/memoryService.ts`
- `src/services/pam/agents/MemoryAgent.ts`
- `src/services/pam/agents/WheelsAgent.ts`
- `src/services/pam/agents/WinsAgent.ts`
- `src/services/pam/agents/SocialAgent.ts`
- `src/services/pam/contextManager.ts`

**Changes**:
1. Keep WebSocket connection as-is (already uses backend)
2. Replace memory operations with `pamApi.memory.*`
3. Replace calendar operations with `pamApi.calendar.*`
4. Replace feedback operations with `pamApi.feedback.*`
5. Replace savings operations with `pamApi.savings.*`
6. Update context manager to use API client

**Verification**:
- PAM WebSocket connects
- PAM memory saves/retrieves
- Calendar integration works
- Savings analysis functions

---

### Task 8: Batch 7 - Transition Migration

**Files** (8 files):
- `src/pages/Transition/TransitionDashboard.tsx`
- `src/pages/Transition/TransitionSupport.tsx`
- `src/pages/Transition/ShakedownLogger.tsx`
- `src/components/transition/AddModificationDialog.tsx`
- `src/pages/Transition/EquipmentManager.tsx`
- `src/pages/Transition/VehicleModifications.tsx`
- `src/pages/Transition/LaunchWeekPlanner.tsx`
- `src/pages/Transition/RealityCheck.tsx`

**Changes**:
1. Replace `import { supabase }` with `import { transitionApi }`
2. Replace dashboard queries with `transitionApi.dashboard()`
3. Replace shakedown operations with `transitionApi.shakedown.*`
4. Replace modification operations with `transitionApi.modifications.*`
5. Replace equipment operations with `transitionApi.equipment.*`

**Verification**:
- Transition dashboard loads
- Shakedown logging works
- Modification tracking functions
- Equipment management operational

---

### Task 9: Batch 8 - Admin/Other Migration

**Files** (10 files):
- `src/pages/admin/DashboardOverview.tsx`
- `src/pages/admin/ContentModeration.tsx`
- `src/pages/admin/UserManagement.tsx`
- `src/pages/admin/SupportTickets.tsx`
- `src/pages/admin/UserFeedback.tsx`
- `src/pages/admin/ReportsAnalytics.tsx`
- `src/pages/admin/KnowledgeCenter.tsx`
- `src/components/admin/KnowledgeSubmit.tsx`
- `src/pages/KnowledgeArticle.tsx`
- `src/pages/admin/AnalyticsDashboard.tsx`

**Changes**:
1. Replace `import { supabase }` with `import { adminApi }`
2. Replace dashboard queries with `adminApi.dashboard()`
3. Replace user management with `adminApi.users.*`
4. Replace moderation operations with `adminApi.moderation.*`
5. Replace support operations with `adminApi.support.*`
6. Replace analytics operations with `adminApi.analytics.*`
7. Replace knowledge operations with `adminApi.knowledge.*`

**Verification**:
- Admin dashboard loads
- User management functions
- Content moderation works
- Support ticket system operational
- Analytics display correctly

---

### Task 10: Batch 9 - Auth-Adjacent Migration

**Files** (2 files):
- `src/contexts/auth/authLogging.ts` - move login logging to backend API
- `src/utils/auth/enhancedSecurity.ts` - move security calls to backend

**Changes**:
1. Keep `supabase.auth.*` calls unchanged
2. Replace data logging operations with API calls
3. Keep auth imports for session management

**Verification**:
- Login still works
- Session management functional
- Auth logging persists
- Security features operational

---

### Task 11: Update Test Mocks

**Files**: All test files that mock Supabase

**Changes**:
1. Replace Supabase SDK mocks with apiClient mocks
2. Update test utilities in `src/utils/testing/`
3. Mock `authenticatedFetch()` instead of `supabase.from()`

**Verification**:
- All tests pass
- Test coverage maintained or improved

---

### Task 12: Remove Unused Supabase Imports

**Action**: Search codebase for remaining Supabase imports

**Commands**:
```bash
# Find remaining direct Supabase usage
grep -r "from '@/lib/supabase'" src/ --exclude-dir=__tests__

# Should only remain in:
# - src/contexts/AuthContext.tsx
# - src/utils/auth/authSessionManager.ts
# - Auth-related pages (Login, Signup, etc.)
```

**Verification**:
- Only auth-related files import Supabase
- No data operations use Supabase directly

---

## Verification

### Per-Batch Verification

After each batch migration:

1. **TypeScript compilation**: `npm run type-check`
2. **Build**: `npm run build`
3. **Tests**: `npm test -- <batch-files>`
4. **Manual smoke test**: Test affected features on localhost:8080
5. **Staging deployment**: Deploy to staging and test

### Full Migration Verification

After all batches complete:

1. **Full build**: `npm run build`
2. **All tests**: `npm test`
3. **Quality checks**: `npm run quality:check:full`
4. **Staging smoke test**: Test all major features on staging
5. **Performance**: Verify no regression in load times
6. **Error tracking**: Monitor Sentry for new API errors

### Acceptance Criteria

- [ ] All 216 files migrated from direct Supabase SDK to apiClient
- [ ] Zero direct `supabase.from()` calls outside auth context
- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] Build succeeds
- [ ] All features functional on staging
- [ ] No performance regression
- [ ] Error rates within normal range

---

## Rollback

### Per-Batch Rollback

Each batch is a separate commit. If a batch fails:

1. **Git revert**: `git revert <commit-hash>`
2. **Redeploy**: Push to staging, verify rollback successful
3. **Investigate**: Debug the issue before reattempting

### Full Rollback

If critical issues arise after full migration:

1. **Emergency revert**: Revert all migration commits
2. **Hotfix branch**: Create hotfix from pre-migration commit
3. **Deploy hotfix**: Push directly to production (emergency override)
4. **Post-mortem**: Document what went wrong, plan fixes

### Feature Flag Rollback (Advanced)

For gradual rollback, implement feature flag per batch:

```typescript
// src/config/features.ts
export const FEATURE_FLAGS = {
  USE_API_CLIENT_EXPENSES: true,
  USE_API_CLIENT_SOCIAL: true,
  USE_API_CLIENT_SHOP: true,
  // ... etc
};

// In migrated files
const useApiClient = FEATURE_FLAGS.USE_API_CLIENT_EXPENSES;

if (useApiClient) {
  // New API client path
  await expensesApi.create(data);
} else {
  // Old Supabase path
  await supabase.from('expenses').insert(data);
}
```

This allows toggling individual batches without code changes.

---

## Timeline

**Total estimated time**: 2-3 weeks (assuming 1 developer)

- **Task 1** (API Client Foundation): 2 days
- **Task 2** (Batch 1 - Expenses): 2 days
- **Task 3** (Batch 2 - Social): 3 days
- **Task 4** (Batch 3 - Shop): 2 days
- **Task 5** (Batch 4 - Trips): 3 days
- **Task 6** (Batch 5 - Profile): 2 days
- **Task 7** (Batch 6 - PAM): 2 days
- **Task 8** (Batch 7 - Transition): 2 days
- **Task 9** (Batch 8 - Admin): 2 days
- **Task 10** (Batch 9 - Auth-adjacent): 1 day
- **Task 11** (Update tests): 2 days
- **Task 12** (Cleanup): 1 day

**Buffer**: 2 days for debugging and unexpected issues

---

## Dependencies

### Upstream Dependencies

- **Phase 2 (Backend REST API)**: MUST be complete
  - All endpoints implemented
  - Authentication working
  - CORS configured
  - Deployed to staging

### Downstream Dependencies

- **Phase 5 (Database Function Migration)**: Can proceed in parallel
- **Phase 6 (Testing & Validation)**: Blocked until this phase complete

---

## Risks

### High Risk

1. **Breaking changes in backend API**: If Phase 2 endpoints change, frontend breaks
   - **Mitigation**: Lock Phase 2 API contract before starting Phase 4

2. **Auth token expiration**: If token refresh fails, all API calls fail
   - **Mitigation**: Thorough testing of `authenticatedFetch()` refresh logic

### Medium Risk

1. **Performance regression**: API calls may be slower than direct Supabase
   - **Mitigation**: Add caching layer, optimize backend queries

2. **Incomplete error handling**: API errors may not be handled gracefully
   - **Mitigation**: Standardize error handling in apiClient

### Low Risk

1. **Test coverage gaps**: Some edge cases may not be covered
   - **Mitigation**: Write comprehensive tests in Task 11

---

## Success Metrics

- **Migration completeness**: 100% of target files migrated
- **Test pass rate**: 100% of existing tests pass
- **Zero regressions**: All features work as before
- **Error rate**: No increase in error tracking (Sentry)
- **Performance**: <10% increase in API response times
- **Code quality**: TypeScript strict mode passes, ESLint clean

---

## Notes

- Keep `supabase.auth.*` calls for now (Phase 3 backend only)
- Defer `supabase.rpc()` migration to Phase 5
- Each batch is independently deployable and testable
- Use staging environment for all batch testing before merging
- Monitor error tracking (Sentry) closely during rollout
- Document any API contract changes discovered during migration

---

**Last Updated**: February 8, 2026
**Author**: Claude (engineering-backend-architect + engineering-frontend-developer)
**Status**: Planning - Ready for Implementation
