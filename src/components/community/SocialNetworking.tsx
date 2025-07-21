import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/common/AnimatedDialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCommunityFeatures, type Friendship } from '@/hooks/useCommunityFeatures';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, UserPlus, Heart, MessageSquare, Share2, MapPin, Calendar, Star } from 'lucide-react';

interface User {
  id: string;
  email: string;
  raw_user_meta_data?: any;
  profiles?: {
    bio?: string;
    interests?: string[];
    travel_style?: string;
    rig_type?: string;
    experience_level?: string;
  };
}

export default function SocialNetworking() {
  const { user } = useAuth();
  const {
    sendFriendRequest,
    respondToFriendRequest,
    followUser,
    unfollowUser,
    getUserFriendships,
    getSocialInteractions,
    getUserTrustScore,
    loading
  } = useCommunityFeatures();

  const [users, setUsers] = useState<User[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [trustScore, setTrustScore] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchFriendships();
    fetchInteractions();
    fetchTrustScore();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          email,
          nickname,
          region
        `)
        .limit(20);

      if (error) throw error;

      const transformedUsers = data?.map(profile => ({
        id: profile.user_id,
        email: profile.email || '',
        raw_user_meta_data: {
          nickname: profile.nickname,
          region: profile.region
        },
        profiles: {
          bio: '',
          interests: [],
          travel_style: '',
          rig_type: '',
          experience_level: ''
        }
      })) || [];

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchFriendships = async () => {
    const data = await getUserFriendships();
    setFriendships(data);
  };

  const fetchInteractions = async () => {
    const data = await getSocialInteractions();
    setInteractions(data);
  };

  const fetchTrustScore = async () => {
    const score = await getUserTrustScore();
    setTrustScore(score?.score || null);
  };

  const handleFriendRequest = async (userId: string) => {
    const success = await sendFriendRequest(userId);
    if (success) {
      fetchFriendships();
    }
  };

  const handleFriendshipResponse = async (friendshipId: string, accept: boolean) => {
    const success = await respondToFriendRequest(friendshipId, accept);
    if (success) {
      fetchFriendships();
    }
  };

  const handleFollow = async (userId: string) => {
    const success = await followUser(userId);
    if (success) {
      fetchInteractions();
    }
  };

  const filteredUsers = users.filter(u => 
    u.id !== user?.id &&
    (u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.raw_user_meta_data?.nickname?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pendingFriendRequests = friendships.filter(f => 
    f.status === 'pending' && f.addressee_id === user?.id
  );

  const friends = friendships.filter(f => f.status === 'accepted');

  return (
    <div className="space-y-6">
      {/* Header with Trust Score */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Social Network</h2>
          <p className="text-muted-foreground">Connect with fellow travelers</p>
        </div>
        {trustScore && (
          <Card className="w-48">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Trust Score</span>
              </div>
              <div className="text-2xl font-bold text-primary">{trustScore.toFixed(1)}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pending Friend Requests */}
      {pendingFriendRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Friend Requests ({pendingFriendRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingFriendRequests.map((friendship) => {
                const requester = users.find(u => u.id === friendship.requester_id);
                return (
                  <div key={friendship.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {requester?.raw_user_meta_data?.nickname?.[0] || requester?.email[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{requester?.raw_user_meta_data?.nickname || requester?.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {requester?.raw_user_meta_data?.region}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleFriendshipResponse(friendship.id, true)}
                        disabled={loading}
                      >
                        Accept
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleFriendshipResponse(friendship.id, false)}
                        disabled={loading}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="discover" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="discover">Discover People</TabsTrigger>
          <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((profile) => {
              const isFriend = friends.some(f => 
                f.requester_id === profile.id || f.addressee_id === profile.id
              );
              const hasPendingRequest = friendships.some(f => 
                f.requester_id === user?.id && 
                f.addressee_id === profile.id && 
                f.status === 'pending'
              );

              return (
                <Card key={profile.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {profile.raw_user_meta_data?.nickname?.[0] || profile.email[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">
                          {profile.raw_user_meta_data?.nickname || profile.email}
                        </h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {profile.raw_user_meta_data?.region || 'Unknown'}
                        </p>
                        
                        {profile.profiles?.interests && profile.profiles.interests.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {profile.profiles.interests.slice(0, 3).map((interest, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {interest}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2 mt-3">
                          {!isFriend && !hasPendingRequest && (
                            <Button 
                              size="sm" 
                              onClick={() => handleFriendRequest(profile.id)}
                              disabled={loading}
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Add Friend
                            </Button>
                          )}
                          {hasPendingRequest && (
                            <Button size="sm" variant="outline" disabled>
                              Request Sent
                            </Button>
                          )}
                          {isFriend && (
                            <Badge variant="default">Friends</Badge>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedUser(profile)}
                          >
                            View Profile
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="friends" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friendship) => {
              const friendId = friendship.requester_id === user?.id 
                ? friendship.addressee_id 
                : friendship.requester_id;
              const friend = users.find(u => u.id === friendId);
              
              return (
                <Card key={friendship.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {friend?.raw_user_meta_data?.nickname?.[0] || friend?.email[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {friend?.raw_user_meta_data?.nickname || friend?.email}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Connected since {new Date(friendship.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="space-y-3">
            {interactions.map((interaction) => (
              <Card key={interaction.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {interaction.interaction_type === 'like' && <Heart className="h-4 w-4 text-red-500" />}
                      {interaction.interaction_type === 'follow' && <Users className="h-4 w-4 text-blue-500" />}
                      {interaction.interaction_type === 'comment' && <MessageSquare className="h-4 w-4 text-green-500" />}
                      {interaction.interaction_type === 'share' && <Share2 className="h-4 w-4 text-purple-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">You</span> {interaction.interaction_type}d a{' '}
                        {interaction.content_type || 'post'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(interaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* User Profile Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>User Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {selectedUser.raw_user_meta_data?.nickname?.[0] || selectedUser.email[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedUser.raw_user_meta_data?.nickname || selectedUser.email}
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedUser.raw_user_meta_data?.region}
                  </p>
                </div>
              </div>

              {selectedUser.profiles?.bio && (
                <div>
                  <h4 className="font-medium mb-2">About</h4>
                  <p className="text-sm text-muted-foreground">{selectedUser.profiles.bio}</p>
                </div>
              )}

              {selectedUser.profiles?.travel_style && (
                <div>
                  <h4 className="font-medium mb-2">Travel Style</h4>
                  <Badge variant="outline">{selectedUser.profiles.travel_style}</Badge>
                </div>
              )}

              {selectedUser.profiles?.rig_type && (
                <div>
                  <h4 className="font-medium mb-2">RV Type</h4>
                  <Badge variant="outline">{selectedUser.profiles.rig_type}</Badge>
                </div>
              )}

              {selectedUser.profiles?.interests && selectedUser.profiles.interests.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Interests</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedUser.profiles.interests.map((interest, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}