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
      const response = await apiFetch(`/api/v1/wins/financial-summary/${user.id}?days=${days}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch summary');
      const data = await response.json();
      setSummary(data);
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
