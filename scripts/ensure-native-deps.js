#!/usr/bin/env node
/**
 * Ensure Native Dependencies Script
 * 
 * Intelligently installs missing platform-specific native dependencies
 * for rollup and esbuild to prevent daily "Cannot find module" errors.
 * 
 * This script:
 * - Detects the current platform and architecture
 * - Checks for required native dependencies
 * - Installs missing dependencies without saving to package.json
 * - Provides clear logging for debugging
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// ANSI color codes for better logging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Detect platform and architecture
function getPlatformInfo() {
  const platform = os.platform();
  const arch = os.arch();
  
  logInfo(`Detected platform: ${platform}, architecture: ${arch}`);
  
  return { platform, arch };
}

// Map platform/architecture to required native dependencies
function getRequiredNativeDeps(platform, arch) {
  const deps = [];
  
  // ESBuild dependencies
  if (platform === 'darwin') {
    if (arch === 'x64') {
      deps.push('@esbuild/darwin-x64');
    } else if (arch === 'arm64') {
      deps.push('@esbuild/darwin-arm64');
    }
  } else if (platform === 'linux') {
    if (arch === 'x64') {
      deps.push('@esbuild/linux-x64');
    } else if (arch === 'arm64') {
      deps.push('@esbuild/linux-arm64');
    }
  } else if (platform === 'win32') {
    if (arch === 'x64') {
      deps.push('@esbuild/win32-x64');
    } else if (arch === 'ia32') {
      deps.push('@esbuild/win32-ia32');
    } else if (arch === 'arm64') {
      deps.push('@esbuild/win32-arm64');
    }
  }
  
  // Rollup dependencies
  if (platform === 'darwin') {
    if (arch === 'x64') {
      deps.push('@rollup/rollup-darwin-x64');
    } else if (arch === 'arm64') {
      deps.push('@rollup/rollup-darwin-arm64');
    }
  } else if (platform === 'linux') {
    if (arch === 'x64') {
      deps.push('@rollup/rollup-linux-x64-gnu');
    } else if (arch === 'arm64') {
      deps.push('@rollup/rollup-linux-arm64-gnu');
    }
  } else if (platform === 'win32') {
    if (arch === 'x64') {
      deps.push('@rollup/rollup-win32-x64-msvc');
    } else if (arch === 'ia32') {
      deps.push('@rollup/rollup-win32-ia32-msvc');
    } else if (arch === 'arm64') {
      deps.push('@rollup/rollup-win32-arm64-msvc');
    }
  }
  
  return deps;
}

// Check if a package is available
function isPackageAvailable(packageName) {
  try {
    require.resolve(packageName);
    return true;
  } catch (error) {
    return false;
  }
}

// Install a package without saving to package.json
function installPackage(packageName) {
  try {
    logInfo(`Installing ${packageName}...`);
    execSync(`npm install ${packageName} --no-save --prefer-offline`, {
      stdio: 'pipe',
      timeout: 30000 // 30 second timeout
    });
    logSuccess(`Installed ${packageName}`);
    return true;
  } catch (error) {
    logError(`Failed to install ${packageName}: ${error.message}`);
    return false;
  }
}

// Main execution
function main() {
  log('🔧 Ensuring native dependencies are available...', colors.cyan);
  
  try {
    const { platform, arch } = getPlatformInfo();
    const requiredDeps = getRequiredNativeDeps(platform, arch);
    
    if (requiredDeps.length === 0) {
      logWarning(`No native dependencies configured for platform: ${platform}, arch: ${arch}`);
      return;
    }
    
    logInfo(`Required native dependencies: ${requiredDeps.join(', ')}`);
    
    const missingDeps = [];
    const availableDeps = [];
    
    // Check which dependencies are missing
    for (const dep of requiredDeps) {
      if (isPackageAvailable(dep)) {
        availableDeps.push(dep);
      } else {
        missingDeps.push(dep);
      }
    }
    
    if (availableDeps.length > 0) {
      logSuccess(`Already available: ${availableDeps.join(', ')}`);
    }
    
    if (missingDeps.length === 0) {
      logSuccess('All native dependencies are available!');
      return;
    }
    
    logWarning(`Missing dependencies: ${missingDeps.join(', ')}`);
    
    // Install missing dependencies
    let installCount = 0;
    for (const dep of missingDeps) {
      if (installPackage(dep)) {
        installCount++;
      }
    }
    
    if (installCount === missingDeps.length) {
      logSuccess(`Successfully installed ${installCount} missing native dependencies`);
    } else {
      logWarning(`Installed ${installCount}/${missingDeps.length} missing dependencies`);
    }
    
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  getPlatformInfo,
  getRequiredNativeDeps,
  isPackageAvailable,
  installPackage
};