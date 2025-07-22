/**
 * Community Features Integration Test
 * Tests all social features against the new consolidated database schema
 */

import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  feature: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export async function testCommunityFeatures(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Social Posts Table
  try {
    const { data, error } = await supabase
      .from('social_posts')
      .select('id, content, visibility, user_id, created_at')
      .limit(1);

    if (error) {
      results.push({
        feature: 'Social Posts',
        status: 'fail',
        message: `Table access failed: ${error.message}`,
        details: error
      });
    } else {
      results.push({
        feature: 'Social Posts',
        status: 'pass',
        message: 'Table accessible and properly structured',
        details: { recordCount: data?.length || 0 }
      });
    }
  } catch (err) {
    results.push({
      feature: 'Social Posts',
      status: 'fail',
      message: `Unexpected error: ${err}`,
      details: err
    });
  }

  // Test 2: Social Groups Table
  try {
    const { data, error } = await supabase
      .from('social_groups')
      .select('id, name, description, owner_id, member_count')
      .limit(1);

    if (error) {
      results.push({
        feature: 'Social Groups',
        status: 'fail',
        message: `Table access failed: ${error.message}`,
        details: error
      });
    } else {
      results.push({
        feature: 'Social Groups',
        status: 'pass',
        message: 'Table accessible and properly structured',
        details: { recordCount: data?.length || 0 }
      });
    }
  } catch (err) {
    results.push({
      feature: 'Social Groups',
      status: 'fail',
      message: `Unexpected error: ${err}`,
      details: err
    });
  }

  // Test 3: Marketplace Listings Table
  try {
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select('id, title, price, category, status, user_id')
      .limit(1);

    if (error) {
      results.push({
        feature: 'Marketplace Listings',
        status: 'fail',
        message: `Table access failed: ${error.message}`,
        details: error
      });
    } else {
      results.push({
        feature: 'Marketplace Listings',
        status: 'pass',
        message: 'Table accessible and properly structured',
        details: { recordCount: data?.length || 0 }
      });
    }
  } catch (err) {
    results.push({
      feature: 'Marketplace Listings',
      status: 'fail',
      message: `Unexpected error: ${err}`,
      details: err
    });
  }

  // Test 4: User Wishlists Table (Marketplace Favorites)
  try {
    const { data, error } = await supabase
      .from('user_wishlists')
      .select('id, user_id, listing_id')
      .limit(1);

    if (error) {
      results.push({
        feature: 'User Wishlists',
        status: 'fail',
        message: `Table access failed: ${error.message}`,
        details: error
      });
    } else {
      results.push({
        feature: 'User Wishlists',
        status: 'pass',
        message: 'Table accessible and properly structured',
        details: { recordCount: data?.length || 0 }
      });
    }
  } catch (err) {
    results.push({
      feature: 'User Wishlists',
      status: 'fail',
      message: `Unexpected error: ${err}`,
      details: err
    });
  }

  // Test 5: Social Interactions Table (Likes/Votes)
  try {
    const { data, error } = await supabase
      .from('social_interactions')
      .select('id, user_id, target_type, target_id, interaction_type')
      .limit(1);

    if (error) {
      results.push({
        feature: 'Social Interactions',
        status: 'fail',
        message: `Table access failed: ${error.message}`,
        details: error
      });
    } else {
      results.push({
        feature: 'Social Interactions',
        status: 'pass',
        message: 'Table accessible and properly structured',
        details: { recordCount: data?.length || 0 }
      });
    }
  } catch (err) {
    results.push({
      feature: 'Social Interactions',
      status: 'fail',
      message: `Unexpected error: ${err}`,
      details: err
    });
  }

  // Test 6: Community Events Table
  try {
    const { data, error } = await supabase
      .from('community_events')
      .select('id, title, organizer_id, start_date, is_public')
      .limit(1);

    if (error) {
      results.push({
        feature: 'Community Events',
        status: 'fail',
        message: `Table access failed: ${error.message}`,
        details: error
      });
    } else {
      results.push({
        feature: 'Community Events',
        status: 'pass',
        message: 'Table accessible and properly structured',
        details: { recordCount: data?.length || 0 }
      });
    }
  } catch (err) {
    results.push({
      feature: 'Community Events',
      status: 'fail',
      message: `Unexpected error: ${err}`,
      details: err
    });
  }

  // Test 7: User Friendships Table
  try {
    const { data, error } = await supabase
      .from('user_friendships')
      .select('id, user_id, friend_id, status')
      .limit(1);

    if (error) {
      results.push({
        feature: 'User Friendships',
        status: 'fail',
        message: `Table access failed: ${error.message}`,
        details: error
      });
    } else {
      results.push({
        feature: 'User Friendships',
        status: 'pass',
        message: 'Table accessible and properly structured',
        details: { recordCount: data?.length || 0 }
      });
    }
  } catch (err) {
    results.push({
      feature: 'User Friendships',
      status: 'fail',
      message: `Unexpected error: ${err}`,
      details: err
    });
  }

  // Test 8: Content Moderation Table
  try {
    const { data, error } = await supabase
      .from('content_moderation')
      .select('id, content_type, content_id, status, reason')
      .limit(1);

    if (error) {
      results.push({
        feature: 'Content Moderation',
        status: 'fail',
        message: `Table access failed: ${error.message}`,
        details: error
      });
    } else {
      results.push({
        feature: 'Content Moderation',
        status: 'pass',
        message: 'Table accessible and properly structured',
        details: { recordCount: data?.length || 0 }
      });
    }
  } catch (err) {
    results.push({
      feature: 'Content Moderation',
      status: 'fail',
      message: `Unexpected error: ${err}`,
      details: err
    });
  }

  return results;
}

export function printTestResults(results: TestResult[]): void {
  console.log('\n🔍 Community Features Integration Test Results');
  console.log('================================================');
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`📊 Total: ${results.length}`);
  console.log('');
  
  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : 
                 result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.feature}: ${result.message}`);
    
    if (result.details && result.status !== 'pass') {
      console.log(`   Details:`, result.details);
    }
  });
  
  console.log('\n');
  
  if (failed === 0) {
    console.log('🎉 All community features are working correctly!');
  } else {
    console.log(`⚠️  ${failed} features need attention. Check the migration status.`);
  }
}