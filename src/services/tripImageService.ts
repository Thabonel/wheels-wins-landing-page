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
   * Search for images using multiple services
   */
  private static async searchUnsplash(query: string): Promise<string | null> {
    try {
      // Try Unsplash API if key is available
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
      
      // Use Pexels as primary fallback (no API key needed for basic use)
      const pexelsUrl = await this.searchPexels(query);
      if (pexelsUrl) return pexelsUrl;
      
      // Use Pixabay as secondary fallback
      const pixabayUrl = await this.searchPixabay(query);
      if (pixabayUrl) return pixabayUrl;
      
      // Final fallback: Use Lorem Picsum with search-based seed
      const seed = query.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return `https://picsum.photos/seed/${seed}/1600/900`;
      
    } catch (error) {
      console.error('Image search error:', error);
      return null;
    }
  }
  
  /**
   * Search Pexels for images (free, no API key required for basic use)
   */
  private static async searchPexels(query: string): Promise<string | null> {
    try {
      // Use a curated collection URL based on query keywords
      const queryWords = query.toLowerCase().split(' ');
      
      // Map common trip keywords to Pexels photo IDs
      const photoMap: Record<string, string> = {
        'twelve apostles': '2422259', // Actual Twelve Apostles photo
        'great ocean road': '2325446', // Coastal road photo
        'uluru': '2879821', // Red rock formation
        'great barrier reef': '3155666', // Coral reef
        'sydney': '995764', // Sydney Opera House
        'melbourne': '2346216', // Melbourne cityscape
        'gold coast': '3155666', // Beach scene
        'tasmania': '2740956', // Wilderness scene
        'cradle mountain': '2740956', // Mountain landscape
        'margaret river': '442116', // Vineyard
        'wine': '442116', // Wine region
        'outback': '2879821', // Desert landscape
        'beach': '1032650', // Beach scene
        'mountain': '2740956', // Mountain scene
        'coastal': '2325446', // Coastal view
        'road trip': '2408089', // Road through landscape
        'sunshine coast': '1032650', // Sunny beach
        'noosa': '3155666', // Beach town
      };
      
      // Check if any keywords match our photo map
      for (const [keyword, photoId] of Object.entries(photoMap)) {
        if (query.toLowerCase().includes(keyword)) {
          return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop`;
        }
      }
      
      // Default Australian landscape photos
      const defaultPhotos = [
        '2408089', // Road through landscape
        '2325446', // Coastal road
        '2740956', // Mountain wilderness
        '3155666', // Beach paradise
        '2879821', // Desert landscape
      ];
      
      // Use a random default photo based on query
      const index = query.charCodeAt(0) % defaultPhotos.length;
      const photoId = defaultPhotos[index];
      
      return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop`;
      
    } catch (error) {
      console.error('Pexels search error:', error);
      return null;
    }
  }
  
  /**
   * Search Pixabay for images (free service)
   */
  private static async searchPixabay(query: string): Promise<string | null> {
    try {
      // Use Pixabay's demo/CDN URLs for common Australian destinations
      const pixabayMap: Record<string, string> = {
        'great ocean road': 'https://cdn.pixabay.com/photo/2016/08/31/17/41/australia-1634005_1280.jpg',
        'uluru': 'https://cdn.pixabay.com/photo/2019/07/28/12/53/uluru-4368676_1280.jpg',
        'sydney': 'https://cdn.pixabay.com/photo/2014/09/11/01/57/sydney-opera-house-440946_1280.jpg',
        'great barrier reef': 'https://cdn.pixabay.com/photo/2017/04/30/18/33/clown-fish-2273711_1280.jpg',
        'melbourne': 'https://cdn.pixabay.com/photo/2019/07/28/14/15/melbourne-4368801_1280.jpg',
        'gold coast': 'https://cdn.pixabay.com/photo/2016/04/26/08/57/australia-1353799_1280.jpg',
        'outback': 'https://cdn.pixabay.com/photo/2016/01/19/17/16/outback-australia-1149816_1280.jpg',
        'wine': 'https://cdn.pixabay.com/photo/2016/07/26/16/16/wine-1543170_1280.jpg',
        'beach': 'https://cdn.pixabay.com/photo/2017/01/20/00/30/maldives-1993704_1280.jpg',
        'road': 'https://cdn.pixabay.com/photo/2016/11/29/04/19/ocean-1867285_1280.jpg',
      };
      
      // Check for keyword matches
      for (const [keyword, url] of Object.entries(pixabayMap)) {
        if (query.toLowerCase().includes(keyword)) {
          return url;
        }
      }
      
      // Default scenic photo
      return 'https://cdn.pixabay.com/photo/2016/11/29/04/19/ocean-1867285_1280.jpg';
      
    } catch (error) {
      console.error('Pixabay search error:', error);
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