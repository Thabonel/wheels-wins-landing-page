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
   * Get region-appropriate search prefix
   */
  private static getRegionSearchPrefix(region?: string): string {
    switch(region) {
      case 'Australia':
        return 'australian';
      case 'New Zealand':
        return 'new zealand';
      case 'Canada':
        return 'canadian';
      case 'United States':
        return 'american';
      case 'United Kingdom':
        return 'british uk';
      default:
        return '';
    }
  }
  
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
    
    console.log(`🔍 Fetching image for template: ${template.name} (${template.id})`);
    
    // PRIORITY: Check if this is a known problematic template that needs specific image
    const problematicTemplates = ['aus-southwest-wa', 'aus-gibb-river-road', 'aus-cape-york'];
    if (problematicTemplates.includes(template.id)) {
      console.log(`  🎯 Using specific fallback for known problematic template: ${template.id}`);
      const imageUrl = this.getDeterministicFallback(template);
      this.imageCache.set(cacheKey, imageUrl);
      return imageUrl;
    }
    
    try {
      // Try multiple search strategies in order of preference
      let imageUrl = await this.searchByHighlights(template);
      
      if (!imageUrl) {
        console.log(`  ⚠️ No image from highlights for ${template.name}, trying name...`);
        imageUrl = await this.searchByName(template);
      }
      
      if (!imageUrl) {
        console.log(`  ⚠️ No image from name for ${template.name}, trying category...`);
        imageUrl = await this.searchByCategory(template);
      }
      
      if (!imageUrl) {
        console.log(`  ⚠️ No image from category for ${template.name}, using deterministic fallback...`);
        imageUrl = this.getDeterministicFallback(template);
      }
      
      // Validate the image URL
      if (!imageUrl || imageUrl === 'undefined' || imageUrl === 'null') {
        console.error(`  ❌ Invalid image URL for ${template.name}: ${imageUrl}`);
        imageUrl = this.getDeterministicFallback(template);
      }
      
      console.log(`  ✅ Final image for ${template.name}: ${imageUrl?.substring(0, 50)}...`);
      
      // Cache the result
      this.imageCache.set(cacheKey, imageUrl);
      return imageUrl;
      
    } catch (error) {
      console.error(`❌ Error fetching image for ${template.name}:`, error);
      return this.getDeterministicFallback(template);
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
    console.log(`  🎯 Searching by highlight: "${searchTerm}" for ${template.name}`);
    const result = await this.searchUnsplash(searchTerm);
    
    if (!result) {
      console.log(`    ❌ No image found for highlight: "${searchTerm}"`);
    } else {
      console.log(`    ✅ Found image for highlight: "${searchTerm}"`);
    }
    
    return result;
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
    // Get region-appropriate search terms
    const regionPrefix = this.getRegionSearchPrefix(template.region);
    
    const categorySearchTerms: Record<string, string> = {
      'coastal': `${regionPrefix} coast beach`,
      'outback': `${regionPrefix} outback desert`,
      'adventure': `${regionPrefix} adventure`,
      'island': `${regionPrefix} island beach`,
      'mountain': `${regionPrefix} mountains`,
      'wine_culinary': `${regionPrefix} vineyard wine`,
      'historical': `${regionPrefix} heritage historic`,
      'river_lakes': `${regionPrefix} river lake`,
      'epic_journeys': `${regionPrefix} road trip`,
      'scenic': `${regionPrefix} scenic landscape`,
      'cultural': `${regionPrefix} culture heritage`,
      'national-parks': `${regionPrefix} national park`,
      'general': `${regionPrefix} landscape`
    };
    
    const searchTerm = categorySearchTerms[template.category] || `${regionPrefix} road trip`;
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
      console.log(`    🖼️ Pexels search for: "${query}"`);
      
      // Use a curated collection URL based on query keywords
      const queryWords = query.toLowerCase().split(' ');
      
      // Map common trip keywords to Pexels photo IDs
      const photoMap: Record<string, string> = {
        // Australian landmarks
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
        'karri forests': '1179229', // Tall forest
        'lucky bay': '1032650', // White sand beach
        'wave rock': '2166553', // Rock formation
        'windjana gorge': '2387390', // Gorge landscape
        'bell gorge': '3225528', // Waterfall gorge
        'el questro': '1624496', // Wilderness station
        'mitchell falls': '2132037', // Waterfall
        'cape york': '2244746', // Remote peninsula
        'cape york tip': '2244746', // Remote peninsula tip
        'jardine river': '2859169', // River crossing
        'fruit bat falls': '3225529', // Tropical waterfall
        'thursday island': '1450391', // Tropical island
        'sunshine coast': '1032650', // Sunny beach
        'noosa': '3155666', // Beach town
        'glass house mountains': '2440009', // Volcanic peaks
        'montville': '3571551', // Mountain village
        
        // New Zealand landmarks
        'milford sound': '3889828', // Fjord landscape
        'franz josef': '2259810', // Glacier
        'mount cook': '2382621', // Mountain peak
        'queenstown': '3293044', // Adventure capital
        'rotorua': '3408744', // Geothermal
        'hobbiton': '2440003', // Rolling hills
        'bay of islands': '1559825', // Island scenery
        
        // Canadian landmarks
        'lake louise': '2662116', // Turquoise lake
        'moraine lake': '147411', // Famous lake
        'banff': '2387873', // Mountain town
        'jasper': '2398220', // Mountain wilderness
        'niagara falls': '2108834', // Waterfall
        'peggy\'s cove': '2901210', // Lighthouse
        'vancouver': '2710140', // City skyline
        
        // US landmarks
        'route 66': '3243090', // Historic road
        'grand canyon': '2489234', // Canyon vista
        'zion': '3225529', // Red rocks
        'bryce canyon': '2909602', // Hoodoos
        'big sur': '3155761', // Coastal cliffs
        'chicago': '2772196', // City skyline
        'santa monica': '1562386', // Beach pier
        'florida keys': '2952453', // Tropical islands
        'key west': '2064827', // Island paradise
        
        // UK landmarks
        'loch ness': '2382673', // Scottish loch
        'isle of skye': '3779500', // Highland scenery
        'edinburgh castle': '2919996', // Castle
        'cotswolds': '2382640', // English countryside
        'lake district': '3408786', // Lakes and mountains
        'land\'s end': '2952588', // Coastal cliffs
        'snowdonia': '3225528', // Welsh mountains
        
        // Generic terms
        'wine': '442116', // Wine region
        'outback': '2879821', // Desert landscape
        'beach': '1032650', // Beach scene
        'mountain': '2740956', // Mountain scene
        'coastal': '2325446', // Coastal view
        'road trip': '2408089', // Road through landscape
        'scenic': '2325446', // Scenic view
        'national park': '2990060', // Park landscape
      };
      
      // Check if any keywords match our photo map
      for (const [keyword, photoId] of Object.entries(photoMap)) {
        if (query.toLowerCase().includes(keyword)) {
          const imageUrl = `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop`;
          console.log(`      ✅ Pexels match found for "${keyword}" -> ${photoId}`);
          return imageUrl;
        }
      }
      
      console.log(`      ⚠️ No Pexels match for "${query}"`)
      
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
      // Use Pixabay's demo/CDN URLs for common destinations
      const pixabayMap: Record<string, string> = {
        // Australian destinations
        'great ocean road': 'https://cdn.pixabay.com/photo/2016/08/31/17/41/australia-1634005_1280.jpg',
        'uluru': 'https://cdn.pixabay.com/photo/2019/07/28/12/53/uluru-4368676_1280.jpg',
        'sydney': 'https://cdn.pixabay.com/photo/2014/09/11/01/57/sydney-opera-house-440946_1280.jpg',
        'great barrier reef': 'https://cdn.pixabay.com/photo/2017/04/30/18/33/clown-fish-2273711_1280.jpg',
        'melbourne': 'https://cdn.pixabay.com/photo/2019/07/28/14/15/melbourne-4368801_1280.jpg',
        'gold coast': 'https://cdn.pixabay.com/photo/2016/04/26/08/57/australia-1353799_1280.jpg',
        
        // New Zealand destinations
        'milford sound': 'https://cdn.pixabay.com/photo/2019/12/17/18/20/new-zealand-4702218_1280.jpg',
        'queenstown': 'https://cdn.pixabay.com/photo/2016/06/24/10/47/new-zealand-1477004_1280.jpg',
        'mount cook': 'https://cdn.pixabay.com/photo/2019/08/19/15/13/mount-cook-4416862_1280.jpg',
        'rotorua': 'https://cdn.pixabay.com/photo/2018/01/17/20/09/new-zealand-3088965_1280.jpg',
        
        // Canadian destinations
        'lake louise': 'https://cdn.pixabay.com/photo/2016/06/03/16/00/lake-louise-1433525_1280.jpg',
        'banff': 'https://cdn.pixabay.com/photo/2015/11/07/11/55/banff-national-park-1031614_1280.jpg',
        'niagara falls': 'https://cdn.pixabay.com/photo/2016/02/19/11/25/niagara-falls-1209762_1280.jpg',
        'vancouver': 'https://cdn.pixabay.com/photo/2016/11/23/13/32/vancouver-1852868_1280.jpg',
        
        // US destinations
        'grand canyon': 'https://cdn.pixabay.com/photo/2016/10/22/17/10/grand-canyon-1761107_1280.jpg',
        'route 66': 'https://cdn.pixabay.com/photo/2016/01/09/18/07/route-66-1130810_1280.jpg',
        'big sur': 'https://cdn.pixabay.com/photo/2016/11/06/05/36/big-sur-1802233_1280.jpg',
        'zion': 'https://cdn.pixabay.com/photo/2016/08/28/23/24/zion-park-1627149_1280.jpg',
        
        // UK destinations
        'loch ness': 'https://cdn.pixabay.com/photo/2016/10/13/09/08/loch-ness-1737168_1280.jpg',
        'edinburgh': 'https://cdn.pixabay.com/photo/2016/08/15/19/25/edinburgh-1596480_1280.jpg',
        'cotswolds': 'https://cdn.pixabay.com/photo/2016/06/24/12/39/cotswolds-1477101_1280.jpg',
        'stonehenge': 'https://cdn.pixabay.com/photo/2017/02/20/13/31/stonehenge-2082607_1280.jpg',
        
        // Generic terms
        'outback': 'https://cdn.pixabay.com/photo/2016/01/19/17/16/outback-australia-1149816_1280.jpg',
        'wine': 'https://cdn.pixabay.com/photo/2016/07/26/16/16/wine-1543170_1280.jpg',
        'beach': 'https://cdn.pixabay.com/photo/2017/01/20/00/30/maldives-1993704_1280.jpg',
        'road': 'https://cdn.pixabay.com/photo/2016/11/29/04/19/ocean-1867285_1280.jpg',
        'mountain': 'https://cdn.pixabay.com/photo/2017/02/01/22/02/mountain-landscape-2031539_1280.jpg',
        'coastal': 'https://cdn.pixabay.com/photo/2016/10/21/14/50/coast-1758094_1280.jpg',
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
   * Get fallback image based on category (deprecated - use getDeterministicFallback)
   */
  private static getFallbackImage(category: string): string {
    // Use Lorem Picsum for random scenic images as fallback
    const seed = category.charCodeAt(0) * 100; // Generate consistent seed from category
    return `https://picsum.photos/seed/${seed}/800/600`;
  }
  
  /**
   * Get a deterministic, context-appropriate fallback image
   */
  private static getDeterministicFallback(template: TripTemplate): string {
    // Map specific problematic templates to appropriate static images
    // Using Pexels direct URLs that are known to work
    const specificFallbacks: Record<string, string> = {
      // Southwest WA - Margaret River wine region with beaches
      'aus-southwest-wa': 'https://images.pexels.com/photos/442116/pexels-photo-442116.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop', // Vineyard
      
      // Gibb River Road - Remote Kimberley gorge landscape
      'aus-gibb-river-road': 'https://images.pexels.com/photos/2387390/pexels-photo-2387390.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop', // Gorge landscape
      
      // Cape York - Remote Australian wilderness/4WD
      'aus-cape-york': 'https://images.pexels.com/photos/2244746/pexels-photo-2244746.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop', // Remote peninsula
      
      // Great Ocean Road - Use specific coastal road image
      'aus-great-ocean-road': 'https://images.pexels.com/photos/2325446/pexels-photo-2325446.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop', // Coastal road
      
      // Sunshine Coast - Use Queensland beach image
      'aus-sunshine-coast': 'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop', // Sunny beach
    };
    
    // Check for specific fallback first
    if (specificFallbacks[template.id]) {
      console.log(`  📌 Using specific fallback for ${template.id}`);
      return specificFallbacks[template.id];
    }
    
    // Category-based fallbacks with better images
    const categoryFallbacks: Record<string, string> = {
      'coastal': 'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=800&q=80', // Coastal road
      'outback': 'https://images.unsplash.com/photo-1523978591478-c753949ff840?w=800&q=80', // Red desert
      'adventure': 'https://images.unsplash.com/photo-1533591302755-cd1c209b6a2a?w=800&q=80', // 4WD adventure
      'island': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80', // Island paradise
      'mountain': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', // Mountain landscape
      'wine_culinary': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80', // Vineyard
      'historical': 'https://images.unsplash.com/photo-1528916451256-07491e5731cd?w=800&q=80', // Historic building
      'river_lakes': 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80', // Lake scene
      'epic_journeys': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80', // Road trip
      'scenic': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80', // Scenic vista
      'cultural': 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=800&q=80', // Cultural site
      'national-parks': 'https://images.unsplash.com/photo-1504870712357-65ea720d6078?w=800&q=80', // National park
      'general': 'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=800&q=80', // Generic landscape
    };
    
    const categoryImage = categoryFallbacks[template.category] || categoryFallbacks['general'];
    console.log(`  📂 Using category fallback for ${template.category}: ${categoryImage.substring(0, 50)}...`);
    return categoryImage;
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
    console.log('🗑️ Clearing image cache...');
    this.imageCache.clear();
  }
  
  /**
   * Clear cache for specific template
   */
  static clearCacheForTemplate(templateId: string): void {
    console.log(`🗑️ Clearing cache for template: ${templateId}`);
    this.imageCache.delete(templateId);
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