# Global Claude Code Preferences

## Developer Information
- **Developer**: Thabonel
- **Primary Stack**: React, TypeScript, Python, FastAPI
- **Preferred Tools**: Vite, Tailwind CSS, Supabase, Mapbox

## Coding Preferences

### General Principles
- **Production-Ready Code**: Always write functional, tested code - no placeholders or mock implementations
- **Mobile-First Design**: Start with mobile breakpoints and scale up
- **Performance Optimization**: Consider bundle size and loading performance in all decisions
- **Type Safety**: Use TypeScript strict mode with comprehensive typing
- **Clean Code**: Follow DRY, SOLID principles, and write self-documenting code

### Code Style
- **Formatting**: Use Prettier with 2-space indentation
- **Naming Conventions**: 
  - Components: PascalCase (e.g., `UserProfile`)
  - Functions/Variables: camelCase (e.g., `getUserData`)
  - Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
  - Files: kebab-case for utilities, PascalCase for components
- **Comments**: Only when necessary for complex logic - prefer self-documenting code
- **No Console Logs**: Remove all console.log statements in production code

### React/TypeScript Preferences
```typescript
// Preferred component structure
interface ComponentProps {
  title: string;
  onAction: (data: string) => void;
  isLoading?: boolean;
}

export const Component: React.FC<ComponentProps> = ({ 
  title, 
  onAction, 
  isLoading = false 
}) => {
  // Implementation
};
```

- **Hooks**: Use custom hooks for reusable logic
- **State Management**: Prefer Zustand or Context API over Redux
- **API Calls**: Use Tanstack Query for server state
- **Error Boundaries**: Always implement for production apps

### Python/FastAPI Preferences
```python
# Preferred async function structure
async def process_data(
    request: Request,
    data: DataModel,
    db: AsyncSession = Depends(get_db)
) -> ResponseModel:
    """Process data with proper error handling."""
    try:
        # Implementation
        return ResponseModel(success=True, data=result)
    except Exception as e:
        logger.error(f"Error processing data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

- **Async First**: Always use async/await for I/O operations
- **Type Hints**: Use comprehensive type hints with Pydantic models
- **Error Handling**: Proper exception handling with meaningful error messages
- **Logging**: Use structured logging with appropriate levels

### CSS/Styling Preferences
- **Tailwind CSS**: Primary styling method
- **Component Libraries**: Radix UI for unstyled, accessible components
- **Animations**: Framer Motion for complex animations, CSS for simple ones
- **Dark Mode**: Always implement with system preference detection
- **Responsive Design**: Mobile-first with proper breakpoints (sm, md, lg, xl, 2xl)

### Testing Preferences
- **Coverage Target**: Minimum 80% code coverage
- **Testing Libraries**: 
  - React: Vitest + React Testing Library
  - Python: Pytest with async support
  - E2E: Playwright
- **Test Structure**: Arrange-Act-Assert pattern
- **Mock Data**: Use factories, not hardcoded test data

### Git Workflow
- **Commit Messages**: Conventional commits (feat:, fix:, docs:, etc.)
- **Branch Naming**: feature/description, bugfix/description, hotfix/description
- **PR Size**: Keep PRs small and focused (< 400 lines when possible)
- **Code Review**: Always self-review before requesting reviews

### Documentation
- **README**: Always include setup instructions, environment variables, and common commands
- **API Documentation**: OpenAPI/Swagger for REST APIs
- **Component Documentation**: Use Storybook for component libraries
- **Inline Documentation**: JSDoc for complex functions

### Security Best Practices
- **No Secrets in Code**: Use environment variables
- **Input Validation**: Always validate and sanitize user input
- **Authentication**: Implement proper JWT/session management
- **CORS**: Configure properly for production
- **Rate Limiting**: Implement on all public APIs
- **SQL Injection**: Use parameterized queries/ORMs

### Performance Optimization
- **Code Splitting**: Lazy load routes and heavy components
- **Image Optimization**: Use WebP format, lazy loading, and proper sizing
- **Caching**: Implement proper cache headers and service workers
- **Bundle Size**: Monitor and optimize with webpack-bundle-analyzer
- **Database**: Use indexes, optimize queries, implement connection pooling

### Debugging Approach
1. **Understand the Problem**: Read error messages carefully
2. **Reproduce**: Create minimal reproduction
3. **Isolate**: Use binary search to find the issue
4. **Fix**: Implement the simplest solution that works
5. **Test**: Verify the fix doesn't break other functionality
6. **Document**: Add comments if the fix isn't obvious

### AI Assistant Interaction Preferences
- **Be Concise**: Short, direct responses unless detail is requested
- **Show, Don't Tell**: Provide code examples over explanations
- **Complete Solutions**: No placeholders or "TODO" comments
- **Error Recovery**: Always provide recovery steps for errors
- **Context Awareness**: Remember previous conversations and build upon them

### Common Project Patterns
- **Monorepo Structure**: Prefer when multiple related projects
- **Environment Management**: .env.local → .env.development → .env.production
- **CI/CD**: GitHub Actions for automation, Netlify/Vercel for frontend, Render/Railway for backend
- **Monitoring**: Sentry for error tracking, PostHog for analytics
- **Database**: Supabase (PostgreSQL) for production, SQLite for development

### Accessibility Standards
- **WCAG 2.1 AA Compliance**: Minimum standard
- **Semantic HTML**: Use proper HTML elements
- **ARIA Labels**: Only when semantic HTML isn't sufficient
- **Keyboard Navigation**: All interactive elements keyboard accessible
- **Screen Reader Support**: Test with NVDA/JAWS
- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text

### Development Environment
- **Editor**: VSCode with recommended extensions
- **Terminal**: Zsh with Oh My Zsh
- **Node Version**: Use latest LTS (currently 20.x)
- **Package Manager**: npm (considering pnpm for monorepos)
- **OS**: macOS primary, ensure Linux compatibility

### Preferred Libraries & Tools
#### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Radix UI
- **State**: Zustand, Tanstack Query
- **Forms**: React Hook Form + Zod
- **Animation**: Framer Motion
- **Charts**: Recharts
- **Maps**: Mapbox GL JS

#### Backend
- **Framework**: FastAPI
- **ORM**: SQLAlchemy 2.0+ (async)
- **Database**: PostgreSQL via Supabase
- **Caching**: Redis
- **Task Queue**: Celery
- **WebSockets**: FastAPI WebSocket support

#### DevOps
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Hosting**: Netlify (frontend), Render (backend)
- **Monitoring**: Sentry, PostHog
- **DNS/CDN**: Cloudflare

### Communication Style
- **Directness**: Be straightforward and honest
- **Problem-Solving**: Focus on solutions, not problems
- **Learning**: Explain the "why" behind decisions
- **Collaboration**: Suggest improvements and alternatives
- **Efficiency**: Minimize boilerplate and repetition

### Project-Specific Overrides
Individual projects may override these preferences by including their own CLAUDE.md file in the project root. Project-specific settings take precedence over global settings.

---

## Quick Reference Commands

### Development
```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

### Git
```bash
# Create feature branch
git checkout -b feature/feature-name

# Commit with conventional message
git commit -m "feat: add new feature"

# Interactive rebase
git rebase -i HEAD~3

# Stash changes
git stash save "WIP: description"
```

### Debugging
```bash
# Check port usage
lsof -i :3000

# Kill process on port
kill -9 $(lsof -t -i:3000)

# Check disk usage
df -h

# Check memory usage
top -o mem
```

---

## Notes
- This configuration applies to all projects unless overridden
- Update this file as preferences evolve
- Claude Code will reference this for consistent behavior across sessions
- Project-specific CLAUDE.md files take precedence over these global settings

Last Updated: August 2025