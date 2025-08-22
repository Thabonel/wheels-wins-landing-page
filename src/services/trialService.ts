import { supabase } from '@/lib/supabase';
import { addDays, differenceInDays, format } from 'date-fns';

export type TrialStatus = 'none' | 'active' | 'expired' | 'converted';
export type TrialEventType = 
  | 'nudge_shown' 
  | 'email_sent' 
  | 'cta_click' 
  | 'upgrade_attempt'
  | 'limit_hit' 
  | 'import_done' 
  | 'route_saved' 
  | 'budget_set'
  | 'fuel_linked' 
  | 'reminders_enabled'
  | 'milestone_completed';

export type LimitType = 'devices' | 'storage' | 'routes' | 'doc_views';

export type MilestoneType = 
  | 'import_expenses'
  | 'save_route'
  | 'set_budget'
  | 'link_fuel'
  | 'enable_reminders';

export interface Trial {
  id: string;
  user_id: string;
  started_at: string;
  expires_at: string;
  status: TrialStatus;
  conversion_at?: string;
  origin?: string;
  referral_code?: string;
}

export interface TrialEvent {
  id: string;
  user_id: string;
  trial_id: string;
  event_type: TrialEventType;
  day_number: number;
  metadata?: any;
  created_at: string;
}

export interface TrialLimit {
  limit_type: LimitType;
  current_usage: number;
  max_allowed: number;
  is_within_limit: boolean;
}

export interface TrialMilestone {
  milestone_type: MilestoneType;
  completed_at?: string;
  metadata?: any;
}

export interface TrialInfo {
  trial: Trial | null;
  daysLeft: number;
  dayNumber: number;
  isActive: boolean;
  isExpired: boolean;
  isConverted: boolean;
  milestones: TrialMilestone[];
  completedMilestones: number;
}

class TrialService {
  private static instance: TrialService;
  private trialCache: Map<string, { data: TrialInfo; timestamp: number }> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): TrialService {
    if (!TrialService.instance) {
      TrialService.instance = new TrialService();
    }
    return TrialService.instance;
  }

  /**
   * Get trial information for current user
   */
  async getTrialInfo(userId?: string): Promise<TrialInfo | null> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      }

      if (!userId) return null;

      // Check cache
      const cached = this.trialCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }

      // Fetch trial data
      const { data: trial, error: trialError } = await supabase
        .from('trials')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (trialError || !trial) {
        return null;
      }

      // Fetch milestones
      const { data: milestones } = await supabase
        .from('trial_milestones')
        .select('milestone_type, completed_at, metadata')
        .eq('user_id', userId);

      // Calculate trial metrics
      const now = new Date();
      const expiresAt = new Date(trial.expires_at);
      const startedAt = new Date(trial.started_at);
      const daysLeft = Math.max(0, Math.ceil(differenceInDays(expiresAt, now)));
      const dayNumber = Math.max(1, Math.ceil(differenceInDays(now, startedAt)) + 1);

      const trialInfo: TrialInfo = {
        trial,
        daysLeft,
        dayNumber,
        isActive: trial.status === 'active' && daysLeft > 0,
        isExpired: trial.status === 'expired' || daysLeft === 0,
        isConverted: trial.status === 'converted',
        milestones: milestones || [],
        completedMilestones: milestones?.filter(m => m.completed_at).length || 0
      };

      // Cache the result
      this.trialCache.set(userId, { data: trialInfo, timestamp: Date.now() });

      return trialInfo;
    } catch (error) {
      console.error('Error fetching trial info:', error);
      return null;
    }
  }

  /**
   * Create a new trial for user
   */
  async createTrial(userId: string, origin: 'wheels' | 'unimog' = 'wheels', referralCode?: string): Promise<Trial | null> {
    try {
      const { data, error } = await supabase
        .from('trials')
        .insert({
          user_id: userId,
          origin,
          referral_code: referralCode
        })
        .select()
        .single();

      if (error) throw error;

      // Update profile
      await supabase
        .from('profiles')
        .update({ trial_status: 'active' })
        .eq('id', userId);

      // Initialize limits
      await this.initializeTrialLimits(userId);

      // Clear cache
      this.trialCache.delete(userId);

      return data;
    } catch (error) {
      console.error('Error creating trial:', error);
      return null;
    }
  }

  /**
   * Initialize trial limits for new user
   */
  private async initializeTrialLimits(userId: string): Promise<void> {
    const limits = [
      { limit_type: 'devices', max_allowed: 2 },
      { limit_type: 'storage', max_allowed: 5368709120 }, // 5GB
      { limit_type: 'routes', max_allowed: 10 },
      { limit_type: 'doc_views', max_allowed: 500 }
    ];

    for (const limit of limits) {
      await supabase
        .from('trial_limits')
        .insert({
          user_id: userId,
          ...limit,
          current_usage: 0
        });
    }
  }

  /**
   * Log a trial event
   */
  async logEvent(eventType: TrialEventType, metadata?: any): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc('log_trial_event', {
        p_user_id: user.id,
        p_event_type: eventType,
        p_metadata: metadata || {}
      });
    } catch (error) {
      console.error('Error logging trial event:', error);
    }
  }

  /**
   * Check if user is within trial limit
   */
  async checkLimit(limitType: LimitType): Promise<TrialLimit | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .rpc('check_trial_limit', {
          p_user_id: user.id,
          p_limit_type: limitType
        })
        .single();

      if (error) throw error;

      return {
        limit_type: limitType,
        current_usage: data.current_usage,
        max_allowed: data.max_allowed,
        is_within_limit: data.is_within_limit
      };
    } catch (error) {
      console.error('Error checking limit:', error);
      return null;
    }
  }

  /**
   * Increment trial limit usage
   */
  async incrementLimit(limitType: LimitType, amount: number = 1): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .rpc('increment_trial_limit', {
          p_user_id: user.id,
          p_limit_type: limitType,
          p_amount: amount
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error incrementing limit:', error);
      return false;
    }
  }

  /**
   * Complete a trial milestone
   */
  async completeMilestone(milestoneType: MilestoneType, metadata?: any): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc('complete_trial_milestone', {
        p_user_id: user.id,
        p_milestone_type: milestoneType,
        p_metadata: metadata || {}
      });

      // Clear cache to refresh milestone data
      this.trialCache.delete(user.id);

      // Log event
      await this.logEvent('milestone_completed', { milestone: milestoneType });
    } catch (error) {
      console.error('Error completing milestone:', error);
    }
  }

  /**
   * Convert trial to paid subscription
   */
  async convertToPaid(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      await supabase.rpc('convert_trial_to_paid', {
        p_user_id: user.id
      });

      // Clear cache
      this.trialCache.delete(user.id);

      return true;
    } catch (error) {
      console.error('Error converting trial:', error);
      return false;
    }
  }

  /**
   * Get nudge for current day
   */
  getNudgeForDay(dayNumber: number): {
    type: 'modal' | 'banner' | 'toast' | 'footer' | null;
    title: string;
    message: string;
    cta: string;
  } | null {
    const nudges = {
      3: {
        type: 'modal' as const,
        title: 'Lock in your progress',
        message: 'Import expenses and save your first route today to build momentum.',
        cta: 'Do it now'
      },
      12: {
        type: 'banner' as const,
        title: "You've built momentum",
        message: 'Set your monthly budget to see projected savings.',
        cta: 'Set budget'
      },
      21: {
        type: 'banner' as const,
        title: 'This is your data now',
        message: 'Your routes, budgets, and logs are yours. Keep them safe.',
        cta: 'Add card to continue'
      },
      26: {
        type: 'footer' as const,
        title: 'Keep everything you\'ve created',
        message: 'Your trial ends in 2 days. Add a card to continue.',
        cta: 'Keep your data'
      },
      28: {
        type: 'modal' as const,
        title: 'Your trial has ended',
        message: 'Your data is preserved. Upgrade to continue where you left off.',
        cta: 'Upgrade now'
      }
    };

    return nudges[dayNumber as keyof typeof nudges] || null;
  }

  /**
   * Check if nudge should be shown
   */
  async shouldShowNudge(dayNumber: number): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if nudge was already shown today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('trial_events')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_type', 'nudge_shown')
        .eq('day_number', dayNumber)
        .gte('created_at', today.toISOString())
        .limit(1);

      return !data || data.length === 0;
    } catch (error) {
      console.error('Error checking nudge status:', error);
      return false;
    }
  }

  /**
   * Get trial summary for email
   */
  async getTrialSummary(userId: string): Promise<{
    routesSaved: number;
    expensesLogged: number;
    fuelInsights: number;
    tipsUnlocked: number;
    daysActive: number;
  }> {
    try {
      // Get various metrics from trial events
      const { data: events } = await supabase
        .from('trial_events')
        .select('event_type, metadata')
        .eq('user_id', userId);

      const summary = {
        routesSaved: events?.filter(e => e.event_type === 'route_saved').length || 0,
        expensesLogged: events?.filter(e => e.event_type === 'import_done').length || 0,
        fuelInsights: events?.filter(e => e.event_type === 'fuel_linked').length || 0,
        tipsUnlocked: 5, // Default value
        daysActive: events ? new Set(events.map(e => e.metadata?.day)).size : 0
      };

      return summary;
    } catch (error) {
      console.error('Error getting trial summary:', error);
      return {
        routesSaved: 0,
        expensesLogged: 0,
        fuelInsights: 0,
        tipsUnlocked: 0,
        daysActive: 0
      };
    }
  }

  /**
   * Clear cache for user
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.trialCache.delete(userId);
    } else {
      this.trialCache.clear();
    }
  }
}

export const trialService = TrialService.getInstance();