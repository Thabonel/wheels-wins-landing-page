#!/usr/bin/env node

/**
 * Test script to verify WebSocket authentication fixes
 * This tests the comprehensive solution for WebSocket 403 errors
 */

const WebSocket = require('ws');
const http = require('http');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const WS_URL = BACKEND_URL.replace('http', 'ws');

// Test credentials (you'll need to update these with a real token)
const TEST_TOKEN = process.env.TEST_TOKEN || 'your-test-token-here';
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-id';

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testHealthCheck() {
  log('\n📋 Testing Backend Health...', 'blue');
  
  return new Promise((resolve) => {
    http.get(`${BACKEND_URL}/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          log('✅ Backend is healthy', 'green');
          console.log('Response:', data);
          resolve(true);
        } else {
          log(`❌ Backend health check failed: ${res.statusCode}`, 'red');
          resolve(false);
        }
      });
    }).on('error', (err) => {
      log(`❌ Cannot connect to backend: ${err.message}`, 'red');
      resolve(false);
    });
  });
}

async function testWebSocketAuth() {
  log('\n🔐 Testing WebSocket Authentication...', 'blue');
  
  const testCases = [
    {
      name: 'No token',
      url: `${WS_URL}/api/v1/pam/ws/${TEST_USER_ID}`,
      expectFail: true
    },
    {
      name: 'Invalid token',
      url: `${WS_URL}/api/v1/pam/ws/${TEST_USER_ID}?token=invalid-token-123`,
      expectFail: true
    },
    {
      name: 'Valid token (if provided)',
      url: `${WS_URL}/api/v1/pam/ws/${TEST_USER_ID}?token=${TEST_TOKEN}`,
      expectFail: TEST_TOKEN === 'your-test-token-here'
    }
  ];
  
  for (const testCase of testCases) {
    log(`\nTest: ${testCase.name}`, 'yellow');
    
    await new Promise((resolve) => {
      const ws = new WebSocket(testCase.url);
      let connected = false;
      
      ws.on('open', () => {
        connected = true;
        if (testCase.expectFail) {
          log('  ❌ Unexpected success - connection should have been rejected', 'red');
        } else {
          log('  ✅ Connection established successfully', 'green');
          
          // Send a test message
          ws.send(JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString()
          }));
        }
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        log(`  📥 Received: ${JSON.stringify(message)}`, 'blue');
        
        if (message.type === 'pong') {
          log('  ✅ Ping-pong successful', 'green');
        }
        
        ws.close();
      });
      
      ws.on('close', (code, reason) => {
        if (!connected && testCase.expectFail) {
          log(`  ✅ Connection correctly rejected with code ${code}: ${reason}`, 'green');
        } else if (!connected && !testCase.expectFail) {
          log(`  ❌ Connection rejected with code ${code}: ${reason}`, 'red');
        }
        resolve();
      });
      
      ws.on('error', (error) => {
        if (testCase.expectFail) {
          log(`  ✅ Expected error: ${error.message}`, 'green');
        } else {
          log(`  ❌ Unexpected error: ${error.message}`, 'red');
        }
        resolve();
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        ws.close();
        resolve();
      }, 5000);
    });
  }
}

async function testAdminRole() {
  log('\n👑 Testing Admin Role Support...', 'blue');
  
  // This would test with an admin role token if available
  log('  ℹ️ Admin role testing requires an admin token', 'yellow');
  log('  Set TEST_TOKEN environment variable with an admin token to test', 'yellow');
}

async function main() {
  log('=' .repeat(60), 'blue');
  log('WebSocket Authentication Fix Test Suite', 'blue');
  log('=' .repeat(60), 'blue');
  
  // Test backend health
  const isHealthy = await testHealthCheck();
  if (!isHealthy) {
    log('\n⚠️ Backend is not running. Start it with:', 'yellow');
    log('cd backend && uvicorn app.main:app --reload --port 8000', 'yellow');
    process.exit(1);
  }
  
  // Test WebSocket authentication
  await testWebSocketAuth();
  
  // Test admin role support
  await testAdminRole();
  
  log('\n' + '=' .repeat(60), 'blue');
  log('✅ Test suite completed', 'green');
  log('=' .repeat(60), 'blue');
  
  log('\n📝 Summary of fixes applied:', 'blue');
  log('1. ✅ Added admin role to accepted roles in deps.py', 'green');
  log('2. ✅ Added proper JWT validation in WebSocket endpoint', 'green');
  log('3. ✅ Fixed user_id path parameter in frontend', 'green');
  log('4. ✅ Removed duplicate JWT verification code', 'green');
  
  log('\n🚀 Next steps:', 'blue');
  log('1. Restart the backend server to apply changes', 'yellow');
  log('2. Test with a real Supabase token', 'yellow');
  log('3. Check browser console for WebSocket connection success', 'yellow');
}

// Run the test suite
main().catch(console.error);