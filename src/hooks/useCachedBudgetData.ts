
import { useState, useEffect } from 'react';
import { BudgetCategory, BudgetSummary } from '@/components/wins/budgets/types';

interface CachedBudgetData {
  budgetSummary: BudgetSummary;
  categories: BudgetCategory[];
  expenses: any[];
  pamTips: string[];
  timestamp: Date;
}

const DEFAULT_BUDGET_DATA: CachedBudgetData = {
  budgetSummary: {
    totalBudget: 0,
    totalSpent: 0,
    totalRemaining: 0,
    totalProgress: 0,
  },
  categories: [],
  expenses: [],
  pamTips: [
    "Track your fuel expenses to find the best gas stations along your route.",
    "Consider cooking more meals in your RV to reduce dining out costs.",
    "Plan your route to minimize backtracking and save on fuel costs."
  ],
  timestamp: new Date()
};

export function useCachedBudgetData() {
  const [cachedData, setCachedData] = useState<CachedBudgetData>(() => {
    const saved = localStorage.getItem('cached-budget-data');
    return saved ? JSON.parse(saved) : DEFAULT_BUDGET_DATA;
  });

  useEffect(() => {
    localStorage.setItem('cached-budget-data', JSON.stringify(cachedData));
  }, [cachedData]);

  const updateCache = (data: Partial<CachedBudgetData>) => {
    setCachedData(prev => ({
      ...prev,
      ...data,
      timestamp: new Date()
    }));
  };

  const addPamTip = (tip: string) => {
    setCachedData(prev => ({
      ...prev,
      pamTips: [tip, ...prev.pamTips.slice(0, 2)], // Keep only 3 tips
      timestamp: new Date()
    }));
  };

  return {
    cachedData,
    updateCache,
    addPamTip
  };
}
