#!/usr/bin/env node
/**
 * Test script to verify the trip templates fix works correctly
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration (same as frontend)
const supabaseUrl = 'https://kycoklimpzkyrecbjecn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Y29rbGltcHpreXJlY2JqZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQ3MDg2MDAsImV4cCI6MjAzMDI4NDYwMH0.PKuJpUgG3UmOQWtZfQC-MNBqOFpJPF7TZOcIBpWKO_8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Transform database record to TripTemplate interface (same as service)
 */
function transformDatabaseToTemplate(dbRecord) {
  const templateData = dbRecord.template_data || {};
  
  return {
    id: dbRecord.id,
    name: dbRecord.name,
    description: dbRecord.description || templateData.description || '',
    estimatedDays: templateData.duration_days || templateData.estimatedDays || 7,
    estimatedMiles: templateData.distance_miles || templateData.estimatedMiles || 500,
    difficulty: templateData.difficulty || 'intermediate',
    highlights: templateData.highlights || [],
    suggestedBudget: templateData.estimated_budget || templateData.suggestedBudget || 1000,
    route: templateData.route || null,
    region: templateData.region || 'Rest of the World',
    category: dbRecord.category || 'general',
    tags: dbRecord.tags || [],
    usageCount: dbRecord.usage_count || 0,
    isPublic: dbRecord.is_public || false,
    createdBy: templateData.createdBy
  };
}

/**
 * Test the fixed query for Australian templates
 */
async function testAustralianTemplateQuery() {
  console.log('🧪 Testing Trip Templates Fix');
  console.log('=' * 50);
  
  try {
    // Simulate the fixed query logic for Australia
    const { data, error } = await supabase
      .from('trip_templates')
      .select('*')
      .eq('is_public', true)
      .or(`template_data->>'region'.ilike.*Australia*,template_data->>'region'.ilike.*Victoria*,template_data->>'region'.ilike.*NSW*,template_data->>'region'.ilike.*Queensland*,template_data->>'region'.ilike.*Tasmania*,template_data->>'region'.ilike.*Territory*,tags.cs.{australia}`)
      .order('usage_count', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Query Error:', error);
      return;
    }

    console.log(`✅ Query Success: Found ${data.length} templates`);
    
    if (data.length === 0) {
      console.log('⚠️  No templates found - checking raw data...');
      
      // Check what's actually in the database
      const { data: allData } = await supabase
        .from('trip_templates')
        .select('name, template_data, tags')
        .eq('is_public', true);
        
      console.log('📋 All available templates:');
      allData?.forEach((template, i) => {
        console.log(`  ${i + 1}. ${template.name}`);
        console.log(`     Region: ${template.template_data?.region || 'N/A'}`);
        console.log(`     Tags: ${template.tags?.join(', ') || 'N/A'}`);
      });
      return;
    }

    // Transform and display results
    const transformedTemplates = data.map(transformDatabaseToTemplate);
    
    console.log('\\n🗺️ Australian Trip Templates Found:');
    console.log('=' * 50);
    
    const categories = {};
    transformedTemplates.forEach(template => {
      const category = template.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(template);
    });

    Object.entries(categories).forEach(([category, templates]) => {
      console.log(`\\n📂 ${category.replace('_', ' ').toUpperCase()}:`);
      templates.forEach(template => {
        console.log(`  • ${template.name}`);
        console.log(`    Duration: ${template.estimatedDays} days | Distance: ${template.estimatedMiles} miles | Budget: $${template.suggestedBudget}`);
        console.log(`    Highlights: ${template.highlights.slice(0, 3).join(', ')}`);
      });
    });

    console.log(`\\n✅ SUCCESS: ${transformedTemplates.length} Australian templates loaded correctly!`);
    console.log('🎯 Expected: 10 templates | Actual: ' + transformedTemplates.length);
    
    if (transformedTemplates.length >= 10) {
      console.log('🎉 TEMPLATE FIX SUCCESSFUL - All templates should now display!');
    } else {
      console.log('⚠️  Some templates may be missing - check database content');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAustralianTemplateQuery();