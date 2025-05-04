
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
import { SocialPost, PostVote } from "./types";
import { useSocialPosts } from "@/hooks/useSocialPosts";

export default function SocialFeed() {
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([
    "SolarPanels", "BoonDocking", "RVLife", "VanLife", "OffGrid"
  ]);
  const [userVotes, setUserVotes] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const { user } = useAuth();
  const { createPost, votePost, isSubmitting } = useSocialPosts();
  
  useEffect(() => {
    fetchPosts();
    if (user) {
      fetchUserVotes();
    }
    // Set up realtime subscription to posts
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_posts'
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  
  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      
      const { data: postsData, error } = await supabase
        .from('social_posts')
        .select(`
          id,
          content,
          image_url,
          created_at,
          status,
          location,
          group_id,
          upvotes,
          downvotes,
          comments_count,
          author_id
        `)
        .eq('location', 'feed')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching posts:", error);
        toast.error("Failed to load posts");
        return;
      }
      
      if (!postsData) {
        setPosts([]);
        return;
      }
      
      // Format posts for display
      const formattedPosts: SocialPost[] = postsData.map(post => ({
        id: post.id,
        author: `User ${post.author_id?.substring(0, 5) || 'Unknown'}`,
        authorAvatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png",
        date: new Date(post.created_at).toLocaleDateString(),
        content: post.content,
        image: post.image_url || undefined,
        likes: post.upvotes || 0,
        comments: post.comments_count || 0,
        status: post.status,
        location: post.location,
        groupId: post.group_id,
        isOwnPost: user && post.author_id === user.id
      }));
      
      setPosts(formattedPosts);
    } catch (err) {
      console.error("Error in fetchPosts:", err);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchUserVotes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('post_votes')
        .select('post_id, vote_type')
        .eq('user_id', user.id);
        
      if (error) {
        console.error("Error fetching user votes:", error);
        return;
      }
      
      if (data) {
        const votes: Record<string, boolean> = {};
        data.forEach(vote => {
          votes[vote.post_id] = vote.vote_type;
        });
        setUserVotes(votes);
      }
    } catch (err) {
      console.error("Error in fetchUserVotes:", err);
    }
  };
  
  const handlePostSubmit = async () => {
    if (!newPost.trim()) return;
    
    const result = await createPost(newPost);
    if (result) {
      setNewPost("");
      await fetchPosts();
    }
  };
  
  const handleVote = async (postId: string, isUpvote: boolean) => {
    const success = await votePost(postId, isUpvote);
    if (success) {
      // Optimistically update UI
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            // Calculate new vote counts
            let newLikes = post.likes;
            
            // If user already voted on this post
            if (postId in userVotes) {
              // If changing vote type
              if (userVotes[postId] !== isUpvote) {
                newLikes = isUpvote ? newLikes + 2 : newLikes - 2;
              } 
              // If removing same vote type
              else {
                newLikes = isUpvote ? newLikes - 1 : newLikes + 1;
              }
            } 
            // If new vote
            else {
              newLikes = isUpvote ? newLikes + 1 : newLikes - 1;
            }
            
            // Update post status if it gets 10 or more downvotes
            let newStatus = post.status;
            if (!isUpvote && (10 - newLikes >= 10)) {
              newStatus = 'hidden';
            }
            
            return { ...post, likes: newLikes, status: newStatus };
          }
          return post;
        })
      );
      
      // Update local user votes state
      setUserVotes(prev => {
        const newVotes = { ...prev };
        // If user already voted the same way, remove the vote
        if (prev[postId] === isUpvote) {
          delete newVotes[postId];
        } else {
          // Otherwise, set or update the vote
          newVotes[postId] = isUpvote;
        }
        return newVotes;
      });
      
      fetchPosts(); // Refresh to get accurate counts
    }
  };

  const getPostStatusBadge = (post: SocialPost) => {
    if (post.status === 'pending') {
      return <Badge className="bg-amber-500">Pending Approval</Badge>;
    }
    if (post.status === 'hidden') {
      return <Badge className="bg-red-500">Hidden by Community</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <div className="bg-blue-50 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-4">Pam's Community Insights</h2>
        <div className="space-y-3">
          <p className="text-gray-700">
            <span className="font-semibold">Today's hot topics:</span> Solar power upgrades, Arizona winter meetups, and budget-friendly campgrounds.
          </p>
          <p className="text-gray-700">
            <span className="font-semibold">Community mood:</span> Excited about the upcoming travel season!
          </p>
        </div>
      </div>
      
      {/* New post creation */}
      <Card className="border-2 border-blue-100">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-3">Create a new post</h3>
          <Textarea 
            value={newPost} 
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share your travel updates, questions, or stories..."
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
            <div className="text-xs text-red-500 mt-2">
              You need to be logged in to post
            </div>
          ) : (
            <div className="text-xs text-gray-500 mt-2">
              Feed posts are automatically approved but may be hidden if they receive 10+ downvotes
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Feed posts */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold mb-4">Community Feed</h3>
        
        {isLoading ? (
          <div className="text-center py-8">Loading posts...</div>
        ) : posts.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <p className="text-gray-500">No posts yet. Be the first to share!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className={`mb-4 ${post.status === 'hidden' ? 'bg-gray-50' : ''}`}>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Avatar className="w-10 h-10">
                  <img src={post.authorAvatar} alt={post.author} />
                </Avatar>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{post.author}</h4>
                    {post.isOwnPost && <Badge variant="outline">You</Badge>}
                    {getPostStatusBadge(post)}
                  </div>
                  <p className="text-sm text-gray-500">{post.date}</p>
                </div>
              </CardHeader>
              <CardContent className={post.status === 'hidden' ? 'opacity-50' : ''}>
                {post.status === 'hidden' && (
                  <div className="flex items-center gap-2 text-red-500 mb-3">
                    <AlertCircle size={16} />
                    <p className="text-sm">This post has been hidden due to community feedback</p>
                  </div>
                )}
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
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleVote(post.id.toString(), true)} 
                    disabled={!user}
                    className={`flex items-center gap-1 ${userVotes[post.id.toString()] === true ? 'text-green-600' : ''}`}
                  >
                    <ThumbsUp size={18} /> {post.likes}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleVote(post.id.toString(), false)}
                    disabled={!user} 
                    className={`flex items-center gap-1 ${userVotes[post.id.toString()] === false ? 'text-red-600' : ''}`}
                  >
                    <ThumbsDown size={18} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center gap-1"
                  >
                    <MessageSquare size={18} /> {post.comments}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center gap-1 ml-auto"
                  >
                    <Share2 size={18} /> Share
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
      
      {/* Trending topics sidebar */}
      <div className="lg:hidden mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3">Trending Topics</h3>
        <ul className="space-y-2">
          {trendingTopics.map((topic, index) => (
            <li key={index} className="text-blue-600 hover:underline cursor-pointer">
              #{topic}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
