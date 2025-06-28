import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export function useSocialPosts() {
  const { user } = useAuth();

  const createPost = async (
    content: string,
    image_url?: string,
    group_id?: string
  ) => {
    if (!user) {
      toast.error("You must be logged in to post.");
      return false;
    }

    const { error } = await supabase.from("social_posts").insert({
      user_id: user.id,
      content,
      image_url: image_url || null,
      group_id: group_id || null,
      location: "feed",
      status: "approved",
    });

    if (error) {
      // Log detailed error information for debugging
      console.error(
        "Supabase insert error:",
        error.message,
        error.details,
        error.hint
      );
      toast.error(error.message || "Failed to post. Try again.");
      return false;
    }

    toast.success("Post created!");
    return true;
  };

  const votePost = async (postId: string, isUpvote: boolean) => {
    if (!user) {
      toast.error("You must be logged in to vote.");
      return false;
    }

    const { error } = await supabase.from("post_votes").upsert({
      user_id: user.id,
      post_id: postId,
      vote_type: isUpvote, // true for upvote, false for downvote
    });

    if (error) {
      console.error(
        "Supabase vote error:",
        error.message,
        error.details,
        error.hint
      );
      toast.error(error.message || "Failed to vote. Please try again.");
      return false;
    }

    return true;
  };

  return { createPost, votePost };
}
