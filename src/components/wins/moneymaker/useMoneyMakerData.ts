
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { IncomeIdea, ChartDataItem } from "./types";

export function useMoneyMakerData() {
  const { user } = useAuth();
  const [activeIdeas, setActiveIdeas] = useState<IncomeIdea[]>([]);
  const [archivedIdeas, setArchivedIdeas] = useState<IncomeIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    fetchMoneyMakerIdeas();
  }, [user]);

  const fetchMoneyMakerIdeas = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('money_maker_ideas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching money maker ideas:', error);
        setError('Failed to fetch money maker ideas');
        return;
      }

      const formattedIdeas: IncomeIdea[] = data.map(idea => ({
        id: parseInt(idea.id) || 0,
        name: idea.name,
        status: idea.status as 'Active' | 'Paused' | 'Archived',
        monthlyIncome: Number(idea.monthly_income),
        startDate: new Date(idea.created_at).toLocaleDateString(),
        notes: idea.description || '',
        trend: 'up' as const,
        growth: 0,
        topPerformer: Number(idea.monthly_income) > 300
      }));

      const active = formattedIdeas.filter(idea => idea.status !== 'Archived');
      const archived = formattedIdeas.filter(idea => idea.status === 'Archived');

      setActiveIdeas(active);
      setArchivedIdeas(archived);
    } catch (error) {
      console.error('Error in fetchMoneyMakerIdeas:', error);
      setError('Failed to load money maker ideas');
    } finally {
      setIsLoading(false);
    }
  };

  const addMoneyMakerIdea = async (idea: Omit<IncomeIdea, 'id' | 'startDate' | 'trend' | 'growth' | 'topPerformer'>) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('money_maker_ideas')
        .insert([{
          user_id: user.id,
          name: idea.name,
          description: idea.notes,
          category: 'general',
          monthly_income: Number(idea.monthlyIncome),
          status: idea.status,
          progress: 0
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding money maker idea:', error);
        toast.error('Failed to add money maker idea');
        return false;
      }

      const newIdea: IncomeIdea = {
        id: parseInt(data.id) || 0,
        name: data.name,
        status: data.status,
        monthlyIncome: Number(data.monthly_income),
        startDate: new Date(data.created_at).toLocaleDateString(),
        notes: data.description || '',
        trend: 'up',
        growth: 0,
        topPerformer: Number(data.monthly_income) > 300
      };

      if (newIdea.status !== 'Archived') {
        setActiveIdeas(prev => [newIdea, ...prev]);
      } else {
        setArchivedIdeas(prev => [newIdea, ...prev]);
      }

      toast.success('Money maker idea added successfully!');
      return true;
    } catch (error) {
      console.error('Error in addMoneyMakerIdea:', error);
      toast.error('Failed to add money maker idea');
      return false;
    }
  };

  const updateMoneyMakerIdea = async (id: number, updates: Partial<IncomeIdea>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('money_maker_ideas')
        .update({
          name: updates.name,
          description: updates.notes,
          monthly_income: updates.monthlyIncome,
          status: updates.status
        })
        .eq('id', id.toString())
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating money maker idea:', error);
        toast.error('Failed to update money maker idea');
        return false;
      }

      await fetchMoneyMakerIdeas();
      toast.success('Money maker idea updated successfully!');
      return true;
    } catch (error) {
      console.error('Error in updateMoneyMakerIdea:', error);
      toast.error('Failed to update money maker idea');
      return false;
    }
  };

  const deleteMoneyMakerIdea = async (id: number) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('money_maker_ideas')
        .delete()
        .eq('id', id.toString())
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting money maker idea:', error);
        toast.error('Failed to delete money maker idea');
        return false;
      }

      setActiveIdeas(prev => prev.filter(idea => idea.id !== id));
      setArchivedIdeas(prev => prev.filter(idea => idea.id !== id));
      toast.success('Money maker idea deleted successfully!');
      return true;
    } catch (error) {
      console.error('Error in deleteMoneyMakerIdea:', error);
      toast.error('Failed to delete money maker idea');
      return false;
    }
  };

  // Calculate total monthly income
  const totalMonthlyIncome = activeIdeas.reduce((sum, idea) => sum + idea.monthlyIncome, 0);

  // Chart data
  const chartData: ChartDataItem[] = activeIdeas.map(idea => ({
    name: idea.name,
    income: idea.monthlyIncome,
    fill: idea.topPerformer ? '#8B5CF6' : '#0EA5E9'
  }));

  return {
    activeIdeas,
    archivedIdeas,
    chartData,
    totalMonthlyIncome,
    isLoading,
    error,
    addMoneyMakerIdea,
    updateMoneyMakerIdea,
    deleteMoneyMakerIdea,
    refetch: fetchMoneyMakerIdeas
  };
}
