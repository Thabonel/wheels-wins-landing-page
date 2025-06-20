
import React, { createContext, useContext, useState } from 'react';

interface WheelsContextType {
  wheels: any[];
  addWheel: (wheel: any) => void;
}

const WheelsContext = createContext<WheelsContextType | undefined>(undefined);

export const WheelsProvider = ({ children }: { children: React.ReactNode }) => {
  const [wheels, setWheels] = useState<any[]>([]);

  const addWheel = (wheel: any) => {
    setWheels(prev => [...prev, wheel]);
  };

  return (
    <WheelsContext.Provider value={{ wheels, addWheel }}>
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
