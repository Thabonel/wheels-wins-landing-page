import { supabase } from '@/integrations/supabase/client';
import type { SpecialistContext, SpecialistResult } from '../skills/types';

export async function executeCommunitySpecialist(
  ctx: SpecialistContext,
  message: string
): Promise<SpecialistResult> {
  try {
    const results: string[] = [];

    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (posts && posts.length > 0) {
      results.push('**Recent community posts:**');
      for (const post of posts) {
        results.push(`- "${post.content?.substring(0, 80)}..." (${post.likes_count || 0} likes)`);
      }
    } else {
      results.push('No community posts yet.');
    }

    results.push('');
    results.push('**Community features:**');
    results.push('- Share your travel experiences with other travellers');
    results.push('- Join group trips and meetups');
    results.push('- Ask for advice on routes and campgrounds');
    results.push('- Connect with travellers near your current location');

    if (ctx.region) {
      results.push('');
      results.push(`I can help you find other travellers near ${ctx.region} if you are interested.`);
    }

    return {
      success: true,
      message: results.join('\n'),
      data: { postCount: posts?.length || 0 }
    };
  } catch (err) {
    return {
      success: false,
      message: 'I had trouble loading community content. Please try again.',
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}
