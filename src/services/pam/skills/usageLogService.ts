import { supabase } from '@/integrations/supabase/client';
import type { PamSkillUsageLog } from './types';

export async function logSkillUsage(
  userId: string,
  skillId: string,
  inputSummary: string,
  outputSummary: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('pam_skill_usage_logs')
      .insert({
        user_id: userId,
        skill_id: skillId,
        input_summary: inputSummary,
        output_summary: outputSummary,
        success,
        error_message: errorMessage || null
      });

    if (error) {
      console.error('Failed to log skill usage:', error);
    }
  } catch (err) {
    console.error('Error logging skill usage:', err);
  }
}

export async function getSkillUsageForUser(userId: string, limit = 50): Promise<PamSkillUsageLog[]> {
  const { data, error } = await supabase
    .from('pam_skill_usage_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load skill usage logs:', error);
    return [];
  }

  return data as PamSkillUsageLog[];
}

export async function getSkillUsageStats(userId: string): Promise<{ skill_id: string; count: number; success_rate: number }[]> {
  const { data, error } = await supabase
    .rpc('get_pam_skill_usage_stats', { p_user_id: userId });

  if (error) {
    if (!error.message.includes('Could not find the function')) {
      console.error('Failed to load skill usage stats:', error);
    }
    return [];
  }

  return data || [];
}
