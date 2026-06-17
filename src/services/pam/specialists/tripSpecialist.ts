import { supabase } from '@/integrations/supabase/client';
import type { SpecialistContext, SpecialistResult } from '../skills/types';

export async function executeTripSpecialist(
  ctx: SpecialistContext,
  message: string
): Promise<SpecialistResult> {
  try {
    const results: string[] = [];

    const { data: trips } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', ctx.userId)
      .order('start_date', { ascending: false })
      .limit(5);

    if (trips && trips.length > 0) {
      results.push('**Your recent trips:**');
      for (const trip of trips) {
        results.push(
          `- ${trip.destination} (${trip.start_date || 'planned'}): ${trip.status}` +
          (trip.estimated_cost ? ` - est. $${trip.estimated_cost}` : '')
        );
      }
    } else {
      results.push('You have no trips recorded yet.');
    }

    const { data: campgrounds } = await supabase
      .from('campgrounds')
      .select('*')
      .limit(3);

    if (campgrounds && campgrounds.length > 0 && ctx.region) {
      results.push('');
      results.push('**Suggested stops in your region:**');
      for (const cg of campgrounds) {
        results.push(`- ${cg.name}: ${cg.location || ''}`);
      }
    }

    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('plan') || lowerMsg.includes('route')) {
      results.push('');
      results.push('To plan a new trip, tell me:');
      results.push('- Where are you starting from?');
      results.push('- Where do you want to go?');
      results.push('- When would you like to travel?');
    }

    return {
      success: true,
      message: results.join('\n'),
      data: { tripCount: trips?.length || 0 }
    };
  } catch (err) {
    return {
      success: false,
      message: 'I had trouble looking up your trips. Please try again.',
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}
