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
  Mountain,
  Trees,
  Waves
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TripTemplate } from '@/services/tripTemplateService';

interface TripTemplateCardProps {
  template: TripTemplate;
  onAddToJourney: (template: TripTemplate) => void;
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
  isInJourney 
}: TripTemplateCardProps) {
  const difficultyColor = {
    'beginner': 'bg-green-100 text-green-800',
    'intermediate': 'bg-yellow-100 text-yellow-800', 
    'advanced': 'bg-red-100 text-red-800'
  };

  // Use template image if available, otherwise generate dynamic map based on location
  const getTemplateImage = () => {
    // If template has an image URL, use it
    if (template.imageUrl || template.image_url) {
      return template.imageUrl || template.image_url;
    }
    
    // If template has thumbnail for performance
    if (template.thumbnailUrl || template.thumbnail_url) {
      return template.thumbnailUrl || template.thumbnail_url;
    }
    
    // Generate dynamic map based on template location
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!mapboxToken) {
      return '/api/placeholder/400/200'; // Fallback placeholder
    }
    
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
    
    // Check region
    if (template.region) {
      for (const [region, coords] of Object.entries(regionCoords)) {
        if (template.region.toLowerCase().includes(region.toLowerCase())) {
          [centerLat, centerLon, zoom] = coords;
          break;
        }
      }
    }
    
    // Choose map style based on category
    let mapStyle = 'outdoors-v12';
    if (template.category === 'coastal') {
      mapStyle = 'satellite-streets-v12';
    } else if (template.category === 'outback' || template.category === 'desert') {
      mapStyle = 'satellite-v9';
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
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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

        {/* Action Button */}
        <Button 
          onClick={() => onAddToJourney(template)}
          disabled={isInJourney}
          className="w-full"
          variant={isInJourney ? "secondary" : "default"}
        >
          {isInJourney ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Added to Journey
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Add to Journey
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}