import { supabase } from '@/integrations/supabase/client';
import type { SpecialistContext, SpecialistResult } from '../skills/types';

export async function executeBudgetSpecialist(
  ctx: SpecialistContext,
  message: string
): Promise<SpecialistResult> {
  try {
    const results: string[] = [];
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('budget') || lowerMsg.includes('spending') || lowerMsg.includes('review')) {
      const { data: budgets } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', ctx.userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (budgets && budgets.length > 0) {
        results.push('**Your budgets:**');
        for (const b of budgets) {
          results.push(`- ${b.category}: $${b.amount} / ${b.period}`);
        }
      } else {
        results.push('You have no budgets set up yet.');
      }

      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', ctx.userId)
        .order('date', { ascending: false })
        .limit(10);

      if (expenses && expenses.length > 0) {
        results.push('');
        results.push('**Recent expenses:**');
        const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        for (const e of expenses.slice(0, 5)) {
          results.push(`- ${e.category}: $${e.amount} (${e.date})`);
        }
        results.push(`Total of recent expenses: $${total.toFixed(2)}`);
      }
    }

    if (lowerMsg.includes('money') || lowerMsg.includes('earn') || lowerMsg.includes('income')) {
      results.push('');
      results.push('**Income ideas for travellers:**');
      results.push('- Work camping at campgrounds');
      results.push('- Remote customer support roles');
      results.push('- Sell handmade crafts at local markets');
      results.push('- Pet sitting or house sitting');
      results.push('- Delivery driving in local areas');
      results.push('');
      if (ctx.incomeInterests) {
        results.push(`Based on your interests in ${ctx.incomeInterests}, those might be a good fit.`);
      }
    }

    return {
      success: true,
      message: results.join('\n'),
      data: {}
    };
  } catch (err) {
    return {
      success: false,
      message: 'I had trouble reviewing your budget. Please try again.',
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}
