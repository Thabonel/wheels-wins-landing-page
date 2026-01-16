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
import { TransitionSupport } from './TransitionSupport';
import { LaunchWeekPlanner } from './LaunchWeekPlanner';
import { TransitionSettingsDialog } from './TransitionSettingsDialog';
import { TransitionOnboarding } from './TransitionOnboarding';
import type { OnboardingData } from './TransitionOnboarding';
import { TaskDialog } from './TaskDialog';
import { Button } from '@/components/ui/button';
import { Settings, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type {
  TransitionProfile,
  TransitionTask,
  TransitionTimeline as TimelineEvent,
  TransitionFinancialItem,
  TaskCategory,
  TaskPriority,
  ChecklistItem,
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TransitionTask | null>(null);

  // Calculate days until departure (handle null gracefully)
  const daysUntilDeparture = profile?.departure_date
    ? Math.ceil(
        (new Date(profile.departure_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  // Fetch transition data
  useEffect(() => {
    if (!user?.id) return;

    const fetchTransitionData = async () => {
      setIsLoading(true);
      try {
        // Fetch profile by user_id (schema uses separate user_id column)
        const { data: profileData, error: profileError } = await supabase
          .from('transition_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          throw profileError;
        }

        if (!profileData) {
          // No profile yet — let onboarding create it
          setProfile(null);
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

  // Handle editing a task
  const handleEditTask = async (taskData: {
    title: string;
    description?: string;
    category: TaskCategory;
    priority?: TaskPriority;
    milestone?: string;
    days_before_departure?: number;
    checklist_items?: { text: string; is_completed: boolean }[];
  }) => {
    if (!editingTask) return;

    try {
      const { error } = await supabase
        .from('transition_tasks')
        .update({
          title: taskData.title,
          description: taskData.description || null,
          category: taskData.category,
          priority: taskData.priority || 'medium',
          milestone: taskData.milestone || null,
          days_before_departure: taskData.days_before_departure || null,
          checklist_items: taskData.checklist_items
            ? taskData.checklist_items.map((item, index) => ({
                id: editingTask.checklist_items?.[index]?.id || crypto.randomUUID(),
                text: item.text,
                is_completed: item.is_completed,
              }))
            : [],
        })
        .eq('id', editingTask.id);

      if (error) throw error;

      // Update local state
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                title: taskData.title,
                description: taskData.description || null,
                category: taskData.category,
                priority: taskData.priority || 'medium',
                milestone: taskData.milestone || null,
                days_before_departure: taskData.days_before_departure || null,
                checklist_items: taskData.checklist_items
                  ? taskData.checklist_items.map((item, index) => ({
                      id: editingTask.checklist_items?.[index]?.id || crypto.randomUUID(),
                      text: item.text,
                      is_completed: item.is_completed,
                    }))
                  : [],
              }
            : task
        )
      );

      toast.success('Task updated successfully!');
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task. Please try again.');
      throw error;
    }
  };

  // Handle deleting a task
  const handleDeleteTask = async () => {
    if (!editingTask) return;

    try {
      const { error } = await supabase
        .from('transition_tasks')
        .delete()
        .eq('id', editingTask.id);

      if (error) throw error;

      // Update local state
      setTasks((prev) => prev.filter((task) => task.id !== editingTask.id));

      toast.success('Task deleted successfully!');
      setEditingTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task. Please try again.');
      throw error;
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

  // Handle adding a new task
  const handleAddTask = async (taskData: {
    title: string;
    description?: string;
    category: TaskCategory;
    priority?: TaskPriority;
    milestone?: string;
    days_before_departure?: number;
    checklist_items?: Omit<ChecklistItem, 'id'>[];
  }) => {
    if (!profile || !user) return;

    try {
      const { data, error } = await supabase
        .from('transition_tasks')
        .insert({
          profile_id: profile.id,
          user_id: user.id,
          title: taskData.title,
          description: taskData.description || null,
          category: taskData.category,
          priority: taskData.priority || 'medium',
          milestone: taskData.milestone || null,
          days_before_departure: taskData.days_before_departure || null,
          checklist_items: taskData.checklist_items
            ? taskData.checklist_items.map((item) => ({
                id: crypto.randomUUID(),
                text: item.text,
                is_completed: item.is_completed,
              }))
            : [],
          is_system_task: false,
          is_completed: false,
          depends_on_task_ids: [],
          blocks_task_ids: [],
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setTasks((prev) => [...prev, data]);
      toast.success('Task added successfully!');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task. Please try again.');
      throw error;
    }
  };

  // Open the add task dialog
  const handleOpenAddTask = () => {
    setAddTaskOpen(true);
  };

  const handleAddMilestone = () => {
    console.log('Add milestone');
    // TODO: Open milestone creation modal
  };

  const handleSettings = () => {
    setSettingsOpen(true);
  };

  const handleProfileUpdate = (updatedProfile: TransitionProfile) => {
    setProfile(updatedProfile);
  };

  // Handle onboarding completion
  const handleOnboardingComplete = async (data: OnboardingData) => {
    if (!user?.id) return;

    try {
      let resultProfile = profile;

      // If no profile exists yet, create one with required fields
      if (!resultProfile) {
        let created = null;
        let createError: any = null;
        try {
          const res = await supabase
            .from('transition_profiles')
            .insert({
              user_id: user.id,
              departure_date: data.departure_date.toISOString().split('T')[0],
              transition_type: data.transition_type,
              current_phase: 'planning',
              motivation: data.motivation || null,
              concerns: data.concerns || [],
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();
          created = res.data;
          createError = res.error;
        } catch (e) {
          createError = e;
        }

        // Fallback: use RPC helper if RLS blocks direct insert (403)
        if (createError) {
          try {
            const { data: rpcProfile, error: rpcError } = await supabase.rpc(
              'start_transition_profile',
              {
                p_departure_date: data.departure_date
                  .toISOString()
                  .split('T')[0],
                p_is_enabled: true,
              }
            );

            if (rpcError) throw rpcError;
            // RPC returns a row or an array depending on PostgREST config; normalize
            resultProfile = Array.isArray(rpcProfile)
              ? rpcProfile[0]
              : rpcProfile;
          } catch (rpcErr) {
            console.error('RPC start_transition_profile failed:', rpcErr);
            throw createError;
          }
        } else {
          resultProfile = created;
        }
      } else {
        // Update existing profile
        const { data: updatedProfile, error } = await supabase
          .from('transition_profiles')
          .update({
            departure_date: data.departure_date.toISOString().split('T')[0],
            transition_type: data.transition_type,
            current_phase: 'planning',
            motivation: data.motivation || null,
            concerns: data.concerns || [],
            updated_at: new Date().toISOString(),
          })
          .eq('id', resultProfile.id)
          .select()
          .single();

        if (error) throw error;
        resultProfile = updatedProfile;
      }

      setProfile(resultProfile);
      toast.success('Your transition plan is ready!');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to save your information. Please try again.');
    }
  };

  // Handle onboarding skip
  const handleOnboardingSkip = async () => {
    if (!profile) return;

    try {
      // Set minimal defaults so dashboard can load
      const { data: updatedProfile, error } = await supabase
        .from('transition_profiles')
        .update({
          transition_type: 'exploring',
          current_phase: 'planning',
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(updatedProfile);
      toast.info('You can complete your profile anytime in Settings');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      toast.error('Failed to skip onboarding. Please try again.');
    }
  };

  // Handle incremental save during onboarding (saves after each step)
  const handleSaveOnboardingStep = async (stepData: Partial<OnboardingData>) => {
    if (!user?.id) return;

    try {
      let resultProfile = profile;

      // If no profile exists yet, create one
      if (!resultProfile) {
        let created = null;
        let createError: any = null;

        try {
          const res = await supabase
            .from('transition_profiles')
            .insert({
              user_id: user.id,
              departure_date: stepData.departure_date
                ? stepData.departure_date.toISOString().split('T')[0]
                : null,
              transition_type: stepData.transition_type || null,
              current_phase: 'planning',
              motivation: stepData.motivation || null,
              concerns: stepData.concerns || [],
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();
          created = res.data;
          createError = res.error;
        } catch (e) {
          createError = e;
        }

        // Fallback: use RPC helper if RLS blocks direct insert (403)
        if (createError) {
          try {
            const { data: rpcProfile, error: rpcError } = await supabase.rpc(
              'start_transition_profile',
              {
                p_departure_date: stepData.departure_date
                  ? stepData.departure_date.toISOString().split('T')[0]
                  : null,
                p_is_enabled: true,
              }
            );

            if (rpcError) throw rpcError;
            resultProfile = Array.isArray(rpcProfile) ? rpcProfile[0] : rpcProfile;
          } catch (rpcErr) {
            console.error('RPC start_transition_profile failed:', rpcErr);
            throw createError;
          }
        } else {
          resultProfile = created;
        }
      } else {
        // Update existing profile with partial data
        const updateData: any = {
          updated_at: new Date().toISOString(),
        };

        if (stepData.departure_date) {
          updateData.departure_date = stepData.departure_date.toISOString().split('T')[0];
        }
        if (stepData.transition_type) {
          updateData.transition_type = stepData.transition_type;
        }
        if (stepData.motivation !== undefined) {
          updateData.motivation = stepData.motivation || null;
        }
        if (stepData.concerns !== undefined) {
          updateData.concerns = stepData.concerns || [];
        }

        const { data: updatedProfile, error } = await supabase
          .from('transition_profiles')
          .update(updateData)
          .eq('id', resultProfile.id)
          .select()
          .single();

        if (error) throw error;
        resultProfile = updatedProfile;
      }

      setProfile(resultProfile);
    } catch (error) {
      console.error('Error saving onboarding step:', error);
      throw error; // Re-throw so the onboarding component can show an error
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // If no profile yet, show onboarding flow to create it
  if (!profile) {
    return (
      <TransitionOnboarding
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        onSaveStep={handleSaveOnboardingStep}
        initialDepartureDate={undefined}
        existingProfile={null}
      />
    );
  }

  // ALWAYS show onboarding first if not completed
  // Onboarding is considered complete when we have Step 1 AND Step 2 data
  // Step 1: transition_type
  // Step 2: At least one of motivation or concerns must exist (both are optional, but user must complete Step 2)
  const hasStep1 = !!profile.transition_type;
  const hasStep2 = !!(profile.motivation || (profile.concerns && profile.concerns.length > 0));
  const needsOnboarding = !hasStep1 || !hasStep2;

  if (needsOnboarding) {
    return (
      <TransitionOnboarding
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        onSaveStep={handleSaveOnboardingStep}
        initialDepartureDate={
          profile.departure_date ? new Date(profile.departure_date) : undefined
        }
        existingProfile={profile}
      />
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
            {profile.transition_type
              ? `Your journey to ${profile.transition_type.replace('_', ' ')} RV living`
              : 'Plan your transition to RV living'}
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
            onAddTask={handleOpenAddTask}
            onEditTask={(task) => setEditingTask(task)}
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

        {/* Psychological Support - Full width */}
        <div className="lg:col-span-3">
          <TransitionSupport />
        </div>

        {/* Launch Week Planner - Full width */}
        <div className="lg:col-span-3">
          <LaunchWeekPlanner />
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

      {/* Settings Dialog */}
      {profile && (
        <TransitionSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          profile={profile}
          onUpdate={handleProfileUpdate}
        />
      )}

      {/* Add Task Dialog */}
      <TaskDialog
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
        onSave={handleAddTask}
      />

      {/* Edit Task Dialog */}
      <TaskDialog
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        onSave={handleEditTask}
        onDelete={handleDeleteTask}
        task={editingTask || undefined}
      />
    </div>
  );
}
