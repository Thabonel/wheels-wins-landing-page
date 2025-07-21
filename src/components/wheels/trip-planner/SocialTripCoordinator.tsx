import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/common/AnimatedDialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Users, 
  Plus, 
  Calendar as CalendarIcon, 
  MapPin, 
  DollarSign,
  Route,
  Share,
  Download,
  UserPlus,
  Settings,
  X
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  profile: {
    display_name: string;
    avatar_url: string;
    rv_info: any;
  };
}

interface GroupTrip {
  id: string;
  trip_name: string;
  description: string;
  start_date: string;
  end_date: string;
  meeting_point: any;
  route_data: any;
  budget_coordination: any;
  status: string;
  participants: Array<{
    user_id: string;
    role: string;
    status: string;
    profile: any;
  }>;
}

interface SocialTripCoordinatorProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoute?: any;
  currentBudget?: any;
}

export default function SocialTripCoordinator({ 
  isOpen, 
  onClose, 
  currentRoute,
  currentBudget 
}: SocialTripCoordinatorProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'select' | 'create' | 'manage'>('select');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [groupTrips, setGroupTrips] = useState<GroupTrip[]>([]);
  const [newTrip, setNewTrip] = useState({
    trip_name: '',
    description: '',
    start_date: '',
    end_date: '',
    meeting_point: null as any,
    budget_coordination: {
      shared_expenses: false,
      expense_splitting: 'equal',
      group_budget_limit: 0
    }
  });
  const [loading, setLoading] = useState(false);

  // Fetch friends and existing group trips
  useEffect(() => {
    if (!user || !isOpen) return;

    const fetchData = async () => {
      try {
        // Fetch friends
        const { data: friendsData } = await supabase
          .from('user_friends')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'accepted');

        if (friendsData) {
          const friendIds = friendsData.map(f => f.friend_id);
          const { data: profiles } = await supabase
            .from('user_social_profiles')
            .select('*')
            .in('user_id', friendIds);

          const friendsWithProfiles = friendsData.map(f => {
            const profile = profiles?.find(p => p.user_id === f.friend_id);
            return {
              ...f,
              profile: profile ? {
                display_name: profile.display_name || 'Unknown',
                avatar_url: profile.avatar_url || '',
                rv_info: profile.rv_info
              } : {
                display_name: 'Unknown',
                avatar_url: '',
                rv_info: null
              }
            };
          });

          setFriends(friendsWithProfiles);
        }

        // Fetch group trips
        const { data: tripsData } = await supabase
          .from('group_trips')
          .select('*')
          .or(`created_by.eq.${user.id}`)
          .eq('status', 'planning');

        if (tripsData) {
          const tripsWithParticipants = await Promise.all(
            tripsData.map(async (trip) => {
              const { data: participants } = await supabase
                .from('group_trip_participants')
                .select(`
                  user_id,
                  role,
                  status
                `)
                .eq('trip_id', trip.id);

              const participantIds = participants?.map(p => p.user_id) || [];
              const { data: profiles } = await supabase
                .from('user_social_profiles')
                .select('*')
                .in('user_id', participantIds);

              const participantsWithProfiles = participants?.map(p => ({
                ...p,
                profile: profiles?.find(prof => prof.user_id === p.user_id)
              })) || [];

              return {
                ...trip,
                participants: participantsWithProfiles
              };
            })
          );

          setGroupTrips(tripsWithParticipants);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [user, isOpen]);

  const handleCreateGroupTrip = async () => {
    if (!user || !newTrip.trip_name) return;

    setLoading(true);
    try {
      // Create the group trip
      const { data: trip, error: tripError } = await supabase
        .from('group_trips')
        .insert({
          created_by: user.id,
          trip_name: newTrip.trip_name,
          description: newTrip.description,
          start_date: newTrip.start_date,
          end_date: newTrip.end_date,
          meeting_point: newTrip.meeting_point,
          route_data: currentRoute || {},
          budget_coordination: newTrip.budget_coordination
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Add trip creator as organizer
      await supabase
        .from('group_trip_participants')
        .insert({
          trip_id: trip.id,
          user_id: user.id,
          role: 'organizer',
          status: 'accepted'
        });

      // Add selected friends as participants
      if (selectedFriends.length > 0) {
        const participants = selectedFriends.map(friendId => ({
          trip_id: trip.id,
          user_id: friendId,
          role: 'participant',
          status: 'invited'
        }));

        await supabase
          .from('group_trip_participants')
          .insert(participants);
      }

      // Refresh data and close
      setStep('select');
      setNewTrip({
        trip_name: '',
        description: '',
        start_date: '',
        end_date: '',
        meeting_point: null,
        budget_coordination: {
          shared_expenses: false,
          expense_splitting: 'equal',
          group_budget_limit: 0
        }
      });
      setSelectedFriends([]);
      
    } catch (error) {
      console.error('Error creating group trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const exportGroupItinerary = (trip: GroupTrip) => {
    // Generate and download group itinerary
    const itinerary = {
      trip_name: trip.trip_name,
      participants: trip.participants.length,
      dates: `${trip.start_date} to ${trip.end_date}`,
      meeting_point: trip.meeting_point,
      route: trip.route_data,
      budget: trip.budget_coordination
    };

    const blob = new Blob([JSON.stringify(itinerary, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.trip_name}-itinerary.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Social Trip Coordinator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Navigation */}
          <div className="flex items-center gap-2 border-b pb-4">
            <Button
              variant={step === 'select' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStep('select')}
            >
              My Trips
            </Button>
            <Button
              variant={step === 'create' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStep('create')}
            >
              <Plus className="w-4 h-4 mr-1" />
              New Group Trip
            </Button>
          </div>

          {/* Select/Manage Existing Trips */}
          {step === 'select' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Your Group Trips</h3>
                <Button onClick={() => setStep('create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Plan New Group Trip
                </Button>
              </div>

              {groupTrips.length === 0 ? (
                <Card className="p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No Group Trips Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Coordinate with friends to plan amazing RV adventures together!
                  </p>
                  <Button onClick={() => setStep('create')}>
                    Plan Your First Group Trip
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {groupTrips.map((trip) => (
                    <Card key={trip.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{trip.trip_name}</h4>
                            <Badge variant="secondary">{trip.status}</Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3">
                            {trip.description}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {format(new Date(trip.start_date), 'MMM d')} - {format(new Date(trip.end_date), 'MMM d')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {trip.participants.length} participants
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-muted-foreground">Participants:</span>
                            <div className="flex -space-x-2">
                              {trip.participants.slice(0, 5).map((participant, idx) => (
                                <Avatar key={idx} className="w-6 h-6 border-2 border-white">
                                  <AvatarImage src={participant.profile?.avatar_url} />
                                  <AvatarFallback className="text-xs">
                                    {participant.profile?.display_name?.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {trip.participants.length > 5 && (
                                <div className="w-6 h-6 rounded-full bg-muted border-2 border-white flex items-center justify-center text-xs">
                                  +{trip.participants.length - 5}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => exportGroupItinerary(trip)}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Share className="w-4 h-4" />
                          </Button>
                          <Button size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create New Group Trip */}
          {step === 'create' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Plan New Group Trip</h3>
                <Button variant="outline" onClick={() => setStep('select')}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Trip Details */}
                <Card className="p-4">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-base">Trip Details</CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 space-y-4">
                    <div>
                      <Label htmlFor="trip-name">Trip Name</Label>
                      <Input
                        id="trip-name"
                        value={newTrip.trip_name}
                        onChange={(e) => setNewTrip(prev => ({ ...prev, trip_name: e.target.value }))}
                        placeholder="Epic RV Adventure 2024"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newTrip.description}
                        onChange={(e) => setNewTrip(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe your group adventure..."
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={newTrip.start_date}
                          onChange={(e) => setNewTrip(prev => ({ ...prev, start_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={newTrip.end_date}
                          onChange={(e) => setNewTrip(prev => ({ ...prev, end_date: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Budget Coordination</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="shared-expenses"
                            checked={newTrip.budget_coordination.shared_expenses}
                            onCheckedChange={(checked) => 
                              setNewTrip(prev => ({
                                ...prev,
                                budget_coordination: {
                                  ...prev.budget_coordination,
                                  shared_expenses: checked as boolean
                                }
                              }))
                            }
                          />
                          <Label htmlFor="shared-expenses" className="text-sm">
                            Enable shared expense tracking
                          </Label>
                        </div>
                        
                        {newTrip.budget_coordination.shared_expenses && (
                          <div>
                            <Label className="text-xs">Group Budget Limit</Label>
                            <Input
                              type="number"
                              placeholder="5000"
                              value={newTrip.budget_coordination.group_budget_limit}
                              onChange={(e) => 
                                setNewTrip(prev => ({
                                  ...prev,
                                  budget_coordination: {
                                    ...prev.budget_coordination,
                                    group_budget_limit: Number(e.target.value)
                                  }
                                }))
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Friend Selection */}
                <Card className="p-4">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-base">Invite Friends</CardTitle>
                  </CardHeader>
                  <CardContent className="px-0">
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {friends.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No friends found. Add friends to invite them to group trips!
                        </p>
                      ) : (
                        friends.map((friend) => (
                          <div
                            key={friend.id}
                            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleFriendToggle(friend.friend_id)}
                          >
                            <Checkbox
                              checked={selectedFriends.includes(friend.friend_id)}
                              onChange={() => handleFriendToggle(friend.friend_id)}
                            />
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={friend.profile?.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {friend.profile?.display_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {friend.profile?.display_name || 'Unknown'}
                              </p>
                              {friend.profile?.rv_info && (
                                <p className="text-xs text-muted-foreground">
                                  {friend.profile.rv_info.type} - {friend.profile.rv_info.make}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {selectedFriends.length > 0 && (
                      <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                        <p className="text-sm font-medium mb-2">
                          Selected: {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          They will receive invitations to join your group trip.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep('select')}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateGroupTrip}
                  disabled={!newTrip.trip_name || loading}
                >
                  {loading ? 'Creating...' : 'Create Group Trip'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}