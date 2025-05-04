
import { budgetCategories } from "./mockData";
import { BudgetSummary } from "./types";

export function useBudgetCalculations() {
  // Calculate total budget summary
  const totalBudget = budgetCategories.reduce((sum, item) => sum + item.budgeted, 0);
  const totalSpent = budgetCategories.reduce((sum, item) => sum + item.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const totalProgress = Math.round((totalSpent / totalBudget) * 100);
  
  const budgetSummary: BudgetSummary = {
    totalBudget,
    totalSpent,
    totalRemaining,
    totalProgress
  };
  
  return {
    categories: budgetCategories,
    budgetSummary
  };
}
