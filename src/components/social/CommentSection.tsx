import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useSocialPosts } from "@/hooks/useSocialPosts";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface CommentSectionProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CommentSection({ postId, isOpen, onClose }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const { createPost, isSubmitting } = useSocialPosts();

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, postId]);

  const loadComments = async () => {
    setIsLoading(true);
    // For now, just set empty comments since we don't have the comments functionality yet
    setComments([]);
    setIsLoading(false);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    const success = await createPost(newComment.trim());
    
    if (success) {
      setNewComment("");
      await loadComments(); // Refresh comments
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Comments</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-4">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <div className="w-full h-full bg-gray-300 rounded-full flex items-center justify-center text-xs">
                    {comment.user_id.substring(0, 2).toUpperCase()}
                  </div>
                </Avatar>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        User {comment.user_id.substring(0, 5)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {user && (
          <div className="p-4 border-t">
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <div className="w-full h-full bg-gray-300 rounded-full flex items-center justify-center text-xs">
                  {user.id.substring(0, 2).toUpperCase()}
                </div>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="min-h-[80px] resize-none"
                  disabled={isSubmitting}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmitting}
                    size="sm"
                  >
                    {isSubmitting ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!user && (
          <div className="p-4 border-t text-center text-muted-foreground">
            You must be logged in to comment
          </div>
        )}
      </Card>
    </div>
  );
}