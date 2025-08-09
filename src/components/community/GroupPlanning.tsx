import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/common/AnimatedDialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { useCommunityFeatures, type GroupEvent } from '@/hooks/useCommunityFeatures';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Users, 
  Plus, 
  Clock, 
  DollarSign,
  FileText,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star
} from 'lucide-react';
import { format } from 'date-fns';

interface GroupPoll {
  id: string;
  title: string;
  description?: string;
  options: any;
  poll_type: string;
  is_anonymous: boolean;
  ends_at?: string;
  votes_count: number;
  user_vote?: any;
}

interface GroupResource {
  id: string;
  title: string;
  description?: string;
  resource_type: string;
  url?: string;
  tags?: string[];
  is_pinned: boolean;
  created_by: string;
  created_at: string;
}

export default function GroupPlanning() {
  const { user } = useAuth();
  const { createGroupEvent, joinEvent, updateEventAttendance, loading } = useCommunityFeatures();
  
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [polls, setPolls] = useState<GroupPoll[]>([]);
  const [resources, setResources] = useState<GroupResource[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [groups, setGroups] = useState<any[]>([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showCreateResource, setShowCreateResource] = useState(false);

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_type: 'meetup' as const,
    start_date: new Date(),
    end_date: new Date(),
    location: { name: '', address: '', coordinates: null },
    max_attendees: undefined,
    requirements: [],
    cost_per_person: undefined,
    visibility: 'group_only' as const
  });

  // Poll form state
  const [pollForm, setPollForm] = useState({
    title: '',
    description: '',
    poll_type: 'single_choice' as const,
    is_anonymous: false,
    options: ['', ''],
    ends_at: undefined
  });

  // Resource form state
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    resource_type: 'link' as const,
    url: '',
    tags: []
  });

  useEffect(() => {
    fetchUserGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupEvents();
      fetchGroupPolls();
      fetchGroupResources();
    }
  }, [selectedGroup]);

  const fetchUserGroups = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select(`
          group_id,
          social_groups (
            id,
            name,
            description,
            owner_id,
            admin_id
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      
      const formattedGroups = data?.map(membership => membership.social_groups).filter(Boolean) || [];
      setGroups(formattedGroups);
      
      if (formattedGroups.length > 0 && !selectedGroup) {
        setSelectedGroup(formattedGroups[0].id);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchGroupEvents = async () => {
    if (!selectedGroup) return;
    
    try {
      const { data, error } = await supabase
        .from('group_events')
        .select(`
          *,
          event_attendees (
            user_id,
            status
          )
        `)
        .eq('group_id', selectedGroup)
        .order('start_date', { ascending: true });

      if (error) throw error;
      
      const eventsWithAttendance = data?.map(event => ({
        ...event,
        attendee_count: event.event_attendees?.length || 0,
        user_attendance: event.event_attendees?.find(a => a.user_id === user?.id)?.status || ''
      })) || [];
      
      setEvents(eventsWithAttendance as GroupEvent[]);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchGroupPolls = async () => {
    if (!selectedGroup) return;
    
    try {
      const { data, error } = await supabase
        .from('group_polls')
        .select(`
          *,
          poll_votes (
            user_id,
            selected_options
          )
        `)
        .eq('group_id', selectedGroup)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const pollsWithVotes = data?.map(poll => ({
        ...poll,
        votes_count: poll.poll_votes?.length || 0,
        user_vote: poll.poll_votes?.find(v => v.user_id === user?.id)
      })) || [];
      
      setPolls(pollsWithVotes as GroupPoll[]);
    } catch (error) {
      console.error('Error fetching polls:', error);
    }
  };

  const fetchGroupResources = async () => {
    if (!selectedGroup) return;
    
    try {
      const { data, error } = await supabase
        .from('group_resources')
        .select('*')
        .eq('group_id', selectedGroup)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const handleCreateEvent = async () => {
    if (!selectedGroup) return;
    
    const eventData = {
      group_id: selectedGroup,
      title: eventForm.title,
      description: eventForm.description,
      event_type: eventForm.event_type,
      start_date: eventForm.start_date.toISOString(),
      end_date: eventForm.end_date.toISOString(),
      location: eventForm.location,
      max_attendees: eventForm.max_attendees,
      requirements: eventForm.requirements,
      cost_per_person: eventForm.cost_per_person,
      visibility: eventForm.visibility
    };

    const result = await createGroupEvent(eventData);
    if (result) {
      setShowCreateEvent(false);
      setEventForm({
        title: '',
        description: '',
        event_type: 'meetup',
        start_date: new Date(),
        end_date: new Date(),
        location: { name: '', address: '', coordinates: null },
        max_attendees: undefined,
        requirements: [],
        cost_per_person: undefined,
        visibility: 'group_only'
      });
      fetchGroupEvents();
    }
  };

  const handleCreatePoll = async () => {
    if (!selectedGroup) return;
    
    try {
      const { error } = await supabase
        .from('group_polls')
        .insert({
          group_id: selectedGroup,
          title: pollForm.title,
          description: pollForm.description,
          options: pollForm.options.filter(opt => opt.trim()),
          poll_type: pollForm.poll_type,
          is_anonymous: pollForm.is_anonymous,
          ends_at: pollForm.ends_at,
          created_by: user?.id
        });

      if (error) throw error;
      
      toast.success('Poll created successfully!');
      setShowCreatePoll(false);
      setPollForm({
        title: '',
        description: '',
        poll_type: 'single_choice',
        is_anonymous: false,
        options: ['', ''],
        ends_at: undefined
      });
      fetchGroupPolls();
    } catch (error) {
      console.error('Error creating poll:', error);
      toast.error('Failed to create poll');
    }
  };

  const handleVotePoll = async (pollId: string, selectedOptions: number[]) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('poll_votes')
        .insert({
          poll_id: pollId,
          user_id: user.id,
          selected_options: selectedOptions
        });

      if (error) throw error;
      
      toast.success('Vote submitted!');
      fetchGroupPolls();
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to submit vote');
    }
  };

  const handleCreateResource = async () => {
    if (!selectedGroup) return;
    
    try {
      const { error } = await supabase
        .from('group_resources')
        .insert({
          group_id: selectedGroup,
          title: resourceForm.title,
          description: resourceForm.description,
          resource_type: resourceForm.resource_type,
          url: resourceForm.url,
          tags: resourceForm.tags,
          created_by: user?.id
        });

      if (error) throw error;
      
      toast.success('Resource added successfully!');
      setShowCreateResource(false);
      setResourceForm({
        title: '',
        description: '',
        resource_type: 'link',
        url: '',
        tags: []
      });
      fetchGroupResources();
    } catch (error) {
      console.error('Error creating resource:', error);
      toast.error('Failed to add resource');
    }
  };

  const getEventStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'draft': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'completed': return <Star className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case 'going': return 'bg-green-500';
      case 'interested': return 'bg-blue-500';
      case 'maybe': return 'bg-yellow-500';
      case 'not_going': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Groups Found</h3>
        <p className="text-muted-foreground">Join a group to start planning events together!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Group Planning</h2>
          <p className="text-muted-foreground">Coordinate events, polls, and resources</p>
        </div>
        
        {/* Group Selector */}
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a group" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="polls">Polls</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Group Events</h3>
            <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                  <DialogDescription>
                    Plan a group event or meetup
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Event Title</Label>
                    <Input
                      id="title"
                      value={eventForm.title}
                      onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                      placeholder="Enter event title"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={eventForm.description}
                      onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                      placeholder="Describe your event"
                    />
                  </div>

                  <div>
                    <Label htmlFor="event_type">Event Type</Label>
                    <Select 
                      value={eventForm.event_type} 
                      onValueChange={(value: any) => setEventForm({...eventForm, event_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meetup">Meetup</SelectItem>
                        <SelectItem value="trip">Trip</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="social">Social</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="location_name">Location</Label>
                    <Input
                      id="location_name"
                      value={eventForm.location.name}
                      onChange={(e) => setEventForm({
                        ...eventForm, 
                        location: {...eventForm.location, name: e.target.value}
                      })}
                      placeholder="Event location"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Max Attendees</Label>
                      <Input
                        type="number"
                        value={eventForm.max_attendees || ''}
                        onChange={(e) => setEventForm({
                          ...eventForm, 
                          max_attendees: e.target.value ? Number(e.target.value) : undefined
                        })}
                        placeholder="Optional"
                      />
                    </div>
                    
                    <div>
                      <Label>Cost per Person</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={eventForm.cost_per_person || ''}
                        onChange={(e) => setEventForm({
                          ...eventForm, 
                          cost_per_person: e.target.value ? Number(e.target.value) : undefined
                        })}
                        placeholder="$0.00"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCreateEvent} disabled={loading || !eventForm.title}>
                      Create Event
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateEvent(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getEventStatusIcon(event.status)}
                        <h4 className="font-semibold">{event.title}</h4>
                        <Badge variant="outline">{event.event_type}</Badge>
                      </div>
                      
                      {event.description && (
                        <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(event.start_date), 'MMM d, yyyy')}
                        </div>
                        
                        {event.location?.name && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location.name}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {event.attendee_count} attending
                        </div>
                        
                        {event.cost_per_person && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${event.cost_per_person}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {!event.user_attendance && (
                        <Button 
                          size="sm" 
                          onClick={() => joinEvent(event.id)}
                          disabled={loading}
                        >
                          Join Event
                        </Button>
                      )}
                      
                      {event.user_attendance && (
                        <Badge className={getAttendanceColor(event.user_attendance)}>
                          {event.user_attendance}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Polls Tab */}
        <TabsContent value="polls" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Group Polls</h3>
            <Dialog open={showCreatePoll} onOpenChange={setShowCreatePoll}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Poll
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Poll</DialogTitle>
                  <DialogDescription>
                    Get group input on decisions
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="poll_title">Poll Title</Label>
                    <Input
                      id="poll_title"
                      value={pollForm.title}
                      onChange={(e) => setPollForm({...pollForm, title: e.target.value})}
                      placeholder="What should we decide?"
                    />
                  </div>

                  <div>
                    <Label>Poll Options</Label>
                    <div className="space-y-2">
                      {pollForm.options.map((option, index) => (
                        <Input
                          key={index}
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...pollForm.options];
                            newOptions[index] = e.target.value;
                            setPollForm({...pollForm, options: newOptions});
                          }}
                          placeholder={`Option ${index + 1}`}
                        />
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPollForm({
                          ...pollForm, 
                          options: [...pollForm.options, '']
                        })}
                      >
                        Add Option
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCreatePoll} disabled={loading || !pollForm.title}>
                      Create Poll
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreatePoll(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {polls.map((poll) => (
              <Card key={poll.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-semibold">{poll.title}</h4>
                    <Badge variant="outline">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      {poll.votes_count} votes
                    </Badge>
                  </div>
                  
                  {poll.description && (
                    <p className="text-sm text-muted-foreground mb-4">{poll.description}</p>
                  )}
                  
                  <div className="space-y-2">
                    {poll.options.map((option: string, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{option}</span>
                        {!poll.user_vote && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVotePoll(poll.id, [index])}
                          >
                            Vote
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Group Resources</h3>
            <Dialog open={showCreateResource} onOpenChange={setShowCreateResource}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Resource</DialogTitle>
                  <DialogDescription>
                    Share useful links, guides, or documents
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="resource_title">Title</Label>
                    <Input
                      id="resource_title"
                      value={resourceForm.title}
                      onChange={(e) => setResourceForm({...resourceForm, title: e.target.value})}
                      placeholder="Resource title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="resource_url">URL</Label>
                    <Input
                      id="resource_url"
                      value={resourceForm.url}
                      onChange={(e) => setResourceForm({...resourceForm, url: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="resource_description">Description</Label>
                    <Textarea
                      id="resource_description"
                      value={resourceForm.description}
                      onChange={(e) => setResourceForm({...resourceForm, description: e.target.value})}
                      placeholder="Describe this resource"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCreateResource} disabled={loading || !resourceForm.title}>
                      Add Resource
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateResource(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {resources.map((resource) => (
              <Card key={resource.id} className={resource.is_pinned ? 'border-primary' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4" />
                        <h4 className="font-semibold">{resource.title}</h4>
                        {resource.is_pinned && <Badge variant="secondary">Pinned</Badge>}
                      </div>
                      
                      {resource.description && (
                        <p className="text-sm text-muted-foreground mb-2">{resource.description}</p>
                      )}
                      
                      {resource.url && (
                        <a 
                          href={resource.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View Resource →
                        </a>
                      )}
                    </div>
                    
                    <Badge variant="outline">{resource.resource_type}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}