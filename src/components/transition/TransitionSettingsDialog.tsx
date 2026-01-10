import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { TransitionProfile } from '@/types/transition.types';

interface TransitionSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: TransitionProfile;
  onUpdate: (updatedProfile: TransitionProfile) => void;
}

export function TransitionSettingsDialog({
  open,
  onOpenChange,
  profile,
  onUpdate,
}: TransitionSettingsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    departure_date: profile.departure_date || '',
    current_phase: profile.current_phase || 'planning',
    transition_type: profile.transition_type || 'full_time',
    motivation: profile.motivation || '',
    is_enabled: profile.is_enabled,
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('No authenticated user');
      }

      // Use upsert to insert or update
      const { data: updatedProfile, error } = await supabase
        .from('transition_profiles')
        .upsert({
          user_id: userData.user.id,
          departure_date: formData.departure_date || null,
          current_phase: formData.current_phase,
          transition_type: formData.transition_type,
          motivation: formData.motivation || null,
          is_enabled: formData.is_enabled,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Settings updated successfully');

      if (updatedProfile) {
        onUpdate(updatedProfile);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transition Settings</DialogTitle>
          <DialogDescription>
            Update your transition details. You can change these anytime as your plans evolve.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Departure Date */}
          <div className="space-y-2">
            <Label htmlFor="departure_date">Departure Date</Label>
            <Input
              id="departure_date"
              type="date"
              value={formData.departure_date}
              onChange={(e) =>
                setFormData({ ...formData, departure_date: e.target.value })
              }
            />
            <p className="text-sm text-gray-500">
              When do you plan to start your RV journey? Leave blank if unsure.
            </p>
          </div>

          {/* Transition Type */}
          <div className="space-y-2">
            <Label htmlFor="transition_type">Transition Type</Label>
            <Select
              value={formData.transition_type}
              onValueChange={(value) =>
                setFormData({ ...formData, transition_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">Full-Time RV Living</SelectItem>
                <SelectItem value="part_time">Part-Time RV Travel</SelectItem>
                <SelectItem value="seasonal">Seasonal RVing</SelectItem>
                <SelectItem value="exploring">Just Exploring</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Current Phase */}
          <div className="space-y-2">
            <Label htmlFor="current_phase">Current Phase</Label>
            <Select
              value={formData.current_phase}
              onValueChange={(value) =>
                setFormData({ ...formData, current_phase: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning (Research & Dreaming)</SelectItem>
                <SelectItem value="preparing">Preparing (Taking Action)</SelectItem>
                <SelectItem value="launching">Launching (Final Countdown)</SelectItem>
                <SelectItem value="on_road">On the Road!</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Motivation */}
          <div className="space-y-2">
            <Label htmlFor="motivation">Why are you doing this?</Label>
            <Textarea
              id="motivation"
              value={formData.motivation}
              onChange={(e) =>
                setFormData({ ...formData, motivation: e.target.value })
              }
              placeholder="Freedom, adventure, simplicity, financial reasons..."
              rows={3}
            />
            <p className="text-sm text-gray-500">
              Your "why" will keep you motivated through challenges
            </p>
          </div>

          {/* Module Enabled */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_enabled"
              checked={formData.is_enabled}
              onChange={(e) =>
                setFormData({ ...formData, is_enabled: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="is_enabled" className="font-normal">
              Show Transition Navigator in navigation menu
            </Label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
