import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign,
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
  user_id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  trip_type?: string;
  total_budget?: number;
  spent_budget?: number;
  privacy_level?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export default function SavedTrips() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      
      // Query trips from user_trips table (user's personal saved trips)
      const { data: trips, error } = await supabase
        .from('user_trips')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading trips:', error);
        // Only show error toast for actual database errors, not empty results
        if (error.code && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
          toast.error('Failed to load saved trips');
        }
        setTrips([]);
        return;
      }

      // Set trips directly since the interface matches the table structure
      setTrips(trips || []);
    } catch (error) {
      console.error('Error loading trips:', error);
      // Only show error for unexpected errors
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    try {
      const { error } = await supabase
        .from('user_trips')
        .delete()
        .eq('id', tripId)
        .eq('user_id', user?.id); // Ensure user owns the trip

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
    navigate(`/wheels?tab=trip-planner&trip=${trip.id}`);
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
          <Button onClick={() => navigate('/login')}>
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
          <Button onClick={() => navigate('/wheels?tab=trip-planner')}>
            Plan Your First Trip
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {trips.map((trip) => {
        const metadata = typeof trip.metadata === 'string' 
          ? JSON.parse(trip.metadata) 
          : trip.metadata || {};
        
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
                {trip.status && (
                  <Badge variant="secondary">
                    {trip.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date(trip.created_at).toLocaleDateString()}</span>
              </div>
              
              {trip.start_date && trip.end_date && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</span>
                </div>
              )}
              
              {trip.total_budget && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  <span>Budget: ${trip.total_budget.toLocaleString()}</span>
                  {trip.spent_budget > 0 && <span>• Spent: ${trip.spent_budget.toLocaleString()}</span>}
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