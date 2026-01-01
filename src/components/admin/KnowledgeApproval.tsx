import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Eye, Clock, User, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PendingArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  difficulty_level: string;
  estimated_read_time: number;
  created_at: string;
  author_id: string;
}

export function KnowledgeApproval() {
  const [articles, setArticles] = useState<PendingArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<PendingArticle | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPendingArticles();
  }, []);

  const fetchPendingArticles = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || 'https://wheels-wins-backend-staging.onrender.com'}/api/v1/knowledge/admin/pending`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch pending articles');
      }

      const data = await response.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Error fetching pending articles:', error);
      toast.error('Failed to load pending articles');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (articleId: string) => {
    try {
      setActionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || 'https://wheels-wins-backend-staging.onrender.com'}/api/v1/knowledge/${articleId}/approve`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to approve article');
      }

      toast.success('Article approved successfully!');
      setSelectedArticle(null);
      fetchPendingArticles();
    } catch (error) {
      console.error('Error approving article:', error);
      toast.error('Failed to approve article');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (articleId: string) => {
    try {
      setActionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || 'https://wheels-wins-backend-staging.onrender.com'}/api/v1/knowledge/${articleId}/reject`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            rejection_reason: rejectionReason || undefined
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reject article');
      }

      toast.success('Article rejected');
      setSelectedArticle(null);
      setRejectionReason('');
      fetchPendingArticles();
    } catch (error) {
      console.error('Error rejecting article:', error);
      toast.error('Failed to reject article');
    } finally {
      setActionLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      shipping: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-orange-100 text-orange-800',
      travel_tips: 'bg-green-100 text-green-800',
      camping: 'bg-purple-100 text-purple-800',
      routes: 'bg-yellow-100 text-yellow-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.general;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading pending articles...</p>
      </div>
    );
  }

  if (selectedArticle) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedArticle(null);
              setRejectionReason('');
            }}
          >
            ← Back to List
          </Button>
          <div className="flex gap-2">
            <Button
              onClick={() => handleApprove(selectedArticle.id)}
              disabled={actionLoading}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
            <Button
              onClick={() => handleReject(selectedArticle.id)}
              disabled={actionLoading}
              variant="destructive"
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>

        {/* Article Preview */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <Badge className={getCategoryColor(selectedArticle.category)}>
                {selectedArticle.category.replace('_', ' ')}
              </Badge>
              {selectedArticle.difficulty_level && (
                <Badge variant="outline" className="capitalize">
                  {selectedArticle.difficulty_level}
                </Badge>
              )}
            </div>
            <CardTitle className="text-2xl">{selectedArticle.title}</CardTitle>
            {selectedArticle.excerpt && (
              <p className="text-gray-600 mt-2">{selectedArticle.excerpt}</p>
            )}
          </CardHeader>
          <CardContent>
            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6 pb-6 border-b">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {selectedArticle.estimated_read_time} min read
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(selectedArticle.created_at).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Author ID: {selectedArticle.author_id.slice(0, 8)}...
              </div>
            </div>

            {/* Tags */}
            {selectedArticle.tags && selectedArticle.tags.length > 0 && (
              <div className="mb-6">
                <Label className="mb-2 block">Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedArticle.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Content Preview */}
            <div>
              <Label className="mb-2 block">Content</Label>
              <div className="prose prose-sm max-w-none bg-gray-50 p-6 rounded-lg">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto my-6">
                        <table className="min-w-full divide-y divide-gray-200 border" {...props} />
                      </div>
                    ),
                    th: ({ node, ...props }) => (
                      <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="px-4 py-2 border text-sm text-gray-900" {...props} />
                    ),
                    code: ({ node, inline, ...props }: any) =>
                      inline ? (
                        <code className="bg-gray-100 rounded px-1 py-0.5 text-sm font-mono" {...props} />
                      ) : (
                        <code className="block bg-gray-900 text-gray-100 rounded p-4 overflow-x-auto text-sm font-mono" {...props} />
                      )
                  }}
                >
                  {selectedArticle.content}
                </ReactMarkdown>
              </div>
            </div>

            {/* Rejection Reason */}
            <div className="mt-6 pt-6 border-t">
              <Label htmlFor="rejectionReason" className="mb-2 block">
                Rejection Reason (optional)
              </Label>
              <Textarea
                id="rejectionReason"
                placeholder="Provide feedback to the author about why this was rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="mb-4"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pending Knowledge Articles</h2>
        <Button onClick={fetchPendingArticles} variant="outline">
          Refresh
        </Button>
      </div>

      {articles.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-600">No pending articles to review</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {articles.map((article) => (
            <Card key={article.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getCategoryColor(article.category)}>
                        {article.category.replace('_', ' ')}
                      </Badge>
                      {article.difficulty_level && (
                        <Badge variant="outline" className="capitalize">
                          {article.difficulty_level}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{article.title}</h3>
                    {article.excerpt && (
                      <p className="text-gray-600 mb-3 line-clamp-2">{article.excerpt}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {article.estimated_read_time} min
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(article.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectedArticle(article)}
                    variant="outline"
                    className="gap-2 ml-4"
                  >
                    <Eye className="h-4 w-4" />
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
