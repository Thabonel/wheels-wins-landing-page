import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Camera,
  Wrench,
  Calendar,
  MapPin,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ShakedownTrip {
  id: string;
  profile_id: string;
  name: string;
  duration_days: number;
  distance_miles?: number;
  trip_type: 'weekend' | 'week' | 'extended';
  start_date: string;
  end_date?: string;
  confidence_rating?: number;
  lessons_learned?: string;
  photos?: string[];
  created_at: string;
  updated_at: string;
}

interface ShakedownIssue {
  id: string;
  trip_id: string;
  profile_id: string;
  category: 'power' | 'water' | 'comfort' | 'storage' | 'driving';
  severity: 'minor' | 'major' | 'critical';
  description: string;
  solution_found?: string;
  is_resolved: boolean;
  parts_needed?: string;
  estimated_cost?: number;
  actual_cost?: number;
  resolved_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ShakedownStats {
  total_trips: number;
  total_days: number;
  total_distance: number;
  total_issues: number;
  resolved_issues: number;
  pending_issues: number;
  critical_issues: number;
  avg_confidence: number;
  latest_confidence: number;
  confidence_trend: 'improving' | 'declining' | 'stable';
}

const CATEGORY_CONFIG = {
  power: { label: 'Power & Electrical', icon: '⚡', color: 'text-yellow-600' },
  water: { label: 'Water & Plumbing', icon: '💧', color: 'text-blue-600' },
  comfort: { label: 'Comfort & HVAC', icon: '🌡️', color: 'text-purple-600' },
  storage: { label: 'Storage & Organization', icon: '📦', color: 'text-orange-600' },
  driving: { label: 'Driving & Handling', icon: '🚗', color: 'text-green-600' },
};

const SEVERITY_CONFIG = {
  minor: { label: 'Minor', color: 'bg-blue-100 text-blue-800', icon: Minus },
  major: { label: 'Major', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export function ShakedownLogger() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [trips, setTrips] = useState<ShakedownTrip[]>([]);
  const [issues, setIssues] = useState<ShakedownIssue[]>([]);
  const [stats, setStats] = useState<ShakedownStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddTripOpen, setIsAddTripOpen] = useState(false);
  const [isAddIssueOpen, setIsAddIssueOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Form states
  const [tripName, setTripName] = useState('');
  const [tripDuration, setTripDuration] = useState('');
  const [tripDistance, setTripDistance] = useState('');
  const [tripType, setTripType] = useState<'weekend' | 'week' | 'extended'>('weekend');
  const [tripStartDate, setTripStartDate] = useState('');
  const [tripConfidence, setTripConfidence] = useState('5');
  const [tripLessons, setTripLessons] = useState('');

  const [issueCategory, setIssueCategory] = useState<'power' | 'water' | 'comfort' | 'storage' | 'driving'>('power');
  const [issueSeverity, setIssueSeverity] = useState<'minor' | 'major' | 'critical'>('minor');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSolution, setIssueSolution] = useState('');
  const [issuePartsNeeded, setIssuePartsNeeded] = useState('');
  const [issueCost, setIssueCost] = useState('');

  // Fetch profile ID
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('transition_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfileId(data.id);
    };

    fetchProfile();
  }, [user?.id]);

  // Fetch trips
  const fetchTrips = async () => {
    if (!profileId) return;

    const { data, error } = await supabase
      .from('shakedown_trips')
      .select('*')
      .eq('profile_id', profileId)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching trips:', error);
      return;
    }

    setTrips(data || []);
  };

  // Fetch issues
  const fetchIssues = async () => {
    if (!profileId) return;

    const { data, error } = await supabase
      .from('shakedown_issues')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching issues:', error);
      return;
    }

    setIssues(data || []);
  };

  // Fetch stats
  const fetchStats = async () => {
    if (!profileId) return;

    const { data, error } = await supabase.rpc('get_shakedown_stats', {
      p_profile_id: profileId,
    });

    if (error) {
      console.error('Error fetching stats:', error);
      return;
    }

    if (data && data.length > 0) {
      setStats(data[0]);
    }
  };

  // Initial load
  useEffect(() => {
    if (profileId) {
      Promise.all([fetchTrips(), fetchIssues(), fetchStats()]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [profileId]);

  // Add trip
  const handleAddTrip = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profileId || !tripName || !tripDuration || !tripStartDate) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('shakedown_trips').insert({
        profile_id: profileId,
        name: tripName,
        duration_days: parseInt(tripDuration),
        distance_miles: tripDistance ? parseFloat(tripDistance) : null,
        trip_type: tripType,
        start_date: tripStartDate,
        confidence_rating: parseInt(tripConfidence),
        lessons_learned: tripLessons || null,
      });

      if (error) throw error;

      toast({
        title: 'Trip Added',
        description: `${tripName} has been logged`,
      });

      // Reset form
      setTripName('');
      setTripDuration('');
      setTripDistance('');
      setTripType('weekend');
      setTripStartDate('');
      setTripConfidence('5');
      setTripLessons('');
      setIsAddTripOpen(false);

      fetchTrips();
      fetchStats();
    } catch (error) {
      console.error('Error adding trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to add trip',
        variant: 'destructive',
      });
    }
  };

  // Add issue
  const handleAddIssue = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profileId || !selectedTripId || !issueDescription) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('shakedown_issues').insert({
        trip_id: selectedTripId,
        profile_id: profileId,
        category: issueCategory,
        severity: issueSeverity,
        description: issueDescription,
        solution_found: issueSolution || null,
        is_resolved: !!issueSolution,
        parts_needed: issuePartsNeeded || null,
        estimated_cost: issueCost ? parseFloat(issueCost) : null,
        resolved_date: issueSolution ? new Date().toISOString().split('T')[0] : null,
      });

      if (error) throw error;

      toast({
        title: 'Issue Logged',
        description: 'Issue has been added to the trip',
      });

      // Reset form
      setIssueCategory('power');
      setIssueSeverity('minor');
      setIssueDescription('');
      setIssueSolution('');
      setIssuePartsNeeded('');
      setIssueCost('');
      setIsAddIssueOpen(false);
      setSelectedTripId(null);

      fetchIssues();
      fetchStats();
    } catch (error) {
      console.error('Error adding issue:', error);
      toast({
        title: 'Error',
        description: 'Failed to add issue',
        variant: 'destructive',
      });
    }
  };

  // Toggle issue resolved
  const toggleIssueResolved = async (issueId: string, isResolved: boolean) => {
    try {
      const { error } = await supabase
        .from('shakedown_issues')
        .update({
          is_resolved: isResolved,
          resolved_date: isResolved ? new Date().toISOString().split('T')[0] : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', issueId);

      if (error) throw error;

      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                is_resolved: isResolved,
                resolved_date: isResolved ? new Date().toISOString().split('T')[0] : undefined,
              }
            : issue
        )
      );

      fetchStats();

      toast({
        title: 'Updated',
        description: isResolved ? 'Issue marked as resolved' : 'Issue marked as unresolved',
      });
    } catch (error) {
      console.error('Error updating issue:', error);
      toast({
        title: 'Error',
        description: 'Failed to update issue',
        variant: 'destructive',
      });
    }
  };

  // Confidence trend data
  const confidenceTrendData = useMemo(() => {
    return trips
      .filter((trip) => trip.confidence_rating)
      .slice(0, 10)
      .reverse()
      .map((trip, index) => ({
        trip: index + 1,
        confidence: trip.confidence_rating,
        name: trip.name.substring(0, 15),
      }));
  }, [trips]);

  // Unresolved issues (Fix-it List)
  const unresolvedIssues = useMemo(() => {
    return issues.filter((issue) => !issue.is_resolved);
  }, [issues]);

  // Get issues for trip
  const getIssuesForTrip = (tripId: string) => {
    return issues.filter((issue) => issue.trip_id === tripId);
  };

  // Readiness indicator
  const readinessScore = useMemo(() => {
    if (!stats) return 0;

    let score = 0;

    // Base score from confidence
    if (stats.latest_confidence >= 8) score += 40;
    else if (stats.latest_confidence >= 6) score += 25;
    else if (stats.latest_confidence >= 4) score += 10;

    // Bonus for trips completed
    if (stats.total_trips >= 3) score += 30;
    else if (stats.total_trips >= 2) score += 20;
    else if (stats.total_trips >= 1) score += 10;

    // Penalty for unresolved critical issues
    score -= stats.critical_issues * 15;

    // Bonus for good resolution rate
    if (stats.total_issues > 0) {
      const resolutionRate = stats.resolved_issues / stats.total_issues;
      if (resolutionRate >= 0.8) score += 30;
      else if (resolutionRate >= 0.6) score += 20;
      else if (resolutionRate >= 0.4) score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }, [stats]);

  const getReadinessLevel = (score: number) => {
    if (score >= 80) return { label: 'Ready to Go!', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (score >= 60) return { label: 'Almost Ready', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    if (score >= 40) return { label: 'Keep Testing', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return { label: 'More Practice Needed', color: 'text-red-600', bgColor: 'bg-red-50' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const readinessLevel = getReadinessLevel(readinessScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Shakedown Trip Logger</CardTitle>
        <p className="text-sm text-gray-600">
          Test your RV setup with progressively longer trips
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Dashboard */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Practice Trips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_trips}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.total_days} total days
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Issues Resolved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.resolved_issues}/{stats.total_issues}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.pending_issues} pending
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Confidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.latest_confidence}/10</div>
                <div className="flex items-center text-xs mt-1">
                  {stats.confidence_trend === 'improving' && (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                      <span className="text-green-600">Improving</span>
                    </>
                  )}
                  {stats.confidence_trend === 'declining' && (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                      <span className="text-red-600">Declining</span>
                    </>
                  )}
                  {stats.confidence_trend === 'stable' && (
                    <span className="text-gray-500">Stable</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={readinessLevel.bgColor}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Ready-to-Go
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${readinessLevel.color}`}>
                  {readinessScore}%
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {readinessLevel.label}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Confidence Trend Graph */}
        {confidenceTrendData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Confidence Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={confidenceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="trip" label={{ value: 'Trip', position: 'insideBottom', offset: -5 }} />
                  <YAxis domain={[0, 10]} label={{ value: 'Confidence', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-2 border rounded shadow">
                            <p className="text-sm font-semibold">{payload[0].payload.name}</p>
                            <p className="text-sm">Confidence: {payload[0].value}/10</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="confidence" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Fix-it List (Unresolved Issues) */}
        {unresolvedIssues.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Wrench className="h-5 w-5 mr-2" />
                Fix-it List ({unresolvedIssues.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {unresolvedIssues.map((issue) => {
                  const SeverityIcon = SEVERITY_CONFIG[issue.severity].icon;
                  const categoryConfig = CATEGORY_CONFIG[issue.category];

                  return (
                    <div
                      key={issue.id}
                      className="flex items-start justify-between p-3 border rounded hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={categoryConfig.color}>
                            {categoryConfig.icon}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_CONFIG[issue.severity].color}`}
                          >
                            <SeverityIcon className="h-3 w-3 inline mr-1" />
                            {SEVERITY_CONFIG[issue.severity].label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {categoryConfig.label}
                          </span>
                        </div>
                        <p className="text-sm">{issue.description}</p>
                        {issue.parts_needed && (
                          <p className="text-xs text-gray-600 mt-1">
                            Parts needed: {issue.parts_needed}
                          </p>
                        )}
                        {issue.estimated_cost && (
                          <p className="text-xs text-gray-600">
                            Est. cost: ${issue.estimated_cost.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleIssueResolved(issue.id, true)}
                        className="ml-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Trip Button */}
        <div className="flex justify-end">
          <Dialog open={isAddTripOpen} onOpenChange={setIsAddTripOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Log New Trip
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Log Shakedown Trip</DialogTitle>
                <DialogDescription>
                  Record a practice trip to test your RV setup
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddTrip} className="space-y-4">
                <div>
                  <Label htmlFor="trip-name">Trip Name *</Label>
                  <Input
                    id="trip-name"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    placeholder="e.g., Weekend Test - Local Campground"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="trip-duration">Duration (days) *</Label>
                    <Input
                      id="trip-duration"
                      type="number"
                      min="1"
                      value={tripDuration}
                      onChange={(e) => setTripDuration(e.target.value)}
                      placeholder="2"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="trip-distance">Distance (miles)</Label>
                    <Input
                      id="trip-distance"
                      type="number"
                      min="0"
                      step="0.1"
                      value={tripDistance}
                      onChange={(e) => setTripDistance(e.target.value)}
                      placeholder="50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="trip-type">Trip Type *</Label>
                    <Select value={tripType} onValueChange={(value: any) => setTripType(value)}>
                      <SelectTrigger id="trip-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekend">Weekend (2-3 days)</SelectItem>
                        <SelectItem value="week">Week (4-7 days)</SelectItem>
                        <SelectItem value="extended">Extended (8+ days)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="trip-start-date">Start Date *</Label>
                    <Input
                      id="trip-start-date"
                      type="date"
                      value={tripStartDate}
                      onChange={(e) => setTripStartDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="trip-confidence">Confidence Rating (1-10) *</Label>
                  <Input
                    id="trip-confidence"
                    type="number"
                    min="1"
                    max="10"
                    value={tripConfidence}
                    onChange={(e) => setTripConfidence(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How confident are you in your setup after this trip?
                  </p>
                </div>

                <div>
                  <Label htmlFor="trip-lessons">Lessons Learned</Label>
                  <Textarea
                    id="trip-lessons"
                    value={tripLessons}
                    onChange={(e) => setTripLessons(e.target.value)}
                    placeholder="What did you learn? What would you do differently?"
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddTripOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Log Trip</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Trip List */}
        <div className="space-y-4">
          {trips.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No trips logged yet</h3>
              <p className="text-gray-600 mb-4">
                Start with a weekend trip to test your RV setup
              </p>
              <Button onClick={() => setIsAddTripOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Log Your First Trip
              </Button>
            </div>
          ) : (
            trips.map((trip) => {
              const tripIssues = getIssuesForTrip(trip.id);

              return (
                <Card key={trip.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{trip.name}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(trip.start_date).toLocaleDateString()}
                          </span>
                          <span>{trip.duration_days} days</span>
                          {trip.distance_miles && (
                            <span className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {trip.distance_miles} mi
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs">
                            {trip.trip_type}
                          </span>
                        </div>
                      </div>
                      {trip.confidence_rating && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {trip.confidence_rating}/10
                          </div>
                          <div className="text-xs text-gray-500">Confidence</div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {trip.lessons_learned && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Lessons Learned:</h4>
                        <p className="text-sm text-gray-700">{trip.lessons_learned}</p>
                      </div>
                    )}

                    {/* Trip Issues */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold">
                          Issues ({tripIssues.length})
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTripId(trip.id);
                            setIsAddIssueOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Issue
                        </Button>
                      </div>
                      {tripIssues.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">
                          No issues logged for this trip
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {tripIssues.map((issue) => {
                            const SeverityIcon = SEVERITY_CONFIG[issue.severity].icon;
                            const categoryConfig = CATEGORY_CONFIG[issue.category];

                            return (
                              <div
                                key={issue.id}
                                className={`p-3 border rounded ${
                                  issue.is_resolved ? 'bg-green-50' : 'bg-white'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={categoryConfig.color}>
                                        {categoryConfig.icon}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_CONFIG[issue.severity].color}`}
                                      >
                                        <SeverityIcon className="h-3 w-3 inline mr-1" />
                                        {SEVERITY_CONFIG[issue.severity].label}
                                      </span>
                                      {issue.is_resolved && (
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      )}
                                    </div>
                                    <p className="text-sm font-medium">{issue.description}</p>
                                    {issue.solution_found && (
                                      <p className="text-sm text-gray-600 mt-1">
                                        Solution: {issue.solution_found}
                                      </p>
                                    )}
                                  </div>
                                  {!issue.is_resolved && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => toggleIssueResolved(issue.id, true)}
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Add Issue Dialog */}
        <Dialog open={isAddIssueOpen} onOpenChange={setIsAddIssueOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Log Issue</DialogTitle>
              <DialogDescription>
                Record a problem found during this trip
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddIssue} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issue-category">Category *</Label>
                  <Select
                    value={issueCategory}
                    onValueChange={(value: any) => setIssueCategory(value)}
                  >
                    <SelectTrigger id="issue-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.icon} {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="issue-severity">Severity *</Label>
                  <Select
                    value={issueSeverity}
                    onValueChange={(value: any) => setIssueSeverity(value)}
                  >
                    <SelectTrigger id="issue-severity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="issue-description">Description *</Label>
                <Textarea
                  id="issue-description"
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Describe the problem..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="issue-solution">Solution Found</Label>
                <Textarea
                  id="issue-solution"
                  value={issueSolution}
                  onChange={(e) => setIssueSolution(e.target.value)}
                  placeholder="How did you fix it? (leave empty if not resolved yet)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issue-parts">Parts Needed</Label>
                  <Input
                    id="issue-parts"
                    value={issuePartsNeeded}
                    onChange={(e) => setIssuePartsNeeded(e.target.value)}
                    placeholder="e.g., Fuse, Water pump"
                  />
                </div>
                <div>
                  <Label htmlFor="issue-cost">Estimated Cost</Label>
                  <Input
                    id="issue-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={issueCost}
                    onChange={(e) => setIssueCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddIssueOpen(false);
                    setSelectedTripId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Log Issue</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
