import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Eye, ThumbsUp, ThumbsDown, Download, Printer, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  difficulty_level: string;
  estimated_read_time: number;
  views: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export default function KnowledgeArticle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [userFeedback, setUserFeedback] = useState<boolean | null>(null);

  useEffect(() => {
    if (id) {
      fetchArticle();
      if (user) {
        fetchUserFeedback();
      }
    }
  }, [id, user]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('community_knowledge')
        .select('*')
        .eq('id', id)
        .eq('status', 'approved')
        .single();

      if (error) throw error;
      setArticle(data as any);
    } catch (error) {
      console.error('Error fetching article:', error);
      toast.error('Article not found');
      navigate('/knowledge');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserFeedback = async () => {
    if (!user || !id) return;

    try {
      const { data } = await supabase
        .from('community_knowledge_feedback')
        .select('is_helpful')
        .eq('article_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setUserFeedback(data.is_helpful);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
    }
  };

  const submitFeedback = async (isHelpful: boolean) => {
    if (!user) {
      toast.error('Please sign in to provide feedback');
      return;
    }

    try {
      const { error } = await supabase
        .from('community_knowledge_feedback')
        .upsert({
          article_id: id,
          user_id: user.id,
          is_helpful: isHelpful
        });

      if (error) throw error;

      setUserFeedback(isHelpful);
      toast.success('Thank you for your feedback!');

      // Refresh article to get updated helpful_count
      fetchArticle();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.title,
          text: article?.excerpt,
          url: url
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
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
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/knowledge')}
          className="mb-6 print:hidden"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Knowledge Center
        </Button>

        {/* Article Card */}
        <Card>
          <CardContent className="p-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge className={getCategoryColor(article.category)}>
                  {article.category.replace('_', ' ')}
                </Badge>
                {article.difficulty_level && (
                  <Badge variant="outline" className="capitalize">
                    {article.difficulty_level}
                  </Badge>
                )}
              </div>

              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {article.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {article.estimated_read_time} min read
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {article.views} views
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4" />
                  {article.helpful_count} found helpful
                </div>
              </div>

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-8 print:hidden">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleShare} variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            {/* Article Content */}
            <div className="prose prose-lg max-w-none mb-8">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom table styling
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
                  // Checkbox styling
                  input: ({ node, ...props }) => (
                    <input className="mr-2" {...props} />
                  ),
                  // Code block styling
                  code: ({ node, inline, ...props }: any) =>
                    inline ? (
                      <code className="bg-gray-100 rounded px-1 py-0.5 text-sm font-mono" {...props} />
                    ) : (
                      <code className="block bg-gray-900 text-gray-100 rounded p-4 overflow-x-auto text-sm font-mono" {...props} />
                    )
                }}
              >
                {article.content}
              </ReactMarkdown>
            </div>

            {/* Feedback Section */}
            <div className="border-t pt-8 print:hidden">
              <h3 className="text-lg font-semibold mb-4">Was this guide helpful?</h3>
              <div className="flex gap-4">
                <Button
                  variant={userFeedback === true ? "default" : "outline"}
                  onClick={() => submitFeedback(true)}
                  className="gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Yes
                </Button>
                <Button
                  variant={userFeedback === false ? "default" : "outline"}
                  onClick={() => submitFeedback(false)}
                  className="gap-2"
                >
                  <ThumbsDown className="h-4 w-4" />
                  No
                </Button>
              </div>
              {userFeedback !== null && (
                <p className="text-sm text-gray-600 mt-2">
                  Thank you for your feedback!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
