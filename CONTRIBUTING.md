# Contributing to Wheels and Wins

## Code Quality Standards

### Before You Commit
Run the quality check to ensure your code meets our standards:
```bash
npm run quality:check
```

This runs:
- TypeScript type checking
- ESLint code linting 
- Prettier code formatting check
- Unit tests with coverage

### Auto-fix Common Issues
```bash
npm run quality:fix
```

This will automatically:
- Fix ESLint errors where possible
- Format code with Prettier

## Development Workflow

### 1. Setup
```bash
git clone <repository>
cd wheels-wins-landing-page
npm install
```

### 2. Development
```bash
npm run dev  # Start development server
npm run test:watch  # Run tests in watch mode
```

### 3. Before Creating PR
```bash
npm run ci:full  # Full CI check locally
```

## Code Quality Rules

### TypeScript
- Use strict TypeScript - no `any` types in production code
- Prefer interfaces over types for object shapes
- Use proper typing for API responses
- Document complex types with JSDoc

### ESLint Rules
- **Security**: No `eval`, `alert`, or `console` in production
- **Performance**: Prefer `const`, template literals, arrow functions
- **React**: Follow hooks rules, proper dependency arrays
- **Import**: No duplicate imports, organize imports

### Testing Requirements
- **80% minimum test coverage** for all new code
- Unit tests for all business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
- Mock external dependencies properly

### Security Standards
- **Input Validation**: Validate all user inputs
- **Authentication**: Proper JWT handling, no hardcoded secrets
- **Dependencies**: Regular security audits with `npm audit`
- **Data Exposure**: No sensitive data in logs or client code

## Pull Request Process

### 1. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Development
- Write code following our style guide
- Add tests for new functionality
- Update documentation if needed

### 3. Quality Checks
```bash
npm run quality:check  # Must pass
npm run security:audit  # Review any issues
```

### 4. Submit PR
- Use our PR template
- Fill out all required sections
- Assign reviewers
- Link to related issues

### 5. Code Review
- Address all reviewer feedback
- Ensure CI passes
- Update tests if needed
- Squash commits before merge

## Testing Guidelines

### Unit Tests
```bash
npm run test           # Run once
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage
```

### E2E Tests
```bash
npm run e2e           # Run E2E tests
npm run e2e:ui        # Interactive mode
```

### Test Structure
```typescript
describe('Component/Feature', () => {
  beforeEach(() => {
    // Setup
  });

  it('should handle normal case', () => {
    // Arrange, Act, Assert
  });

  it('should handle error case', () => {
    // Test error scenarios
  });
});
```

## Architecture Guidelines

### File Organization
```
src/
├── components/           # Reusable UI components
├── pages/               # Route components
├── hooks/               # Custom React hooks
├── services/            # API and external services
├── utils/               # Pure utility functions
├── types/               # TypeScript type definitions
├── context/             # React context providers
└── __tests__/           # Test files
```

### Component Guidelines
- Use functional components with hooks
- Prefer composition over inheritance
- Keep components small and focused
- Use TypeScript for props
- Add proper accessibility attributes

### State Management
- Use React Context for global state
- Use custom hooks for complex logic
- Keep state as local as possible
- Use React Query for server state

## Performance Guidelines

### Code Splitting
- Use dynamic imports for large components
- Implement route-based code splitting
- Lazy load non-critical features

### Optimization
- Minimize bundle size
- Optimize images and assets
- Use React.memo for expensive components
- Implement proper caching strategies

## Documentation Standards

### Code Comments
```typescript
/**
 * Calculates the total price including tax
 * @param basePrice - The base price before tax
 * @param taxRate - Tax rate as decimal (0.1 for 10%)
 * @returns Total price including tax
 */
function calculateTotal(basePrice: number, taxRate: number): number {
  return basePrice * (1 + taxRate);
}
```

### README Updates
- Keep installation instructions current
- Document new environment variables
- Update API documentation
- Include troubleshooting steps

## Security Best Practices

### Authentication
- Use secure JWT handling
- Implement proper session management
- Never expose secrets in client code
- Use HTTPS in production

### Input Validation
- Sanitize all user inputs
- Use Zod for runtime validation
- Implement rate limiting
- Validate file uploads

### Dependencies
- Regular security audits
- Keep dependencies updated
- Review security advisories
- Use tools like Snyk or npm audit

## Common Issues & Solutions

### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Type Errors
```bash
# Check types
npm run type-check
```

### Test Failures
```bash
# Run specific test
npm test -- src/components/Button.test.tsx
```

### Linting Issues
```bash
# Auto-fix common issues
npm run lint:fix
```

## Getting Help

- Create an issue for bugs
- Start a discussion for questions
- Check existing documentation
- Review code examples in tests

## Release Process

1. Create release PR
2. Update version numbers
3. Update CHANGELOG.md
4. Tag release after merge
5. Deploy to production
6. Monitor for issues