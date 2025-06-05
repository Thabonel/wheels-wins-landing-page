
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { defaultCategories, categoryColors as defaultCategoryColors } from "@/components/wins/expenses/mockData";
import { useOffline } from "@/context/OfflineContext";
import { useCachedBudgetData } from "./useCachedBudgetData";

export function useExpenseActions() {
  const supabase = useSupabaseClient();
  const user = useUser();
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
        setExpenses(cachedData.expenses);
        const uniqueCategories = [...new Set(cachedData.expenses.map((e) => e.category))];
        setCategories(uniqueCategories.length ? uniqueCategories : defaultCategories);
        setIsLoading(false);
        return;
      }

      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (expenseError) {
        setError("Failed to fetch expenses.");
        // Fallback to cached data
        setExpenses(cachedData.expenses);
      } else {
        setExpenses(expenseData || []);
        // Update cache with fresh data
        updateCache({ expenses: expenseData || [] });
      }

      const uniqueCategories = [...new Set((expenseData || []).map((e) => e.category))];
      setCategories(uniqueCategories.length ? uniqueCategories : defaultCategories);

      setIsLoading(false);
    };

    loadData();
  }, [user, supabase, isOffline]);

  const addExpense = async (expense: Omit<any, "id">) => {
    if (!user) return false;

    if (isOffline) {
      addToQueue('add_expense', { ...expense, user_id: user.id });
      toast.success("Expense queued for sync when online");
      return true;
    }

    const { error } = await supabase.from("expenses").insert([
      { ...expense, user_id: user.id }
    ]);

    if (error) {
      toast.error("Failed to add expense");
      return false;
    }

    toast.success("Expense added!");
    return true;
  };

  const deleteExpense = async (id: string) => {
    if (!user) return false;

    if (isOffline) {
      toast.error("Cannot delete expenses while offline");
      return false;
    }

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to delete expense");
      return false;
    }

    toast.success("Expense deleted!");
    return true;
  };

  const addCategory = (category: string) => {
    if (isOffline) {
      toast.error("Cannot add categories while offline");
      return false;
    }

    const exists = categories.some(c => c.toLowerCase() === category.toLowerCase());
    if (exists) {
      toast.error("This category already exists");
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
  };

  const deleteCategory = (category: string) => {
    if (isOffline) {
      toast.error("Cannot delete categories while offline");
      return false;
    }

    if (category === "Fuel") {
      toast.error("Cannot delete required category");
      return false;
    }

    setCategories((prev) => prev.filter((c) => c !== category));
    toast.success(`Deleted category: ${category}`);
    return true;
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
