import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { pamService } from '@/services/pamService';
import { useTripStatus } from './useTripStatus';
import { useBudgetSummary } from './useBudgetSummary';

interface PamSuggestion {
  id: string;
  title: string;
  description: string;
  type: 'budget' | 'trip' | 'safety' | 'maintenance' | 'general';
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

export function usePamSuggestions() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<PamSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get current context data
  const { tripStatus } = useTripStatus();
  const { budgetSummary } = useBudgetSummary();

  // Generate contextual suggestions based on user data
  const generateSuggestions = async (): Promise<PamSuggestion[]> => {
    const suggestions: PamSuggestion[] = [];
    const now = new Date();

    // Budget-based suggestions
    if (budgetSummary) {
      if (budgetSummary.percentageUsed > 80) {
        suggestions.push({
          id: 'budget-warning',
          title: 'Budget Alert',
          description: `You've used ${budgetSummary.percentageUsed}% of your weekly budget with ${budgetSummary.daysRemaining} days remaining. Consider cooking more meals in your RV to save money.`,
          type: 'budget',
          priority: 'high',
          actionable: true,
          action: {
            label: 'View Budget Details',
            handler: () => window.location.href = '/wins'
          }
        });
      }

      // Fuel cost optimization
      if (budgetSummary.categoryBreakdown.fuel > budgetSummary.totalSpent * 0.4) {
        suggestions.push({
          id: 'fuel-optimization',
          title: 'Fuel Cost Optimization',
          description: 'I noticed fuel is taking up a large portion of your budget. Want to see cheaper gas stations along your route?',
          type: 'budget',
          priority: 'medium',
          actionable: true,
          action: {
            label: 'Find Cheaper Gas',
            handler: () => window.location.href = '/wheels'
          }
        });
      }
    }

    // Trip-based suggestions
    if (tripStatus?.isActive) {
      // Weather alert
      if (tripStatus.weatherAtDestination?.condition === 'Rain' || 
          tripStatus.weatherAtDestination?.condition === 'Storm') {
        suggestions.push({
          id: 'weather-alert',
          title: 'Weather Advisory',
          description: `${tripStatus.weatherAtDestination.condition} expected at ${tripStatus.nextStop?.name}. Consider checking covered camping options or adjusting your arrival time.`,
          type: 'trip',
          priority: 'high',
          actionable: false
        });
      }

      // Distance planning
      if (tripStatus.distanceRemaining && tripStatus.distanceRemaining > 500) {
        suggestions.push({
          id: 'long-distance-tip',
          title: 'Long Distance Ahead',
          description: `You have ${tripStatus.distanceRemaining}km to your destination. Consider planning rest stops every 2-3 hours for safety.`,
          type: 'safety',
          priority: 'medium',
          actionable: true,
          action: {
            label: 'Plan Rest Stops',
            handler: () => window.location.href = '/wheels'
          }
        });
      }
    }

    // General maintenance reminder (mock - would be based on vehicle data)
    const dayOfMonth = now.getDate();
    if (dayOfMonth === 1 || dayOfMonth === 15) {
      suggestions.push({
        id: 'maintenance-reminder',
        title: 'Maintenance Check',
        description: 'It\'s been a while since your last RV maintenance check. Regular maintenance helps prevent costly repairs on the road.',
        type: 'maintenance',
        priority: 'low',
        actionable: true,
        action: {
          label: 'Log Maintenance',
          handler: () => window.location.href = '/vehicles'
        }
      });
    }

    // Social suggestion
    if (tripStatus?.nextStop) {
      suggestions.push({
        id: 'social-meetup',
        title: 'RV Community Nearby',
        description: `There are 3 other Wheels & Wins members near ${tripStatus.nextStop.name}. Want to plan a meetup?`,
        type: 'general',
        priority: 'low',
        actionable: true,
        action: {
          label: 'View Members',
          handler: () => window.location.href = '/social'
        }
      });
    }

    return suggestions;
  };

  // Get AI-powered suggestions from PAM
  const fetchPamSuggestions = async () => {
    if (!user) return [];

    try {
      const token = await user.getIdToken();

      // Request contextual suggestions from PAM
      const response = await pamService.sendMessage({
        message: 'Generate dashboard suggestions',
        user_id: user.id,
        context: {
          current_page: 'dashboard',
          trip_active: !!tripStatus?.isActive,
          budget_status: budgetSummary ? {
            percentage_used: budgetSummary.percentageUsed,
            days_remaining: budgetSummary.daysRemaining
          } : null
        }
      }, token);

      // Parse PAM's response into suggestions
      if (response.response || response.content) {
        const content = response.response || response.content || '';
        // In a real implementation, PAM would return structured suggestions
        // For now, we'll use the generated suggestions
        return [];
      }
    } catch (error) {
      console.error('Error fetching PAM suggestions:', error);
      return [];
    }

    return [];
  };

  // Load suggestions
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!user) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Generate contextual suggestions
        const contextualSuggestions = await generateSuggestions();
        
        // Optionally fetch AI suggestions from PAM
        // const pamSuggestions = await fetchPamSuggestions();
        
        // Combine and sort by priority
        const allSuggestions = [...contextualSuggestions];
        allSuggestions.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        setSuggestions(allSuggestions.slice(0, 3)); // Show top 3 suggestions
      } catch (err) {
        console.error('Error loading PAM suggestions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load suggestions');
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSuggestions();
  }, [user, tripStatus, budgetSummary]);

  // Refresh suggestions
  const refreshSuggestions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      const contextualSuggestions = await generateSuggestions();
      setSuggestions(contextualSuggestions.slice(0, 3));
    } catch (err) {
      console.error('Error refreshing suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh suggestions');
    } finally {
      setLoading(false);
    }
  };

  // Dismiss a suggestion
  const dismissSuggestion = (suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  return {
    suggestions,
    loading,
    error,
    refreshSuggestions,
    dismissSuggestion,
    hasSuggestions: suggestions.length > 0
  };
}