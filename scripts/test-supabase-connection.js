#!/usr/bin/env node

/**
 * Test Supabase Connection with Different Keys
 */

import { createClient } from '@supabase/supabase-js';

const url = 'https://kycoklimpzkyrecbjecn.supabase.co';

const keys = [
  {
    name: 'Key 1 (newer - from .env.development)',
    key: '<JWT_TOKEN>'
  },
  {
    name: 'Key 2 (older)',
    key: '<JWT_TOKEN>'
  }
];

console.log('🔬 Testing Supabase Connection\n');
console.log('=' .repeat(60));

for (const config of keys) {
  console.log(`\n🔑 Testing: ${config.name}`);
  console.log('-'.repeat(40));
  
  const supabase = createClient(url, config.key);
  
  try {
    // Test 1: Try to read from a known working table
    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1);
    
    if (settingsError) {
      if (settingsError.message.includes('Invalid API key')) {
        console.log('❌ Result: Invalid API key');
      } else {
        console.log(`✅ Connection works (got expected RLS error: ${settingsError.code})`);
      }
    } else {
      console.log('✅ Connection successful! Can read user_settings');
    }
    
    // Test 2: Try auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      if (authError.message.includes('Invalid API key')) {
        console.log('❌ Auth test: Invalid API key');
      } else {
        console.log('✅ Auth works (not logged in, but key is valid)');
      }
    } else {
      console.log('✅ Auth successful!');
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

console.log('\n' + '=' .repeat(60));
console.log('\n✨ CONCLUSION:\n');
console.log('Use the key that shows "✅ Connection works" or "✅ Connection successful"');
console.log('Update this in your Netlify environment variables for both sites.');
console.log('\n' + '=' .repeat(60));