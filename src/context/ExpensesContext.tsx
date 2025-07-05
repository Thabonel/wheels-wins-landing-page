
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import { ExpenseItem } from "@/components/wins/expenses/ExpenseTable";
import { useAuth } from "@/context/AuthContext";
import {
  fetchExpenses,
  createExpense,
  updateExpense as updateExpenseApi,
  deleteExpense as deleteExpenseApi,
  ExpenseInput
} from "@/services/expensesService";

// Define the state type
interface ExpensesState {
  expenses: ExpenseItem[];
  isLoading: boolean;
  error: string | null;
}

// Define the action types
type ExpensesAction =
  | { type: "ADD_EXPENSE"; payload: ExpenseItem }
  | { type: "DELETE_EXPENSE"; payload: number }
  | { type: "UPDATE_EXPENSE"; payload: ExpenseItem }
  | { type: "SET_EXPENSES"; payload: ExpenseItem[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

// Initial state
const initialState: ExpensesState = {
  expenses: [],
  isLoading: true,
  error: null,
};

// Create the context
const ExpensesContext = createContext<{
  state: ExpensesState;
  dispatch: React.Dispatch<ExpensesAction>;
  addExpense: (expense: ExpenseInput) => Promise<void>;
  updateExpense: (id: number, updates: Partial<ExpenseInput>) => Promise<void>;
  deleteExpense: (id: number) => Promise<void>;
  refreshExpenses: () => Promise<void>;
} | undefined>(undefined);

// Reducer function
function expensesReducer(state: ExpensesState, action: ExpensesAction): ExpensesState {
  switch (action.type) {
    case "ADD_EXPENSE":
      return {
        ...state,
        expenses: [action.payload, ...state.expenses],
      };
    case "DELETE_EXPENSE":
      return {
        ...state,
        expenses: state.expenses.filter((expense) => expense.id !== action.payload),
      };
    case "UPDATE_EXPENSE":
      return {
        ...state,
        expenses: state.expenses.map((expense) =>
          expense.id === action.payload.id ? action.payload : expense
        ),
      };
    case "SET_EXPENSES":
      return {
        ...state,
        expenses: action.payload,
      };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
      };
    default:
      return state;
  }
}

// Provider component
export function ExpensesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(expensesReducer, initialState);

  const loadExpenses = async () => {
    if (!user) return;
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const expenses = await fetchExpenses(user.id);
      dispatch({ type: "SET_EXPENSES", payload: expenses });
      dispatch({ type: "SET_ERROR", payload: null });
    } catch (err: any) {
      console.error("Failed to load expenses", err);
      dispatch({ type: "SET_ERROR", payload: "Failed to load expenses" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const addExpense = async (expense: ExpenseInput) => {
    if (!user) return;
    try {
      const newExpense = await createExpense(user.id, expense);
      dispatch({ type: "ADD_EXPENSE", payload: newExpense });
    } catch (err) {
      console.error("Failed to add expense", err);
    }
  };

  const updateExpense = async (id: number, updates: Partial<ExpenseInput>) => {
    if (!user) return;
    try {
      await updateExpenseApi(user.id, id, updates);
      dispatch({ type: "SET_LOADING", payload: true });
      await loadExpenses();
    } catch (err) {
      console.error("Failed to update expense", err);
    }
  };

  const deleteExpense = async (id: number) => {
    if (!user) return;
    try {
      await deleteExpenseApi(user.id, id);
      dispatch({ type: "DELETE_EXPENSE", payload: id });
    } catch (err) {
      console.error("Failed to delete expense", err);
    }
  };

  return (
    <ExpensesContext.Provider value={{ state, dispatch, addExpense, updateExpense, deleteExpense, refreshExpenses: loadExpenses }}>
      {children}
    </ExpensesContext.Provider>
  );
}

// Custom hook to use the expenses context
export function useExpenses() {
  const context = useContext(ExpensesContext);
  if (context === undefined) {
    throw new Error("useExpenses must be used within an ExpensesProvider");
  }
  return context;
}
