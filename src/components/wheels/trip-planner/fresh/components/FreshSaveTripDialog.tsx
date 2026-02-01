import React, { useState, useEffect } from 'react';
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
import { Save, Loader2, Edit3, Plus, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { tripService } from '@/services/tripService';
import { useAuth } from '@/context/AuthContext';
import { transformToGeoJSONLineString, createFallbackGeometry } from '@/utils/routeDataTransformers';

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
  editMode?: boolean;
  originalTripData?: any;
}

export default function FreshSaveTripDialog({
  isOpen,
  onClose,
  tripData,
  onSaveSuccess,
  editMode = false,
  originalTripData = null
}: FreshSaveTripDialogProps) {
  const { user } = useAuth();
  const [tripName, setTripName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveAsNew, setSaveAsNew] = useState(false);

  // Initialize form with existing data when in edit mode
  useEffect(() => {
    if (editMode && originalTripData) {
      setTripName(originalTripData.title || '');
      setDescription(originalTripData.description || '');
      setSaveAsNew(false);
    } else {
      // Reset for new trip
      setTripName('');
      setDescription('');
      setSaveAsNew(false);
    }
  }, [editMode, originalTripData, isOpen]);

  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in to save trips');
      return;
    }

    // PREMIUM SAAS: Auto-generate trip name if user didn't provide one
    let finalTripName = tripName.trim();
    if (!finalTripName) {
      const startLocation = tripData.waypoints?.[0]?.name || 'Start';
      const endLocation = tripData.waypoints?.[tripData.waypoints.length - 1]?.name || 'End';
      const shortStart = startLocation.split(',')[0]; // Take first part before comma
      const shortEnd = endLocation.split(',')[0];
      finalTripName = `${shortStart} to ${shortEnd}`;
    }

    setIsSaving(true);
    
    try {
      console.log('🗂️ Preparing trip data for save:', tripData);

      // Transform and validate route geometry for proper storage
      let routeGeometry = null;
      if (tripData.route?.geometry) {
        routeGeometry = transformToGeoJSONLineString(tripData.route.geometry);
        console.log('✅ Transformed route geometry for storage:', routeGeometry);
      } else if (tripData.waypoints?.length >= 2) {
        // Create fallback geometry from waypoints
        const waypointData = tripData.waypoints.map(wp => ({
          lat: wp.coordinates[1],
          lng: wp.coordinates[0]
        }));
        routeGeometry = createFallbackGeometry(waypointData);
        console.log('🔄 Created fallback geometry from waypoints:', routeGeometry);
      }

      // PREMIUM SAAS: Ensure we always have valid trip data to save
      const enhancedTripData = {
        ...tripData,
        // Add estimated data if route calculation failed
        distance: tripData.distance || (tripData.waypoints?.length >= 2 ?
          calculateEstimatedDistance(tripData.waypoints) : 0),
        duration: tripData.duration || (tripData.distance ?
          Math.round(tripData.distance * 0.045) : 0), // 45 seconds per km estimate
        // Ensure we have proper route structure with validated geometry
        route: routeGeometry ? {
          type: 'LineString',
          coordinates: routeGeometry.coordinates,
          ...(tripData.route || {})
        } : (tripData.waypoints?.length >= 2 ? {
          type: 'estimated',
          waypoints: tripData.waypoints
        } : null)
      };

      console.log('🗂️ Enhanced trip data ready for save:', enhancedTripData);

      let result;
      const tripDataToSave = {
        title: finalTripName,
        description: description.trim() || undefined,
        route_data: enhancedTripData,
        status: 'planning',
        privacy_level: 'private'
      };

      // Determine if this is an update or new save
      if (editMode && originalTripData && !saveAsNew) {
        // Update existing trip
        console.log('🔄 Updating existing trip:', originalTripData.id);
        result = await tripService.updateTrip(originalTripData.id, tripDataToSave);
      } else {
        // Save as new trip (either new trip or save-as-new)
        console.log('💾 Saving as new trip');
        result = await tripService.saveTrip(user.id, tripDataToSave);
      }

      // Check if the save was actually successful
      if (result.success && result.data) {
        toast.success(`"${finalTripName}" saved successfully!`);
        if (onSaveSuccess) {
          onSaveSuccess(result.data);
        }
        onClose();
        // Reset form
        setTripName('');
        setDescription('');
      } else {
        // Handle database save failure
        console.error('Trip save failed:', result.error);
        toast.error(`Failed to save "${finalTripName}". ${result.error?.message || 'Please check your connection and try again.'}`);
      }

    } catch (error) {
      console.error('Error saving trip:', error);
      toast.error(`Failed to save "${finalTripName}". Please try again.`);
      // Don't close dialog on error so user can retry
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

  // Helper function: Calculate estimated distance between waypoints
  const calculateEstimatedDistance = (waypoints: any[]): number => {
    if (!waypoints || waypoints.length < 2) return 0;

    const R = 6371000; // Earth's radius in meters
    let totalDistance = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const coord1 = waypoints[i].coordinates;
      const coord2 = waypoints[i + 1].coordinates;

      const lat1Rad = (coord1[1] * Math.PI) / 180;
      const lat2Rad = (coord2[1] * Math.PI) / 180;
      const deltaLatRad = ((coord2[1] - coord1[1]) * Math.PI) / 180;
      const deltaLonRad = ((coord2[0] - coord1[0]) * Math.PI) / 180;

      const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) *
        Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      totalDistance += R * c;
    }

    return totalDistance;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editMode && !saveAsNew ? (
              <>
                <Edit3 className="w-5 h-5" />
                Update Trip
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Trip
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {editMode && !saveAsNew ? (
              <>
                Update your existing trip "{originalTripData?.title}" with your changes.
                {originalTripData?.metadata?.created_by === 'pam_ai' && (
                  <div className="flex items-center gap-1 mt-1 text-purple-600">
                    <Bot className="w-3 h-3" />
                    <span className="text-xs">Originally created by PAM AI</span>
                  </div>
                )}
              </>
            ) : (
              'Save your planned route to access it later or share with friends.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {editMode && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Save Options</Label>
              <div className="grid grid-cols-1 gap-2">
                <div
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    !saveAsNew ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSaveAsNew(false)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      !saveAsNew ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`}>
                      {!saveAsNew && <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5"></div>}
                    </div>
                    <Edit3 className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Update existing trip</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-6 mt-1">
                    Save changes to "{originalTripData?.title}"
                  </p>
                </div>
                <div
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    saveAsNew ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSaveAsNew(true)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      saveAsNew ? 'border-green-500 bg-green-500' : 'border-gray-300'
                    }`}>
                      {saveAsNew && <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5"></div>}
                    </div>
                    <Plus className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Save as new trip</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-6 mt-1">
                    Create a new trip copy with your changes
                  </p>
                </div>
              </div>
            </div>
          )}

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
            disabled={isSaving}
            className={editMode && !saveAsNew ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {editMode && !saveAsNew ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              <>
                {editMode && !saveAsNew ? (
                  <>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Update Trip
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Trip
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}