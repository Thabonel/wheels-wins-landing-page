import React, { useState, useEffect, useMemo } from 'react';
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
  Clock,
  TrendingUp,
  Navigation,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { BudgetCalculator } from './services/BudgetCalculator';
import { cn } from '@/lib/utils';

interface MeetupOpportunity {
  id: string;
  friend_id: string;
  friend_name: string;
  friend_avatar: string;
  suggested_location: {
    name: string;
    latitude: number;
    longitude: number;
  };
  suggested_date: string;
  trip_day: number;
  distance_deviation_km: number;
  cost_impact: number;
  confidence_score: number;
  friend_status: 'traveling' | 'camped' | 'offline';
  rv_info?: any;
}

interface MeetupSuggestionsProps {
  isVisible: boolean;
  currentRoute?: {
    distance: number;
    duration: number;
    waypoints: any[];
  };
  tripSettings?: {
    startDate: Date;
    duration: number;
  };
}

export default function MeetupSuggestions({ 
  isVisible, 
  currentRoute,
  tripSettings 
}: MeetupSuggestionsProps) {
  const { user } = useAuth();
  const [meetupOpportunities, setMeetupOpportunities] = useState<MeetupOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<MeetupOpportunity | null>(null);

  // Fetch meetup suggestions
  useEffect(() => {
    if (!user || !isVisible || !currentRoute) return;

    const fetchMeetupSuggestions = async () => {
      setLoading(true);
      try {
        // Get friends and their current locations
        const { data: friends } = await supabase
          .from('user_friends')
          .select(`
            friend_id,
            user_social_profiles!user_friends_friend_id_fkey (
              display_name,
              avatar_url,
              rv_info
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'accepted');

        if (!friends) return;

        const friendIds = friends.map(f => f.friend_id);
        
        const { data: friendLocations } = await supabase
          .from('friend_locations')
          .select('*')
          .in('user_id', friendIds)
          .eq('is_public', true);

        if (!friendLocations) return;

        // Generate smart meetup suggestions based on route analysis
        const opportunities = generateMeetupOpportunities(
          friends, 
          friendLocations, 
          currentRoute,
          tripSettings
        );

        setMeetupOpportunities(opportunities);
      } catch (error) {
        console.error('Error fetching meetup suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetupSuggestions();
  }, [user, isVisible, currentRoute, tripSettings]);

  const generateMeetupOpportunities = (
    friends: any[],
    locations: any[],
    route: any,
    settings?: any
  ): MeetupOpportunity[] => {
    const opportunities: MeetupOpportunity[] = [];

    locations.forEach(location => {
      const friend = friends.find(f => f.friend_id === location.user_id);
      if (!friend) return;

      // Calculate if friend location is within reasonable detour distance
      const detourDistance = calculateDetourDistance(route, location);
      
      if (detourDistance <= 50) { // Within 50km detour
        const tripDay = estimateTripDay(route, location, settings);
        const costImpact = calculateCostImpact(detourDistance);
        const confidence = calculateConfidence(detourDistance, location.status, location.last_updated);

        opportunities.push({
          id: `${location.id}-${Date.now()}`,
          friend_id: location.user_id,
          friend_name: friend.user_social_profiles?.display_name || 'Unknown',
          friend_avatar: friend.user_social_profiles?.avatar_url || '',
          suggested_location: {
            name: location.location_name || 'Unknown location',
            latitude: location.latitude,
            longitude: location.longitude
          },
          suggested_date: calculateSuggestedDate(tripDay, settings),
          trip_day: tripDay,
          distance_deviation_km: detourDistance,
          cost_impact: costImpact,
          confidence_score: confidence,
          friend_status: location.status,
          rv_info: friend.user_social_profiles?.rv_info
        });
      }
    });

    // Sort by confidence score and proximity
    return opportunities.sort((a, b) => 
      (b.confidence_score * 0.7 + (50 - b.distance_deviation_km) * 0.3) - 
      (a.confidence_score * 0.7 + (50 - a.distance_deviation_km) * 0.3)
    ).slice(0, 5); // Top 5 suggestions
  };

  const calculateDetourDistance = (route: any, location: any): number => {
    // Simplified calculation - in real app would use routing API
    // For now, return a mock value based on location proximity to route
    return Math.random() * 50; // 0-50km detour
  };

  const estimateTripDay = (route: any, location: any, settings?: any): number => {
    // Estimate which day of trip this meetup would occur
    return Math.floor(Math.random() * 7) + 1; // Day 1-7
  };

  const calculateCostImpact = (detourKm: number): number => {
    // Calculate additional fuel cost for detour
    const avgMpg = 8.5;
    const fuelPrice = 3.89;
    const milesDetour = detourKm * 0.621371 * 2; // Round trip
    return (milesDetour / avgMpg) * fuelPrice;
  };

  const calculateConfidence = (detour: number, status: string, lastUpdated: string): number => {
    let confidence = 0.8;
    
    // Reduce confidence for larger detours
    confidence -= (detour / 50) * 0.3;
    
    // Reduce confidence if friend is offline
    if (status === 'offline') confidence -= 0.2;
    
    // Reduce confidence for stale location data
    const hoursOld = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60);
    if (hoursOld > 24) confidence -= 0.1;
    if (hoursOld > 48) confidence -= 0.2;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  };

  const calculateSuggestedDate = (tripDay: number, settings?: any): string => {
    if (!settings?.startDate) {
      // Default to current date + trip day
      const date = new Date();
      date.setDate(date.getDate() + tripDay);
      return date.toISOString().split('T')[0];
    }
    
    const startDate = new Date(settings.startDate);
    startDate.setDate(startDate.getDate() + tripDay - 1);
    return startDate.toISOString().split('T')[0];
  };

  const handleSuggestMeetup = async (opportunity: MeetupOpportunity) => {
    try {
      const { error } = await supabase
        .from('meetup_suggestions')
        .insert({
          user_id: user?.id,
          friend_id: opportunity.friend_id,
          suggested_location: opportunity.suggested_location,
          suggested_date: opportunity.suggested_date,
          trip_day: opportunity.trip_day,
          distance_deviation_km: opportunity.distance_deviation_km,
          cost_impact: opportunity.cost_impact,
          confidence_score: opportunity.confidence_score
        });

      if (error) throw error;

      // Show success message or update UI
      console.log('Meetup suggestion sent!');
    } catch (error) {
      console.error('Error suggesting meetup:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'traveling': return 'bg-blue-100 text-blue-800';
      case 'camped': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'traveling': return '🚐';
      case 'camped': return '🏕️';
      case 'offline': return '⚫';
      default: return '📍';
    }
  };

  if (!isVisible || meetupOpportunities.length === 0) return null;

  return (
    <Card className="w-full bg-white border shadow-lg">
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
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Analyzing routes...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {meetupOpportunities.map((opportunity) => (
              <div
                key={opportunity.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setSelectedOpportunity(opportunity)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={opportunity.friend_avatar} />
                    <AvatarFallback>
                      {opportunity.friend_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-sm">{opportunity.friend_name}</h4>
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs", getStatusColor(opportunity.friend_status))}
                      >
                        {getStatusIcon(opportunity.friend_status)} {opportunity.friend_status}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="w-3 h-3" />
                        {Math.round(opportunity.confidence_score * 100)}%
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {opportunity.suggested_location.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Day {opportunity.trip_day}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 text-blue-600">
                            <Route className="w-3 h-3" />
                            +{Math.round(opportunity.distance_deviation_km)}km detour
                          </div>
                          <div className="flex items-center gap-1 text-green-600">
                            <DollarSign className="w-3 h-3" />
                            ${opportunity.cost_impact.toFixed(2)} fuel
                          </div>
                        </div>
                      </div>

                      <div className="bg-primary/5 rounded-lg p-3 mt-3">
                        <p className="text-xs text-primary/80 mb-2">
                          💡 <strong>Smart Suggestion:</strong>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          "{opportunity.friend_name} will be in {opportunity.suggested_location.name} when you're 
                          passing through on Day {opportunity.trip_day}. Small detour for a great meetup!"
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSuggestMeetup(opportunity);
                        }}
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Suggest Meetup
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle "Adjust Route" action
                        }}
                      >
                        <Navigation className="w-3 h-3 mr-1" />
                        Adjust Route
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {meetupOpportunities.length === 0 && !loading && (
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