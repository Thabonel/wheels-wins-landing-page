#!/usr/bin/env node

/**
 * Test Supabase Connection with Different Keys
 */

import { createClient } from '@supabase/supabase-js';

const url = 'https://kycoklimpzkyrecbjecn.supabase.co';

const keys = [
  {
    name: 'Key 1 (newer - from .env.development)',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Y29rbGltcHpreXJlY2JqZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNTU4MDAsImV4cCI6MjA2MTgzMTgwMH0.nRZhYxImQ0rOlh0xZjHcdVq2Q2NY0v-9W3wciaxV2EA'
  },
  {
    name: 'Key 2 (older)',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Y29rbGltcHpreXJlY2JqZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1Mjg0NjgsImV4cCI6MjA1MDEwNDQ2OH0.YIWXJZj6okNOEqV-J5h8r1S_fHotNAYxbnC0OOYvpX0'
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