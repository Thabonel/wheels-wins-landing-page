
import React, { createContext, useContext, useState } from 'react';

interface WheelsState {
  currentTrip: any;
  fuelEfficiency: number;
  safetyRequirements: any[];
}

interface WheelsActions {
  checkMaintenanceForTrip: (date: Date) => any[];
  calculateFuelNeeds: (distance: number) => { liters: number; cost: number };
  verifySafetyItems: () => { missing: string[]; unverified: string[] };
}

interface WheelsContextType {
  wheels: any[];
  addWheel: (wheel: any) => void;
  state: WheelsState;
  actions: WheelsActions;
}

const WheelsContext = createContext<WheelsContextType | undefined>(undefined);

export const WheelsProvider = ({ children }: { children: React.ReactNode }) => {
  const [wheels, setWheels] = useState<any[]>([]);

  const addWheel = (wheel: any) => {
    setWheels(prev => [...prev, wheel]);
  };

  const state: WheelsState = {
    currentTrip: null,
    fuelEfficiency: 8.5,
    safetyRequirements: []
  };

  const actions: WheelsActions = {
    checkMaintenanceForTrip: (date: Date) => [],
    calculateFuelNeeds: (distance: number) => ({ liters: distance / 8.5, cost: (distance / 8.5) * 1.85 }),
    verifySafetyItems: () => ({ missing: [], unverified: [] })
  };

  return (
    <WheelsContext.Provider value={{ wheels, addWheel, state, actions }}>
      {children}
    </WheelsContext.Provider>
  );
};

export const useWheels = () => {
  const context = useContext(WheelsContext);
  if (!context) {
    throw new Error('useWheels must be used within WheelsProvider');
  }
  return context;
};
