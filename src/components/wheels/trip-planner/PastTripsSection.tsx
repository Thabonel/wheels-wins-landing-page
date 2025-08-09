import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Share, 
  ChevronDown, 
  ChevronUp,
  MapPin,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PastTrip {
  id: string;
  name: string;
  dates: { start: string; end: string };
  destinations: string[];
  duration: number;
  thumbnail: string;
  highlights: string[];
}

interface PastTripsSectionProps {
  className?: string;
}

export default function PastTripsSection({ className }: PastTripsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Mock past trips data - in real app this would come from database
  const mockPastTrips: PastTrip[] = [
    {
      id: '1',
      name: 'Coast to Coast Adventure',
      dates: { start: '2024-08-15', end: '2024-08-28' },
      destinations: ['Sydney', 'Melbourne', 'Adelaide', 'Perth'],
      duration: 14,
      thumbnail: '/placeholder.svg',
      highlights: ['Great Ocean Road', 'Nullarbor Plain', 'Uluru']
    },
    {
      id: '2', 
      name: 'Queensland Explorer',
      dates: { start: '2024-06-10', end: '2024-06-17' },
      destinations: ['Brisbane', 'Gold Coast', 'Cairns'],
      duration: 7,
      thumbnail: '/placeholder.svg',
      highlights: ['Great Barrier Reef', 'Daintree Rainforest']
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
        // Could add toast notification here
      }
    } catch (error) {
      console.error('Error sharing trip:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader 
        className="pb-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Past Trips
            <Badge variant="secondary" className="ml-2">
              {mockPastTrips.length}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                    <img 
                      src={trip.thumbnail} 
                      alt={trip.name}
                      className="w-full h-full object-cover"
                    />
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
                          onClick={() => {
                            console.log('View details for trip:', trip.id);
                          }}
                        >
                          Details
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
    </Card>
  );
}