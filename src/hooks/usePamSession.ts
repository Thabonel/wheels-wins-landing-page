
import { useState, useEffect } from 'react';
import { PamSessionData } from '@/types/pamTypes';

export function usePamSession(userId?: string) {
  const [sessionData, setSessionData] = useState<PamSessionData>({
    messageCount: 0,
    previousIntents: [],
    isFirstTime: true
  });

  useEffect(() => {
    if (!userId) return;

    // Load session data from localStorage
    const storageKey = `pam_session_${userId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const parsedData = JSON.parse(stored);
        setSessionData({
          ...parsedData,
          isFirstTime: false
        });
      } catch (error) {
        console.error('Error parsing PAM session data:', error);
      }
    }
  }, [userId]);

  const updateSession = (intent: string) => {
    if (!userId) return;

    const newSessionData = {
      messageCount: sessionData.messageCount + 1,
      previousIntents: [...sessionData.previousIntents, intent].slice(-10), // Keep last 10 intents
      isFirstTime: sessionData.isFirstTime
    };

    setSessionData(newSessionData);

    // Save to localStorage
    const storageKey = `pam_session_${userId}`;
    localStorage.setItem(storageKey, JSON.stringify(newSessionData));
  };

  return {
    sessionData,
    updateSession
  };
}
