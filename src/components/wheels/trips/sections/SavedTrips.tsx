import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Edit, 
  Trash2, 
  Play,
  Download,
  Share2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SavedTrip {
  id: string;
  title: string;
  description?: string;
  route_data: any;
  start_date?: string;
  end_date?: string;
  status: 'draft' | 'planned' | 'active' | 'completed';
  is_group_trip?: boolean;
  created_at: string;
  updated_at: string;
}

export default function SavedTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSavedTrips();
    }
  }, [user]);

  const loadSavedTrips = async () => {
    try {
      setLoading(true);
      
      // The existing database uses group_trips as the main trips table
      // Query trips from group_trips table (which stores all trips)
      const { data: trips, error } = await supabase
        .from('group_trips')
        .select('*')
        .eq('created_by', user?.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading trips:', error);
        // If table doesn't exist yet, show empty state
        if (error.code === '42P01') {
          setTrips([]);
          return;
        }
        throw error;
      }

      // Map the group_trips fields to our SavedTrip interface
      const mappedTrips = (trips || []).map(trip => ({
        id: trip.id,
        title: trip.trip_name, // group_trips uses trip_name instead of title
        description: trip.description,
        route_data: trip.route_data,
        start_date: trip.start_date,
        end_date: trip.end_date,
        status: trip.status as 'draft' | 'planned' | 'active' | 'completed',
        is_group_trip: true, // group_trips are by definition group trips
        created_at: trip.created_at,
        updated_at: trip.updated_at
      }));

      setTrips(mappedTrips);
    } catch (error) {
      console.error('Error loading trips:', error);
      toast.error('Failed to load saved trips');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    try {
      const { error } = await supabase
        .from('group_trips')
        .delete()
        .eq('id', tripId)
        .eq('created_by', user?.id); // Ensure user owns the trip

      if (error) throw error;
      
      toast.success('Trip deleted successfully');
      loadSavedTrips();
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete trip');
    }
  };

  const handleLoadTrip = (trip: SavedTrip) => {
    // Navigate to Trip Planner with trip data
    window.location.href = `/wheels?tab=trip-planner&trip=${trip.id}`;
  };

  const handleShareTrip = async (trip: SavedTrip) => {
    const shareUrl = `${window.location.origin}/wheels/trips/shared/${trip.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy share link');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-gray-600 mb-4">Please sign in to view your saved trips</p>
          <Button onClick={() => window.location.href = '/login'}>
            Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (trips.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">No saved trips yet</p>
          <Button onClick={() => window.location.href = '/wheels?tab=trip-planner'}>
            Plan Your First Trip
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {trips.map((trip) => {
        const routeData = typeof trip.route_data === 'string' 
          ? JSON.parse(trip.route_data) 
          : trip.route_data;
        
        return (
          <Card key={trip.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{trip.title}</CardTitle>
                  {trip.description && (
                    <p className="text-sm text-gray-600 mt-1">{trip.description}</p>
                  )}
                </div>
                <Badge variant={trip.status === 'active' ? 'default' : 'secondary'}>
                  {trip.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date(trip.created_at).toLocaleDateString()}</span>
              </div>
              
              {routeData && routeData.waypoints && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{routeData.waypoints.length} waypoints</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Updated {new Date(trip.updated_at).toLocaleDateString()}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={() => handleLoadTrip(trip)}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Load
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleShareTrip(trip)}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDeleteTrip(trip.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}