import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Calendar,
  Clock,
  Trash2,
  Play,
  Share2,
  Bot,
  Edit3,
  User
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SavedTrip as SavedTripType } from '@/types/userTrips';

interface SavedTrip {
  id: string;
  user_id: string | null;
  title: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  trip_type?: string | null;
  total_budget?: number | null;
  spent_budget?: number | null;
  privacy_level?: string | null;
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
      // Note: Using any type temporarily while database table is being created
      const { data: trips, error } = await (supabase as any)
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
      setTrips((trips || []) as SavedTripType[]);
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
      const { error } = await (supabase as any)
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

  const handleLoadTrip = (trip: SavedTrip, isEdit = false) => {
    // Store trip data in sessionStorage for the trip planner to load
    const tripData = {
      id: trip.id,
      title: trip.title,
      description: trip.description,
      metadata: trip.metadata || null,
      editMode: isEdit,
      originalData: isEdit ? trip : null,
    };

    sessionStorage.setItem('loadTripData', JSON.stringify(tripData));

    // Navigate to Trip Planner with edit mode parameter
    const editParam = isEdit ? '&mode=edit' : '';
    navigate(`/wheels?tab=trip-planner&trip=${trip.id}${editParam}`);
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

  // Check if trip was created by PAM AI
  const isPAMTrip = (trip: SavedTrip): boolean => {
    return trip.metadata?.created_by === 'pam_ai' ||
           trip.metadata?.source === 'pam' ||
           trip.description?.includes('[PAM AI Generated]');
  };

  // Get trip creator indicator
  const getTripCreatorInfo = (trip: SavedTrip) => {
    if (isPAMTrip(trip)) {
      return {
        icon: Bot,
        label: 'PAM AI',
        color: 'bg-purple-100 text-purple-800',
        description: 'AI-generated trip plan'
      };
    }
    return {
      icon: User,
      label: 'Manual',
      color: 'bg-blue-100 text-blue-800',
      description: 'User-created trip'
    };
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
      {trips.map((trip) => (
        <Card key={trip.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-lg">{trip.title}</CardTitle>
                  {(() => {
                    const creatorInfo = getTripCreatorInfo(trip);
                    const IconComponent = creatorInfo.icon;
                    return (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${creatorInfo.color}`}>
                        <IconComponent className="w-3 h-3" />
                        <span>{creatorInfo.label}</span>
                      </div>
                    );
                  })()}
                </div>
                {trip.description && (
                  <p className="text-sm text-gray-600 mt-1">{trip.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {trip.status && (
                  <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                    trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                    trip.status === 'active' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {trip.status}
                  </span>
                )}
                {isPAMTrip(trip) && (
                  <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                    PAM Enhanced
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {trip.start_date && trip.end_date && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</span>
              </div>
            )}

            {trip.trip_type && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="capitalize">{trip.trip_type.replace('_', ' ')}</span>
              </div>
            )}

            {trip.total_budget && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Budget: ${trip.total_budget.toLocaleString()}</span>
                {trip.spent_budget !== null && trip.spent_budget !== undefined && (
                  <span className="text-gray-400">
                    (${trip.spent_budget.toLocaleString()} spent)
                  </span>
                )}
              </div>
            )}

            {trip.updated_at && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Updated {new Date(trip.updated_at).toLocaleDateString()}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => handleLoadTrip(trip, false)}
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-1" />
                Load
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleLoadTrip(trip, true)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                title="Edit this trip"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleShareTrip(trip)}
                title="Share trip link"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteTrip(trip.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Delete trip"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}