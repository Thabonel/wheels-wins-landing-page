# Full Feature Development Workflow

## Overview
Complete end-to-end feature development workflow combining React frontend, FastAPI backend, database changes, and comprehensive testing.

## Agents Involved
- **react-frontend-specialist**: Frontend component development
- **fastapi-backend-expert**: Backend API implementation  
- **fullstack-integrator**: End-to-end integration
- **database-architect**: Schema changes and optimizations
- **testing-automation-expert**: Comprehensive test coverage
- **security-specialist**: Security review and validation

## Workflow Steps

### 1. Planning & Architecture (5-10 minutes)
**Agents**: `database-architect`, `fullstack-integrator`

- [ ] Analyze feature requirements and user stories
- [ ] Design database schema changes if needed
- [ ] Plan API endpoints and data flow
- [ ] Define frontend component architecture
- [ ] Identify security considerations
- [ ] Create technical specification document

### 2. Database Layer (10-15 minutes)
**Agent**: `database-architect`

- [ ] Create database migration files
- [ ] Implement new tables, columns, or relationships
- [ ] Add appropriate indexes for performance
- [ ] Update Row Level Security (RLS) policies
- [ ] Create database functions if needed
- [ ] Test migration rollback procedures

### 3. Backend Implementation (20-30 minutes)
**Agent**: `fastapi-backend-expert`

- [ ] Create Pydantic models for request/response validation
- [ ] Implement API endpoints with proper error handling
- [ ] Add authentication and authorization checks
- [ ] Implement business logic and database operations
- [ ] Add comprehensive input validation
- [ ] Create OpenAPI documentation

### 4. Frontend Implementation (25-35 minutes)
**Agent**: `react-frontend-specialist`

- [ ] Create TypeScript interfaces for API responses
- [ ] Build React components with proper state management  
- [ ] Implement TanStack Query hooks for data fetching
- [ ] Add form validation and error handling
- [ ] Ensure mobile responsiveness and accessibility
- [ ] Implement loading states and optimistic updates

### 5. Integration & Testing (15-20 minutes)
**Agents**: `fullstack-integrator`, `testing-automation-expert`

- [ ] Connect frontend components to backend APIs
- [ ] Test end-to-end functionality
- [ ] Write unit tests for components and endpoints
- [ ] Create integration tests for the complete workflow
- [ ] Add E2E tests for critical user journeys
- [ ] Validate error scenarios and edge cases

### 6. Security Review (10-15 minutes)
**Agent**: `security-specialist`

- [ ] Review authentication and authorization implementation
- [ ] Validate input sanitization and injection prevention
- [ ] Check for information disclosure vulnerabilities
- [ ] Verify proper error handling and logging
- [ ] Test rate limiting and abuse prevention
- [ ] Conduct security scan of new endpoints

### 7. Performance Optimization (10-15 minutes)
**Agent**: `performance-optimizer`

- [ ] Analyze bundle size impact of new components
- [ ] Optimize database queries and add indexes
- [ ] Implement caching strategies where appropriate
- [ ] Test API response times under load
- [ ] Optimize image loading and asset delivery
- [ ] Monitor Core Web Vitals impact

### 8. Documentation & Deployment (5-10 minutes)
**Agents**: `deployment-specialist`, `fullstack-integrator`

- [ ] Update API documentation
- [ ] Create user-facing documentation if needed
- [ ] Run full test suite and quality checks
- [ ] Deploy to staging environment for testing
- [ ] Conduct final integration testing
- [ ] Deploy to production with monitoring

## Example: Trip Sharing Feature

### Feature Requirements
Allow users to share their completed trips with the community, including photos, route information, and expense summaries.

### Implementation Steps

#### 1. Database Changes
```sql
-- Create trip_shares table
CREATE TABLE trip_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    images TEXT[] DEFAULT '{}',
    route_data JSONB,
    expense_summary JSONB,
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
    likes_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_trip_shares_user_id ON trip_shares(user_id);
CREATE INDEX idx_trip_shares_visibility ON trip_shares(visibility) WHERE visibility = 'public';
CREATE INDEX idx_trip_shares_created_at ON trip_shares(created_at DESC);

-- RLS policies
ALTER TABLE trip_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public trip shares are viewable by everyone" ON trip_shares
    FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can view own trip shares" ON trip_shares
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trip shares" ON trip_shares
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### 2. Backend API
```python
# app/models/schemas/trip_sharing.py
class TripShareCreateRequest(BaseModel):
    trip_id: UUID
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    images: List[str] = Field(default_factory=list, max_items=10)
    visibility: str = Field(default="public", regex="^(public|friends|private)$")

class TripShareResponse(BaseModel):
    id: UUID
    trip_id: UUID
    user_id: UUID
    title: str
    description: Optional[str]
    images: List[str]
    route_data: Optional[Dict[str, Any]]
    expense_summary: Optional[Dict[str, Any]]
    visibility: str
    likes_count: int
    views_count: int
    created_at: datetime
    updated_at: datetime

# app/api/v1/trip_sharing.py
@router.post("/trip-shares", response_model=TripShareResponse)
async def create_trip_share(
    request: TripShareCreateRequest,
    current_user: dict = Depends(verify_supabase_jwt_token),
    db: DatabaseService = Depends(get_database)
):
    """Create a new trip share."""
    user_id = current_user.get("sub")
    
    # Verify user owns the trip
    trip = await db.get_trip_by_id(request.trip_id, user_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Generate expense summary
    expense_summary = await generate_trip_expense_summary(request.trip_id, db)
    
    # Create trip share
    trip_share_data = {
        **request.dict(),
        "user_id": user_id,
        "route_data": trip.get("route_data"),
        "expense_summary": expense_summary
    }
    
    result = await db.create_trip_share(trip_share_data)
    return TripShareResponse(**result)
```

#### 3. Frontend Component
```typescript
// src/components/trip-sharing/TripShareForm.tsx
interface TripShareFormProps {
  trip: Trip;
  onSuccess: (share: TripShare) => void;
  onCancel: () => void;
}

export const TripShareForm: React.FC<TripShareFormProps> = ({
  trip,
  onSuccess,
  onCancel
}) => {
  const [title, setTitle] = useState(trip.name);
  const [description, setDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');

  const createTripShareMutation = useMutation({
    mutationFn: async (shareData: TripShareCreateRequest) => {
      const response = await api.post('/api/v1/trip-shares', shareData);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Trip shared successfully\!');
      onSuccess(data);
    },
    onError: (error) => {
      toast.error('Failed to share trip');
      console.error('Share trip error:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createTripShareMutation.mutate({
      trip_id: trip.id,
      title,
      description,
      images: selectedImages,
      visibility
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="title">Share Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your trip share a catchy title..."
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell the community about your amazing trip..."
          rows={4}
        />
      </div>

      <ImageSelector
        selectedImages={selectedImages}
        onImagesChange={setSelectedImages}
        maxImages={10}
      />

      <div>
        <Label htmlFor="visibility">Visibility</Label>
        <Select value={visibility} onValueChange={setVisibility}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public - Everyone can see</SelectItem>
            <SelectItem value="friends">Friends Only</SelectItem>
            <SelectItem value="private">Private - Only you</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex space-x-4">
        <Button
          type="submit"
          disabled={createTripShareMutation.isPending}
          className="flex-1"
        >
          {createTripShareMutation.isPending ? 'Sharing...' : 'Share Trip'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
```

#### 4. Integration Tests
```typescript
// src/__tests__/integration/trip-sharing.test.tsx
describe('Trip Sharing Integration', () => {
  it('should create and display trip share successfully', async () => {
    const user = await createTestUser();
    const trip = await createTestTrip(user.id);

    render(<TripSharingFlow trip={trip} />, {
      wrapper: createTestWrapper(user)
    });

    // Fill out share form
    await user.type(screen.getByLabelText(/share title/i), 'Amazing Cross-Country Adventure');
    await user.type(screen.getByLabelText(/description/i), 'Epic 30-day journey across America');
    await user.selectOptions(screen.getByLabelText(/visibility/i), 'public');

    // Submit form
    await user.click(screen.getByRole('button', { name: /share trip/i }));

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/trip shared successfully/i)).toBeInTheDocument();
    });

    // Verify API call
    expect(mockApi.post).toHaveBeenCalledWith('/api/v1/trip-shares', {
      trip_id: trip.id,
      title: 'Amazing Cross-Country Adventure',
      description: 'Epic 30-day journey across America',
      images: [],
      visibility: 'public'
    });
  });
});
```

## Quality Gates

### Pre-Deployment Checklist
- [ ] All tests passing (unit, integration, E2E)
- [ ] TypeScript compilation successful with no errors
- [ ] ESLint and Prettier formatting applied
- [ ] Security scan completed with no critical issues
- [ ] Performance impact assessed and acceptable
- [ ] Database migration tested and reversible
- [ ] API documentation updated
- [ ] Error handling comprehensive
- [ ] Loading states and UX polished
- [ ] Mobile responsiveness verified

### Success Criteria
- Feature works end-to-end as specified
- 80%+ test coverage maintained
- API response times under 200ms
- No security vulnerabilities introduced
- Bundle size increase under 100KB
- Accessibility standards met (WCAG 2.1)
- Error scenarios handled gracefully

## Time Estimates
- **Simple Feature** (form, display): 60-90 minutes
- **Medium Feature** (with integrations): 90-120 minutes  
- **Complex Feature** (multiple integrations): 120-180 minutes

This workflow ensures consistent, high-quality feature development across the entire Wheels & Wins platform.
EOF < /dev/null