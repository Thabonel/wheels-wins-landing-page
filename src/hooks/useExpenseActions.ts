
import { useExpenses } from "@/context/ExpensesContext";
import { ExpenseItem } from "@/components/wins/expenses/ExpenseTable";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { defaultCategories, categoryColors as defaultCategoryColors } from "@/components/wins/expenses/mockData";

export function useExpenseActions() {
  const { state, dispatch } = useExpenses();
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(defaultCategoryColors);
  
  // Load categories from localStorage on initial render
  useEffect(() => {
    const savedCategories = localStorage.getItem('expenseCategories');
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    } else {
      setCategories(defaultCategories);
      localStorage.setItem('expenseCategories', JSON.stringify(defaultCategories));
    }
  }, []);
  
  // Save categories to localStorage whenever they change
  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem('expenseCategories', JSON.stringify(categories));
    }
  }, [categories]);

  const addCategory = (category: string) => {
    // Check if category already exists (case insensitive)
    const categoryExists = categories.some(
      cat => cat.toLowerCase() === category.toLowerCase()
    );
    
    if (categoryExists) {
      toast.error("This category already exists");
      return false;
    }
    
    // Add new category
    setCategories(prev => {
      const newCategories = [...prev, category];
      return newCategories;
    });
    
    // If no color is assigned, assign a default one
    if (!categoryColors[category]) {
      const colorOptions = Object.values(defaultCategoryColors);
      const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      setCategoryColors(prev => ({...prev, [category]: randomColor}));
    }
    
    // Show success message
    toast.success(`Added category: ${category}`);
    return true;
  };

  const deleteCategory = (category: string) => {
    // Prevent deleting required categories
    if (category === "Fuel") {
      toast.error("Cannot delete the required Fuel category");
      return false;
    }
    
    // Delete the category
    setCategories(prev => prev.filter(cat => cat !== category));
    
    // Update expenses of deleted category to "Other"
    const updatedExpenses = state.expenses.map(expense => {
      if (expense.category === category) {
        return {...expense, category: "Other"};
      }
      return expense;
    });
    
    // Update expenses in state
    updatedExpenses.forEach(expense => {
      dispatch({ type: "UPDATE_EXPENSE", payload: expense });
    });
    
    toast.success(`Deleted category: ${category}`);
    return true;
  };

  const addExpense = (expense: Omit<ExpenseItem, "id">) => {
    try {
      // Generate a new ID (in a real app, this would come from the backend)
      const newId = Math.max(0, ...state.expenses.map(e => e.id)) + 1;
      const newExpense: ExpenseItem = {
        ...expense,
        id: newId
      };
      
      dispatch({ type: "ADD_EXPENSE", payload: newExpense });
      toast.success("Expense added successfully!");
      
      // Check if this is a potentially new recurring expense type
      checkForPamSuggestion(newExpense);
      
      return true;
    } catch (error) {
      toast.error("Failed to add expense");
      console.error("Error adding expense:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to add expense" });
      return false;
    }
  };

  const deleteExpense = (id: number) => {
    try {
      dispatch({ type: "DELETE_EXPENSE", payload: id });
      toast.success("Expense deleted successfully!");
      return true;
    } catch (error) {
      toast.error("Failed to delete expense");
      console.error("Error deleting expense:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to delete expense" });
      return false;
    }
  };

  const updateExpense = (expense: ExpenseItem) => {
    try {
      dispatch({ type: "UPDATE_EXPENSE", payload: expense });
      toast.success("Expense updated successfully!");
      return true;
    } catch (error) {
      toast.error("Failed to update expense");
      console.error("Error updating expense:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to update expense" });
      return false;
    }
  };
  
  // Pam integration - check for new expense patterns
  const checkForPamSuggestion = (newExpense: ExpenseItem) => {
    // Look for patterns in descriptions that might suggest a new category
    const keywords: Record<string, string> = {
      'coffee': 'Coffee',
      'starbucks': 'Coffee',
      'maintenance': 'Maintenance',
      'repair': 'Maintenance',
      'toll': 'Toll',
      'camping gear': 'Gear',
      'equipment': 'Gear'
    };
    
    const description = newExpense.description.toLowerCase();
    
    // Check if any keywords match and the expenses is currently in "Other" category
    if (newExpense.category === "Other") {
      for (const [keyword, suggestedCategory] of Object.entries(keywords)) {
        if (description.includes(keyword) && !categories.includes(suggestedCategory)) {
          // Show Pam's suggestion after a short delay
          setTimeout(() => {
            toast.info(
              `You've spent on ${keyword} a few times. Want to create a "${suggestedCategory}" category?`,
              {
                duration: 8000,
                action: {
                  label: "Create Category",
                  onClick: () => addCategory(suggestedCategory)
                }
              }
            );
          }, 2000);
          break;
        }
      }
    }
  };

  return {
    expenses: state.expenses,
    isLoading: state.isLoading,
    error: state.error,
    categories,
    categoryColors,
    addExpense,
    deleteExpense,
    updateExpense,
    addCategory,
    deleteCategory
  };
}
