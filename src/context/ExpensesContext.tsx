
import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { ExpenseItem } from "@/components/wins/expenses/ExpenseTable";
import { expensesData as initialExpenses } from "@/components/wins/expenses/mockData";

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
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

// Initial state
const initialState: ExpensesState = {
  expenses: initialExpenses,
  isLoading: false,
  error: null,
};

// Create the context
const ExpensesContext = createContext<{
  state: ExpensesState;
  dispatch: React.Dispatch<ExpensesAction>;
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
  const [state, dispatch] = useReducer(expensesReducer, initialState);

  return (
    <ExpensesContext.Provider value={{ state, dispatch }}>
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
