# Common Development Tasks

## Starting Development

### 1. Start Frontend Dev Server
```bash
npm run dev
# Server runs on http://localhost:8080 (NOT 3000!)
```

### 2. Start Backend Services (if needed)
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 3. Start Redis (for PAM)
```bash
redis-server
```

## Adding New Features

### 1. Create New Component
```typescript
// src/components/category/ComponentName.tsx
import React from 'react';
import { Card } from '@/components/ui/card';

interface ComponentNameProps {
  // Props definition
}

export const ComponentName: React.FC<ComponentNameProps> = ({ 
  // props 
}) => {
  return (
    <Card>
      {/* Component content */}
    </Card>
  );
};
```

### 2. Add New Database Table
```sql
-- supabase/migrations/[timestamp]_table_name.sql
CREATE TABLE IF NOT EXISTS public.table_name (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- other columns
);

-- Enable RLS
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own data" ON public.table_name
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON public.table_name
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON public.table_name
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON public.table_name
  FOR DELETE USING (auth.uid() = user_id);
```

### 3. Add New API Endpoint (Backend)
```python
# backend/app/api/v1/endpoint.py
from fastapi import APIRouter, Depends
from app.core.auth import get_current_user

router = APIRouter()

@router.get("/endpoint")
async def get_data(user=Depends(get_current_user)):
    # Implementation
    return {"data": "value"}
```

### 4. Add New Route (Frontend)
```typescript
// src/App.tsx - Add to router
<Route path="/new-route" element={<NewComponent />} />

// Create page component
// src/pages/NewPage.tsx
export default function NewPage() {
  return <div>New Page Content</div>;
}
```

## Fixing Common Issues

### 1. "Failed to load saved trips" Error
```typescript
// Change from 'saved_trips' to 'user_trips'
const { data } = await supabase
  .from('user_trips')  // Correct table name
  .select('*');
```

### 2. Supabase Authentication Error
```bash
# Check if key is expired
# Update .env with new key
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### 3. TypeScript Errors
```bash
# Check types
npm run type-check

# Fix common issues
# - Add proper types to function parameters
# - Use optional chaining (?.)
# - Add null checks
```

### 4. Build Failures
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Check for platform-specific packages
grep -i "darwin\|win32" package.json
# Remove any found
```

### 5. PAM WebSocket Connection Issues
```typescript
// Correct WebSocket URL format
const wsUrl = `wss://pam-backend.onrender.com/api/v1/pam/ws/${userId}?token=${token}`;
// NOT just /ws or /api/ws
```

## Testing

### 1. Run All Tests
```bash
npm test
```

### 2. Run Specific Test
```bash
npm test -- path/to/test.spec.ts
```

### 3. Run E2E Tests
```bash
npm run test:e2e
```

### 4. Check Coverage
```bash
npm run test:coverage
```

### 5. Manual Testing Checklist
- [ ] Test on mobile (375px, 768px)
- [ ] Test on desktop (1024px+)
- [ ] Test in Chrome, Firefox, Safari
- [ ] Test with slow network (throttle to 3G)
- [ ] Test error states
- [ ] Test loading states
- [ ] Test empty states

## Database Operations

### 1. Create Migration
```bash
# Create new migration file
supabase migration new migration_name

# Edit the file in supabase/migrations/
```

### 2. Apply Migrations
```bash
# Local
supabase db push

# Production
supabase db push --db-url $DATABASE_URL
```

### 3. Reset Database (Local)
```bash
supabase db reset
```

### 4. Backup Database
```bash
# Through Supabase dashboard
# Settings > Database > Backups
```

## Deployment

### 1. Deploy to Staging
```bash
git checkout staging
git merge feature-branch
git push origin staging
# Netlify auto-deploys
```

### 2. Deploy to Production
```bash
git checkout main
git merge staging
git push origin main
# Netlify auto-deploys
```

### 3. Deploy Backend
```bash
# Push to main branch
# Render auto-deploys all 4 services
git push origin main
```

### 4. Rollback Deployment
```bash
# Frontend (Netlify Dashboard)
# Deploys > Select previous deploy > Publish deploy

# Backend (Render Dashboard)
# Service > Deploys > Rollback to previous
```

## Performance Optimization

### 1. Bundle Analysis
```bash
npm run build -- --analyze
# Check for large dependencies
```

### 2. Lazy Load Components
```typescript
const Component = lazy(() => import('./Component'));
// Use with Suspense
<Suspense fallback={<Loading />}>
  <Component />
</Suspense>
```

### 3. Optimize Images
```typescript
// Use WebP format
// Use responsive images
// Lazy load below fold
<img loading="lazy" src="image.webp" />
```

### 4. Cache API Responses
```typescript
// Use TanStack Query
const { data } = useQuery({
  queryKey: ['trips', userId],
  queryFn: fetchTrips,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

## Debugging

### 1. Check Browser Console
```javascript
// Add debug logs
console.log('🔍 Debug:', variable);
console.table(arrayData);
console.group('Group Name');
```

### 2. Check Network Tab
- Look for failed requests (red)
- Check response data
- Verify headers
- Check timing

### 3. Check Supabase Logs
- Dashboard > Logs > API
- Filter by status code
- Check RLS policies

### 4. Check Backend Logs
```bash
# Render Dashboard
# Service > Logs

# Local
# Check terminal output
```

### 5. Use React DevTools
- Components tab
- Profiler tab
- Check props and state

## Environment Setup

### 1. Required Environment Variables
```bash
# Frontend (.env)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MAPBOX_TOKEN=

# Backend (.env)
DATABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
REDIS_URL=
```

### 2. Install Dependencies
```bash
# Frontend
npm install

# Backend
cd backend
pip install -r requirements.txt
```

### 3. Setup Git Hooks
```bash
npm run prepare
# Installs Husky for commit hooks
```

## Code Quality

### 1. Run Linter
```bash
npm run lint
# Fix automatically
npm run lint:fix
```

### 2. Format Code
```bash
npm run format
```

### 3. Type Check
```bash
npm run type-check
```

### 4. Full Quality Check
```bash
npm run quality:check:full
# Runs lint, type-check, test, and build
```

## Git Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/feature-name
```

### 2. Commit Changes
```bash
git add .
git commit -m "feat: add new feature"
# Use conventional commits
```

### 3. Push and Create PR
```bash
git push origin feature/feature-name
# Create PR on GitHub
```

### 4. Merge to Staging First
```bash
# After PR approval
git checkout staging
git merge feature/feature-name
git push origin staging
# Test on staging
```

### 5. Then to Production
```bash
git checkout main
git merge staging
git push origin main
```