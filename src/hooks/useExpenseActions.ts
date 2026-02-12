
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { defaultCategories, categoryColors as defaultCategoryColors } from "@/components/wins/expenses/mockData";
import { useOffline } from "@/context/OfflineContext";
import { useCachedBudgetData } from "./useCachedBudgetData";

export function useExpenseActions() {
  const { user } = useAuth();
  const { isOffline, addToQueue } = useOffline();
  const { cachedData, updateCache } = useCachedBudgetData();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(defaultCategoryColors);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setIsLoading(true);

      // If offline, use cached data
      if (isOffline) {
        setExpenses(cachedData.expenses || []);
        const uniqueCategories = [...new Set(cachedData.expenses?.map((e) => e.category) || [])];
        setCategories(uniqueCategories.length ? uniqueCategories : defaultCategories);
        setIsLoading(false);
        return;
      }

      try {
        // Fetch expenses
        const { data: expenseData, error: expenseError } = await supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false });

        if (expenseError) {
          console.error('Error fetching expenses:', expenseError);
          setError("Failed to fetch expenses.");
          // Fallback to cached data
          setExpenses(cachedData.expenses || []);
        } else {
          const formattedExpenses = expenseData.map(expense => ({
            id: expense.id,
            amount: Number(expense.amount),
            category: expense.category,
            description: expense.description || '',
            date: expense.date,
            receiptUrl: expense.receipt_url || null
          }));
          
          setExpenses(formattedExpenses);
          // Update cache with fresh data
          updateCache({ expenses: formattedExpenses });
        }

        const uniqueCategories = [...new Set((expenseData || []).map((e) => e.category))];
        setCategories(uniqueCategories.length ? uniqueCategories : defaultCategories);

      } catch (error) {
        console.error('Error in loadData:', error);
        setError("Failed to load expense data.");
        setExpenses(cachedData.expenses || []);
      }

      setIsLoading(false);
    };

    loadData();
  }, [user, isOffline]);

  const addExpense = async (expense: Omit<any, "id">) => {
    if (!user) return false;

    if (isOffline) {
      addToQueue('add_expense', { ...expense, user_id: user.id });
      toast.success("Expense queued for sync when online");
      return true;
    }

    try {
      const insertData: Record<string, any> = {
        amount: Number(expense.amount),
        category: expense.category,
        date: expense.date,
        description: expense.description,
        user_id: user.id,
      };
      if (expense.receiptUrl) {
        insertData.receipt_url = expense.receiptUrl;
      }
      const { data, error } = await supabase.from("expenses").insert(insertData).select().single();

      if (error) {
        console.error('Error adding expense:', error);
        toast.error("Failed to add expense");
        return false;
      }

      // Update local state
      const newExpense = {
        id: data.id,
        amount: Number(data.amount),
        category: data.category,
        description: data.description || '',
        date: data.date,
        receiptUrl: (data as any).receipt_url || null
      };
      
      setExpenses(prev => [newExpense, ...prev]);
      toast.success("Expense added!");
      return true;
    } catch (error) {
      console.error('Error in addExpense:', error);
      toast.error("Failed to add expense");
      return false;
    }
  };

  const deleteExpense = async (id: string) => {
    if (!user) return false;

    if (isOffline) {
      toast.error("Cannot delete expenses while offline");
      return false;
    }

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", parseInt(id))
        .eq("user_id", user.id);

      if (error) {
        console.error('Error deleting expense:', error);
        toast.error("Failed to delete expense");
        return false;
      }

      // Update local state
      setExpenses(prev => prev.filter(expense => expense.id !== id));
      toast.success("Expense deleted!");
      return true;
    } catch (error) {
      console.error('Error in deleteExpense:', error);
      toast.error("Failed to delete expense");
      return false;
    }
  };

  const addCategory = async (category: string) => {
    if (isOffline) {
      toast.error("Cannot add categories while offline");
      return false;
    }

    const exists = categories.some(c => c.toLowerCase() === category.toLowerCase());
    if (exists) {
      toast.error("This category already exists");
      return false;
    }

    try {
      // Add to budget categories table
      const { error } = await supabase.from('budget_categories').insert([
        {
          user_id: user?.id,
          name: category,
          budgeted_amount: 0,
          spent_amount: 0
        }
      ]);

      if (error) {
        console.error('Error adding category:', error);
        toast.error("Failed to add category");
        return false;
      }

      setCategories((prev) => [...prev, category]);

      if (!categoryColors[category]) {
        const colorOptions = Object.values(defaultCategoryColors);
        const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
        setCategoryColors((prev) => ({ ...prev, [category]: randomColor }));
      }

      toast.success(`Added category: ${category}`);
      return true;
    } catch (error) {
      console.error('Error in addCategory:', error);
      toast.error("Failed to add category");
      return false;
    }
  };

  const deleteCategory = async (category: string) => {
    if (isOffline) {
      toast.error("Cannot delete categories while offline");
      return false;
    }

    if (category === "Fuel") {
      toast.error("Cannot delete required category");
      return false;
    }

    try {
      const { error } = await supabase
        .from('budget_categories')
        .delete()
        .eq('user_id', user?.id)
        .eq('name', category);

      if (error) {
        console.error('Error deleting category:', error);
        toast.error("Failed to delete category");
        return false;
      }

      setCategories((prev) => prev.filter((c) => c !== category));
      toast.success(`Deleted category: ${category}`);
      return true;
    } catch (error) {
      console.error('Error in deleteCategory:', error);
      toast.error("Failed to delete category");
      return false;
    }
  };

  return {
    expenses,
    isLoading,
    error,
    categories,
    categoryColors,
    addExpense,
    deleteExpense,
    addCategory,
    deleteCategory,
    isOffline
  };
}
