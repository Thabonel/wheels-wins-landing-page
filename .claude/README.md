# Claude Code Subagents for Wheels & Wins

A comprehensive suite of specialized Claude Code agents designed to accelerate development of the Wheels & Wins travel platform.

## Overview

This subagent system provides 10 specialized agents that work together to deliver high-quality, production-ready features across the entire technology stack:

- **React 18** + TypeScript frontend with Vite and Tailwind CSS
- **FastAPI** Python backend with async patterns
- **Supabase** PostgreSQL database with real-time features  
- **Docker** deployment on Render.com and Netlify
- **PAM AI Assistant** with voice capabilities

## Quick Start

### Prerequisites
- Node.js 18+ with npm
- Python 3.11+ with pip
- Docker (optional)
- Claude Code CLI installed

### Basic Usage

```bash
# Start a full feature development workflow
claude-code --agent fullstack-integrator "Create trip sharing feature with photos and expense summaries"

# Run security audit and fixes
claude-code --workflow security-audit-and-fix

# Optimize application performance
claude-code --workflow performance-optimization

# Create comprehensive tests
claude-code --agent testing-automation-expert "Add integration tests for PAM voice features"
```

## Available Agents

### Core Development Agents
- **[react-frontend-specialist](./agents/react-frontend-specialist.md)** - React 18, TypeScript, Tailwind CSS, PWA
- **[fastapi-backend-expert](./agents/fastapi-backend-expert.md)** - FastAPI, async Python, Supabase integration
- **[fullstack-integrator](./agents/fullstack-integrator.md)** - End-to-end feature coordination
- **[performance-optimizer](./agents/performance-optimizer.md)** - Bundle, API, and database optimization

### Quality & Deployment Agents  
- **[testing-automation-expert](./agents/testing-automation-expert.md)** - Vitest, pytest, Playwright E2E
- **[deployment-specialist](./agents/deployment-specialist.md)** - Docker, Render.com, Netlify, CI/CD
- **[database-architect](./agents/database-architect.md)** - PostgreSQL, RLS, real-time subscriptions

### Advanced Feature Agents
- **[ai-features-specialist](./agents/ai-features-specialist.md)** - PAM AI, voice processing, OpenAI integration
- **[security-specialist](./agents/security-specialist.md)** - Authentication, input validation, OWASP Top 10
- **[devops-infrastructure](./agents/devops-infrastructure.md)** - Monitoring, logging, backup, SSL management

## Workflows

### Predefined Workflows
- **[full-feature-development](./workflows/full-feature-development.md)** - Complete feature from DB to UI (90-180 min)
- **[security-audit-and-fix](./workflows/security-audit-and-fix.md)** - Comprehensive security assessment (2-3 hours)
- **[performance-optimization](./workflows/performance-optimization.md)** - Full-stack performance tuning (2-3 hours)

### Custom Workflows
Create custom workflows by combining agents:

```bash
# Database + Backend + Frontend coordination
claude-code --agents database-architect,fastapi-backend-expert,react-frontend-specialist "Implement real-time trip collaboration"

# Security + Performance review
claude-code --agents security-specialist,performance-optimizer "Security audit with performance impact analysis"
```

## Project-Specific Examples

### Travel Feature Development
```bash
# Trip planning with Mapbox integration
claude-code --agent fullstack-integrator "Add route optimization with waypoints and fuel stops"

# Expense tracking enhancement  
claude-code --agent react-frontend-specialist "Create receipt photo upload with OCR processing"

# PAM AI enhancement
claude-code --agent ai-features-specialist "Add voice commands for expense logging while driving"
```

### Performance & Quality
```bash
# Bundle size optimization
claude-code --agent performance-optimizer "Reduce initial bundle size below 2MB with lazy loading"

# Database optimization
claude-code --agent database-architect "Optimize financial summary queries with materialized views"

# Security hardening
claude-code --agent security-specialist "Implement rate limiting and abuse prevention"
```

## Configuration

### Settings.json
The `settings.json` file controls agent behavior and project-specific configurations:

```json
{
  "project": {
    "name": "Wheels & Wins",
    "tech_stack": {
      "frontend": ["React 18", "TypeScript", "Vite", "Tailwind CSS"],
      "backend": ["FastAPI", "Python", "Supabase", "Redis"],
      "deployment": ["Render.com", "Netlify", "Docker"]
    }
  },
  "agents": {
    "parallel_limit": 3,
    "timeout_minutes": 10,
    "context_sharing": true
  },
  "quality_gates": {
    "typescript_strict": true,
    "test_coverage_min": 80,
    "bundle_size_limit": "2MB"
  }
}
```

### Environment Variables
Set these environment variables for full functionality:

```bash
# Development
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MAPBOX_TOKEN=your_mapbox_token

# Backend
DATABASE_URL=postgresql://user:pass@host:port/db
OPENAI_API_KEY=your_openai_api_key
REDIS_URL=redis://localhost:6379
```

## Development Workflow Integration

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/trip-collaboration

# Develop with agents
claude-code --workflow full-feature-development "Real-time trip collaboration with live updates"

# Run quality checks
claude-code --agent testing-automation-expert "Add comprehensive tests for new collaboration features"
claude-code --agent security-specialist "Security review of real-time features"

# Performance validation
claude-code --agent performance-optimizer "Ensure real-time features don't impact performance"

# Commit and deploy
git add .
git commit -m "feat: add real-time trip collaboration with live updates"
git push origin feature/trip-collaboration
```

### CI/CD Integration
The agents work seamlessly with existing CI/CD pipelines:

```yaml
# .github/workflows/agent-validation.yml
name: Agent Validation
on: [push, pull_request]

jobs:
  agent-quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Quality Agents
        run: |
          claude-code --agent testing-automation-expert "Run full test suite"
          claude-code --agent security-specialist "Security scan for new changes"
          claude-code --agent performance-optimizer "Performance impact assessment"
```

## Agent Specializations

### Frontend Specialization (React + TypeScript)
```typescript
// Example: Agent-generated optimized component
const OptimizedTripCard = React.memo<TripCardProps>(({ trip, onUpdate }) => {
  const { data: expenses } = useQuery({
    queryKey: ['trip-expenses', trip.id],
    queryFn: () => api.getTripExpenses(trip.id),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const memoizedTotal = useMemo(() => 
    expenses?.reduce((sum, exp) => sum + exp.amount, 0) ?? 0,
    [expenses]
  );

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>{trip.name}</CardTitle>
        <CardDescription>
          {format(trip.startDate, 'PPP')} - {format(trip.endDate, 'PPP')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <span>Total Expenses</span>
          <span className="font-bold">${memoizedTotal.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
});
```

### Backend Specialization (FastAPI + Async)
```python
# Example: Agent-generated optimized endpoint
@router.get("/trips/{trip_id}/summary", response_model=TripSummaryResponse)
@cache_response(ttl=300)  # 5-minute cache
async def get_trip_summary(
    trip_id: UUID,
    current_user: dict = Depends(verify_supabase_jwt_token),
    db: DatabaseService = Depends(get_database)
):
    """Get optimized trip summary with expense aggregation."""
    
    # Verify trip ownership
    if not await db.user_owns_trip(current_user["sub"], trip_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Single optimized query instead of multiple calls
    summary = await db.execute_query("""
        SELECT 
            t.id, t.name, t.start_date, t.end_date,
            COUNT(e.id) as expense_count,
            COALESCE(SUM(e.amount), 0) as total_expenses,
            t.budget_total,
            t.budget_total - COALESCE(SUM(e.amount), 0) as remaining_budget
        FROM trips t
        LEFT JOIN expenses e ON t.id = e.trip_id
        WHERE t.id = $1
        GROUP BY t.id, t.name, t.start_date, t.end_date, t.budget_total
    """, trip_id)
    
    return TripSummaryResponse(**summary[0])
```

## Testing Integration

### Automated Test Generation
```bash
# Generate comprehensive test suite
claude-code --agent testing-automation-expert "Create tests for trip sharing feature with photo uploads"
```

Generated tests include:
- **Unit tests** for components and utilities
- **Integration tests** for API endpoints  
- **E2E tests** for complete user workflows
- **Performance tests** for optimization validation
- **Security tests** for vulnerability detection

### Example Generated Test
```typescript
// Generated by testing-automation-expert
describe('TripSharingFlow', () => {
  it('should complete trip sharing workflow with photos', async () => {
    const user = await createTestUser();
    const trip = await createTestTrip(user.id);
    
    render(<TripSharingPage />, { wrapper: createAuthWrapper(user) });
    
    // Upload photos
    const fileInput = screen.getByLabelText(/upload photos/i);
    const testFiles = [createTestImageFile('trip1.jpg'), createTestImageFile('trip2.jpg')];
    fireEvent.change(fileInput, { target: { files: testFiles } });
    
    // Fill sharing form
    await user.type(screen.getByLabelText(/title/i), 'Amazing Road Trip');
    await user.type(screen.getByLabelText(/description/i), 'Epic journey across the country');
    
    // Submit
    await user.click(screen.getByRole('button', { name: /share trip/i }));
    
    // Verify API calls and UI updates
    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/trip-shares', expect.objectContaining({
        trip_id: trip.id,
        title: 'Amazing Road Trip',
        images: expect.arrayContaining([expect.stringMatching(/^https:\/\//)]),
      }));
    });
    
    expect(screen.getByText(/trip shared successfully/i)).toBeInTheDocument();
  });
});
```

## Performance Optimization Examples

### Bundle Analysis Output
```bash
# Generated by performance-optimizer agent
📊 Bundle Analysis Results:

Initial Bundle Size: 4.2MB → 1.8MB (-57%)
├── Vendor Chunks: 1.2MB
│   ├── react-vendor: 180KB
│   ├── mapbox-vendor: 450KB (lazy loaded)
│   └── chart-vendor: 320KB (lazy loaded)
├── App Chunks: 600KB  
│   ├── pages: 300KB (route-based splitting)
│   └── components: 300KB
└── Assets: Optimized

🎯 Core Web Vitals Impact:
├── LCP: 3.2s → 1.8s (-44%)
├── FID: 120ms → 80ms (-33%)
└── CLS: 0.15 → 0.08 (-47%)

✅ All performance targets met\!
```

## Security Integration

### Automated Security Scanning
```bash
# Run comprehensive security audit
claude-code --workflow security-audit-and-fix

# Output example:
🔒 Security Audit Results:

├── Dependencies: ✅ 0 vulnerabilities
├── Authentication: ✅ JWT properly implemented
├── Input Validation: ⚠️  2 medium-risk issues found
├── CORS Configuration: ✅ Properly configured
└── SQL Injection: ✅ All queries parameterized

🛠️  Auto-fixing medium-risk issues:
├── Enhanced expense form validation
└── Strengthened file upload security

✅ Security score: 9.2/10 (improved from 7.5/10)
```

## Best Practices

### Agent Selection Guide
- **Single component/endpoint**: Use specific specialist agent
- **Cross-system feature**: Use `fullstack-integrator` 
- **Performance issues**: Use `performance-optimizer`
- **Security concerns**: Use `security-specialist`
- **Database changes**: Include `database-architect`
- **Testing required**: Include `testing-automation-expert`

### Workflow Selection Guide
- **New feature development**: `full-feature-development`
- **Security review needed**: `security-audit-and-fix`
- **Performance problems**: `performance-optimization`
- **Pre-deployment**: Combine security + performance + testing agents

### Quality Gates
All agents enforce these quality standards:
- ✅ TypeScript strict mode compliance
- ✅ 80%+ test coverage requirement
- ✅ ESLint and Prettier formatting
- ✅ Bundle size under 2MB
- ✅ API response times under 200ms
- ✅ Security best practices (OWASP Top 10)
- ✅ Accessibility compliance (WCAG 2.1)

## Troubleshooting

### Common Issues

**Agent timeout or slow responses:**
```bash
# Increase timeout in settings.json
{
  "agents": {
    "timeout_minutes": 15  // Increase from default 10
  }
}
```

**Context sharing issues:**
```bash
# Enable verbose logging
{
  "agents": {
    "verbose_logging": true
  }
}
```

**Quality gate failures:**
```bash
# Check specific requirements
claude-code --agent testing-automation-expert "Run quality check diagnostics"
```

### Agent-Specific Troubleshooting

**React Frontend Specialist:**
- Ensure Node.js 18+ is installed
- Clear npm cache: `npm cache clean --force`
- Reset node_modules: `rm -rf node_modules && npm install`

**FastAPI Backend Expert:**
- Ensure Python 3.11+ is installed  
- Check virtual environment activation
- Verify database connection: `python -c "from app.core.config import settings; print(settings.DATABASE_URL)"`

**Database Architect:**
- Verify Supabase connection and permissions
- Check RLS policies are properly configured
- Test database migrations in development first

## Contributing

### Adding New Agents
1. Create agent definition in `.claude/agents/new-agent.md`
2. Follow the established agent template structure
3. Add agent to workflow templates where appropriate
4. Update this README with agent description
5. Test agent with sample tasks

### Extending Workflows
1. Create workflow file in `.claude/workflows/new-workflow.md`
2. Define agent combinations and execution order
3. Include example usage and time estimates
4. Add quality gates and success criteria
5. Test workflow end-to-end

## Support & Resources

- **Documentation**: All agents and workflows have comprehensive documentation
- **Examples**: Each agent includes project-specific examples
- **Troubleshooting**: Common issues and solutions documented
- **Best Practices**: Established patterns for optimal results

## License

This subagent system is designed specifically for the Wheels & Wins project and incorporates project-specific knowledge, configurations, and best practices.

---

**Ready to accelerate your development?** Start with a simple command:

```bash
claude-code --agent react-frontend-specialist "Create a beautiful trip planning interface with map integration"
```

The agents will handle the complexity while you focus on building amazing travel experiences\! 🚗✨
EOF < /dev/null