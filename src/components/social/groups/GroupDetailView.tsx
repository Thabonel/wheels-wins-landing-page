
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin } from "lucide-react";
import { SocialGroup, SocialPost } from "../types";
import GroupPost from "./GroupPost";
import PostCreationForm from "./PostCreationForm";

interface GroupDetailViewProps {
  group: SocialGroup;
  isJoined: boolean;
  groupPosts: SocialPost[];
  pendingPosts: SocialPost[];
  newGroupPost: string;
  setNewGroupPost: (content: string) => void;
  onBack: () => void;
  onJoinGroup: (groupId: string) => void;
  onPostSubmit: () => void;
  onModeratePost: (postId: string, approve: boolean) => void;
  isSubmitting: boolean;
}

export default function GroupDetailView({
  group,
  isJoined,
  groupPosts,
  pendingPosts,
  newGroupPost,
  setNewGroupPost,
  onBack,
  onJoinGroup,
  onPostSubmit,
  onModeratePost,
  isSubmitting
}: GroupDetailViewProps) {
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
    <div>
      {/* Group header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onBack}>
          Back to Groups
        </Button>
        <h2 className="text-xl font-semibold">{group.name}</h2>
        {group.isAdmin && (
          <Badge className="bg-purple-500">Admin</Badge>
        )}
      </div>
      
      {/* Group cover and details */}
      <Card className="mb-6">
        <div className="h-40 overflow-hidden">
          <img 
            src={group.cover} 
            alt={group.name} 
            className="w-full h-full object-cover"
          />
        </div>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">{group.name}</h3>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <Users size={16} className="mr-1" /> {group.members} members
              </div>
              {group.location && (
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <MapPin size={16} className="mr-1" /> {group.location}
                </div>
              )}
            </div>
            {getActivityBadge(group.activityLevel)}
          </div>
          <p className="text-gray-700">{group.description}</p>
          
          {!isJoined && !group.isAdmin && (
            <Button
              className="mt-4"
              onClick={() => onJoinGroup(group.id.toString())}
            >
              Join Group
            </Button>
          )}
        </CardContent>
      </Card>
      
      {/* Group posts section */}
      <div className="space-y-6">
        {/* New post creation */}
        {(isJoined || group.isAdmin) && (
          <PostCreationForm
            newGroupPost={newGroupPost}
            setNewGroupPost={setNewGroupPost}
            onSubmit={onPostSubmit}
            isSubmitting={isSubmitting}
          />
        )}
        
        {/* Admin moderation section */}
        {group.isAdmin && pendingPosts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Posts Awaiting Approval</h3>
            <div className="space-y-4">
              {pendingPosts.map((post) => (
                <GroupPost
                  key={post.id}
                  post={post}
                  isPending={true}
                  onModerate={onModeratePost}
                  showModerationButtons={true}
                />
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
                {isJoined || group.isAdmin ? (
                  <p className="text-gray-500">No posts yet. Be the first to share!</p>
                ) : (
                  <p className="text-gray-500">Join this group to see and create posts</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {groupPosts.map((post) => (
                <GroupPost key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
