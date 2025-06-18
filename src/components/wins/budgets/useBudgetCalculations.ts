
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BudgetCategory, BudgetSummary } from "./types";
import { supabase } from '@/integrations/supabase';
import { useOffline } from '@/context/OfflineContext';
import { useCachedBudgetData } from '@/hooks/useCachedBudgetData';

export function useBudgetCalculations(startDate?: string, endDate?: string) {
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

      try {
        // Fetch budget categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('budget_categories')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (categoriesError) {
          console.error('Error fetching budget categories:', categoriesError);
          setCategories(cachedData.categories);
        } else {
          const formattedCategories: BudgetCategory[] = categoriesData.map(cat => ({
            id: cat.id,
            name: cat.name,
            budgeted: Number(cat.budgeted_amount),
            spent: Number(cat.spent_amount),
            remaining: Number(cat.budgeted_amount) - Number(cat.spent_amount),
            progress: Number(cat.budgeted_amount) > 0 ? 
              Math.round((Number(cat.spent_amount) / Number(cat.budgeted_amount)) * 100) : 0,
            color: cat.color || '#8B5CF6',
            status: Number(cat.spent_amount) > Number(cat.budgeted_amount) ? 'over' : 'on-track'
          }));
          
          setCategories(formattedCategories);

          // Calculate budget summary
          const totalBudget = formattedCategories.reduce((sum, cat) => sum + cat.budgeted, 0);
          const totalSpent = formattedCategories.reduce((sum, cat) => sum + cat.spent, 0);
          const newBudgetSummary = {
            totalBudget,
            totalSpent,
            totalRemaining: totalBudget - totalSpent,
            totalProgress: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
          };
          
          setBudgetSummary(newBudgetSummary);
          
          // Update cache with fresh data
          updateCache({
            budgetSummary: newBudgetSummary,
            categories: formattedCategories
          });
        }
      } catch (error) {
        console.error('Error in fetchBudgets:', error);
        setCategories(cachedData.categories);
        setBudgetSummary(cachedData.budgetSummary);
      }
      
      setLoading(false);
    }

    fetchBudgets();
  }, [user, isOffline]);

  const logExpense = async (expenseData: any) => {
    if (isOffline) {
      addToQueue('add_expense', expenseData);
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('expenses')
        .insert([{ ...expenseData, user_id: user?.id }]);
      
      return !error;
    } catch (error) {
      console.error('Error logging expense:', error);
      return false;
    }
  };

  const updateBudget = async (budgetData: any) => {
    if (isOffline) {
      addToQueue('update_budget', budgetData);
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('budget_categories')
        .upsert({ ...budgetData, user_id: user?.id });
      
      return !error;
    } catch (error) {
      console.error('Error updating budget:', error);
      return false;
    }
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
