import { supabase } from '@/integrations/supabase/client';
import { Region } from '@/context/RegionContext';

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
    console.log(`Fetching trip templates for region: ${region}`);
    
    const { data, error } = await (supabase as any)
      .from('trip_templates')
      .select('*')
      .or(`template_data->>'region'.eq.${region},is_public.eq.true`)
      .eq('is_public', true)
      .order('usage_count', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching trip templates:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log(`No trip templates found for region ${region}, will trigger scraping`);
      return [];
    }

    // Transform database records to TripTemplate format
    return data.map(transformDatabaseToTemplate);
  } catch (error) {
    console.error('Unexpected error fetching trip templates:', error);
    return [];
  }
}

/**
 * Transform database record to TripTemplate interface
 */
function transformDatabaseToTemplate(dbRecord: any): TripTemplate {
  const templateData = dbRecord.template_data || {};
  
  return {
    id: dbRecord.id,
    name: dbRecord.name,
    description: dbRecord.description || templateData.description || '',
    estimatedDays: templateData.estimatedDays || 7,
    estimatedMiles: templateData.estimatedMiles || 500,
    difficulty: templateData.difficulty || 'intermediate',
    highlights: templateData.highlights || [],
    suggestedBudget: templateData.suggestedBudget || 1000,
    route: templateData.route || null,
    region: templateData.region || 'Rest of the World',
    category: dbRecord.category || 'general',
    tags: dbRecord.tags || [],
    usageCount: dbRecord.usage_count || 0,
    isPublic: dbRecord.is_public || false,
    createdBy: templateData.createdBy
  };
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
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    
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
 * Get trip templates with intelligent loading
 */
export async function getLocationBasedTripTemplates(region: Region): Promise<TripTemplate[]> {
  console.log(`Getting location-based trip templates for region: ${region}`);
  
  // First, try to fetch from database
  let templates = await fetchTripTemplatesForRegion(region);
  
  // If no templates found, trigger scraping
  if (templates.length === 0) {
    console.log('No templates in database, triggering scraping...');
    templates = await triggerTripScraping(region);
  }
  
  // If still no templates, use fallback
  if (templates.length === 0) {
    console.log('Scraping failed, using fallback templates');
    templates = getFallbackTemplatesForRegion(region);
  }
  
  console.log(`Returning ${templates.length} templates for region ${region}`);
  return templates;
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