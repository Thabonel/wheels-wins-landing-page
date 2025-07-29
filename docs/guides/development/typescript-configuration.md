# TypeScript Configuration Guide

## Overview

Wheels & Wins uses a **pragmatic TypeScript configuration** that prioritizes development velocity over strict type safety. This approach was chosen to enable rapid feature development while maintaining code quality through other means (ESLint, testing, code review).

## Configuration Philosophy

### Development-First Approach

The project uses `"strict": false` to balance type safety with development speed:

```json
{
  "compilerOptions": {
    "noImplicitAny": false,
    "noUnusedParameters": false, 
    "skipLibCheck": true,
    "allowJs": true,
    "noUnusedLocals": false,
    "strictNullChecks": false
  }
}
```

**Rationale**:
- **Faster Iteration**: Developers can prototype quickly without fighting the type system
- **Third-party Integration**: Easier integration with external libraries and APIs
- **Team Productivity**: Reduces TypeScript learning curve for team members
- **Gradual Adoption**: Allows incremental type improvements over time

### Quality Assurance Through Other Means

While TypeScript is relaxed, code quality is maintained through:

1. **ESLint Rules**: Comprehensive linting catches common errors
2. **Unit Testing**: 80%+ test coverage requirement
3. **Code Review**: Peer review for all changes
4. **Runtime Validation**: Pydantic schemas and API validation
5. **Integration Testing**: End-to-end testing catches type-related issues

## Project TypeScript Structure

### Root Configuration (tsconfig.json)

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "noImplicitAny": false,
    "noUnusedParameters": false,
    "skipLibCheck": true,
    "allowJs": true,
    "noUnusedLocals": false,
    "strictNullChecks": false
  }
}
```

### Application Configuration (tsconfig.app.json)

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": [
    "src/**/*",
    "vite.config.ts"
  ]
}
```

### Node Configuration (tsconfig.node.json)

```json
{
  "extends": "./tsconfig.json", 
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": [
    "vite.config.ts",
    "vitest.config.ts",
    "playwright.config.ts"
  ]
}
```

## Type Patterns & Best Practices

### Component Props Typing

**Current Practice** (Recommended):
```typescript
interface ComponentProps {
  title: string;
  onAction?: (data: any) => void;  // 'any' is acceptable for rapid development
  isLoading?: boolean;
}

export const MyComponent: React.FC<ComponentProps> = ({
  title,
  onAction,
  isLoading = false
}) => {
  // Implementation
};
```

**Strict Alternative** (Optional enhancement):
```typescript
interface ComponentProps<T = unknown> {
  title: string;
  onAction?: (data: T) => void;
  isLoading?: boolean;
}
```

### API Response Handling

**Current Practice**:
```typescript
// Flexible API response handling
const fetchData = async () => {
  const response = await fetch('/api/data');
  const data = await response.json(); // Returns 'any'
  return data;
};
```

**Enhanced Version** (Future improvement):
```typescript
interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

const fetchData = async <T>(): Promise<ApiResponse<T>> => {
  const response = await fetch('/api/data');
  return response.json();
};
```

### Supabase Integration

**Current Implementation**:
```typescript
// Supabase types are auto-generated but loosely used
import { Database } from '@/lib/database.types';

type User = Database['public']['Tables']['users']['Row'];

// Flexible usage allows for rapid development
const user: any = await supabase.from('users').select('*').single();
```

### Event Handling

**Pragmatic Approach**:
```typescript
const handleSubmit = (event: any) => {
  event.preventDefault();
  // Handle form submission
};

const handleClick = (event: any) => {
  // Handle click event
};
```

## Common Type Definitions

### Core Types (src/types/)

**PAM Types** (`src/types/pamTypes.ts`):
```typescript
export interface PamMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  context?: any; // Flexible context structure
}

export interface PamResponse {
  message: string;
  actions?: any[]; // UI actions from PAM
  voice_ready?: boolean;
}
```

**Knowledge Types** (`src/types/knowledgeTypes.ts`):
```typescript
export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  metadata?: any; // Flexible metadata structure
}
```

### Utility Types

**Common Patterns**:
```typescript
// Flexible but useful patterns
type Optional<T> = T | undefined;
type Nullable<T> = T | null;
type Loading<T> = T | 'loading';

// API response wrapper
interface ApiWrapper<T = any> {
  data: T;
  loading: boolean;
  error: string | null;
}
```

## Development Workflow

### Type Checking in Development

The development workflow includes type checking but doesn't block development:

```bash
# Type checking (warnings only, non-blocking)
npm run type-check

# Combined quality check
npm run quality:check  # Includes type-check + lint + test

# Build process includes type checking
npm run build  # Will warn about type issues but won't fail
```

### IDE Configuration

**VS Code Settings** (`.vscode/settings.json`):
```json
{
  "typescript.preferences.strict": false,
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### ESLint Integration

ESLint compensates for relaxed TypeScript settings:

```javascript
// eslint.config.js
export default [
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Warn but don't error
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/prefer-const': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
];
```

## Migration Strategy

### Current State → Future Enhancement

The current TypeScript configuration supports gradual improvement:

1. **Phase 1** (Current): Development-focused, relaxed types
2. **Phase 2** (Future): Gradual strict type introduction
3. **Phase 3** (Long-term): Full strict mode with comprehensive types

### Incremental Improvements

**File-by-File Enhancement**:
```typescript
// Add strict types to new files
// @ts-strict  // Custom comment for strict files

interface StrictComponentProps {
  title: string;
  onAction: (data: { id: string; action: string }) => void;
  isLoading: boolean;
}
```

**Component-Level Strictness**:
```typescript
// Enable strict checking for specific components
/* eslint-disable @typescript-eslint/no-explicit-any */
// Above line allows 'any' in this file specifically
```

## Testing Integration

### Type Testing

While TypeScript is flexible, critical types are tested:

```typescript
// Type assertion tests
import { expectType } from 'tsd';

expectType<string>(user.email);
expectType<Date>(message.timestamp);
```

### Runtime Validation

Runtime validation compensates for relaxed compile-time checking:

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  created_at: z.string().datetime()
});

// Runtime validation ensures type safety
const validateUser = (data: any) => {
  return UserSchema.parse(data); // Throws if invalid
};
```

## Performance Considerations

### Build Performance

Relaxed TypeScript configuration improves build performance:

- **Faster Type Checking**: Skip strict checks speeds up development builds
- **Reduced Memory Usage**: Less intensive type analysis
- **Quicker Hot Reloads**: Faster development iteration

### Bundle Size

TypeScript configuration optimizations:

```json
{
  "compilerOptions": {
    "target": "ES2020",        // Modern target for smaller output
    "moduleResolution": "bundler", // Optimized for bundlers
    "skipLibCheck": true,      // Skip type checking of declaration files
    "isolatedModules": true    // Better tree shaking
  }
}
```

## Troubleshooting

### Common Issues

**1. Type Import Errors**
```bash
# Fix: Ensure path mapping is correct
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"]
}
```

**2. Third-Party Library Issues**
```typescript
// Fix: Use type assertion for problematic libraries
const externalLibResult = (someLibrary as any).problematicMethod();
```

**3. Build vs Development Discrepancies**
```bash
# Fix: Run type-check before build
npm run type-check
npm run build
```

### Migration Path

**To Enable Strict Mode** (Future enhancement):

1. **Audit Current Codebase**: Identify type issues
2. **Gradual Conversion**: Convert files one by one
3. **Add Strict Config**: Create `tsconfig.strict.json`
4. **Update Build Process**: Include strict checking in CI/CD

```json
// Future tsconfig.strict.json
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

## Conclusion

The current TypeScript configuration prioritizes development velocity while maintaining code quality through testing, linting, and code review. This pragmatic approach has enabled rapid feature development and can be gradually enhanced toward stricter typing as the project matures.

**Key Benefits**:
- ✅ Faster development iteration
- ✅ Easier third-party integration  
- ✅ Lower learning curve for developers
- ✅ Flexible migration path to strict typing

**Trade-offs**:
- ⚠️ Reduced compile-time type safety
- ⚠️ Potential runtime type errors
- ⚠️ Less IDE assistance for refactoring

The configuration successfully balances developer productivity with code quality, making it well-suited for the current development phase of Wheels & Wins.