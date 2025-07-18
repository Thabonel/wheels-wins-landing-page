
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionData {
  id: number;
  user_id: number;
  trial_ends_at: string | null;
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled';
  plan_type: 'free_trial' | 'monthly' | 'annual';
  video_course_access?: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_ends_at?: string;
  subscription_started_at?: string;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', parseInt(user!.id))
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
        return;
      }

      if (data) {
        setSubscription({
          ...data,
          video_course_access: false,
          subscription_status: data.subscription_status as 'trial' | 'active' | 'expired' | 'cancelled',
          plan_type: data.plan_type as 'free_trial' | 'monthly' | 'annual'
        });
        
        // Calculate days remaining for trial users
        if (data.plan_type === 'free_trial' && data.trial_ends_at) {
          const trialEnd = new Date(data.trial_ends_at);
          const now = new Date();
          const diffTime = trialEnd.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysRemaining(Math.max(0, diffDays));
        }
      } else {
        // If no subscription found, create a trial subscription
        await createTrialSubscription();
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTrialSubscription = async () => {
    if (!user) return;

    try {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30);

      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: parseInt(user.id),
          trial_ends_at: trialEndDate.toISOString(),
          subscription_status: 'trial',
          plan_type: 'free_trial',
          video_course_access: false,
          subscription_started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      
      setSubscription({
        ...data,
        video_course_access: false,
        subscription_status: data.subscription_status as 'trial' | 'active' | 'expired' | 'cancelled',
        plan_type: data.plan_type as 'free_trial' | 'monthly' | 'annual'
      });
      setDaysRemaining(30);
      return data;
    } catch (error) {
      console.error('Error creating trial subscription:', error);
      throw error;
    }
  };

  const isTrialUser = subscription?.plan_type === 'free_trial';
  const isMonthlyUser = subscription?.plan_type === 'monthly';
  const isAnnualUser = subscription?.plan_type === 'annual';
  const hasVideoAccess = subscription?.video_course_access || false;
  const isTrialExpired = isTrialUser && daysRemaining !== null && daysRemaining <= 0;
  const isTrialEndingSoon = isTrialUser && daysRemaining !== null && daysRemaining <= 5;

  return {
    subscription,
    loading,
    daysRemaining,
    isTrialUser,
    isMonthlyUser,
    isAnnualUser,
    hasVideoAccess,
    isTrialExpired,
    isTrialEndingSoon,
    fetchSubscription,
    createTrialSubscription
  };
}
