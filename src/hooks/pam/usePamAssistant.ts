/**
 * PAM Assistant Hook - Simple, elegant interface
 * Apple-style "it just works" API for developers
 */

import { useCallback } from 'react';
import { usePam } from '@/context/PamContext';

/**
 * Simple hook for PAM integration throughout the app
 * Provides a clean, Apple-style API that "just works"
 */
export const usePamAssistant = () => {
  const pam = usePam();

  /**
   * Ask PAM a question with optional context
   * Automatically handles complexity and provides intelligent responses
   */
  const ask = useCallback(async (
    question: string, 
    context?: {
      page?: string;
      data?: any;
      priority?: 'low' | 'normal' | 'high';
    }
  ) => {
    if (!pam.isAvailable) {
      return "PAM is not available right now. Please try again later.";
    }

    try {
      return await pam.generateResponse(question, {
        source_page: context?.page,
        additional_data: context?.data,
        priority: context?.priority || 'normal',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('PAM Assistant error:', error);
      return "I'm having trouble processing that right now. Could you try rephrasing?";
    }
  }, [pam]);

  /**
   * Get contextual help for current page/feature
   */
  const getHelp = useCallback(async (page: string, userAction?: string) => {
    const helpQueries = {
      wheels: "How can I plan my next trip?",
      wins: "How can I manage my travel expenses?",
      social: "How can I connect with other travelers?",
      shop: "What travel gear do you recommend?",
      you: "How can I track my travel experiences?"
    };

    const baseQuery = helpQueries[page as keyof typeof helpQueries] || 
                     `How can I use the ${page} feature effectively?`;
    
    const query = userAction ? 
                 `I'm trying to ${userAction} on the ${page} page. Can you help?` : 
                 baseQuery;

    return ask(query, { page, priority: 'high' });
  }, [ask]);

  /**
   * Get proactive suggestions for the current context
   */
  const getSuggestions = useCallback(async () => {
    if (!pam.isAvailable) return [];

    try {
      const suggestions = await pam.getProactiveAssistance();
      return suggestions.slice(0, 3); // Limit to avoid overwhelming users
    } catch (error) {
      console.warn('Failed to get PAM suggestions:', error);
      return [];
    }
  }, [pam]);

  /**
   * Get recommendations for specific domain
   */
  const getRecommendations = useCallback(async (
    type: 'travel' | 'financial' | 'social' | 'shopping'
  ) => {
    if (!pam.isAvailable) return [];

    try {
      return await pam.getRecommendations(type);
    } catch (error) {
      console.warn(`Failed to get ${type} recommendations:`, error);
      return [];
    }
  }, [pam]);

  /**
   * Update PAM's understanding of current context
   */
  const updateContext = useCallback((context: {
    currentTrip?: any;
    recentExpenses?: any[];
    location?: { lat: number; lng: number };
    userAction?: string;
  }) => {
    pam.updateContext(context);
  }, [pam]);

  /**
   * Quick status check
   */
  const isReady = pam.isAvailable && !pam.isLoading && !pam.error;

  return {
    // Core functions
    ask,
    getHelp,
    getSuggestions,
    getRecommendations,
    updateContext,
    
    // Status
    isReady,
    isLoading: pam.isLoading,
    error: pam.error,
    capabilities: pam.capabilities,
    
    // Utility
    canHelp: (domain: 'travel' | 'financial' | 'social' | 'shopping') => {
      return pam.capabilities?.domain_expertise?.[`${domain}_${domain === 'financial' ? 'management' : domain === 'travel' ? 'planning' : domain === 'shopping' ? 'recommendations' : 'networking'}`] || false;
    }
  };
};

/**
 * Hook for specific domain assistance
 */
export const usePamDomainAssistant = (domain: 'travel' | 'financial' | 'social' | 'shopping') => {
  const pam = usePamAssistant();

  return {
    ...pam,
    ask: (question: string, context?: any) => 
      pam.ask(question, { ...context, domain }),
    getRecommendations: () => 
      pam.getRecommendations(domain),
    isAvailable: pam.canHelp(domain)
  };
};