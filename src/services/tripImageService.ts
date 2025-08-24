import { TripTemplate } from './tripTemplateService';

interface ImageSearchResult {
  url: string;
  thumbnail: string;
  description: string;
  source: string;
}

/**
 * Service to automatically fetch representative images for trip templates
 * Uses multiple image sources to find the best match for each trip
 */
export class TripImageService {
  private static readonly UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || 'demo';
  private static readonly PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY || 'demo';
  
  // Cache images to avoid repeated API calls
  private static imageCache = new Map<string, string>();
  
  /**
   * Get representative image for a trip template
   * Searches based on highlights, name, and location
   */
  static async getTemplateImage(template: TripTemplate): Promise<string> {
    // Check cache first
    const cacheKey = template.id;
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }
    
    try {
      // Try multiple search strategies in order of preference
      let imageUrl = await this.searchByHighlights(template);
      
      if (!imageUrl) {
        imageUrl = await this.searchByName(template);
      }
      
      if (!imageUrl) {
        imageUrl = await this.searchByCategory(template);
      }
      
      if (!imageUrl) {
        imageUrl = this.getFallbackImage(template.category);
      }
      
      // Cache the result
      this.imageCache.set(cacheKey, imageUrl);
      return imageUrl;
      
    } catch (error) {
      console.error('Error fetching template image:', error);
      return this.getFallbackImage(template.category);
    }
  }
  
  /**
   * Search for images based on trip highlights
   * Uses the most iconic highlight as search term
   */
  private static async searchByHighlights(template: TripTemplate): Promise<string | null> {
    if (!template.highlights || template.highlights.length === 0) {
      return null;
    }
    
    // Use the first (most important) highlight
    const searchTerm = template.highlights[0];
    return this.searchUnsplash(searchTerm);
  }
  
  /**
   * Search for images based on trip name
   */
  private static async searchByName(template: TripTemplate): Promise<string | null> {
    // Extract key location from name (e.g., "Great Ocean Road" from "Great Ocean Road Classic")
    const searchTerm = template.name.replace(/ (Classic|Adventure|Explorer|Circuit|Journey|Trail|Expedition|Discovery)$/i, '');
    return this.searchUnsplash(searchTerm);
  }
  
  /**
   * Search for images based on category
   */
  private static async searchByCategory(template: TripTemplate): Promise<string | null> {
    const categorySearchTerms: Record<string, string> = {
      'coastal': 'australian coast beach',
      'outback': 'australian outback desert',
      'adventure': 'australian 4wd adventure',
      'island': 'australian island beach',
      'mountain': 'australian mountains',
      'wine_culinary': 'australian vineyard wine',
      'historical': 'australian heritage town',
      'river_lakes': 'australian river',
      'epic_journeys': 'australian road trip',
      'general': 'australian landscape'
    };
    
    const searchTerm = categorySearchTerms[template.category] || 'australian road trip';
    return this.searchUnsplash(searchTerm);
  }
  
  /**
   * Search Unsplash for images
   */
  private static async searchUnsplash(query: string): Promise<string | null> {
    try {
      // Use Unsplash API if key is available
      if (this.UNSPLASH_ACCESS_KEY && this.UNSPLASH_ACCESS_KEY !== 'demo') {
        const response = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
          {
            headers: {
              'Authorization': `Client-ID ${this.UNSPLASH_ACCESS_KEY}`
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            return data.results[0].urls.regular;
          }
        }
      }
      
      // Fallback to Unsplash Source (no API key needed)
      // This is a simpler service that returns a random image for a query
      return `https://source.unsplash.com/1600x900/?${encodeURIComponent(query)}`;
      
    } catch (error) {
      console.error('Unsplash search error:', error);
      return null;
    }
  }
  
  /**
   * Get fallback image based on category
   */
  private static getFallbackImage(category: string): string {
    // Use Lorem Picsum for random scenic images as fallback
    const seed = category.charCodeAt(0) * 100; // Generate consistent seed from category
    return `https://picsum.photos/seed/${seed}/800/600`;
  }
  
  /**
   * Batch fetch images for multiple templates
   * More efficient than individual calls
   */
  static async getTemplateImages(templates: TripTemplate[]): Promise<Map<string, string>> {
    const imageMap = new Map<string, string>();
    
    // Process in parallel for better performance
    const imagePromises = templates.map(async (template) => {
      const imageUrl = await this.getTemplateImage(template);
      return { id: template.id, url: imageUrl };
    });
    
    const results = await Promise.all(imagePromises);
    
    results.forEach(({ id, url }) => {
      imageMap.set(id, url);
    });
    
    return imageMap;
  }
  
  /**
   * Preload images for better UX
   */
  static preloadImages(imageUrls: string[]): void {
    imageUrls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }
  
  /**
   * Clear image cache (useful when templates are updated)
   */
  static clearCache(): void {
    this.imageCache.clear();
  }
}

/**
 * Enhanced service that also searches for location-specific images
 */
export class LocationImageService extends TripImageService {
  /**
   * Get image for a specific Australian location
   */
  static async getLocationImage(location: string): Promise<string> {
    // Add "Australia" to search for better results
    const searchQuery = `${location} Australia tourism`;
    
    try {
      // Try Unsplash first
      const unsplashImage = await this.searchUnsplash(searchQuery);
      if (unsplashImage) return unsplashImage;
      
      // Fallback to location-based image service
      return this.getGeoImage(location);
      
    } catch (error) {
      console.error('Error fetching location image:', error);
      return this.getFallbackImage('location');
    }
  }
  
  /**
   * Get image based on geographic location
   */
  private static getGeoImage(location: string): string {
    // Use a geo-based image service
    // MapBox static images could be used here if we have coordinates
    const encodedLocation = encodeURIComponent(location);
    
    // Use Lorem Picsum with location-based seed for consistency
    const seed = location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `https://picsum.photos/seed/${seed}/800/600`;
  }
}

/**
 * Export singleton instance for convenience
 */
export const tripImageService = TripImageService;
export const locationImageService = LocationImageService;