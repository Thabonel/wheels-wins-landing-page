
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPublicAssetUrl } from "@/utils/publicAssets";
import { useAuth } from "@/context/AuthContext";
import { SocialGroup, SocialPost } from "./types";
import { useSocialPosts } from "@/hooks/useSocialPosts";
import GroupCard from "./groups/GroupCard";
import GroupDetailView from "./groups/GroupDetailView";
import CreateGroupForm from "./groups/CreateGroupForm";

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
  const { createPost, moderatePost, votePost } = useSocialPosts();
  
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
        toast.error("Failed to load groups");
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
          authorAvatar: getPublicAssetUrl('avatar-placeholder.png'),
          date: new Date(post.created_at).toLocaleDateString(),
          content: post.content,
          image: post.image_url || undefined,
          likes: post.upvotes || 0,
          comments: post.comments_count || 0,
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
          isSubmitting={false}
        />
      ) : (
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
                  <GroupCard
                    key={group.id}
                    group={group}
                    isJoined={joinedGroups.includes(group.id.toString())}
                    onSelectGroup={handleSelectGroup}
                    onJoinGroup={handleJoinGroup}
                  />
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
              <Button onClick={() => setShowCreateModal(true)}>
                <PlusCircle size={18} className="mr-2" /> Create Group
              </Button>
            </CardContent>
          </Card>
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
