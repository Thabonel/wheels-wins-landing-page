import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export interface ExpenseCategorySummary {
  category: string;
  amount: number;
  count: number;
}

export interface FinancialSummary {
  user_id: string;
  period_days: number;
  total_income: number;
  total_expenses: number;
  net_income: number;
  expense_categories: ExpenseCategorySummary[];
  generated_at: string;
}

export function useFinancialSummary(days: number = 30) {
  const { user, token } = useAuth();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // For now, return mock data since the backend endpoint is not available
      const mockData: FinancialSummary = {
        user_id: user.id,
        period_days: days,
        total_income: 0,
        total_expenses: 0,
        net_income: 0,
        expense_categories: [],
        generated_at: new Date().toISOString()
      };
      setSummary(mockData);
      setError(null);
    } catch (err) {
      console.error('Error fetching financial summary:', err);
      setError('Failed to load summary');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [user, token, days]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}
