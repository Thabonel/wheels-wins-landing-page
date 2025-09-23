import { TripTemplate } from './tripTemplateService';
import { supabase } from '@/integrations/supabase/client';
import { wikipediaImageService } from './wikipediaImageService';

/**
 * Google Image Search Service
 * Uses Google Image Search to find REAL photos of actual locations
 * This ensures accurate representation of trip destinations
 * 
 * Updated to use ImageStorageService for permanent storage in Supabase
 */
export class GoogleImageService {
  // Storage configuration
  private static readonly BUCKET_NAME = 'public-assets';
  private static readonly FOLDER_NAME = 'trip-templates';
  
  // Wikipedia images cache
  private static wikipediaImagesCache: Record<string, string> | null = null;
  private static wikipediaImagesFetchPromise: Promise<Record<string, string>> | null = null;
  
  // Verified image URLs - Using reliable sources instead of broken Unsplash
  private static readonly VERIFIED_IMAGES: Record<string, string> = {
    // Great Ocean Road - Using the URL you provided
    'aus-great-ocean-road': 'https://www.bunyiptours.com/wp-content/uploads/2023/09/Sunset-1-scaled.jpg',

    // Australian Tourism & Government sources
    'aus-big-lap': 'https://www.australia.com/content/australia/en/places/red-centre/jcr:content/hero/desktop.adapt.1920.high.jpg',
    'aus-east-coast': 'https://www.australia.com/content/australia/en/places/great-barrier-reef/jcr:content/hero/desktop.adapt.1920.high.jpg',
    'aus-red-centre': 'https://www.australia.com/content/australia/en/places/red-centre/uluru-kata-tjuta-national-park/jcr:content/hero/desktop.adapt.1920.high.jpg',
    'aus-savannah-way': 'https://www.australia.com/content/australia/en/places/nt/kakadu-national-park/jcr:content/hero/desktop.adapt.1920.high.jpg',
    'aus-tasmania-circuit': 'https://www.australia.com/content/australia/en/places/tas/cradle-mountain-lake-st-clair-national-park/jcr:content/hero/desktop.adapt.1920.high.jpg',
    'aus-southwest-wa': 'https://www.australia.com/content/australia/en/places/wa/margaret-river/jcr:content/hero/desktop.adapt.1920.high.jpg',
    'aus-queensland-outback': 'https://www.australia.com/content/australia/en/places/qld/winton/jcr:content/hero/desktop.adapt.1920.high.jpg',
    'aus-murray-river': 'https://www.australia.com/content/australia/en/places/murray-river/jcr:content/hero/desktop.adapt.1920.high.jpg',
    'aus-gibb-river-road': 'https://www.australia.com/content/australia/en/places/wa/broome/jcr:content/hero/desktop.adapt.1920.high.jpg',
    'aus-high-country': 'https://www.australia.com/content/australia/en/places/vic/mount-buller/jcr:content/hero/desktop.adapt.1920.high.jpg',
    'aus-nullarbor': 'https://www.australia.com/content/australia/en/places/sa/nullarbor/jcr:content/hero/desktop.adapt.1920.high.jpg',
    'aus-cape-york': 'https://www.australia.com/content/australia/en/places/qld/cape-york/jcr:content/hero/desktop.adapt.1920.high.jpg',
    'aus-flinders-ranges': 'https://www.australia.com/content/australia/en/places/sa/flinders-ranges/jcr:content/hero/desktop.adapt.1920.high.jpg',
    'aus-sunshine-coast': 'https://www.australia.com/content/australia/en/places/qld/sunshine-coast/jcr:content/hero/desktop.adapt.1920.high.jpg',

    // International sources
    'nz-south-island': 'https://www.newzealand.com/assets/Tourism-NZ/Fiordland/6a54c5ce0e/img-1536159690-8350-11203-p-2FB5F6E4-C1E1-2E56-A7F2-88C490CE9A49-2.jpg',
    'nz-north-island': 'https://www.newzealand.com/assets/Tourism-NZ/Bay-of-Islands/0b3b1bc12c/img-1536157435-4993-7912-p-E5C3E6F1-CE0B-AADE-85A3-C237CB0D67F8-2.jpg',
    'nz-coastal-pacific': 'https://www.newzealand.com/assets/Tourism-NZ/Marlborough/af95af8d5c/img-1536157566-5173-8142-p-2B4DBDCD-B476-D77B-D62F-81C6C5A3CE8A-2.jpg',
    'nz-great-walks': 'https://www.newzealand.com/assets/Tourism-NZ/Fiordland/1c2ca54a3c/img-1536159690-8350-11197-p-74A3E6F1-CE0B-AADE-85A3-C237CB0D67F8-2.jpg',
    'nz-wine-trail': 'https://www.newzealand.com/assets/Tourism-NZ/Central-Otago/a9f0a54c3f/img-1536156902-4493-6652-p-4A3E6F1-CE0B-AADE-85A3-C237CB0D67F8-2.jpg',

    'can-rockies': 'https://www.pc.gc.ca/content/dam/pc/images/pn-np/ab/banff/activ/Banff-Lake-Louise-winter.jpg',
    'can-maritimes': 'https://www.pc.gc.ca/content/dam/pc/images/pn-np/ns/kejimkujik/activ/Kejimkujik-fall-colours.jpg',
    'can-trans-canada': 'https://www.pc.gc.ca/content/dam/pc/images/pn-np/ab/banff/activ/Banff-moraine-lake.jpg',
    'can-alaska-highway': 'https://www.pc.gc.ca/content/dam/pc/images/pn-np/yt/kluane/activ/Kluane-mountains.jpg',
    'can-niagara-wine': 'https://www.pc.gc.ca/content/dam/pc/images/lhn-nhs/on/niagarafalls/activ/Niagara-Falls.jpg',

    'usa-route-66': 'https://www.nps.gov/grca/planyourvisit/images/GCNPSouthRimTrailOfTimeBC_2.jpg',
    'usa-pacific-coast': 'https://www.nps.gov/cali/learn/nature/images/BigSurCoastline.jpg',
    'usa-southwest-parks': 'https://www.nps.gov/zion/learn/nature/images/ZionNarrows_1.jpg',
    'usa-blue-ridge': 'https://www.nps.gov/blri/learn/nature/images/BlueRidgeMountains.jpg',
    'usa-florida-keys': 'https://www.nps.gov/drto/learn/nature/images/DryTortugasAerial.jpg',
    'usa-new-england': 'https://www.nps.gov/acad/learn/nature/images/AcadiaFallFoliage.jpg',

    'uk-scotland-highlands': 'https://www.visitscotland.com/cms-images/attractions/eilean-donan-castle',
    'uk-cotswolds': 'https://www.visitbritain.com/sites/default/files/consumer/destinations/cotswolds-countryside.jpg',
    'uk-lake-district': 'https://www.visitbritain.com/sites/default/files/consumer/destinations/lake-district-windermere.jpg',
    'uk-cornwall-coast': 'https://www.visitbritain.com/sites/default/files/consumer/destinations/cornwall-st-ives.jpg',
    'uk-wales-circuit': 'https://www.visitwales.com/sites/visit-wales/files/hero-images/snowdon-mountain.jpg',

    // Removed placeholder URLs - let TripTemplateCard generate Mapbox maps instead
  };
  
  /**
   * Get Wikipedia images for templates
   */
  private static async getWikipediaImages(): Promise<Record<string, string>> {
    // If we're already fetching, wait for that promise
    if (this.wikipediaImagesFetchPromise) {
      return this.wikipediaImagesFetchPromise;
    }
    
    // If we have cached images, return them
    if (this.wikipediaImagesCache) {
      return this.wikipediaImagesCache;
    }
    
    // Start fetching images
    this.wikipediaImagesFetchPromise = wikipediaImageService.getTemplateImages()
      .then(images => {
        this.wikipediaImagesCache = images;
        console.log('✅ Wikipedia images cached:', Object.keys(images).length);
        return images;
      })
      .catch(error => {
        console.error('❌ Failed to fetch Wikipedia images:', error);
        // Return fallback images on error
        return wikipediaImageService.FALLBACK_IMAGES;
      });
    
    return this.wikipediaImagesFetchPromise;
  }
  
  /**
   * Download an image from a URL and return as blob
   */
  private static async downloadImage(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    return response.blob();
  }

  /**
   * Upload image blob to Supabase Storage
   */
  private static async uploadToStorage(
    templateId: string, 
    imageBlob: Blob
  ): Promise<string> {
    const fileName = `${templateId}.jpg`;
    const filePath = `${this.FOLDER_NAME}/${fileName}`;
    
    console.log(`🔄 Uploading ${fileName} to Supabase Storage...`);
    
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(filePath, imageBlob, {
        cacheControl: '3600',
        upsert: true, // Replace if exists
        contentType: 'image/jpeg'
      });
    
    if (error) {
      console.error(`❌ Failed to upload ${fileName}:`, error);
      throw error;
    }
    
    console.log(`✅ Uploaded ${fileName} to Supabase Storage`);
    
    // Return the public URL
    const { data: urlData } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  }

  /**
   * Check if image already exists in Supabase Storage
   */
  private static async imageExists(templateId: string): Promise<boolean> {
    const fileName = `${templateId}.jpg`;
    const filePath = `${this.FOLDER_NAME}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .list(this.FOLDER_NAME, {
        search: fileName
      });
    
    if (error) {
      console.error(`Error checking if ${fileName} exists:`, error);
      return false;
    }
    
    return data.some(file => file.name === fileName);
  }

  /**
   * Get Supabase Storage URL for a template image
   */
  private static getStorageUrl(templateId: string): string {
    const fileName = `${templateId}.jpg`;
    const filePath = `${this.FOLDER_NAME}/${fileName}`;
    
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  /**
   * Ensure image is stored in Supabase Storage
   * Downloads and uploads if not already present
   */
  private static async ensureImageStored(templateId: string): Promise<string> {
    // Check if we have a verified image URL for this template
    const sourceUrl = this.VERIFIED_IMAGES[templateId];
    if (!sourceUrl) {
      throw new Error(`No verified image URL for template: ${templateId}`);
    }

    // Check if image already exists in storage
    const exists = await this.imageExists(templateId);
    if (exists) {
      console.log(`✅ Image already exists for ${templateId}`);
      return this.getStorageUrl(templateId);
    }

    // Download and upload the image
    console.log(`📥 Downloading and storing image for ${templateId}...`);
    
    try {
      const imageBlob = await this.downloadImage(sourceUrl);
      const storageUrl = await this.uploadToStorage(templateId, imageBlob);
      
      console.log(`🎉 Successfully stored image for ${templateId}`);
      return storageUrl;
      
    } catch (error) {
      console.error(`❌ Failed to store image for ${templateId}:`, error);
      // Fallback to original URL if storage fails
      return sourceUrl;
    }
  }

  /**
   * Get image URL for a template (storage URL if available, fallback otherwise)
   */
  private static async getTemplateImageUrl(templateId: string): Promise<{
    imageUrl: string;
    isStored: boolean;
  }> {
    try {
      // Try to get from storage first
      const exists = await this.imageExists(templateId);
      if (exists) {
        return {
          imageUrl: this.getStorageUrl(templateId),
          isStored: true
        };
      }
      
      // Fallback to verified URL
      const sourceUrl = this.VERIFIED_IMAGES[templateId];
      if (sourceUrl) {
        return {
          imageUrl: sourceUrl,
          isStored: false
        };
      }
      
      throw new Error(`No image available for template: ${templateId}`);
      
    } catch (error) {
      console.error(`Error getting image URL for ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Generate a Google Image Search URL for a query
   */
  private static generateGoogleImageSearchUrl(query: string): string {
    const params = new URLSearchParams({
      q: query,
      tbm: 'isch', // Image search
      hl: 'en',
      tbs: 'isz:l', // Large images
      safe: 'active'
    });
    
    return `https://www.google.com/search?${params.toString()}`;
  }
  
  /**
   * Get the appropriate search query for a template
   */
  private static getSearchQuery(template: TripTemplate): string {
    // Build intelligent search query based on template data
    const queries: string[] = [];
    
    // For Australian templates, always include "Australia"
    if (template.region === 'Australia') {
      // Use the most iconic highlight first
      if (template.highlights && template.highlights.length > 0) {
        queries.push(`${template.highlights[0]} Australia tourism`);
      } else {
        queries.push(`${template.name} Australia`);
      }
    } else {
      // For other regions, include the region name
      if (template.highlights && template.highlights.length > 0) {
        queries.push(`${template.highlights[0]} ${template.region}`);
      } else {
        queries.push(`${template.name} ${template.region}`);
      }
    }
    
    return queries[0];
  }
  
  /**
   * Get image for a trip template
   * Uses internal storage methods for permanent storage, falls back to search URL
   */
  static async getTemplateImage(template: TripTemplate): Promise<{
    imageUrl: string | null;
    searchUrl: string;
    isVerified: boolean;
    isStored: boolean;
  }> {
    console.log(`🔍 Google Image Service: Getting image for: ${template.name} (${template.id})`);
    
    try {
      // Try to get from internal storage methods first
      const { imageUrl, isStored } = await this.getTemplateImageUrl(template.id);
      
      console.log(`✅ ${isStored ? 'Using stored' : 'Using verified'} image for ${template.id}: ${imageUrl.substring(0, 50)}...`);
      
      return {
        imageUrl,
        searchUrl: this.generateGoogleImageSearchUrl(this.getSearchQuery(template)),
        isVerified: true,
        isStored
      };
      
    } catch (error) {
      console.error(`❌ Failed to get image for ${template.id}:`, error);
      
      // Fallback to placeholder and search URL
      const searchQuery = this.getSearchQuery(template);
      const searchUrl = this.generateGoogleImageSearchUrl(searchQuery);
      
      console.log(`⚠️ Using placeholder for ${template.id}, search: ${searchQuery}`);
      
      return {
        imageUrl: null, // Let TripTemplateCard handle the Mapbox fallback
        searchUrl,
        isVerified: false,
        isStored: false
      };
    }
  }

  /**
   * Synchronous version for backward compatibility
   * NOTE: This will not use stored images, only verified URLs
   */
  static getTemplateImageSync(template: TripTemplate): {
    imageUrl: string | null;
    searchUrl: string;
    isVerified: boolean;
  } {
    console.log(`🔍 Google Image Service (sync): Getting image for: ${template.name} (${template.id})`);

    // Priority 1: Check if we have a hardcoded verified image
    if (this.VERIFIED_IMAGES[template.id] && this.VERIFIED_IMAGES[template.id] !== '') {
      const verifiedUrl = this.VERIFIED_IMAGES[template.id];
      console.log(`✅ Using verified image for ${template.id}: ${verifiedUrl.substring(0, 50)}...`);
      return {
        imageUrl: verifiedUrl,
        searchUrl: this.generateGoogleImageSearchUrl(this.getSearchQuery(template)),
        isVerified: true
      };
    }

    // Priority 2: Check Wikipedia images cache
    if (this.wikipediaImagesCache && this.wikipediaImagesCache[template.id]) {
      const wikipediaUrl = this.wikipediaImagesCache[template.id];
      console.log(`✅ Using Wikipedia image for ${template.id}: ${wikipediaUrl.substring(0, 50)}...`);
      return {
        imageUrl: wikipediaUrl,
        searchUrl: this.generateGoogleImageSearchUrl(this.getSearchQuery(template)),
        isVerified: true
      };
    }

    // Priority 3: Start fetching Wikipedia images in background for next time
    if (!this.wikipediaImagesCache && !this.wikipediaImagesFetchPromise) {
      console.log(`🔄 Starting Wikipedia image fetch for future use...`);
      this.getWikipediaImages().catch(console.error);
    }

    // Priority 4: Return null to let TripTemplateCard use Mapbox as fallback
    console.log(`⚠️ No verified or Wikipedia image found for ${template.id} - TripTemplateCard will use Mapbox fallback`);

    // Generate search URL for manual selection
    const searchQuery = this.getSearchQuery(template);
    const searchUrl = this.generateGoogleImageSearchUrl(searchQuery);

    return {
      imageUrl: null, // Let TripTemplateCard handle the Mapbox fallback
      searchUrl,
      isVerified: false
    };
  }
  
  /**
   * Get a category-appropriate placeholder image
   * NOTE: Returning null to avoid placeholder images - let TripTemplateCard use Mapbox fallback
   */
  private static getPlaceholderImage(template: TripTemplate): string | null {
    // Don't return placeholder images - let the TripTemplateCard generate intelligent Mapbox maps
    console.log(`⚠️ No verified image for ${template.id} - TripTemplateCard will generate Mapbox map`);
    return null;
  }
  
  /**
   * Add a verified image for a template
   * This should be called after manually selecting a correct image from Google
   */
  static addVerifiedImage(templateId: string, imageUrl: string): void {
    this.VERIFIED_IMAGES[templateId] = imageUrl;
    console.log(`✅ Added verified image for ${templateId}`);
  }
  
  /**
   * Get all templates that need image verification
   */
  static getUnverifiedTemplates(templates: TripTemplate[]): Array<{
    template: TripTemplate;
    searchUrl: string;
  }> {
    return templates
      .filter(template => !this.VERIFIED_IMAGES[template.id])
      .map(template => ({
        template,
        searchUrl: this.generateGoogleImageSearchUrl(this.getSearchQuery(template))
      }));
  }

  /**
   * Batch ensure images are stored for multiple templates
   */
  private static async ensureImagesStoredInternal(templates: TripTemplate[]): Promise<Map<string, string>> {
    const imageUrls = new Map<string, string>();
    
    console.log(`🔄 Ensuring ${templates.length} template images are stored...`);
    
    // Process images in parallel batches of 3 to avoid overwhelming the service
    const batchSize = 3;
    for (let i = 0; i < templates.length; i += batchSize) {
      const batch = templates.slice(i, i + batchSize);
      
      const promises = batch.map(async (template) => {
        try {
          const url = await this.ensureImageStored(template.id);
          imageUrls.set(template.id, url);
        } catch (error) {
          console.error(`Failed to process image for ${template.id}:`, error);
          // Don't store URL if failed - will use fallback
        }
      });
      
      await Promise.all(promises);
    }
    
    console.log(`✅ Processed ${imageUrls.size}/${templates.length} template images`);
    return imageUrls;
  }

  /**
   * Initialize image storage for all templates
   * Call this when the app starts to ensure all images are stored
   */
  static async initializeImageStorage(): Promise<void> {
    console.log('🚀 Initializing template image storage...');
    
    try {
      // First, fetch Wikipedia images
      await this.getWikipediaImages();
      console.log('✅ Wikipedia images loaded');
      
      // Then proceed with storage initialization if needed
      const templateIds = Object.keys(this.VERIFIED_IMAGES).filter(id => this.VERIFIED_IMAGES[id] !== '');
      const fakeTemplates = templateIds.map(id => ({ id } as TripTemplate));
      
      if (fakeTemplates.length > 0) {
        await this.ensureImagesStoredInternal(fakeTemplates);
      }
      
      console.log('✅ Template image storage initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize image storage:', error);
      // Don't throw - app should still work with fallback URLs
    }
  }

  /**
   * Ensure images are stored for a batch of templates
   */
  static async ensureImagesStored(templates: TripTemplate[]): Promise<void> {
    console.log(`🔄 Ensuring images are stored for ${templates.length} templates...`);
    
    try {
      await this.ensureImagesStoredInternal(templates);
      console.log('✅ Template images storage check complete');
    } catch (error) {
      console.error('❌ Failed to ensure images stored:', error);
      // Don't throw - fallback URLs will be used
    }
  }
}

export const googleImageService = GoogleImageService;