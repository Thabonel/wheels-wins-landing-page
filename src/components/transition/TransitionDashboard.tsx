import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DepartureCountdown } from './DepartureCountdown';
import { TransitionChecklist } from './TransitionChecklist';
import { TransitionTimeline } from './TransitionTimeline';
import { FinancialBuckets } from './FinancialBuckets';
import { VehicleModifications } from './VehicleModifications';
import { EquipmentManager } from './EquipmentManager';
import { ShakedownLogger } from './ShakedownLogger';
import { RealityCheck } from './RealityCheck';
import { CommunityHub } from './CommunityHub';
import { Button } from '@/components/ui/button';
import { Settings, Loader2 } from 'lucide-react';
import type {
  TransitionProfile,
  TransitionTask,
  TransitionTimeline as TimelineEvent,
  TransitionFinancialItem,
} from '@/types/transition.types';

/**
 * Transition Dashboard Component
 *
 * Main dashboard for the Life Transition Navigator module
 * Displays countdown, checklist, and timeline
 */
export function TransitionDashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<TransitionProfile | null>(null);
  const [tasks, setTasks] = useState<TransitionTask[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [financialItems, setFinancialItems] = useState<TransitionFinancialItem[]>([]);

  // Calculate days until departure
  const daysUntilDeparture = profile?.departure_date
    ? Math.ceil(
        (new Date(profile.departure_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  // Fetch transition data
  useEffect(() => {
    if (!user?.id) return;

    const fetchTransitionData = async () => {
      setIsLoading(true);
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('transition_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profileData) {
          // No profile exists yet - show onboarding
          setProfile(null);
          setIsLoading(false);
          return;
        }

        setProfile(profileData);

        // Fetch tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('transition_tasks')
          .select('*')
          .eq('profile_id', profileData.id)
          .order('priority', { ascending: false })
          .order('created_at', { ascending: true });

        if (tasksError) throw tasksError;
        setTasks(tasksData || []);

        // Fetch timeline
        const { data: timelineData, error: timelineError } = await supabase
          .from('transition_timeline')
          .select('*')
          .eq('profile_id', profileData.id)
          .order('milestone_date', { ascending: true });

        if (timelineError) throw timelineError;
        setTimeline(timelineData || []);

        // Fetch financial items
        const { data: financialData, error: financialError } = await supabase
          .from('transition_financial')
          .select('*')
          .eq('profile_id', profileData.id)
          .order('bucket_type', { ascending: true })
          .order('category', { ascending: true });

        if (financialError) throw financialError;
        setFinancialItems(financialData || []);
      } catch (error) {
        console.error('Error fetching transition data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransitionData();
  }, [user?.id]);

  // Handle task toggle
  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('transition_tasks')
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                is_completed: isCompleted,
                completed_at: isCompleted ? new Date().toISOString() : null,
              }
            : task
        )
      );
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  // Handle subtask toggle
  const handleToggleSubTask = async (
    taskId: string,
    subTaskId: string,
    isCompleted: boolean
  ) => {
    try {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const updatedItems = task.checklist_items.map((item) =>
        item.id === subTaskId ? { ...item, is_completed: isCompleted } : item
      );

      const { error } = await supabase
        .from('transition_tasks')
        .update({ checklist_items: updatedItems })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, checklist_items: updatedItems } : t
        )
      );
    } catch (error) {
      console.error('Error toggling subtask:', error);
    }
  };

  // Handle milestone completion
  const handleCompleteMilestone = async (milestoneId: string) => {
    try {
      const { error } = await supabase
        .from('transition_timeline')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', milestoneId);

      if (error) throw error;

      // Update local state
      setTimeline((prev) =>
        prev.map((m) =>
          m.id === milestoneId
            ? {
                ...m,
                is_completed: true,
                completed_at: new Date().toISOString(),
              }
            : m
        )
      );
    } catch (error) {
      console.error('Error completing milestone:', error);
    }
  };

  // Handle adding financial item
  const handleAddFinancialItem = async (
    item: Omit<
      TransitionFinancialItem,
      'id' | 'profile_id' | 'user_id' | 'created_at' | 'updated_at' | 'is_funded' | 'funding_percentage'
    >
  ) => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('transition_financial')
        .insert({
          profile_id: profile.id,
          user_id: user!.id,
          bucket_type: item.bucket_type,
          category: item.category,
          estimated_amount: item.estimated_amount,
          current_amount: item.current_amount,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setFinancialItems((prev) => [...prev, data]);
    } catch (error) {
      console.error('Error adding financial item:', error);
    }
  };

  // Handle updating financial item
  const handleUpdateFinancialItem = async (
    itemId: string,
    updates: Partial<TransitionFinancialItem>
  ) => {
    try {
      const { error } = await supabase
        .from('transition_financial')
        .update({
          category: updates.category,
          estimated_amount: updates.estimated_amount,
          current_amount: updates.current_amount,
        })
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      setFinancialItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      );
    } catch (error) {
      console.error('Error updating financial item:', error);
    }
  };

  // Handle deleting financial item
  const handleDeleteFinancialItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('transition_financial')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Remove from local state
      setFinancialItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting financial item:', error);
    }
  };

  // Placeholder handlers
  const handleAddTask = () => {
    console.log('Add task');
    // TODO: Open task creation modal
  };

  const handleAddMilestone = () => {
    console.log('Add milestone');
    // TODO: Open milestone creation modal
  };

  const handleSettings = () => {
    console.log('Open settings');
    // TODO: Navigate to settings
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // No profile - show onboarding
  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h1 className="text-3xl font-bold">Welcome to Life Transition Navigator</h1>
          <p className="text-gray-600">
            Plan your journey from traditional life to full-time RV living with a
            comprehensive checklist, timeline, and financial planning tools.
          </p>
          <Button size="lg">Get Started</Button>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Life Transition Navigator</h1>
          <p className="text-gray-600">
            Your journey to {profile.transition_type.replace('_', ' ')} RV living
          </p>
        </div>
        <Button onClick={handleSettings} variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Dashboard Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Countdown - Full width on mobile, 1 column on desktop */}
        <div className="lg:col-span-1">
          <DepartureCountdown
            departureDate={profile.departure_date}
            currentPhase={profile.current_phase}
            daysUntilDeparture={daysUntilDeparture}
          />
        </div>

        {/* Checklist - Full width on mobile, 2 columns on desktop */}
        <div className="lg:col-span-2">
          <TransitionChecklist
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onToggleSubTask={handleToggleSubTask}
            onAddTask={handleAddTask}
          />
        </div>

        {/* Financial Buckets - Full width */}
        <div className="lg:col-span-3">
          <FinancialBuckets
            financialItems={financialItems}
            onAddItem={handleAddFinancialItem}
            onUpdateItem={handleUpdateFinancialItem}
            onDeleteItem={handleDeleteFinancialItem}
          />
        </div>

        {/* Vehicle Modifications - Full width */}
        <div className="lg:col-span-3">
          <VehicleModifications />
        </div>

        {/* Equipment Manager - Full width */}
        <div className="lg:col-span-3">
          <EquipmentManager />
        </div>

        {/* Shakedown Trip Logger - Full width */}
        <div className="lg:col-span-3">
          <ShakedownLogger />
        </div>

        {/* Reality Check - Full width */}
        <div className="lg:col-span-3">
          <RealityCheck />
        </div>

        {/* Community Hub - Full width */}
        <div className="lg:col-span-3">
          <CommunityHub />
        </div>

        {/* Timeline - Full width */}
        <div className="lg:col-span-3">
          <TransitionTimeline
            milestones={timeline}
            onCompleteMilestone={handleCompleteMilestone}
            onAddMilestone={handleAddMilestone}
          />
        </div>
      </div>
    </div>
  );
}
