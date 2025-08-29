
export interface BudgetCategory {
  id: number;
  name: string;
  budgeted: number;
  spent: number;
  remaining: number;
  progress: number;
  color: string;
  status: string;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  totalProgress: number;
}
