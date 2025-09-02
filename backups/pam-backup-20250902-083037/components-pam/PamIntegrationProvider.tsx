import React, { createContext, useContext, useEffect } from 'react';
import { usePamTripIntegration } from '@/hooks/pam/usePamTripIntegration';
import { usePamCalendarIntegration } from '@/hooks/pam/usePamCalendarIntegration';
import { usePamExpenseIntegration } from '@/hooks/pam/usePamExpenseIntegration';
import { useToast } from '@/hooks/use-toast';

interface PamIntegrationContextType {
  displayRoute: (origin: string, destination: string) => void;
  addEvent: (title: string, date: string, time?: string) => void;
  addExpense: (amount: number, category: string, description: string, date?: string) => void;
}

const PamIntegrationContext = createContext<PamIntegrationContextType | null>(null);

export function usePamIntegration() {
  const context = useContext(PamIntegrationContext);
  if (!context) {
    throw new Error('usePamIntegration must be used within a PamIntegrationProvider');
  }
  return context;
}

interface PamIntegrationProviderProps {
  children: React.ReactNode;
}

/**
 * Provider that enables PAM integration across the entire app
 * Handles route display, calendar events, expense tracking, and more
 */
export function PamIntegrationProvider({ children }: PamIntegrationProviderProps) {
  const { toast } = useToast();

  // Initialize integration hooks
  const { displayRoute } = usePamTripIntegration({
    onRouteReceived: (routeData) => {
      toast({
        title: "Route Planned by PAM",
        description: `Planning route from ${routeData.origin.name} to ${routeData.destination.name}`,
      });
    }
  });

  const { addEvent } = usePamCalendarIntegration({
    onEventReceived: (eventData) => {
      toast({
        title: "Event Added by PAM",
        description: `${eventData.title} scheduled for ${eventData.date} ${eventData.time || ''}`,
      });
    }
  });

  const { addExpense } = usePamExpenseIntegration({
    onExpenseReceived: (expenseData) => {
      toast({
        title: "Expense Added by PAM",
        description: `$${expenseData.amount} for ${expenseData.category}`,
      });
    }
  });

  // Global PAM integration setup
  useEffect(() => {
    // Log when PAM integration is active
    console.log('🤖 PAM Integration Provider active');
    
    // Listen for global PAM events
    const handlePamSuccess = (event: CustomEvent) => {
      toast({
        title: "PAM Action Completed",
        description: event.detail.message || "PAM successfully completed the action",
      });
    };

    const handlePamError = (event: CustomEvent) => {
      toast({
        title: "PAM Error",
        description: event.detail.message || "PAM encountered an error",
        variant: "destructive",
      });
    };

    window.addEventListener('pam-success', handlePamSuccess as EventListener);
    window.addEventListener('pam-error', handlePamError as EventListener);

    return () => {
      window.removeEventListener('pam-success', handlePamSuccess as EventListener);
      window.removeEventListener('pam-error', handlePamError as EventListener);
    };
  }, [toast]);

  const contextValue: PamIntegrationContextType = {
    displayRoute,
    addEvent,
    addExpense,
  };

  return (
    <PamIntegrationContext.Provider value={contextValue}>
      {children}
    </PamIntegrationContext.Provider>
  );
}