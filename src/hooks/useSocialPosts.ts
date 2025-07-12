
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
          user_id: user.id,
          content,
          image_url: imageUrl,
          group_id: groupId,
          location,
          status: initialStatus
        })
        .select();

      if (error) {
        console.error("Error creating post:", error);
        console.error("Error code:", error.code);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);
        console.error("Error message:", error.message);
        console.error("Post data attempted:", { user_id: user.id, content, image_url: imageUrl, group_id: groupId, location, status: initialStatus });
        
        // More specific error messages
        if (error.code === '23503') {
          toast.error("Invalid group reference. Please refresh the page and try again.");
        } else if (error.code === '23505') {
          toast.error("Duplicate post detected. Please wait before posting again.");
        } else if (error.code === '42501') {
          toast.error("Permission denied. Please check your account settings.");
        } else if (error.message?.includes('user_id')) {
          toast.error("Authentication error. Please log out and log back in.");
        } else {
          toast.error(`Failed to create post: ${error.message || 'Unknown error'}`);
        }
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

  const createComment = async (postId: string, content: string) => {
    if (!user) {
      toast.error("You must be logged in to comment");
      return false;
    }

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content
        });

      if (error) {
        console.error("Error creating comment:", error);
        toast.error("Failed to create comment");
        return false;
      }

      toast.success("Comment added!");
      return true;
    } catch (err) {
      console.error("Error in createComment:", err);
      toast.error("Something went wrong");
      return false;
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('id, content, created_at, user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching comments:", error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error("Error in fetchComments:", err);
      return [];
    }
  };

  const sharePost = async (postId: string, postContent: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this post',
          text: postContent,
          url: `${window.location.origin}/social?post=${postId}`
        });
        toast.success("Post shared!");
        return true;
      } catch (err) {
        console.log("Share cancelled or failed");
        return false;
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/social?post=${postId}`);
        toast.success("Post link copied to clipboard!");
        return true;
      } catch (err) {
        toast.error("Failed to copy link");
        return false;
      }
    }
  };

  return {
    createPost,
    moderatePost,
    votePost,
    isSubmitting,
    createComment,
    fetchComments,
    sharePost
  };
}
