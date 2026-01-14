/**
 * Photo Alternatives Service
 * Provides multiple photo options for trip templates so users can cycle through
 * and find the right image for each template.
 */

import { getMapboxPublicToken } from '@/utils/mapboxConfig';

export interface PhotoAlternative {
  url: string;
  source: 'wikipedia' | 'mapbox' | 'curated';
  query: string;
  thumbnail?: string;
}

// Curated Wikipedia search terms for known routes
// Each template can have multiple search variations to try
const WIKIPEDIA_SEARCH_VARIATIONS: Record<string, string[]> = {
  // Australian routes
  'aus-great-ocean-road': [
    'Twelve Apostles Victoria',
    'Great Ocean Road',
    'London Arch Victoria',
    'Loch Ard Gorge'
  ],
  'aus-big-lap': [
    'Uluru',
    'Australian Outback',
    'Great Barrier Reef',
    'Sydney Harbour'
  ],
  'aus-east-coast': [
    'Great Barrier Reef',
    'Byron Bay',
    'Gold Coast Queensland',
    'Whitsunday Islands'
  ],
  'aus-red-centre': [
    'Uluru Kata Tjuta National Park',
    'Uluru',
    'Kings Canyon Northern Territory',
    'Alice Springs'
  ],
  'aus-savannah-way': [
    'Kakadu National Park',
    'Katherine Gorge',
    'Litchfield National Park',
    'Gulf of Carpentaria'
  ],
  'aus-tasmania-circuit': [
    'Cradle Mountain',
    'Wineglass Bay',
    'Port Arthur Tasmania',
    'Freycinet National Park'
  ],
  'aus-southwest-wa': [
    'Margaret River Western Australia',
    'Wave Rock',
    'Valley of the Giants',
    'Cape Leeuwin'
  ],
  'aus-queensland-outback': [
    'Carnarvon Gorge',
    'Queensland Outback',
    'Longreach Queensland',
    'Winton Queensland'
  ],
  'aus-murray-river': [
    'Murray River Australia',
    'Echuca Victoria',
    'Mildura',
    'Riverland South Australia'
  ],
  'aus-gibb-river-road': [
    'Gibb River Road',
    'Mitchell Falls Western Australia',
    'El Questro',
    'Kimberley Western Australia'
  ],
  'aus-high-country': [
    'Victorian Alps',
    'Mount Hotham',
    'Mount Buller',
    'Alpine National Park Victoria'
  ],
  'aus-nullarbor': [
    'Nullarbor Plain',
    'Great Australian Bight',
    'Head of Bight',
    'Eyre Highway'
  ],
  'aus-cape-york': [
    'Cape York Peninsula',
    'Tip of Australia',
    'Cooktown Queensland',
    'Daintree Rainforest'
  ],
  'aus-flinders-ranges': [
    'Flinders Ranges',
    'Wilpena Pound',
    'Ikara-Flinders Ranges National Park',
    'Arkaroola'
  ],
  'aus-sunshine-coast': [
    'Sunshine Coast Queensland',
    'Noosa Heads',
    'Glass House Mountains',
    'Australia Zoo'
  ],
  // US routes
  'us-pacific-coast': [
    'Pacific Coast Highway',
    'Big Sur',
    'Highway 1 California',
    'Bixby Bridge'
  ],
  'us-route-66': [
    'Route 66',
    'Cadillac Ranch',
    'Grand Canyon',
    'Santa Monica Pier'
  ],
  // NZ routes
  'nz-south-island': [
    'Milford Sound',
    'Queenstown New Zealand',
    'Mount Cook New Zealand',
    'Franz Josef Glacier'
  ],
  'nz-north-island': [
    'Tongariro National Park',
    'Bay of Islands',
    'Rotorua',
    'Cape Reinga'
  ]
};

/**
 * Fetch image from Wikipedia API
 */
async function fetchWikipediaImage(searchTerm: string): Promise<PhotoAlternative | null> {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    let imageUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    if (data.thumbnail?.source) {
      thumbnailUrl = data.thumbnail.source;
      // Get higher resolution version
      imageUrl = data.thumbnail.source.replace(/\/\d+px-/, '/800px-');
    } else if (data.originalimage?.source) {
      imageUrl = data.originalimage.source;
    }

    if (!imageUrl) {
      return null;
    }

    return {
      url: imageUrl,
      source: 'wikipedia',
      query: searchTerm,
      thumbnail: thumbnailUrl || undefined
    };
  } catch {
    return null;
  }
}

/**
 * Generate Mapbox static map URL
 */
function generateMapboxImage(
  _templateId: string,
  templateName: string,
  region?: string,
  style: 'outdoors' | 'satellite' | 'streets' = 'outdoors'
): PhotoAlternative | null {
  const mapboxToken = getMapboxPublicToken();
  if (!mapboxToken) {
    return null;
  }

  // Determine coordinates based on template
  const regionCoords: Record<string, [number, number, number]> = {
    'Australia': [-25.2744, 133.7751, 4],
    'Victoria': [-37.4713, 144.7852, 6],
    'Queensland': [-20.9176, 142.7028, 5],
    'New South Wales': [-31.8401, 145.6121, 5],
    'Tasmania': [-41.4545, 145.9707, 6],
    'Western Australia': [-27.6728, 121.6283, 5],
    'United States': [37.0902, -95.7129, 4],
    'New Zealand': [-40.9006, 174.8860, 5],
  };

  let [lat, lng, zoom] = regionCoords['Australia'];

  if (region) {
    for (const [key, coords] of Object.entries(regionCoords)) {
      if (region.toLowerCase().includes(key.toLowerCase())) {
        [lat, lng, zoom] = coords;
        break;
      }
    }
  }

  const styleMap = {
    'outdoors': 'outdoors-v12',
    'satellite': 'satellite-streets-v12',
    'streets': 'streets-v12'
  };

  const marker = `pin-l-star+3b82f6(${lng},${lat})`;
  const url = `https://api.mapbox.com/styles/v1/mapbox/${styleMap[style]}/static/${marker}/${lng},${lat},${zoom},0/800x400@2x?access_token=${mapboxToken}`;

  return {
    url,
    source: 'mapbox',
    query: `${style} map - ${templateName}`
  };
}

/**
 * Get all available photo alternatives for a template
 * Returns cached alternatives or generates new ones
 */
export async function getPhotoAlternatives(
  templateId: string,
  templateName: string,
  region?: string
): Promise<PhotoAlternative[]> {
  const alternatives: PhotoAlternative[] = [];

  // Get Wikipedia variations for this template
  const searchTerms = WIKIPEDIA_SEARCH_VARIATIONS[templateId] || [];

  // Also generate generic search terms from template name
  const nameParts = templateName.split(/[-\s]+/);
  if (nameParts.length >= 2) {
    searchTerms.push(templateName);
  }

  // Fetch Wikipedia images in parallel (limit to 4)
  const wikiPromises = searchTerms.slice(0, 4).map(term => fetchWikipediaImage(term));
  const wikiResults = await Promise.all(wikiPromises);

  for (const result of wikiResults) {
    if (result) {
      alternatives.push(result);
    }
  }

  // Add Mapbox alternatives with different styles
  const mapboxOutdoors = generateMapboxImage(templateId, templateName, region, 'outdoors');
  if (mapboxOutdoors) alternatives.push(mapboxOutdoors);

  const mapboxSatellite = generateMapboxImage(templateId, templateName, region, 'satellite');
  if (mapboxSatellite) alternatives.push(mapboxSatellite);

  const mapboxStreets = generateMapboxImage(templateId, templateName, region, 'streets');
  if (mapboxStreets) alternatives.push(mapboxStreets);

  return alternatives;
}

/**
 * Get next photo alternative (cycles through available options)
 */
export async function getNextPhotoAlternative(
  templateId: string,
  templateName: string,
  currentIndex: number,
  region?: string
): Promise<{ alternative: PhotoAlternative | null; nextIndex: number; total: number }> {
  const alternatives = await getPhotoAlternatives(templateId, templateName, region);

  if (alternatives.length === 0) {
    return { alternative: null, nextIndex: 0, total: 0 };
  }

  const nextIndex = (currentIndex + 1) % alternatives.length;
  return {
    alternative: alternatives[nextIndex],
    nextIndex,
    total: alternatives.length
  };
}

export default {
  getPhotoAlternatives,
  getNextPhotoAlternative
};
