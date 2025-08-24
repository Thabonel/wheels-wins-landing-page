import { Region } from '@/context/RegionContext';
import { TripTemplate } from './tripTemplateService';

// Safe wrapper for trip template service that handles permission errors
export const tripTemplateServiceSafe = {
  async getLocationBasedTripTemplates(region?: string | Region) {
    try {
      // Try to load templates from the service
      const service = await import('./tripTemplateService');
      const templates = await service.getLocationBasedTripTemplates(region as Region || 'Australia');
      
      // Return templates array directly (not wrapped in object)
      return {
        templates: templates,
        isLoading: false,
        error: null
      };
    } catch (error: any) {
      console.log('Trip template service error, using comprehensive fallbacks:', error.message);
      
      // Use ALL the comprehensive Australian templates as fallback
      const australianTemplates: TripTemplate[] = [
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
          region: 'Australia' as Region,
          category: 'coastal',
          tags: ['australia', 'coastal', 'scenic', 'victoria'],
          usageCount: 0,
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1506469717960-433cebe3f181?w=800'
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
          region: 'Australia' as Region,
          category: 'epic_journeys',
          tags: ['australia', 'epic', 'long-term'],
          usageCount: 0,
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1494548162494-384bba4ab999?w=800'
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
          region: 'Australia' as Region,
          category: 'coastal',
          tags: ['australia', 'beaches', 'reef', 'queensland'],
          usageCount: 0,
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800'
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
          region: 'Australia' as Region,
          category: 'outback',
          tags: ['australia', 'outback', 'desert', 'cultural'],
          usageCount: 0,
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1542401886-65d6c61db217?w=800'
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
          region: 'Australia' as Region,
          category: 'adventure',
          tags: ['australia', 'tropical', 'adventure', 'remote'],
          usageCount: 0,
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800'
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
          region: 'Australia' as Region,
          category: 'island',
          tags: ['australia', 'tasmania', 'wilderness', 'gourmet'],
          usageCount: 0,
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
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
          region: 'Australia' as Region,
          category: 'wine_culinary',
          tags: ['australia', 'wine', 'beaches', 'western-australia'],
          usageCount: 0,
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1474192049002-14b817549b22?w=800'
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
          region: 'Australia' as Region,
          category: 'historical',
          tags: ['australia', 'outback', 'history', 'queensland'],
          usageCount: 0,
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1529108190281-9a4f620bc2d8?w=800'
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
          region: 'Australia' as Region,
          category: 'river_lakes',
          tags: ['australia', 'river', 'historic', 'family-friendly'],
          usageCount: 0,
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800'
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
          region: 'Australia' as Region,
          category: 'adventure',
          tags: ['australia', '4wd', 'kimberley', 'remote'],
          usageCount: 0,
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1520645521318-f03a712f0e67?w=800'
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
          region: 'Australia' as Region,
          category: 'mountain',
          tags: ['australia', 'mountains', 'alpine', 'victoria'],
          usageCount: 0,
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
        },
        {
          id: 'aus-nullarbor',
          name: 'Nullarbor Plain Crossing',
          description: 'Epic journey across the Nullarbor Plain, one of the world\'s longest straight roads.',
          estimatedDays: 5,
          estimatedMiles: 1200,
          difficulty: 'intermediate',
          highlights: ['Bunda Cliffs', 'Head of Bight', 'Eucla', 'Nullarbor Roadhouse'],
          suggestedBudget: 1500,
          route: null,
          region: 'Australia' as Region,
          category: 'adventure',
          tags: ['australia', 'nullarbor', 'remote', 'epic'],
          usageCount: 0,
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800'
        },
        {
          id: 'aus-cape-york',
          name: 'Cape York Peninsula 4WD',
          description: 'Ultimate 4WD adventure to the tip of Australia through remote wilderness.',
          estimatedDays: 14,
          estimatedMiles: 1800,
          difficulty: 'advanced',
          highlights: ['Cape York Tip', 'Jardine River', 'Fruit Bat Falls', 'Thursday Island'],
          suggestedBudget: 3500,
          route: null,
          region: 'Australia' as Region,
          category: 'adventure',
          tags: ['australia', '4wd', 'cape-york', 'extreme'],
          usageCount: 0,
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=800'
        },
        {
          id: 'aus-flinders-ranges',
          name: 'Flinders Ranges Expedition',
          description: 'Explore ancient landscapes, Aboriginal rock art and rugged gorges in South Australia.',
          estimatedDays: 7,
          estimatedMiles: 600,
          difficulty: 'intermediate',
          highlights: ['Wilpena Pound', 'Arkaroola', 'Brachina Gorge', 'Sacred Canyon'],
          suggestedBudget: 1800,
          route: null,
          region: 'Australia' as Region,
          category: 'outback',
          tags: ['australia', 'flinders', 'geological', 'south-australia'],
          usageCount: 0,
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1523712900580-a5cc2e0112ed?w=800'
        },
        {
          id: 'aus-sunshine-coast',
          name: 'Sunshine Coast Hinterland',
          description: 'Beaches, rainforest, and mountain villages from Brisbane to Noosa.',
          estimatedDays: 5,
          estimatedMiles: 300,
          difficulty: 'beginner',
          highlights: ['Noosa', 'Glass House Mountains', 'Montville', 'Australia Zoo'],
          suggestedBudget: 1200,
          route: null,
          region: 'Australia' as Region,
          category: 'coastal',
          tags: ['australia', 'sunshine-coast', 'family', 'queensland'],
          usageCount: 0,
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
        }
      ];
      
      return {
        templates: australianTemplates,
        isLoading: false,
        error: null
      };
    }
  },

  async fetchTripTemplatesForRegion(region: string) {
    return this.getLocationBasedTripTemplates(region);
  }
};