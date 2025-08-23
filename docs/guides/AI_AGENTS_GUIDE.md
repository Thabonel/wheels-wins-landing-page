# AI Development Agents Guide

## Overview

The Wheels & Wins project now includes a comprehensive suite of AI-powered development agents that enhance code quality, security, documentation, and testing capabilities.

## Configuration

### Initial Setup

1. **Copy the environment template:**
   ```bash
   cp .env.ai-agents .env.ai-agents.local
   ```

2. **Add your API keys to `.env.ai-agents.local`:**
   - Get Codium AI key from: https://www.codium.ai/
   - Get Snyk token from: https://snyk.io/
   - Get GitGuardian key from: https://www.gitguardian.com/
   - Get Vercel v0 key from: https://v0.dev/
   - Get Mintlify key from: https://mintlify.com/

3. **Install required packages (if not already installed):**
   ```bash
   npm install -g snyk newman
   pip install semgrep ggshield
   ```

## Available Commands

### Quick Status Check
```bash
npm run ai:status
```
Shows the status of all configured AI agents.

### Security Scanning
```bash
npm run ai:security
```
Runs comprehensive security scans using:
- **Semgrep**: Static analysis for security patterns
- **GitGuardian**: Secret detection in code
- **Snyk**: Vulnerability scanning in dependencies

### Test Generation
```bash
npm run ai:tests
```
Automatically generates tests for components without coverage using AI.

### Documentation Generation
```bash
npm run ai:docs
```
Creates documentation for:
- API endpoints
- React components
- Utility functions
- Services

### PAM Analysis
```bash
npm run ai:pam
```
Specifically analyzes the PAM AI assistant for:
- Response quality
- Context awareness
- Performance optimizations
- Security vulnerabilities

### Run Everything
```bash
npm run ai:all
```
Executes all AI agent workflows in sequence.

## Agent Categories

### 🐛 Bug Detection
- **Codium AI**: Real-time code review and test suggestions
- **Snyk**: Dependency vulnerability scanning
- **SonarLint**: Code quality and security analysis

### 🔐 Security
- **Semgrep**: Pattern-based security scanning
- **GitGuardian**: Secret and credential detection
- **Bearer**: API security analysis

### 📚 Documentation
- **Mintlify**: Auto-generated documentation
- **Swimm**: Code-coupled documentation
- **Dokumentor**: Comprehensive doc generation

### 🎨 UI/UX
- **Vercel v0**: AI-powered UI component generation
- **Locofy**: Design to code conversion
- **Components AI**: Theme-aware component creation

### 🧪 Testing
- **Auto-generation**: Creates missing test files
- **Coverage tracking**: Monitors test coverage goals
- **AI-powered mocks**: Generates realistic test data

## Workflow Integration

### Pre-commit Hooks
The following checks run automatically before commits:
- GitGuardian secret scanning
- Semgrep security analysis
- ESLint and Prettier formatting
- TypeScript type checking

### Pull Request Checks
Before merging:
- Full test suite execution
- Coverage verification (80% target)
- Security scan results
- Documentation completeness

### Scheduled Scans
- **Daily**: Dependency updates, Snyk vulnerability scan
- **Weekly**: Full security audit, performance analysis

## Priority Areas for Wheels & Wins

### PAM AI Assistant (High Priority)
- Response quality improvements
- Context awareness enhancements
- Performance optimizations
- Security hardening

### Backend API (High Priority)
- API security scanning
- Rate limiting verification
- Error handling improvements

### Frontend Components (Medium Priority)
- Component test coverage
- Accessibility compliance
- Performance monitoring

## Best Practices

### When to Run Security Scans
- Before every deployment
- After adding new dependencies
- When modifying authentication/authorization code
- After receiving security advisories

### When to Generate Tests
- After creating new components
- When test coverage drops below 80%
- Before major refactoring
- During bug fix implementations

### When to Update Documentation
- After API changes
- When adding new features
- During architectural changes
- For complex utility functions

## Troubleshooting

### Common Issues

**Agent not working:**
- Check if API key is configured in `.env.ai-agents.local`
- Verify the tool is installed (`which <tool-name>`)
- Check network connectivity for API-based services

**Security scan failures:**
- Review `.semgrepignore` for false positives
- Update dependency versions for known vulnerabilities
- Check GitGuardian dashboard for secret leak details

**Test generation issues:**
- Ensure components follow naming conventions
- Check that TypeScript types are properly defined
- Review existing test patterns for consistency

## Monitoring & Reporting

### Dashboard Links
- Snyk: https://app.snyk.io/
- GitGuardian: https://dashboard.gitguardian.com/
- Semgrep: https://semgrep.dev/
- Codium: VS Code extension panel

### Metrics to Track
- Security vulnerability count
- Test coverage percentage
- Documentation completeness
- Code quality score
- Performance benchmarks

## Future Enhancements

### Planned Additions
- GitHub Copilot integration
- AWS CodeGuru integration
- Datadog synthetic monitoring
- Automated performance testing
- AI-powered code refactoring

### Experimental Features
- Voice-controlled development
- AI pair programming sessions
- Automated bug fixing
- Predictive error detection
- Smart dependency updates

## Resources

### Documentation
- [Codium AI Docs](https://docs.codium.ai/)
- [Snyk Documentation](https://docs.snyk.io/)
- [Semgrep Rules](https://semgrep.dev/r)
- [GitGuardian Docs](https://docs.gitguardian.com/)

### Support
- Create issues in the project repository
- Check agent-specific documentation
- Contact tool vendors for API issues

---

## Quick Reference Card

```bash
# Daily workflow
npm run ai:status          # Check agent status
npm run ai:security         # Run security scan
npm run ai:tests           # Generate missing tests

# Before deployment
npm run ai:all             # Run all checks

# PAM-specific
npm run ai:pam             # Analyze PAM assistant

# Documentation
npm run ai:docs            # Generate docs
```

Remember to keep your API keys secure and never commit them to version control!