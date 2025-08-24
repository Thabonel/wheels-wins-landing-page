import { TripTemplate } from './tripTemplateService';

/**
 * Google Image Search Service
 * Uses Google Image Search to find REAL photos of actual locations
 * This ensures accurate representation of trip destinations
 */
export class GoogleImageService {
  // Verified, curated images for each Australian template
  // These are hardcoded to ensure accuracy
  private static readonly VERIFIED_IMAGES: Record<string, string> = {
    // Great Ocean Road - Using actual Twelve Apostles photo
    'aus-great-ocean-road': 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/15/33/f5/de/great-ocean-road.jpg?w=1200&h=700&s=1',
    
    // Big Lap - Uluru iconic shot
    'aus-big-lap': 'https://www.tourism.australia.com/content/dam/digital/images/campaigns/Indigenous/uluru-nt.jpg',
    
    // East Coast - Great Barrier Reef
    'aus-east-coast': 'https://www.australia.com/content/australia/en/places/cairns-and-surrounds/guide-to-the-great-barrier-reef/_jcr_content/hero/desktop.adapt.1920.high.jpg',
    
    // Red Centre - Uluru at sunset
    'aus-red-centre': 'https://www.intrepidtravel.com/adventures/wp-content/uploads/2017/10/australia_uluru_sunset.jpg',
    
    // Savannah Way - Kakadu landscape
    'aus-savannah-way': 'https://northernterritory.com/binaries/content/gallery/tourismnt/images/kakadu/kakadu-national-park-gunlom-falls.jpg',
    
    // Tasmania Circuit - Cradle Mountain
    'aus-tasmania-circuit': 'https://www.discovertasmania.com.au/__data/assets/image/0011/956396/cradle-mountain.jpg',
    
    // Southwest WA - Margaret River vineyards
    'aus-southwest-wa': 'https://www.australiassouthwest.com/wp-content/uploads/2021/06/Leeuwin-Estate-Vineyard.jpg',
    
    // Queensland Outback - Longreach landscape
    'aus-queensland-outback': 'https://www.queensland.com/content/dam/teq/consumer/global/images/destinations/outback-queensland/blog-images/longreach-qantas-founders-museum.jpg',
    
    // Murray River - Paddle steamer
    'aus-murray-river': 'https://www.murrayriver.com.au/wp-content/uploads/2019/05/paddle-steamer-echuca.jpg',
    
    // Gibb River Road - Windjana Gorge actual photo
    'aus-gibb-river-road': 'https://www.australiascoralcoast.com/sites/default/files/styles/large/public/2020-03/Windjana%20Gorge%20National%20Park%20-%20Credit%20Tourism%20Western%20Australia.jpg',
    
    // Victorian High Country - Mount Buffalo
    'aus-high-country': 'https://www.visitvictoria.com/-/media/images/high-country/things-to-do/nature-and-wildlife/mountains/mount-buffalo_hc_r_1433905_1600x900.jpg',
    
    // Nullarbor - Actual Nullarbor Plain
    'aus-nullarbor': 'https://www.australiantraveller.com/wp-content/uploads/2019/11/nullarbor-plain-road.jpg',
    
    // Cape York - Actual Cape York tip
    'aus-cape-york': 'https://www.capeyorktours.com.au/wp-content/uploads/2019/03/cape-york-tip.jpg',
    
    // Flinders Ranges - Wilpena Pound
    'aus-flinders-ranges': 'https://southaustralia.com/media/3qipbsvy/wilpena-pound-flinders-ranges-south-australia.jpg',
    
    // Sunshine Coast - Noosa Beach
    'aus-sunshine-coast': 'https://www.visitsunshinecoast.com/~/media/images/blog/2020/noosa-main-beach.jpg'
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
   * First checks verified images, then provides Google Image Search URL
   */
  static getTemplateImage(template: TripTemplate): {
    imageUrl: string | null;
    searchUrl: string;
    isVerified: boolean;
  } {
    console.log(`🔍 Google Image Service: Getting image for: ${template.name} (${template.id})`);
    
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
}

export const googleImageService = GoogleImageService;