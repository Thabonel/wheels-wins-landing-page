import { TripTemplate } from './tripTemplateService';
import { imageStorageService } from './imageStorageService';

/**
 * Google Image Search Service
 * Uses Google Image Search to find REAL photos of actual locations
 * This ensures accurate representation of trip destinations
 * 
 * Updated to use ImageStorageService for permanent storage in Supabase
 */
export class GoogleImageService {
  // Legacy verified images - now managed by ImageStorageService
  private static readonly VERIFIED_IMAGES: Record<string, string> = {
    // Great Ocean Road - Twelve Apostles
    'aus-great-ocean-road': 'https://images.unsplash.com/photo-1529258283598-8d6fe60b27f4?w=800&q=80',
    
    // Big Lap - Uluru
    'aus-big-lap': 'https://images.unsplash.com/photo-1529108190281-9a4f620bc2d8?w=800&q=80',
    
    // East Coast - Great Barrier Reef
    'aus-east-coast': 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800&q=80',
    
    // Red Centre - Uluru at sunset
    'aus-red-centre': 'https://images.unsplash.com/photo-1542401886-65d6c61db217?w=800&q=80',
    
    // Savannah Way - Kakadu landscape  
    'aus-savannah-way': 'https://images.unsplash.com/photo-1521706862577-47b053587f91?w=800&q=80',
    
    // Tasmania Circuit - Cradle Mountain
    'aus-tasmania-circuit': 'https://images.unsplash.com/photo-1619956947777-9c2d38007238?w=800&q=80',
    
    // Southwest WA - Margaret River vineyards
    'aus-southwest-wa': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=80',
    
    // Queensland Outback - Outback landscape
    'aus-queensland-outback': 'https://images.unsplash.com/photo-1523712900580-a5cc2e0112ed?w=800&q=80',
    
    // Murray River - River landscape
    'aus-murray-river': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
    
    // Gibb River Road - Kimberley gorge
    'aus-gibb-river-road': 'https://images.unsplash.com/photo-1601579621145-ffef641e749f?w=800&q=80',
    
    // Victorian High Country - Mountain landscape
    'aus-high-country': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    
    // Nullarbor - Desert road
    'aus-nullarbor': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
    
    // Cape York - Remote beach
    'aus-cape-york': 'https://images.unsplash.com/photo-1523952578875-e6bb18b26645?w=800&q=80',
    
    // Flinders Ranges - Mountain landscape
    'aus-flinders-ranges': 'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=800&q=80',
    
    // Sunshine Coast - Beach scene
    'aus-sunshine-coast': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80'
  };
  
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
   * Uses ImageStorageService for permanent storage, falls back to search URL
   */
  static async getTemplateImage(template: TripTemplate): Promise<{
    imageUrl: string | null;
    searchUrl: string;
    isVerified: boolean;
    isStored: boolean;
  }> {
    console.log(`🔍 Google Image Service: Getting image for: ${template.name} (${template.id})`);
    
    try {
      // Try to get from storage service first
      const { imageUrl, isStored } = await imageStorageService.getTemplateImageUrl(template.id);
      
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
    
    // Check if we have a verified image
    if (this.VERIFIED_IMAGES[template.id]) {
      const verifiedUrl = this.VERIFIED_IMAGES[template.id];
      console.log(`✅ Using verified image for ${template.id}: ${verifiedUrl.substring(0, 50)}...`);
      return {
        imageUrl: verifiedUrl,
        searchUrl: this.generateGoogleImageSearchUrl(this.getSearchQuery(template)),
        isVerified: true
      };
    }
    
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
   * Initialize image storage for all templates
   * Call this when the app starts to ensure all images are stored
   */
  static async initializeImageStorage(): Promise<void> {
    console.log('🚀 Initializing template image storage...');
    
    try {
      await imageStorageService.initializeStorage();
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
      await imageStorageService.ensureImagesStored(templates);
      console.log('✅ Template images storage check complete');
    } catch (error) {
      console.error('❌ Failed to ensure images stored:', error);
      // Don't throw - fallback URLs will be used
    }
  }
}

export const googleImageService = GoogleImageService;