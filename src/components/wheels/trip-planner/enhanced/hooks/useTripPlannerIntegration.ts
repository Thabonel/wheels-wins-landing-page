import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

// Integration adapter to connect the new trip planner with existing Wheels & Wins state
export const useTripPlannerIntegration = (integratedState: any) => {
  const { toast } = useToast();

  // Update route in integrated state
  const handleRouteUpdate = useCallback((routeData: any) => {
    if (!integratedState) return;

    try {
      // Update origin and destination names
      if (integratedState.setOriginName && routeData.origin) {
        integratedState.setOriginName(routeData.origin);
      }
      
      if (integratedState.setDestName && routeData.destination) {
        integratedState.setDestName(routeData.destination);
      }

      // Update budget based on route distance and duration
      if (routeData.distance && routeData.duration && integratedState.updateBudgetFromRoute) {
        integratedState.updateBudgetFromRoute(routeData.distance, routeData.duration);
      }

      console.log('🗺️ Route updated in integrated state:', {
        origin: routeData.origin,
        destination: routeData.destination,
        distance: routeData.distance,
        duration: routeData.duration
      });
    } catch (error) {
      console.error('Failed to update route in integrated state:', error);
      toast({
        title: "Route Update Failed",
        description: "Could not sync route data with budget and social systems.",
        variant: "destructive"
      });
    }
  }, [integratedState, toast]);

  // Update budget based on trip data  
  const handleBudgetUpdate = useCallback((budgetData: any) => {
    if (!integratedState || !integratedState.setBudget) return;

    try {
      // Update budget with new estimates
      integratedState.setBudget(prev => ({
        ...prev,
        totalBudget: budgetData.totalBudget || prev.totalBudget,
        dailyBudget: budgetData.dailyBudget || prev.dailyBudget,
        projectedCost: budgetData.totalBudget || prev.projectedCost,
        costBreakdown: {
          fuel: Math.round((budgetData.distance || 0) * 0.25),
          camping: Math.round((budgetData.duration || 0) * 75),
          food: Math.round((budgetData.duration || 0) * 60),
          activities: prev.costBreakdown?.activities || 100
        }
      }));

      console.log('💰 Budget updated in integrated state');
    } catch (error) {
      console.error('Failed to update budget in integrated state:', error);
      toast({
        title: "Budget Update Failed", 
        description: "Could not sync budget estimates.",
        variant: "destructive"
      });
    }
  }, [integratedState, toast]);

  // Sync trip data with social features
  const handleSocialSync = useCallback((tripData: any) => {
    if (!integratedState || !integratedState.social) return;

    try {
      // Update social trip data for coordination features
      const socialTripData = {
        title: `${tripData.origin} to ${tripData.destination}`,
        description: `${tripData.distance} mile journey over ${tripData.duration} days`,
        route: {
          origin: tripData.origin,
          destination: tripData.destination,
          waypoints: tripData.waypoints || [],
          distance: tripData.distance,
          duration: tripData.duration
        },
        isPublic: false,
        canJoin: false,
        lastUpdated: new Date().toISOString()
      };

      // The social state should automatically update through the integrated state
      // since route updates trigger social coordination features
      console.log('👥 Trip data available for social coordination:', socialTripData);
    } catch (error) {
      console.error('Failed to sync social data:', error);
    }
  }, [integratedState]);

  // Get current state for trip planner
  const getCurrentState = useCallback(() => {
    if (!integratedState) return {};

    return {
      route: integratedState.route || {},
      budget: integratedState.budget || {},
      social: integratedState.social || {},
      ui: integratedState.ui || {}
    };
  }, [integratedState]);

  return {
    handleRouteUpdate,
    handleBudgetUpdate,
    handleSocialSync,
    getCurrentState,
    isIntegrated: !!integratedState
  };
};