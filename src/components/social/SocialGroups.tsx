
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { PlusCircle, Users, Sparkles, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPublicAssetUrl } from "@/utils/publicAssets";
import { useAuth } from "@/context/AuthContext";
import { SocialGroup, SocialPost } from "./types";
import { useSocialPosts } from "@/hooks/useSocialPosts";
import GroupCard from "./groups/GroupCard";
import GroupDetailView from "./groups/GroupDetailView";
import CreateGroupForm from "./groups/CreateGroupForm";
import { generateAvatarUrl } from "@/utils/avatarUtils";

export default function SocialGroups() {
  const [groups, setGroups] = useState<SocialGroup[]>([]);
  const [recommendedGroups, setRecommendedGroups] = useState<SocialGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SocialGroup | null>(null);
  const [groupPosts, setGroupPosts] = useState<SocialPost[]>([]);
  const [pendingPosts, setPendingPosts] = useState<SocialPost[]>([]);
  const [newGroupPost, setNewGroupPost] = useState("");
  const [joinedGroups, setJoinedGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { user } = useAuth();
  const { createPost, votePost, moderatePost, isSubmitting } = useSocialPosts();
  
  useEffect(() => {
    if (user) {
      fetchGroups();
      fetchUserGroups();
    }
  }, [user]);
  
  useEffect(() => {
    if (selectedGroup) {
      fetchGroupPosts(selectedGroup.id.toString());
    }
  }, [selectedGroup]);
  
  const fetchGroups = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('social_groups')
        .select('*');
      
      if (error) {
        console.error("Error fetching groups:", error);
        console.error('Error code:', error.code);
        console.error('Error details:', error.details);
        
        // Only show error toast for actual errors, not empty data
        if (error.code === 'PGRST116') {
          // Table not found
          console.log('Social groups table not found');
          setGroups([]);
          setRecommendedGroups([]);
        } else if (error.code === 'PGRST301') {
          // No rows found - this is fine, just empty data
          console.log('No groups found - showing empty state');
          setGroups([]);
          setRecommendedGroups([]);
        } else {
          // Actual error
          toast.error("Failed to load groups");
        }
        return;
      }
      
      if (data) {
        const formattedGroups = data.map(group => ({
          id: group.id,
          name: group.name,
          description: group.description || '',
          cover: group.avatar_url || getPublicAssetUrl('placeholder.svg'),
          members: group.member_count || 0,
          location: 'Unknown',
          activityLevel: 'active' as 'active' | 'new' | 'quiet',
          isAdmin: user && group.owner_id === user.id
        }));
        
        setGroups(formattedGroups);
        setRecommendedGroups(formattedGroups.slice(0, 2));
        
        // Log for debugging
        console.log(`Loaded ${formattedGroups.length} groups`);
      } else {
        // No data returned but no error - empty state
        console.log('No groups data returned - showing empty state');
        setGroups([]);
        setRecommendedGroups([]);
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
          comment_count,
          user_id
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
          author: `User ${post.user_id?.substring(0, 5) || 'Unknown'}`,
          authorId: post.user_id || '',
          authorAvatar: generateAvatarUrl(post.user_id || 'unknown', `User ${post.user_id?.substring(0, 5) || 'Unknown'}`),
          date: new Date(post.created_at).toLocaleDateString(),
          content: post.content,
          image: post.image_url || undefined,
          likes: post.upvotes || 0,
          comments: post.comment_count || 0,
          status: post.status,
          location: 'group',
          isOwnPost: user && post.user_id === user.id
        }));
        
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
    
    const isJoined = joinedGroups.includes(groupId);
    
    try {
      if (isJoined) {
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
        setJoinedGroups(prevGroups => prevGroups.filter(id => id !== groupId));
      } else {
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
        setJoinedGroups(prevGroups => [...prevGroups, groupId]);
      }
      
      fetchGroups();
    } catch (err) {
      console.error("Error in handleJoinGroup:", err);
      toast.error("Something went wrong");
    }
  };
  
  const handleSelectGroup = (group: SocialGroup) => {
    setSelectedGroup(group);
    setNewGroupPost("");
  };
  
  const handlePostSubmit = async () => {
    if (!selectedGroup || !newGroupPost.trim()) return;
    
    const result = await createPost(newGroupPost, undefined, selectedGroup.id.toString());
    if (result) {
      setNewGroupPost("");
      fetchGroupPosts(selectedGroup.id.toString());
    }
  };
  
  const handleModeratePost = async (postId: string, approve: boolean) => {
    const success = await moderatePost(postId, approve);
    if (success && selectedGroup) {
      fetchGroupPosts(selectedGroup.id.toString());
    }
  };

  const handleVote = async (postId: string, isUp: boolean) => {
    const success = await votePost(postId, isUp);
    if (success && selectedGroup) {
      fetchGroupPosts(selectedGroup.id.toString());
    }
  };

  return (
    <div className="space-y-8">
      {selectedGroup ? (
        <GroupDetailView
          group={selectedGroup}
          isJoined={joinedGroups.includes(selectedGroup.id.toString())}
          groupPosts={groupPosts}
          pendingPosts={pendingPosts}
          newGroupPost={newGroupPost}
          setNewGroupPost={setNewGroupPost}
          onBack={() => setSelectedGroup(null)}
          onJoinGroup={handleJoinGroup}
          onPostSubmit={handlePostSubmit}
          onModeratePost={handleModeratePost}
          onVote={handleVote}
          isSubmitting={isSubmitting}
        />
      ) : (
        <>
          {/* Pam's recommendations */}
          {recommendedGroups.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-100 shadow-sm mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Pam's Group Suggestions</h2>
              </div>
              <p className="text-gray-700 mb-6">
                Based on your travel preferences and interests, you might enjoy connecting with these communities:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedGroups.map((group) => (
                  <Card key={group.id} className="border border-purple-200 hover:border-purple-300 transition-colors bg-white/70 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1 truncate">{group.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Users size={14} />
                            <span>{group.members === 1 ? '1 member' : `${group.members} members`}</span>
                          </div>
                          {group.activityLevel && (
                            <span className="text-green-600 font-medium capitalize">{group.activityLevel}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-3 border-purple-200 text-purple-700 hover:bg-purple-50"
                        onClick={() => handleJoinGroup(group.id.toString())}
                      >
                        <PlusCircle size={14} className="mr-1.5" />
                        Join
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {/* All Groups */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Browse All Groups</h3>
                <p className="text-gray-600">
                  {groups.length === 0 ? 'No groups yet' : `${groups.length} ${groups.length === 1 ? 'community' : 'communities'} to explore`}
                </p>
              </div>
              {groups.length > 0 && (
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                  <Search size={16} />
                  <span>Click any card to explore</span>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading amazing communities...</p>
              </div>
            ) : groups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isJoined={joinedGroups.includes(group.id.toString())}
                    onSelectGroup={handleSelectGroup}
                    onJoinGroup={handleJoinGroup}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-gray-300 py-16">
                <CardContent className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center mx-auto mb-4">
                    <Users size={32} className="text-white" />
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">No Communities Yet</h4>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Be a pioneer! Create the first community and bring travelers together to share amazing adventures.
                  </p>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <PlusCircle size={18} className="mr-2" />
                    Create First Community
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Create Group Banner - Only show if there are existing groups */}
          {groups.length > 0 && (
            <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-200/30 to-amber-200/30 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-orange-200/20 to-amber-200/20 rounded-full -ml-10 -mb-10"></div>
              <CardContent className="p-6 text-center relative z-10">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-4">
                  <PlusCircle size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Start Your Own Community</h4>
                <p className="text-gray-700 mb-6 max-w-md mx-auto">
                  Have a unique perspective or special interest? Create a community where fellow travelers can connect and share experiences around what matters most to you.
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium"
                >
                  <PlusCircle size={16} className="mr-2" />
                  Create Community
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
      
      {/* Create Group Modal */}
      <CreateGroupForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupCreated={fetchGroups}
      />
    </div>
  );
}
