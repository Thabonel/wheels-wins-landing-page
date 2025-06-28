
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { PostStatus, PostLocation } from "@/components/social/types";

export function useSocialPosts() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPost = async (content: string, imageUrl?: string, groupId?: string) => {
    if (!user) {
      toast.error("You must be logged in to create posts");
      return null;
    }

    setIsSubmitting(true);

    try {
      const location: PostLocation = groupId ? 'group' : 'feed';
      const initialStatus: PostStatus = location === 'group' ? 'pending' : 'approved';

      const { data, error } = await supabase
        .from('social_posts')
        .insert({
          author_id: user.id,
          content,
          image_url: imageUrl,
          group_id: groupId,
          location,
          status: initialStatus
        })
        .select();

      if (error) {
        console.error("Error creating post:", error);
        toast.error("Failed to create post. Please try again.");
        return null;
      }

      toast.success(groupId 
        ? "Your post has been submitted for approval by the group admin" 
        : "Your post has been published!");
      
      return data[0] || null;
    } catch (err) {
      console.error("Error in post creation:", err);
      toast.error("Something went wrong. Please try again.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const moderatePost = async (postId: string, approve: boolean) => {
    if (!user) {
      toast.error("You must be logged in to moderate posts");
      return false;
    }

    try {
      // First check if user is admin of the group this post belongs to
      const { data: postData, error: postError } = await supabase
        .from('social_posts')
        .select('group_id')
        .eq('id', postId)
        .single();

      if (postError || !postData.group_id) {
        toast.error("Failed to find post information");
        return false;
      }

      const { data: groupData, error: groupError } = await supabase
        .from('social_groups')
        .select('admin_id')
        .eq('id', postData.group_id)
        .single();

      if (groupError || groupData.admin_id !== user.id) {
        toast.error("You don't have permission to moderate this post");
        return false;
      }

      // Update post status
      const { error } = await supabase
        .from('social_posts')
        .update({
          status: approve ? 'approved' : 'rejected'
        })
        .eq('id', postId);

      if (error) {
        console.error("Error updating post status:", error);
        toast.error("Failed to update post status");
        return false;
      }

      toast.success(approve ? "Post approved" : "Post rejected");
      return true;
    } catch (err) {
      console.error("Error in post moderation:", err);
      toast.error("Something went wrong");
      return false;
    }
  };

  const votePost = async (postId: string, isUpvote: boolean) => {
    if (!user) {
      toast.error("You must be logged in to vote");
      return false;
    }

    try {
      // Check if user has already voted on this post
      const { data: existingVote, error: checkError } = await supabase
        .from('post_votes')
        .select('id, vote_type')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing vote:", checkError);
        toast.error("Failed to process your vote");
        return false;
      }

      let result;

      if (existingVote) {
        // If already voted the same way, remove the vote
        if (existingVote.vote_type === isUpvote) {
          result = await supabase
            .from('post_votes')
            .delete()
            .eq('id', existingVote.id);
          
          toast.success("Vote removed");
        } 
        // If voted differently, update the vote
        else {
          result = await supabase
            .from('post_votes')
            .update({ vote_type: isUpvote })
            .eq('id', existingVote.id);
          
          toast.success(isUpvote ? "Changed to upvote" : "Changed to downvote");
        }
      } 
      // If not voted yet, insert new vote
      else {
        result = await supabase
          .from('post_votes')
          .insert({
            post_id: postId,
            user_id: user.id,
            vote_type: isUpvote
          });
        
        toast.success(isUpvote ? "Upvoted!" : "Downvoted");
      }

      if (result.error) {
        console.error("Error processing vote:", result.error);
        toast.error("Failed to process your vote");
        return false;
      }

      return true;
    } catch (err) {
      console.error("Error in voting:", err);
      toast.error("Something went wrong");
      return false;
    }
  };

  return {
    createPost,
    moderatePost,
    votePost,
    isSubmitting
  };
}
