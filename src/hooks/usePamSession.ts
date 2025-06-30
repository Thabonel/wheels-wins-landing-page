
import { useState, useEffect } from 'react';

export const usePamSession = (userId?: string) => {
  const [sessionData, setSessionData] = useState(() => {
    try {
      const stored = sessionStorage.getItem('pam-session');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const updateSession = (data: any) => {
    setSessionData(prev => {
      const updated = { ...prev, ...data };
      try {
        sessionStorage.setItem('pam-session', JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  };

  const clearSession = () => {
    setSessionData({});
    try {
      sessionStorage.removeItem('pam-session');
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    try {
      sessionStorage.setItem('pam-session', JSON.stringify(sessionData));
    } catch {
      // ignore storage errors
    }
  }, [sessionData]);

  return {
    sessionData,
    updateSession,
    clearSession,
  };
};
