import { supabase } from '@/integrations/supabase/client';

export interface ABTestVariant {
  name: string;
  weight: number;
  config: Record<string, any>;
}

export interface ABTestExperiment {
  id: string;
  name: string;
  variants: ABTestVariant[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  trafficAllocation: number;
}

export class ABTestingFramework {
  private static instance: ABTestingFramework;
  private userAssignments = new Map<string, Map<string, string>>();

  static getInstance(): ABTestingFramework {
    if (!ABTestingFramework.instance) {
      ABTestingFramework.instance = new ABTestingFramework();
    }
    return ABTestingFramework.instance;
  }

  async getVariant(experimentId: string, userId: string): Promise<string | null> {
    try {
      // Check cache first
      const cached = this.userAssignments.get(userId)?.get(experimentId);
      if (cached) return cached;

      // Check database
      const { data: assignment } = await supabase
        .from('ab_test_assignments')
        .select('variant_name')
        .eq('experiment_id', experimentId)
        .eq('user_id', userId)
        .single();

      if (assignment) {
        this.cacheAssignment(userId, experimentId, assignment.variant_name);
        return assignment.variant_name;
      }

      // Get experiment config
      const { data: experiment } = await supabase
        .from('ab_test_experiments')
        .select('*')
        .eq('id', experimentId)
        .eq('status', 'active')
        .single();

      if (!experiment) return null;

      // Assign variant
      const variant = this.assignVariant(experiment, userId);
      
      // Save assignment
      await supabase
        .from('ab_test_assignments')
        .insert({
          experiment_id: experimentId,
          user_id: userId,
          variant_name: variant
        });

      this.cacheAssignment(userId, experimentId, variant);
      return variant;

    } catch (error) {
      console.error('AB Test assignment failed:', error);
      return null;
    }
  }

  private assignVariant(experiment: any, userId: string): string {
    const variants = experiment.variants as ABTestVariant[];
    const hash = this.hashUserId(userId + experiment.id);
    
    let cumulativeWeight = 0;
    for (const variant of variants) {
      cumulativeWeight += variant.weight;
      if (hash < cumulativeWeight) {
        return variant.name;
      }
    }
    
    return variants[0]?.name || 'control';
  }

  private hashUserId(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) / Math.pow(2, 31);
  }

  private cacheAssignment(userId: string, experimentId: string, variant: string) {
    if (!this.userAssignments.has(userId)) {
      this.userAssignments.set(userId, new Map());
    }
    this.userAssignments.get(userId)!.set(experimentId, variant);
  }

  async trackConversion(experimentId: string, userId: string, value?: number) {
    try {
      await supabase
        .from('ab_test_assignments')
        .update({
          converted: true,
          conversion_value: value
        })
        .eq('experiment_id', experimentId)
        .eq('user_id', userId);
    } catch (error) {
      console.error('Conversion tracking failed:', error);
    }
  }

  async createExperiment(experiment: Omit<ABTestExperiment, 'id'>): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('ab_test_experiments')
        .insert({
          name: experiment.name,
          variants: experiment.variants as any,
          status: experiment.status,
          traffic_allocation: experiment.trafficAllocation
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Failed to create experiment:', error);
      throw error;
    }
  }
}

export const abTesting = ABTestingFramework.getInstance();