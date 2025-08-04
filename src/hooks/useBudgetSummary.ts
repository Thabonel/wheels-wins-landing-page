import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

interface BudgetSummary {
  weeklyBudget: number;
  totalSpent: number;
  remaining: number;
  categoryBreakdown: {
    fuel: number;
    food: number;
    accommodation: number;
    entertainment: number;
    other: number;
  };
  percentageUsed: number;
  daysRemaining: number;
}

interface BudgetSettings {
  weeklyBudget: number;
  monthlyBudget: number;
  yearlyBudget: number;
}

export function useBudgetSummary() {
  const { user } = useAuth();
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's budget settings
  const fetchBudgetSettings = async (userId: string): Promise<BudgetSettings> => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('budget_settings')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw error;
      }

      // Default budget if no settings found
      const defaultBudget = {
        weeklyBudget: 300,
        monthlyBudget: 1200,
        yearlyBudget: 14400
      };

      return data?.budget_settings || defaultBudget;
    } catch (error) {
      console.error('Error fetching budget settings:', error);
      // Return default budget on error
      return {
        weeklyBudget: 300,
        monthlyBudget: 1200,
        yearlyBudget: 14400
      };
    }
  };

  // Fetch expenses for the current week
  const fetchWeeklyExpenses = async (userId: string) => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount, category, date')
        .eq('user_id', userId)
        .gte('date', weekStart.toISOString().split('T')[0])
        .lte('date', weekEnd.toISOString().split('T')[0]);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching weekly expenses:', error);
      return [];
    }
  };

  // Calculate budget summary
  const calculateBudgetSummary = async () => {
    if (!user) return null;

    try {
      // Fetch budget settings and expenses in parallel
      const [budgetSettings, expenses] = await Promise.all([
        fetchBudgetSettings(user.id),
        fetchWeeklyExpenses(user.id)
      ]);

      // Calculate total spent and category breakdown
      let totalSpent = 0;
      const categoryBreakdown = {
        fuel: 0,
        food: 0,
        accommodation: 0,
        entertainment: 0,
        other: 0
      };

      expenses.forEach(expense => {
        const amount = Number(expense.amount);
        totalSpent += amount;

        // Map expense categories to our breakdown
        const category = expense.category.toLowerCase();
        if (category.includes('fuel') || category.includes('gas')) {
          categoryBreakdown.fuel += amount;
        } else if (category.includes('food') || category.includes('grocery') || category.includes('restaurant')) {
          categoryBreakdown.food += amount;
        } else if (category.includes('accommodation') || category.includes('camping') || category.includes('hotel')) {
          categoryBreakdown.accommodation += amount;
        } else if (category.includes('entertainment') || category.includes('activity')) {
          categoryBreakdown.entertainment += amount;
        } else {
          categoryBreakdown.other += amount;
        }
      });

      // Calculate remaining budget and days
      const remaining = budgetSettings.weeklyBudget - totalSpent;
      const percentageUsed = budgetSettings.weeklyBudget > 0 
        ? Math.round((totalSpent / budgetSettings.weeklyBudget) * 100)
        : 0;

      // Calculate days remaining in the week
      const now = new Date();
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const daysRemaining = Math.ceil((weekEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        weeklyBudget: budgetSettings.weeklyBudget,
        totalSpent,
        remaining,
        categoryBreakdown,
        percentageUsed,
        daysRemaining
      };
    } catch (error) {
      console.error('Error calculating budget summary:', error);
      throw error;
    }
  };

  // Load budget summary
  useEffect(() => {
    const loadBudgetSummary = async () => {
      if (!user) {
        setBudgetSummary(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const summary = await calculateBudgetSummary();
        setBudgetSummary(summary);
      } catch (err) {
        console.error('Error loading budget summary:', err);
        setError(err instanceof Error ? err.message : 'Failed to load budget summary');
        setBudgetSummary(null);
      } finally {
        setLoading(false);
      }
    };

    loadBudgetSummary();
  }, [user]);

  // Refresh budget summary
  const refreshBudgetSummary = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const summary = await calculateBudgetSummary();
      setBudgetSummary(summary);
    } catch (err) {
      console.error('Error refreshing budget summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh budget summary');
    } finally {
      setLoading(false);
    }
  };

  // Add a new expense and refresh
  const addExpense = async (amount: number, category: string, description?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          amount,
          category,
          description,
          date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      // Refresh the budget summary
      await refreshBudgetSummary();
    } catch (err) {
      console.error('Error adding expense:', err);
      throw err;
    }
  };

  return {
    budgetSummary,
    loading,
    error,
    refreshBudgetSummary,
    addExpense,
    isOverBudget: budgetSummary ? budgetSummary.remaining < 0 : false,
    budgetUtilization: budgetSummary ? budgetSummary.percentageUsed : 0
  };
}