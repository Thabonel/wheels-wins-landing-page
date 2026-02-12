import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface ExpenseCategorySummary {
  category: string;
  amount: number;
  count: number;
}

export interface FinancialSummary {
  user_id: string;
  period_days: number;
  total_income: number;
  total_expenses: number;
  net_income: number;
  expense_categories: ExpenseCategorySummary[];
  generated_at: string;
}

export function useFinancialSummary(days: number = 30) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const [expensesResult, incomeResult] = await Promise.all([
        supabase
          .from('expenses')
          .select('amount, category')
          .eq('user_id', user.id)
          .gte('date', startDateStr),
        supabase
          .from('income_entries')
          .select('amount')
          .eq('user_id', user.id)
          .gte('date', startDateStr),
      ]);

      if (expensesResult.error) throw expensesResult.error;
      if (incomeResult.error) throw incomeResult.error;

      const expenses = expensesResult.data ?? [];
      const incomeEntries = incomeResult.data ?? [];

      const totalExpenses = expenses.reduce(
        (sum, e) => sum + (Number(e.amount) || 0),
        0
      );

      const totalIncome = incomeEntries.reduce(
        (sum, i) => sum + (Number(i.amount) || 0),
        0
      );

      // Group expenses by category
      const categoryMap = new Map<string, { amount: number; count: number }>();
      for (const expense of expenses) {
        const cat = expense.category || 'Uncategorized';
        const existing = categoryMap.get(cat) ?? { amount: 0, count: 0 };
        existing.amount += Number(expense.amount) || 0;
        existing.count += 1;
        categoryMap.set(cat, existing);
      }

      const expenseCategories: ExpenseCategorySummary[] = Array.from(
        categoryMap.entries()
      )
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          count: data.count,
        }))
        .sort((a, b) => b.amount - a.amount);

      setSummary({
        user_id: user.id,
        period_days: days,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_income: totalIncome - totalExpenses,
        expense_categories: expenseCategories,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error fetching financial summary:', err);
      setError('Failed to load financial summary');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [user, days]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}
