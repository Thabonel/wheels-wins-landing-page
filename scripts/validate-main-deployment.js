#!/usr/bin/env node
/**
 * PUSH TO MAIN VALIDATION SCRIPT
 * Automatically validates code follows PUSH_TO_MAIN.md requirements
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  if (!fs.existsSync(filePath)) {
    log('red', `❌ ${description}: File not found - ${filePath}`);
    return false;
  }
  return true;
}

function validateApiTs() {
  log('blue', '\n🔍 Validating src/services/api.ts...');
  
  const apiPath = 'src/services/api.ts';
  if (!checkFile(apiPath, 'API service')) return false;
  
  const content = fs.readFileSync(apiPath, 'utf8');
  
  // Check for domain detection (not allowed in main)
  if (content.includes('getApiBaseUrl') || content.includes('currentDomain') || content.includes('window.location.hostname')) {
    log('red', '❌ API_BASE_URL uses domain detection (not allowed in main branch)');
    log('yellow', '💡 Fix: Use explicit production URL per PUSH_TO_MAIN.md');
    return false;
  }
  
  // Check for correct production URL
  if (content.includes('https://pam-backend.onrender.com') && 
      content.includes("'https://pam-backend.onrender.com';  // Always use production backend for main")) {
    log('green', '✅ API_BASE_URL correctly set to production backend');
  } else {
    log('red', '❌ API_BASE_URL not set to production backend');
    log('yellow', '💡 Should be: https://pam-backend.onrender.com');
    return false;
  }
  
  // Check for staging URLs
  if (content.includes('wheels-wins-backend-staging') || content.includes('wheels-wins-staging.netlify.app')) {
    log('red', '❌ Found staging URLs in api.ts');
    return false;
  }
  
  log('green', '✅ api.ts validation passed');
  return true;
}

function validatePamConnectionService() {
  log('blue', '\n🔍 Validating src/services/pamConnectionService.ts...');
  
  const servicePath = 'src/services/pamConnectionService.ts';
  if (!checkFile(servicePath, 'PAM Connection Service')) return false;
  
  const content = fs.readFileSync(servicePath, 'utf8');
  
  // Check that production backend is prioritized first
  const backendArrayMatch = content.match(/private backends = \[([\s\S]*?)\]/);
  if (backendArrayMatch) {
    const backendArray = backendArrayMatch[1];
    
    // Check if production backend appears first
    const lines = backendArray.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const firstBackendLine = lines.find(line => line.includes('https://'));
    
    if (firstBackendLine && firstBackendLine.includes('pam-backend.onrender.com')) {
      log('green', '✅ Production backend prioritized first');
    } else {
      log('red', '❌ Production backend not prioritized first');
      log('yellow', '💡 Fix: Move pam-backend.onrender.com to first position');
      return false;
    }
  }
  
  log('green', '✅ pamConnectionService.ts validation passed');
  return true;
}

function searchForStagingUrls() {
  log('blue', '\n🔍 Searching for staging URLs in src/services/...');
  
  const servicesDir = 'src/services';
  if (!fs.existsSync(servicesDir)) {
    log('red', `❌ Services directory not found: ${servicesDir}`);
    return false;
  }
  
  const stagingUrls = [
    'wheels-wins-backend-staging.onrender.com',
    'wheels-wins-staging.netlify.app'
  ];
  
  let found = false;
  const files = fs.readdirSync(servicesDir).filter(file => file.endsWith('.ts'));
  
  for (const file of files) {
    const filePath = path.join(servicesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    for (const url of stagingUrls) {
      if (content.includes(url)) {
        log('red', `❌ Found staging URL "${url}" in ${file}`);
        found = true;
      }
    }
  }
  
  if (!found) {
    log('green', '✅ No staging URLs found in services directory');
  }
  
  return !found;
}

function validatePackageJson() {
  log('blue', '\n🔍 Validating package.json...');
  
  if (!checkFile('package.json', 'Package.json')) return false;
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check for problematic dependencies
  const problematicDeps = [
    '@rollup/rollup-darwin-x64',
    '@rollup/rollup-linux-x64-gnu',
    '@rollup/rollup-win32-x64-msvc'
  ];
  
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  for (const dep of problematicDeps) {
    if (allDeps[dep]) {
      log('yellow', `⚠️  OS-specific dependency found: ${dep}`);
      log('yellow', '💡 This may cause build issues in cloud environments');
    }
  }
  
  log('green', '✅ package.json validation passed');
  return true;
}

function main() {
  log('blue', '🚀 PUSH TO MAIN DEPLOYMENT VALIDATION');
  log('blue', '=====================================');
  
  const validations = [
    validateApiTs,
    validatePamConnectionService,
    searchForStagingUrls,
    validatePackageJson
  ];
  
  let allPassed = true;
  
  for (const validation of validations) {
    if (!validation()) {
      allPassed = false;
    }
  }
  
  log('blue', '\n=====================================');
  
  if (allPassed) {
    log('green', '✅ ALL VALIDATIONS PASSED');
    log('green', '🚀 Safe to push to main branch');
    log('blue', '\n📋 Don\'t forget to:');
    log('blue', '   1. Run: npm run build');
    log('blue', '   2. Test production URLs');
    log('blue', '   3. Verify no console errors');
    process.exit(0);
  } else {
    log('red', '❌ VALIDATION FAILED');
    log('red', '🚨 DO NOT push to main branch');
    log('yellow', '\n📚 Please read PUSH_TO_MAIN.md and fix the issues above');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { validateApiTs, validatePamConnectionService, searchForStagingUrls };