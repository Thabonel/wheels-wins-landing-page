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

  return (
    <Card className="hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Category banner - replaces photo */}
      <div className="flex items-center justify-between px-4 py-3 bg-stone-50 border-b">
        <Badge variant="secondary" className="flex items-center gap-1">
          {categoryIcons[template.category] || categoryIcons.general}
          <span>{template.category}</span>
        </Badge>
        <Badge className={cn(difficultyColor[template.difficulty])}>
          {template.difficulty}
        </Badge>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-1">{template.name}</CardTitle>
        <p className="text-sm text-gray-600 line-clamp-3">
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