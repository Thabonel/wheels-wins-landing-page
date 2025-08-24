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
      
      // Use the comprehensive Australian templates as fallback
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