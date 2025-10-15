/**
 * E2E Health Check - Layer 1: Real User Monitoring
 *
 * Runs every 5 minutes via Netlify Scheduled Functions
 * Tests critical user flows and alerts instantly if broken
 *
 * What Big Tech does: Detect in 5 min, fix in 30 min
 */

import { Handler, schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Environment variables (set in Netlify dashboard)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ALERT_EMAIL = process.env.ALERT_EMAIL || 'thabonel@gmail.com';
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'https://wheels-wins-backend-staging.onrender.com';

interface HealthCheckResult {
  test: string;
  status: 'pass' | 'fail';
  duration_ms: number;
  error?: string;
  timestamp: string;
}

interface HealthCheckReport {
  overall_status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  tests: HealthCheckResult[];
  alerts: string[];
}

/**
 * Test 1: User Signup Flow
 * Critical: If signup is broken, no new users can join
 */
async function testSignup(): Promise<HealthCheckResult> {
  const start = Date.now();
  const testEmail = `health-check-${Date.now()}@test.wheels.internal`;
  const testPassword = 'HealthCheck123!';

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Try to sign up
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (error) {
      return {
        test: 'signup',
        status: 'fail',
        duration_ms: Date.now() - start,
        error: `Signup failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }

    // Cleanup: Delete test user
    if (data.user) {
      await supabase.auth.admin.deleteUser(data.user.id);
    }

    return {
      test: 'signup',
      status: 'pass',
      duration_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      test: 'signup',
      status: 'fail',
      duration_ms: Date.now() - start,
      error: `Exception: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test 2: User Login Flow
 * Critical: If login is broken, existing users can't access the app
 */
async function testLogin(): Promise<HealthCheckResult> {
  const start = Date.now();
  const testEmail = `health-check-login-${Date.now()}@test.wheels.internal`;
  const testPassword = 'HealthCheck123!';

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create test user
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signupError || !signupData.user) {
      return {
        test: 'login',
        status: 'fail',
        duration_ms: Date.now() - start,
        error: `Setup failed: ${signupError?.message}`,
        timestamp: new Date().toISOString(),
      };
    }

    // Try to log in
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    // Cleanup
    await supabase.auth.admin.deleteUser(signupData.user.id);

    if (loginError) {
      return {
        test: 'login',
        status: 'fail',
        duration_ms: Date.now() - start,
        error: `Login failed: ${loginError.message}`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      test: 'login',
      status: 'pass',
      duration_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      test: 'login',
      status: 'fail',
      duration_ms: Date.now() - start,
      error: `Exception: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test 3: PAM Backend Health
 * Critical: If PAM is down, core AI features don't work
 */
async function testPamBackend(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/pam/health`);
    const data = await response.json();

    if (!response.ok || data.status !== 'healthy') {
      return {
        test: 'pam_backend',
        status: 'fail',
        duration_ms: Date.now() - start,
        error: `PAM unhealthy: ${JSON.stringify(data)}`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      test: 'pam_backend',
      status: 'pass',
      duration_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      test: 'pam_backend',
      status: 'fail',
      duration_ms: Date.now() - start,
      error: `Exception: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test 4: Database Connectivity
 * Critical: If database is down, entire app is broken
 */
async function testDatabase(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Simple query to test connectivity
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      return {
        test: 'database',
        status: 'fail',
        duration_ms: Date.now() - start,
        error: `Database query failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      test: 'database',
      status: 'pass',
      duration_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      test: 'database',
      status: 'fail',
      duration_ms: Date.now() - start,
      error: `Exception: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Send alert when critical test fails
 * Uses Netlify's built-in email or external service
 */
async function sendAlert(report: HealthCheckReport): Promise<void> {
  const failedTests = report.tests.filter(t => t.status === 'fail');

  if (failedTests.length === 0) return;

  const subject = `🚨 CRITICAL: ${failedTests.length} Health Check(s) Failed`;
  const body = `
Health Check Failed at ${report.timestamp}

Overall Status: ${report.overall_status.toUpperCase()}

Failed Tests:
${failedTests.map(t => `
  - ${t.test}: ${t.error}
    Duration: ${t.duration_ms}ms
`).join('\n')}

Passed Tests:
${report.tests.filter(t => t.status === 'pass').map(t => `
  - ${t.test}: ${t.duration_ms}ms
`).join('\n')}

Action Required:
1. Check staging environment: https://wheels-wins-staging.netlify.app
2. Check backend logs: https://dashboard.render.com
3. Check Supabase dashboard
4. Fix and deploy immediately

This is an automated alert from E2E health monitoring.
  `.trim();

  console.error(subject);
  console.error(body);

  // Log to database for tracking
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from('health_check_alerts').insert({
      status: report.overall_status,
      failed_tests: failedTests.map(t => t.test),
      error_details: failedTests.map(t => t.error),
      timestamp: report.timestamp,
    });
  } catch (error) {
    console.error('Failed to log alert to database:', error);
  }

  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // TODO: Integrate with SMS service (Twilio)
  // TODO: Integrate with Slack/Discord webhook
}

/**
 * Run all health checks and generate report
 */
async function runHealthChecks(): Promise<HealthCheckReport> {
  console.log('Starting E2E health checks...');

  // Run all tests in parallel for speed
  const [signup, login, pamBackend, database] = await Promise.all([
    testSignup(),
    testLogin(),
    testPamBackend(),
    testDatabase(),
  ]);

  const tests = [signup, login, pamBackend, database];
  const failedTests = tests.filter(t => t.status === 'fail');

  // Determine overall status
  let overall_status: 'healthy' | 'degraded' | 'critical';
  if (failedTests.length === 0) {
    overall_status = 'healthy';
  } else if (failedTests.some(t => ['signup', 'login', 'database'].includes(t.test))) {
    overall_status = 'critical';
  } else {
    overall_status = 'degraded';
  }

  const report: HealthCheckReport = {
    overall_status,
    timestamp: new Date().toISOString(),
    tests,
    alerts: failedTests.map(t => `${t.test}: ${t.error}`),
  };

  // Send alerts if critical
  if (overall_status === 'critical' || overall_status === 'degraded') {
    await sendAlert(report);
  }

  return report;
}

/**
 * Netlify Function Handler
 * Can be called manually via HTTP or scheduled
 */
export const handler: Handler = async (event, context) => {
  try {
    const report = await runHealthChecks();

    return {
      statusCode: report.overall_status === 'healthy' ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report, null, 2),
    };
  } catch (error) {
    console.error('Health check execution failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Health check execution failed',
        message: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

/**
 * Scheduled Function (runs every 5 minutes)
 * Configure in netlify.toml
 */
export const scheduledHandler = schedule('*/5 * * * *', handler);
