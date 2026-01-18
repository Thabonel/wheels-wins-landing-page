import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MapPin, Clock, Loader2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { fetchTripTemplatesForRegion, TripTemplate, incrementTemplateUsage } from '@/services/tripTemplateService';
import { useRegion } from '@/context/RegionContext';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: string;
  distance: string;
  waypoints: Array<{
    name: string;
    coordinates: [number, number];
    type: 'origin' | 'destination' | 'waypoint';
  }>;
  tags: string[];
}

interface FreshTemplatesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: Template) => void;
}


const CATEGORY_COLORS: Record<string, string> = {
  scenic: 'bg-green-100 text-green-800',
  coastal: 'bg-blue-100 text-blue-800',
  beach: 'bg-yellow-100 text-yellow-800',
  outback: 'bg-orange-100 text-orange-800',
  island: 'bg-purple-100 text-purple-800'
};

export default function FreshTemplatesPanel({ 
  isOpen, 
  onClose, 
  onApplyTemplate 
}: FreshTemplatesPanelProps) {
  const { region } = useRegion();
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, region]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const fetchedTemplates = await fetchTripTemplatesForRegion(region);
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTemplate = async (template: TripTemplate) => {
    // Convert TripTemplate to the format expected by FreshTripPlanner
    const waypoints = [];
    
    if (template.route) {
      // Add origin
      if (template.route.origin) {
        waypoints.push({
          name: template.route.origin.name,
          coordinates: template.route.origin.coords as [number, number],
          type: 'origin' as const
        });
      }
      
      // Add waypoints
      if (template.route.waypoints) {
        template.route.waypoints.forEach((wp: any) => {
          waypoints.push({
            name: wp.name,
            coordinates: wp.coords as [number, number],
            type: 'waypoint' as const
          });
        });
      }
      
      // Add destination
      if (template.route.destination) {
        waypoints.push({
          name: template.route.destination.name,
          coordinates: template.route.destination.coords as [number, number],
          type: 'destination' as const
        });
      }
    }

    const formattedTemplate: Template = {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      duration: `${template.estimatedDays} day${template.estimatedDays > 1 ? 's' : ''}`,
      distance: `${template.estimatedMiles} km`,
      waypoints,
      tags: template.tags
    };

    // Increment usage count
    await incrementTemplateUsage(template.id);
    
    onApplyTemplate(formattedTemplate);
    toast.success(`Applied "${template.name}" template`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Card className="absolute top-16 right-2 z-[10001] w-96 max-h-[calc(100vh-100px)] overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Trip Templates
          </CardTitle>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label="Close templates panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 pt-0 text-sm text-gray-600">
          Quick-start your journey with these popular routes
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading templates...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-gray-500">No templates available for your region</p>
            <p className="text-xs text-gray-400 mt-2">Try changing your region in settings</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto px-4 pb-4 space-y-3">
            {templates.map((template) => {
              const waypointCount = (template.route?.waypoints?.length || 0) + 2; // +2 for origin and destination
              
              return (
                <div
                  key={template.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{template.name}</h4>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {template.description}
                      </p>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`ml-2 text-xs ${CATEGORY_COLORS[template.category] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {template.category}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {template.estimatedDays} day{template.estimatedDays > 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {template.estimatedMiles} km
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      ${template.suggestedBudget}
                    </span>
                    <span>{waypointCount} stops</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  {template.difficulty && (
                    <div className="mb-2">
                      <Badge 
                        variant={template.difficulty === 'beginner' ? 'default' : 
                                template.difficulty === 'intermediate' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {template.difficulty}
                      </Badge>
                    </div>
                  )}
                  
                  <Button
                    onClick={() => handleApplyTemplate(template)}
                    size="sm"
                    className="w-full"
                  >
                    Use This Template
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="border-t p-4">
          <p className="text-xs text-gray-500">
            💡 Tip: Templates can be customized after applying
          </p>
        </div>
      </CardContent>
    </Card>
  );
}