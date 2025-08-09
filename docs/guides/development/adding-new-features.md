
# Adding New Features Guide

This guide walks through the process of adding new features to the PAM system, from planning to deployment.

## Feature Development Workflow

### 1. Planning Phase

#### Feature Specification
Before coding, create a feature specification document:
```markdown
# Feature: [Feature Name]

## Overview
Brief description of the feature and its purpose.

## User Stories
- As a [user type], I want [goal] so that [benefit]
- As a [user type], I want [goal] so that [benefit]

## Requirements
### Functional Requirements
- [ ] Requirement 1
- [ ] Requirement 2

### Non-Functional Requirements
- [ ] Performance: Response time < 500ms
- [ ] Security: Proper authentication/authorization
- [ ] Accessibility: WCAG 2.1 AA compliance

## Technical Design
- Database schema changes
- API endpoints needed
- UI components required
- Integration points

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2
```

#### Database Design
If the feature requires database changes:
```sql
-- Create migration file: YYYYMMDD_feature_name.sql

-- Example: User preferences table
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);
```

### 2. Backend Development

#### Create API Endpoints
```python
# app/api/preferences.py
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.models.preferences import UserPreference, PreferenceCreate
from app.services.preference_service import PreferenceService
from app.core.security import get_current_user

router = APIRouter()

@router.get("/preferences", response_model=List[UserPreference])
async def get_user_preferences(
    current_user: User = Depends(get_current_user),
    service: PreferenceService = Depends()
):
    """Get all preferences for the current user"""
    return await service.get_user_preferences(current_user.id)

@router.post("/preferences", response_model=UserPreference)
async def create_preference(
    preference_data: PreferenceCreate,
    current_user: User = Depends(get_current_user),
    service: PreferenceService = Depends()
):
    """Create a new user preference"""
    return await service.create_preference(current_user.id, preference_data)
```

#### Create Data Models
```python
# app/models/preferences.py
from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime

class PreferenceCreate(BaseModel):
    preference_key: str
    preference_value: Any

class UserPreference(BaseModel):
    id: str
    user_id: str
    preference_key: str
    preference_value: Any
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

#### Create Service Layer
```python
# app/services/preference_service.py
from typing import List
from app.database.supabase_client import get_supabase
from app.models.preferences import UserPreference, PreferenceCreate

class PreferenceService:
    def __init__(self):
        self.supabase = get_supabase()

    async def get_user_preferences(self, user_id: str) -> List[UserPreference]:
        """Get all preferences for a user"""
        result = self.supabase.table('user_preferences')\
            .select('*')\
            .eq('user_id', user_id)\
            .execute()
        
        return [UserPreference(**pref) for pref in result.data]

    async def create_preference(
        self, 
        user_id: str, 
        preference_data: PreferenceCreate
    ) -> UserPreference:
        """Create a new user preference"""
        data = {
            'user_id': user_id,
            'preference_key': preference_data.preference_key,
            'preference_value': preference_data.preference_value
        }
        
        result = self.supabase.table('user_preferences')\
            .insert(data)\
            .execute()
        
        return UserPreference(**result.data[0])
```

### 3. Frontend Development

#### Create React Components
```typescript
// src/components/preferences/UserPreferences.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { preferencesApi } from '@/lib/api';

interface UserPreference {
  id: string;
  preference_key: string;
  preference_value: any;
  created_at: string;
  updated_at: string;
}

const UserPreferences: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['preferences'],
    queryFn: preferencesApi.getUserPreferences
  });

  const createPreferenceMutation = useMutation({
    mutationFn: preferencesApi.createPreference,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      toast.success('Preference saved successfully');
    },
    onError: (error) => {
      toast.error(`Failed to save preference: ${error.message}`);
    }
  });

  const handleSavePreference = (key: string, value: any) => {
    createPreferenceMutation.mutate({ preference_key: key, preference_value: value });
  };

  if (isLoading) {
    return <div>Loading preferences...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Preference form components */}
      </CardContent>
    </Card>
  );
};

export default UserPreferences;
```

#### Create Custom Hooks
```typescript
// src/hooks/usePreferences.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { preferencesApi } from '@/lib/api';
import { toast } from 'sonner';

export const usePreferences = () => {
  const queryClient = useQueryClient();

  const preferences = useQuery({
    queryKey: ['preferences'],
    queryFn: preferencesApi.getUserPreferences
  });

  const createPreference = useMutation({
    mutationFn: preferencesApi.createPreference,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      toast.success('Preference saved');
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    }
  });

  const updatePreference = useMutation({
    mutationFn: preferencesApi.updatePreference,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      toast.success('Preference updated');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    }
  });

  return {
    preferences: preferences.data || [],
    isLoading: preferences.isLoading,
    createPreference: createPreference.mutate,
    updatePreference: updatePreference.mutate,
    isCreating: createPreference.isPending,
    isUpdating: updatePreference.isPending
  };
};
```

#### Create API Service
```typescript
// src/lib/api/preferences.ts
import { supabase } from '@/integrations/supabase';

export interface PreferenceCreate {
  preference_key: string;
  preference_value: any;
}

export interface UserPreference {
  id: string;
  user_id: string;
  preference_key: string;
  preference_value: any;
  created_at: string;
  updated_at: string;
}

export const preferencesApi = {
  async getUserPreferences(): Promise<UserPreference[]> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  },

  async createPreference(preferenceData: PreferenceCreate): Promise<UserPreference> {
    const { data, error } = await supabase
      .from('user_preferences')
      .insert([preferenceData])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  async updatePreference(id: string, updates: Partial<PreferenceCreate>): Promise<UserPreference> {
    const { data, error } = await supabase
      .from('user_preferences')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
};
```

### 4. Integration & Testing

#### Add to Routes
```typescript
// src/App.tsx
import UserPreferences from '@/components/preferences/UserPreferences';

// Add to router configuration
{
  path: '/preferences',
  element: <UserPreferences />
}
```

#### Update Navigation
```typescript
// src/components/Layout.tsx or navigation component
<NavigationMenuItem>
  <Link to="/preferences">Preferences</Link>
</NavigationMenuItem>
```

#### Add Backend Route
```python
# app/main.py
from app.api.preferences import router as preferences_router

app.include_router(preferences_router, prefix="/api", tags=["preferences"])
```

### 5. Testing

#### Frontend Tests
```typescript
// src/components/preferences/__tests__/UserPreferences.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserPreferences from '../UserPreferences';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('UserPreferences', () => {
  it('renders preferences correctly', async () => {
    render(<UserPreferences />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('User Preferences')).toBeInTheDocument();
    });
  });
});
```

#### Backend Tests
```python
# tests/test_preferences.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_preferences_authenticated():
    # Mock authentication
    headers = {"Authorization": "Bearer valid_token"}
    
    response = client.get("/api/preferences", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_preference():
    headers = {"Authorization": "Bearer valid_token"}
    preference_data = {
        "preference_key": "theme",
        "preference_value": "dark"
    }
    
    response = client.post("/api/preferences", json=preference_data, headers=headers)
    assert response.status_code == 201
    assert response.json()["preference_key"] == "theme"
```

### 6. Documentation

#### Update API Documentation
```python
# Add comprehensive docstrings
@router.post("/preferences", response_model=UserPreference)
async def create_preference(
    preference_data: PreferenceCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new user preference.
    
    - **preference_key**: The key for the preference (e.g., 'theme', 'language')
    - **preference_value**: The value for the preference (can be any JSON-serializable type)
    
    Returns the created preference with ID and timestamps.
    """
```

#### Update Feature Documentation
Create or update feature documentation in `docs/features/`.

### 7. Code Review Checklist

#### Backend Review
- [ ] API endpoints follow RESTful conventions
- [ ] Proper error handling and status codes
- [ ] Authentication/authorization implemented
- [ ] Input validation and sanitization
- [ ] Database queries are optimized
- [ ] Logging added for debugging
- [ ] Tests cover main functionality

#### Frontend Review
- [ ] Components are properly typed
- [ ] Error states handled gracefully
- [ ] Loading states provide good UX
- [ ] Accessibility considerations met
- [ ] Responsive design implemented
- [ ] Performance optimizations applied
- [ ] Tests cover user interactions

### 8. Deployment

#### Database Migration
```bash
# Apply database changes
supabase db push

# Or via migration files
supabase migration up
```

#### Backend Deployment
```bash
# Update requirements.txt if needed
pip freeze > requirements.txt

# Deploy to Render (automatic via GitHub)
git push origin main
```

#### Frontend Deployment
```bash
# Build and deploy (automatic via Vercel/Netlify)
git push origin main
```

### 9. Monitoring & Maintenance

#### Add Monitoring
```python
# Add metrics for the new feature
from app.core.logging import logger

@router.post("/preferences")
async def create_preference(...):
    logger.info(f"Creating preference for user {current_user.id}")
    # ... implementation
    logger.info(f"Preference created successfully")
```

#### Performance Monitoring
- Monitor API response times
- Track error rates
- Monitor database query performance
- Check frontend bundle size impact

This systematic approach ensures new features are well-designed, thoroughly tested, and properly integrated into the existing system.
