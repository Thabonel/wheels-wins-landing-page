
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BudgetCategory, BudgetSummary } from "./types";
import useSupabaseClient from '@/hooks/useSupabaseClient';
import { useOffline } from '@/context/OfflineContext';
import { useCachedBudgetData } from '@/hooks/useCachedBudgetData';

export function useBudgetCalculations(startDate?: string, endDate?: string) {
  const supabase = useSupabaseClient();
  const { user } = useAuth();
  const { isOffline, addToQueue } = useOffline();
  const { cachedData, updateCache } = useCachedBudgetData();

  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary>({
    totalBudget: 0, 
    totalSpent: 0,
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

      // If offline, use cached data
      if (isOffline) {
        setCategories(cachedData.categories);
        setBudgetSummary(cachedData.budgetSummary);
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
        // Fallback to cached data on error
        setCategories(cachedData.categories);
        setBudgetSummary(cachedData.budgetSummary);
      } else {
        const summaryData = data ? data[0] : { total_budget: 0, spent: 0 };
        const newBudgetSummary = {
          totalBudget: summaryData.total_budget || 0,
          totalSpent: summaryData.spent || 0,
          totalRemaining: (summaryData.total_budget || 0) - (summaryData.spent || 0),
          totalProgress: (summaryData.total_budget || 0) > 0 ? Math.round(((summaryData.spent || 0) / (summaryData.total_budget || 0)) * 100) : 0,
        };
        
        setBudgetSummary(newBudgetSummary);
        
        // Update cache with fresh data
        updateCache({
          budgetSummary: newBudgetSummary,
          categories: categories
        });
      }
      setLoading(false);
    }

    fetchBudgets();
  }, [user, supabase, startDate, endDate, isOffline]);

  const logExpense = (expenseData: any) => {
    if (isOffline) {
      addToQueue('add_expense', expenseData);
      return false;
    }
    // Handle online expense logging here
    return true;
  };

  const updateBudget = (budgetData: any) => {
    if (isOffline) {
      addToQueue('update_budget', budgetData);
      return false;
    }
    // Handle online budget updating here
    return true;
  };

  return {
    categories,
    budgetSummary,
    loading,
    logExpense,
    updateBudget,
    isOffline
  };
}
