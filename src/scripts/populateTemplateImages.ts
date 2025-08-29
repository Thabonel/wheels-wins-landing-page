/**
 * One-time script to populate all trip template images
 * Run this script once to fetch and store images for all templates
 * 
 * Usage:
 * 1. Open browser console on the Wheels & Wins app
 * 2. Run: import('./src/scripts/populateTemplateImages').then(m => m.populateImages())
 * 
 * Or add a temporary button in an admin component to trigger this
 */

import { ensureAllTemplatesHaveImages } from '@/services/tripTemplateService';

export async function populateImages() {
  console.log('🚀 Starting one-time image population...');
  console.log('This will fetch images from Wikipedia and generate Mapbox fallbacks.');
  console.log('Please wait, this may take a few minutes...');
  
  try {
    await ensureAllTemplatesHaveImages();
    console.log('✅ Image population complete! Refresh the page to see the changes.');
  } catch (error) {
    console.error('❌ Image population failed:', error);
  }
}

// For development: uncomment to run automatically (once)
// if (import.meta.env.DEV) {
//   populateImages();
// }