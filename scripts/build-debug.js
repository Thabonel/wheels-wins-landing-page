#!/usr/bin/env node

/**
 * Build Debug Script
 * Logs environment variables during build process to diagnose Netlify issues
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Build Environment Debug Information');
console.log('=====================================');
console.log('Build Time:', new Date().toISOString());
console.log('Node Version:', process.version);
console.log('Working Directory:', process.cwd());
console.log('');

// Check for Vite-specific environment variables
console.log('🔧 Vite Environment Variables:');
const viteEnvVars = Object.keys(process.env)
  .filter(key => key.startsWith('VITE_'))
  .sort();

if (viteEnvVars.length === 0) {
  console.log('❌ No VITE_ environment variables found!');
} else {
  viteEnvVars.forEach(key => {
    const value = process.env[key];
    if (key.includes('KEY') || key.includes('SECRET')) {
      console.log(`  ${key}: [REDACTED - ${value ? 'SET' : 'NOT SET'}]`);
    } else if (key.includes('URL')) {
      // Validate URL format
      try {
        new URL(value);
        console.log(`  ${key}: ${value} ✅`);
      } catch (error) {
        console.log(`  ${key}: ${value} ❌ (Invalid URL - ${error.message})`);
        console.log(`    Length: ${value?.length || 0}, Type: ${typeof value}`);
      }
    } else {
      console.log(`  ${key}: ${value || '[NOT SET]'}`);
    }
  });
}

console.log('');

// Check Netlify-specific variables
console.log('📦 Netlify Environment:');
const netlifyVars = [
  'NETLIFY',
  'DEPLOY_ID',
  'CONTEXT',
  'BRANCH',
  'PULL_REQUEST',
  'REVIEW_ID',
  'COMMIT_REF',
  'BUILD_ID'
];

netlifyVars.forEach(key => {
  const value = process.env[key];
  if (value) {
    console.log(`  ${key}: ${value}`);
  }
});

console.log('');

// Check if .env file exists (shouldn't on Netlify)

const envFiles = ['.env', '.env.production', '.env.local'];
console.log('📄 Environment Files:');
envFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`  ${file}: EXISTS (${fs.statSync(filePath).size} bytes)`);
  } else {
    console.log(`  ${file}: NOT FOUND`);
  }
});

console.log('');

// Check for Rollup dependencies
console.log('🔧 Rollup Dependencies Check:');
const rollupDeps = [
  '@rollup/rollup-linux-x64-gnu',
  '@rollup/rollup-darwin-x64',
  '@rollup/rollup-win32-x64-msvc'
];

rollupDeps.forEach(dep => {
  try {
    require.resolve(dep);
    console.log(`  ${dep}: ✅ AVAILABLE`);
  } catch (error) {
    console.log(`  ${dep}: ❌ NOT FOUND`);
  }
});

console.log('');

// Platform info
console.log('🖥️ Platform Information:');
console.log(`  Platform: ${process.platform}`);
console.log(`  Architecture: ${process.arch}`);
console.log(`  Node.js: ${process.version}`);

console.log('');
console.log('=====================================');
console.log('');