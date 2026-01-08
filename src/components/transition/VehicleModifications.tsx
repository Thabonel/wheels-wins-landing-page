import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { ModificationCard } from './ModificationCard';
import { AddModificationDialog } from './AddModificationDialog';
import { ModificationTimeline } from './ModificationTimeline';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VehicleModification {
  id: string;
  profile_id: string;
  name: string;
  category: 'power' | 'water' | 'comfort' | 'safety' | 'storage' | 'exterior' | 'other';
  priority: 'essential' | 'important' | 'nice-to-have';
  status: 'planned' | 'in_progress' | 'complete';
  estimated_cost?: number;
  actual_cost?: number;
  time_required_hours?: number;
  diy_feasible: boolean;
  dependencies?: string[];
  vendor_links?: { name: string; url: string }[];
  photo_urls?: string[];
  description?: string;
  notes?: string;
  completion_date?: string;
  created_at?: string;
  updated_at?: string;
}

interface ModStats {
  total_mods: number;
  planned_count: number;
  in_progress_count: number;
  complete_count: number;
  total_estimated_cost: number;
  total_actual_cost: number;
  completion_percentage: number;
}

interface DroppableColumnProps {
  id: string;
  children: React.ReactNode;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ id, children }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="min-h-[200px]">
      {children}
    </div>
  );
};

export const VehicleModifications: React.FC = () => {
  const [modifications, setModifications] = useState<VehicleModification[]>([]);
  const [stats, setStats] = useState<ModStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'kanban' | 'timeline'>('kanban');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [profileId, setProfileId] = useState<string>('');
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchModifications();
    fetchStats();
  }, []);

  const fetchModifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile_id from transition_profiles
      const { data: profile } = await supabase
        .from('transition_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      setProfileId(profile.id);

      const { data, error } = await supabase
        .from('transition_vehicle_mods')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setModifications(data || []);
    } catch (error) {
      console.error('Error fetching modifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load modifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('transition_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .rpc('get_vehicle_mod_stats', { p_user_id: profile.id });

      if (error) throw error;
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const newStatus = over.id as 'planned' | 'in_progress' | 'complete';

    // Find the modification being moved
    const modification = modifications.find(mod => mod.id === activeId);
    if (!modification || modification.status === newStatus) {
      setActiveId(null);
      return;
    }

    // Optimistically update UI
    setModifications(prev =>
      prev.map(mod =>
        mod.id === activeId
          ? {
              ...mod,
              status: newStatus,
              completion_date: newStatus === 'complete' ? new Date().toISOString() : mod.completion_date,
            }
          : mod
      )
    );

    // Update in database
    try {
      const { error } = await supabase
        .from('transition_vehicle_mods')
        .update({
          status: newStatus,
          completion_date: newStatus === 'complete' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Modification moved to ${newStatus.replace('_', ' ')}`,
      });

      // Refresh stats
      fetchStats();
    } catch (error) {
      console.error('Error updating modification:', error);
      toast({
        title: 'Error',
        description: 'Failed to update modification status',
        variant: 'destructive',
      });
      // Revert optimistic update
      fetchModifications();
    }

    setActiveId(null);
  };

  const getModsByStatus = (status: string) => {
    return modifications.filter(mod => mod.status === status);
  };

  const activeModification = activeId
    ? modifications.find(mod => mod.id === activeId)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading modifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Mods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_mods}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Estimated Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.total_estimated_cost?.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Actual Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.total_actual_cost?.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completion_percentage}%</div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.complete_count} of {stats.total_mods} complete
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Toggle */}
      <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as 'kanban' | 'timeline')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
            <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          </TabsList>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Modification
          </Button>
        </div>

        {/* Kanban Board */}
        <TabsContent value="kanban" className="mt-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Planned Column */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Planned</h3>
                  <Badge variant="secondary">{getModsByStatus('planned').length}</Badge>
                </div>
                <DroppableColumn id="planned">
                  <SortableContext
                    items={getModsByStatus('planned').map(m => m.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {getModsByStatus('planned').map(mod => (
                        <ModificationCard key={mod.id} modification={mod} />
                      ))}
                    </div>
                  </SortableContext>
                </DroppableColumn>
              </div>

              {/* In Progress Column */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">In Progress</h3>
                  <Badge variant="secondary">{getModsByStatus('in_progress').length}</Badge>
                </div>
                <DroppableColumn id="in_progress">
                  <SortableContext
                    items={getModsByStatus('in_progress').map(m => m.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {getModsByStatus('in_progress').map(mod => (
                        <ModificationCard key={mod.id} modification={mod} />
                      ))}
                    </div>
                  </SortableContext>
                </DroppableColumn>
              </div>

              {/* Complete Column */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Complete</h3>
                  <Badge variant="secondary">{getModsByStatus('complete').length}</Badge>
                </div>
                <DroppableColumn id="complete">
                  <SortableContext
                    items={getModsByStatus('complete').map(m => m.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {getModsByStatus('complete').map(mod => (
                        <ModificationCard key={mod.id} modification={mod} />
                      ))}
                    </div>
                  </SortableContext>
                </DroppableColumn>
              </div>
            </div>

            <DragOverlay>
              {activeModification && (
                <ModificationCard modification={activeModification} />
              )}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        {/* Timeline View */}
        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Installation Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ModificationTimeline
                modifications={modifications}
                onDateChange={async (modificationId, start, end) => {
                  // Update modification dates in database
                  try {
                    const { error } = await supabase
                      .from('transition_vehicle_mods')
                      .update({
                        // Store estimated dates in notes for now
                        notes: `Planned: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', modificationId);

                    if (error) throw error;

                    toast({
                      title: 'Timeline Updated',
                      description: 'Modification schedule updated successfully',
                    });

                    // Refresh modifications
                    fetchModifications();
                  } catch (error) {
                    console.error('Error updating timeline:', error);
                    toast({
                      title: 'Error',
                      description: 'Failed to update modification schedule',
                      variant: 'destructive',
                    });
                  }
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Modification Dialog */}
      <AddModificationDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          fetchModifications();
          fetchStats();
        }}
        profileId={profileId}
      />
    </div>
  );
};
