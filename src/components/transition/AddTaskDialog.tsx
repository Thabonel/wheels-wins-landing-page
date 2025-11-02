import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TaskCategory, TaskPriority, ChecklistItem } from '@/types/transition.types';

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (task: {
    title: string;
    description?: string;
    category: TaskCategory;
    priority?: TaskPriority;
    milestone?: string;
    days_before_departure?: number;
    checklist_items?: Omit<ChecklistItem, 'id'>[];
  }) => Promise<void>;
}

const CATEGORIES: { value: TaskCategory; label: string; icon: string }[] = [
  { value: 'financial', label: 'Financial', icon: '💰' },
  { value: 'vehicle', label: 'Vehicle', icon: '🚐' },
  { value: 'life', label: 'Life Transitions', icon: '🏠' },
  { value: 'downsizing', label: 'Downsizing', icon: '📦' },
  { value: 'equipment', label: 'Equipment', icon: '🔧' },
  { value: 'legal', label: 'Legal', icon: '📋' },
  { value: 'social', label: 'Social', icon: '👥' },
  { value: 'custom', label: 'Custom', icon: '✏️' },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function AddTaskDialog({ open, onOpenChange, onAddTask }: AddTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('custom');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [milestone, setMilestone] = useState('');
  const [daysBeforeDeparture, setDaysBeforeDeparture] = useState('');
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklistItems([...checklistItems, newChecklistItem.trim()]);
      setNewChecklistItem('');
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddTask({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        milestone: milestone.trim() || undefined,
        days_before_departure: daysBeforeDeparture ? parseInt(daysBeforeDeparture) : undefined,
        checklist_items: checklistItems.map((text) => ({
          text,
          is_completed: false,
        })),
      });

      // Reset form
      setTitle('');
      setDescription('');
      setCategory('custom');
      setPriority('medium');
      setMilestone('');
      setDaysBeforeDeparture('');
      setChecklistItems([]);
      setNewChecklistItem('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Create a new task to track your transition progress
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Task Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Set up domicile in South Dakota"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details about this task..."
              rows={3}
            />
          </div>

          {/* Category & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select value={category} onValueChange={(value) => setCategory(value as TaskCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((pri) => (
                    <SelectItem key={pri.value} value={pri.value}>
                      {pri.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Milestone & Days Before Departure Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="milestone">Milestone</Label>
              <Input
                id="milestone"
                value={milestone}
                onChange={(e) => setMilestone(e.target.value)}
                placeholder="e.g., 3 months before"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="daysBeforeDeparture">Days Before Departure</Label>
              <Input
                id="daysBeforeDeparture"
                type="number"
                value={daysBeforeDeparture}
                onChange={(e) => setDaysBeforeDeparture(e.target.value)}
                placeholder="e.g., 90"
                min="0"
              />
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-2">
            <Label>Checklist Items (Subtasks)</Label>
            <div className="flex gap-2">
              <Input
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                placeholder="Add a subtask..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddChecklistItem}
                variant="outline"
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {checklistItems.length > 0 && (
              <div className="mt-2 space-y-1">
                {checklistItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-md"
                  >
                    <span className="text-sm">{item}</span>
                    <Button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(index)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
