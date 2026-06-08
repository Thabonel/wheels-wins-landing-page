import { supabase } from '@/integrations/supabase/client';
import type { SpecialistContext, SpecialistResult } from '../skills/types';

export async function executeShopSpecialist(
  ctx: SpecialistContext,
  message: string
): Promise<SpecialistResult> {
  try {
    const results: string[] = [];

    results.push('**Camping and travel resources:**');
    results.push('');

    const { data: locations } = await supabase
      .from('camping_locations')
      .select('*')
      .limit(5);

    if (locations && locations.length > 0) {
      results.push('Nearby camping spots:');
      for (const loc of locations) {
        results.push(`- ${loc.name}: ${loc.description || loc.location || ''}`);
      }
      results.push('');
    }

    if (ctx.preferredCampingStyle) {
      results.push(`Based on your camping style (${ctx.preferredCampingStyle}), here are suggestions:`);
      results.push('- Pack weather-appropriate gear for your style');
      results.push('- Check if your preferred campgrounds have the amenities you need');
    }

    results.push('');
    results.push('Essential supplies checklist:');
    results.push('- Water containers and filtration');
    results.push('- Cooking gear and fuel');
    results.push('- Sleeping bags and mats');
    results.push('- Lighting (headlamps, lanterns)');
    results.push('- Basic tool kit');
    results.push('- Sun protection and insect repellent');

    if (ctx.region) {
      results.push('');
      results.push(`I can search for shops and supply stores near ${ctx.region} if you need specific items.`);
    }

    return {
      success: true,
      message: results.join('\n'),
      data: {}
    };
  } catch (err) {
    return {
      success: false,
      message: 'I had trouble finding resources. Please try again.',
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}
