
import { useExpenses } from "@/context/ExpensesContext";
import { ExpenseItem } from "@/components/wins/expenses/ExpenseTable";
import { toast } from "sonner";

export function useExpenseActions() {
  const { state, dispatch } = useExpenses();

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

  return {
    expenses: state.expenses,
    isLoading: state.isLoading,
    error: state.error,
    addExpense,
    deleteExpense,
    updateExpense
  };
}
