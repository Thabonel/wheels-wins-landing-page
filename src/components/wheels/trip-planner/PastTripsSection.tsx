import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Share,
  MapPin,
  Clock,
  Camera,
  Upload,
  X,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TripViewer } from '@/components/wheels/trip-viewer/TripViewer';
import { UserTrip } from '@/types/userTrips';

interface PastTrip {
  id: string;
  name: string;
  dates: { start: string; end: string };
  destinations: string[];
  duration: number;
  thumbnail: string;
  highlights: string[];
  description?: string;
  uploadedPhoto?: string;
}

interface PastTripsSectionProps {
  className?: string;
}

export default function PastTripsSection({ className }: PastTripsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tripPhotos, setTripPhotos] = useState<Record<string, string>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<UserTrip | null>(null);
  
  // Mock data - will be replaced with real trip history
  const mockPastTrips: PastTrip[] = [
    {
      id: '1',
      name: 'Coast to Coast Adventure',
      dates: { start: '2024-08-15', end: '2024-08-28' },
      destinations: ['Sydney', 'Melbourne', 'Adelaide', 'Perth'],
      duration: 14,
      thumbnail: '/placeholder.svg',
      highlights: ['Great Ocean Road', 'Nullarbor Plain', 'Uluru'],
      description: 'Epic 14-day journey across Australia from the bustling harbor city of Sydney to the pristine beaches of Perth. Witnessed stunning coastal drives, vast desert landscapes, and iconic landmarks including the majestic Uluru at sunset.'
    },
    {
      id: '2',
      name: 'Queensland Explorer',
      dates: { start: '2024-06-10', end: '2024-06-17' },
      destinations: ['Brisbane', 'Gold Coast', 'Cairns'],
      duration: 7,
      thumbnail: '/placeholder.svg',
      highlights: ['Great Barrier Reef', 'Daintree Rainforest'],
      description: 'Tropical paradise adventure through Queensland\'s most beautiful destinations. Snorkeled in the crystal-clear waters of the Great Barrier Reef and explored the ancient Daintree Rainforest with its incredible biodiversity.'
    }
  ];

  const handleShareTrip = async (trip: PastTrip) => {
    setLoading(true);
    try {
      const shareData = {
        title: `Check out my ${trip.name} trip!`,
        text: `Just completed an amazing ${trip.duration}-day journey through ${trip.destinations.join(', ')}. Highlights included ${trip.highlights.join(', ')}.`,
        url: `${window.location.origin}/trip/${trip.id}`
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
      }
    } catch (error) {
      console.error('Error sharing trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (tripId: string, file: File) => {
    setUploadingPhoto(tripId);
    try {
      // Create a data URL for immediate preview
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      setTripPhotos(prev => ({
        ...prev,
        [tripId]: dataUrl
      }));
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleRemovePhoto = (tripId: string) => {
    setTripPhotos(prev => {
      const updated = { ...prev };
      delete updated[tripId];
      return updated;
    });
  };

  const handleViewTrip = (trip: PastTrip) => {
    const userTrip: UserTrip = {
      id: trip.id,
      user_id: 'current-user',
      title: trip.name,
      description: trip.description || `${trip.duration}-day journey through ${trip.destinations.join(', ')}`,
      start_date: trip.dates.start,
      end_date: trip.dates.end,
      status: 'completed',
      trip_type: 'road_trip',
      total_budget: null,
      spent_budget: null,
      privacy_level: 'private',
      metadata: {
        route_data: {
          waypoints: trip.destinations.map((dest, index) => ({
            name: dest,
            coordinates: [133.775136 + (index * 2), -25.274398] as [number, number],
          })),
          distance: trip.duration * 400,
          route: null
        },
        distance_miles: trip.duration * 250,
        duration_hours: trip.duration * 8,
        highlights: trip.highlights
      },
      created_at: trip.dates.start,
      updated_at: trip.dates.end
    };

    setSelectedTrip(userTrip);
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setSelectedTrip(null);
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            Past Trips
            <Badge variant="secondary" className="ml-2">
              {mockPastTrips.length}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm"
          >
            {isExpanded ? "Hide Trips" : "Show Trips"}
          </Button>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {mockPastTrips.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No past trips yet. Complete your first trip to see it here!</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {mockPastTrips.map((trip) => (
                <Card key={trip.id} className="overflow-hidden border-muted">
                  <div className="aspect-video bg-muted relative">
                    {tripPhotos[trip.id] ? (
                      // Show uploaded photo
                      <>
                        <img
                          src={tripPhotos[trip.id]}
                          alt={trip.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleRemovePhoto(trip.id)}
                          className="absolute top-2 left-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          title="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      // Show description with upload button
                      <div className="w-full h-full flex flex-col justify-center items-center p-4 bg-gradient-to-br from-muted to-muted/80">
                        <p className="text-sm text-center text-muted-foreground mb-4 line-clamp-4">
                          {trip.description}
                        </p>
                        <div className="flex flex-col items-center gap-2">
                          <label
                            htmlFor={`photo-upload-${trip.id}`}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90 transition-colors",
                              uploadingPhoto === trip.id && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {uploadingPhoto === trip.id ? (
                              <Upload className="w-4 h-4 animate-pulse" />
                            ) : (
                              <Camera className="w-4 h-4" />
                            )}
                            <span className="text-sm font-medium">
                              {uploadingPhoto === trip.id ? 'Uploading...' : 'Add your photo'}
                            </span>
                          </label>
                          <input
                            id={`photo-upload-${trip.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingPhoto === trip.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handlePhotoUpload(trip.id, file);
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {trip.duration} days
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-semibold text-sm">{trip.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(trip.dates.start).toLocaleDateString()} - {new Date(trip.dates.end).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">
                          {trip.destinations.join(' → ')}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {trip.highlights.slice(0, 2).map((highlight, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs py-0">
                            {highlight}
                          </Badge>
                        ))}
                        {trip.highlights.length > 2 && (
                          <Badge variant="outline" className="text-xs py-0">
                            +{trip.highlights.length - 2}
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-7 text-xs"
                          onClick={() => handleShareTrip(trip)}
                          disabled={loading}
                        >
                          <Share className="w-3 h-3 mr-1" />
                          Share
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => handleViewTrip(trip)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      )}

      {/* Trip Viewer */}
      <TripViewer
        trip={selectedTrip}
        isOpen={viewerOpen}
        onClose={handleCloseViewer}
        onEdit={() => {
          // Past trips are read-only
        }}
        onShare={(trip) => {
          const mockPastTrip: PastTrip = {
            id: trip.id,
            name: trip.title,
            dates: { start: trip.start_date!, end: trip.end_date! },
            destinations: trip.metadata?.route_data?.waypoints?.map(w => w.name) || [],
            duration: Math.round((trip.metadata?.duration_hours || 0) / 24),
            thumbnail: '/placeholder.svg',
            highlights: trip.metadata?.highlights || [],
            description: trip.description
          };
          handleShareTrip(mockPastTrip);
        }}
      />
    </Card>
  );
}