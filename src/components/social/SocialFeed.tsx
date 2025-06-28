import { useState, useEffect } from "react";
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

  const { user } = useAuth();
  const { createPost, votePost } = useSocialPosts();

  useEffect(() => {
    fetchPosts();
    if (user) fetchUserVotes();

    // Realtime subscription: only for feed posts
    const channel = supabase
      .channel("public:social_posts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "social_posts",
          filter: "location=eq.feed"
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
          `id, content, image_url, created_at, status, location, group_id, upvotes, downvotes, comments_count, author_id`
        )
        .eq("location", "feed")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = data?.map((post) => ({
        id: post.id.toString(), // Ensure ID is string
        author: `User ${post.author_id?.substring(0, 5) || "Unknown"}`,
        authorAvatar: supabase.storage.from("public-assets").getPublicUrl("avatar-placeholder.png").data.publicUrl,
        date: new Date(post.created_at).toLocaleDateString(),
        content: post.content,
        image: post.image_url || undefined,
        likes: post.upvotes ?? 0,
        comments: post.comments_count ?? 0,
        status: post.status,
        location: post.location,
        groupId: post.group_id,
        isOwnPost: user?.id === post.author_id,
      })) || [];

      setPosts(formatted);
    } catch (err) {
      console.error("Error fetching posts:", err);
      toast.error("Failed to load posts");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserVotes = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("post_votes")
        .select("post_id, vote_type")
        .eq("user_id", user.id);

      if (error) throw error;

      const votes: Record<string, boolean> = {};
      data?.forEach((v) => {
        votes[v.post_id] = v.vote_type;
      });
      setUserVotes(votes);
    } catch (err) {
      console.error("Error fetching votes:", err);
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
                  <img src={post.authorAvatar} alt={post.author} />
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
                  <Button variant="ghost" size="sm" className="flex items-center gap-1">
                    <MessageSquare size={18} /> {post.comments}
                  </Button>
                  <div className="ml-auto">
                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
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
    </div>
  );
}
