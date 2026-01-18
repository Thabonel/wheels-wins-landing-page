import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  UserPlus,
  MessageSquare,
  Search,
  Heart,
  Award,
  TrendingUp,
  Tag,
  Send,
  Mail,
  Eye,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface UserTag {
  id: string;
  tag_category: string;
  tag_value: string;
}

interface SimilarUser {
  user_id: string;
  email: string;
  full_name: string;
  matching_tags: number;
  tags: Array<{ category: string; value: string }>;
}

interface ConnectionStats {
  total_connections: number;
  pending_requests: number;
  mentors: number;
  mentees: number;
  buddies: number;
  unread_messages: number;
}

interface SuccessStory {
  id: string;
  user_id: string;
  title: string;
  story: string;
  transition_duration_months?: number;
  departure_date?: string;
  likes_count: number;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface CommunityGroup {
  id: string;
  name: string;
  description?: string;
  topic: string;
  member_count: number;
  is_public: boolean;
  created_at: string;
}

const TAG_CATEGORIES = {
  vehicle_type: {
    label: 'Vehicle Type',
    options: ['Unimog', 'Sprinter Van', 'Class A Motorhome', 'Class B Van', 'Class C RV', 'Fifth Wheel', 'Travel Trailer', 'Truck Camper'],
  },
  departure_timeframe: {
    label: 'Departure Timeframe',
    options: ['Within 3 months', '3-6 months', '6-12 months', '1-2 years', '2+ years'],
  },
  previous_career: {
    label: 'Previous Career',
    options: ['Tech/IT', 'Healthcare', 'Education', 'Finance', 'Sales/Marketing', 'Trades', 'Creative/Arts', 'Military', 'Retired'],
  },
  destination_preference: {
    label: 'Destination Preference',
    options: ['National Parks', 'Beaches', 'Mountains', 'Deserts', 'Cities', 'Remote/Boondocking', 'International', 'No Preference'],
  },
  lifestyle: {
    label: 'Lifestyle',
    options: ['Solo Traveler', 'Couple', 'Family with Kids', 'Family with Pets', 'Full-time', 'Part-time', 'Work Remotely'],
  },
};

export function CommunityHub() {
  const { user } = useAuth();
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [similarUsers, setSimilarUsers] = useState<SimilarUser[]>([]);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null);
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([]);
  const [communityGroups, setCommunityGroups] = useState<CommunityGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('discover');

  // Tag management
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedValue, setSelectedValue] = useState('');
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);

  // Messaging
  const [selectedUserId, setSelectedUserId] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isMessageOpen, setIsMessageOpen] = useState(false);

  // Fetch user data
  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch user tags
        const { data: tagsData, error: tagsError } = await supabase
          .from('user_tags')
          .select('*')
          .eq('user_id', user.id);

        if (tagsError) throw tagsError;
        setUserTags(tagsData || []);

        // Fetch connection stats
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_user_connection_stats', { p_user_id: user.id })
          .single();

        if (statsError) throw statsError;
        setConnectionStats(statsData);

        // Fetch similar users (only if user has tags)
        if (tagsData && tagsData.length > 0) {
          const { data: similarData, error: similarError } = await supabase
            .rpc('find_similar_users', { p_user_id: user.id, p_limit: 20 });

          if (similarError) throw similarError;
          setSimilarUsers(similarData || []);
        }

        // Fetch success stories
        const { data: storiesData, error: storiesError } = await supabase
          .from('community_success_stories')
          .select('*, profiles(full_name)')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(10);

        if (storiesError) throw storiesError;
        setSuccessStories(storiesData || []);

        // Fetch community groups
        const { data: groupsData, error: groupsError } = await supabase
          .from('community_groups')
          .select('*')
          .eq('is_public', true)
          .order('member_count', { ascending: false })
          .limit(10);

        if (groupsError) throw groupsError;
        setCommunityGroups(groupsData || []);
      } catch (error) {
        console.error('Error fetching community data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load community data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Add tag handler
  const handleAddTag = async () => {
    if (!user?.id || !selectedCategory || !selectedValue) {
      toast({
        title: 'Error',
        description: 'Please select both category and value',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('user_tags').insert({
        user_id: user.id,
        tag_category: selectedCategory,
        tag_value: selectedValue,
      });

      if (error) throw error;

      toast({
        title: 'Tag Added',
        description: 'Your profile tag has been added',
      });

      setSelectedCategory('');
      setSelectedValue('');
      setIsAddTagOpen(false);

      // Refresh tags and similar users
      const { data: tagsData } = await supabase
        .from('user_tags')
        .select('*')
        .eq('user_id', user.id);

      setUserTags(tagsData || []);

      if (tagsData && tagsData.length > 0) {
        const { data: similarData } = await supabase
          .rpc('find_similar_users', { p_user_id: user.id, p_limit: 20 });
        setSimilarUsers(similarData || []);
      }
    } catch (error) {
      console.error('Error adding tag:', error);
      toast({
        title: 'Error',
        description: 'Failed to add tag',
        variant: 'destructive',
      });
    }
  };

  // Remove tag handler
  const handleRemoveTag = async (tagId: string) => {
    try {
      const { error } = await supabase.from('user_tags').delete().eq('id', tagId);

      if (error) throw error;

      toast({
        title: 'Tag Removed',
        description: 'Your profile tag has been removed',
      });

      setUserTags(userTags.filter((t) => t.id !== tagId));
    } catch (error) {
      console.error('Error removing tag:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove tag',
        variant: 'destructive',
      });
    }
  };

  // Send message handler
  const handleSendMessage = async () => {
    if (!user?.id || !selectedUserId || !messageBody) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('community_messages').insert({
        sender_id: user.id,
        recipient_id: selectedUserId,
        subject: messageSubject || 'Connection Request',
        message: messageBody,
      });

      if (error) throw error;

      toast({
        title: 'Message Sent',
        description: 'Your message has been sent successfully',
      });

      setMessageSubject('');
      setMessageBody('');
      setIsMessageOpen(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  // Connect handler
  const handleConnect = async (userId: string, connectionType: 'friend' | 'mentor' | 'buddy') => {
    if (!user?.id) return;

    try {
      const { error } = await supabase.from('community_connections').insert({
        user_id: user.id,
        connected_user_id: userId,
        connection_type: connectionType,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Connection Request Sent',
        description: `Your ${connectionType} request has been sent`,
      });
    } catch (error) {
      console.error('Error creating connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to send connection request',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Community Hub</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading community...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Community Hub</CardTitle>
        <CardDescription>
          Connect with fellow travelers, find your tribe, and share your journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="connections">
              Connections
              {connectionStats && connectionStats.pending_requests > 0 && (
                <Badge className="ml-2" variant="destructive">
                  {connectionStats.pending_requests}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="stories">Stories</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
          </TabsList>

          {/* Discover Tab */}
          <TabsContent value="discover" className="space-y-6">
            {/* User Tags Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Your Profile Tags
                    </CardTitle>
                    <CardDescription>
                      Add tags to help others find you
                    </CardDescription>
                  </div>
                  <Dialog open={isAddTagOpen} onOpenChange={setIsAddTagOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Tag className="h-4 w-4 mr-2" />
                        Add Tag
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Profile Tag</DialogTitle>
                        <DialogDescription>
                          Select a category and value to add to your profile
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Category</label>
                          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(TAG_CATEGORIES).map(([key, { label }]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedCategory && (
                          <div>
                            <label className="text-sm font-medium">Value</label>
                            <Select value={selectedValue} onValueChange={setSelectedValue}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select value" />
                              </SelectTrigger>
                              <SelectContent>
                                {TAG_CATEGORIES[selectedCategory as keyof typeof TAG_CATEGORIES]?.options.map(
                                  (option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <Button onClick={handleAddTag} className="w-full">
                          Add Tag
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {userTags.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Add tags to your profile to find similar travelers
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {userTags.map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="flex items-center gap-2">
                        {TAG_CATEGORIES[tag.tag_category as keyof typeof TAG_CATEGORIES]?.label}:{' '}
                        {tag.tag_value}
                        <button
                          onClick={() => handleRemoveTag(tag.id)}
                          className="ml-1 hover:text-red-600"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Similar Users Section */}
            {similarUsers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Find Your Tribe ({similarUsers.length} matches)
                  </CardTitle>
                  <CardDescription>
                    Users with similar profiles and interests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {similarUsers.slice(0, 5).map((similarUser) => (
                      <Card key={similarUser.user_id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{similarUser.full_name || 'Anonymous'}</h4>
                                <Badge variant="outline">
                                  {similarUser.matching_tags} matching tags
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {similarUser.tags?.slice(0, 3).map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {tag.value}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUserId(similarUser.user_id);
                                  setIsMessageOpen(true);
                                }}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleConnect(similarUser.user_id, 'friend')}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty state if no tags */}
            {userTags.length === 0 && (
              <div className="text-center py-12 space-y-4">
                <Users className="h-16 w-16 mx-auto text-gray-400" />
                <h3 className="text-lg font-semibold">Start Building Your Community</h3>
                <p className="text-gray-600">
                  Add profile tags to discover users with similar interests and goals
                </p>
                <Button onClick={() => setIsAddTagOpen(true)}>
                  <Tag className="h-4 w-4 mr-2" />
                  Add Your First Tag
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections" className="space-y-4">
            {connectionStats && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{connectionStats.total_connections}</div>
                    <div className="text-sm text-gray-600">Total Connections</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{connectionStats.mentors}</div>
                    <div className="text-sm text-gray-600">Mentors</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{connectionStats.buddies}</div>
                    <div className="text-sm text-gray-600">Travel Buddies</div>
                  </CardContent>
                </Card>
              </div>
            )}
            <div className="text-center py-8 text-gray-500">
              Connection management coming soon
            </div>
          </TabsContent>

          {/* Success Stories Tab */}
          <TabsContent value="stories" className="space-y-4">
            {successStories.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No success stories yet. Be the first to share your journey!
              </div>
            ) : (
              successStories.map((story) => (
                <Card key={story.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{story.title}</CardTitle>
                    <CardDescription>
                      By {story.profiles?.full_name || 'Anonymous'} •{' '}
                      {new Date(story.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 whitespace-pre-wrap">{story.story}</p>
                    <div className="flex items-center gap-4 mt-4">
                      <Button variant="ghost" size="sm">
                        <Heart className="h-4 w-4 mr-2" />
                        {story.likes_count} Likes
                      </Button>
                      {story.transition_duration_months && (
                        <Badge variant="outline">
                          {story.transition_duration_months} month transition
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups" className="space-y-4">
            {communityGroups.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No community groups yet
              </div>
            ) : (
              communityGroups.map((group) => (
                <Card key={group.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <CardDescription>{group.description}</CardDescription>
                      </div>
                      <Button size="sm">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Join
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {group.member_count} members
                      </div>
                      <Badge variant="outline">{group.topic}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Message Dialog */}
        <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Message</DialogTitle>
              <DialogDescription>
                Connect with fellow travelers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Subject (optional)</label>
                <Input
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  placeholder="e.g., Travel buddy request"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Introduce yourself and share why you'd like to connect..."
                  rows={6}
                />
              </div>
              <Button onClick={handleSendMessage} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
