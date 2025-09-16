import { Region } from '@/context/RegionContext';
import { TripTemplate } from './tripTemplateService';
import { googleImageService } from './googleImageService';

// Safe wrapper for trip template service that handles permission errors
export const tripTemplateServiceSafe = {
  async getLocationBasedTripTemplates(region?: string | Region) {
    // Always use fallback templates since database access is restricted
    const userRegion = region || 'Australia';
    console.log('Using comprehensive fallback templates for region:', userRegion);
    
    // No need for cache clearing with new Google Image Service
    
    // Get region-specific templates
    const templates = this.getTemplatesForRegion(userRegion as Region);
    
    // Enhance templates with fetched images
    const templatesWithImages = await this.enhanceTemplatesWithImages(templates);
    
    return {
      templates: templatesWithImages,
      isLoading: false,
      error: null
    };
  },
  
  getTemplatesForRegion(region: Region): TripTemplate[] {
    switch(region) {
      case 'Australia':
        return this.getAustralianTemplates();
      case 'New Zealand':
        return this.getNewZealandTemplates();
      case 'Canada':
        return this.getCanadianTemplates();
      case 'United States':
        return this.getUnitedStatesTemplates();
      case 'United Kingdom':
        return this.getUnitedKingdomTemplates();
      default:
        return this.getRestOfWorldTemplates();
    }
  },
  
  getAustralianTemplates(): TripTemplate[] {
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
          imageUrl: 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/templates/great-ocean-road-classic.jpg',
          image_url: 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/templates/great-ocean-road-classic.jpg'
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
          isPublic: true
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
          imageUrl: 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/templates/east-coast-discovery.jpg',
          image_url: 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/templates/east-coast-discovery.jpg'
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
          isPublic: true
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
          isPublic: true
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
          isPublic: true
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
          isPublic: true
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
          isPublic: true
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
          isPublic: true
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
          isPublic: true
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
          isPublic: true
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
          isPublic: true
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
          isPublic: true
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
          isPublic: true
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
          isPublic: true
        }
      ];
      
      return australianTemplates;
  },
  
  getNewZealandTemplates(): TripTemplate[] {
    return [
      {
        id: 'nz-south-island',
        name: 'South Island Circuit',
        description: 'Complete South Island loop covering fjords, glaciers, mountains and adventure capital Queenstown.',
        estimatedDays: 18,
        estimatedMiles: 1500,
        difficulty: 'intermediate',
        highlights: ['Milford Sound', 'Franz Josef Glacier', 'Mount Cook', 'Queenstown'],
        suggestedBudget: 4200,
        route: null,
        region: 'New Zealand' as Region,
        category: 'scenic',
        tags: ['new-zealand', 'mountains', 'glaciers', 'fjords'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'nz-north-island',
        name: 'North Island Discovery',
        description: 'Auckland to Wellington via Rotorua geothermal wonderland and Hobbiton movie set.',
        estimatedDays: 10,
        estimatedMiles: 800,
        difficulty: 'beginner',
        highlights: ['Rotorua', 'Hobbiton', 'Bay of Islands', 'Wellington'],
        suggestedBudget: 2800,
        route: null,
        region: 'New Zealand' as Region,
        category: 'cultural',
        tags: ['new-zealand', 'geothermal', 'culture', 'movie-locations'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'nz-coastal-pacific',
        name: 'Coastal Pacific Trail',
        description: 'Picton to Christchurch coastal route with wine regions and marine wildlife.',
        estimatedDays: 5,
        estimatedMiles: 400,
        difficulty: 'beginner',
        highlights: ['Kaikoura', 'Marlborough Wine Region', 'Hanmer Springs', 'Christchurch'],
        suggestedBudget: 1500,
        route: null,
        region: 'New Zealand' as Region,
        category: 'coastal',
        tags: ['new-zealand', 'coastal', 'wine', 'wildlife'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'nz-great-walks',
        name: 'Great Walks Explorer',
        description: 'Experience New Zealand\'s famous Great Walks including Milford and Routeburn tracks.',
        estimatedDays: 14,
        estimatedMiles: 600,
        difficulty: 'advanced',
        highlights: ['Milford Track', 'Routeburn Track', 'Kepler Track', 'Te Anau'],
        suggestedBudget: 3200,
        route: null,
        region: 'New Zealand' as Region,
        category: 'adventure',
        tags: ['new-zealand', 'hiking', 'wilderness', 'adventure'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'nz-wine-trail',
        name: 'Wine Regions Tour',
        description: 'Tour of New Zealand\'s premier wine regions from Marlborough to Central Otago.',
        estimatedDays: 8,
        estimatedMiles: 700,
        difficulty: 'beginner',
        highlights: ['Marlborough', 'Hawke\'s Bay', 'Central Otago', 'Waiheke Island'],
        suggestedBudget: 2400,
        route: null,
        region: 'New Zealand' as Region,
        category: 'wine_culinary',
        tags: ['new-zealand', 'wine', 'gourmet', 'scenic'],
        usageCount: 0,
        isPublic: true
      }
    ];
  },
  
  getCanadianTemplates(): TripTemplate[] {
    return [
      {
        id: 'can-rockies',
        name: 'Canadian Rockies Adventure',
        description: 'Banff and Jasper National Parks mountain experience with glaciers and turquoise lakes.',
        estimatedDays: 12,
        estimatedMiles: 800,
        difficulty: 'intermediate',
        highlights: ['Lake Louise', 'Moraine Lake', 'Jasper', 'Icefields Parkway'],
        suggestedBudget: 2400,
        route: null,
        region: 'Canada' as Region,
        category: 'mountain',
        tags: ['canada', 'mountains', 'lakes', 'national-parks'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'can-maritimes',
        name: 'Maritime Provinces Circuit',
        description: 'Halifax to Prince Edward Island coastal adventure with lighthouses and seafood.',
        estimatedDays: 14,
        estimatedMiles: 1200,
        difficulty: 'beginner',
        highlights: ['Peggy\'s Cove', 'Cape Breton', 'PEI Beaches', 'Bay of Fundy'],
        suggestedBudget: 2800,
        route: null,
        region: 'Canada' as Region,
        category: 'coastal',
        tags: ['canada', 'maritimes', 'coastal', 'seafood'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'can-trans-canada',
        name: 'Trans-Canada Highway Epic',
        description: 'Coast to coast journey from Victoria BC to St. John\'s Newfoundland.',
        estimatedDays: 30,
        estimatedMiles: 5000,
        difficulty: 'advanced',
        highlights: ['Vancouver', 'Calgary', 'Winnipeg', 'Toronto', 'Montreal', 'Halifax'],
        suggestedBudget: 8500,
        route: null,
        region: 'Canada' as Region,
        category: 'epic_journeys',
        tags: ['canada', 'trans-canada', 'epic', 'coast-to-coast'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'can-alaska-highway',
        name: 'Alaska Highway Adventure',
        description: 'Dawson Creek to Fairbanks through wilderness and the Yukon Territory.',
        estimatedDays: 10,
        estimatedMiles: 1400,
        difficulty: 'advanced',
        highlights: ['Liard Hot Springs', 'Whitehorse', 'Dawson City', 'Denali'],
        suggestedBudget: 3200,
        route: null,
        region: 'Canada' as Region,
        category: 'adventure',
        tags: ['canada', 'alaska-highway', 'wilderness', 'yukon'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'can-niagara-wine',
        name: 'Niagara Wine Country',
        description: 'Toronto to Niagara Falls with wine tasting and scenic stops.',
        estimatedDays: 5,
        estimatedMiles: 300,
        difficulty: 'beginner',
        highlights: ['Niagara Falls', 'Niagara-on-the-Lake', 'Wine Tours', 'Toronto'],
        suggestedBudget: 1500,
        route: null,
        region: 'Canada' as Region,
        category: 'wine_culinary',
        tags: ['canada', 'niagara', 'wine', 'waterfalls'],
        usageCount: 0,
        isPublic: true
      }
    ];
  },
  
  getUnitedStatesTemplates(): TripTemplate[] {
    return [
      {
        id: 'usa-route-66',
        name: 'Historic Route 66',
        description: 'Chicago to Santa Monica on the Mother Road through America\'s heartland.',
        estimatedDays: 14,
        estimatedMiles: 2400,
        difficulty: 'intermediate',
        highlights: ['Chicago', 'St. Louis', 'Amarillo', 'Grand Canyon', 'Santa Monica'],
        suggestedBudget: 3500,
        route: null,
        region: 'United States' as Region,
        category: 'historical',
        tags: ['usa', 'route-66', 'historic', 'classic'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'usa-pacific-coast',
        name: 'Pacific Coast Highway',
        description: 'Seattle to San Diego along the stunning Pacific coastline.',
        estimatedDays: 10,
        estimatedMiles: 1650,
        difficulty: 'beginner',
        highlights: ['Seattle', 'Oregon Coast', 'Big Sur', 'Los Angeles', 'San Diego'],
        suggestedBudget: 2800,
        route: null,
        region: 'United States' as Region,
        category: 'coastal',
        tags: ['usa', 'pacific-coast', 'scenic', 'beaches'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'usa-southwest-parks',
        name: 'Southwest National Parks',
        description: 'Big 5 national parks in Utah and Arizona desert landscapes.',
        estimatedDays: 14,
        estimatedMiles: 1850,
        difficulty: 'intermediate',
        highlights: ['Zion', 'Bryce Canyon', 'Capitol Reef', 'Arches', 'Canyonlands'],
        suggestedBudget: 2200,
        route: null,
        region: 'United States' as Region,
        category: 'national-parks',
        tags: ['usa', 'national-parks', 'desert', 'hiking'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'usa-blue-ridge',
        name: 'Blue Ridge Parkway',
        description: 'Virginia to North Carolina through the Appalachian Mountains.',
        estimatedDays: 7,
        estimatedMiles: 500,
        difficulty: 'beginner',
        highlights: ['Shenandoah', 'Blue Ridge Mountains', 'Asheville', 'Great Smoky Mountains'],
        suggestedBudget: 1800,
        route: null,
        region: 'United States' as Region,
        category: 'mountain',
        tags: ['usa', 'blue-ridge', 'mountains', 'scenic'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'usa-florida-keys',
        name: 'Florida Keys Island Hop',
        description: 'Miami to Key West along the Overseas Highway through tropical islands.',
        estimatedDays: 5,
        estimatedMiles: 350,
        difficulty: 'beginner',
        highlights: ['Miami', 'Key Largo', 'Marathon', 'Key West'],
        suggestedBudget: 2000,
        route: null,
        region: 'United States' as Region,
        category: 'island',
        tags: ['usa', 'florida-keys', 'tropical', 'beaches'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'usa-new-england',
        name: 'New England Fall Foliage',
        description: 'Boston through Vermont and New Hampshire during peak autumn colors.',
        estimatedDays: 8,
        estimatedMiles: 900,
        difficulty: 'beginner',
        highlights: ['Boston', 'White Mountains', 'Vermont Scenic Routes', 'Acadia National Park'],
        suggestedBudget: 2400,
        route: null,
        region: 'United States' as Region,
        category: 'scenic',
        tags: ['usa', 'new-england', 'fall-foliage', 'scenic'],
        usageCount: 0,
        isPublic: true
      }
    ];
  },
  
  getUnitedKingdomTemplates(): TripTemplate[] {
    return [
      {
        id: 'uk-scotland-highlands',
        name: 'Scottish Highlands Tour',
        description: 'Edinburgh to Isle of Skye through lochs, castles and Highland scenery.',
        estimatedDays: 10,
        estimatedMiles: 800,
        difficulty: 'beginner',
        highlights: ['Loch Ness', 'Isle of Skye', 'Edinburgh Castle', 'Glen Coe'],
        suggestedBudget: 1800,
        route: null,
        region: 'United Kingdom' as Region,
        category: 'cultural',
        tags: ['uk', 'scotland', 'highlands', 'castles'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'uk-cotswolds',
        name: 'Cotswolds Villages',
        description: 'Charming villages and rolling hills in England\'s most picturesque region.',
        estimatedDays: 5,
        estimatedMiles: 300,
        difficulty: 'beginner',
        highlights: ['Bath', 'Bourton-on-the-Water', 'Chipping Campden', 'Stratford-upon-Avon'],
        suggestedBudget: 1200,
        route: null,
        region: 'United Kingdom' as Region,
        category: 'cultural',
        tags: ['uk', 'cotswolds', 'villages', 'countryside'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'uk-lake-district',
        name: 'Lake District Explorer',
        description: 'England\'s most beautiful national park with lakes, mountains and literary history.',
        estimatedDays: 7,
        estimatedMiles: 400,
        difficulty: 'intermediate',
        highlights: ['Windermere', 'Keswick', 'Grasmere', 'Scafell Pike'],
        suggestedBudget: 1500,
        route: null,
        region: 'United Kingdom' as Region,
        category: 'scenic',
        tags: ['uk', 'lake-district', 'lakes', 'hiking'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'uk-cornwall-coast',
        name: 'Cornwall Coastal Route',
        description: 'Dramatic coastline with beaches, fishing villages and Cornish culture.',
        estimatedDays: 8,
        estimatedMiles: 500,
        difficulty: 'beginner',
        highlights: ['Land\'s End', 'St. Ives', 'Eden Project', 'Tintagel Castle'],
        suggestedBudget: 1600,
        route: null,
        region: 'United Kingdom' as Region,
        category: 'coastal',
        tags: ['uk', 'cornwall', 'coastal', 'beaches'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'uk-wales-circuit',
        name: 'Wales Grand Tour',
        description: 'Cardiff to Snowdonia covering castles, mountains and Welsh culture.',
        estimatedDays: 9,
        estimatedMiles: 700,
        difficulty: 'intermediate',
        highlights: ['Cardiff', 'Brecon Beacons', 'Snowdonia', 'Conwy Castle'],
        suggestedBudget: 1700,
        route: null,
        region: 'United Kingdom' as Region,
        category: 'cultural',
        tags: ['uk', 'wales', 'mountains', 'castles'],
        usageCount: 0,
        isPublic: true
      }
    ];
  },
  
  getRestOfWorldTemplates(): TripTemplate[] {
    return [
      {
        id: 'world-coastal',
        name: 'Coastal Adventure',
        description: 'Scenic coastal route with beaches, cliffs and seaside towns.',
        estimatedDays: 7,
        estimatedMiles: 400,
        difficulty: 'beginner',
        highlights: ['Coastal Views', 'Beach Towns', 'Scenic Drives', 'Local Seafood'],
        suggestedBudget: 1200,
        route: null,
        region: 'Rest of the World' as Region,
        category: 'coastal',
        tags: ['coastal', 'scenic', 'beaches'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'world-mountain',
        name: 'Mountain Explorer',
        description: 'Mountain passes, alpine lakes and highland adventures.',
        estimatedDays: 10,
        estimatedMiles: 600,
        difficulty: 'intermediate',
        highlights: ['Mountain Passes', 'Alpine Lakes', 'Scenic Valleys', 'Local Villages'],
        suggestedBudget: 1800,
        route: null,
        region: 'Rest of the World' as Region,
        category: 'mountain',
        tags: ['mountains', 'alpine', 'hiking'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'world-cultural',
        name: 'Cultural Discovery',
        description: 'Historic sites, local culture and authentic experiences.',
        estimatedDays: 8,
        estimatedMiles: 500,
        difficulty: 'beginner',
        highlights: ['Historic Sites', 'Local Markets', 'Cultural Centers', 'Traditional Food'],
        suggestedBudget: 1500,
        route: null,
        region: 'Rest of the World' as Region,
        category: 'cultural',
        tags: ['culture', 'history', 'local'],
        usageCount: 0,
        isPublic: true
      },
      {
        id: 'world-wine',
        name: 'Wine Region Tour',
        description: 'Vineyard visits, wine tasting and gourmet experiences.',
        estimatedDays: 6,
        estimatedMiles: 350,
        difficulty: 'beginner',
        highlights: ['Vineyards', 'Wine Tasting', 'Local Cuisine', 'Scenic Routes'],
        suggestedBudget: 1600,
        route: null,
        region: 'Rest of the World' as Region,
        category: 'wine_culinary',
        tags: ['wine', 'gourmet', 'culinary'],
        usageCount: 0,
        isPublic: true
      }
    ];
  },

  async fetchTripTemplatesForRegion(region: string) {
    return this.getLocationBasedTripTemplates(region);
  },
  
  /**
   * Enhance templates with verified Google Images using storage service
   */
  async enhanceTemplatesWithImages(templates: TripTemplate[]): Promise<TripTemplate[]> {
    try {
      console.log(`🖼️ Enhancing ${templates.length} templates with images using storage service...`);
      
      // Ensure images are stored for all templates
      await googleImageService.ensureImagesStored(templates);
      
      // Process templates with async image loading
      const enhancedTemplates = await Promise.all(
        templates.map(async (template) => {
          console.log(`  Processing template: ${template.name} (${template.id})`);
          
          // Skip if image already exists
          if (template.imageUrl || template.image_url) {
            console.log(`    ⚠️ Template already has image, skipping: ${template.imageUrl || template.image_url}`);
            return template;
          }
          
          try {
            // Get verified image from storage service (async)
            const imageResult = await googleImageService.getTemplateImage(template);
            
            // Log image source
            const source = imageResult.isStored ? 'stored in Supabase' : 'verified URL';
            console.log(`    ✅ Template "${template.name}" has ${source}: ${imageResult.imageUrl?.substring(0, 60)}...`);
            
            return {
              ...template,
              imageUrl: imageResult.imageUrl,
              image_url: imageResult.imageUrl,
              thumbnailUrl: imageResult.imageUrl,
              thumbnail_url: imageResult.imageUrl,
              googleImageSearchUrl: imageResult.searchUrl,
              imageVerified: imageResult.isVerified,
              imageStored: imageResult.isStored
            };
            
          } catch (error) {
            console.error(`    ❌ Failed to get image for ${template.name}:`, error);
            
            // Fallback to sync method for this template
            const fallbackResult = googleImageService.getTemplateImageSync(template);
            
            return {
              ...template,
              imageUrl: fallbackResult.imageUrl,
              image_url: fallbackResult.imageUrl,
              thumbnailUrl: fallbackResult.imageUrl,
              thumbnail_url: fallbackResult.imageUrl,
              googleImageSearchUrl: fallbackResult.searchUrl,
              imageVerified: fallbackResult.isVerified,
              imageStored: false
            };
          }
        })
      );
      
      // Log unverified templates
      const unverified = googleImageService.getUnverifiedTemplates(templates);
      if (unverified.length > 0) {
        console.log('📸 Templates needing image verification:');
        unverified.forEach(({ template, searchUrl }) => {
          console.log(`  - ${template.name}: ${searchUrl}`);
        });
      }
      
      return enhancedTemplates;
    } catch (error) {
      console.error('Error enhancing templates with images:', error);
      // Return templates without enhancement if error occurs
      return templates;
    }
  }
};