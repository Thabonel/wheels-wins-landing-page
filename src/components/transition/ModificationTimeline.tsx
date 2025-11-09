import React, { useMemo, useState } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, ZoomIn, ZoomOut } from 'lucide-react';

interface VehicleModification {
  id: string;
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
}

interface ModificationTimelineProps {
  modifications: VehicleModification[];
  onDateChange?: (modificationId: string, start: Date, end: Date) => void;
}

const categoryColors = {
  power: { background: '#fef3c7', progress: '#f59e0b' },
  water: { background: '#dbeafe', progress: '#3b82f6' },
  comfort: { background: '#f3e8ff', progress: '#a855f7' },
  safety: { background: '#fee2e2', progress: '#ef4444' },
  storage: { background: '#d1fae5', progress: '#10b981' },
  exterior: { background: '#f3f4f6', progress: '#6b7280' },
  other: { background: '#f1f5f9', progress: '#64748b' },
};

const statusColors = {
  planned: { background: '#e0e7ff', progress: '#818cf8' },
  in_progress: { background: '#fed7aa', progress: '#fb923c' },
  complete: { background: '#bbf7d0', progress: '#4ade80' },
};

export const ModificationTimeline: React.FC<ModificationTimelineProps> = ({
  modifications,
  onDateChange,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  const [colorBy, setColorBy] = useState<'category' | 'status'>('category');

  // Transform modifications to Gantt tasks
  const tasks: Task[] = useMemo(() => {
    const today = new Date();

    return modifications.map((mod, index) => {
      // Calculate start and end dates
      let start: Date;
      let end: Date;

      if (mod.status === 'complete' && mod.completion_date) {
        // Completed task - use actual completion date
        end = new Date(mod.completion_date);
        const hoursRequired = mod.time_required_hours || 8;
        start = new Date(end.getTime() - hoursRequired * 60 * 60 * 1000);
      } else {
        // Planned or in-progress - estimate based on creation date or today
        start = mod.created_at ? new Date(mod.created_at) : new Date(today.getTime() + index * 24 * 60 * 60 * 1000);
        const hoursRequired = mod.time_required_hours || 8;
        end = new Date(start.getTime() + hoursRequired * 60 * 60 * 1000);
      }

      // Calculate progress based on status
      const progress =
        mod.status === 'complete' ? 100 :
        mod.status === 'in_progress' ? 50 :
        0;

      // Get colors based on selected color scheme
      const colors = colorBy === 'category'
        ? categoryColors[mod.category]
        : statusColors[mod.status];

      return {
        id: mod.id,
        name: mod.name,
        type: 'task' as const,
        start,
        end,
        progress,
        dependencies: mod.dependencies?.map(dep => {
          // Try to find the modification by name in the list
          const depMod = modifications.find(m => m.name === dep);
          return depMod?.id || dep;
        }),
        styles: {
          backgroundColor: colors.background,
          backgroundSelectedColor: colors.background,
          progressColor: colors.progress,
          progressSelectedColor: colors.progress,
        },
        isDisabled: mod.status === 'complete',
      };
    });
  }, [modifications, colorBy]);

  const handleDateChange = (task: Task) => {
    if (onDateChange) {
      onDateChange(task.id, task.start, task.end);
    }
  };

  const handleViewModeChange = (mode: string) => {
    switch (mode) {
      case 'day':
        setViewMode(ViewMode.Day);
        break;
      case 'week':
        setViewMode(ViewMode.Week);
        break;
      case 'month':
        setViewMode(ViewMode.Month);
        break;
      default:
        setViewMode(ViewMode.Month);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Calendar className="h-12 w-12 mb-4" />
        <p>No modifications to display in timeline view</p>
        <p className="text-sm mt-2">Add modifications to see them on the timeline</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">View:</span>
          <Select value={viewMode} onValueChange={handleViewModeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Color by:</span>
          <Select value={colorBy} onValueChange={(v) => setColorBy(v as 'category' | 'status')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-medium">Legend:</span>
          {colorBy === 'category' ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryColors).map(([key, colors]) => (
                <Badge
                  key={key}
                  variant="outline"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.progress,
                    color: colors.progress,
                  }}
                  className="text-xs"
                >
                  {key}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                style={{
                  backgroundColor: statusColors.planned.background,
                  borderColor: statusColors.planned.progress,
                  color: statusColors.planned.progress,
                }}
                className="text-xs"
              >
                Planned
              </Badge>
              <Badge
                variant="outline"
                style={{
                  backgroundColor: statusColors.in_progress.background,
                  borderColor: statusColors.in_progress.progress,
                  color: statusColors.in_progress.progress,
                }}
                className="text-xs"
              >
                In Progress
              </Badge>
              <Badge
                variant="outline"
                style={{
                  backgroundColor: statusColors.complete.background,
                  borderColor: statusColors.complete.progress,
                  color: statusColors.complete.progress,
                }}
                className="text-xs"
              >
                Complete
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <Gantt
          tasks={tasks}
          viewMode={viewMode}
          onDateChange={handleDateChange}
          listCellWidth="200px"
          columnWidth={viewMode === ViewMode.Month ? 60 : viewMode === ViewMode.Week ? 100 : 150}
          rowHeight={45}
          barCornerRadius={3}
          todayColor="rgba(239, 68, 68, 0.2)"
          locale="en-US"
        />
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 space-y-1">
        <p>• Drag task bars to adjust start/end dates (completed tasks cannot be dragged)</p>
        <p>• Lines show dependencies between modifications</p>
        <p>• Bar length represents estimated time required</p>
        <p>• Progress bar shows completion status</p>
      </div>
    </div>
  );
};
