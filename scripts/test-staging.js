#!/usr/bin/env node

/**
 * Staging Environment Test Script
 * Validates staging deployment and environment configuration
 */

const https = require('https');
const http = require('http');

// Test configuration
const STAGING_TESTS = {
  // Replace with your actual staging URL once deployed
  stagingUrl: process.env.STAGING_URL || 'https://staging--your-site-id.netlify.app',
  expectedEnv: 'staging',
  timeout: 10000,
};

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(STAGING_TESTS.timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testStagingDeployment() {
  log(`${colors.bold}🧪 Testing Staging Environment${colors.reset}`);
  log('='.repeat(50));
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Basic connectivity
  totalTests++;
  log(`\n${colors.blue}Test 1: Basic Connectivity${colors.reset}`);
  try {
    const response = await makeRequest(STAGING_TESTS.stagingUrl);
    
    if (response.status === 200) {
      log(`✅ Site is accessible (${response.status})`, colors.green);
      passedTests++;
    } else {
      log(`❌ Site returned status ${response.status}`, colors.red);
    }
  } catch (error) {
    log(`❌ Failed to connect: ${error.message}`, colors.red);
  }
  
  // Test 2: Check for staging indicators
  totalTests++;
  log(`\n${colors.blue}Test 2: Staging Environment Indicators${colors.reset}`);
  try {
    const response = await makeRequest(STAGING_TESTS.stagingUrl);
    
    if (response.headers['x-environment'] === 'staging') {
      log('✅ Staging environment header found', colors.green);
      passedTests++;
    } else {
      log('⚠️  Staging environment header not found', colors.yellow);
    }
    
    if (response.body.includes('STAGING ENVIRONMENT')) {
      log('✅ Staging banner detected in HTML', colors.green);
    } else {
      log('⚠️  Staging banner not found in HTML', colors.yellow);
    }
  } catch (error) {
    log(`❌ Failed to check staging indicators: ${error.message}`, colors.red);
  }
  
  // Test 3: Check security headers
  totalTests++;
  log(`\n${colors.blue}Test 3: Security Headers${colors.reset}`);
  try {
    const response = await makeRequest(STAGING_TESTS.stagingUrl);
    const headers = response.headers;
    
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
    ];
    
    let securityScore = 0;
    securityHeaders.forEach(header => {
      if (headers[header]) {
        log(`✅ ${header}: ${headers[header]}`, colors.green);
        securityScore++;
      } else {
        log(`⚠️  Missing header: ${header}`, colors.yellow);
      }
    });
    
    if (securityScore >= 2) {
      passedTests++;
    }
  } catch (error) {
    log(`❌ Failed to check security headers: ${error.message}`, colors.red);
  }
  
  // Test 4: Performance check
  totalTests++;
  log(`\n${colors.blue}Test 4: Basic Performance${colors.reset}`);
  try {
    const startTime = Date.now();
    const response = await makeRequest(STAGING_TESTS.stagingUrl);
    const loadTime = Date.now() - startTime;
    
    if (loadTime < 3000) {
      log(`✅ Fast load time: ${loadTime}ms`, colors.green);
      passedTests++;
    } else if (loadTime < 5000) {
      log(`⚠️  Acceptable load time: ${loadTime}ms`, colors.yellow);
      passedTests++;
    } else {
      log(`❌ Slow load time: ${loadTime}ms`, colors.red);
    }
  } catch (error) {
    log(`❌ Failed to test performance: ${error.message}`, colors.red);
  }
  
  // Summary
  log(`\n${  '='.repeat(50)}`);
  log(`${colors.bold}📊 Test Results${colors.reset}`);
  log(`Passed: ${passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    log(`🎉 All tests passed! Staging environment is ready.`, colors.green);
    process.exit(0);
  } else if (passedTests >= totalTests * 0.75) {
    log(`⚠️  Most tests passed. Review warnings above.`, colors.yellow);
    process.exit(0);
  } else {
    log(`❌ Multiple test failures. Please check your staging deployment.`, colors.red);
    process.exit(1);
  }
}

// Environment validation
function validateEnvironment() {
  log(`${colors.blue}Environment Configuration:${colors.reset}`);
  log(`Target URL: ${STAGING_TESTS.stagingUrl}`);
  log(`Timeout: ${STAGING_TESTS.timeout}ms`);
  
  if (STAGING_TESTS.stagingUrl.includes('your-site-id')) {
    log(`⚠️  Please update STAGING_URL with your actual Netlify URL`, colors.yellow);
    log(`   You can set it with: STAGING_URL=https://your-actual-url.netlify.app npm run test:staging`, colors.yellow);
  }
  
  log('');
}

// Main execution
async function main() {
  try {
    validateEnvironment();
    await testStagingDeployment();
  } catch (error) {
    log(`❌ Test suite failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}