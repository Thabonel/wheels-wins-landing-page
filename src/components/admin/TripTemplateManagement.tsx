import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Edit,
  Trash2,
  Image,
  Star,
  Search,
  RefreshCw
} from 'lucide-react';
import TripScraperControl from './TripScraperControl';
import TripImageManager from './TripImageManager';
import TripPhotoManager from './TripPhotoManager';
import { TripTemplate } from '@/services/tripTemplateService';
import { Textarea } from '@/components/ui/textarea';

const TripTemplateManagement: React.FC = () => {
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<TripTemplate | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  // Form state for editing
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    estimatedDays: 0,
    estimatedMiles: 0,
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    suggestedBudget: 0,
    category: '',
    tags: [] as string[],
    status: 'draft' as 'draft' | 'published' | 'archived',
    is_featured: false,
    region: 'Australia'
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trip_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match TripTemplate interface
      const transformedData = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        estimatedDays: item.template_data?.estimatedDays || 0,
        estimatedMiles: item.template_data?.estimatedMiles || 0,
        difficulty: item.template_data?.difficulty || 'beginner',
        highlights: item.template_data?.highlights || [],
        suggestedBudget: item.template_data?.suggestedBudget || 0,
        route: item.template_data?.route || {},
        region: item.template_data?.region || 'Australia',
        category: item.category || 'general',
        tags: item.tags || [],
        usageCount: item.usage_count || 0,
        isPublic: item.is_public || false,
        createdBy: item.user_id,
        status: item.status || 'published',
        is_featured: item.is_featured || false,
        average_rating: item.average_rating,
        total_ratings: item.total_ratings || 0
      }));

      setTemplates(transformedData);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load trip templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: TripTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      estimatedDays: template.estimatedDays,
      estimatedMiles: template.estimatedMiles,
      difficulty: template.difficulty,
      suggestedBudget: template.suggestedBudget,
      category: template.category,
      tags: template.tags,
      status: template.status || 'published',
      is_featured: template.is_featured || false,
      region: template.region
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    try {
      const templateData = {
        name: formData.name,
        description: formData.description,
        template_data: {
          estimatedDays: formData.estimatedDays,
          estimatedMiles: formData.estimatedMiles,
          difficulty: formData.difficulty,
          suggestedBudget: formData.suggestedBudget,
          highlights: [],
          route: selectedTemplate.route,
          region: formData.region
        },
        category: formData.category,
        tags: formData.tags,
        status: formData.status,
        is_featured: formData.is_featured
      };

      const { error } = await supabase
        .from('trip_templates')
        .update(templateData)
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Trip template updated successfully'
      });

      setIsEditDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update trip template',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('trip_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Trip template deleted successfully'
      });

      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete trip template',
        variant: 'destructive'
      });
    }
  };

  const handleToggleFeatured = async (id: string, currentFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('trip_templates')
        .update({ is_featured: !currentFeatured })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Template ${!currentFeatured ? 'featured' : 'unfeatured'} successfully`
      });

      fetchTemplates();
    } catch (error) {
      console.error('Error toggling featured status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update featured status',
        variant: 'destructive'
      });
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || template.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      published: 'default',
      draft: 'secondary',
      archived: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trip Template Management</CardTitle>
          <CardDescription>
            Manage trip templates, scrape new routes, and handle user-generated content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="scraper">Scraper</TabsTrigger>
              <TabsTrigger value="images">Legacy Images</TabsTrigger>
              <TabsTrigger value="photos">Photo Manager</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-4">
              {/* Search and Filter Bar */}
              <div className="flex gap-4 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => setIsEditDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </Button>
              </div>

              {/* Templates Table */}
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                  <p className="mt-2 text-gray-600">Loading templates...</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Featured</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTemplates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell>{template.region}</TableCell>
                          <TableCell>{template.category}</TableCell>
                          <TableCell>{getStatusBadge(template.status || 'published')}</TableCell>
                          <TableCell>
                            {template.average_rating ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                <span>{template.average_rating}</span>
                                <span className="text-gray-500">({template.total_ratings})</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">No ratings</span>
                            )}
                          </TableCell>
                          <TableCell>{template.usageCount}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={template.is_featured ? "default" : "outline"}
                              onClick={() => handleToggleFeatured(template.id, template.is_featured || false)}
                            >
                              {template.is_featured ? (
                                <Star className="h-4 w-4 fill-current" />
                              ) : (
                                <Star className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(template)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setIsImageDialogOpen(true);
                                }}
                              >
                                <Image className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600"
                                onClick={() => handleDelete(template.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="scraper">
              <TripScraperControl onTemplatesScraped={fetchTemplates} />
            </TabsContent>

            <TabsContent value="images">
              <TripImageManager
                templateId={selectedTemplate?.id}
                onImagesUpdated={fetchTemplates}
              />
            </TabsContent>

            <TabsContent value="photos">
              <TripPhotoManager
                templateId={selectedTemplate?.id}
                templateName={selectedTemplate?.name}
                onPhotosUpdated={fetchTemplates}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Trip Template' : 'Add New Trip Template'}
            </DialogTitle>
            <DialogDescription>
              Update the template details and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedDays">Estimated Days</Label>
                <Input
                  id="estimatedDays"
                  type="number"
                  value={formData.estimatedDays}
                  onChange={(e) => setFormData({ ...formData, estimatedDays: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedMiles">Estimated Miles</Label>
                <Input
                  id="estimatedMiles"
                  type="number"
                  value={formData.estimatedMiles}
                  onChange={(e) => setFormData({ ...formData, estimatedMiles: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suggestedBudget">Suggested Budget ($)</Label>
                <Input
                  id="suggestedBudget"
                  type="number"
                  value={formData.suggestedBudget}
                  onChange={(e) => setFormData({ ...formData, suggestedBudget: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select 
                  value={formData.difficulty} 
                  onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => 
                    setFormData({ ...formData, difficulty: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: 'draft' | 'published' | 'archived') => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Select 
                  value={formData.region} 
                  onValueChange={(value) => setFormData({ ...formData, region: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Australia">Australia</SelectItem>
                    <SelectItem value="USA">USA</SelectItem>
                    <SelectItem value="Europe">Europe</SelectItem>
                    <SelectItem value="Asia">Asia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags.join(', ')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                })}
                placeholder="scenic, coastal, family-friendly"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="featured"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="featured">Featured Template</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Management Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Template Photos</DialogTitle>
            <DialogDescription>
              Upload and manually assign photos for {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <TripPhotoManager
              templateId={selectedTemplate.id}
              templateName={selectedTemplate.name}
              onPhotosUpdated={() => {
                fetchTemplates();
                setIsImageDialogOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TripTemplateManagement;