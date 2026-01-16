import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Plus, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { TransitionTask, TaskCategory, TaskPriority } from '@/types/transition.types';

interface TransitionChecklistProps {
  tasks: TransitionTask[];
  onToggleTask: (taskId: string, isCompleted: boolean) => void;
  onToggleSubTask: (taskId: string, subTaskId: string, isCompleted: boolean) => void;
  onAddTask: () => void;
  onEditTask: (task: TransitionTask) => void;
}

/**
 * Transition Checklist Component
 *
 * Displays categorized tasks with progress tracking
 */
export function TransitionChecklist({
  tasks,
  onToggleTask,
  onToggleSubTask,
  onAddTask,
  onEditTask,
}: TransitionChecklistProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<TaskCategory>>(
    new Set(['financial', 'vehicle'])
  );

  // Group tasks by category
  const tasksByCategory = tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<TaskCategory, TransitionTask[]>);

  // Calculate category progress
  const getCategoryProgress = (categoryTasks: TransitionTask[]) => {
    const completed = categoryTasks.filter((t) => t.is_completed).length;
    const total = categoryTasks.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  // Toggle category expansion
  const toggleCategory = (category: TaskCategory) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Priority colors
  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-blue-600 bg-blue-50';
      case 'low':
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Category icons
  const categoryIcons: Record<TaskCategory, string> = {
    financial: '💰',
    vehicle: '🚐',
    life: '🏠',
    downsizing: '📦',
    equipment: '🔧',
    legal: '📋',
    social: '👥',
    custom: '✏️',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Transition Checklist
          </CardTitle>
          <Button onClick={onAddTask} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(tasksByCategory).map(([category, categoryTasks]) => {
            const isExpanded = expandedCategories.has(category as TaskCategory);
            const progress = getCategoryProgress(categoryTasks);

            return (
              <div key={category} className="border rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category as TaskCategory)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="text-xl">{categoryIcons[category as TaskCategory]}</span>
                    <span className="font-medium capitalize">{category.replace('_', ' ')}</span>
                    <span className="text-sm text-gray-500">({categoryTasks.length})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-12 text-right">
                      {progress}%
                    </span>
                  </div>
                </button>

                {/* Task List */}
                {isExpanded && (
                  <div className="divide-y divide-gray-200">
                    {categoryTasks.map((task) => (
                      <div key={task.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                        {/* Main Task */}
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={task.is_completed}
                            onCheckedChange={(checked) =>
                              onToggleTask(task.id, checked as boolean)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            {/* Edit button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="float-right h-7 w-7 p-0 opacity-60 hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditTask(task);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`font-medium ${
                                  task.is_completed
                                    ? 'line-through text-gray-400'
                                    : 'text-gray-900'
                                }`}
                              >
                                {task.title}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                                  task.priority
                                )}`}
                              >
                                {task.priority}
                              </span>
                              {task.is_system_task && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
                                  System
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            )}

                            {/* Subtasks */}
                            {task.checklist_items && task.checklist_items.length > 0 && (
                              <div className="mt-2 ml-6 space-y-1">
                                {task.checklist_items.map((item) => (
                                  <div key={item.id} className="flex items-center gap-2">
                                    <Checkbox
                                      checked={item.is_completed}
                                      onCheckedChange={(checked) =>
                                        onToggleSubTask(task.id, item.id, checked as boolean)
                                      }
                                      className="h-3 w-3"
                                    />
                                    <span
                                      className={`text-sm ${
                                        item.is_completed
                                          ? 'line-through text-gray-400'
                                          : 'text-gray-700'
                                      }`}
                                    >
                                      {item.text}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Milestone & Timeline Info */}
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              {task.milestone && (
                                <span className="flex items-center gap-1">
                                  🎯 {task.milestone}
                                </span>
                              )}
                              {task.days_before_departure !== null && (
                                <span className="flex items-center gap-1">
                                  📅 {task.days_before_departure} days before departure
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {tasks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">No tasks yet</p>
              <Button onClick={onAddTask} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Your First Task
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
