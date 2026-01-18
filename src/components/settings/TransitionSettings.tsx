import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Archive } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const TransitionSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [isEnabled, setIsEnabled] = useState(true);
  const [hideDaysAfterDeparture, setHideDaysAfterDeparture] = useState(30);
  const [autoHideAfterDeparture, setAutoHideAfterDeparture] = useState(false);
  const [archivedAt, setArchivedAt] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('transition_profiles')
          .select('is_enabled, hide_days_after_departure, auto_hide_after_departure, archived_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setIsEnabled(data.is_enabled ?? true);
          setHideDaysAfterDeparture(data.hide_days_after_departure ?? 30);
          setAutoHideAfterDeparture(data.auto_hide_after_departure ?? false);
          setArchivedAt(data.archived_at);
        }
      } catch (err) {
        console.error('Error loading transition settings:', err);
        toast.error('Failed to load transition settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('transition_profiles')
        .update({
          is_enabled: isEnabled,
          hide_days_after_departure: hideDaysAfterDeparture,
          auto_hide_after_departure: autoHideAfterDeparture,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Transition settings updated successfully');
    } catch (err) {
      console.error('Error saving transition settings:', err);
      toast.error('Failed to update transition settings');
    } finally {
      setSaving(false);
    }
  };

  const handleViewArchived = () => {
    navigate('/transition');
    toast.info('Viewing archived transition data');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transition Planner</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Transition Planner
        </CardTitle>
        <p className="text-sm text-gray-600">
          Manage your Life Transition Navigator settings and visibility
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          {/* Show Transition Planner Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-transition">Show Transition Planner</Label>
              <p className="text-sm text-gray-500">
                Display the Transition module in your navigation
              </p>
            </div>
            <Switch
              id="show-transition"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          {/* Hide After Departure Days */}
          <div className="space-y-2">
            <Label htmlFor="hide-days">Hide after departure (days)</Label>
            <Input
              id="hide-days"
              type="number"
              min="0"
              max="365"
              value={hideDaysAfterDeparture}
              onChange={(e) => setHideDaysAfterDeparture(parseInt(e.target.value) || 30)}
              className="max-w-xs"
            />
            <p className="text-sm text-gray-500">
              Automatically hide the transition module this many days after your departure date
            </p>
          </div>

          {/* Archive Data on Hide */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-archive">Archive data on hide</Label>
              <p className="text-sm text-gray-500">
                Automatically archive your transition data when hidden
              </p>
            </div>
            <Switch
              id="auto-archive"
              checked={autoHideAfterDeparture}
              onCheckedChange={setAutoHideAfterDeparture}
            />
          </div>

          {/* View Archived Transition Button */}
          {archivedAt && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Archived Transition Data</p>
                  <p className="text-xs text-gray-500">
                    Archived on {new Date(archivedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleViewArchived}
                  className="flex items-center gap-2"
                >
                  <Archive className="h-4 w-4" />
                  View Archived
                </Button>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
