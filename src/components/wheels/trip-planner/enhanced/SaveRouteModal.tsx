import React, { useState } from 'react';
import { X, Save, MapPin, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface SaveRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  routeData: {
    start: string;
    end: string;
    waypoints?: string[];
    distance: number;
    duration: number;
    coordinates?: any;
    gpxData?: string;
  };
}

export const SaveRouteModal: React.FC<SaveRouteModalProps> = ({
  isOpen,
  onClose,
  routeData
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: `${routeData.start} to ${routeData.end}`,
    description: '',
    difficulty: 'moderate',
    isPublic: false,
    tags: '',
    estimatedDays: Math.ceil(routeData.duration / (8 * 60)) // Convert minutes to days
  });

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save routes",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    
    try {
      const { data, error } = await supabase
        .from('saved_trips')
        .insert({
          user_id: user.id,
          name: formData.name,
          description: formData.description,
          start_location: routeData.start,
          end_location: routeData.end,
          waypoints: routeData.waypoints || [],
          distance: routeData.distance,
          duration: routeData.duration,
          difficulty: formData.difficulty,
          is_public: formData.isPublic,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          route_data: routeData.coordinates,
          gpx_data: routeData.gpxData,
          estimated_days: formData.estimatedDays
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Route Saved!",
        description: `"${formData.name}" has been saved to your trips list.`
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving route:', error);
      toast({
        title: "Save Failed",
        description: "Could not save the route. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save Trip
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Trip Name */}
          <div>
            <Label htmlFor="trip-name">Trip Name</Label>
            <Input
              id="trip-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter a memorable name for your trip"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your trip, highlights, or notes..."
              rows={3}
            />
          </div>

          {/* Trip Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
              >
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="challenging">Challenging</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="days">Estimated Days</Label>
              <Input
                id="days"
                type="number"
                min="1"
                value={formData.estimatedDays}
                onChange={(e) => setFormData({ ...formData, estimatedDays: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="scenic, offroad, family-friendly, camping"
            />
          </div>

          {/* Trip Stats */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-medium text-sm text-gray-700 mb-2">Trip Statistics</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{routeData.start} → {routeData.end}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{routeData.distance.toFixed(1)} miles • {Math.floor(routeData.duration / 60)}h {routeData.duration % 60}m</span>
            </div>
            {routeData.waypoints && routeData.waypoints.length > 0 && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">{routeData.waypoints.length} waypoints</span>
              </div>
            )}
          </div>

          {/* Public Sharing */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-600" />
              <Label htmlFor="public" className="text-sm cursor-pointer">
                Share with community
              </Label>
            </div>
            <Switch
              id="public"
              checked={formData.isPublic}
              onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-green-700 hover:bg-green-800"
            disabled={saving || !formData.name.trim()}
          >
            {saving ? 'Saving...' : 'Save Trip'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SaveRouteModal;