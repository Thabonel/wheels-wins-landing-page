import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MapPin,
  Calendar,
  Users,
  Route,
  DollarSign,
  TrendingUp,
  Navigation,
  MessageSquare,
  Loader2,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MeetupSuggestion } from './hooks/useSocialTripState';
import { toast } from '@/hooks/use-toast';
import { RouteState } from './types';

interface MeetupSuggestionsProps {
  suggestions: MeetupSuggestion[];
  isVisible: boolean;
  onAcceptMeetup: (suggestionId: string) => void;
  onDismissMeetup: (suggestionId: string) => void;
  onAddWaypoint: (location: { lat: number; lng: number; name: string }) => Promise<void> | void;
  currentRoute: RouteState;
  onMessageFriend?: (friendId: string) => void;
}

export default function MeetupSuggestions({
  suggestions,
  isVisible,
  onAcceptMeetup,
  onDismissMeetup,
  onAddWaypoint,
  currentRoute,
  onMessageFriend
}: MeetupSuggestionsProps) {
  const [adjustingId, setAdjustingId] = React.useState<string | null>(null);

  if (!isVisible || suggestions.length === 0) return null;

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return 'text-success';
      case 'medium': return 'text-warning';
      case 'low': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusColor = (status: 'traveling' | 'camped' | 'offline') => {
    switch (status) {
      case 'traveling': return 'bg-warning/20 text-warning-foreground';
      case 'camped': return 'bg-success/20 text-success-foreground';
      case 'offline': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: 'traveling' | 'camped' | 'offline') => {
    switch (status) {
      case 'traveling': return '🚐';
      case 'camped': return '🏕️';
      case 'offline': return '⚫';
      default: return '📍';
    }
  };

  const handleAdjustRoute = async (suggestion: MeetupSuggestion) => {
    setAdjustingId(suggestion.id);
    try {
      const exists = currentRoute.waypoints.some(
        (wp) =>
          wp.name === suggestion.meetupLocation.placeName ||
          (wp.coords[0] === suggestion.meetupLocation.coordinates[0] &&
            wp.coords[1] === suggestion.meetupLocation.coordinates[1])
      );

      if (exists) {
        toast({
          title: 'Waypoint Exists',
          description: `${suggestion.meetupLocation.placeName} is already on your route`,
        });
        return setAdjustingId(null);
      }

      await onAddWaypoint({
        lat: suggestion.meetupLocation.coordinates[1],
        lng: suggestion.meetupLocation.coordinates[0],
        name: suggestion.meetupLocation.placeName,
      });
      toast({
        title: 'Waypoint Added',
        description: `${suggestion.meetupLocation.placeName} added to your route`,
      });
    } catch (error) {
      console.error('Failed to adjust route:', error);
      toast({
        title: 'Route Adjustment Failed',
        description: 'Could not update route. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAdjustingId(null);
    }
  };

  return (
    <Card className="w-full bg-card border shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Meetup Opportunities
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Smart suggestions based on your route and friend locations
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={suggestion.friend.avatar} alt={suggestion.friend.name} />
                <AvatarFallback className="text-sm">
                  {suggestion.friend.name.split(' ').map(n => n.charAt(0)).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-base">{suggestion.friend.name}</h4>
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs", getStatusColor(suggestion.friend.status))}
                    >
                      {getStatusIcon(suggestion.friend.status)} 
                      {suggestion.friend.status === 'traveling' ? 'On the Road' : 
                       suggestion.friend.status === 'camped' ? 'Camped' : 'Offline'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onDismissMeetup(suggestion.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium">{suggestion.meetupLocation.placeName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Day {suggestion.tripDay}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className={cn("w-4 h-4", getConfidenceColor(suggestion.confidence))} />
                      <span className={getConfidenceColor(suggestion.confidence)}>
                        {suggestion.confidence} confidence
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-primary">
                      <Route className="w-4 h-4" />
                      <span>
                        {suggestion.costImpact >= 0 ? '+' : ''}${Math.abs(suggestion.costImpact)} cost impact
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      📍 {suggestion.accommodations}
                    </div>
                  </div>

                  <div className="bg-primary/5 rounded-lg p-3">
                    <p className="text-sm text-primary font-medium mb-1">
                      👥 MEETUP OPPORTUNITY
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {suggestion.description}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => onAcceptMeetup(suggestion.id)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Add to Trip
                    </Button>
                    {onMessageFriend && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onMessageFriend(suggestion.friend.id)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={adjustingId === suggestion.id}
                      onClick={() => handleAdjustRoute(suggestion)}
                    >
                      {adjustingId === suggestion.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Navigation className="w-4 h-4 mr-2" />
                      )}
                      {adjustingId === suggestion.id ? 'Adjusting...' : 'Adjust Route'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {suggestions.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-medium text-muted-foreground mb-2">No Meetup Opportunities</h3>
            <p className="text-sm text-muted-foreground">
              No friends are currently along your planned route. 
              Try adjusting your route or check back later!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}