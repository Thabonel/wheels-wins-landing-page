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