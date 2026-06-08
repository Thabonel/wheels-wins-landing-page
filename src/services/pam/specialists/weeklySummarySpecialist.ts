import { supabase } from '@/integrations/supabase/client';
import type { SpecialistContext, SpecialistResult } from '../skills/types';

export async function executeWeeklySummarySpecialist(
  ctx: SpecialistContext,
  message: string
): Promise<SpecialistResult> {
  try {
    const results: string[] = [];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekAgoStr = oneWeekAgo.toISOString().split('T')[0];

    results.push('**Your Weekly Travel Summary**');
    results.push('');

    const { data: trips } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', ctx.userId)
      .gte('start_date', weekAgoStr)
      .order('start_date', { ascending: false });

    if (trips && trips.length > 0) {
      results.push('Trips this week:');
      for (const trip of trips) {
        results.push(`- ${trip.destination} (${trip.status})`);
        if (trip.actual_cost) results.push(`  Cost: $${trip.actual_cost}`);
      }
    } else {
      results.push('No trips recorded this week.');
    }

    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', ctx.userId)
      .gte('date', weekAgoStr)
      .order('date', { ascending: false });

    if (expenses && expenses.length > 0) {
      const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const byCategory: Record<string, number> = {};
      for (const e of expenses) {
        byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount || 0);
      }

      results.push('');
      results.push(`Total spent: $${totalSpent.toFixed(2)}`);
      results.push('By category:');
      for (const [cat, amt] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
        results.push(`- ${cat}: $${amt.toFixed(2)}`);
      }
    }

    const { data: fuelLogs } = await supabase
      .from('fuel_log')
      .select('*')
      .eq('user_id', ctx.userId)
      .gte('date', weekAgoStr)
      .order('date', { ascending: false });

    if (fuelLogs && fuelLogs.length > 0) {
      const totalFuelCost = fuelLogs.reduce((sum, f) => sum + (f.cost || 0), 0);
      const totalGallons = fuelLogs.reduce((sum, f) => sum + (f.gallons || 0), 0);

      results.push('');
      results.push(`Fuel: $${totalFuelCost.toFixed(2)} (${totalGallons.toFixed(1)} gallons)`);
    }

    return {
      success: true,
      message: results.join('\n'),
      data: { tripCount: trips?.length || 0, expenseCount: expenses?.length || 0 }
    };
  } catch (err) {
    return {
      success: false,
      message: 'I had trouble generating your weekly summary. Please try again.',
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}
