
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, MapPin, PlusCircle, AlertCircle, ThumbsUp, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { SocialGroup, SocialPost } from "./types";
import { useSocialPosts } from "@/hooks/useSocialPosts";

export default function SocialGroups() {
  const [groups, setGroups] = useState<SocialGroup[]>([]);
  const [recommendedGroups, setRecommendedGroups] = useState<SocialGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SocialGroup | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [groupPosts, setGroupPosts] = useState<SocialPost[]>([]);
  const [pendingPosts, setPendingPosts] = useState<SocialPost[]>([]);
  const [newGroupPost, setNewGroupPost] = useState("");
  const [joinedGroups, setJoinedGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { user } = useAuth();
  const { createPost, moderatePost, isSubmitting } = useSocialPosts();
  
  useEffect(() => {
    fetchGroups();
    if (user) {
      fetchUserGroups();
    }
  }, [user]);
  
  useEffect(() => {
    if (selectedGroup) {
      fetchGroupPosts(selectedGroup.id.toString());
    }
  }, [selectedGroup]);
  
  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('social_groups')
        .select('*');
      
      if (error) {
        console.error("Error fetching groups:", error);
        toast.error("Failed to load groups");
        return;
      }
      
      if (data) {
        const formattedGroups = data.map(group => ({
          id: group.id,
          name: group.name,
          description: group.description || '',
          cover: group.cover_image || 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg',
          members: group.member_count || 0,
          location: group.location,
          activityLevel: group.activity_level as 'active' | 'new' | 'quiet',
          isAdmin: user && group.admin_id === user.id
        }));
        
        setGroups(formattedGroups);
        
        // Set some recommended groups (this can be more sophisticated in a real app)
        setRecommendedGroups(formattedGroups.slice(0, 2));
      }
    } catch (err) {
      console.error("Error in fetchGroups:", err);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchUserGroups = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('social_group_members')
        .select('group_id')
        .eq('user_id', user.id);
      
      if (error) {
        console.error("Error fetching user groups:", error);
        return;
      }
      
      if (data) {
        const groupIds = data.map(item => item.group_id);
        setJoinedGroups(groupIds);
      }
    } catch (err) {
      console.error("Error in fetchUserGroups:", err);
    }
  };
  
  const fetchGroupPosts = async (groupId: string) => {
    try {
      const { data: postsData, error } = await supabase
        .from('social_posts')
        .select(`
          id,
          content,
          image_url,
          created_at,
          status,
          upvotes,
          downvotes,
          comments_count,
          author_id
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching group posts:", error);
        toast.error("Failed to load posts");
        return;
      }
      
      if (postsData) {
        const formattedPosts = postsData.map(post => ({
          id: post.id,
          author: `User ${post.author_id?.substring(0, 5) || 'Unknown'}`,
          authorAvatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png",
          date: new Date(post.created_at).toLocaleDateString(),
          content: post.content,
          image: post.image_url || undefined,
          likes: post.upvotes || 0,
          comments: post.comments_count || 0,
          status: post.status,
          isOwnPost: user && post.author_id === user.id
        }));
        
        // Separate approved and pending posts
        const approved = formattedPosts.filter(post => post.status === 'approved');
        const pending = formattedPosts.filter(post => post.status === 'pending');
        
        setGroupPosts(approved);
        setPendingPosts(pending);
      }
    } catch (err) {
      console.error("Error in fetchGroupPosts:", err);
      toast.error("Something went wrong");
    }
  };
  
  const handleJoinGroup = async (groupId: string) => {
    if (!user) {
      toast.error("You must be logged in to join groups");
      return;
    }
    
    // Check if already joined
    const isJoined = joinedGroups.includes(groupId);
    
    try {
      if (isJoined) {
        // Leave group
        const { error } = await supabase
          .from('social_group_members')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', user.id);
        
        if (error) {
          console.error("Error leaving group:", error);
          toast.error("Failed to leave the group");
          return;
        }
        
        toast.success("You've left the group");
        
        // Update local state
        setJoinedGroups(prevGroups => prevGroups.filter(id => id !== groupId));
      } else {
        // Join group
        const { error } = await supabase
          .from('social_group_members')
          .insert({
            group_id: groupId,
            user_id: user.id
          });
        
        if (error) {
          console.error("Error joining group:", error);
          toast.error("Failed to join the group");
          return;
        }
        
        toast.success("You've joined the group!");
        
        // Update local state
        setJoinedGroups(prevGroups => [...prevGroups, groupId]);
      }
      
      // Refresh groups to update member counts
      fetchGroups();
    } catch (err) {
      console.error("Error in handleJoinGroup:", err);
      toast.error("Something went wrong");
    }
  };
  
  const handleSelectGroup = (group: SocialGroup) => {
    setSelectedGroup(group);
    setActiveTabId(group.id.toString());
    setNewGroupPost("");
  };
  
  const handlePostSubmit = async () => {
    if (!selectedGroup || !newGroupPost.trim()) return;
    
    const result = await createPost(newGroupPost, undefined, selectedGroup.id.toString());
    if (result) {
      setNewGroupPost("");
      // Fetch posts again to get the new post in pending
      fetchGroupPosts(selectedGroup.id.toString());
    }
  };
  
  const handleModeratePost = async (postId: string, approve: boolean) => {
    const success = await moderatePost(postId, approve);
    if (success && selectedGroup) {
      fetchGroupPosts(selectedGroup.id.toString());
    }
  };
  
  const getActivityBadge = (activityLevel: string) => {
    switch (activityLevel) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'new':
        return <Badge className="bg-blue-500">New</Badge>;
      case 'quiet':
        return <Badge className="bg-gray-500">Quiet</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {selectedGroup ? (
        <div>
          {/* Group header with back button */}
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedGroup(null);
                setActiveTabId(null);
              }}
            >
              Back to Groups
            </Button>
            <h2 className="text-xl font-semibold">{selectedGroup.name}</h2>
            {selectedGroup.isAdmin && (
              <Badge className="bg-purple-500">Admin</Badge>
            )}
          </div>
          
          {/* Group cover and details */}
          <Card className="mb-6">
            <div className="h-40 overflow-hidden">
              <img 
                src={selectedGroup.cover} 
                alt={selectedGroup.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedGroup.name}</h3>
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <Users size={16} className="mr-1" /> {selectedGroup.members} members
                  </div>
                  {selectedGroup.location && (
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <MapPin size={16} className="mr-1" /> {selectedGroup.location}
                    </div>
                  )}
                </div>
                {getActivityBadge(selectedGroup.activityLevel)}
              </div>
              <p className="text-gray-700">{selectedGroup.description}</p>
              
              {!joinedGroups.includes(selectedGroup.id.toString()) && !selectedGroup.isAdmin && (
                <Button
                  className="mt-4"
                  onClick={() => handleJoinGroup(selectedGroup.id.toString())}
                >
                  Join Group
                </Button>
              )}
            </CardContent>
          </Card>
          
          {/* Group posts section with tabs */}
          <div className="space-y-6">
            {/* New post creation */}
            {(joinedGroups.includes(selectedGroup.id.toString()) || selectedGroup.isAdmin) && (
              <Card className="border-2 border-blue-100 mb-6">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-3">Create a new post</h3>
                  <Textarea 
                    value={newGroupPost} 
                    onChange={(e) => setNewGroupPost(e.target.value)}
                    placeholder="Share something with the group..."
                    className="min-h-[120px] mb-4"
                    disabled={isSubmitting}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handlePostSubmit}
                      disabled={isSubmitting || !newGroupPost.trim()}
                    >
                      {isSubmitting ? "Submitting..." : "Post to Group"}
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Group posts require approval from the group admin
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Admin moderation section */}
            {selectedGroup.isAdmin && pendingPosts.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Posts Awaiting Approval</h3>
                <div className="space-y-4">
                  {pendingPosts.map((post) => (
                    <Card key={post.id} className="border-2 border-amber-200">
                      <CardHeader className="flex flex-row items-center gap-4 pb-2">
                        <Avatar className="w-10 h-10">
                          <img src={post.authorAvatar} alt={post.author} />
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{post.author}</h4>
                            <Badge className="bg-amber-500">Pending</Badge>
                          </div>
                          <p className="text-sm text-gray-500">{post.date}</p>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-line">{post.content}</p>
                        {post.image && (
                          <div className="mt-4">
                            <img 
                              src={post.image} 
                              alt="Post image" 
                              className="rounded-md max-h-[300px] object-cover" 
                            />
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="border-t pt-4">
                        <div className="flex gap-4 w-full">
                          <Button 
                            variant="default"
                            className="bg-green-600 hover:bg-green-700" 
                            onClick={() => handleModeratePost(post.id.toString(), true)}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50" 
                            onClick={() => handleModeratePost(post.id.toString(), false)}
                          >
                            Reject
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* Group posts */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Group Posts</h3>
              {groupPosts.length === 0 ? (
                <Card className="text-center py-8">
                  <CardContent>
                    {joinedGroups.includes(selectedGroup.id.toString()) || selectedGroup.isAdmin ? (
                      <p className="text-gray-500">No posts yet. Be the first to share!</p>
                    ) : (
                      <p className="text-gray-500">Join this group to see and create posts</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {groupPosts.map((post) => (
                    <Card key={post.id}>
                      <CardHeader className="flex flex-row items-center gap-4 pb-2">
                        <Avatar className="w-10 h-10">
                          <img src={post.authorAvatar} alt={post.author} />
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{post.author}</h4>
                            {post.isOwnPost && <Badge variant="outline">You</Badge>}
                          </div>
                          <p className="text-sm text-gray-500">{post.date}</p>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-line">{post.content}</p>
                        {post.image && (
                          <div className="mt-4">
                            <img 
                              src={post.image} 
                              alt="Post image" 
                              className="rounded-md max-h-[300px] object-cover" 
                            />
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="border-t pt-4">
                        <div className="flex gap-6 w-full">
                          <Button variant="ghost" size="sm" className="flex items-center gap-1">
                            <ThumbsUp size={18} /> {post.likes}
                          </Button>
                          <Button variant="ghost" size="sm" className="flex items-center gap-1">
                            <MessageSquare size={18} /> {post.comments}
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Groups listing view
        <>
          {/* Pam's recommendations */}
          <div className="bg-purple-50 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-bold mb-4">Pam's Group Suggestions</h2>
            <p className="text-gray-700 mb-4">
              Based on your profile and current location, you might enjoy these groups:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendedGroups.map((group) => (
                <Card key={group.id} className="border border-purple-200">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{group.name}</h4>
                      <p className="text-sm text-gray-600">{group.members} members</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleJoinGroup(group.id.toString())}>
                      <PlusCircle size={16} className="mr-1" /> Join
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          {/* All Groups */}
          <div>
            <h3 className="text-xl font-semibold mb-6">Browse All Groups</h3>
            {isLoading ? (
              <div className="text-center py-8">Loading groups...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                  <Card key={group.id} className="overflow-hidden flex flex-col">
                    <div className="h-40 overflow-hidden cursor-pointer" onClick={() => handleSelectGroup(group)}>
                      <img 
                        src={group.cover} 
                        alt={group.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-lg cursor-pointer" onClick={() => handleSelectGroup(group)}>
                          {group.name}
                        </h4>
                        {getActivityBadge(group.activityLevel)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users size={16} className="mr-1" /> {group.members} members
                      </div>
                      {group.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin size={16} className="mr-1" /> {group.location}
                        </div>
                      )}
                      {group.isAdmin && (
                        <Badge className="bg-purple-500 mt-1">Admin</Badge>
                      )}
                    </CardHeader>
                    <CardContent className="pb-2 flex-grow">
                      <p className="text-sm text-gray-700 line-clamp-2">{group.description}</p>
                    </CardContent>
                    <CardFooter className="pt-2 flex justify-between">
                      <Button 
                        variant="default"
                        className="flex-1 mr-2"
                        onClick={() => handleSelectGroup(group)}
                      >
                        View Group
                      </Button>
                      {!group.isAdmin && (
                        <Button 
                          variant={joinedGroups.includes(group.id.toString()) ? "outline" : "secondary"} 
                          className="flex-1 ml-2"
                          onClick={() => handleJoinGroup(group.id.toString())}
                        >
                          {joinedGroups.includes(group.id.toString()) ? "Leave" : "Join"}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          {/* Create Group Banner */}
          <Card className="bg-gray-50 border-dashed border-2 border-gray-300 p-6 text-center">
            <CardContent>
              <h4 className="text-lg font-semibold">Start your own group</h4>
              <p className="text-gray-700 mb-4">
                Have a shared interest or location? Create a group for like-minded travelers!
              </p>
              <Button>
                <PlusCircle size={18} className="mr-2" /> Create Group
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
