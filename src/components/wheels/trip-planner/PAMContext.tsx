import React, { createContext, useContext, useState, useEffect } from 'react';
import { Friend } from '../trip-planner/hooks/useSocialTripState';
import { Suggestion } from '../trip-planner/types';

export interface PAMTripContext {
  currentTrip: {
    origin: string;
    destination: string;
    waypoints: string[];
    budget: number;
    dates: { start: string; end: string };
    distance?: number;
    estimatedTime?: number;
  };
  userProfile: {
    rvSpecs: { length: number; mpg: number; fuelType: string };
    preferences: { maxDailyDistance: number; campgroundType: string };
    budget: { dailyLimit: number; totalBudget: number };
  };
  friends: Friend[];
  currentSuggestions: Suggestion[];
  isPlanning: boolean;
  chatHistory: PAMMessage[];
}

export interface PAMMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    suggestion?: string;
    action?: string;
    tripData?: any;
  };
}

export interface PAMSuggestion {
  id: string;
  type: 'route' | 'budget' | 'social' | 'weather' | 'scenic';
  title: string;
  description: string;
  impact: {
    cost: number;
    time: number;
    difficulty: 'easy' | 'medium' | 'hard';
  };
  confidence: number;
  actionable: boolean;
  data?: any;
}

interface PAMContextType {
  context: PAMTripContext;
  updateContext: (updates: Partial<PAMTripContext>) => void;
  addMessage: (message: Omit<PAMMessage, 'id' | 'timestamp'>) => void;
  suggestions: PAMSuggestion[];
  setSuggestions: (suggestions: PAMSuggestion[]) => void;
  isConnected: boolean;
  sendMessage: (content: string) => Promise<void>;
}

const PAMContext = createContext<PAMContextType | null>(null);

export const usePAMContext = () => {
  const context = useContext(PAMContext);
  if (!context) {
    throw new Error('usePAMContext must be used within a PAMProvider');
  }
  return context;
};

interface PAMProviderProps {
  children: React.ReactNode;
  initialTrip?: Partial<PAMTripContext['currentTrip']>;
}

export function PAMProvider({ children, initialTrip }: PAMProviderProps) {
  const [context, setContext] = useState<PAMTripContext>({
    currentTrip: {
      origin: '',
      destination: '',
      waypoints: [],
      budget: 1500,
      dates: { start: '', end: '' },
      ...initialTrip
    },
    userProfile: {
      rvSpecs: { length: 25, mpg: 8.5, fuelType: 'diesel' },
      preferences: { maxDailyDistance: 300, campgroundType: 'rv_parks' },
      budget: { dailyLimit: 150, totalBudget: 1500 }
    },
    friends: [],
    currentSuggestions: [],
    isPlanning: false,
    chatHistory: []
  });

  const [suggestions, setSuggestions] = useState<PAMSuggestion[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Simulate connection status
  useEffect(() => {
    setIsConnected(true);
  }, []);

  const updateContext = (updates: Partial<PAMTripContext>) => {
    setContext(prev => ({ ...prev, ...updates }));
  };

  const addMessage = (message: Omit<PAMMessage, 'id' | 'timestamp'>) => {
    const newMessage: PAMMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    setContext(prev => ({
      ...prev,
      chatHistory: [...prev.chatHistory, newMessage]
    }));
  };

  const sendMessage = async (content: string) => {
    // Add user message
    addMessage({ role: 'user', content });

    try {
      // Call Supabase Edge Function for PAM response
      const response = await fetch('/functions/v1/pam-trip-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          context: context,
          suggestions: suggestions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get PAM response');
      }

      const data = await response.json();
      
      // Add PAM response
      addMessage({ 
        role: 'assistant', 
        content: data.response,
        context: data.context 
      });

      // Update suggestions if provided
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }

      // Update trip context if modifications were made
      if (data.tripUpdates) {
        updateContext(data.tripUpdates);
      }

    } catch (error) {
      console.error('PAM message error:', error);
      
      // Fallback response
      addMessage({
        role: 'assistant',
        content: "I'm having trouble connecting right now. Let me help you with basic trip planning - could you tell me your destination and budget?"
      });
    }
  };

  const contextValue: PAMContextType = {
    context,
    updateContext,
    addMessage,
    suggestions,
    setSuggestions,
    isConnected,
    sendMessage
  };

  return (
    <PAMContext.Provider value={contextValue}>
      {children}
    </PAMContext.Provider>
  );
}