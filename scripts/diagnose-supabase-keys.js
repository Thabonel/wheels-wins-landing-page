#!/usr/bin/env node

/**
 * Diagnose Supabase Key Issues
 * This script helps identify mismatched Supabase URL and anon key
 */

import jwt from 'jsonwebtoken';

// Keys from different sources
const configs = [
  {
    name: 'Production (from .env.development)',
    url: 'https://kycoklimpzkyrecbjecn.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Y29rbGltcHpreXJlY2JqZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNTU4MDAsImV4cCI6MjA2MTgzMTgwMH0.nRZhYxImQ0rOlh0xZjHcdVq2Q2NY0v-9W3wciaxV2EA'
  },
  {
    name: 'Alternative key (found in code)',
    url: 'https://kycoklimpzkyrecbjecn.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Y29rbGltcHpreXJlY2JqZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1Mjg0NjgsImV4cCI6MjA1MDEwNDQ2OH0.YIWXJZj6okNOEqV-J5h8r1S_fHotNAYxbnC0OOYvpX0'
  }
];

console.log('🔍 Supabase Key Diagnostic\n');
console.log('=' .repeat(60));

configs.forEach(config => {
  console.log(`\n📋 ${config.name}`);
  console.log('-'.repeat(40));
  
  try {
    // Decode JWT without verification (we don't have the secret)
    const decoded = jwt.decode(config.key);
    
    console.log('URL Project ID:', config.url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'Invalid URL');
    console.log('Key Project ID:', decoded.ref);
    console.log('Match:', decoded.ref === config.url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ? '✅ YES' : '❌ NO');
    console.log('Role:', decoded.role);
    console.log('Issued:', new Date(decoded.iat * 1000).toISOString());
    console.log('Expires:', new Date(decoded.exp * 1000).toISOString());
    
    // Check if key is valid (not expired)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      console.log('Status: ❌ EXPIRED');
    } else if (decoded.iat > now) {
      console.log('Status: ⚠️ FUTURE ISSUE DATE (suspicious)');
    } else {
      console.log('Status: ✅ VALID');
    }
    
  } catch (error) {
    console.log('❌ Failed to decode key:', error.message);
  }
});

console.log(`\n${  '=' .repeat(60)}`);
console.log('\n📝 RECOMMENDATIONS:\n');
console.log('1. Use the key that matches your Supabase project ID');
console.log('2. If both keys are for the same project, use the newer one');
console.log('3. Update your environment variables in:');
console.log('   - Netlify dashboard (for production)');
console.log('   - Netlify staging site (for staging)');
console.log('   - Local .env.local file (for development)');
console.log('\n4. The correct pair should be:');
console.log('   VITE_SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co');
console.log('   VITE_SUPABASE_ANON_KEY=[use the valid key from above]');
console.log(`\n${  '=' .repeat(60)}`);