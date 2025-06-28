
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { TipCategory, LeaderboardUser } from "./types";

export function useTipsData() {
  const { user } = useAuth();
  const [tipCategories, setTipCategories] = useState<TipCategory[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    fetchTipsData();
  }, [user]);

  const fetchTipsData = async () => {
    try {
      // Fetch all shared tips plus user's own tips
      const { data, error } = await supabase
        .from('financial_tips')
        .select('*')
        .or(`is_shared.eq.true,user_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tips:', error);
        setError('Failed to fetch tips');
        return;
      }

      // Group tips by category
      const categoriesMap = new Map<string, TipCategory>();
      
      data.forEach(tip => {
        if (!categoriesMap.has(tip.category)) {
          categoriesMap.set(tip.category, {
            id: tip.category.toLowerCase(),
            name: tip.category,
            tips: []
          });
        }
        
        categoriesMap.get(tip.category)!.tips.push({
          id: tip.id,
          title: tip.title,
          content: tip.content,
          source: tip.user_id === user?.id ? 'You' : 'Community',
          likes: tip.votes || 0,
          isNew: new Date(tip.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        });
      });

      setTipCategories(Array.from(categoriesMap.values()));

      // Mock leaderboard data for now - could be calculated from tips
      setLeaderboardData([
        { name: "RVAdventures", points: 1250, avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png" },
        { name: "WanderingFamily", points: 950, avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png" },
        { name: "RoadTripQueen", points: 820, avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png" },
        { name: "FrugalTraveler", points: 780, avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png" },
        { name: "BoondockerLife", points: 675, avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png" }
      ]);

    } catch (error) {
      console.error('Error in fetchTipsData:', error);
      setError('Failed to load tips data');
    } finally {
      setIsLoading(false);
    }
  };

  const addTip = async (tip: { title: string; content: string; category: string; savingsAmount?: number; isShared: boolean }) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('financial_tips')
        .insert([{
          user_id: user.id,
          title: tip.title,
          content: tip.content,
          category: tip.category,
          savings_amount: tip.savingsAmount || 0,
          is_shared: tip.isShared,
          votes: 0
        }]);

      if (error) {
        console.error('Error adding tip:', error);
        toast.error('Failed to add tip');
        return false;
      }

      await fetchTipsData();
      toast.success('Tip added successfully!');
      return true;
    } catch (error) {
      console.error('Error in addTip:', error);
      toast.error('Failed to add tip');
      return false;
    }
  };

  const voteTip = async (tipId: string, increment: boolean = true) => {
    if (!user) return false;

    try {
      // Get current votes first, then update
      const { data: currentTip, error: fetchError } = await supabase
        .from('financial_tips')
        .select('votes')
        .eq('id', tipId)
        .single();

      if (fetchError) {
        console.error('Error fetching tip votes:', fetchError);
        return false;
      }

      const newVotes = Math.max(0, (currentTip.votes || 0) + (increment ? 1 : -1));
      
      const { error } = await supabase.from('financial_tips').update({
        votes: newVotes
      }).eq('id', tipId);

      if (error) {
        console.error('Error voting on tip:', error);
        toast.error('Failed to vote on tip');
        return false;
      }

      await fetchTipsData();
      return true;
    } catch (error) {
      console.error('Error in voteTip:', error);
      toast.error('Failed to vote on tip');
      return false;
    }
  };

  return {
    tipCategories,
    leaderboardData,
    isLoading,
    error,
    addTip,
    voteTip,
    refetch: fetchTipsData
  };
}
