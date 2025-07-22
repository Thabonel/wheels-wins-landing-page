import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export function useSocialPosts() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const createPost = async (
    content: string, 
    imageUrl?: string, 
    groupId?: string
  ): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to create posts');
      return false;
    }

    if (!content.trim()) {
      toast.error('Post content cannot be empty');
      return false;
    }

    setIsSubmitting(true);
    try {
      const postData = {
        user_id: user.id,
        content: content.trim(),
        media_urls: imageUrl ? [imageUrl] : [],
        post_type: imageUrl ? 'image' : 'text',
        visibility: 'public',
        ...(groupId && { trip_id: groupId }) // Using trip_id to reference group for now
      };

      const { error } = await supabase
        .from('social_posts')
        .insert(postData);

      if (error) {
        console.error('Error creating post:', error);
        toast.error('Failed to create post');
        return false;
      }

      toast.success('Post created successfully!');
      return true;
    } catch (err) {
      console.error('Error in createPost:', err);
      toast.error('Something went wrong');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const votePost = async (postId: string, isUpvote: boolean): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to vote');
      return false;
    }

    try {
      // Check if user already has an interaction with this post
      const { data: existingInteraction, error: checkError } = await supabase
        .from('social_interactions')
        .select('id, interaction_type')
        .eq('user_id', user.id)
        .eq('target_type', 'post')
        .eq('target_id', postId)
        .eq('interaction_type', isUpvote ? 'like' : 'dislike')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing vote:', checkError);
      }

      if (existingInteraction) {
        // Remove existing vote
        const { error: deleteError } = await supabase
          .from('social_interactions')
          .delete()
          .eq('id', existingInteraction.id);

        if (deleteError) {
          console.error('Error removing vote:', deleteError);
          toast.error('Failed to update vote');
          return false;
        }
      } else {
        // Add new vote
        const { error: insertError } = await supabase
          .from('social_interactions')
          .insert({
            user_id: user.id,
            target_type: 'post',
            target_id: postId,
            interaction_type: isUpvote ? 'like' : 'dislike'
          });

        if (insertError) {
          console.error('Error adding vote:', insertError);
          toast.error('Failed to vote');
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error('Error in votePost:', err);
      toast.error('Something went wrong');
      return false;
    }
  };

  const sharePost = async (postId: string, content: string): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to share posts');
      return false;
    }

    try {
      const { error } = await supabase
        .from('social_interactions')
        .insert({
          user_id: user.id,
          target_type: 'post',
          target_id: postId,
          interaction_type: 'share',
          content: content
        });

      if (error) {
        console.error('Error sharing post:', error);
        toast.error('Failed to share post');
        return false;
      }

      toast.success('Post shared successfully!');
      return true;
    } catch (err) {
      console.error('Error in sharePost:', err);
      toast.error('Something went wrong');
      return false;
    }
  };

  const moderatePost = async (postId: string, approve: boolean): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to moderate posts');
      return false;
    }

    try {
      const { error } = await supabase
        .from('social_posts')
        .update({
          visibility: approve ? 'public' : 'private'
        })
        .eq('id', postId);

      if (error) {
        console.error('Error moderating post:', error);
        toast.error('Failed to moderate post');
        return false;
      }

      toast.success(approve ? 'Post approved' : 'Post hidden');
      return true;
    } catch (err) {
      console.error('Error in moderatePost:', err);
      toast.error('Something went wrong');
      return false;
    }
  };

  return {
    createPost,
    votePost,
    sharePost,
    moderatePost,
    isSubmitting
  };
}