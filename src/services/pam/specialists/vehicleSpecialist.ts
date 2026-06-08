import { supabase } from '@/integrations/supabase/client';
import type { SpecialistContext, SpecialistResult } from '../skills/types';

export async function executeVehicleSpecialist(
  ctx: SpecialistContext,
  message: string
): Promise<SpecialistResult> {
  try {
    const results: string[] = [];

    const { data: records } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('user_id', ctx.userId)
      .order('date', { ascending: false })
      .limit(10);

    if (records && records.length > 0) {
      results.push('**Maintenance records:**');

      const upcoming = records.filter(r => r.next_due_date && new Date(r.next_due_date) >= new Date());
      const overdue = records.filter(r => r.next_due_date && new Date(r.next_due_date) < new Date());

      if (overdue.length > 0) {
        results.push('');
        results.push('Overdue - please attend to:');
        for (const r of overdue) {
          results.push(`- ${r.task}: was due ${r.next_due_date}`);
        }
      }

      if (upcoming.length > 0) {
        results.push('');
        results.push('Upcoming:');
        for (const r of upcoming.slice(0, 5)) {
          results.push(`- ${r.task}: due ${r.next_due_date}${r.next_due_mileage ? ` or ${r.next_due_mileage} miles` : ''}`);
        }
      }

      if (overdue.length === 0 && upcoming.length === 0) {
        results.push('**Recent services:**');
        for (const r of records.slice(0, 5)) {
          results.push(`- ${r.task}: ${r.date}${r.cost ? `, $${r.cost}` : ''}`);
        }
      }
    } else {
      results.push('You have no maintenance records yet.');
    }

    if (ctx.vehicleType) {
      results.push('');
      results.push(`Your vehicle: ${ctx.vehicleType}`);
      results.push('To get service reminders, add maintenance records with due dates.');
      results.push('I can remind you about oil changes, tire rotations, and rego checks.');
    } else {
      results.push('');
      results.push('Tip: Tell me your vehicle type and I can give better maintenance advice.');
    }

    return {
      success: true,
      message: results.join('\n'),
      data: { recordCount: records?.length || 0 }
    };
  } catch (err) {
    return {
      success: false,
      message: 'I had trouble looking up your vehicle records. Please try again.',
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}
