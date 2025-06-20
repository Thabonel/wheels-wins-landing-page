
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContext';
import { useStorageData } from '@/components/wheels/storage/useStorageData';

interface TripPlan {
  id: string;
  origin: string;
  destination: string;
  distance: number;
  estimatedFuelNeeded: number;
  estimatedCost: number;
  plannedDate?: Date;
  route: Array<{ lat: number; lng: number; name?: string }>;
  fuelStops: Array<{ lat: number; lng: number; name: string; estimatedPrice: number }>;
}

interface MaintenanceAlert {
  id: string;
  task: string;
  dueDate: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  blocksTravel: boolean;
  recommendedStops?: Array<{ lat: number; lng: number; name: string }>;
}

interface SafetyRequirement {
  id: string;
  item: string;
  required: boolean;
  inStorage: boolean;
  storageLocation?: string;
  verified: boolean;
}

interface WheelsState {
  currentTrip: TripPlan | null;
  fuelEfficiency: number; // L/100km or MPG
  maintenanceAlerts: MaintenanceAlert[];
  safetyRequirements: SafetyRequirement[];
  isOfflineMode: boolean;
  lastSync: Date | null;
}

interface WheelsContextType {
  state: WheelsState;
  actions: {
    setCurrentTrip: (trip: TripPlan | null) => void;
    calculateFuelNeeds: (distance: number) => { liters: number; cost: number };
    checkMaintenanceForTrip: (tripDate: Date) => MaintenanceAlert[];
    verifySafetyItems: () => { missing: string[]; unverified: string[] };
    syncOfflineData: () => Promise<void>;
    updateFuelEfficiency: (efficiency: number) => void;
    markSafetyItemVerified: (itemId: string) => void;
  };
}

const WheelsContext = createContext<WheelsContextType | undefined>(undefined);

export function useWheels() {
  const context = useContext(WheelsContext);
  if (!context) {
    throw new Error('useWheels must be used within a WheelsProvider');
  }
  return context;
}

interface WheelsProviderProps {
  children: ReactNode;
}

export function WheelsProvider({ children }: WheelsProviderProps) {
  const { user } = useAuth();
  const { isOffline, addToQueue } = useOffline();
  const { storageData } = useStorageData();

  const [state, setState] = useState<WheelsState>({
    currentTrip: null,
    fuelEfficiency: 8.5, // Default L/100km
    maintenanceAlerts: [],
    safetyRequirements: [],
    isOfflineMode: isOffline,
    lastSync: null,
  });

  // Initialize safety requirements based on storage items
  useEffect(() => {
    if (storageData.items.length > 0) {
      const requiredSafetyItems = [
        'First Aid Kit',
        'Fire Extinguisher',
        'Emergency Triangle',
        'Spare Tire',
        'Jack',
        'Wheel Brace',
        'Emergency Water',
        'Torch/Flashlight',
        'Emergency Blanket',
        'Jumper Leads'
      ];

      const safetyReqs = requiredSafetyItems.map(item => {
        const inStorage = storageData.items.some(storageItem => 
          storageItem.name.toLowerCase().includes(item.toLowerCase())
        );
        const storageItem = storageData.items.find(storageItem => 
          storageItem.name.toLowerCase().includes(item.toLowerCase())
        );

        return {
          id: item.replace(/\s+/g, '-').toLowerCase(),
          item,
          required: true,
          inStorage,
          storageLocation: storageItem?.location,
          verified: false
        };
      });

      setState(prev => ({ ...prev, safetyRequirements: safetyReqs }));
    }
  }, [storageData.items]);

  const setCurrentTrip = (trip: TripPlan | null) => {
    setState(prev => ({ ...prev, currentTrip: trip }));
    
    if (trip && isOffline) {
      addToQueue('plan_trip', { trip });
    }
  };

  const calculateFuelNeeds = (distance: number) => {
    const liters = (distance * state.fuelEfficiency) / 100;
    const cost = liters * 1.85; // Average fuel price per liter
    return { liters, cost };
  };

  const checkMaintenanceForTrip = (tripDate: Date): MaintenanceAlert[] => {
    // Mock maintenance data - in real app would come from maintenance records
    const mockAlerts: MaintenanceAlert[] = [
      {
        id: 'oil-change',
        task: 'Oil Change',
        dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days overdue
        severity: 'high',
        blocksTravel: false,
        recommendedStops: [
          { lat: -37.8136, lng: 144.9631, name: 'Melbourne Auto Service' }
        ]
      },
      {
        id: 'brake-check',
        task: 'Brake Inspection',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Due in 14 days
        severity: 'critical',
        blocksTravel: true,
        recommendedStops: [
          { lat: -37.8136, lng: 144.9631, name: 'Safe Brake Centre' }
        ]
      }
    ];

    return mockAlerts.filter(alert => 
      alert.dueDate <= tripDate || alert.blocksTravel
    );
  };

  const verifySafetyItems = () => {
    const missing = state.safetyRequirements
      .filter(req => req.required && !req.inStorage)
      .map(req => req.item);
    
    const unverified = state.safetyRequirements
      .filter(req => req.required && req.inStorage && !req.verified)
      .map(req => req.item);

    return { missing, unverified };
  };

  const syncOfflineData = async () => {
    try {
      // Sync logic would go here
      setState(prev => ({ ...prev, lastSync: new Date() }));
      console.log('Wheels data synced successfully');
    } catch (error) {
      console.error('Failed to sync wheels data:', error);
    }
  };

  const updateFuelEfficiency = (efficiency: number) => {
    setState(prev => ({ ...prev, fuelEfficiency: efficiency }));
  };

  const markSafetyItemVerified = (itemId: string) => {
    setState(prev => ({
      ...prev,
      safetyRequirements: prev.safetyRequirements.map(req =>
        req.id === itemId ? { ...req, verified: true } : req
      )
    }));
  };

  const contextValue: WheelsContextType = {
    state,
    actions: {
      setCurrentTrip,
      calculateFuelNeeds,
      checkMaintenanceForTrip,
      verifySafetyItems,
      syncOfflineData,
      updateFuelEfficiency,
      markSafetyItemVerified
    }
  };

  return (
    <WheelsContext.Provider value={contextValue}>
      {children}
    </WheelsContext.Provider>
  );
}
