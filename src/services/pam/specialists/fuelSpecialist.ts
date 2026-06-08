import { supabase } from '@/integrations/supabase/client';
import type { SpecialistContext, SpecialistResult } from '../skills/types';

export async function executeFuelSpecialist(
  ctx: SpecialistContext,
  message: string
): Promise<SpecialistResult> {
  try {
    const results: string[] = [];

    const { data: fuelLogs } = await supabase
      .from('fuel_log')
      .select('*')
      .eq('user_id', ctx.userId)
      .order('date', { ascending: false })
      .limit(10);

    if (fuelLogs && fuelLogs.length > 0) {
      results.push('**Recent fuel records:**');
      const totalCost = fuelLogs.reduce((sum, f) => sum + (f.cost || 0), 0);
      const totalGallons = fuelLogs.reduce((sum, f) => sum + (f.gallons || 0), 0);
      const avgMpg = fuelLogs.reduce((sum, f) => sum + (f.mpg || 0), 0) / fuelLogs.filter(f => f.mpg).length || 0;

      for (const f of fuelLogs.slice(0, 5)) {
        results.push(`- ${f.date}: ${f.gallons} gal, $${f.cost}${f.mpg ? `, ${f.mpg} MPG` : ''}`);
      }

      results.push('');
      results.push(`**Summary:**`);
      results.push(`- Total cost: $${totalCost.toFixed(2)}`);
      results.push(`- Total fuel: ${totalGallons.toFixed(1)} gallons`);
      if (avgMpg > 0) {
        results.push(`- Average MPG: ${avgMpg.toFixed(1)}`);
      }
    } else {
      results.push('You have no fuel records yet.');
    }

    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('estimate') || lowerMsg.includes('cost') || lowerMsg.includes('how much')) {
      results.push('');
      results.push('**To estimate fuel costs, I need:**');
      results.push('- Trip distance in miles or km');
      results.push('- Your vehicle type (current: ' + (ctx.vehicleType || 'not set') + ')');
      results.push('- Your fuel preference (current: ' + (ctx.fuelPreference || 'not set') + ')');

      if (ctx.vehicleType && fuelLogs && fuelLogs.length > 0) {
        const avgMpgCalc = fuelLogs.reduce((sum, f) => sum + (f.mpg || 0), 0) / fuelLogs.filter(f => f.mpg).length || 0;
        if (avgMpgCalc > 0) {
          results.push('');
          results.push(`Based on your history, your vehicle averages ${avgMpgCalc.toFixed(1)} MPG.`);
          results.push('Tell me the distance and I can estimate the fuel cost for you.');
        }
      }
    }

    return {
      success: true,
      message: results.join('\n'),
      data: { fuelLogCount: fuelLogs?.length || 0 }
    };
  } catch (err) {
    return {
      success: false,
      message: 'I had trouble looking up your fuel data. Please try again.',
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}
