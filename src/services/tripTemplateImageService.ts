import { supabase } from '@/integrations/supabase/client';
import { TripTemplate } from './tripTemplateService';

/**
 * Service for managing trip template images in the database
 * Ensures images are fetched once and stored permanently
 */
export class TripTemplateImageService {
  /**
   * Update a template's image URL in the database
   */
  static async updateTemplateImage(
    templateId: string,
    imageUrl: string,
    thumbnailUrl?: string,
    source?: string,
    attribution?: string
  ): Promise<boolean> {
    try {
      console.log(`📸 Updating image for template ${templateId}`);
      
      const updateData: any = {
        image_url: imageUrl,
        image_source: source || 'manual'
      };
      
      if (thumbnailUrl) {
        updateData.thumbnail_url = thumbnailUrl;
      }
      
      if (attribution) {
        updateData.image_attribution = attribution;
      }
      
      const { error } = await supabase
        .from('trip_templates')
        .update(updateData)
        .eq('id', templateId);
      
      if (error) {
        console.error(`❌ Failed to update image for template ${templateId}:`, error);
        return false;
      }
      
      console.log(`✅ Successfully updated image for template ${templateId}`);
      return true;
    } catch (error) {
      console.error(`💥 Unexpected error updating template image:`, error);
      return false;
    }
  }
  
  /**
   * Fetch an image from Wikipedia and store it in the database
   */
  static async fetchAndStoreWikipediaImage(
    template: TripTemplate,
    searchTerm: string
  ): Promise<boolean> {
    try {
      console.log(`🔍 Fetching Wikipedia image for ${template.name} using term: ${searchTerm}`);
      
      // Fetch from Wikipedia API
      const response = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`
      );
      
      if (!response.ok) {
        console.warn(`Wikipedia page not found for: ${searchTerm}`);
        return false;
      }
      
      const data = await response.json();
      
      // Extract image URLs
      let imageUrl: string | null = null;
      let thumbnailUrl: string | null = null;
      
      if (data.thumbnail?.source) {
        thumbnailUrl = data.thumbnail.source;
        // Get higher resolution version for main image
        imageUrl = data.thumbnail.source.replace(/\/\d+px-/, '/800px-');
      } else if (data.originalimage?.source) {
        imageUrl = data.originalimage.source;
      }
      
      if (!imageUrl) {
        console.warn(`No image found on Wikipedia for: ${searchTerm}`);
        return false;
      }
      
      // Store in database
      return await this.updateTemplateImage(
        template.id,
        imageUrl,
        thumbnailUrl || undefined,
        'wikipedia',
        `Wikipedia - ${searchTerm}`
      );
    } catch (error) {
      console.error(`Error fetching Wikipedia image for ${searchTerm}:`, error);
      return false;
    }
  }
  
  /**
   * Generate and store a Mapbox static map URL for a template
   */
  static generateAndStoreMapboxImage(template: TripTemplate): boolean {
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.warn('No Mapbox token available for map generation');
      return false;
    }
    
    // Determine map center based on template data
    let centerLat = -25.2744; // Default to Australia
    let centerLon = 133.7751;
    let zoom = 4;
    
    // Region-specific coordinates
    const regionCoords: Record<string, [number, number, number]> = {
      'Australia': [-25.2744, 133.7751, 4],
      'Victoria': [-37.4713, 144.7852, 6],
      'Queensland': [-20.9176, 142.7028, 5],
      'New South Wales': [-31.8401, 145.6121, 5],
      'Tasmania': [-41.4545, 145.9707, 6],
      'Western Australia': [-27.6728, 121.6283, 5],
    };
    
    // Use region-specific coordinates if available
    if (template.region && regionCoords[template.region]) {
      [centerLat, centerLon, zoom] = regionCoords[template.region];
    }
    
    // Choose appropriate map style
    let mapStyle = 'outdoors-v12';
    if (template.category?.includes('coastal')) {
      mapStyle = 'satellite-streets-v12';
    } else if (template.category?.includes('outback')) {
      mapStyle = 'satellite-v9';
    }
    
    // Generate static map URL
    const marker = `pin-l-star+3b82f6(${centerLon},${centerLat})`;
    const imageUrl = `https://api.mapbox.com/styles/v1/mapbox/${mapStyle}/static/${marker}/${centerLon},${centerLat},${zoom},0/800x400@2x?access_token=${mapboxToken}`;
    const thumbnailUrl = `https://api.mapbox.com/styles/v1/mapbox/${mapStyle}/static/${marker}/${centerLon},${centerLat},${zoom},0/400x200@2x?access_token=${mapboxToken}`;
    
    // Store in database (async but we don't wait)
    this.updateTemplateImage(
      template.id,
      imageUrl,
      thumbnailUrl,
      'mapbox',
      'Mapbox Static API'
    ).catch(error => {
      console.error(`Failed to store Mapbox image for ${template.id}:`, error);
    });
    
    return true;
  }
  
  /**
   * Ensure all templates have images (one-time operation)
   */
  static async ensureAllTemplatesHaveImages(): Promise<void> {
    try {
      console.log('🚀 Starting one-time image population for all templates...');
      
      // Fetch all templates without images
      const { data: templates, error } = await supabase
        .from('trip_templates')
        .select('*')
        .is('image_url', null)
        .eq('is_public', true);
      
      if (error) {
        console.error('Failed to fetch templates:', error);
        return;
      }
      
      if (!templates || templates.length === 0) {
        console.log('✅ All templates already have images!');
        return;
      }
      
      console.log(`📊 Found ${templates.length} templates without images`);
      
      // Wikipedia search terms for known templates
      const wikipediaSearchTerms: Record<string, string> = {
        'aus-great-ocean-road': 'Twelve Apostles Victoria',
        'aus-big-lap': 'Uluru',
        'aus-east-coast': 'Great Barrier Reef',
        'aus-red-centre': 'Uluru Kata Tjuta National Park',
        'aus-savannah-way': 'Kakadu National Park',
        'aus-tasmania-circuit': 'Cradle Mountain',
        'aus-southwest-wa': 'Margaret River Western Australia',
        'aus-queensland-outback': 'Queensland Outback',
        'aus-murray-river': 'Murray River Australia',
        'aus-gibb-river-road': 'Gibb River Road',
        'aus-high-country': 'Victorian Alps',
        'aus-nullarbor': 'Nullarbor Plain',
        'aus-cape-york': 'Cape York Peninsula',
        'aus-flinders-ranges': 'Flinders Ranges',
        'aus-sunshine-coast': 'Sunshine Coast Queensland',
      };
      
      // Process templates in batches
      const batchSize = 3;
      let successCount = 0;
      let mapboxCount = 0;
      
      for (let i = 0; i < templates.length; i += batchSize) {
        const batch = templates.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (dbTemplate) => {
            const template = {
              id: dbTemplate.id,
              name: dbTemplate.name,
              region: dbTemplate.template_data?.region || 'Australia',
              category: dbTemplate.category
            } as TripTemplate;
            
            // Try Wikipedia first if we have a search term
            const searchTerm = wikipediaSearchTerms[template.id];
            let success = false;
            
            if (searchTerm) {
              success = await this.fetchAndStoreWikipediaImage(template, searchTerm);
              if (success) successCount++;
            }
            
            // Fallback to Mapbox if Wikipedia failed
            if (!success) {
              success = this.generateAndStoreMapboxImage(template);
              if (success) mapboxCount++;
            }
          })
        );
        
        // Small delay between batches to be respectful to APIs
        if (i + batchSize < templates.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log(`✅ Image population complete!`);
      console.log(`   - Wikipedia images: ${successCount}`);
      console.log(`   - Mapbox fallbacks: ${mapboxCount}`);
      console.log(`   - Total processed: ${templates.length}`);
      
    } catch (error) {
      console.error('💥 Failed to populate template images:', error);
    }
  }
}

export const tripTemplateImageService = TripTemplateImageService;