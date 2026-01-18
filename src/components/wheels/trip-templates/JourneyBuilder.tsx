import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  GripVertical,
  X,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  ChevronRight,
  Download,
  Share2,
  AlertCircle
} from 'lucide-react';
import { TripTemplate } from '@/services/tripTemplateService';
import { useToast } from '@/hooks/use-toast';

interface JourneyBuilderProps {
  selectedTrips: TripTemplate[];
  onRemoveTrip: (templateId: string) => void;
  onReorderTrips: (trips: TripTemplate[]) => void;
  onUseJourney: () => void;
}

interface SortableTripItemProps {
  template: TripTemplate;
  onRemove: (id: string) => void;
  index: number;
}

function SortableTripItem({ template, onRemove, index }: SortableTripItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: template.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-3 ${isDragging ? 'z-50' : ''}`}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <button
              className="cursor-grab touch-none mt-1"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-5 h-5 text-gray-400" />
            </button>
            
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold">{template.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {template.estimatedDays} days
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {template.estimatedMiles} miles
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      ${template.suggestedBudget}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove(template.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {index < 2 && (
            <div className="mt-3 pt-3 border-t text-center">
              <ChevronRight className="w-5 h-5 text-gray-400 inline-block" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function JourneyBuilder({ 
  selectedTrips, 
  onRemoveTrip, 
  onReorderTrips,
  onUseJourney
}: JourneyBuilderProps) {
  const { toast } = useToast();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = selectedTrips.findIndex((trip) => trip.id === active.id);
      const newIndex = selectedTrips.findIndex((trip) => trip.id === over.id);

      onReorderTrips(arrayMove(selectedTrips, oldIndex, newIndex));
    }
  };

  const handleShareJourney = () => {
    const journeyText = selectedTrips.map((trip, index) => 
      `${index + 1}. ${trip.name} (${trip.estimatedDays} days)`
    ).join('\n');
    
    navigator.clipboard.writeText(journeyText);
    toast({
      title: "Journey Copied",
      description: "Your journey details have been copied to clipboard",
    });
  };

  const handleDownloadItinerary = () => {
    const itinerary = selectedTrips.map((trip, index) => {
      return `Trip ${index + 1}: ${trip.name}
Duration: ${trip.estimatedDays} days
Distance: ${trip.estimatedMiles} miles
Budget: $${trip.suggestedBudget}
Highlights: ${trip.highlights.join(', ')}
`;
    }).join('\n---\n');

    const blob = new Blob([itinerary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rv-journey-itinerary.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate totals
  const totalDays = selectedTrips.reduce((sum, trip) => sum + trip.estimatedDays, 0);
  const totalMiles = selectedTrips.reduce((sum, trip) => sum + trip.estimatedMiles, 0);
  const totalBudget = selectedTrips.reduce((sum, trip) => sum + trip.suggestedBudget, 0);

  if (selectedTrips.length === 0) {
    return (
      <div className="text-center py-12">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No trips in your journey yet</h3>
            <p className="text-gray-600">
              Add trips from the templates above to start building your perfect RV journey. 
              You can chain up to 3 trips for a 3-month adventure!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Journey Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Journey Summary</span>
            <Badge variant="secondary" className="text-sm">
              {selectedTrips.length} {selectedTrips.length === 1 ? 'Trip' : 'Trips'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{totalDays}</p>
              <p className="text-sm text-gray-600">Total Days</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{totalMiles.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Total Miles</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">${totalBudget.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Estimated Budget</p>
            </div>
          </div>
          
          {selectedTrips.length >= 3 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Maximum journey length reached</p>
                <p className="text-yellow-700">You've created a 3-month journey! Remove a trip to add a different one.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trip Chain */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Trip Chain</h3>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={selectedTrips.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {selectedTrips.map((trip, index) => (
              <SortableTripItem
                key={trip.id}
                template={trip}
                onRemove={onRemoveTrip}
                index={index}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Button
          variant="outline"
          onClick={handleShareJourney}
          className="flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share Journey
        </Button>
        <Button
          variant="outline"
          onClick={handleDownloadItinerary}
          className="flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Itinerary
        </Button>
        <Button
          onClick={onUseJourney}
          className="flex items-center justify-center gap-2"
        >
          <ChevronRight className="w-4 h-4" />
          Use This Journey
        </Button>
      </div>
    </div>
  );
}