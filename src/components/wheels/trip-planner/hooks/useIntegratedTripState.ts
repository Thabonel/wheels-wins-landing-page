import { useState, useEffect, useCallback } from "react";
import { useTripPlannerState } from "./useTripPlannerState";
import { useSocialTripState } from "./useSocialTripState";
import { usePAMContext } from "../PAMContext";
import { Waypoint, Suggestion } from "../types";

export interface BudgetData {
  totalBudget: number;
  dailyBudget: number;
  currentSpent: number;
  projectedCost: number;
  costBreakdown: {
    fuel: number;
    camping: number;
    food: number;
    activities: number;
  };
}

export interface ExportData {
  isExporting: boolean;
  selectedApp: 'google' | 'apple' | 'waze' | 'garmin' | null;
  selectedScope: 'daily' | 'full' | 'waypoints';
  dayIndex?: number;
}

export interface IntegratedTripState {
  route: {
    originName: string;
    destName: string;
    waypoints: Waypoint[];
    suggestions: Suggestion[];
    totalDistance?: number;
    estimatedTime?: number;
  };
  budget: BudgetData;
  social: ReturnType<typeof useSocialTripState>;
  pam: ReturnType<typeof usePAMContext>;
  export: ExportData;
  ui: {
    showBudgetSidebar: boolean;
    showSocialSidebar: boolean;
    showPAMChat: boolean;
    showExportModal: boolean;
    showMeetupPlanner: boolean;
    activeFeature: 'route' | 'budget' | 'social' | 'pam' | 'export' | 'meetup' | null;
  };
  sync: boolean;
  tripId: string | null;
}

export function useIntegratedTripState(isOffline: boolean) {
  const tripState = useTripPlannerState(isOffline);
  const socialState = useSocialTripState();
  const pamState = usePAMContext();

  // Budget state
  const [budget, setBudget] = useState<BudgetData>({
    totalBudget: 1500,
    dailyBudget: 150,
    currentSpent: 0,
    projectedCost: 0,
    costBreakdown: {
      fuel: 0,
      camping: 0,
      food: 0,
      activities: 0,
    },
  });

  // Export state
  const [exportData, setExportData] = useState<ExportData>({
    isExporting: false,
    selectedApp: null,
    selectedScope: 'daily',
    dayIndex: 0,
  });

  // UI state
  const [uiState, setUIState] = useState({
    showBudgetSidebar: false,
    showSocialSidebar: false,
    showPAMChat: false,
    showExportModal: false,
    showMeetupPlanner: false,
    activeFeature: null as 'route' | 'budget' | 'social' | 'pam' | 'export' | 'meetup' | null,
  });

  // Sync state - indicates if all features are in sync
  const [isInSync, setIsInSync] = useState(true);
  const [tripId, setTripId] = useState<string | null>(null);

  // Cross-feature intelligence functions
  const updateBudgetFromRoute = useCallback((distance: number, days: number) => {
    const fuelCost = distance * 0.15; // Rough calculation
    const campingCost = days * 35;
    const foodCost = days * 50;
    
    setBudget(prev => ({
      ...prev,
      projectedCost: fuelCost + campingCost + foodCost,
      costBreakdown: {
        fuel: fuelCost,
        camping: campingCost,
        food: foodCost,
        activities: prev.costBreakdown.activities,
      },
    }));
  }, []);

  const addMeetupToBudget = useCallback((meetupCost: number) => {
    setBudget(prev => ({
      ...prev,
      projectedCost: prev.projectedCost + meetupCost,
      costBreakdown: {
        ...prev.costBreakdown,
        activities: prev.costBreakdown.activities + meetupCost,
      },
    }));
  }, []);

  // Feature toggle functions
  const toggleFeature = useCallback((feature: 'budget' | 'social' | 'pam' | 'export' | 'meetup') => {
    setUIState(prev => {
      const newState = { ...prev };
      
      switch (feature) {
        case 'budget':
          newState.showBudgetSidebar = !prev.showBudgetSidebar;
          break;
        case 'social':
          newState.showSocialSidebar = !prev.showSocialSidebar;
          break;
        case 'pam':
          newState.showPAMChat = !prev.showPAMChat;
          break;
        case 'export':
          newState.showExportModal = !prev.showExportModal;
          break;
        case 'meetup':
          newState.showMeetupPlanner = !prev.showMeetupPlanner;
          break;
      }
      
      newState.activeFeature = newState.activeFeature === feature ? null : feature;
      return newState;
    });
  }, []);

  // PAM integration functions
  const sendPAMRequest = useCallback(async (message: string) => {
    try {
      setIsInSync(false);
      await pamState.sendMessage(message);
      setIsInSync(true);
    } catch (error) {
      console.error('PAM request failed:', error);
      setIsInSync(true);
    }
  }, [pamState]);

  // Effect to sync features when route changes
  useEffect(() => {
    if (tripState.waypoints.length > 0) {
      const distance = tripState.waypoints.reduce((acc, curr) => acc + 10, 0); // Mock distance
      const days = Math.max(1, Math.ceil(distance / 300)); // Assuming 300 miles per day
      updateBudgetFromRoute(distance, days);
    }
  }, [tripState.waypoints, updateBudgetFromRoute]);

  // Integrated state object
  const integratedState: IntegratedTripState = {
    route: {
      originName: tripState.originName,
      destName: tripState.destName,
      waypoints: tripState.waypoints,
      suggestions: tripState.suggestions,
    },
    budget,
    social: socialState,
    pam: pamState,
    export: exportData,
    ui: uiState,
    sync: isInSync,
    tripId,
  };

  return {
    ...integratedState,
    // Actions
    toggleFeature,
    sendPAMRequest,
    addMeetupToBudget,
    updateBudgetFromRoute,
    setBudget,
    setExportData,
    setUIState,
    // Original trip state actions
    ...tripState,
    tripId,
    setTripId,
  };
}