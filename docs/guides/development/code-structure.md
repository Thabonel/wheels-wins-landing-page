
# Code Structure Guide

This guide explains how the PAM codebase is organized and the conventions we follow.

## Frontend Structure

### Directory Organization
```
src/
├── components/          # React components
│   ├── ui/             # Base UI components (shadcn/ui)
│   ├── admin/          # Admin dashboard components
│   ├── auth/           # Authentication components
│   ├── pam/            # PAM assistant components
│   ├── profile/        # User profile components
│   ├── social/         # Social features
│   ├── wheels/         # Vehicle/travel features
│   ├── wins/           # Financial features
│   └── you/            # Personal organization
├── context/            # React context providers
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── pages/              # Route components
├── types/              # TypeScript definitions
└── integrations/       # External service integrations
```

### Component Structure
Each component follows this pattern:
```typescript
// Component file structure
import React, { useState, useEffect } from 'react';
import { ComponentProps } from './types'; // Local types
import { Button } from '@/components/ui/button'; // UI components
import { useCustomHook } from '@/hooks/useCustomHook'; // Custom hooks

interface Props {
  // Component props interface
}

const Component: React.FC<Props> = ({ prop1, prop2 }) => {
  // Hooks at the top
  const [state, setState] = useState(initialValue);
  const customData = useCustomHook();

  // Event handlers
  const handleEvent = () => {
    // Handler logic
  };

  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  // Render
  return (
    <div className="component-container">
      {/* JSX content */}
    </div>
  );
};

export default Component;
```

### Feature Organization
Each major feature has its own directory:
```
components/wins/
├── WinsOverview.tsx      # Main feature component
├── WinsBudgets.tsx       # Sub-feature components
├── WinsExpenses.tsx
├── budgets/              # Feature-specific components
│   ├── BudgetCard.tsx
│   ├── BudgetForm.tsx
│   └── types.ts          # Feature types
├── expenses/
│   ├── ExpenseTable.tsx
│   └── AddExpenseForm.tsx
└── mockData.ts           # Test/development data
```

### Naming Conventions

#### Files & Directories
- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase starting with "use" (`useAuth.ts`)
- **Utilities**: camelCase (`formatCurrency.ts`)
- **Types**: camelCase ending with "Types" (`userTypes.ts`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_ENDPOINTS.ts`)

#### Code Elements
```typescript
// Components: PascalCase
const UserProfile = () => {};

// Variables & functions: camelCase
const userName = 'John';
const getUserName = () => {};

// Constants: SCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';

// Types & Interfaces: PascalCase
interface User {
  id: string;
  name: string;
}

type UserAction = 'create' | 'update' | 'delete';
```

## Backend Structure

### Directory Organization
```
backend/
├── app/
│   ├── api/                # API route handlers
│   │   ├── __init__.py
│   │   ├── health.py       # Health check endpoints
│   │   ├── auth.py         # Authentication routes
│   │   ├── chat.py         # Chat/AI routes
│   │   └── users.py        # User management routes
│   ├── core/               # Core functionality
│   │   ├── config.py       # Unified configuration manager
│   │   ├── user_config.py  # User-adjustable settings
│   │   ├── infra_config.py # Infrastructure settings
│   │   ├── feature_flags.py # Feature toggles & rollouts
│   │   ├── pam_service_router.py # Intelligent PAM routing
│   │   ├── security.py     # Security utilities
│   │   ├── logging.py      # Logging configuration
│   │   └── database.py     # Database utilities
│   ├── shared/             # Shared utilities (NEW)
│   │   ├── __init__.py
│   │   ├── entity_extraction.py    # Unified entity extraction
│   │   ├── context_store.py        # Centralized context management
│   │   └── conversation_memory.py  # Advanced conversation handling
│   ├── orchestrators/      # PAM orchestrator variants
│   │   ├── simple_orchestrator.py   # Basic routing
│   │   ├── enhanced_orchestrator.py # Advanced routing
│   │   └── agentic_orchestrator.py  # AI-powered routing
│   ├── models/             # Data models
│   │   ├── __init__.py
│   │   ├── user.py         # User model
│   │   ├── chat.py         # Chat model
│   │   └── base.py         # Base model class
│   ├── services/           # Business logic services
│   │   ├── __init__.py
│   │   ├── auth_service.py # Authentication logic
│   │   ├── chat_service.py # Chat processing logic
│   │   └── user_service.py # User management logic
│   ├── utils/              # Utility functions
│   │   ├── __init__.py
│   │   ├── helpers.py      # General helpers
│   │   └── validators.py   # Input validation
│   └── main.py             # FastAPI application
├── tests/                  # Test files
├── requirements.txt        # Python dependencies
└── README.md
```

### Python Code Structure
```python
# File header with imports
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException

# Models/Schemas
class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class User(BaseModel):
    id: str
    email: str
    name: Optional[str]
    created_at: datetime

# Router setup
router = APIRouter()

# Route handlers
@router.post("/users", response_model=User)
async def create_user(
    user_data: UserCreate,
    db: Database = Depends(get_database)
):
    """Create a new user"""
    # Implementation
    pass

@router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get user by ID"""
    # Implementation
    pass
```

## Configuration Files

### Frontend Configuration
```typescript
// tailwind.config.ts
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Custom theme extensions
    }
  },
  plugins: []
}

// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Backend Configuration (Updated)
```python
# app/core/config.py - Unified configuration manager
from .user_config import UserSettings, user_settings
from .infra_config import InfrastructureSettings, infra_settings
from .feature_flags import FeatureFlags, feature_flags

class UnifiedSettings:
    """Maintains backward compatibility while organizing settings"""
    def __init__(self):
        self.user = user_settings      # User preferences
        self.infra = infra_settings    # Infrastructure settings
        self.features = feature_flags  # Feature toggles
    
    # Backward compatibility properties
    @property
    def ENVIRONMENT(self) -> str:
        return self.infra.ENVIRONMENT
    
    @property
    def TTS_ENABLED(self) -> bool:
        return self.user.TTS_ENABLED

    @property
    def OPENAI_API_KEY(self) -> str | None:
        return self.infra.OPENAI_API_KEY
    
    # Feature checking
    def is_feature_enabled(self, feature_name: str, user_id: str = None) -> bool:
        return self.features.is_feature_enabled(feature_name, user_id)

settings = UnifiedSettings()

# app/core/user_config.py - User-adjustable settings
class UserSettings(BaseSettings):
    TTS_ENABLED: bool = True
    TTS_PRIMARY_ENGINE: str = "fallback"
    TTS_VOICE_DEFAULT: str = "en-US-AriaNeural"
    LOG_LEVEL: str = "INFO"
    CACHE_TTL: int = 300
    # ... other user preferences

# app/core/infra_config.py - Infrastructure settings
class InfrastructureSettings(BaseSettings):
    ENVIRONMENT: str = "production"
    SECRET_KEY: SecretStr
    DATABASE_URL: Optional[str]
    SUPABASE_URL: str
    OPENAI_API_KEY: Optional[str]
    # ... other infrastructure settings

# app/core/feature_flags.py - Feature toggles
class FeatureFlags(BaseSettings):
    ENABLE_PAM_VOICE: bool = True
    ENABLE_PAM_AGENTIC: bool = False  # Beta feature
    PAM_AGENTIC_ROLLOUT_PERCENT: int = 10
    
    def is_feature_enabled(self, feature_name: str, user_id: str = None) -> bool:
        # Smart rollout logic based on user ID
        if hasattr(self, f"{feature_name}_ROLLOUT_PERCENT"):
            # Percentage-based rollout
            return hash(user_id) % 100 < getattr(self, f"{feature_name}_ROLLOUT_PERCENT")
        return getattr(self, feature_name, False)
```

## Import Organization

### Frontend Imports
```typescript
// 1. React and third-party libraries
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal components (absolute imports with @)
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

// 3. Local/relative imports
import { ComponentProps } from './types';
import './Component.css';
```

### Backend Imports
```python
# 1. Standard library
import os
from typing import Optional, List
from datetime import datetime

# 2. Third-party packages
from fastapi import APIRouter, Depends
from pydantic import BaseModel

# 3. Local application imports
from app.core.config import settings
from app.models.user import User
from app.services.user_service import UserService
```

## Error Handling Patterns

### Frontend Error Handling
```typescript
// React Query error handling
const { data, error, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  onError: (error) => {
    toast.error(`Failed to load users: ${error.message}`);
  }
});

// Try-catch for async operations
const handleSubmit = async (data: FormData) => {
  try {
    await submitForm(data);
    toast.success('Form submitted successfully');
  } catch (error) {
    console.error('Form submission error:', error);
    toast.error('Failed to submit form');
  }
};
```

### Backend Error Handling
```python
# Custom exception classes
class ValidationError(Exception):
    pass

class NotFoundError(Exception):
    pass

# Error handling in routes
@router.post("/users")
async def create_user(user_data: UserCreate):
    try:
        user = await user_service.create_user(user_data)
        return user
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
```

## Testing Structure

### Frontend Tests
```typescript
// Component.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', () => {
    render(<Component />);
    fireEvent.click(screen.getByRole('button'));
    // Assertions
  });
});
```

### Backend Tests
```python
# test_users.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_user():
    response = client.post("/api/users", json={
        "email": "test@example.com",
        "password": "password123"
    })
    assert response.status_code == 201
    assert response.json()["email"] == "test@example.com"
```

## Documentation Standards

### Code Comments
```typescript
/**
 * Custom hook for managing user authentication state
 * @returns {Object} Authentication state and methods
 */
const useAuth = () => {
  // Implementation details...
};

// Inline comments for complex logic
const calculateTotal = (items: Item[]) => {
  // Apply discount rules based on user tier
  const discount = user.tier === 'premium' ? 0.1 : 0;
  return items.reduce((sum, item) => sum + item.price, 0) * (1 - discount);
};
```

### Type Definitions
```typescript
// Comprehensive interface documentation
interface User {
  /** Unique user identifier */
  id: string;
  /** User's email address (must be unique) */
  email: string;
  /** Display name (optional) */
  name?: string;
  /** Account creation timestamp */
  createdAt: Date;
  /** User's subscription tier */
  tier: 'free' | 'premium' | 'enterprise';
}
```

This structure promotes maintainability, readability, and scalability as the codebase grows.
