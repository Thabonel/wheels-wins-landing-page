import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2, Pause, Play } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getUserAutomations, createAutomation, updateAutomationStatus, deleteAutomation, calculateNextRun } from '@/services/pam/skills';
import { getAllSkills } from '@/services/pam/skills';
import type { PamAutomation, PamSkill } from '@/services/pam/skills/types';
import { toast } from 'sonner';

export function MyReminders() {
  const { user } = useAuth();
  const [automations, setAutomations] = useState<PamAutomation[]>([]);
  const [skills, setSkills] = useState<PamSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newScheduleType, setNewScheduleType] = useState<string>('weekly');
  const [newScheduleValue, setNewScheduleValue] = useState('1');
  const [newTimezone, setNewTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [newSkillId, setNewSkillId] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [autos, allSkills] = await Promise.all([
        getUserAutomations(user.id),
        getAllSkills()
      ]);
      setAutomations(autos);
      setSkills(allSkills);
    } catch (err) {
      console.error('Failed to load reminders:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async () => {
    if (!user || !newTitle.trim()) return;

    try {
      const nextRun = calculateNextRun(newScheduleType as PamAutomation['schedule_type'], newScheduleValue);

      const result = await createAutomation({
        user_id: user.id,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        schedule_type: newScheduleType as PamAutomation['schedule_type'],
        schedule_value: newScheduleValue,
        timezone: newTimezone,
        skill_id: newSkillId || undefined,
        status: 'active',
        next_run_at: nextRun.toISOString()
      });

      if (result) {
        setAutomations(prev => [result, ...prev]);
        setNewTitle('');
        setNewDescription('');
        setAdding(false);
        toast.success('Reminder added');
      }
    } catch (err) {
      toast.error('Failed to add reminder');
    }
  };

  const handleToggleStatus = async (auto: PamAutomation) => {
    if (!user) return;
    const newStatus = auto.status === 'active' ? 'paused' : 'active';
    const success = await updateAutomationStatus(auto.id, user.id, newStatus);
    if (success) {
      setAutomations(prev => prev.map(a => a.id === auto.id ? { ...a, status: newStatus } : a));
    }
  };

  const handleDelete = async (auto: PamAutomation) => {
    if (!user) return;
    const success = await deleteAutomation(auto.id, user.id);
    if (success) {
      setAutomations(prev => prev.filter(a => a.id !== auto.id));
      toast.success('Reminder removed');
    }
  };

  const formatSchedule = (auto: PamAutomation): string => {
    switch (auto.schedule_type) {
      case 'daily': return 'Every day';
      case 'weekly': return `Every ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][parseInt(auto.schedule_value) || 0]}`;
      case 'biweekly': return `Every other ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][parseInt(auto.schedule_value) || 0]}`;
      case 'monthly': return `Monthly on day ${auto.schedule_value}`;
      case 'quarterly': return `Every 3 months`;
      case 'yearly': return `Yearly`;
      case 'one_time': return 'One time';
      default: return auto.schedule_type;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading reminders...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">My Reminders</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Scheduled reminders and automations
          </p>
        </div>
        <Button onClick={() => setAdding(!adding)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {adding && (
        <Card className="p-4 mb-6 border-dashed">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="rem-title">Title</Label>
              <Input
                id="rem-title"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Weekly budget check"
              />
            </div>
            <div>
              <Label htmlFor="rem-desc">Description (optional)</Label>
              <Input
                id="rem-desc"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="What should this reminder do?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Schedule</Label>
                <Select value={newScheduleType} onValueChange={setNewScheduleType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(newScheduleType === 'weekly' || newScheduleType === 'biweekly') && (
                <div>
                  <Label>Day of week</Label>
                  <Select value={newScheduleValue} onValueChange={setNewScheduleValue}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim()}>Save</Button>
            </div>
          </div>
        </Card>
      )}

      {automations.length === 0 && !adding ? (
        <p className="text-center text-muted-foreground py-8">
          No reminders yet. Add one to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {automations.map(auto => (
            <Card key={auto.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{auto.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      auto.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      auto.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {auto.status}
                    </span>
                  </div>
                  {auto.description && (
                    <p className="text-sm text-muted-foreground mt-1">{auto.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatSchedule(auto)}
                    {auto.next_run_at && ` - Next: ${new Date(auto.next_run_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(auto)}
                    title={auto.status === 'active' ? 'Pause' : 'Resume'}
                  >
                    {auto.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(auto)}
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
}
