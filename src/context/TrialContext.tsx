/**
 * Trial Context - Manages 28-day free trial state and habit-building nudges
 * Provides centralized access to trial information and milestone tracking
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { trialService, type TrialInfo, type MilestoneType } from '@/services/trialService';

interface TrialContextType {
  trialInfo: TrialInfo | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshTrial: () => Promise<void>;
  completeMilestone: (milestone: MilestoneType, metadata?: any) => Promise<void>;
  logEvent: (eventType: string, metadata?: any) => Promise<void>;
  shouldShowNudge: (dayNumber: number) => Promise<boolean>;
  convertToPaid: () => Promise<boolean>;
  
  // Computed values
  showTrialBanner: boolean;
  currentNudge: {
    type: 'modal' | 'banner' | 'toast' | 'footer' | null;
    title: string;
    message: string;
    cta: string;
  } | null;
}

const TrialContext = createContext<TrialContextType | undefined>(undefined);

export const useTrial = () => {
  const context = useContext(TrialContext);
  if (!context) {
    throw new Error('useTrial must be used within a TrialProvider');
  }
  return context;
};

interface TrialProviderProps {
  children: React.ReactNode;
}

export const TrialProvider: React.FC<TrialProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastNudgeCheck, setLastNudgeCheck] = useState<number | null>(null);

  // Refresh trial information
  const refreshTrial = async () => {
    if (!user) {
      setTrialInfo(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const info = await trialService.getTrialInfo(user.id);
      setTrialInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trial info');
      console.error('Error refreshing trial:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Complete a milestone
  const completeMilestone = async (milestone: MilestoneType, metadata?: any) => {
    try {
      await trialService.completeMilestone(milestone, metadata);
      await refreshTrial(); // Refresh to show updated progress
    } catch (err) {
      console.error('Error completing milestone:', err);
    }
  };

  // Log trial event
  const logEvent = async (eventType: string, metadata?: any) => {
    try {
      await trialService.logEvent(eventType as any, metadata);
    } catch (err) {
      console.error('Error logging event:', err);
    }
  };

  // Check if nudge should be shown
  const shouldShowNudge = async (dayNumber: number) => {
    try {
      return await trialService.shouldShowNudge(dayNumber);
    } catch (err) {
      console.error('Error checking nudge:', err);
      return false;
    }
  };

  // Convert trial to paid
  const convertToPaid = async () => {
    try {
      const success = await trialService.convertToPaid();
      if (success) {
        await refreshTrial();
      }
      return success;
    } catch (err) {
      console.error('Error converting trial:', err);
      return false;
    }
  };

  // Initialize trial data on mount
  useEffect(() => {
    if (user) {
      refreshTrial();
    }
  }, [user]);

  // Computed values
  const showTrialBanner = Boolean(
    trialInfo?.isActive || 
    (trialInfo?.isExpired && !trialInfo?.isConverted)
  );

  const currentNudge = trialInfo?.isActive 
    ? trialService.getNudgeForDay(trialInfo.dayNumber)
    : null;

  // Check for nudges periodically
  useEffect(() => {
    if (!trialInfo?.isActive || !currentNudge) return;

    const checkNudge = async () => {
      const now = Date.now();
      // Only check once per hour to avoid spam
      if (lastNudgeCheck && now - lastNudgeCheck < 60 * 60 * 1000) return;

      const shouldShow = await shouldShowNudge(trialInfo.dayNumber);
      if (shouldShow) {
        await logEvent('nudge_shown', { 
          day: trialInfo.dayNumber, 
          type: currentNudge.type 
        });
        setLastNudgeCheck(now);
      }
    };

    checkNudge();
  }, [trialInfo, currentNudge, lastNudgeCheck]);

  const value: TrialContextType = {
    trialInfo,
    isLoading,
    error,
    refreshTrial,
    completeMilestone,
    logEvent,
    shouldShowNudge,
    convertToPaid,
    showTrialBanner,
    currentNudge
  };

  return (
    <TrialContext.Provider value={value}>
      {children}
    </TrialContext.Provider>
  );
};