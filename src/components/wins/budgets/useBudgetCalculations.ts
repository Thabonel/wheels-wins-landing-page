
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; // Assuming you have an AuthContext
import { BudgetCategory, BudgetSummaryView } from "./types";
import useSupabaseClient from '@/hooks/useSupabaseClient';

export function useBudgetCalculations(startDate?: string, endDate?: string) {
  const supabase = useSupabaseClient();
  const { user } = useAuth();

  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary>({
    totalBudget: 0, 
    spent: 0,
    totalRemaining: 0,
    totalProgress: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBudgets() {
      if (!user) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('budget_summary')
        .select('*')
        .eq('user_id', user.id);

      if (startDate) {
        query = query.gte('start_date', startDate);
      }

      if (endDate) {
        query = query.lte('end_date', endDate);
      }
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching budgets:', error);
        // Handle the case where the budget_summary view might not exist or be empty
        setBudgetSummary({
          totalBudget: 0,
          spent: 0,
          totalRemaining: 0,
          totalProgress: 0,
        });
      } else {
        const summaryData = data ? data[0] : { total_budget: 0, spent: 0 };
        setBudgetSummary({
          totalBudget: summaryData.total_budget || 0,
          spent: summaryData.spent || 0, // Use the 'spent' value directly
          totalRemaining: (summaryData.total_budget || 0) - (summaryData.spent || 0),
          totalProgress: (summaryData.total_budget || 0) > 0 ? Math.round(((summaryData.spent || 0) / (summaryData.total_budget || 0)) * 100) : 0,
        });
      }
      setLoading(false);
    }

    fetchBudgets();
  }, [user, supabase, startDate, endDate]);

  return {
    categories,
    budgetSummary,
    loading, // Added loading state for better handling in components
  };
}
