import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Map, 
  Calendar, 
  MapPin, 
  Clock, 
  Mountain,
  Users,
  Trash2,
  Share2,
  Edit,
  Download,
  Eye,
  Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface SavedTrip {
  id: string;
  name: string;
  description?: string;
  start_location: string;
  end_location: string;
  waypoints: string[];
  distance: number;
  duration: number;
  difficulty: string;
  is_public: boolean;
  tags: string[];
  estimated_days: number;
  created_at: string;
  updated_at: string;
}

interface TripsListProps {
  onSelectTrip?: (trip: SavedTrip) => void;
  onEditTrip?: (trip: SavedTrip) => void;
  showPublic?: boolean;
}

export const TripsList: React.FC<TripsListProps> = ({
  onSelectTrip,
  onEditTrip,
  showPublic = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  useEffect(() => {
    loadTrips();
  }, [user, showPublic]);

  const loadTrips = async () => {
    if (!user && !showPublic) return;

    setLoading(true);
    try {
      let query = supabase.from('saved_trips').select('*');
      
      if (showPublic) {
        query = query.eq('is_public', true);
      } else if (user) {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error loading trips:', error);
      toast({
        title: 'Error',
        description: 'Failed to load trips',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_trips')
        .delete()
        .eq('id', tripId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Trip Deleted',
        description: 'Your trip has been removed successfully'
      });
      
      loadTrips();
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete trip',
        variant: 'destructive'
      });
    }
  };

  const handleShareTrip = async (trip: SavedTrip) => {
    const shareUrl = `${window.location.origin}/trips/${trip.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link Copied!',
        description: 'Trip link has been copied to clipboard'
      });
    } catch (error) {
      console.error('Error sharing trip:', error);
    }
  };

  const handleExportGPX = (trip: SavedTrip) => {
    // This would export the GPX data if available
    if (trip.gpx_data) {
      const blob = new Blob([trip.gpx_data], { type: 'application/gpx+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${trip.name.replace(/\s+/g, '_')}.gpx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50';
      case 'moderate': return 'text-yellow-600 bg-yellow-50';
      case 'challenging': return 'text-orange-600 bg-orange-50';
      case 'expert': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (trips.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {showPublic ? 'No public trips available' : 'No saved trips yet'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {showPublic 
              ? 'Be the first to share a trip with the community!' 
              : 'Start planning your first RV adventure'}
          </p>
          {!showPublic && (
            <Button className="bg-green-700 hover:bg-green-800">
              <Plus className="h-4 w-4 mr-2" />
              Plan New Trip
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {showPublic ? 'Community Trips' : 'My Saved Trips'}
        </h2>
        <span className="text-sm text-gray-500">
          {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trips.map((trip) => (
          <Card 
            key={trip.id}
            className={`hover:shadow-lg transition-all cursor-pointer ${
              selectedTripId === trip.id ? 'ring-2 ring-green-600' : ''
            }`}
            onClick={() => {
              setSelectedTripId(trip.id);
              onSelectTrip?.(trip);
            }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-1">
                  {trip.name}
                </CardTitle>
                {trip.is_public && (
                  <Users className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(trip.difficulty)}`}>
                  {trip.difficulty}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(trip.created_at), { addSuffix: true })}
                </span>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {trip.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {trip.description}
                </p>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{trip.start_location}</span>
                  <span>→</span>
                  <span className="truncate">{trip.end_location}</span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Mountain className="h-4 w-4" />
                    <span>{trip.distance.toFixed(0)} mi</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{trip.estimated_days} {trip.estimated_days === 1 ? 'day' : 'days'}</span>
                  </div>
                  {trip.waypoints.length > 0 && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{trip.waypoints.length} stops</span>
                    </div>
                  )}
                </div>
              </div>

              {trip.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {trip.tags.slice(0, 3).map((tag, index) => (
                    <span 
                      key={index}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {trip.tags.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{trip.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTrip?.(trip);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                
                {user && trip.user_id === user.id && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTrip?.(trip);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTrip(trip.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShareTrip(trip);
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                
                {trip.gpx_data && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportGPX(trip);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TripsList;