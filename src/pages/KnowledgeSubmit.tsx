import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Plus, X, BookOpen, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function KnowledgeSubmit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'general',
    difficulty_level: 'beginner',
    estimated_read_time: 5,
    tags: [] as string[]
  });

  const [tagInput, setTagInput] = useState('');

  const categories = [
    { value: 'shipping', label: 'Shipping' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'travel_tips', label: 'Travel Tips' },
    { value: 'camping', label: 'Camping' },
    { value: 'routes', label: 'Routes' },
    { value: 'general', label: 'General' }
  ];

  const difficultyLevels = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to submit a guide');
      navigate('/login');
      return;
    }

    // Validation
    if (formData.title.length < 5) {
      toast.error('Title must be at least 5 characters');
      return;
    }

    if (formData.content.length < 100) {
      toast.error('Content must be at least 100 characters');
      return;
    }

    try {
      setLoading(true);

      // Get user's auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication required');
        navigate('/login');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://wheels-wins-backend-staging.onrender.com'}/api/v1/knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to submit article');
      }

      toast.success('Guide submitted successfully! It will be reviewed by our team.');
      navigate('/knowledge');

    } catch (error) {
      console.error('Error submitting article:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit guide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/knowledge')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Wisdom Library
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpen className="h-10 w-10 text-blue-600" />
            Submit Your Guide
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Share your knowledge and experience with the overlanding community
          </p>
        </div>

        {/* Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Before submitting:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Ensure your content is original or properly attributed</li>
                  <li>Use markdown formatting for better readability</li>
                  <li>Include practical tips and real-world examples</li>
                  <li>Your submission will be reviewed before being published</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submission Form */}
        <Card>
          <CardHeader>
            <CardTitle>Guide Details</CardTitle>
            <CardDescription>
              Fill in the details below. Fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Complete Guide to RV Electrical Systems"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  minLength={5}
                  maxLength={200}
                />
                <p className="text-xs text-gray-500">{formData.title.length}/200 characters</p>
              </div>

              {/* Excerpt */}
              <div className="space-y-2">
                <Label htmlFor="excerpt">Short Description</Label>
                <Textarea
                  id="excerpt"
                  placeholder="Brief summary of what this guide covers..."
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  maxLength={500}
                  rows={3}
                />
                <p className="text-xs text-gray-500">{formData.excerpt.length}/500 characters</p>
              </div>

              {/* Category and Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level *</Label>
                  <Select
                    value={formData.difficulty_level}
                    onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
                  >
                    <SelectTrigger id="difficulty">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Estimated Read Time */}
              <div className="space-y-2">
                <Label htmlFor="readTime">Estimated Read Time (minutes)</Label>
                <Input
                  id="readTime"
                  type="number"
                  min={1}
                  max={120}
                  value={formData.estimated_read_time}
                  onChange={(e) => setFormData({ ...formData, estimated_read_time: parseInt(e.target.value) || 5 })}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    placeholder="Add tags (max 10)..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    disabled={formData.tags.length >= 10}
                  />
                  <Button
                    type="button"
                    onClick={addTag}
                    disabled={!tagInput.trim() || formData.tags.length >= 10}
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500">{formData.tags.length}/10 tags</p>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Content * (Markdown supported)</Label>
                <Textarea
                  id="content"
                  placeholder="Write your guide here... You can use markdown formatting:&#10;&#10;# Heading 1&#10;## Heading 2&#10;&#10;**Bold text**&#10;*Italic text*&#10;&#10;- List item 1&#10;- List item 2&#10;&#10;[Link text](https://example.com)&#10;&#10;```code block```"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  minLength={100}
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500">{formData.content.length} characters (min 100)</p>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading || formData.title.length < 5 || formData.content.length < 100}
                  className="flex-1 gap-2"
                >
                  <Send className="h-4 w-4" />
                  {loading ? 'Submitting...' : 'Submit Guide'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/knowledge')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>

              {/* Help Text */}
              <p className="text-sm text-gray-500 text-center">
                Your submission will be reviewed by our team before being published
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
