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

  // 3. Determine build mode based on environment
  // Check for staging indicators in Netlify environment
  const isStaging = 
    process.env.CONTEXT === 'branch-deploy' ||
    process.env.BRANCH === 'staging' ||
    process.env.DEPLOY_URL?.includes('staging') ||
    process.env.URL?.includes('staging') ||
    process.env.VITE_ENVIRONMENT === 'staging';
  
  const buildMode = isStaging ? 'staging' : 'production';
  console.log(`🏗️ Running Vite build in ${buildMode} mode...`);
  console.log(`📍 Build context: ${process.env.CONTEXT || 'unknown'}`);
  console.log(`📍 Branch: ${process.env.BRANCH || 'unknown'}`);
  console.log(`📍 Deploy URL: ${process.env.DEPLOY_URL || 'unknown'}`);
  
  execSync(`vite build --mode ${buildMode}`, { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: buildMode === 'staging' ? 'development' : 'production'
    }
  });

  console.log('✅ Build completed successfully!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}