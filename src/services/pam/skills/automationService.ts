import { supabase } from '@/integrations/supabase/client';
import type { PamAutomation } from './types';

export async function createAutomation(automation: Omit<PamAutomation, 'id' | 'created_at' | 'updated_at'>): Promise<PamAutomation | null> {
  const { data, error } = await supabase
    .from('pam_automations')
    .insert(automation)
    .select()
    .single();

  if (error) {
    console.error('Failed to create automation:', error);
    return null;
  }

  return data as PamAutomation;
}

export async function getUserAutomations(userId: string): Promise<PamAutomation[]> {
  const { data, error } = await supabase
    .from('pam_automations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load automations:', error);
    return [];
  }

  return data as PamAutomation[];
}

export async function getActiveAutomations(userId: string): Promise<PamAutomation[]> {
  const { data, error } = await supabase
    .from('pam_automations')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('next_run_at', { ascending: true });

  if (error) {
    console.error('Failed to load active automations:', error);
    return [];
  }

  return data as PamAutomation[];
}

export async function updateAutomationStatus(
  automationId: string,
  userId: string,
  status: PamAutomation['status']
): Promise<boolean> {
  const { error } = await supabase
    .from('pam_automations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', automationId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to update automation status:', error);
    return false;
  }

  return true;
}

export async function deleteAutomation(automationId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('pam_automations')
    .delete()
    .eq('id', automationId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete automation:', error);
    return false;
  }

  return true;
}

export function calculateNextRun(
  scheduleType: PamAutomation['schedule_type'],
  scheduleValue: string
): Date {
  const now = new Date();

  switch (scheduleType) {
    case 'daily':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    case 'weekly': {
      const targetDay = parseInt(scheduleValue, 10);
      const daysUntil = (targetDay - now.getDay() + 7) % 7;
      const next = new Date(now);
      next.setDate(now.getDate() + (daysUntil === 0 ? 7 : daysUntil));
      return next;
    }

    case 'biweekly': {
      const targetDay = parseInt(scheduleValue, 10);
      const daysUntil = (targetDay - now.getDay() + 14) % 14;
      const next = new Date(now);
      next.setDate(now.getDate() + (daysUntil === 0 ? 14 : daysUntil));
      return next;
    }

    case 'monthly': {
      const targetDay = parseInt(scheduleValue, 10);
      const next = new Date(now.getFullYear(), now.getMonth() + 1, targetDay);
      return next;
    }

    case 'quarterly': {
      const targetDay = parseInt(scheduleValue, 10);
      const next = new Date(now.getFullYear(), now.getMonth() + 3, targetDay);
      return next;
    }

    case 'yearly': {
      const [month, day] = scheduleValue.split('-').map(Number);
      const next = new Date(now.getFullYear() + 1, month - 1, day);
      return next;
    }

    case 'one_time':
    default:
      return now;
  }
}
