
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface IncomeEntry {
  id: string;
  amount: number;
  source: string;
  date: string;
  type: string;
  description?: string;
}

export function useIncomeData() {
  const { user } = useAuth();
  const [incomeData, setIncomeData] = useState<IncomeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    fetchIncomeData();
  }, [user]);

  const fetchIncomeData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('income_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching income data:', error);
        setError('Failed to fetch income data');
        return;
      }

      const formattedData: IncomeEntry[] = data.map(entry => ({
        id: entry.id,
        amount: Number(entry.amount),
        source: entry.source,
        date: entry.date,
        type: entry.type || 'regular',
        description: entry.description
      }));

      setIncomeData(formattedData);
    } catch (error) {
      console.error('Error in fetchIncomeData:', error);
      setError('Failed to load income data');
    } finally {
      setIsLoading(false);
    }
  };

  const addIncome = async (income: Omit<IncomeEntry, 'id'>) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('income_entries')
        .insert([{
          user_id: user.id,
          amount: Number(income.amount),
          source: income.source,
          date: income.date,
          type: income.type,
          description: income.description
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding income:', error);
        toast.error('Failed to add income');
        return false;
      }

      const newIncome: IncomeEntry = {
        id: data.id,
        amount: Number(data.amount),
        source: data.source,
        date: data.date,
        type: data.type,
        description: data.description
      };

      setIncomeData(prev => [newIncome, ...prev]);
      toast.success('Income added successfully!');
      return true;
    } catch (error) {
      console.error('Error in addIncome:', error);
      toast.error('Failed to add income');
      return false;
    }
  };

  const deleteIncome = async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('income_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting income:', error);
        toast.error('Failed to delete income');
        return false;
      }

      setIncomeData(prev => prev.filter(income => income.id !== id));
      toast.success('Income deleted successfully!');
      return true;
    } catch (error) {
      console.error('Error in deleteIncome:', error);
      toast.error('Failed to delete income');
      return false;
    }
  };

  // Calculate chart data
  const chartData = incomeData.reduce((acc, entry) => {
    const month = new Date(entry.date).toLocaleDateString('en-US', { month: 'short' });
    const existing = acc.find(item => item.name === month);
    
    if (existing) {
      existing.income += entry.amount;
    } else {
      acc.push({ name: month, income: entry.amount });
    }
    
    return acc;
  }, [] as { name: string; income: number }[]);

  return {
    incomeData,
    isLoading,
    error,
    addIncome,
    deleteIncome,
    chartData,
    refetch: fetchIncomeData
  };
}
