#!/usr/bin/env node

/**
 * Verify Supabase Configuration
 * This script helps diagnose Supabase connection issues
 */

console.log('🔍 Supabase Configuration Verification\n');
console.log('=====================================\n');

// Check environment variables
const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('1. Environment Variables Check:');
console.log('--------------------------------');
console.log(`VITE_SUPABASE_URL: ${url ? '✅ Set' : '❌ Missing'}`);
console.log(`VITE_SUPABASE_ANON_KEY: ${anonKey ? '✅ Set' : '❌ Missing'}`);

if (!url || !anonKey) {
  console.log('\n❌ Missing environment variables. Please set them in Netlify dashboard.');
  process.exit(1);
}

console.log('\n2. URL Validation:');
console.log('------------------');
try {
  const urlObj = new URL(url);
  console.log(`✅ Valid URL format: ${urlObj.hostname}`);
  
  if (urlObj.hostname.includes('supabase.co')) {
    console.log('✅ Valid Supabase domain');
    const projectId = urlObj.hostname.split('.')[0];
    console.log(`📦 Project ID: ${projectId}`);
  } else {
    console.log('⚠️  URL does not appear to be a Supabase URL');
  }
} catch (error) {
  console.log(`❌ Invalid URL format: ${error.message}`);
}

console.log('\n3. Anon Key Validation:');
console.log('------------------------');
if (anonKey.startsWith('eyJ')) {
  console.log('✅ Key appears to be a JWT token');
  
  try {
    // Decode JWT header and payload (without verification)
    const [header, payload] = anonKey.split('.').slice(0, 2).map(part => 
      JSON.parse(Buffer.from(part, 'base64').toString())
    );
    
    console.log('\nJWT Header:');
    console.log(JSON.stringify(header, null, 2));
    
    console.log('\nJWT Payload:');
    console.log(JSON.stringify(payload, null, 2));
    
    // Check if ref in JWT matches URL
    if (payload.ref && url.includes(payload.ref)) {
      console.log(`\n✅ JWT ref "${payload.ref}" matches URL`);
    } else if (payload.ref) {
      console.log(`\n❌ JWT ref "${payload.ref}" does NOT match URL`);
      console.log('   This is likely the cause of "Invalid API key" error!');
    }
    
    // Check expiration
    if (payload.exp) {
      const expDate = new Date(payload.exp * 1000);
      const now = new Date();
      if (expDate > now) {
        console.log(`✅ Token expires: ${expDate.toISOString()}`);
      } else {
        console.log(`❌ Token EXPIRED on: ${expDate.toISOString()}`);
      }
    }
  } catch (error) {
    console.log('⚠️  Could not decode JWT:', error.message);
  }
} else {
  console.log('❌ Key does not appear to be a JWT token');
}

console.log('\n4. Configuration Summary:');
console.log('-------------------------');
console.log('To fix "Invalid API key" error:');
console.log('1. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are from the SAME project');
console.log('2. Get both values from: https://app.supabase.com/project/[your-project]/settings/api');
console.log('3. Update in Netlify: Settings → Environment Variables');
console.log('4. Redeploy after updating variables');

console.log('\n=====================================\n');