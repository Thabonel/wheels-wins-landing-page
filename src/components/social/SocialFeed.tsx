
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "sonner";
import { MessageSquare, Heart, Share2 } from "lucide-react";
import { useSocialData } from "@/components/social/useSocialData";

export default function SocialFeed() {
  const [newPost, setNewPost] = useState("");
  const { posts, trendingTopics } = useSocialData();
  
  const handlePostSubmit = () => {
    if (!newPost.trim()) return;
    
    toast.success("Your post has been submitted for approval!");
    setNewPost("");
  };
  
  const handleLike = (postId: number) => {
    toast.success("Post liked!");
  };
  
  const handleComment = (postId: number) => {
    toast.info("Comments feature coming soon!");
  };
  
  const handleShare = (postId: number) => {
    toast.info("Share feature coming soon!");
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
          />
          <div className="flex justify-end">
            <Button onClick={handlePostSubmit}>
              Submit for Approval
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            *All posts require admin approval before appearing in the feed
          </div>
        </CardContent>
      </Card>
      
      {/* Feed posts */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold mb-4">Community Feed</h3>
        
        {posts.map((post) => (
          <Card key={post.id} className="mb-4">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <Avatar className="w-10 h-10">
                <img src={post.authorAvatar} alt={post.author} />
              </Avatar>
              <div>
                <h4 className="font-semibold">{post.author}</h4>
                <p className="text-sm text-gray-500">{post.date}</p>
              </div>
            </CardHeader>
            <CardContent>
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
                <Button variant="ghost" size="sm" onClick={() => handleLike(post.id)} className="flex items-center gap-1">
                  <Heart size={18} /> {post.likes}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleComment(post.id)} className="flex items-center gap-1">
                  <MessageSquare size={18} /> {post.comments}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleShare(post.id)} className="flex items-center gap-1 ml-auto">
                  <Share2 size={18} /> Share
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
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
