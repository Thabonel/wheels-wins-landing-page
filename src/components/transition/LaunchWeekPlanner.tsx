import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CheckCircle2, Clock, AlertCircle, Loader2, MapPin, Phone, Heart, Rocket } from 'lucide-react';

interface LaunchWeekTask {
  id: string;
  day_number: number;
  task_name: string;
  description: string;
  is_critical: boolean;
  time_estimate_minutes: number;
  category: string;
  is_completed: boolean;
  user_task_id?: string;
}

interface DayProgress {
  day_number: number;
  total_tasks: number;
  completed_tasks: number;
  critical_tasks: number;
  critical_completed: number;
  completion_percentage: number;
}

interface LaunchDate {
  launch_date: string;
  first_destination?: string;
  emergency_contacts?: any;
  celebration_plans?: string;
}

interface CheckIn {
  checkin_type: 'day_1' | 'week_1' | 'month_1';
  response: string;
  mood?: string;
  challenges?: string;
  wins?: string;
}

const DAY_LABELS: Record<number, string> = {
  '-7': '7 Days Before',
  '-6': '6 Days Before',
  '-5': '5 Days Before',
  '-4': '4 Days Before',
  '-3': '3 Days Before',
  '-2': '2 Days Before',
  '-1': '1 Day Before',
  '0': '🚀 Launch Day!',
};

const MOOD_OPTIONS = [
  { value: 'excited', label: 'Excited' },
  { value: 'anxious', label: 'Anxious' },
  { value: 'overwhelmed', label: 'Overwhelmed' },
  { value: 'confident', label: 'Confident' },
  { value: 'uncertain', label: 'Uncertain' },
  { value: 'hopeful', label: 'Hopeful' },
  { value: 'relieved', label: 'Relieved' },
  { value: 'exhausted', label: 'Exhausted' },
];

/**
 * LaunchWeekPlanner Component
 *
 * Day-by-day preparation system for final week before departure:
 * - Days -7 to 0 (launch day) task checklists
 * - Progress tracking per day
 * - Special launch day view
 * - Post-departure check-ins (Day 1, Week 1, Month 1)
 */
export function LaunchWeekPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(-7);
  const [tasks, setTasks] = useState<LaunchWeekTask[]>([]);
  const [dayProgress, setDayProgress] = useState<DayProgress[]>([]);
  const [launchDate, setLaunchDate] = useState<LaunchDate | null>(null);
  const [daysUntilLaunch, setDaysUntilLaunch] = useState<number | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [newCheckIn, setNewCheckIn] = useState<CheckIn>({
    checkin_type: 'day_1',
    response: '',
    mood: '',
    challenges: '',
    wins: '',
  });

  // Launch date form state
  const [launchDateForm, setLaunchDateForm] = useState({
    launch_date: '',
    first_destination: '',
    emergency_contacts: '',
    celebration_plans: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Load launch date
      const { data: launchData } = await supabase
        .from('user_launch_dates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setLaunchDate(launchData);

      if (launchData) {
        // Calculate days until launch
        const { data: daysData } = await supabase
          .rpc('get_days_until_launch', { p_user_id: user.id });
        setDaysUntilLaunch(daysData);

        setLaunchDateForm({
          launch_date: launchData.launch_date,
          first_destination: launchData.first_destination || '',
          emergency_contacts: launchData.emergency_contacts ? JSON.stringify(launchData.emergency_contacts, null, 2) : '',
          celebration_plans: launchData.celebration_plans || '',
        });
      }

      // Load all launch week tasks
      const { data: tasksData } = await supabase
        .from('launch_week_tasks')
        .select(`
          *,
          user_launch_tasks!left(id, is_completed, user_id)
        `)
        .order('day_number', { ascending: true })
        .order('order_num', { ascending: true });

      // Transform data to include completion status
      const transformedTasks: LaunchWeekTask[] = (tasksData || []).map((task: any) => {
        const userTask = task.user_launch_tasks?.find((ut: any) => ut.user_id === user.id);
        return {
          id: task.id,
          day_number: task.day_number,
          task_name: task.task_name,
          description: task.description,
          is_critical: task.is_critical,
          time_estimate_minutes: task.time_estimate_minutes,
          category: task.category,
          is_completed: userTask?.is_completed || false,
          user_task_id: userTask?.id,
        };
      });

      setTasks(transformedTasks);

      // Load progress for all days
      const { data: progressData, error: progressError } = await supabase
        .rpc('get_launch_week_progress', { p_user_id: user.id });

      if (progressError) {
        console.error('Error loading progress:', progressError);
        throw progressError;
      }

      setDayProgress(progressData || []);

      // Load check-ins
      const { data: checkInsData } = await supabase
        .from('launch_checkins')
        .select('*')
        .eq('user_id', user.id);

      setCheckIns(checkInsData || []);
    } catch (error) {
      console.error('Error loading launch week data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetLaunchDate = async () => {
    if (!user?.id || !launchDateForm.launch_date) {
      toast({
        title: 'Missing Information',
        description: 'Please select a launch date',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_launch_dates')
        .upsert({
          user_id: user.id,
          launch_date: launchDateForm.launch_date,
          first_destination: launchDateForm.first_destination || null,
          emergency_contacts: launchDateForm.emergency_contacts
            ? JSON.parse(launchDateForm.emergency_contacts)
            : null,
          celebration_plans: launchDateForm.celebration_plans || null,
        });

      if (error) throw error;

      toast({
        title: 'Launch Date Set!',
        description: 'Your countdown has begun',
      });

      loadData();
    } catch (error) {
      console.error('Error setting launch date:', error);
      toast({
        title: 'Error',
        description: 'Failed to set launch date',
        variant: 'destructive',
      });
    }
  };

  const handleToggleTask = async (task: LaunchWeekTask) => {
    if (!user?.id) return;

    try {
      const newCompletedState = !task.is_completed;

      if (task.user_task_id) {
        // Update existing user task
        const { error } = await supabase
          .from('user_launch_tasks')
          .update({
            is_completed: newCompletedState,
            completed_at: newCompletedState ? new Date().toISOString() : null,
          })
          .eq('id', task.user_task_id);

        if (error) throw error;
      } else {
        // Create new user task
        const { error } = await supabase
          .from('user_launch_tasks')
          .insert({
            user_id: user.id,
            task_id: task.id,
            is_completed: newCompletedState,
            completed_at: newCompletedState ? new Date().toISOString() : null,
          });

        if (error) throw error;
      }

      // Update local state
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, is_completed: newCompletedState } : t
        )
      );

      loadData(); // Reload to update progress
    } catch (error) {
      console.error('Error toggling task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const handleCheckIn = async () => {
    if (!user?.id || !newCheckIn.response) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a response',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('launch_checkins')
        .upsert({
          user_id: user.id,
          checkin_type: newCheckIn.checkin_type,
          response: newCheckIn.response,
          mood: newCheckIn.mood || null,
          challenges: newCheckIn.challenges || null,
          wins: newCheckIn.wins || null,
        }, {
          onConflict: 'user_id,checkin_type'
        });

      if (error) throw error;

      toast({
        title: 'Check-in Saved',
        description: 'Your journey is being documented!',
      });

      setNewCheckIn({
        checkin_type: 'day_1',
        response: '',
        mood: '',
        challenges: '',
        wins: '',
      });

      loadData();
    } catch (error) {
      console.error('Error saving check-in:', error);
      toast({
        title: 'Error',
        description: 'Failed to save check-in',
        variant: 'destructive',
      });
    }
  };

  const getDayTasks = (day: number) => {
    return tasks.filter((t) => t.day_number === day);
  };

  const getDayProgressData = (day: number) => {
    return dayProgress.find((p) => p.day_number === day);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (!launchDate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Launch Week Planner</CardTitle>
          <CardDescription>
            Set your departure date to begin your launch week countdown
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="launch-date">Launch Date</Label>
              <Input
                id="launch-date"
                type="date"
                value={launchDateForm.launch_date}
                onChange={(e) => setLaunchDateForm({ ...launchDateForm, launch_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="first-dest">First Destination (optional)</Label>
              <Input
                id="first-dest"
                placeholder="e.g., Grand Canyon, Arizona"
                value={launchDateForm.first_destination}
                onChange={(e) => setLaunchDateForm({ ...launchDateForm, first_destination: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="emergency">Emergency Contacts (optional, JSON format)</Label>
              <Textarea
                id="emergency"
                placeholder='{"mom": "555-1234", "sister": "555-5678"}'
                value={launchDateForm.emergency_contacts}
                onChange={(e) => setLaunchDateForm({ ...launchDateForm, emergency_contacts: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="celebration">Celebration Plans (optional)</Label>
              <Textarea
                id="celebration"
                placeholder="How will you celebrate this milestone?"
                value={launchDateForm.celebration_plans}
                onChange={(e) => setLaunchDateForm({ ...launchDateForm, celebration_plans: e.target.value })}
                rows={2}
              />
            </div>

            <Button onClick={handleSetLaunchDate} className="w-full" size="lg">
              <Rocket className="h-4 w-4 mr-2" />
              Start Launch Week Countdown
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedDayTasks = getDayTasks(selectedDay);
  const selectedDayProgress = getDayProgressData(selectedDay);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-6 w-6 text-orange-500" />
            Launch Week Planner
          </div>
          {daysUntilLaunch !== null && (
            <Badge variant={daysUntilLaunch <= 0 ? 'default' : 'outline'} className="text-lg">
              {daysUntilLaunch > 0
                ? `${daysUntilLaunch} days until launch`
                : daysUntilLaunch === 0
                ? '🚀 Launch Day!'
                : `${Math.abs(daysUntilLaunch)} days on the road`}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Day-by-day preparation for your departure • Launch: {new Date(launchDate.launch_date).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Day selector */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {[-7, -6, -5, -4, -3, -2, -1, 0].map((day) => {
            const progress = getDayProgressData(day);
            const isComplete = progress && progress.completion_percentage === 100;
            const isSelected = selectedDay === day;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : isComplete
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-medium">
                  {day === 0 ? '🚀' : `Day ${day}`}
                </div>
                {progress && (
                  <div className="text-xs text-gray-600 mt-1">
                    {progress.completed_tasks}/{progress.total_tasks}
                  </div>
                )}
                {isComplete && (
                  <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto mt-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{DAY_LABELS[selectedDay.toString()]}</span>
              {selectedDayProgress && (
                <Badge variant="outline">
                  {selectedDayProgress.completion_percentage.toFixed(0)}% Complete
                </Badge>
              )}
            </CardTitle>
            {selectedDayProgress && (
              <Progress value={selectedDayProgress.completion_percentage} className="mt-2" />
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDayTasks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No tasks for this day
              </p>
            ) : (
              selectedDayTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-lg border ${
                    task.is_completed
                      ? 'bg-green-50 border-green-200'
                      : task.is_critical
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={task.is_completed}
                      onCheckedChange={() => handleToggleTask(task)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-medium ${task.is_completed ? 'line-through text-gray-500' : ''}`}>
                          {task.task_name}
                        </p>
                        {task.is_critical && (
                          <Badge variant="destructive" className="text-xs">
                            Critical
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{task.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {task.time_estimate_minutes} min
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {task.category.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Launch Day Special View */}
        {selectedDay === 0 && (
          <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
            <CardHeader>
              <CardTitle>Launch Day Celebration!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {launchDate.first_destination && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium">First Destination</p>
                    <p className="text-sm text-gray-600">{launchDate.first_destination}</p>
                  </div>
                </div>
              )}

              {launchDate.emergency_contacts && (
                <div className="flex items-start gap-2">
                  <Phone className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Emergency Contacts</p>
                    <pre className="text-xs text-gray-600 mt-1">
                      {JSON.stringify(launchDate.emergency_contacts, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {launchDate.celebration_plans && (
                <div className="flex items-start gap-2">
                  <Heart className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Celebration Plans</p>
                    <p className="text-sm text-gray-600">{launchDate.celebration_plans}</p>
                  </div>
                </div>
              )}

              <div className="bg-orange-100 border border-orange-200 rounded-lg p-4 mt-4">
                <p className="text-orange-900 font-semibold text-center text-lg">
                  🎉 You did it! Safe travels and enjoy your new adventure! 🎉
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Post-Departure Check-ins */}
        {daysUntilLaunch !== null && daysUntilLaunch < 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Post-Departure Check-ins</CardTitle>
              <CardDescription>
                How's your journey going?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="checkin-type">Check-in Type</Label>
                  <Select
                    value={newCheckIn.checkin_type}
                    onValueChange={(value: any) => setNewCheckIn({ ...newCheckIn, checkin_type: value })}
                  >
                    <SelectTrigger id="checkin-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day_1">Day 1: First Day on the Road</SelectItem>
                      <SelectItem value="week_1">Week 1: First Week Complete</SelectItem>
                      <SelectItem value="month_1">Month 1: First Month Milestone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="mood">How are you feeling?</Label>
                  <Select
                    value={newCheckIn.mood}
                    onValueChange={(value) => setNewCheckIn({ ...newCheckIn, mood: value })}
                  >
                    <SelectTrigger id="mood">
                      <SelectValue placeholder="Select your mood" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOOD_OPTIONS.map((mood) => (
                        <SelectItem key={mood.value} value={mood.value}>
                          {mood.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="response">Overall Thoughts</Label>
                  <Textarea
                    id="response"
                    placeholder="How's it going? Any surprises?"
                    value={newCheckIn.response}
                    onChange={(e) => setNewCheckIn({ ...newCheckIn, response: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="wins">Wins & Highlights</Label>
                  <Textarea
                    id="wins"
                    placeholder="What went well?"
                    value={newCheckIn.wins || ''}
                    onChange={(e) => setNewCheckIn({ ...newCheckIn, wins: e.target.value })}
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="challenges">Challenges</Label>
                  <Textarea
                    id="challenges"
                    placeholder="What was difficult?"
                    value={newCheckIn.challenges || ''}
                    onChange={(e) => setNewCheckIn({ ...newCheckIn, challenges: e.target.value })}
                    rows={2}
                  />
                </div>

                <Button onClick={handleCheckIn} className="w-full">
                  Save Check-in
                </Button>
              </div>

              {checkIns.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-3">Previous Check-ins</h4>
                  <div className="space-y-3">
                    {checkIns.map((checkIn, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <Badge variant="outline" className="mb-2">
                          {checkIn.checkin_type === 'day_1' && 'Day 1'}
                          {checkIn.checkin_type === 'week_1' && 'Week 1'}
                          {checkIn.checkin_type === 'month_1' && 'Month 1'}
                        </Badge>
                        {checkIn.mood && (
                          <p className="text-sm text-gray-600 mb-1">
                            Mood: <span className="capitalize">{checkIn.mood}</span>
                          </p>
                        )}
                        <p className="text-sm">{checkIn.response}</p>
                        {checkIn.wins && (
                          <p className="text-xs text-green-700 mt-2">
                            <strong>Wins:</strong> {checkIn.wins}
                          </p>
                        )}
                        {checkIn.challenges && (
                          <p className="text-xs text-orange-700 mt-1">
                            <strong>Challenges:</strong> {checkIn.challenges}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
