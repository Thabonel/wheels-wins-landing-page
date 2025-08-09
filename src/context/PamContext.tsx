/**
 * PAM Context - Intelligent AI Assistant Context
 * Manages agentic capabilities, proactive assistance, and contextual awareness
 * Implements Apple-style "it just works" philosophy
 */

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { pamAgenticService, type AgenticCapabilities } from '@/services/pamAgenticService';
import { useAuth } from '@/context/AuthContext';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { trackPAMMetrics } from '@/lib/sentry';

interface PamContextType {
  // Core capabilities
  isAvailable: boolean;
  capabilities: AgenticCapabilities | null;
  
  // Intelligent assistance
  generateResponse: (message: string, context?: any) => Promise<string>;
  getProactiveAssistance: () => Promise<string[]>;
  
  // Contextual awareness
  updateContext: (context: Partial<PamContextData>) => void;
  getRecommendations: (type: 'travel' | 'financial' | 'social' | 'shopping') => Promise<any[]>;
  
  // System status
  isLoading: boolean;
  error: string | null;
}

interface PamContextData {
  location?: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
  };
  currentTrip?: any;
  recentExpenses?: any[];
  preferences?: any;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  weatherData?: any;
}

const PamContext = createContext<PamContextType | undefined>(undefined);

export const usePam = () => {
  const context = useContext(PamContext);
  if (!context) {
    throw new Error('usePam must be used within a PamProvider');
  }
  return context;
};

interface PamProviderProps {
  children: React.ReactNode;
}

export const PamProvider: React.FC<PamProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const { getCurrentLocation } = useLocationTracking();
  
  const [isAvailable, setIsAvailable] = useState(false);
  const [capabilities, setCapabilities] = useState<AgenticCapabilities | null>(null);
  const [contextData, setContextData] = useState<PamContextData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize PAM capabilities
  useEffect(() => {
    let mounted = true;

    const initializePam = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const capabilityResponse = await pamAgenticService.getCapabilities();
        
        if (mounted && capabilityResponse.success) {
          setCapabilities(capabilityResponse.capabilities || null);
          setIsAvailable(true);
          setError(null);
          
          // Track initialization
          trackPAMMetrics('pam_initialized', {
            capabilities: Object.keys(capabilityResponse.capabilities?.domain_expertise || {}),
            version: capabilityResponse.version
          });
        }
      } catch (err) {
        if (mounted) {
          console.warn('PAM capabilities not available:', err);
          setError('PAM services temporarily unavailable');
          setIsAvailable(false);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializePam();
    
    return () => {
      mounted = false;
    };
  }, [user]);

  // Update contextual data periodically
  useEffect(() => {
    if (!isAvailable) return;

    const updateContextualData = async () => {
      try {
        // Get current location
        const location = await getCurrentLocation();
        
        // Determine time of day
        const hour = new Date().getHours();
        let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
        if (hour < 12) timeOfDay = 'morning';
        else if (hour < 17) timeOfDay = 'afternoon';
        else if (hour < 21) timeOfDay = 'evening';
        else timeOfDay = 'night';

        setContextData(prev => ({
          ...prev,
          location: location ? {
            lat: location.latitude,
            lng: location.longitude
          } : undefined,
          timeOfDay,
          preferences: settings
        }));
      } catch (err) {
        console.warn('Failed to update contextual data:', err);
      }
    };

    updateContextualData();
    
    // Update context every 5 minutes
    const interval = setInterval(updateContextualData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAvailable, getCurrentLocation, settings]);

  // Intelligent response generation
  const generateResponse = useCallback(async (message: string, additionalContext?: any) => {
    if (!isAvailable) {
      throw new Error('PAM is not available');
    }

    try {
      setIsLoading(true);
      setError(null);

      const context = {
        ...contextData,
        ...additionalContext,
        timestamp: new Date().toISOString(),
        user_id: user?.id
      };

      const result = await pamAgenticService.planAndExecute(message, context);
      
      if (result.execution.success && result.execution.execution_result) {
        // Track successful interaction
        trackPAMMetrics('pam_response_generated', {
          complexity: result.plan.plan?.complexity,
          tools_used: result.execution.execution_result.tools_used,
          execution_time: result.execution.execution_result.execution_time
        });

        return result.execution.execution_result.response;
      } else {
        throw new Error(result.execution.error || 'Failed to generate response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Graceful fallback
      const fallbackResponses = [
        "I'm having trouble processing that right now. Could you try rephrasing?",
        "Let me think about that differently. Can you provide more details?",
        "I'm working on understanding your request. Can you be more specific?"
      ];
      
      return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, contextData, user?.id]);

  // Proactive assistance suggestions
  const getProactiveAssistance = useCallback(async () => {
    if (!isAvailable || !capabilities) return [];

    try {
      const { timeOfDay, location, currentTrip } = contextData;
      const suggestions: string[] = [];

      // Time-based suggestions
      if (timeOfDay === 'morning') {
        suggestions.push("Good morning! Would you like me to check your itinerary for today?");
      } else if (timeOfDay === 'evening') {
        suggestions.push("How was your day? Would you like to log any expenses or experiences?");
      }

      // Location-based suggestions
      if (location && capabilities.domain_expertise.travel_planning) {
        suggestions.push("I notice you're in a new area. Want recommendations for nearby attractions?");
      }

      // Trip-based suggestions
      if (currentTrip && capabilities.domain_expertise.financial_management) {
        suggestions.push("Would you like me to summarize your trip expenses so far?");
      }

      return suggestions.slice(0, 2); // Limit to 2 suggestions to avoid overwhelming
    } catch (err) {
      console.warn('Failed to get proactive assistance:', err);
      return [];
    }
  }, [isAvailable, capabilities, contextData]);

  // Update context data
  const updateContext = useCallback((newContext: Partial<PamContextData>) => {
    setContextData(prev => ({ ...prev, ...newContext }));
  }, []);

  // Get domain-specific recommendations
  const getRecommendations = useCallback(async (type: 'travel' | 'financial' | 'social' | 'shopping') => {
    if (!isAvailable || !capabilities) return [];

    try {
      const domainMap = {
        travel: 'travel_planning',
        financial: 'financial_management',
        social: 'social_networking',
        shopping: 'shopping_recommendations'
      };

      const domain = domainMap[type];
      if (!capabilities.domain_expertise[domain as keyof typeof capabilities.domain_expertise]) {
        return [];
      }

      const context = {
        ...contextData,
        domain_focus: type,
        request_type: 'recommendations'
      };

      const result = await pamAgenticService.createPlan(
        `Get ${type} recommendations based on current context`,
        context
      );

      // Parse recommendations from plan
      if (result.success && result.plan) {
        return result.plan.steps.map(step => ({
          title: step.action,
          description: step.description,
          tool: step.tool,
          estimatedTime: step.estimated_duration
        }));
      }

      return [];
    } catch (err) {
      console.warn(`Failed to get ${type} recommendations:`, err);
      return [];
    }
  }, [isAvailable, capabilities, contextData]);

  const value: PamContextType = {
    isAvailable,
    capabilities,
    generateResponse,
    getProactiveAssistance,
    updateContext,
    getRecommendations,
    isLoading,
    error
  };

  return (
    <PamContext.Provider value={value}>
      {children}
    </PamContext.Provider>
  );
};