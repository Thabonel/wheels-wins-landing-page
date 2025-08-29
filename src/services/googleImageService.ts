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
    
    // We'll fetch these from Wikipedia API
    'aus-big-lap': '',
    'aus-east-coast': '',
    'aus-red-centre': '',
    'aus-savannah-way': '',
    'aus-tasmania-circuit': '',
    'aus-southwest-wa': '',
    'aus-queensland-outback': '',
    'aus-murray-river': '',
    'aus-gibb-river-road': '',
    'aus-high-country': '',
    'aus-nullarbor': '',
    'aus-cape-york': '',
    'aus-flinders-ranges': '',
    'aus-sunshine-coast': '',
    'nz-south-island': '',
    'can-rockies': '',
    'uk-scotland': '',
    'usa-southwest': '',
    'general-coastal': ''
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
        imageUrl: this.getPlaceholderImage(template),
        searchUrl: searchUrl,
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
    
    // Check if we have a hardcoded verified image
    if (this.VERIFIED_IMAGES[template.id] && this.VERIFIED_IMAGES[template.id] !== '') {
      const verifiedUrl = this.VERIFIED_IMAGES[template.id];
      console.log(`✅ Using verified image for ${template.id}: ${verifiedUrl.substring(0, 50)}...`);
      return {
        imageUrl: verifiedUrl,
        searchUrl: this.generateGoogleImageSearchUrl(this.getSearchQuery(template)),
        isVerified: true
      };
    }
    
    // Check Wikipedia images cache
    if (this.wikipediaImagesCache && this.wikipediaImagesCache[template.id]) {
      const wikipediaUrl = this.wikipediaImagesCache[template.id];
      console.log(`✅ Using Wikipedia image for ${template.id}: ${wikipediaUrl.substring(0, 50)}...`);
      return {
        imageUrl: wikipediaUrl,
        searchUrl: this.generateGoogleImageSearchUrl(this.getSearchQuery(template)),
        isVerified: true
      };
    }
    
    // Don't return a fallback here - let TripTemplateCard use Mapbox
    console.log(`⚠️ No Wikipedia image found for ${template.id} - will use Mapbox fallback`);
    
    // Start fetching Wikipedia images in background for next time
    this.getWikipediaImages().catch(console.error);
    
    // Generate search URL for manual selection
    const searchQuery = this.getSearchQuery(template);
    const searchUrl = this.generateGoogleImageSearchUrl(searchQuery);
    
    console.log(`⚠️ No verified image for ${template.id}, use Google Image Search: ${searchQuery}`);
    
    // Return a placeholder with search URL
    return {
      imageUrl: this.getPlaceholderImage(template),
      searchUrl: searchUrl,
      isVerified: false
    };
  }
  
  /**
   * Get a category-appropriate placeholder image
   */
  private static getPlaceholderImage(template: TripTemplate): string {
    // Category-specific placeholders (generic but appropriate)
    const placeholders: Record<string, string> = {
      'coastal': 'https://via.placeholder.com/800x600/0088cc/ffffff?text=Coastal+Adventure',
      'outback': 'https://via.placeholder.com/800x600/cc6600/ffffff?text=Outback+Journey',
      'adventure': 'https://via.placeholder.com/800x600/00aa44/ffffff?text=4WD+Adventure',
      'mountain': 'https://via.placeholder.com/800x600/6644cc/ffffff?text=Mountain+Explorer',
      'wine_culinary': 'https://via.placeholder.com/800x600/aa0044/ffffff?text=Wine+Region',
      'island': 'https://via.placeholder.com/800x600/00aacc/ffffff?text=Island+Paradise',
      'epic_journeys': 'https://via.placeholder.com/800x600/ff6600/ffffff?text=Epic+Journey',
      'historical': 'https://via.placeholder.com/800x600/8B4513/ffffff?text=Historical+Tour',
      'river_lakes': 'https://via.placeholder.com/800x600/4488cc/ffffff?text=River+Journey',
      'scenic': 'https://via.placeholder.com/800x600/22aa66/ffffff?text=Scenic+Route',
      'cultural': 'https://via.placeholder.com/800x600/aa4488/ffffff?text=Cultural+Discovery',
      'national-parks': 'https://via.placeholder.com/800x600/228B22/ffffff?text=National+Parks',
      'general': 'https://via.placeholder.com/800x600/888888/ffffff?text=Adventure+Awaits'
    };
    
    return placeholders[template.category] || placeholders['general'];
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