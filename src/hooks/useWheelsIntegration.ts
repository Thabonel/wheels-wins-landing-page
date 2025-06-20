
import { useCallback, useEffect, useState } from 'react';
import { useWheels } from '@/context/WheelsContext';
import { useAuth } from '@/context/AuthContext';

interface FuelPrediction {
  estimatedLiters: number;
  estimatedCost: number;
  recommendedStops: Array<{
    name: string;
    location: { lat: number; lng: number };
    distance: number;
    estimatedPrice: number;
  }>;
}

interface TripValidation {
  canTravel: boolean;
  blockers: string[];
  warnings: string[];
  recommendations: string[];
}

export function useWheelsIntegration() {
  const { state, actions } = useWheels();
  const { user } = useAuth();
  const [isValidatingTrip, setIsValidatingTrip] = useState(false);

  const validateTripReadiness = useCallback(async (tripDate: Date): Promise<TripValidation> => {
    setIsValidatingTrip(true);
    
    try {
      const blockers: string[] = [];
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // Check maintenance alerts
      const maintenanceAlerts = actions.checkMaintenanceForTrip(tripDate);
      const criticalMaintenance = maintenanceAlerts.filter(alert => 
        alert.severity === 'critical' || alert.blocksTravel
      );
      
      if (criticalMaintenance.length > 0) {
        blockers.push(`Critical maintenance required: ${criticalMaintenance.map(m => m.task).join(', ')}`);
      }

      const highPriorityMaintenance = maintenanceAlerts.filter(alert => 
        alert.severity === 'high' && !alert.blocksTravel
      );
      
      if (highPriorityMaintenance.length > 0) {
        warnings.push(`Maintenance recommended: ${highPriorityMaintenance.map(m => m.task).join(', ')}`);
      }

      // Check safety items
      const { missing, unverified } = actions.verifySafetyItems();
      
      if (missing.length > 0) {
        blockers.push(`Missing required safety items: ${missing.join(', ')}`);
      }

      if (unverified.length > 0) {
        warnings.push(`Unverified safety items: ${unverified.join(', ')}`);
      }

      // Check fuel efficiency data
      if (!state.fuelEfficiency || state.fuelEfficiency <= 0) {
        recommendations.push('Update fuel efficiency data for accurate trip planning');
      }

      return {
        canTravel: blockers.length === 0,
        blockers,
        warnings,
        recommendations
      };
    } finally {
      setIsValidatingTrip(false);
    }
  }, [state, actions]);

  const calculateTripFuelPlan = useCallback((distance: number, route: Array<{ lat: number; lng: number }>): FuelPrediction => {
    const { liters, cost } = actions.calculateFuelNeeds(distance);
    
    // Mock fuel stop data - in real app would query fuel stations along route
    const recommendedStops = [
      {
        name: 'Shell Service Station',
        location: { lat: route[Math.floor(route.length / 3)]?.lat || 0, lng: route[Math.floor(route.length / 3)]?.lng || 0 },
        distance: distance * 0.33,
        estimatedPrice: 1.85
      },
      {
        name: 'BP Travel Centre',
        location: { lat: route[Math.floor(route.length * 2 / 3)]?.lat || 0, lng: route[Math.floor(route.length * 2 / 3)]?.lng || 0 },
        distance: distance * 0.66,
        estimatedPrice: 1.87
      }
    ];

    return {
      estimatedLiters: liters,
      estimatedCost: cost,
      recommendedStops
    };
  }, [actions]);

  const integrateStorageWithSafety = useCallback(() => {
    const { missing, unverified } = actions.verifySafetyItems();
    
    return {
      safetyStatus: {
        totalRequired: state.safetyRequirements.length,
        inStorage: state.safetyRequirements.filter(req => req.inStorage).length,
        verified: state.safetyRequirements.filter(req => req.verified).length,
        missing: missing.length,
        unverified: unverified.length
      },
      actionItems: [
        ...missing.map(item => ({ type: 'acquire', item, priority: 'high' })),
        ...unverified.map(item => ({ type: 'verify', item, priority: 'medium' }))
      ]
    };
  }, [state.safetyRequirements, actions]);

  const getMaintenanceServiceStops = useCallback((route: Array<{ lat: number; lng: number }>) => {
    const maintenanceAlerts = actions.checkMaintenanceForTrip(new Date());
    
    return maintenanceAlerts
      .filter(alert => alert.recommendedStops)
      .flatMap(alert => alert.recommendedStops!.map(stop => ({
        ...stop,
        service: alert.task,
        severity: alert.severity,
        distanceFromRoute: 0 // Would calculate actual distance in real app
      })));
  }, [actions]);

  return {
    validateTripReadiness,
    calculateTripFuelPlan,
    integrateStorageWithSafety,
    getMaintenanceServiceStops,
    isValidatingTrip,
    currentTrip: state.currentTrip,
    fuelEfficiency: state.fuelEfficiency
  };
}
