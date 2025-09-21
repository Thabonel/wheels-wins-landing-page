import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Star,
  Plus,
  Check,
  ChevronRight,
  Mountain,
  Trees,
  Waves
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TripTemplate } from '@/services/tripTemplateService';
import { googleImageService } from '@/services/googleImageService';
import TripRatingWidget from './TripRatingWidget';

interface TripTemplateCardProps {
  template: TripTemplate;
  onAddToJourney: (template: TripTemplate) => void;
  onUseTemplate: (template: TripTemplate) => void;
  isInJourney: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'coastal': <Waves className="w-4 h-4" />,
  'mountains': <Mountain className="w-4 h-4" />,
  'national-parks': <Trees className="w-4 h-4" />,
  'scenic': <MapPin className="w-4 h-4" />,
  'cultural': <Star className="w-4 h-4" />,
  'outback': <Mountain className="w-4 h-4" />,
  'general': <MapPin className="w-4 h-4" />
};

export default function TripTemplateCard({ 
  template, 
  onAddToJourney,
  onUseTemplate, 
  isInJourney 
}: TripTemplateCardProps) {
  const difficultyColor = {
    'beginner': 'bg-green-100 text-green-800',
    'intermediate': 'bg-yellow-100 text-yellow-800', 
    'advanced': 'bg-red-100 text-red-800'
  };

  // Image fallback chain: Database URL → Google Image Service → Mapbox Map → Placeholder
  const getTemplateImage = () => {
    // Priority 1: If template has media_urls array, use the first image
    if (template.media_urls && template.media_urls.length > 0) {
      return template.media_urls[0];
    }

    // Priority 2: If template has an image URL from database, use it
    if (template.imageUrl || template.image_url) {
      return template.imageUrl || template.image_url;
    }

    // Priority 3: If template has thumbnail from database for performance
    if (template.thumbnailUrl || template.thumbnail_url) {
      return template.thumbnailUrl || template.thumbnail_url;
    }

    // Priority 4: Try to get from Google Image Service (sync version)
    try {
      const { imageUrl } = googleImageService.getTemplateImageSync(template);
      if (imageUrl) {
        console.log(`📸 Using Google Image Service URL for ${template.id}`);
        return imageUrl;
      }
    } catch (error) {
      console.warn(`Failed to get image from Google Image Service for ${template.id}:`, error);
    }

    // Priority 5: Generate intelligent route-specific Mapbox map (excellent fallback!)
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.warn('No Mapbox token available for map generation');
      // Return a solid color fallback instead of placeholder service
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzBjNGE2ZSIvPjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QWR2ZW50dXJlIEF3YWl0czwvdGV4dD48L3N2Zz4=';
    }
    
    console.log(`Generating route-specific map for ${template.id}`);
    // Continue with the intelligent map generation below...
    
    // Determine map center based on region and highlights
    let centerLat = -25.2744; // Default to Australia
    let centerLon = 133.7751;
    let zoom = 4;
    
    // Region-specific coordinates
    const regionCoords: Record<string, [number, number, number]> = {
      'Australia': [-25.2744, 133.7751, 4],
      'Victoria': [-37.4713, 144.7852, 6],
      'Queensland': [-20.9176, 142.7028, 5],
      'New South Wales': [-31.8401, 145.6121, 5],
      'Tasmania': [-41.4545, 145.9707, 6],
      'Western Australia': [-27.6728, 121.6283, 5],
      'United States': [37.0902, -95.7129, 4],
      'Canada': [56.1304, -106.3468, 3],
      'New Zealand': [-40.9006, 174.8860, 5],
      'United Kingdom': [55.3781, -3.4360, 5],
    };
    
    // Location-specific coordinates for highlights
    const locationCoords: Record<string, [number, number, number]> = {
      'Great Barrier Reef': [-18.2871, 147.6992, 8],
      'Uluru': [-25.3444, 131.0369, 10],
      'Byron Bay': [-28.6434, 153.6122, 11],
      'Gold Coast': [-28.0167, 153.4000, 10],
      'Twelve Apostles': [-38.6662, 143.1044, 11],
      'Sydney': [-33.8688, 151.2093, 10],
      'Melbourne': [-37.8136, 144.9631, 10],
    };
    
    // Check template name for specific routes first
    const templateName = template.name.toLowerCase();
    if (templateName.includes('great ocean road')) {
      [centerLat, centerLon, zoom] = [-38.6662, 143.1044, 8]; // Twelve Apostles
    } else if (templateName.includes('big lap') || templateName.includes('around australia')) {
      [centerLat, centerLon, zoom] = [-25.2744, 133.7751, 3]; // Australia overview
    } else if (templateName.includes('red centre') || templateName.includes('uluru')) {
      [centerLat, centerLon, zoom] = [-25.3444, 131.0369, 9]; // Uluru
    } else if (templateName.includes('pacific coast')) {
      [centerLat, centerLon, zoom] = [-28.6434, 153.6122, 7]; // Byron Bay
    } else if (templateName.includes('tasmania') || templateName.includes('tassie')) {
      [centerLat, centerLon, zoom] = [-41.4545, 145.9707, 7]; // Tasmania center
    } else {
      // Check highlights for specific locations
      if (template.highlights && template.highlights.length > 0) {
        for (const highlight of template.highlights) {
          for (const [location, coords] of Object.entries(locationCoords)) {
            if (highlight.toLowerCase().includes(location.toLowerCase())) {
              [centerLat, centerLon, zoom] = coords;
              break;
            }
          }
        }
      }
    }
    
    // Check region with improved multi-region parsing
    if (template.region) {
      const regionString = template.region.toLowerCase();
      
      // Check for specific multi-region patterns first
      if (regionString.includes('victoria') && regionString.includes('south australia')) {
        // Great Ocean Road area
        [centerLat, centerLon, zoom] = [-38.4161, 143.1044, 7]; // Near Twelve Apostles
      } else if (regionString.includes('nsw') && regionString.includes('queensland')) {
        // Pacific Coast area
        [centerLat, centerLon, zoom] = [-28.6434, 153.6122, 6]; // Byron Bay area
      } else if (regionString.includes('northern territory') && regionString.includes('south australia')) {
        // Red Centre area
        [centerLat, centerLon, zoom] = [-25.3444, 131.0369, 8]; // Uluru area
      } else {
        // Single region matching
        for (const [region, coords] of Object.entries(regionCoords)) {
          if (regionString.includes(region.toLowerCase())) {
            [centerLat, centerLon, zoom] = coords;
            break;
          }
        }
      }
    }
    
    // Choose map style based on category and template name
    let mapStyle = 'outdoors-v12'; // Default
    const category = template.category || '';
    
    if (category.includes('coastal') || templateName.includes('ocean') || templateName.includes('pacific coast')) {
      mapStyle = 'satellite-streets-v12'; // Best for coastal views
    } else if (category.includes('outback') || templateName.includes('red centre') || templateName.includes('uluru')) {
      mapStyle = 'satellite-v9'; // Best for desert landscapes
    } else if (templateName.includes('big lap')) {
      mapStyle = 'streets-v12'; // Overview style for country-wide routes
    } else if (category.includes('scenic') || category.includes('mountain')) {
      mapStyle = 'outdoors-v12'; // Best for scenic routes
    }
    
    // Create marker for the location
    const marker = `pin-l-star+3b82f6(${centerLon},${centerLat})`;
    
    return `https://api.mapbox.com/styles/v1/mapbox/${mapStyle}/static/${marker}/${centerLon},${centerLat},${zoom},0/400x200@2x?access_token=${mapboxToken}`;
  };
  
  const mapUrl = template.route?.mapPreview || getTemplateImage();

  return (
    <Card className="hover:shadow-lg transition-all duration-200 overflow-hidden group">
      {/* Static Map Preview */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={mapUrl}
          alt={`${template.name} route map`}
          width={400}
          height={192}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute top-2 right-2">
          <Badge className={cn(difficultyColor[template.difficulty])}>
            {template.difficulty}
          </Badge>
        </div>
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-white/90">
            {categoryIcons[template.category] || categoryIcons.general}
            <span className="ml-1">{template.category}</span>
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-1">{template.name}</CardTitle>
        <p className="text-sm text-gray-600 line-clamp-2">
          {template.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Trip Stats */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{template.estimatedDays}d</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{template.estimatedMiles.toLocaleString()}mi</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <DollarSign className="w-4 h-4" />
            <span>${template.suggestedBudget.toLocaleString()}</span>
          </div>
        </div>

        {/* Rating */}
        <TripRatingWidget
          templateId={template.id}
          averageRating={template.average_rating || 0}
          totalRatings={template.total_ratings || 0}
          showDetails={true}
        />

        {/* Highlights */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-700">Highlights:</p>
          <div className="flex flex-wrap gap-1">
            {template.highlights.slice(0, 3).map((highlight, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {highlight}
              </Badge>
            ))}
            {template.highlights.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{template.highlights.length - 3}
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={() => onAddToJourney(template)}
            disabled={isInJourney}
            className="flex-1"
            variant={isInJourney ? "secondary" : "outline"}
          >
            {isInJourney ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                In Journey
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add to Journey
              </>
            )}
          </Button>
          <Button 
            onClick={() => onUseTemplate(template)}
            className="flex-1"
            variant="default"
          >
            Use Now
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}