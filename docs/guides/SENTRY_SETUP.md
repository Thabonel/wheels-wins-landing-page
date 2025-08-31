# Sentry Error Monitoring Setup

This document explains how Sentry is configured in the Wheels and Wins application for error monitoring, performance tracking, and session replay.

## Overview

Sentry is configured to:
- ✅ Monitor JavaScript errors and exceptions
- ✅ Track user interactions and sessions (privacy-compliant)
- ✅ Monitor performance and load times
- ✅ Provide session replay for debugging
- ✅ Integrate with user authentication system

## Environment Setup

### 1. Add Environment Variables

Add these variables to your `.env` file:

```bash
# Sentry Error Monitoring
VITE_SENTRY_DSN=https://6f5e3cc3ed0d407aa7c11e0c4ee24860@o4509704548909056.ingest.de.sentry.io/4509704568635472
VITE_SENTRY_ENVIRONMENT=development
```

### 2. Environment-Specific Configuration

- **Development**: Full error tracking with 100% sampling
- **Production**: Optimized sampling rates (10% performance, 1% session replay)
- **Staging**: Similar to development for testing

## Features Implemented

### Error Boundaries
- Application-wide error boundary wraps the entire app
- Custom fallback UI for graceful error handling
- Automatic error reporting to Sentry

### User Context
- Privacy-compliant user tracking (no PII)
- User ID tracking for error correlation
- Authentication state monitoring

### Performance Monitoring
- Automatic route change tracking
- API call monitoring
- Component render performance

### Session Replay
- Records user sessions for debugging
- Higher sampling on errors (100%)
- Lower sampling for normal sessions (1% prod, 10% dev)

## File Structure

```
src/
├── lib/
│   └── sentry.ts              # Main Sentry configuration
├── components/
│   └── common/
│       ├── ErrorBoundary.tsx  # React error boundary
│       └── SentryTestButton.tsx # Development testing (remove in prod)
├── hooks/
│   └── useSentryUser.ts       # User context integration
└── context/
    └── AuthContext.tsx        # User authentication tracking
```

## Usage Examples

### Manual Error Reporting

```typescript
import { captureException, captureMessage } from '@/lib/sentry';

// Report an exception
try {
  riskyOperation();
} catch (error) {
  captureException(error);
}

// Report a message
captureMessage('User performed important action', 'info');
```

### Adding Context

```typescript
import { setContext, setTag, addBreadcrumb } from '@/lib/sentry';

// Add custom context
setContext('user_action', {
  action: 'trip_planned',
  destination: 'Yellowstone',
  vehicle_type: 'RV'
});

// Add tags for filtering
setTag('feature', 'trip-planner');
setTag('user_type', 'premium');

// Add breadcrumbs for debugging
addBreadcrumb({
  message: 'User started trip planning',
  level: 'info',
  category: 'user_action'
});
```

### Performance Monitoring

```typescript
import { startSpan } from '@/lib/sentry';

// Track performance of specific operations
startSpan({ name: 'map-render' }, async (span) => {
  await renderMapWithMarkers();
  span?.setTag('markers_count', markers.length);
});
```

## Testing Sentry Integration

### Development Testing

1. **Test Buttons**: In development mode, test buttons appear in bottom-right corner
2. **Test Message**: Sends info message to Sentry
3. **Test Error**: Sends handled exception to Sentry  
4. **Test Crash**: Triggers error boundary and sends unhandled error

### Verification Steps

1. Set up your Sentry environment variables
2. Run the application in development mode
3. Use the test buttons to send test events
4. Check your Sentry dashboard for received events
5. Verify user context is properly set (without PII)

## Privacy Considerations

### What We Track
- ✅ Error messages and stack traces
- ✅ User ID (for error correlation)
- ✅ Performance metrics
- ✅ User actions and navigation

### What We DON'T Track
- ❌ Email addresses
- ❌ Personal names
- ❌ Location data (beyond general region)
- ❌ Payment information
- ❌ Private conversations or content

### GDPR Compliance
- User data is pseudonymized (only user ID)
- Data retention follows Sentry's standard policies
- Users can request data deletion through Sentry
- No personal identification information is sent

## Production Deployment

### 1. Environment Variables
Set these in your production environment (Netlify/Vercel):

```bash
VITE_SENTRY_DSN=your_production_dsn_here
VITE_SENTRY_ENVIRONMENT=production
```

### 2. Source Maps (Optional)
For better error debugging, you can upload source maps:

```bash
npm install -g @sentry/cli
sentry-cli sourcemaps upload --release=production ./dist
```

### 3. Remove Test Components
Remove or comment out the `SentryTestButton` import in production builds.

## Monitoring and Alerts

### Sentry Dashboard Features
- **Issues**: View and triage errors by frequency and impact
- **Performance**: Monitor page load times and API calls
- **Releases**: Track errors by deployment version
- **Alerts**: Set up notifications for critical errors

### Recommended Alerts
1. New error types (immediate notification)
2. Error frequency spikes (>10 errors/minute)
3. Performance degradation (>3s page load)
4. User session errors (affecting >1% of users)

## Troubleshooting

### Common Issues

1. **No events in Sentry**
   - Check DSN configuration
   - Verify environment variables are loaded
   - Check network connectivity
   - Test with development buttons

2. **Missing user context**
   - Verify authentication integration
   - Check Sentry user setting in AuthContext
   - Ensure user login triggers Sentry user update

3. **Performance data missing**
   - Check sampling rates in configuration
   - Verify browser tracking integration
   - Ensure Sentry is initialized before navigation

### Debug Mode
Enable debug mode in development:

```typescript
// Add to sentry.ts for debugging
debug: import.meta.env.MODE === 'development',
```

## Best Practices

### Error Handling
1. Always use try-catch for risky operations
2. Provide meaningful error messages
3. Add relevant context before capturing errors
4. Don't spam Sentry with expected errors (use filters)

### Performance
1. Use sampling in production to control costs
2. Monitor bundle size impact (Sentry adds ~100KB)
3. Consider lazy loading Sentry for non-critical applications

### Privacy
1. Never send PII in error data
2. Filter sensitive information in `beforeSend`
3. Use tags and context instead of user properties
4. Regularly audit what data is being sent

## Support

- **Sentry Documentation**: https://docs.sentry.io/platforms/javascript/guides/react/
- **Wheels and Wins Issues**: Report configuration issues in project repository
- **Sentry Support**: Use Sentry's support channels for platform issues

## Cost Optimization

### Free Tier Limits
- 5,000 errors/month
- 10,000 performance units/month
- 1 project

### Optimization Tips
1. Use sampling to stay within limits
2. Filter out noisy errors (network failures, etc.)
3. Set up rate limiting for high-frequency errors
4. Use environment-specific projects if needed

---

**Note**: Remove `SentryTestButton` component before deploying to production!