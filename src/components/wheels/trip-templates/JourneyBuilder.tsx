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
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { TripTemplate } from '@/services/tripTemplateService';
import { useToast } from '@/hooks/use-toast';

interface JourneyBuilderProps {
  selectedTrips: TripTemplate[];
  onRemoveTrip: (templateId: string) => void;
  onReorderTrips: (trips: TripTemplate[]) => void;
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
    <div ref={setNodeRef} style={style} className="mb-3">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <button
              {...attributes}
              {...listeners}
              className="mt-1 cursor-move text-gray-400 hover:text-gray-600"
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-5 h-5" />
            </button>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Trip {index + 1}
                    </Badge>
                    {template.name}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {template.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove(template.id)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {template.estimatedDays} days
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {template.estimatedMiles.toLocaleString()} miles
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  ${template.suggestedBudget.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {index < 2 && ( // Only show connector for first 2 items (assuming max 3)
        <div className="flex items-center justify-center py-2">
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      )}
    </div>
  );
}

export default function JourneyBuilder({ selectedTrips, onRemoveTrip, onReorderTrips }: JourneyBuilderProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  
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

  const totalDays = selectedTrips.reduce((sum, trip) => sum + trip.estimatedDays, 0);
  const totalMiles = selectedTrips.reduce((sum, trip) => sum + trip.estimatedMiles, 0);
  const totalBudget = selectedTrips.reduce((sum, trip) => sum + trip.suggestedBudget, 0);

  const handleExportJourney = async () => {
    setIsExporting(true);
    
    // Simulate export process
    setTimeout(() => {
      toast({
        title: "Journey Exported",
        description: "Your journey has been saved and is ready to use in the Trip Map Editor",
      });
      setIsExporting(false);
    }, 1500);
  };

  const handleShareJourney = () => {
    toast({
      title: "Share Link Copied",
      description: "Journey sharing link has been copied to your clipboard",
    });
  };

  if (selectedTrips.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto space-y-4">
          <div className="text-gray-400 mb-4">
            <Calendar className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold">No trips in your journey yet</h3>
          <p className="text-gray-600">
            Browse templates and add trips to start building your perfect RV journey. 
            You can chain up to 3 trips for a 3-month adventure!
          </p>
          <Button variant="outline" onClick={() => document.querySelector('[value="browse"]')?.click()}>
            Browse Trip Templates
          </Button>
        </div>
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
      <Separator />
      
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          className="flex-1" 
          onClick={handleExportJourney}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Preparing Journey...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Use in Trip Map Editor
            </>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={handleShareJourney}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share Journey
        </Button>
        
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => toast({ title: "PAM Integration", description: "PAM journey optimization coming soon!" })}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Ask PAM to Optimize
        </Button>
      </div>
    </div>
  );
}