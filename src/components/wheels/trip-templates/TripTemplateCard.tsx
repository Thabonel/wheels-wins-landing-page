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

  const mapUrl = template.route?.mapPreview || 
    `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/pin-s+3b82f6(-122.4194,37.7749)/-122.4194,37.7749,10,0/400x200@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`;

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