import { supabase } from '@/integrations/supabase/client';
import { Region } from '@/context/RegionContext';
import { tripTemplateImageService } from './tripTemplateImageService';

export interface TripTemplate {
  id: string;
  name: string;
  description: string;
  estimatedDays: number;
  estimatedMiles: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  highlights: string[];
  suggestedBudget: number;
  route: any;
  region: Region;
  category: string;
  tags: string[];
  usageCount: number;
  isPublic: boolean;
  createdBy?: string;
  imageUrl?: string;
  image_url?: string;
  thumbnailUrl?: string;
  thumbnail_url?: string;
}

export interface ScrapedTripData {
  name: string;
  description: string;
  region: Region;
  estimatedDays: number;
  estimatedMiles: number;
  highlights: string[];
  suggestedBudget: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  tags: string[];
}

/**
 * Fetch trip templates for a specific region from database
 */
export async function fetchTripTemplatesForRegion(region: Region): Promise<TripTemplate[]> {
  try {
    console.log(`🔍 Fetching trip templates for region: ${region}`);
    
    // Use the working tag-based approach that was verified in backend tests
    let query = supabase
      .from('trip_templates')
      .select('*')
      .eq('is_public', true);
    
    if (region === 'Australia') {
      // Use raw SQL for array contains check
      query = query.filter('tags', 'cs', '{australia}');
    } else {
      // For other regions, use tag matching with lowercase region name
      query = query.filter('tags', 'cs', `{${region.toLowerCase()}}`);
    }
    
    const { data, error } = await query
      .order('usage_count', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Database query failed:', error);
      console.error('Query details:', { region, queryType: 'tag-based' });
      throw new Error(`Failed to fetch trip templates: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log(`⚠️ No trip templates found for region ${region} using tag-based query`);
      return [];
    }

    console.log(`✅ Found ${data.length} trip templates for region ${region}`);
    console.log('Template summary:', data.map(d => ({ 
      name: d.name, 
      region: d.template_data?.region, 
      tags: d.tags,
      category: d.category
    })));
    
    // Transform database records to TripTemplate format with validation
    const transformedTemplates = data
      .map(transformDatabaseToTemplate)
      .filter(template => template !== null) as TripTemplate[];
    
    console.log(`🔄 Successfully transformed ${transformedTemplates.length} templates`);
    
    // Log the final template names for debugging
    console.log('Final templates:', transformedTemplates.map(t => ({ 
      name: t.name, 
      days: t.estimatedDays, 
      budget: t.suggestedBudget, 
      category: t.category 
    })));
    
    return transformedTemplates;
    
  } catch (error) {
    console.error('💥 Unexpected error fetching trip templates:', error);
    throw error;
  }
}

/**
 * Transform database record to TripTemplate interface with validation
 */
function transformDatabaseToTemplate(dbRecord: any): TripTemplate | null {
  try {
    const templateData = dbRecord.template_data || {};
    
    // Validate required fields
    if (!dbRecord.id || !dbRecord.name) {
      console.warn('⚠️ Skipping template with missing required fields:', dbRecord);
      return null;
    }
    
    // Convert string numbers to actual numbers with validation
    const estimatedDays = parseNumberField(templateData.duration_days || templateData.estimatedDays, 7);
    const estimatedMiles = parseNumberField(templateData.distance_miles || templateData.estimatedMiles, 500);
    const suggestedBudget = parseNumberField(templateData.estimated_budget || templateData.suggestedBudget, 1000);
    
    // Validate difficulty enum
    const difficulty = validateDifficulty(templateData.difficulty);
    
    // Ensure highlights is an array
    const highlights = Array.isArray(templateData.highlights) ? templateData.highlights : [];
    
    // Map region to proper Region type
    const region = mapToRegionType(templateData.region);
    
    const transformed: TripTemplate = {
      id: dbRecord.id,
      name: dbRecord.name,
      description: dbRecord.description || templateData.description || '',
      estimatedDays,
      estimatedMiles,
      difficulty,
      highlights,
      suggestedBudget,
      route: templateData.route || null,
      region,
      category: dbRecord.category || 'general',
      tags: Array.isArray(dbRecord.tags) ? dbRecord.tags : [],
      usageCount: parseInt(dbRecord.usage_count) || 0,
      isPublic: Boolean(dbRecord.is_public),
      createdBy: templateData.createdBy,
      imageUrl: dbRecord.image_url,
      image_url: dbRecord.image_url,
      thumbnailUrl: dbRecord.thumbnail_url,
      thumbnail_url: dbRecord.thumbnail_url
    };
    
    console.log(`✅ Transformed template: ${transformed.name} (${transformed.estimatedDays} days, $${transformed.suggestedBudget})`);
    return transformed;
    
  } catch (error) {
    console.error('❌ Error transforming template:', dbRecord, error);
    return null;
  }
}

/**
 * Parse a field that should be a number, with fallback
 */
function parseNumberField(value: any, fallback: number): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

/**
 * Validate difficulty field
 */
function validateDifficulty(difficulty: any): 'beginner' | 'intermediate' | 'advanced' {
  const validDifficulties = ['beginner', 'intermediate', 'advanced'];
  return validDifficulties.includes(difficulty) ? difficulty : 'intermediate';
}

/**
 * Map region string to Region type
 */
function mapToRegionType(regionString: any): Region {
  if (!regionString || typeof regionString !== 'string') {
    return 'Rest of the World';
  }
  
  const region = regionString.toLowerCase();
  
  // Map Australian regional descriptions to Australia
  if (region.includes('australia') || 
      region.includes('victoria') || 
      region.includes('nsw') || 
      region.includes('queensland') || 
      region.includes('tasmania') || 
      region.includes('territory')) {
    return 'Australia';
  }
  
  // Map other known regions
  if (region.includes('new zealand')) return 'New Zealand';
  if (region.includes('united states') || region.includes('usa')) return 'United States';
  if (region.includes('canada')) return 'Canada';
  if (region.includes('united kingdom') || region.includes('uk')) return 'United Kingdom';
  
  return 'Rest of the World';
}

/**
 * Save scraped trip template to database
 */
export async function saveTripTemplate(templateData: ScrapedTripData, userId?: string): Promise<boolean> {
  try {
    const template = {
      user_id: userId || null,
      name: templateData.name,
      description: templateData.description,
      template_data: {
        region: templateData.region,
        estimatedDays: templateData.estimatedDays,
        estimatedMiles: templateData.estimatedMiles,
        difficulty: templateData.difficulty,
        highlights: templateData.highlights,
        suggestedBudget: templateData.suggestedBudget,
        route: null, // Will be populated by scraper
        createdBy: 'auto-scraper'
      },
      category: templateData.category,
      is_public: true, // Make auto-scraped templates public
      tags: templateData.tags,
      usage_count: 0
    };

    const { data, error } = await (supabase as any)
      .from('trip_templates')
      .insert([template])
      .select();

    if (error) {
      console.error('Error saving trip template:', error);
      return false;
    }

    console.log('Successfully saved trip template:', data);
    return true;
  } catch (error) {
    console.error('Unexpected error saving trip template:', error);
    return false;
  }
}

/**
 * Trigger trip scraping for missing regional templates
 */
export async function triggerTripScraping(region: Region): Promise<TripTemplate[]> {
  try {
    console.log(`Triggering trip scraping for region: ${region}`);
    
    // Check if backend scraper service is available
    const backendUrl = import.meta.env.VITE_API_URL || 
                       import.meta.env.VITE_BACKEND_URL || 
                       'https://wheels-wins-backend-staging.onrender.com';
    
    const response = await fetch(`${backendUrl}/api/v1/scrape/trip-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        region,
        maxTemplates: 5
      })
    });

    if (!response.ok) {
      console.warn('Backend scraper not available, using fallback templates');
      return getFallbackTemplatesForRegion(region);
    }

    const scrapedData = await response.json();
    
    // Save scraped templates to database
    const savePromises = scrapedData.templates.map((template: ScrapedTripData) => 
      saveTripTemplate(template)
    );
    
    await Promise.all(savePromises);
    
    // Fetch the saved templates
    return await fetchTripTemplatesForRegion(region);
    
  } catch (error) {
    console.error('Error triggering trip scraping:', error);
    console.log('Using fallback templates for region:', region);
    return getFallbackTemplatesForRegion(region);
  }
}

/**
 * Fallback templates when scraping fails
 */
function getFallbackTemplatesForRegion(region: Region): TripTemplate[] {
  const regionTemplates: Record<Region, TripTemplate[]> = {
    'Australia': [
      {
        id: 'aus-east-coast',
        name: 'East Coast Discovery',
        description: 'Sydney to Cairns coastal adventure with stunning beaches and rainforest',
        estimatedDays: 21,
        estimatedMiles: 1200,
        difficulty: 'intermediate',
        highlights: ['Great Barrier Reef', 'Byron Bay', 'Gold Coast', 'Sunshine Coast'],
        suggestedBudget: 3500,
        route: null,
        region: 'Australia',
        category: 'coastal',
        tags: ['beaches', 'reef', 'coastal'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'aus-red-centre',
        name: 'Red Centre Explorer',
        description: 'Uluru, Kings Canyon and MacDonnell Ranges outback adventure',
        estimatedDays: 14,
        estimatedMiles: 800,
        difficulty: 'advanced',
        highlights: ['Uluru', 'Kings Canyon', 'Alice Springs', 'MacDonnell Ranges'],
        suggestedBudget: 2800,
        route: null,
        region: 'Australia',
        category: 'outback',
        tags: ['outback', 'desert', 'cultural'],
        usageCount: 0,
        isPublic: true
      }
    ],
    'New Zealand': [
      {
        id: 'nz-south-island',
        name: 'South Island Circuit',
        description: 'Complete South Island loop covering fjords, glaciers and mountains',
        estimatedDays: 18,
        estimatedMiles: 1000,
        difficulty: 'intermediate',
        highlights: ['Milford Sound', 'Franz Josef Glacier', 'Mount Cook', 'Queenstown'],
        suggestedBudget: 4200,
        route: null,
        region: 'New Zealand',
        category: 'scenic',
        tags: ['mountains', 'glaciers', 'fjords'],
        usageCount: 0,
        isPublic: true
      }
    ],
    'Canada': [
      {
        id: 'can-rockies',
        name: 'Canadian Rockies Adventure',
        description: 'Banff and Jasper National Parks mountain experience',
        estimatedDays: 12,
        estimatedMiles: 600,
        difficulty: 'intermediate',
        highlights: ['Lake Louise', 'Moraine Lake', 'Jasper', 'Icefields Parkway'],
        suggestedBudget: 2400,
        route: null,
        region: 'Canada',
        category: 'mountains',
        tags: ['mountains', 'lakes', 'national-parks'],
        usageCount: 0,
        isPublic: true
      }
    ],
    'United Kingdom': [
      {
        id: 'uk-scotland',
        name: 'Scottish Highlands Tour',
        description: 'Highlands, lochs and castles of Scotland',
        estimatedDays: 10,
        estimatedMiles: 500,
        difficulty: 'beginner',
        highlights: ['Loch Ness', 'Isle of Skye', 'Edinburgh Castle', 'Glen Coe'],
        suggestedBudget: 1800,
        route: null,
        region: 'United Kingdom',
        category: 'cultural',
        tags: ['castles', 'highlands', 'lochs'],
        usageCount: 0,
        isPublic: true
      }
    ],
    'United States': [
      {
        id: 'usa-southwest',
        name: 'Southwest National Parks',
        description: 'Big 5 national parks in Utah and Arizona',
        estimatedDays: 14,
        estimatedMiles: 1850,
        difficulty: 'intermediate',
        highlights: ['Zion', 'Bryce Canyon', 'Capitol Reef', 'Arches', 'Canyonlands'],
        suggestedBudget: 2200,
        route: null,
        region: 'United States',
        category: 'national-parks',
        tags: ['national-parks', 'desert', 'hiking'],
        usageCount: 0,
        isPublic: true
      }
    ],
    'Rest of the World': [
      {
        id: 'general-coastal',
        name: 'Coastal Adventure',
        description: 'General coastal route template',
        estimatedDays: 7,
        estimatedMiles: 400,
        difficulty: 'beginner',
        highlights: ['Coastal Views', 'Local Culture', 'Scenic Drives'],
        suggestedBudget: 1200,
        route: null,
        region: 'Rest of the World',
        category: 'general',
        tags: ['coastal', 'scenic'],
        usageCount: 0,
        isPublic: true
      }
    ]
  };

  return regionTemplates[region] || regionTemplates['Rest of the World'];
}

/**
 * Get trip templates with intelligent loading and proper error handling
 */
export async function getLocationBasedTripTemplates(region: Region): Promise<TripTemplate[]> {
  console.log(`🚀 Getting location-based trip templates for region: ${region}`);
  
  try {
    // First, try to fetch from database with enhanced error handling
    const templates = await fetchTripTemplatesForRegion(region);
    
    if (templates.length > 0) {
      console.log(`✅ Successfully loaded ${templates.length} templates from database`);
      return templates;
    }
    
    console.log('⚠️ No templates found in database, checking fallback options...');
    
    // Return expanded fallback templates for Australia
    if (region === 'Australia') {
      const australianTemplates = getExpandedAustralianTemplates();
      console.log(`📋 Using ${australianTemplates.length} comprehensive fallback templates for Australia`);
      return australianTemplates;
    }
    
    // Use standard fallback for other regions
    const fallbackTemplates = getFallbackTemplatesForRegion(region);
    console.log(`📋 Using ${fallbackTemplates.length} fallback templates for region ${region}`);
    
    // Add indicator that these are fallback templates
    const markedFallbackTemplates = fallbackTemplates.map(template => ({
      ...template,
      createdBy: 'fallback-system'
    }));
    
    return markedFallbackTemplates;
    
  } catch (error) {
    console.error('💥 Critical error loading templates:', error);
    
    // Log the full error for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        region
      });
    }
    
    // Return expanded fallback for Australia even on error
    if (region === 'Australia') {
      return getExpandedAustralianTemplates();
    }
    
    // Return fallback templates but mark them as error fallbacks
    const errorFallbackTemplates = getFallbackTemplatesForRegion(region).map(template => ({
      ...template,
      createdBy: 'error-fallback'
    }));
    
    console.log(`🚨 Returning ${errorFallbackTemplates.length} error fallback templates`);
    return errorFallbackTemplates;
  }
}

/**
 * Get expanded Australian trip templates when database is not accessible
 */
function getExpandedAustralianTemplates(): TripTemplate[] {
  return [
    {
      id: 'aus-great-ocean-road',
      name: 'Great Ocean Road Classic',
      description: 'Melbourne to Adelaide coastal adventure featuring the iconic Twelve Apostles and charming seaside towns.',
      estimatedDays: 7,
      estimatedMiles: 400,
      difficulty: 'beginner',
      highlights: ['Twelve Apostles', 'Port Campbell', 'Lorne Beach', 'Apollo Bay'],
      suggestedBudget: 1200,
      route: null,
      region: 'Australia',
      category: 'coastal',
      tags: ['australia', 'coastal', 'scenic', 'victoria'],
      usageCount: 0,
      isPublic: true,
      createdBy: 'fallback-system'
    },
    {
      id: 'aus-big-lap',
      name: 'The Big Lap - Around Australia',
      description: 'Complete circumnavigation of Australia covering all states and territories. The ultimate Australian RV adventure.',
      estimatedDays: 90,
      estimatedMiles: 9300,
      difficulty: 'advanced',
      highlights: ['All capital cities', 'Uluru', 'Great Barrier Reef', 'Nullarbor Plain'],
      suggestedBudget: 12000,
      route: null,
      region: 'Australia',
      category: 'epic_journeys',
      tags: ['australia', 'epic', 'long-term'],
      usageCount: 0,
      isPublic: true,
      createdBy: 'fallback-system'
    },
    {
      id: 'aus-east-coast',
      name: 'East Coast Discovery',
      description: 'Sydney to Cairns coastal adventure with stunning beaches, rainforest, and the Great Barrier Reef.',
      estimatedDays: 21,
      estimatedMiles: 1700,
      difficulty: 'intermediate',
      highlights: ['Great Barrier Reef', 'Byron Bay', 'Gold Coast', 'Whitsundays'],
      suggestedBudget: 3500,
      route: null,
      region: 'Australia',
      category: 'coastal',
      tags: ['australia', 'beaches', 'reef', 'queensland'],
      usageCount: 0,
      isPublic: true,
      createdBy: 'fallback-system'
    },
    {
      id: 'aus-red-centre',
      name: 'Red Centre Explorer',
      description: 'Uluru, Kings Canyon and MacDonnell Ranges outback adventure through the heart of Australia.',
      estimatedDays: 14,
      estimatedMiles: 1200,
      difficulty: 'advanced',
      highlights: ['Uluru', 'Kings Canyon', 'Alice Springs', 'MacDonnell Ranges'],
      suggestedBudget: 2800,
      route: null,
      region: 'Australia',
      category: 'outback',
      tags: ['australia', 'outback', 'desert', 'cultural'],
      usageCount: 0,
      isPublic: true,
      createdBy: 'fallback-system'
    },
    {
      id: 'aus-savannah-way',
      name: 'Savannah Way Adventure',
      description: 'Cairns to Broome tropical crossing through Queensland, Northern Territory and Western Australia.',
      estimatedDays: 18,
      estimatedMiles: 2300,
      difficulty: 'advanced',
      highlights: ['Kakadu', 'Katherine Gorge', 'Kimberleys', 'Bungle Bungles'],
      suggestedBudget: 3200,
      route: null,
      region: 'Australia',
      category: 'adventure',
      tags: ['australia', 'tropical', 'adventure', 'remote'],
      usageCount: 0,
      isPublic: true,
      createdBy: 'fallback-system'
    },
    {
      id: 'aus-tasmania-circuit',
      name: 'Tasmania Circuit',
      description: 'Complete loop of Tasmania featuring pristine wilderness, historic sites and gourmet experiences.',
      estimatedDays: 10,
      estimatedMiles: 800,
      difficulty: 'beginner',
      highlights: ['Cradle Mountain', 'Wineglass Bay', 'Port Arthur', 'MONA'],
      suggestedBudget: 1800,
      route: null,
      region: 'Australia',
      category: 'island',
      tags: ['australia', 'tasmania', 'wilderness', 'gourmet'],
      usageCount: 0,
      isPublic: true,
      createdBy: 'fallback-system'
    },
    {
      id: 'aus-southwest-wa',
      name: 'Southwest WA Wine & Surf',
      description: 'Perth to Esperance via Margaret River wine region, tall forests and pristine beaches.',
      estimatedDays: 12,
      estimatedMiles: 900,
      difficulty: 'beginner',
      highlights: ['Margaret River', 'Karri Forests', 'Lucky Bay', 'Wave Rock'],
      suggestedBudget: 2200,
      route: null,
      region: 'Australia',
      category: 'wine_culinary',
      tags: ['australia', 'wine', 'beaches', 'western-australia'],
      usageCount: 0,
      isPublic: true,
      createdBy: 'fallback-system'
    },
    {
      id: 'aus-queensland-outback',
      name: 'Queensland Outback Trail',
      description: 'Brisbane to Mount Isa via historic mining towns and dinosaur country.',
      estimatedDays: 14,
      estimatedMiles: 1100,
      difficulty: 'intermediate',
      highlights: ['Carnarvon Gorge', 'Winton Dinosaurs', 'Longreach', 'Mount Isa'],
      suggestedBudget: 2400,
      route: null,
      region: 'Australia',
      category: 'historical',
      tags: ['australia', 'outback', 'history', 'queensland'],
      usageCount: 0,
      isPublic: true,
      createdBy: 'fallback-system'
    },
    {
      id: 'aus-murray-river',
      name: 'Murray River Journey',
      description: 'Follow Australia\'s mightiest river from the mountains to the sea through historic river towns.',
      estimatedDays: 10,
      estimatedMiles: 750,
      difficulty: 'beginner',
      highlights: ['Echuca', 'Swan Hill', 'Mildura', 'Murray Mouth'],
      suggestedBudget: 1600,
      route: null,
      region: 'Australia',
      category: 'river_lakes',
      tags: ['australia', 'river', 'historic', 'family-friendly'],
      usageCount: 0,
      isPublic: true,
      createdBy: 'fallback-system'
    },
    {
      id: 'aus-gibb-river-road',
      name: 'Gibb River Road Expedition',
      description: 'Epic 4WD adventure through the Kimberley wilderness with gorges, waterfalls and ancient rock art.',
      estimatedDays: 7,
      estimatedMiles: 400,
      difficulty: 'advanced',
      highlights: ['Windjana Gorge', 'Bell Gorge', 'El Questro', 'Mitchell Falls'],
      suggestedBudget: 2500,
      route: null,
      region: 'Australia',
      category: 'adventure',
      tags: ['australia', '4wd', 'kimberley', 'remote'],
      usageCount: 0,
      isPublic: true,
      createdBy: 'fallback-system'
    },
    {
      id: 'aus-high-country',
      name: 'Victorian High Country',
      description: 'Alpine adventure through Victoria\'s mountain country with historic towns and mountain vistas.',
      estimatedDays: 7,
      estimatedMiles: 500,
      difficulty: 'intermediate',
      highlights: ['Mount Buffalo', 'Bright', 'Falls Creek', 'Beechworth'],
      suggestedBudget: 1400,
      route: null,
      region: 'Australia',
      category: 'mountain',
      tags: ['australia', 'mountains', 'alpine', 'victoria'],
      usageCount: 0,
      isPublic: true,
      createdBy: 'fallback-system'
    }
  ];
}

/**
 * Update template usage count
 */
export async function incrementTemplateUsage(templateId: string): Promise<void> {
  try {
    const { error } = await (supabase as any).rpc('increment_template_usage', {
      template_id: templateId
    });
    
    if (error) {
      console.error('Error incrementing template usage:', error);
    }
  } catch (error) {
    console.error('Unexpected error incrementing template usage:', error);
  }
}

/**
 * Update template image - re-export from tripTemplateImageService
 */
export const updateTemplateImage = tripTemplateImageService.updateTemplateImage;
export const ensureAllTemplatesHaveImages = tripTemplateImageService.ensureAllTemplatesHaveImages;