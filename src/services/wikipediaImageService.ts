/**
 * Wikipedia Image Service
 * Fetches real images from Wikipedia/Wikimedia Commons for trip destinations
 */

export class WikipediaImageService {
  private static readonly WIKIPEDIA_API = 'https://en.wikipedia.org/api/rest_v1';
  private static readonly COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
  
  /**
   * Search Wikipedia for a page and get its main image
   */
  static async getWikipediaImage(searchTerm: string): Promise<string | null> {
    try {
      // First, search for the page
      const searchUrl = `${this.WIKIPEDIA_API}/page/summary/${encodeURIComponent(searchTerm)}`;
      console.log(`🔍 Searching Wikipedia for: ${searchTerm}`);
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        console.warn(`Wikipedia page not found for: ${searchTerm}`);
        return null;
      }
      
      const data = await response.json();
      
      // Get the thumbnail or original image
      if (data.thumbnail?.source) {
        // Get higher resolution version
        const highResUrl = data.thumbnail.source.replace(/\/\d+px-/, '/800px-');
        console.log(`✅ Found Wikipedia image for ${searchTerm}`);
        return highResUrl;
      } else if (data.originalimage?.source) {
        console.log(`✅ Found Wikipedia original image for ${searchTerm}`);
        return data.originalimage.source;
      }
      
      console.warn(`No image found on Wikipedia page for: ${searchTerm}`);
      return null;
    } catch (error) {
      console.error(`Error fetching Wikipedia image for ${searchTerm}:`, error);
      return null;
    }
  }
  
  /**
   * Get images for trip templates using Wikipedia
   */
  static async getTemplateImages(): Promise<Record<string, string>> {
    const templateSearchTerms: Record<string, string> = {
      // Australian templates - use specific landmark searches
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
      
      // International templates
      'nz-south-island': 'Milford Sound',
      'can-rockies': 'Canadian Rockies',
      'uk-scotland': 'Scottish Highlands',
      'usa-southwest': 'Grand Canyon',
      'general-coastal': 'Great Ocean Road'
    };
    
    const images: Record<string, string> = {};
    
    console.log('🌐 Fetching images from Wikipedia...');
    
    // Fetch images in parallel batches to avoid overwhelming the API
    const entries = Object.entries(templateSearchTerms);
    const batchSize = 5;
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      
      const promises = batch.map(async ([templateId, searchTerm]) => {
        const imageUrl = await this.getWikipediaImage(searchTerm);
        if (imageUrl) {
          images[templateId] = imageUrl;
        }
      });
      
      await Promise.all(promises);
      
      // Small delay between batches to be respectful to Wikipedia API
      if (i + batchSize < entries.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Fetched ${Object.keys(images).length} images from Wikipedia`);
    return images;
  }
  
  /**
   * Fallback images from reliable sources (as backup)
   */
  static readonly FALLBACK_IMAGES: Record<string, string> = {
    // Use the URL you provided for Great Ocean Road as an example
    'aus-great-ocean-road': 'https://www.bunyiptours.com/wp-content/uploads/2023/09/Sunset-1-scaled.jpg',
    
    // Tourism Australia official images (these are usually reliable)
    'aus-big-lap': 'https://www.australia.com/content/australia/en/places/red-centre/jcr:content/hero/desktop.adapt.1920.high.jpg',
    'aus-east-coast': 'https://www.australia.com/content/australia/en/places/great-barrier-reef/jcr:content/hero/desktop.adapt.1920.high.jpg',
    
    // Placeholder for others - we'll get real ones from Wikipedia
    'default': 'https://via.placeholder.com/800x600/0088cc/ffffff?text=Loading+Adventure'
  };
}

export const wikipediaImageService = WikipediaImageService;