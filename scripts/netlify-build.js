#!/usr/bin/env node

/**
 * Netlify Build Script
 * Handles Rollup native dependency issues on Netlify build environment
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Starting Netlify build process...');

try {
  // 1. Install native dependencies
  console.log('📦 Installing native dependencies...');
  
  const nativeDeps = [
    '@rollup/rollup-linux-x64-gnu',
    '@esbuild/linux-x64'
  ];
  
  // Install SWC core with platform-specific binary
  const swcDeps = [
    '@swc/core-linux-x64-gnu',
    '@swc/core-linux-x64-musl'
  ];
  
  for (const dep of nativeDeps) {
    try {
      console.log(`Installing ${dep}...`);
      execSync(`npm install ${dep} --no-save --legacy-peer-deps`, { 
        stdio: 'inherit',
        timeout: 60000 
      });
      console.log(`✅ ${dep} installed successfully`);
    } catch (error) {
      console.warn(`⚠️ Failed to install ${dep}, continuing anyway...`);
    }
  }
  
  // Try to install SWC native binaries
  console.log('📦 Installing SWC native binaries...');
  for (const swcDep of swcDeps) {
    try {
      console.log(`Installing ${swcDep}...`);
      execSync(`npm install ${swcDep} --no-save --legacy-peer-deps`, { 
        stdio: 'inherit',
        timeout: 60000 
      });
      console.log(`✅ ${swcDep} installed successfully`);
      break; // If one works, we don't need the others
    } catch (error) {
      console.warn(`⚠️ Failed to install ${swcDep}, trying next...`);
    }
  }
  
  // Alternative: Try to rebuild @swc/core
  try {
    console.log('🔧 Attempting to rebuild @swc/core...');
    execSync('npm rebuild @swc/core', { 
      stdio: 'inherit',
      timeout: 30000 
    });
    console.log('✅ @swc/core rebuilt successfully');
  } catch (error) {
    console.warn('⚠️ Failed to rebuild @swc/core, continuing...');
  }

  // 2. Run debug script
  console.log('🔍 Running debug diagnostics...');
  execSync('node scripts/build-debug.js', { stdio: 'inherit' });

  // 3. Run Vite build
  console.log('🏗️ Running Vite build...');
  execSync('vite build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });

  console.log('✅ Build completed successfully!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}