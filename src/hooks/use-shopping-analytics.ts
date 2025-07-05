
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
      // Insert interaction record
      await supabase.from('product_interactions').insert({
        user_id: user.id,
        product_id: data.productId,
        interaction_type: data.interactionType,
        duration_seconds: data.durationSeconds || 0,
        context_data: data.contextData || {}
      });

      // Record product view separately
      if (data.interactionType === 'view') {
        await supabase.from('product_views').insert({
          user_id: user.id,
          product_id: data.productId,
          duration_seconds: data.durationSeconds || 0,
          category: data.contextData?.category,
          price: data.contextData?.price,
          region: data.contextData?.region,
          context_data: data.contextData || {}
        });
      }

      // Update session totals
      if (currentSession?.id) {
        const updates: Partial<ShoppingSession> = {
          totalInteractions: currentSession.totalInteractions + 1,
          totalViews:
            currentSession.totalViews + (data.interactionType === 'view' ? 1 : 0),
          itemsPurchased:
            currentSession.itemsPurchased +
            (data.interactionType === 'purchase' ? 1 : 0),
          totalSpent:
            currentSession.totalSpent +
            (data.interactionType === 'purchase'
              ? data.contextData?.price || 0
              : 0)
        };

        await supabase
          .from('shopping_sessions')
          .update(updates)
          .eq('id', currentSession.id);

        setCurrentSession(prev => (prev ? { ...prev, ...updates } : prev));
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
        .insert({ user_id: user.id })
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
        .update({ session_end: new Date().toISOString() })
        .eq('id', currentSession.id);

      setCurrentSession(null);
      setIsTracking(false);
    } catch (error) {
      console.error('Error ending shopping session:', error);
    }
  }, [user, currentSession, isTracking]);

  const fetchSessions = useCallback(async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('shopping_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('session_start', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }

    return data || [];
  }, [user]);

  const fetchSessionSummary = useCallback(async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('shopping_sessions')
      .select('total_views, total_interactions, items_purchased, total_spent')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching session summary:', error);
      return null;
    }

    return (data || []).reduce(
      (acc, cur) => ({
        total_views: acc.total_views + (cur.total_views || 0),
        total_interactions:
          acc.total_interactions + (cur.total_interactions || 0),
        items_purchased: acc.items_purchased + (cur.items_purchased || 0),
        total_spent: acc.total_spent + (parseFloat(cur.total_spent as any) || 0)
      }),
      { total_views: 0, total_interactions: 0, items_purchased: 0, total_spent: 0 }
    );
  }, [user]);

  return {
    trackProductInteraction,
    startShoppingSession,
    endShoppingSession,
    fetchSessions,
    fetchSessionSummary,
    currentSession,
    isTracking
  };
}
