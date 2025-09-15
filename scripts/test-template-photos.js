#!/usr/bin/env node
/**
 * Test that template photos are accessible
 */

const testUrls = [
  'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/great-ocean-road-twelve-apostles.jpg',
  'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/big-lap-uluru.jpg',
  'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/tasmania-cradle-mountain.jpg',
  'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/queensland-great-barrier-reef.jpg',
  'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/default-australian-road.jpg'
];

console.log('🔍 Testing template photo URLs...\n');

async function testUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      console.log(`✅ ${url.split('/').pop()} - Accessible`);
      return true;
    } else {
      console.log(`❌ ${url.split('/').pop()} - Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${url.split('/').pop()} - Error: ${error.message}`);
    return false;
  }
}

async function main() {
  let successCount = 0;

  for (const url of testUrls) {
    const success = await testUrl(url);
    if (success) successCount++;
  }

  console.log(`\n📊 Results: ${successCount}/${testUrls.length} URLs accessible`);

  if (successCount === 0) {
    console.log('\n⚠️  None of the Storage URLs are accessible.');
    console.log('This means the images need to be uploaded to the Storage bucket.');
    console.log('\nNext steps:');
    console.log('1. Get the Supabase anon key from your project settings');
    console.log('2. Run: export SUPABASE_ANON_KEY="your-key-here"');
    console.log('3. Run: python scripts/upload-template-photos-to-storage.py');
  } else if (successCount < testUrls.length) {
    console.log('\n⚠️  Some URLs are not accessible. Partial upload may be needed.');
  } else {
    console.log('\n✅ All template photos are accessible!');
  }
}

main();