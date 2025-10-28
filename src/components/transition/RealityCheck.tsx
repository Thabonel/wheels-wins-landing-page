import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  ListChecks,
  Users,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface TransitionProfile {
  id: string;
  departure_date: string;
  current_phase: string;
}

interface TransitionTask {
  id: string;
  is_completed: boolean;
  priority: string;
  estimated_hours?: number;
  dependencies?: string[];
}

interface FeasibilityMetrics {
  tasksRemaining: number;
  weeksRemaining: number;
  tasksPerWeek: number;
  feasibilityScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  bottlenecks: string[];
  recommendations: string[];
  similarUsersSuccessRate: number;
}

export function RealityCheck() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TransitionProfile | null>(null);
  const [tasks, setTasks] = useState<TransitionTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch profile and tasks
  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('transition_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        setProfile(profileData);

        if (profileData) {
          // Fetch tasks
          const { data: tasksData, error: tasksError } = await supabase
            .from('transition_tasks')
            .select('*')
            .eq('profile_id', profileData.id);

          if (tasksError) throw tasksError;
          setTasks(tasksData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load reality check data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Calculate feasibility metrics
  const metrics = useMemo<FeasibilityMetrics>(() => {
    if (!profile || !tasks.length) {
      return {
        tasksRemaining: 0,
        weeksRemaining: 0,
        tasksPerWeek: 0,
        feasibilityScore: 0,
        riskLevel: 'low',
        bottlenecks: [],
        recommendations: [],
        similarUsersSuccessRate: 0,
      };
    }

    // Calculate tasks remaining
    const tasksRemaining = tasks.filter((t) => !t.is_completed).length;

    // Calculate weeks remaining until departure
    const today = new Date();
    const departureDate = new Date(profile.departure_date);
    const daysRemaining = Math.ceil((departureDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const weeksRemaining = Math.max(0, Math.ceil(daysRemaining / 7));

    // Calculate tasks per week required
    const tasksPerWeek = weeksRemaining > 0 ? tasksRemaining / weeksRemaining : tasksRemaining;

    // Calculate feasibility score (0-100)
    let score = 100;

    // Deduct points based on tasks per week
    if (tasksPerWeek > 10) {
      score -= 40; // Very high workload
    } else if (tasksPerWeek > 7) {
      score -= 30; // High workload
    } else if (tasksPerWeek > 5) {
      score -= 20; // Moderate workload
    } else if (tasksPerWeek > 3) {
      score -= 10; // Manageable workload
    }

    // Deduct points for time pressure (less than 4 weeks)
    if (weeksRemaining < 4) {
      score -= 20;
    } else if (weeksRemaining < 8) {
      score -= 10;
    }

    // Deduct points for high-priority incomplete tasks
    const highPriorityIncomplete = tasks.filter(
      (t) => !t.is_completed && t.priority === 'high'
    ).length;
    if (highPriorityIncomplete > 10) {
      score -= 15;
    } else if (highPriorityIncomplete > 5) {
      score -= 10;
    }

    // Bonus for being ahead of schedule
    if (tasksPerWeek < 2 && weeksRemaining > 12) {
      score += 10;
    }

    // Ensure score is between 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (score >= 70) {
      riskLevel = 'low';
    } else if (score >= 50) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    // Identify bottlenecks (tasks with many dependencies or high priority)
    const bottlenecks: string[] = [];
    const highPriorityTasks = tasks.filter((t) => !t.is_completed && t.priority === 'high');
    if (highPriorityTasks.length > 5) {
      bottlenecks.push(`${highPriorityTasks.length} high-priority tasks need immediate attention`);
    }

    if (tasksPerWeek > 7) {
      bottlenecks.push(`Workload of ${tasksPerWeek.toFixed(1)} tasks/week is very demanding`);
    }

    if (weeksRemaining < 4 && tasksRemaining > 10) {
      bottlenecks.push('Limited time with significant work remaining');
    }

    // Generate recommendations based on score
    const recommendations: string[] = [];

    if (score < 50) {
      recommendations.push('Consider extending your departure date by 4-8 weeks');
      recommendations.push('Focus only on critical "must-do" tasks');
      recommendations.push('Delegate or outsource where possible');
      recommendations.push('Reach out to transition mentors for help');
    } else if (score < 70) {
      recommendations.push('Prioritize high-impact tasks over nice-to-haves');
      recommendations.push('Review your timeline for flexibility');
      recommendations.push('Consider asking for help on time-consuming tasks');
      recommendations.push('Track progress weekly to stay on schedule');
    } else {
      recommendations.push('Great progress! Maintain your current momentum');
      recommendations.push('Start planning celebration milestones');
      recommendations.push('Help others in the community with your experience');
      recommendations.push('Focus on quality over speed in remaining tasks');
    }

    // Mock "similar users success rate" based on score
    // In production, this would query actual user data
    const similarUsersSuccessRate = score >= 70 ? 85 : score >= 50 ? 65 : 45;

    return {
      tasksRemaining,
      weeksRemaining,
      tasksPerWeek,
      feasibilityScore: score,
      riskLevel,
      bottlenecks,
      recommendations,
      similarUsersSuccessRate,
    };
  }, [profile, tasks]);

  // Helper function to get traffic light color
  const getTrafficLightColor = (score: number): string => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrafficLightIcon = (score: number) => {
    if (score >= 70) return <CheckCircle className="h-8 w-8 text-green-600" />;
    if (score >= 50) return <AlertTriangle className="h-8 w-8 text-yellow-600" />;
    return <AlertCircle className="h-8 w-8 text-red-600" />;
  };

  const getRiskBadge = (riskLevel: 'low' | 'medium' | 'high') => {
    const variants: Record<typeof riskLevel, { color: string; label: string }> = {
      low: { color: 'bg-green-100 text-green-800', label: 'Low Risk' },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium Risk' },
      high: { color: 'bg-red-100 text-red-800', label: 'High Risk' },
    };

    const { color, label } = variants[riskLevel];
    return <Badge className={color}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Reality Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Reality Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Create a transition profile to see your reality check
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          Reality Check
        </CardTitle>
        <CardDescription>
          Is your timeline realistic? Get data-driven insights on your transition feasibility
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Feasibility Score and Traffic Light */}
        <div className="flex items-center gap-6">
          <div className="flex-shrink-0">
            <div className={`w-20 h-20 rounded-full ${getTrafficLightColor(metrics.feasibilityScore)} flex items-center justify-center`}>
              <div className="bg-white rounded-full p-2">
                {getTrafficLightIcon(metrics.feasibilityScore)}
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">{metrics.feasibilityScore}%</h3>
                <p className="text-sm text-gray-600">Feasibility Score</p>
              </div>
              {getRiskBadge(metrics.riskLevel)}
            </div>
            <Progress value={metrics.feasibilityScore} className="h-2" />
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <ListChecks className="h-4 w-4" />
                  <span className="text-sm">Tasks Remaining</span>
                </div>
                <p className="text-3xl font-bold">{metrics.tasksRemaining}</p>
                <p className="text-sm text-gray-500">
                  {tasks.filter((t) => t.is_completed).length} completed
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Weeks Remaining</span>
                </div>
                <p className="text-3xl font-bold">{metrics.weeksRemaining}</p>
                <p className="text-sm text-gray-500">
                  Until {new Date(profile.departure_date).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Tasks Per Week</span>
                </div>
                <p className="text-3xl font-bold">{metrics.tasksPerWeek.toFixed(1)}</p>
                <div className="flex items-center gap-1 text-sm">
                  {metrics.tasksPerWeek > 5 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-red-500" />
                      <span className="text-red-500">High pace</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">Manageable</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison to Similar Users */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold">Similar Users Success Rate</h4>
              </div>
              <div className="flex items-center gap-4">
                <Progress value={metrics.similarUsersSuccessRate} className="h-2 flex-1" />
                <span className="text-2xl font-bold text-blue-600">
                  {metrics.similarUsersSuccessRate}%
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Users with similar timelines and workload successfully completed their transition
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bottlenecks */}
        {metrics.bottlenecks.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <h4 className="font-semibold">Identified Bottlenecks</h4>
                </div>
                <ul className="space-y-2">
                  {metrics.bottlenecks.map((bottleneck, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{bottleneck}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold">Recommendations</h4>
              </div>
              <ul className="space-y-2">
                {metrics.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <ArrowRight className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button
            onClick={() => {
              toast({
                title: 'Reality Check Saved',
                description: 'Your progress has been noted',
              });
            }}
            variant="outline"
          >
            Acknowledge Reality Check
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
