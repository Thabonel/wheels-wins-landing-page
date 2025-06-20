
import { useState } from 'react';

export const usePamSession = (userId?: string) => {
  const [sessionData, setSessionData] = useState({});

  const updateSession = (data: any) => {
    setSessionData(prev => ({ ...prev, ...data }));
  };

  return {
    sessionData,
    updateSession,
  };
};
