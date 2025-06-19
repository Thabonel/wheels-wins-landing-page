
import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface InteractionData {
  productId: string;
  interactionType: 'view' | 'click' | 'add_to_cart' | 'purchase' | 'favorite' | 'share';
  durationSeconds?: number;
  contextData?: Record<string, any>;
}

interface ShoppingSession {
  id?: string;
  totalViews: number;
  totalInteractions: number;
  itemsPurchased: number;
  totalSpent: number;
}

export function useShoppingAnalytics() {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<ShoppingSession | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const trackProductInteraction = useCallback(async (data: InteractionData) => {
    if (!user) return;

    try {
      await supabase
        .from('product_interactions')
        .insert({
          user_id: user.id,
          product_id: data.productId,
          interaction_type: data.interactionType,
          duration_seconds: data.durationSeconds || 0,
          context_data: data.contextData || {}
        });

      // Update current session
      if (currentSession) {
        setCurrentSession(prev => prev ? {
          ...prev,
          totalInteractions: prev.totalInteractions + 1,
          ...(data.interactionType === 'view' && { totalViews: prev.totalViews + 1 }),
          ...(data.interactionType === 'purchase' && { 
            itemsPurchased: prev.itemsPurchased + 1,
            totalSpent: prev.totalSpent + (data.contextData?.price || 0)
          })
        } : null);
      }
    } catch (error) {
      console.error('Error tracking product interaction:', error);
    }
  }, [user, currentSession]);

  const startShoppingSession = useCallback(async () => {
    if (!user || isTracking) return;

    try {
      const { data, error } = await supabase
        .from('shopping_sessions')
        .insert({
          user_id: user.id,
          session_start: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession({
        id: data.id,
        totalViews: 0,
        totalInteractions: 0,
        itemsPurchased: 0,
        totalSpent: 0
      });
      setIsTracking(true);
    } catch (error) {
      console.error('Error starting shopping session:', error);
    }
  }, [user, isTracking]);

  const endShoppingSession = useCallback(async () => {
    if (!user || !currentSession || !isTracking) return;

    try {
      await supabase
        .from('shopping_sessions')
        .update({
          session_end: new Date().toISOString(),
          total_views: currentSession.totalViews,
          total_interactions: currentSession.totalInteractions,
          items_purchased: currentSession.itemsPurchased,
          total_spent: currentSession.totalSpent
        })
        .eq('id', currentSession.id);

      setCurrentSession(null);
      setIsTracking(false);
    } catch (error) {
      console.error('Error ending shopping session:', error);
    }
  }, [user, currentSession, isTracking]);

  return {
    trackProductInteraction,
    startShoppingSession,
    endShoppingSession,
    currentSession,
    isTracking
  };
}
