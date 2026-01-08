import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Smile, Frown, Meh, Heart, Loader2, Trophy, Shield, MessageCircle, AlertCircle, Sparkles, Users } from 'lucide-react';

interface MoodCheckIn {
  id: string;
  date: string;
  mood: 'excited' | 'anxious' | 'overwhelmed' | 'confident' | 'uncertain' | 'hopeful';
  journal_entry?: string;
}

interface AnxietyLog {
  id: string;
  fear_category: string;
  coping_strategy_used?: string;
  notes?: string;
  created_at: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_earned: boolean;
}

interface PartnerExpectation {
  id: string;
  category: string;
  expectation: string;
  priority: 'low' | 'medium' | 'high';
  user_id: string;
  created_at: string;
}

interface BailoutPlan {
  id: string;
  plan_type: string;
  plan_details: string;
  trigger_conditions?: string;
  resources_needed?: string;
}

const MOOD_OPTIONS = [
  { value: 'excited', label: 'Excited', icon: Smile, color: 'text-green-600' },
  { value: 'confident', label: 'Confident', icon: Heart, color: 'text-blue-600' },
  { value: 'hopeful', label: 'Hopeful', icon: Sparkles, color: 'text-purple-600' },
  { value: 'uncertain', label: 'Uncertain', icon: Meh, color: 'text-gray-600' },
  { value: 'anxious', label: 'Anxious', icon: AlertCircle, color: 'text-yellow-600' },
  { value: 'overwhelmed', label: 'Overwhelmed', icon: Frown, color: 'text-red-600' },
];

const FEAR_CATEGORIES = [
  { value: 'financial', label: 'Financial Security', message: "It's normal to worry about money. Most full-timers find creative solutions." },
  { value: 'relationships', label: 'Relationships', message: 'Many couples grow stronger on the road. Communication is key.' },
  { value: 'safety', label: 'Safety Concerns', message: 'The RV community is incredibly supportive and looks out for each other.' },
  { value: 'loneliness', label: 'Feeling Lonely', message: "You'll be amazed by the welcoming community you'll find." },
  { value: 'uncertainty', label: 'Fear of Unknown', message: 'Uncertainty is part of the adventure. One step at a time.' },
  { value: 'failure', label: 'What if I Fail?', message: "There's no such thing as failure - only learning experiences." },
  { value: 'regret', label: 'Future Regrets', message: "Most regret not trying, not trying and learning it wasn't for them." },
];

const AFFIRMATIONS = [
  "I am brave enough to create the life I want.",
  "Every step forward is progress, no matter how small.",
  "I trust myself to handle whatever comes.",
  "My dreams are worth pursuing.",
  "I am capable of adapting to new situations.",
  "This journey is mine, and I get to define success.",
  "I release fear and embrace possibility.",
  "I am building a life that excites me.",
];

const EXPECTATION_CATEGORIES = [
  { value: 'budget', label: 'Budget & Spending' },
  { value: 'travel_pace', label: 'Travel Pace' },
  { value: 'work_life', label: 'Work/Life Balance' },
  { value: 'social', label: 'Social Activities' },
  { value: 'daily_routine', label: 'Daily Routine' },
  { value: 'responsibilities', label: 'Responsibilities' },
  { value: 'conflict_resolution', label: 'Handling Conflicts' },
];

const BAILOUT_TYPES = [
  { value: 'financial', label: 'Financial Backup Plan' },
  { value: 'housing', label: 'Housing Alternative' },
  { value: 'employment', label: 'Job Fallback' },
  { value: 'relationship', label: 'Relationship Plan B' },
  { value: 'health', label: 'Health Emergency Plan' },
  { value: 'complete_return', label: 'Complete Return Plan' },
];

/**
 * TransitionSupport Component
 *
 * Provides psychological support tools for RV transition:
 * - Daily mood check-ins
 * - Anxiety management
 * - Motivation center with badges
 * - Partner alignment tools
 * - Bail-out planning (reducing anxiety)
 */
export function TransitionSupport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('checkin');

  // Check-in state
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [journalEntry, setJournalEntry] = useState('');
  const [recentCheckIns, setRecentCheckIns] = useState<MoodCheckIn[]>([]);
  const [todayCheckIn, setTodayCheckIn] = useState<MoodCheckIn | null>(null);

  // Anxiety state
  const [anxietyLogs, setAnxietyLogs] = useState<AnxietyLog[]>([]);
  const [selectedFear, setSelectedFear] = useState('');
  const [copingStrategy, setCopingStrategy] = useState('');
  const [anxietyNotes, setAnxietyNotes] = useState('');

  // Motivation state
  const [badges, setBadges] = useState<Badge[]>([]);
  const [dailyAffirmation, setDailyAffirmation] = useState('');

  // Partner alignment state
  const [partnerExpectations, setPartnerExpectations] = useState<PartnerExpectation[]>([]);
  const [newExpectation, setNewExpectation] = useState({ category: '', expectation: '', priority: 'medium' as const });

  // Bailout planning state
  const [bailoutPlans, setBailoutPlans] = useState<BailoutPlan[]>([]);
  const [newBailoutPlan, setNewBailoutPlan] = useState({ plan_type: '', plan_details: '', trigger_conditions: '', resources_needed: '' });

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  useEffect(() => {
    // Set daily affirmation (rotates based on day of year)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    setDailyAffirmation(AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length]);
  }, []);

  const loadData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Load today's check-in
      const today = new Date().toISOString().split('T')[0];
      const { data: todayData } = await supabase
        .from('mood_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      setTodayCheckIn(todayData);

      // Load recent check-ins (last 7 days)
      const { data: checkInsData } = await supabase
        .from('mood_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(7);

      setRecentCheckIns(checkInsData || []);

      // Load anxiety logs
      const { data: anxietyData } = await supabase
        .from('anxiety_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setAnxietyLogs(anxietyData || []);

      // Load badges
      const { data: badgesData, error: badgesError } = await supabase
        .rpc('check_badge_eligibility', { p_user_id: user.id });

      if (badgesError) {
        console.error('Error checking badge eligibility:', badgesError);
        throw badgesError;
      }

      setBadges(badgesData || []);

      // Load partner expectations
      const { data: expectationsData } = await supabase
        .from('partner_expectations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setPartnerExpectations(expectationsData || []);

      // Load bailout plans
      const { data: bailoutData } = await supabase
        .from('bailout_plans')
        .select('*')
        .eq('user_id', user.id);

      setBailoutPlans(bailoutData || []);
    } catch (error) {
      console.error('Error loading support data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoodCheckIn = async () => {
    if (!user?.id || !selectedMood) {
      toast({
        title: 'Missing Information',
        description: 'Please select a mood',
        variant: 'destructive',
      });
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('mood_check_ins')
        .upsert({
          user_id: user.id,
          date: today,
          mood: selectedMood,
          journal_entry: journalEntry || null,
        }, {
          onConflict: 'user_id,date'
        });

      if (error) throw error;

      toast({
        title: 'Check-in Complete',
        description: 'Your mood has been recorded',
      });

      setSelectedMood('');
      setJournalEntry('');
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

  const handleLogAnxiety = async () => {
    if (!user?.id || !selectedFear) {
      toast({
        title: 'Missing Information',
        description: 'Please select a fear category',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('anxiety_logs')
        .insert({
          user_id: user.id,
          fear_category: selectedFear,
          coping_strategy_used: copingStrategy || null,
          notes: anxietyNotes || null,
        });

      if (error) throw error;

      toast({
        title: 'Anxiety Logged',
        description: 'Remember, these feelings are normal',
      });

      setSelectedFear('');
      setCopingStrategy('');
      setAnxietyNotes('');
      loadData();
    } catch (error) {
      console.error('Error logging anxiety:', error);
      toast({
        title: 'Error',
        description: 'Failed to log anxiety',
        variant: 'destructive',
      });
    }
  };

  const handleAddExpectation = async () => {
    if (!user?.id || !newExpectation.category || !newExpectation.expectation) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in category and expectation',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('partner_expectations')
        .insert({
          user_id: user.id,
          category: newExpectation.category,
          expectation: newExpectation.expectation,
          priority: newExpectation.priority,
        });

      if (error) throw error;

      toast({
        title: 'Expectation Added',
        description: 'Share this with your partner for discussion',
      });

      setNewExpectation({ category: '', expectation: '', priority: 'medium' });
      loadData();
    } catch (error) {
      console.error('Error adding expectation:', error);
      toast({
        title: 'Error',
        description: 'Failed to add expectation',
        variant: 'destructive',
      });
    }
  };

  const handleAddBailoutPlan = async () => {
    if (!user?.id || !newBailoutPlan.plan_type || !newBailoutPlan.plan_details) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in plan type and details',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('bailout_plans')
        .insert({
          user_id: user.id,
          plan_type: newBailoutPlan.plan_type,
          plan_details: newBailoutPlan.plan_details,
          trigger_conditions: newBailoutPlan.trigger_conditions || null,
          resources_needed: newBailoutPlan.resources_needed || null,
        });

      if (error) throw error;

      toast({
        title: 'Backup Plan Saved',
        description: 'Having a plan reduces anxiety',
      });

      setNewBailoutPlan({ plan_type: '', plan_details: '', trigger_conditions: '', resources_needed: '' });
      loadData();
    } catch (error) {
      console.error('Error adding bailout plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to save backup plan',
        variant: 'destructive',
      });
    }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-red-500" />
          Transition Support
        </CardTitle>
        <CardDescription>
          Emotional and psychological support for your journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="checkin">Check-in</TabsTrigger>
            <TabsTrigger value="anxiety">Anxiety</TabsTrigger>
            <TabsTrigger value="motivation">Motivation</TabsTrigger>
            <TabsTrigger value="partner">Partner</TabsTrigger>
            <TabsTrigger value="bailout">Backup Plan</TabsTrigger>
          </TabsList>

          {/* Daily Check-in Tab */}
          <TabsContent value="checkin" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">How are you feeling today?</h3>
                {todayCheckIn ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800">
                      ✓ You checked in today - Mood: <strong>{todayCheckIn.mood}</strong>
                    </p>
                    {todayCheckIn.journal_entry && (
                      <p className="text-sm text-gray-600 mt-2">{todayCheckIn.journal_entry}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      {MOOD_OPTIONS.map((mood) => {
                        const Icon = mood.icon;
                        return (
                          <button
                            key={mood.value}
                            onClick={() => setSelectedMood(mood.value)}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              selectedMood === mood.value
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Icon className={`h-8 w-8 mx-auto mb-2 ${mood.color}`} />
                            <p className="text-sm font-medium text-center">{mood.label}</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="journal">Optional: Add a journal entry</Label>
                      <Textarea
                        id="journal"
                        placeholder="What's on your mind today?"
                        value={journalEntry}
                        onChange={(e) => setJournalEntry(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <Button onClick={handleMoodCheckIn} className="w-full mt-4" disabled={!selectedMood}>
                      Save Check-in
                    </Button>
                  </>
                )}
              </div>

              {recentCheckIns.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Recent Mood Trends</h3>
                  <div className="space-y-2">
                    {recentCheckIns.map((checkIn) => (
                      <div key={checkIn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{new Date(checkIn.date).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-600 capitalize">{checkIn.mood}</p>
                        </div>
                        {checkIn.journal_entry && (
                          <Badge variant="outline">Has Journal</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Anxiety Management Tab */}
          <TabsContent value="anxiety" className="space-y-4">
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">
                  <strong>Remember:</strong> Anxiety is normal when making big life changes. You're not alone in these feelings.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Common Fears & Reassurance</h3>
                <div className="space-y-3">
                  {FEAR_CATEGORIES.map((fear) => (
                    <div
                      key={fear.value}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedFear === fear.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedFear(fear.value)}
                    >
                      <p className="font-medium text-lg">{fear.label}</p>
                      {selectedFear === fear.value && (
                        <p className="text-sm text-gray-600 mt-2 italic">{fear.message}</p>
                      )}
                    </div>
                  ))}
                </div>

                {selectedFear && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <Label htmlFor="coping">What helped you cope with this feeling?</Label>
                      <Textarea
                        id="coping"
                        placeholder="e.g., Talked to a friend, created a budget plan, watched YouTube videos from full-timers..."
                        value={copingStrategy}
                        onChange={(e) => setCopingStrategy(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Additional notes (optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any other thoughts?"
                        value={anxietyNotes}
                        onChange={(e) => setAnxietyNotes(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <Button onClick={handleLogAnxiety} className="w-full">
                      Log This Feeling
                    </Button>

                    <Button variant="outline" className="w-full" asChild>
                      <a href="/social">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Talk to Someone in Community
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Motivation Center Tab */}
          <TabsContent value="motivation" className="space-y-4">
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
                <Sparkles className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                <p className="text-center text-lg font-medium text-purple-900">
                  {dailyAffirmation}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  Your Milestone Badges
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {badges.map((badge) => (
                    <div
                      key={badge.id}
                      className={`p-4 rounded-lg border-2 text-center ${
                        badge.is_earned
                          ? 'border-yellow-400 bg-yellow-50'
                          : 'border-gray-200 bg-gray-50 opacity-50'
                      }`}
                    >
                      <div className="text-4xl mb-2">{badge.icon}</div>
                      <p className="font-medium">{badge.name}</p>
                      <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
                      {badge.is_earned && (
                        <Badge className="mt-2">Earned!</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Quick Motivation Boost:</h4>
                <ul className="space-y-1 text-sm text-green-800">
                  <li>• You've already completed {badges.filter(b => b.is_earned).length} out of {badges.length} milestones!</li>
                  <li>• Every day brings you closer to your dream.</li>
                  <li>• Thousands of people have done this successfully.</li>
                  <li>• Future you will thank present you for this courage.</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* Partner Alignment Tab */}
          <TabsContent value="partner" className="space-y-4">
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-purple-800">
                  <strong>Tip:</strong> Discussing expectations prevents future conflicts. Be honest and specific.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Add an Expectation</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="exp-category">Category</Label>
                    <Select
                      value={newExpectation.category}
                      onValueChange={(value) => setNewExpectation({ ...newExpectation, category: value })}
                    >
                      <SelectTrigger id="exp-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPECTATION_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="expectation">Your Expectation</Label>
                    <Textarea
                      id="expectation"
                      placeholder="e.g., I expect us to spend no more than $3000/month total"
                      value={newExpectation.expectation}
                      onChange={(e) => setNewExpectation({ ...newExpectation, expectation: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newExpectation.priority}
                      onValueChange={(value: 'low' | 'medium' | 'high') => setNewExpectation({ ...newExpectation, priority: value })}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleAddExpectation} className="w-full">
                    Add Expectation
                  </Button>
                </div>
              </div>

              {partnerExpectations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Your Expectations</h3>
                  <div className="space-y-2">
                    {partnerExpectations.map((exp) => (
                      <div key={exp.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-1">
                          <Badge variant="outline" className="capitalize">
                            {exp.category.replace('_', ' ')}
                          </Badge>
                          <Badge
                            variant={
                              exp.priority === 'high'
                                ? 'destructive'
                                : exp.priority === 'medium'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {exp.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm">{exp.expectation}</p>
                        <Button variant="link" size="sm" className="mt-2 p-0 h-auto">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Start Discussion
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Bail-Out Planning Tab */}
          <TabsContent value="bailout" className="space-y-4">
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <Shield className="h-6 w-6 text-green-600 mb-2" />
                <p className="text-green-800">
                  <strong>No shame in having a backup plan.</strong> Many people find that having a "what if" plan
                  actually reduces anxiety and makes them more confident to try.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Create a Backup Plan</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="plan-type">Plan Type</Label>
                    <Select
                      value={newBailoutPlan.plan_type}
                      onValueChange={(value) => setNewBailoutPlan({ ...newBailoutPlan, plan_type: value })}
                    >
                      <SelectTrigger id="plan-type">
                        <SelectValue placeholder="Select backup plan type" />
                      </SelectTrigger>
                      <SelectContent>
                        {BAILOUT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="plan-details">Plan Details</Label>
                    <Textarea
                      id="plan-details"
                      placeholder="e.g., I can move back in with my parents temporarily. They've said I'm always welcome."
                      value={newBailoutPlan.plan_details}
                      onChange={(e) => setNewBailoutPlan({ ...newBailoutPlan, plan_details: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="triggers">Trigger Conditions (optional)</Label>
                    <Textarea
                      id="triggers"
                      placeholder="e.g., If I run out of money or if the relationship becomes toxic"
                      value={newBailoutPlan.trigger_conditions}
                      onChange={(e) => setNewBailoutPlan({ ...newBailoutPlan, trigger_conditions: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="resources">Resources Needed (optional)</Label>
                    <Textarea
                      id="resources"
                      placeholder="e.g., $2000 emergency fund, valid driver's license, phone with service"
                      value={newBailoutPlan.resources_needed}
                      onChange={(e) => setNewBailoutPlan({ ...newBailoutPlan, resources_needed: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <Button onClick={handleAddBailoutPlan} className="w-full">
                    Save Backup Plan
                  </Button>
                </div>
              </div>

              {bailoutPlans.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Your Backup Plans</h3>
                  <div className="space-y-3">
                    {bailoutPlans.map((plan) => (
                      <div key={plan.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <Badge variant="outline" className="mb-2 capitalize">
                          {plan.plan_type.replace('_', ' ')}
                        </Badge>
                        <p className="text-sm mb-2">{plan.plan_details}</p>
                        {plan.trigger_conditions && (
                          <p className="text-xs text-gray-600">
                            <strong>Triggers:</strong> {plan.trigger_conditions}
                          </p>
                        )}
                        {plan.resources_needed && (
                          <p className="text-xs text-gray-600 mt-1">
                            <strong>Resources:</strong> {plan.resources_needed}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
