/**
 * Manual script to update template images one by one
 * Run this in the browser console
 */

import { supabase } from '@/integrations/supabase/client';

// Curated list of high-quality images for Australian trips
const AUSTRALIAN_TRIP_IMAGES = {
  // Iconic Australian Routes
  'Great Ocean Road': 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=1600&q=80',
  'Byron Bay': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1600&q=80',
  'East Coast': 'https://images.unsplash.com/photo-1529108750117-bcbad8bd25dd?w=1600&q=80',
  'Gibb River': 'https://images.unsplash.com/photo-1521706862577-47b053587f91?w=1600&q=80',
  'Kakadu': 'https://images.unsplash.com/photo-1588392382834-a891154bca4d?w=1600&q=80',
  'Cape York': 'https://images.unsplash.com/photo-1562095241-8c6714fd4178?w=1600&q=80',
  'Fraser Island': 'https://images.unsplash.com/photo-1578662996442-48f60103fc60?w=1600&q=80',
  'Blue Mountains': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80',
  'Grampians': 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1600&q=80',
  'Flinders': 'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=1600&q=80',
  'Cradle Mountain': 'https://images.unsplash.com/photo-1619408506837-9bcdbf3e7b36?w=1600&q=80',
  'Daintree': 'https://images.unsplash.com/photo-1538964173425-93884d739596?w=1600&q=80',
  'Great Barrier': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600&q=80',
  'Kangaroo Island': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&q=80',
  'Katherine': 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=1600&q=80',
  'MacDonnell': 'https://images.unsplash.com/photo-1533387520709-752d83de3630?w=1600&q=80',
  'Darwin': 'https://images.unsplash.com/photo-1579283977117-b267e96df851?w=1600&q=80',
  'Bayfield': 'https://images.unsplash.com/photo-1566305977571-f0e34081c0cf?w=1600&q=80',
  
  // Generic categories
  'camping': 'https://images.unsplash.com/photo-1487730116645-74489c95b41b?w=1600&q=80',
  'swimming': 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=1600&q=80',
  'rv_parks': 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=1600&q=80',
  'attractions': 'https://images.unsplash.com/photo-1494548162494-384bba4ab999?w=1600&q=80',
  'hiking': 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=1600&q=80',
  'family': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&q=80',
  'coastal': 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1600&q=80',
  'outback': 'https://images.unsplash.com/photo-1504197832061-98356e3dcdcf?w=1600&q=80',
  'nature': 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1600&q=80',
  '4wd': 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1600&q=80'
};

/**
 * Find the best matching image for a template name
 */
function findBestImage(templateName: string): string {
  const nameLower = templateName.toLowerCase();
  
  // Check for specific location matches
  for (const [key, url] of Object.entries(AUSTRALIAN_TRIP_IMAGES)) {
    if (nameLower.includes(key.toLowerCase())) {
      return url;
    }
  }
  
  // Check for category matches
  if (nameLower.includes('coastal') || nameLower.includes('beach') || nameLower.includes('ocean')) {
    return AUSTRALIAN_TRIP_IMAGES.coastal;
  }
  if (nameLower.includes('outback') || nameLower.includes('desert')) {
    return AUSTRALIAN_TRIP_IMAGES.outback;
  }
  if (nameLower.includes('4wd') || nameLower.includes('4x4')) {
    return AUSTRALIAN_TRIP_IMAGES['4wd'];
  }
  if (nameLower.includes('camping') || nameLower.includes('camp')) {
    return AUSTRALIAN_TRIP_IMAGES.camping;
  }
  if (nameLower.includes('swimming') || nameLower.includes('swim')) {
    return AUSTRALIAN_TRIP_IMAGES.swimming;
  }
  if (nameLower.includes('hiking') || nameLower.includes('walk') || nameLower.includes('trail')) {
    return AUSTRALIAN_TRIP_IMAGES.hiking;
  }
  if (nameLower.includes('family')) {
    return AUSTRALIAN_TRIP_IMAGES.family;
  }
  if (nameLower.includes('park') || nameLower.includes('nature')) {
    return AUSTRALIAN_TRIP_IMAGES.nature;
  }
  
  // Default to a scenic Australian landscape
  return AUSTRALIAN_TRIP_IMAGES.attractions;
}

/**
 * Update all templates with smart image matching
 */
export async function updateTemplatesWithSmartImages() {
  console.log('🚀 Starting smart image update for all templates...');
  
  try {
    // Fetch all templates
    const { data: templates, error: fetchError } = await supabase
      .from('trip_templates')
      .select('id, name, template_data')
      .eq('is_public', true);
    
    if (fetchError) {
      console.error('Failed to fetch templates:', fetchError);
      return;
    }
    
    console.log(`Found ${templates.length} templates to update`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process templates in batches
    for (const template of templates) {
      try {
        // Find best matching image
        const imageUrl = findBestImage(template.name);
        
        // Update template_data with image
        const updatedData = {
          ...template.template_data,
          imageUrl,
          thumbnailUrl: imageUrl.replace('w=1600', 'w=400'),
          imageSource: 'Unsplash',
          imageAttribution: 'High-quality travel photography',
          imageUpdated: new Date().toISOString()
        };
        
        // Update in database
        const { error: updateError } = await supabase
          .from('trip_templates')
          .update({ template_data: updatedData })
          .eq('id', template.id);
        
        if (updateError) {
          console.error(`❌ Failed to update ${template.name}:`, updateError);
          errorCount++;
        } else {
          console.log(`✅ Updated: ${template.name}`);
          successCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`Error processing ${template.name}:`, error);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Update Complete!`);
    console.log(`   ✅ Success: ${successCount} templates`);
    console.log(`   ❌ Errors: ${errorCount} templates`);
    console.log(`   📸 Total processed: ${templates.length} templates`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

/**
 * Update a single template by ID
 */
export async function updateSingleTemplate(templateId: string, imageUrl: string) {
  try {
    // Fetch current template
    const { data: template, error: fetchError } = await supabase
      .from('trip_templates')
      .select('name, template_data')
      .eq('id', templateId)
      .single();
    
    if (fetchError) {
      console.error('Failed to fetch template:', fetchError);
      return false;
    }
    
    // Update with new image
    const updatedData = {
      ...template.template_data,
      imageUrl,
      thumbnailUrl: imageUrl.replace('w=1600', 'w=400'),
      imageSource: 'Manual Update',
      imageUpdated: new Date().toISOString()
    };
    
    const { error: updateError } = await supabase
      .from('trip_templates')
      .update({ template_data: updatedData })
      .eq('id', templateId);
    
    if (updateError) {
      console.error('Failed to update:', updateError);
      return false;
    }
    
    console.log(`✅ Successfully updated ${template.name} with new image`);
    return true;
    
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

// Export for console use
if (typeof window !== 'undefined') {
  (window as any).updateTemplatesWithSmartImages = updateTemplatesWithSmartImages;
  (window as any).updateSingleTemplate = updateSingleTemplate;
  console.log('💡 Functions available in console:');
  console.log('   - updateTemplatesWithSmartImages() : Update all templates');
  console.log('   - updateSingleTemplate(id, imageUrl) : Update specific template');
}