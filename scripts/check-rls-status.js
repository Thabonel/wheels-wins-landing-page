#!/usr/bin/env node

/**
 * Quick RLS Status Check for Wheels & Wins
 * This script checks the current status of tables and their RLS policies
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kycoklimpzkyrecbjecn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '<JWT_TOKEN>';

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES_TO_CHECK = [
  'user_settings',
  'user_subscriptions',
  'trip_templates',
  'user_preferences',
  'poi_categories'
];

async function checkTableStatus() {
  console.log('🔍 Checking RLS Status for Wheels & Wins Tables\n');
  console.log('=' .repeat(60));
  
  const results = {
    working: [],
    failing: [],
    missing: []
  };

  for (const table of TABLES_TO_CHECK) {
    process.stdout.write(`\nChecking ${table}... `);
    
    try {
      // Try to select from the table (will fail if table doesn't exist or RLS blocks it)
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log('❌ TABLE MISSING');
          results.missing.push(table);
        } else if (error.code === '42501' || error.message.includes('permission denied')) {
          console.log('⚠️  403 - RLS BLOCKING');
          results.failing.push(table);
        } else {
          console.log(`❓ ERROR: ${error.message}`);
          results.failing.push(table);
        }
      } else {
        console.log('✅ WORKING');
        results.working.push(table);
      }
    } catch (err) {
      console.log(`❌ UNEXPECTED ERROR: ${err.message}`);
      results.failing.push(table);
    }
  }

  // Summary
  console.log(`\n${  '=' .repeat(60)}`);
  console.log('\n📊 SUMMARY:\n');
  
  if (results.working.length > 0) {
    console.log('✅ Working Tables:', results.working.join(', '));
  }
  
  if (results.failing.length > 0) {
    console.log('⚠️  Tables with RLS Issues:', results.failing.join(', '));
  }
  
  if (results.missing.length > 0) {
    console.log('❌ Missing Tables:', results.missing.join(', '));
  }

  // Action items
  console.log(`\n${  '=' .repeat(60)}`);
  console.log('\n🔧 REQUIRED ACTIONS:\n');
  
  if (results.missing.length > 0 || results.failing.length > 0) {
    console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the SQL from: comprehensive_rls_fix.sql');
    console.log('4. This will:');
    if (results.missing.length > 0) {
      console.log(`   - Create missing tables: ${results.missing.join(', ')}`);
    }
    if (results.failing.length > 0) {
      console.log(`   - Fix RLS policies for: ${results.failing.join(', ')}`);
    }
  } else {
    console.log('🎉 All tables are working correctly! No action needed.');
  }
  
  console.log(`\n${  '=' .repeat(60)}`);
}

// Run the check
checkTableStatus().catch(console.error);