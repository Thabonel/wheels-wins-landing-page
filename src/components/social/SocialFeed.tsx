import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, ThumbsUp, ThumbsDown, Share2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useSocialPosts } from "@/hooks/useSocialPosts";
import CommentSection from "./CommentSection";
import { generateAvatarUrl } from "@/utils/avatarUtils";

interface SocialPost {
  id: string;
  author: string;
  authorAvatar: string;
  date: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  status: string;
  location: string;
  groupId: string | null;
  isOwnPost: boolean;
}
export default function SocialFeed() {
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [trendingTopics] = useState<string[]>([
    "SolarPanels", "BoonDocking", "RVLife", "VanLife", "OffGrid"
  ]);
  const [userVotes, setUserVotes] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);

  const { user } = useAuth();
  const { createPost, votePost, sharePost } = useSocialPosts();

  useEffect(() => {
    fetchPosts();
    if (user) fetchUserVotes();

    // Realtime subscription: only for public posts
    const channel = supabase
      .channel("public:social_posts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "social_posts",
          filter: "visibility=eq.public"
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(console.error);
    };
  }, [user]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("social_posts")
        .select(
          `id, content, image_url, created_at, status, upvotes, comment_count, user_id, group_id`
        )
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching posts:", error);
        console.error("Error code:", error.code);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);
        console.error("Error message:", error.message);
        
        // Only show error toast for actual errors, not empty data
        if (error.code === 'PGRST116') {
          // Table not found error
          console.log("Table not found - social_posts table doesn't exist");
          toast.error("Social posts feature is not set up yet");
        } else if (error.code === '42501' || error.message?.includes('permission denied')) {
          // Permission denied error
          console.log("Permission denied - RLS policies are blocking access");
          toast.error("Permission issue detected. Running database migration should fix this.");
          // Don't return here, show empty state instead
          setPosts([]);
          setIsLoading(false);
          return;
        } else if (error.code === 'PGRST301') {
          // No rows found - this is actually fine, just means no posts yet
          console.log("No posts found - this is normal for empty feed");
          setPosts([]);
          setIsLoading(false);
          return;
        } else {
          // Other errors
          console.log("Other error:", error.code, error.message);
          toast.error("Unable to load posts. Please try again later.");
        }
        setPosts([]);
        return;
      }

      const formatted = data?.map((post) => ({
        id: post.id.toString(), // Ensure ID is string
        author: `User ${post.user_id?.substring(0, 5) || "Unknown"}`,
        authorAvatar: generateAvatarUrl(post.user_id || 'unknown', `User ${post.user_id?.substring(0, 5) || "Unknown"}`),
        date: new Date(post.created_at).toLocaleDateString(),
        content: post.content,
        image: post.image_url || undefined,
        likes: post.upvotes ?? 0,
        comments: post.comment_count ?? 0,
        status: post.status,
        location: "feed",
        groupId: post.group_id,
        isOwnPost: user?.id === post.user_id,
      })) || [];

      setPosts(formatted);
    } catch (err) {
      console.error("Unexpected error fetching posts:", err);
      toast.error("An unexpected error occurred. Please refresh the page.");
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserVotes = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("social_interactions")
        .select("content_id, interaction_type")
        .eq("user_id", user.id)
        .eq("content_type", "post")
        .in("interaction_type", ["like", "dislike"]);

      if (error) {
        console.error("Error fetching votes:", error);
        // Don't show error toast for votes - it's not critical
        // Just set empty votes
        setUserVotes({});
        return;
      }

      const votes: Record<string, boolean> = {};
      data?.forEach((v) => {
        votes[v.content_id] = v.interaction_type === "like";
      });
      setUserVotes(votes);
    } catch (err) {
      console.error("Error fetching votes:", err);
      setUserVotes({});
    }
  };

  const handlePostSubmit = async () => {
    if (!newPost.trim()) return;
    setIsSubmitting(true);
    const success = await createPost(newPost);
    if (success) {
      setNewPost("");
      // No need to await here, let it refetch in background
      await fetchPosts();
    }
    setIsSubmitting(false);
  };

  const handleVote = async (postId: string, isUp: boolean) => {
    const success = await votePost(postId, isUp);
    if (!success) return;
    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const prevVote = userVotes[postId];
        let delta = isUp ? 1 : -1;
        if (prevVote !== undefined) delta = prevVote === isUp ? -1 : 2 * (isUp ? 1 : -1);
        const likes = p.likes + delta;
        return {
          ...p,
          likes: Math.max(0, likes), // Ensure likes don't go below 0
          status: likes < 0 && p.status !== "hidden" ? "hidden" : p.status,
        };
      })
    );
    setUserVotes((prev) => {
      const copy = { ...prev };
      if (copy[postId] === isUp) delete copy[postId];
      else copy[postId] = isUp;
      return copy;
    });
    fetchPosts(); // Refetch to get accurate counts from backend
  };

  const handleShare = async (postId: string, content: string) => {
    await sharePost(postId, content);
  };

  const handleComment = (postId: string) => {
    setOpenComments(postId);
  };

  const getStatusBadge = (p: SocialPost) => {
    if (p.status === "pending") return <Badge className="bg-amber-500">Pending</Badge>;
    if (p.status === "hidden") return <Badge className="bg-red-500">Hidden</Badge>;
    return null;
  };

  return (
    <div className="space-y-8">
      {/* New Post */}
      <Card className="border-2 border-blue-100">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-3">Create a new post</h3>
          <Textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share your travel updates..."
            className="min-h-[120px] mb-4"
            disabled={isSubmitting || !user}
          />
          <div className="flex justify-end">
            <Button
              onClick={handlePostSubmit}
              disabled={isSubmitting || !newPost.trim() || !user}
            >
              {isSubmitting ? "Submitting..." : "Post to Feed"}
            </Button>
          </div>
          {!user ? (
            <p className="text-xs text-red-500 mt-2">Log in to post</p>
          ) : (
            <p className="text-xs text-gray-500 mt-2">
              Posts auto-approved; hidden after 10+ downvotes
            </p>
          )}
        </CardContent>
      </Card>

      {/* Community Feed */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold mb-4">Community Feed</h3>

        {isLoading ? (
          <div className="text-center py-8">Loading posts...</div>
        ) : posts.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <p className="text-gray-500">No posts yet. Be the first!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className={post.status === "hidden" ? "bg-gray-50" : ""}>
              <CardHeader className="flex items-center gap-4 pb-2">
                <Avatar className="w-10 h-10">
                  <img src={post.authorAvatar} alt={`${post.author} - RV community member profile picture`} />
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{post.author}</h4>
                    {post.isOwnPost && <Badge variant="outline">You</Badge>}
                    {getStatusBadge(post)}
                  </div>
                  <p className="text-sm text-gray-500">{post.date}</p>
                </div>
              </CardHeader>
              <CardContent className={post.status === "hidden" ? "opacity-50" : ""}>
                {post.status === "hidden" && (
                  <div className="flex items-center gap-2 text-red-500 mb-3">
                    <AlertCircle size={16} />
                    <span className="text-sm">Hidden by community</span>
                  </div>
                )}
                <p className="whitespace-pre-line">{post.content}</p>
                {post.image && (
                  <img
                    src={post.image}
                    alt="Post image"
                    className="mt-4 rounded-md max-h-[300px] object-cover"
                  />
                )}
              </CardContent>
              <CardFooter className="border-t pt-4">
                <div className="flex gap-6 items-center w-full">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote(post.id, true)}
                    disabled={!user}
                    className={
                      userVotes[post.id.toString()] === true ? "text-green-600" : ""
                    } // Use post.id directly
                  >
                    <ThumbsUp size={18} /> {post.likes}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote(post.id, false)}
                    disabled={!user}
                    className={
                      userVotes[post.id.toString()] === false ? "text-red-600" : ""
                    } // Use post.id directly
                  >
                    <ThumbsDown size={18} />
                  </Button>
                  <Button variant="ghost" size="sm" className="flex items-center gap-1"
                    onClick={() => handleComment(post.id)}
                    disabled={!user}
                  >
                    <MessageSquare size={18} /> {post.comments}
                  </Button>
                  <div className="ml-auto">
                    <Button variant="ghost" size="sm" className="flex items-center gap-1"
                      onClick={() => handleShare(post.id, post.content)}
                    >
                      <Share2 size={18} /> Share
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Trending on Mobile */}
      <div className="lg:hidden mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3">Trending Topics</h3>
        <ul className="space-y-2">
          {trendingTopics.map((t, i) => (
            <li key={i} className="text-blue-600 hover:underline cursor-pointer">
              #{t}
            </li>
          ))}
        </ul>
      </div>

      {/* Comment Section Modal */}
      {openComments && (
        <CommentSection
          postId={openComments}
          isOpen={true}
          onClose={() => setOpenComments(null)}
        />
      )}
    </div>
  );
}
