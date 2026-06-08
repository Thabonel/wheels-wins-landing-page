import { supabase } from '@/integrations/supabase/client';
import type { SpecialistContext, SpecialistResult } from '../skills/types';

export async function executeSafetySpecialist(
  ctx: SpecialistContext,
  message: string
): Promise<SpecialistResult> {
  try {
    const results: string[] = [];

    results.push('**Travel Safety Checklist:**');
    results.push('');
    results.push('Before you head out:');
    results.push('- Check weather conditions for your route');
    results.push('- Ensure your vehicle is serviced and roadworthy');
    results.push('- Carry extra water, food, and a first aid kit');
    results.push('- Tell someone your route and expected arrival time');
    results.push('- Keep important documents accessible');
    results.push('- Download offline maps for areas with poor signal');

    if (ctx.accessibilityNeeds) {
      results.push('');
      results.push('Based on your accessibility needs:');
      results.push(`- ${ctx.accessibilityNeeds}`);
      results.push('- Check ahead that stops and campgrounds are accessible');
    }

    results.push('');
    results.push('On the road:');
    results.push('- Take regular rest breaks every 2 hours');
    results.push('- Keep your phone charged and have a backup power source');
    results.push('- Be aware of wildlife on roads, especially at dawn and dusk');
    results.push('- Park in well-lit areas at night');

    results.push('');
    results.push('Emergency contacts to have ready:');
    results.push('- Local emergency number');
    results.push('- Roadside assistance');
    results.push('- Nearest hospital or medical centre');

    if (ctx.region) {
      results.push('');
      results.push(`I can look up region-specific safety tips for ${ctx.region} if you like.`);
    }

    return {
      success: true,
      message: results.join('\n'),
      data: {}
    };
  } catch (err) {
    return {
      success: false,
      message: 'I had trouble generating the safety checklist. Please try again.',
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}
