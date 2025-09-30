#!/usr/bin/env node

/**
 * PAM (Personal AI Manager) Comprehensive Test Suite
 * Tests all major PAM functionalities including WebSocket, REST API, Voice, and Location
 * 
 * Usage:
 * 1. Run directly: node test-pam-functionality.js
 * 2. Or in browser console: copy and paste the testPAMFunctionality function
 */

console.log('🤖 PAM Functionality Test Suite');
console.log('================================\n');

// Configuration
const PAM_CONFIG = {
  WEBSOCKET_URL: 'wss://pam-backend.onrender.com/api/v1/pam/ws',
  REST_API_URL: 'https://pam-backend.onrender.com/api/v1/pam/chat',
  TIMEOUT: 5000
};

/**
 * Main test function - can be run in browser console
 */
async function testPAMFunctionality() {
  console.log('Starting PAM comprehensive tests...\n');
  
  const testResults = {
    frontend: {},
    backend: {},
    features: {}
  };

  // ========== FRONTEND TESTS ==========
  console.log('📱 Testing Frontend Components...');
  
  // Test 1: Check if PAM component exists
  testResults.frontend.componentExists = !!document.querySelector('[data-pam-chat]') || 
                                         !!document.querySelector('.pam-chat-widget') ||
                                         !!document.querySelector('[class*="pam"]');
  console.log(`  ✓ PAM Component: ${testResults.frontend.componentExists ? '✅' : '❌'}`);
  
  // Test 2: Voice support
  testResults.frontend.voiceSupport = 'SpeechRecognition' in window || 
                                      'webkitSpeechRecognition' in window;
  console.log(`  ✓ Voice Recognition: ${testResults.frontend.voiceSupport ? '✅' : '❌'}`);
  
  // Test 3: Location support
  testResults.frontend.locationSupport = 'geolocation' in navigator;
  console.log(`  ✓ Location Services: ${testResults.frontend.locationSupport ? '✅' : '❌'}`);
  
  // Test 4: WebSocket support
  testResults.frontend.websocketSupport = 'WebSocket' in window;
  console.log(`  ✓ WebSocket Support: ${testResults.frontend.websocketSupport ? '✅' : '❌'}`);

  // ========== BACKEND TESTS ==========
  console.log('\n🔌 Testing Backend Connectivity...');
  
  // Test 5: WebSocket connection (without auth)
  try {
    console.log('  Testing WebSocket connection...');
    const ws = new WebSocket(PAM_CONFIG.WEBSOCKET_URL);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, PAM_CONFIG.TIMEOUT);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        testResults.backend.websocketConnection = true;
        ws.close();
        resolve();
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        testResults.backend.websocketConnection = false;
        reject(error);
      };
    });
  } catch (error) {
    testResults.backend.websocketConnection = false;
    console.log(`    WebSocket Error: ${error.message}`);
  }
  console.log(`  ✓ WebSocket Connection: ${testResults.backend.websocketConnection ? '✅' : '❌'}`);
  
  // Test 6: REST API health check
  try {
    console.log('  Testing REST API...');
    const response = await fetch(PAM_CONFIG.REST_API_URL.replace('/chat', '/health'), {
      method: 'GET',
      signal: AbortSignal.timeout(PAM_CONFIG.TIMEOUT)
    }).catch(() => null);
    
    testResults.backend.restApiHealth = response && response.ok;
  } catch (error) {
    testResults.backend.restApiHealth = false;
  }
  console.log(`  ✓ REST API Health: ${testResults.backend.restApiHealth ? '✅' : '❌'}`);
  
  // Test 7: Authentication check
  if (typeof window !== 'undefined' && window.supabase) {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      testResults.backend.authenticated = !!session;
      console.log(`  ✓ Authentication: ${testResults.backend.authenticated ? '✅' : '❌'}`);
      
      // Test 8: Send authenticated message (if logged in)
      if (session) {
        try {
          const response = await fetch(PAM_CONFIG.REST_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              message: 'Test message from PAM test suite',
              context: { test: true }
            }),
            signal: AbortSignal.timeout(PAM_CONFIG.TIMEOUT)
          });
          
          testResults.backend.messageSent = response.ok;
          if (response.ok) {
            const data = await response.json();
            testResults.backend.responseReceived = !!data.response || !!data.message;
          }
        } catch (error) {
          testResults.backend.messageSent = false;
          testResults.backend.responseReceived = false;
        }
        console.log(`  ✓ Send Message: ${testResults.backend.messageSent ? '✅' : '❌'}`);
        console.log(`  ✓ Receive Response: ${testResults.backend.responseReceived ? '✅' : '❌'}`);
      }
    } catch (error) {
      testResults.backend.authenticated = false;
    }
  } else {
    console.log('  ⚠️  Supabase not available - run in browser for auth tests');
  }

  // ========== FEATURE TESTS ==========
  console.log('\n🎯 Testing PAM Features...');
  
  // Test 9: Location permission
  if (testResults.frontend.locationSupport) {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      testResults.features.locationPermission = permission.state;
      console.log(`  ✓ Location Permission: ${permission.state === 'granted' ? '✅' : `⚠️ ${  permission.state}`}`);
    } catch (error) {
      testResults.features.locationPermission = 'unknown';
    }
  }
  
  // Test 10: Check PAM services availability
  if (typeof window !== 'undefined') {
    testResults.features.pamService = !!window.pamService;
    testResults.features.voiceService = !!window.pamVoiceService;
    testResults.features.locationService = !!window.locationService;
    
    console.log(`  ✓ PAM Service: ${testResults.features.pamService ? '✅' : '❌'}`);
    console.log(`  ✓ Voice Service: ${testResults.features.voiceService ? '✅' : '❌'}`);
    console.log(`  ✓ Location Service: ${testResults.features.locationService ? '✅' : '❌'}`);
  }

  // ========== RESULTS SUMMARY ==========
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  
  const allTests = [
    ...Object.values(testResults.frontend),
    ...Object.values(testResults.backend),
    ...Object.values(testResults.features)
  ];
  
  const passed = allTests.filter(result => result === true).length;
  const total = allTests.length;
  const percentage = Math.round((passed / total) * 100);
  
  console.log(`\n✅ Passed: ${passed}/${total} tests (${percentage}%)`);
  
  // Detailed breakdown
  console.log('\nDetailed Results:');
  console.table({
    Frontend: testResults.frontend,
    Backend: testResults.backend,
    Features: testResults.features
  });
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (!testResults.backend.websocketConnection) {
    console.log('  ⚠️  WebSocket connection failed - check if backend is running');
  }
  if (!testResults.backend.authenticated) {
    console.log('  ⚠️  Not authenticated - log in to test full functionality');
  }
  if (testResults.features.locationPermission !== 'granted') {
    console.log('  ⚠️  Location not enabled - grant permission for location features');
  }
  
  return testResults;
}

/**
 * Quick test function for browser console
 */
async function quickPAMTest() {
  console.log('🚀 Quick PAM Test\n');
  
  const checks = {
    'PAM UI Present': !!document.querySelector('[class*="pam"]'),
    'Voice Available': 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    'Location Available': 'geolocation' in navigator,
    'WebSocket Available': 'WebSocket' in window,
    'Authenticated': false
  };
  
  // Check authentication
  if (window.supabase) {
    const { data: { session } } = await window.supabase.auth.getSession();
    checks['Authenticated'] = !!session;
  }
  
  // Display results
  Object.entries(checks).forEach(([test, result]) => {
    console.log(`${result ? '✅' : '❌'} ${test}`);
  });
  
  return checks;
}

// Export for browser usage
if (typeof window !== 'undefined') {
  window.testPAMFunctionality = testPAMFunctionality;
  window.quickPAMTest = quickPAMTest;
  console.log('Functions available in browser:');
  console.log('  • window.testPAMFunctionality() - Full test suite');
  console.log('  • window.quickPAMTest() - Quick status check');
}

// Run if executed directly in Node
if (typeof module !== 'undefined' && require.main === module) {
  console.log('Note: For full functionality, run these tests in the browser console');
  console.log('Some tests require browser APIs and authentication\n');
  
  // Basic connectivity test for Node
  const https = require('https');
  
  https.get('https://pam-backend.onrender.com/api/v1/health', (res) => {
    console.log(`Backend Status: ${res.statusCode === 200 ? '✅ Online' : '❌ Offline'}`);
  }).on('error', (err) => {
    console.log('Backend Status: ❌ Offline');
    console.error('Error:', err.message);
  });
}