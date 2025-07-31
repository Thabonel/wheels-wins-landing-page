import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Route, 
  MapPin, 
  Clock, 
  DollarSign, 
  Users, 
  Sparkles,
  Download,
  UserPlus,
  PlusCircle,
  Fuel,
  Car
} from 'lucide-react';
import { useIntegratedTripState } from './hooks/useIntegratedTripState';
import { cn } from '@/lib/utils';

interface EnhancedTripStatsProps {
  directionsControl: React.MutableRefObject<any>;
  className?: string;
}

export default function EnhancedTripStats({ directionsControl, className }: EnhancedTripStatsProps) {
  const integratedState = useIntegratedTripState(false);
  
  // Get route data from directions control
  const getRouteData = () => {
    if (!directionsControl.current) return null;
    
    try {
      const route = directionsControl.current.getRoute();
      if (!route || route.length === 0) return null;
      
      const selectedRoute = route[0];
      return {
        distance: selectedRoute.distance / 1609.34, // Convert meters to miles
        duration: selectedRoute.duration / 60, // Convert seconds to minutes
        fuel: (selectedRoute.distance / 1609.34) / 25 // Assume 25 MPG
      };
    } catch (error) {
      return null;
    }
  };
  
  const routeData = getRouteData();
  const hasRoute = integratedState.route.originName && integratedState.route.destName;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Route className="w-5 h-5" />
          Trip Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {integratedState.route.waypoints.length}
            </div>
            <div className="text-xs text-muted-foreground">Waypoints</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              ${integratedState.budget.totalBudget || 0}
            </div>
            <div className="text-xs text-muted-foreground">Budget</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {integratedState.social.friends.length}
            </div>
            <div className="text-xs text-muted-foreground">Friends</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {integratedState.pam.suggestions.length}
            </div>
            <div className="text-xs text-muted-foreground">AI Tips</div>
          </div>
        </div>

        {/* Route Details */}
        {hasRoute && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="break-words">
                {integratedState.route.originName} → {integratedState.route.destName}
              </span>
            </div>
            
            {routeData && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {routeData.distance.toFixed(1)} miles • {(routeData.duration / 60).toFixed(1)} hours
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Fuel className="w-4 h-4 text-muted-foreground" />
                  <span>
                    ~{routeData.fuel.toFixed(1)} gallons
                  </span>
                </div>
              </>
            )}

            {/* Travel Preferences */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-xs text-muted-foreground">Travel Mode:</span>
                <div className="font-medium text-sm capitalize">{integratedState.travelMode}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Vehicle:</span>
                <div className="font-medium text-sm capitalize flex items-center gap-1">
                  <Car className="w-3 h-3" />
                  {integratedState.vehicle}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => integratedState.toggleFeature('export')}
            className="flex-1"
          >
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => integratedState.toggleFeature('meetup')}
            className="flex-1"
          >
            <UserPlus className="w-3 h-3 mr-1" />
            Meetup
          </Button>
        </div>
        
        {/* Add to Templates Section */}
        <div className="pt-2 border-t mt-2">
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => {
              // TODO: Implement add to trip templates functionality
              console.log('Add to trip templates clicked');
            }}
            className="w-full"
          >
            <PlusCircle className="w-3 h-3 mr-1" />
            Add to Trip Templates
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}