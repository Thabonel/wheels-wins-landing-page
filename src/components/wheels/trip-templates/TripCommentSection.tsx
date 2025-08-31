import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Fuel,
  UtensilsCrossed,
  MessageCircle,
  ThumbsUp,
  MapPin,
  Send,
  Shield,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  user_id: string;
  comment_type: 'review' | 'hazard' | 'fuel_tip' | 'food_tip' | 'general_tip';
  content: string;
  location_name?: string;
  is_verified: boolean;
  helpful_count: number;
  created_at: string;
  user: {
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
  userVote?: boolean;
}

interface TripCommentSectionProps {
  templateId: string;
  templateName: string;
}

const TripCommentSection: React.FC<TripCommentSectionProps> = ({
  templateId,
  templateName
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  
  // Comment form state
  const [commentForm, setCommentForm] = useState({
    type: 'review' as Comment['comment_type'],
    content: '',
    location_name: ''
  });

  useEffect(() => {
    fetchComments();
  }, [templateId, filterType]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('trip_template_comments')
        .select(`
          *,
          user:profiles!user_id (
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('template_id', templateId)
        .is('parent_id', null)
        .order('helpful_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('comment_type', filterType);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user's helpful votes if logged in
      if (user && data) {
        const commentIds = data.map(c => c.id);
        const { data: votes } = await supabase
          .from('trip_comment_helpful')
          .select('comment_id, is_helpful')
          .eq('user_id', user.id)
          .in('comment_id', commentIds);

        const votesMap = new Map(votes?.map(v => [v.comment_id, v.is_helpful]));
        
        const commentsWithVotes = data.map(comment => ({
          ...comment,
          userVote: votesMap.get(comment.id)
        }));

        setComments(commentsWithVotes);
      } else {
        setComments(data || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to leave a comment',
        variant: 'default'
      });
      return;
    }

    if (!commentForm.content.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a comment',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('trip_template_comments')
        .insert({
          template_id: templateId,
          user_id: user.id,
          comment_type: commentForm.type,
          content: commentForm.content,
          location_name: commentForm.location_name || null
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Your comment has been posted'
      });

      // Reset form
      setCommentForm({
        type: 'review',
        content: '',
        location_name: ''
      });
      setShowCommentForm(false);
      
      // Refresh comments
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpful = async (commentId: string, isHelpful: boolean) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to vote on comments',
        variant: 'default'
      });
      return;
    }

    try {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('trip_comment_helpful')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .single();

      if (existingVote) {
        // Update existing vote
        const { error } = await supabase
          .from('trip_comment_helpful')
          .update({ is_helpful: isHelpful })
          .eq('id', existingVote.id);

        if (error) throw error;
      } else {
        // Create new vote
        const { error } = await supabase
          .from('trip_comment_helpful')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            is_helpful: isHelpful
          });

        if (error) throw error;
      }

      // Refresh comments to update counts
      fetchComments();
    } catch (error) {
      console.error('Error voting on comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit vote',
        variant: 'destructive'
      });
    }
  };

  const getCommentIcon = (type: Comment['comment_type']) => {
    const icons = {
      review: MessageCircle,
      hazard: AlertTriangle,
      fuel_tip: Fuel,
      food_tip: UtensilsCrossed,
      general_tip: MessageCircle
    };
    return icons[type];
  };

  const getCommentColor = (type: Comment['comment_type']) => {
    const colors = {
      review: 'bg-blue-100 text-blue-800',
      hazard: 'bg-red-100 text-red-800',
      fuel_tip: 'bg-green-100 text-green-800',
      food_tip: 'bg-orange-100 text-orange-800',
      general_tip: 'bg-gray-100 text-gray-800'
    };
    return colors[type];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Community Tips & Reviews</CardTitle>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter comments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Comments</SelectItem>
                <SelectItem value="review">Reviews</SelectItem>
                <SelectItem value="hazard">Hazard Warnings</SelectItem>
                <SelectItem value="fuel_tip">Fuel Tips</SelectItem>
                <SelectItem value="food_tip">Food Tips</SelectItem>
                <SelectItem value="general_tip">General Tips</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowCommentForm(!showCommentForm)}
              variant={showCommentForm ? "secondary" : "default"}
            >
              {showCommentForm ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Hide Form
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Add Comment
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment Form */}
        {showCommentForm && (
          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <Select 
                  value={commentForm.type} 
                  onValueChange={(value: Comment['comment_type']) => 
                    setCommentForm({ ...commentForm, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="hazard">Hazard Warning</SelectItem>
                    <SelectItem value="fuel_tip">Fuel Tip</SelectItem>
                    <SelectItem value="food_tip">Food Tip</SelectItem>
                    <SelectItem value="general_tip">General Tip</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Location (Optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Near Mile Marker 45"
                  value={commentForm.location_name}
                  onChange={(e) => setCommentForm({ ...commentForm, location_name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Your Comment</label>
              <Textarea
                placeholder={
                  commentForm.type === 'hazard' 
                    ? "Describe the hazard and its location..."
                    : commentForm.type === 'fuel_tip'
                    ? "Share fuel station locations and prices..."
                    : commentForm.type === 'food_tip'
                    ? "Recommend great places to eat..."
                    : "Share your experience or tip..."
                }
                value={commentForm.content}
                onChange={(e) => setCommentForm({ ...commentForm, content: e.target.value })}
                rows={3}
              />
            </div>
            <Button 
              onClick={handleSubmitComment} 
              disabled={submitting || !commentForm.content.trim()}
              className="w-full"
            >
              {submitting ? (
                'Posting...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Post Comment
                </>
              )}
            </Button>
          </div>
        )}

        {/* Comments List */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No comments yet</p>
            <p className="text-sm mt-1">Be the first to share a tip or review!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const Icon = getCommentIcon(comment.comment_type);
              const colorClass = getCommentColor(comment.comment_type);
              
              return (
                <div key={comment.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={comment.user.avatar_url} />
                        <AvatarFallback>
                          {comment.user.full_name?.[0] || comment.user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">
                            {comment.user.full_name || comment.user.email.split('@')[0]}
                          </span>
                          <Badge className={colorClass}>
                            <Icon className="h-3 w-3 mr-1" />
                            {comment.comment_type.replace('_', ' ')}
                          </Badge>
                          {comment.is_verified && (
                            <Badge variant="outline" className="text-green-600">
                              <Shield className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        {comment.location_name && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                            <MapPin className="h-3 w-3" />
                            {comment.location_name}
                          </div>
                        )}
                        <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                          <button
                            onClick={() => handleHelpful(comment.id, true)}
                            className={`flex items-center gap-1 text-sm ${
                              comment.userVote === true ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
                            }`}
                          >
                            <ThumbsUp className="h-4 w-4" />
                            Helpful ({comment.helpful_count})
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TripCommentSection;