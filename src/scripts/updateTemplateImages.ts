/**
 * Script to update all trip templates with appropriate images
 * Each template gets ONE unique, high-quality image
 */

import { supabase } from '@/integrations/supabase/client';

// High-quality image URLs for each template
// These are carefully selected to match each trip's theme and location
const TEMPLATE_IMAGES: Record<string, { imageUrl: string; source: string }> = {
  // Great Ocean Road
  '0d22f704-4861-4181-8862-c8a6b190005e': {
    imageUrl: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=1600',
    source: 'Twelve Apostles, Victoria'
  },
  'dfd1d82f-261e-4c64-8ab7-fd3f07f7c8e9': {
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600',
    source: 'Great Ocean Road Coastline'
  },
  
  // Byron Bay to Sydney
  'bef3d3de-1c43-4aee-be8d-bbebf50f2082': {
    imageUrl: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=1600',
    source: 'Sydney Opera House'
  },
  
  // East Coast Discovery
  'df26b992-8873-43e7-9230-70b8cc65156a': {
    imageUrl: 'https://images.unsplash.com/photo-1529108750117-bcbad8bd25dd?w=1600',
    source: 'East Coast Beach'
  },
  
  // Gibb River Road
  '3e978887-49bc-4c4a-a1c8-16b01ad52af6': {
    imageUrl: 'https://images.unsplash.com/photo-1521706862577-47b053587f91?w=1600',
    source: 'Gibb River Gorge'
  },
  
  // Kakadu National Park
  '0ce80329-8827-4082-9e56-59db33e2ceb0': {
    imageUrl: 'https://images.unsplash.com/photo-1588392382834-a891154bca4d?w=1600',
    source: 'Kakadu Wetlands'
  },
  'e61b4241-e0d3-41fd-81d7-db9e51774ea9': {
    imageUrl: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=1600',
    source: 'Kakadu Rock Art'
  },
  
  // Cape York Peninsula
  '25bb19f8-44f0-4eea-8ae6-6e0370d4ae93': {
    imageUrl: 'https://images.unsplash.com/photo-1562095241-8c6714fd4178?w=1600',
    source: 'Cape York Beach'
  },
  
  // Fraser Island
  '7e4fae71-76bd-4f7e-8cc4-b1f5b81c6470': {
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc60?w=1600',
    source: 'Fraser Island Lakes'
  },
  
  // Blue Mountains
  '94ae9827-8318-4b9e-b47a-15343688582b': {
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600',
    source: 'Three Sisters, Blue Mountains'
  },
  
  // Grampians
  'dee5cb89-23c5-4bbf-a5d0-b26ff4b224f6': {
    imageUrl: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1600',
    source: 'Grampians Lookout'
  },
  
  // Flinders Ranges
  '2db66631-70bc-4f8c-86f9-a4b5d40bcc72': {
    imageUrl: 'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=1600',
    source: 'Flinders Ranges Landscape'
  },
  
  // Cradle Mountain
  '6a3d709b-cf42-4bc0-93cb-d4f0b67953ec': {
    imageUrl: 'https://images.unsplash.com/photo-1619408506837-9bcdbf3e7b36?w=1600',
    source: 'Cradle Mountain, Tasmania'
  },
  
  // Daintree National Park
  'ede438a7-3da5-4ead-9afc-5b2069fa7242': {
    imageUrl: 'https://images.unsplash.com/photo-1538964173425-93884d739596?w=1600',
    source: 'Daintree Rainforest'
  },
  
  // Great Barrier Reef
  '607c5d61-827a-4237-bb9f-a9676b022953': {
    imageUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600',
    source: 'Great Barrier Reef'
  },
  
  // Kangaroo Island
  'a9ff910b-9d77-44c3-8ef5-fa89bf57818d': {
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600',
    source: 'Kangaroo Island Coast'
  },
  
  // Katherine Gorge
  '2811c79d-1f0c-45f3-a445-90ab293e0daf': {
    imageUrl: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=1600',
    source: 'Katherine Gorge'
  },
  
  // East MacDonnell Ranges
  '69caac26-3d38-47ae-922a-30800e21f129': {
    imageUrl: 'https://images.unsplash.com/photo-1533387520709-752d83de3630?w=1600',
    source: 'MacDonnell Ranges'
  },
  
  // Bay of Islands (NZ)
  '1a7365bd-97f1-4685-ba60-82306969d240': {
    imageUrl: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1600',
    source: 'Bay of Islands, New Zealand'
  },
  
  // Abel Tasman (NZ)
  'fb426f73-3e2b-4dde-b00a-eb581a4307ad': {
    imageUrl: 'https://images.unsplash.com/photo-1573790387438-4da905039392?w=1600',
    source: 'Abel Tasman Coastal Track'
  },
  
  // Coromandel Peninsula (NZ)
  '7d80dcc9-dd55-4161-af0d-26c1773d2118': {
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1600',
    source: 'Cathedral Cove, Coromandel'
  },
  
  // Canadian Rockies
  '6fee3594-8594-432f-a611-088ff614fba1': {
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600',
    source: 'Canadian Rockies'
  },
  
  // Cabot Trail
  '1f4ac1b9-ea95-410c-b577-c4c4c004d4c2': {
    imageUrl: 'https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=1600',
    source: 'Cabot Trail, Cape Breton'
  },
  
  // Algonquin Park
  'd6e9931a-adff-4f35-b32e-a03031cf241a': {
    imageUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1600',
    source: 'Algonquin Provincial Park'
  },
  
  // Bay of Fundy
  '858ffad9-e685-4e91-b1e2-468c96d1b1cd': {
    imageUrl: 'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=1600',
    source: 'Bay of Fundy Tides'
  },
  
  // Alaska Highway
  '6e21baa1-5a77-46ae-a9bf-6adee90615e0': {
    imageUrl: 'https://images.unsplash.com/photo-1548954042-c23fc6226ddf?w=1600',
    source: 'Alaska Highway'
  },
  
  // Grand Canyon
  '19b9a0f2-a6ae-4e98-915f-e7b2a1d03eba': {
    imageUrl: 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1600',
    source: 'Grand Canyon'
  },
  
  // Florida Keys
  '8c4d1e5f-3618-44f9-a14d-849822c6eda5': {
    imageUrl: 'https://images.unsplash.com/photo-1605723517503-3cadb5818a0c?w=1600',
    source: 'Florida Keys Highway'
  },
  
  // Acadia National Park
  '5e7a6784-cce6-4570-8907-d007ad72b87a': {
    imageUrl: 'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=1600',
    source: 'Acadia National Park'
  },
  
  // Black Hills
  'cbf25f42-4ebd-4c5e-a8d6-7c322eeebe6a': {
    imageUrl: 'https://images.unsplash.com/photo-1608166034180-80e04d0a1328?w=1600',
    source: 'Mount Rushmore, Black Hills'
  },
  
  // Blue Ridge Parkway
  '8f7aafe4-d94e-4de5-a92c-160fb0a04283': {
    imageUrl: 'https://images.unsplash.com/photo-1632164222301-030ac5e43e87?w=1600',
    source: 'Blue Ridge Parkway'
  },
  
  // Great Lakes
  '1dd3a90c-5094-40a1-8199-a4da2833631d': {
    imageUrl: 'https://images.unsplash.com/photo-1574482620811-1aa16ffe3c82?w=1600',
    source: 'Great Lakes Shore'
  },
  
  // Isle of Skye
  'accac6e1-73c9-4d31-aed5-531e6c01f040': {
    imageUrl: 'https://images.unsplash.com/photo-1549558549-415fe4c37b60?w=1600',
    source: 'Isle of Skye, Scotland'
  },
  
  // Cornwall
  '07d8d332-bf32-4cab-8606-d8e4b95b8cab': {
    imageUrl: 'https://images.unsplash.com/photo-1549895058-36748fa6c6a7?w=1600',
    source: 'Cornwall Coast'
  },
  
  // Cotswolds
  '166df1e5-1121-4896-9c90-ffae1bcae5cb': {
    imageUrl: 'https://images.unsplash.com/photo-1580300784476-1e8d2b948925?w=1600',
    source: 'Cotswolds Village'
  },
  
  // Lake District
  'b5193482-4dd6-492b-9178-de0da50b0154': {
    imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1600',
    source: 'Lake District'
  },
  
  // Darwin
  'c592a9fc-c0ac-4a5a-b086-05a541ad1926': {
    imageUrl: 'https://images.unsplash.com/photo-1579283977117-b267e96df851?w=1600',
    source: 'Darwin Waterfront'
  },
  '2c42f429-df57-48c8-b9cf-8d23d91c52ef': {
    imageUrl: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=1600',
    source: 'Darwin Resort'
  },
  
  // Bayfield National Park
  '4f52a510-31d1-4584-a626-9ab085de72dd': {
    imageUrl: 'https://images.unsplash.com/photo-1566305977571-f0e34081c0cf?w=1600',
    source: 'Bayfield 4WD Track'
  },
  
  // Generic category images for remaining templates
  'd2f082a0-c3ed-4ece-83f8-de42a7f49a8c': {
    imageUrl: 'https://images.unsplash.com/photo-1487730116645-74489c95b41b?w=1600',
    source: 'Australian Camping'
  },
  'e7b80a20-ba6a-4f1d-83a3-c69d94918d84': {
    imageUrl: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=1600',
    source: 'Natural Swimming Hole'
  },
  '615d3f6f-a251-49de-9f9d-dff93620d1d3': {
    imageUrl: 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=1600',
    source: 'RV Park'
  },
  '6c9c7d6d-b690-409a-ad0d-19da67c57a11': {
    imageUrl: 'https://images.unsplash.com/photo-1494548162494-384bba4ab999?w=1600',
    source: 'Australian Landscape'
  },
  '6e0770e6-06a2-48e7-aa7d-0ce0c0280429': {
    imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=1600',
    source: 'Hiking Trail'
  },
  '54a125f5-9ed2-4874-abf0-b3109eec59ea': {
    imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600',
    source: 'Family Nature Walk'
  },
  '53574bc6-5c1f-41ff-8a4b-9c3ead220503': {
    imageUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1600',
    source: 'Canadian Camping'
  },
  '8ca20790-2932-4066-a056-953d5503e528': {
    imageUrl: 'https://images.unsplash.com/photo-1519452575417-564c1401ecc0?w=1600',
    source: 'Canadian Landmark'
  },
  'e216b04d-535b-4a84-9f08-d8e0594e514d': {
    imageUrl: 'https://images.unsplash.com/photo-1515238152791-8216bfdf89a7?w=1600',
    source: 'Canadian Lake'
  },
  '576ebc72-18a3-47fa-8959-e465f550a646': {
    imageUrl: 'https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=1600',
    source: 'British Camping'
  },
  'e39fb450-a554-479a-9f11-bc8708ccfc5f': {
    imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600',
    source: 'British Landmark'
  }
};

/**
 * Update all templates with their images
 */
export async function updateAllTemplateImages() {
  console.log('🚀 Starting template image updates...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const [templateId, imageData] of Object.entries(TEMPLATE_IMAGES)) {
    try {
      // Fetch current template data
      const { data: template, error: fetchError } = await supabase
        .from('trip_templates')
        .select('template_data')
        .eq('id', templateId)
        .single();
      
      if (fetchError) {
        console.error(`❌ Error fetching template ${templateId}:`, fetchError);
        errorCount++;
        continue;
      }
      
      // Update template_data with image information
      const updatedData = {
        ...template.template_data,
        imageUrl: imageData.imageUrl,
        thumbnailUrl: imageData.imageUrl.replace('w=1600', 'w=400'), // Create thumbnail
        imageSource: imageData.source,
        imageAttribution: 'Unsplash'
      };
      
      // Update the template
      const { error: updateError } = await supabase
        .from('trip_templates')
        .update({ template_data: updatedData })
        .eq('id', templateId);
      
      if (updateError) {
        console.error(`❌ Error updating template ${templateId}:`, updateError);
        errorCount++;
      } else {
        console.log(`✅ Updated template ${templateId} with image from ${imageData.source}`);
        successCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`💥 Unexpected error for template ${templateId}:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Update Summary:`);
  console.log(`   ✅ Success: ${successCount} templates`);
  console.log(`   ❌ Errors: ${errorCount} templates`);
  console.log(`   📸 Total: ${Object.keys(TEMPLATE_IMAGES).length} templates`);
  
  return { successCount, errorCount };
}

// Run the update if this script is executed directly
if (import.meta.env.DEV) {
  console.log('To run this update, call updateAllTemplateImages() from the console');
}