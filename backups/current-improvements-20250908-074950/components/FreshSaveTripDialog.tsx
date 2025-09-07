import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { tripService } from '@/services/tripService';
import { useAuth } from '@/context/AuthContext';

interface FreshSaveTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tripData: {
    waypoints: any[];
    route?: any;
    profile?: string;
    distance?: number;
    duration?: number;
  };
  onSaveSuccess?: (savedTrip: any) => void;
}

export default function FreshSaveTripDialog({
  isOpen,
  onClose,
  tripData,
  onSaveSuccess
}: FreshSaveTripDialogProps) {
  const { user } = useAuth();
  const [tripName, setTripName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!tripName.trim()) {
      toast.error('Please enter a trip name');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to save trips');
      return;
    }

    setIsSaving(true);
    
    try {
      const result = await tripService.saveTrip(user.id, {
        title: tripName.trim(),
        description: description.trim() || undefined,
        route_data: tripData,
        status: 'draft',
        privacy_level: 'private'
      });

      if (result.success) {
        toast.success('Trip saved successfully!');
        if (onSaveSuccess) {
          onSaveSuccess(result.data);
        }
        onClose();
        // Reset form
        setTripName('');
        setDescription('');
      } else {
        throw new Error('Failed to save trip');
      }
    } catch (error) {
      console.error('Error saving trip:', error);
      toast.error('Failed to save trip. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return 'N/A';
    const km = meters / 1000;
    return km > 1 ? `${km.toFixed(1)} km` : `${meters.toFixed(0)} m`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save Trip
          </DialogTitle>
          <DialogDescription>
            Save your planned route to access it later or share with friends.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="trip-name">Trip Name *</Label>
            <Input
              id="trip-name"
              placeholder="e.g., Weekend Road Trip to Byron Bay"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add notes about your trip, stops, or things to remember..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              rows={3}
            />
          </div>

          <div className="rounded-lg bg-gray-50 p-3 space-y-1 text-sm">
            <div className="font-medium text-gray-700">Trip Summary</div>
            <div className="text-gray-600">
              • {tripData.waypoints.length} stops
            </div>
            <div className="text-gray-600">
              • Distance: {formatDistance(tripData.distance)}
            </div>
            <div className="text-gray-600">
              • Duration: {formatDuration(tripData.duration)}
            </div>
            <div className="text-gray-600">
              • Route type: {tripData.profile || 'driving'}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving || !tripName.trim()}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Trip
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}