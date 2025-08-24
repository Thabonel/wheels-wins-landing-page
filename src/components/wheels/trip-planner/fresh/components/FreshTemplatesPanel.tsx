import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MapPin, Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

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

const TRIP_TEMPLATES: Template[] = [
  {
    id: 'sydney-blue-mountains',
    name: 'Sydney to Blue Mountains',
    description: 'Scenic drive through the Blue Mountains with stops at key lookouts',
    category: 'scenic',
    duration: '1 day',
    distance: '200 km',
    waypoints: [
      { name: 'Sydney CBD', coordinates: [151.2093, -33.8688], type: 'origin' },
      { name: 'Echo Point Lookout', coordinates: [150.3120, -33.7320], type: 'waypoint' },
      { name: 'Scenic World', coordinates: [150.3019, -33.7290], type: 'waypoint' },
      { name: 'Leura', coordinates: [150.3340, -33.7120], type: 'destination' }
    ],
    tags: ['scenic', 'mountains', 'day-trip']
  },
  {
    id: 'great-ocean-road',
    name: 'Great Ocean Road Adventure',
    description: 'Melbourne to Twelve Apostles along the famous coastal route',
    category: 'coastal',
    duration: '2 days',
    distance: '470 km',
    waypoints: [
      { name: 'Melbourne', coordinates: [144.9631, -37.8136], type: 'origin' },
      { name: 'Torquay', coordinates: [144.3247, -38.3319], type: 'waypoint' },
      { name: 'Lorne', coordinates: [143.9755, -38.5395], type: 'waypoint' },
      { name: 'Apollo Bay', coordinates: [143.6723, -38.7596], type: 'waypoint' },
      { name: 'Twelve Apostles', coordinates: [143.1047, -38.6659], type: 'destination' }
    ],
    tags: ['coastal', 'multi-day', 'iconic']
  },
  {
    id: 'brisbane-gold-coast',
    name: 'Brisbane to Gold Coast',
    description: 'Quick trip to the beaches with theme park options',
    category: 'beach',
    duration: '1 day',
    distance: '100 km',
    waypoints: [
      { name: 'Brisbane CBD', coordinates: [153.0251, -27.4698], type: 'origin' },
      { name: 'Dreamworld', coordinates: [153.3124, -27.8637], type: 'waypoint' },
      { name: 'Surfers Paradise', coordinates: [153.4292, -28.0173], type: 'destination' }
    ],
    tags: ['beach', 'theme-parks', 'family']
  },
  {
    id: 'red-centre-explorer',
    name: 'Red Centre Explorer',
    description: 'Alice Springs to Uluru through the Australian Outback',
    category: 'outback',
    duration: '3 days',
    distance: '450 km',
    waypoints: [
      { name: 'Alice Springs', coordinates: [133.8807, -23.6980], type: 'origin' },
      { name: 'MacDonnell Ranges', coordinates: [133.5000, -23.7000], type: 'waypoint' },
      { name: 'Kings Canyon', coordinates: [131.5667, -24.2667], type: 'waypoint' },
      { name: 'Uluru', coordinates: [131.0369, -25.3444], type: 'destination' }
    ],
    tags: ['outback', 'multi-day', 'adventure']
  },
  {
    id: 'tasmania-circuit',
    name: 'Tasmania Circuit',
    description: 'Hobart to Cradle Mountain scenic loop',
    category: 'island',
    duration: '5 days',
    distance: '800 km',
    waypoints: [
      { name: 'Hobart', coordinates: [147.3257, -42.8821], type: 'origin' },
      { name: 'Port Arthur', coordinates: [147.8506, -43.1450], type: 'waypoint' },
      { name: 'Freycinet', coordinates: [148.2906, -42.1211], type: 'waypoint' },
      { name: 'Launceston', coordinates: [147.1441, -41.4332], type: 'waypoint' },
      { name: 'Cradle Mountain', coordinates: [145.9388, -41.6820], type: 'destination' }
    ],
    tags: ['island', 'multi-day', 'nature']
  }
];

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
  if (!isOpen) return null;

  const handleApplyTemplate = (template: Template) => {
    onApplyTemplate(template);
    toast.success(`Applied "${template.name}" template`);
    onClose();
  };

  return (
    <Card className="absolute top-16 right-2 z-[10001] w-96 max-h-[calc(100vh-100px)] overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
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
        
        <div className="max-h-[500px] overflow-y-auto px-4 pb-4 space-y-3">
          {TRIP_TEMPLATES.map((template) => (
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
                  className={`ml-2 text-xs ${CATEGORY_COLORS[template.category] || ''}`}
                >
                  {template.category}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {template.duration}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {template.distance}
                </span>
                <span>{template.waypoints.length} stops</span>
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
              
              <Button
                onClick={() => handleApplyTemplate(template)}
                size="sm"
                className="w-full"
              >
                Use This Template
              </Button>
            </div>
          ))}
        </div>
        
        <div className="border-t p-4">
          <p className="text-xs text-gray-500">
            💡 Tip: Templates can be customized after applying
          </p>
        </div>
      </CardContent>
    </Card>
  );
}