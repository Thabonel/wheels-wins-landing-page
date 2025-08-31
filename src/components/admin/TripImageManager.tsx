import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Image,
  Upload,
  Search,
  Trash2,
  Star,
  Download,
  Eye,
  X,
  Plus,
  RefreshCw,
  Grid,
  List,
  Camera
} from 'lucide-react';

interface TripImage {
  id: string;
  template_id: string;
  image_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  is_primary: boolean;
  source: 'scraper' | 'upload' | 'user';
  display_order: number;
  created_at: string;
}

interface TripImageManagerProps {
  templateId?: string;
  onImagesUpdated?: () => void;
}

const TripImageManager: React.FC<TripImageManagerProps> = ({ templateId, onImagesUpdated }) => {
  const [images, setImages] = useState<TripImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedImage, setSelectedImage] = useState<TripImage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  // Image search API configuration (you can use Unsplash, Pexels, etc.)
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (templateId) {
      fetchImages();
    }
  }, [templateId]);

  const fetchImages = async () => {
    if (!templateId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trip_template_images')
        .select('*')
        .eq('template_id', templateId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast({
        title: 'Error',
        description: 'Failed to load images',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !templateId) return;

    setUploading(true);
    const uploadPromises = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file',
          description: `${file.name} is not an image`,
          variant: 'destructive'
        });
        continue;
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `trip-templates/${templateId}/${Date.now()}-${i}.${fileExt}`;

      uploadPromises.push(uploadImage(file, fileName));
    }

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(r => r !== null);

      if (successfulUploads.length > 0) {
        toast({
          title: 'Success',
          description: `Uploaded ${successfulUploads.length} image(s) successfully`
        });
        fetchImages();
        if (onImagesUpdated) onImagesUpdated();
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload some images',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const uploadImage = async (file: File, fileName: string) => {
    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('trip-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('trip-images')
        .getPublicUrl(fileName);

      // Create thumbnail URL (in production, you'd generate actual thumbnails)
      const thumbnailUrl = publicUrl; // For now, using same URL

      // Save to database
      const { error: dbError } = await supabase
        .from('trip_template_images')
        .insert({
          template_id: templateId,
          image_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          source: 'upload',
          display_order: images.length,
          is_primary: images.length === 0 // First image is primary by default
        });

      if (dbError) throw dbError;

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, [templateId]);

  const deleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const { error } = await supabase
        .from('trip_template_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Image deleted successfully'
      });

      fetchImages();
      if (onImagesUpdated) onImagesUpdated();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete image',
        variant: 'destructive'
      });
    }
  };

  const setPrimaryImage = async (imageId: string) => {
    if (!templateId) return;

    try {
      // First, unset all images as primary
      await supabase
        .from('trip_template_images')
        .update({ is_primary: false })
        .eq('template_id', templateId);

      // Then set the selected image as primary
      const { error } = await supabase
        .from('trip_template_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Primary image updated'
      });

      fetchImages();
      if (onImagesUpdated) onImagesUpdated();
    } catch (error) {
      console.error('Error setting primary image:', error);
      toast({
        title: 'Error',
        description: 'Failed to set primary image',
        variant: 'destructive'
      });
    }
  };

  const searchImages = async () => {
    if (!imageSearchQuery) return;

    setSearching(true);
    try {
      // This is a mock search - in production, you'd use a real image API
      // like Unsplash, Pexels, or Google Custom Search
      const mockResults = [
        {
          id: '1',
          url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
          thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200',
          description: 'Mountain landscape'
        },
        {
          id: '2',
          url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800',
          thumbnail: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200',
          description: 'Road trip'
        },
        {
          id: '3',
          url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29',
          thumbnail: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=200',
          description: 'Golden Gate Bridge'
        }
      ];

      setSearchResults(mockResults);
      
      toast({
        title: 'Search Complete',
        description: `Found ${mockResults.length} images for "${imageSearchQuery}"`
      });
    } catch (error) {
      console.error('Error searching images:', error);
      toast({
        title: 'Error',
        description: 'Failed to search images',
        variant: 'destructive'
      });
    } finally {
      setSearching(false);
    }
  };

  const addSearchedImage = async (imageUrl: string, thumbnail: string) => {
    if (!templateId) return;

    try {
      const { error } = await supabase
        .from('trip_template_images')
        .insert({
          template_id: templateId,
          image_url: imageUrl,
          thumbnail_url: thumbnail,
          source: 'scraper',
          display_order: images.length,
          is_primary: images.length === 0
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Image added successfully'
      });

      fetchImages();
      setSearchResults([]);
      setImageSearchQuery('');
      if (onImagesUpdated) onImagesUpdated();
    } catch (error) {
      console.error('Error adding image:', error);
      toast({
        title: 'Error',
        description: 'Failed to add image',
        variant: 'destructive'
      });
    }
  };

  if (!templateId) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Camera className="h-12 w-12 mx-auto mb-2 text-gray-300" />
        <p>Select a template to manage images</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Images
          </CardTitle>
          <CardDescription>
            Drag and drop images or click to browse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="image-upload"
              className="hidden"
              multiple
              accept="image/*"
              onChange={(e) => handleFileUpload(e.target.files)}
              disabled={uploading}
            />
            <label htmlFor="image-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">
                {uploading ? 'Uploading...' : 'Drop images here or click to browse'}
              </p>
              <p className="text-sm text-gray-500">
                Supports JPG, PNG, GIF up to 10MB each
              </p>
              {uploading && (
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mt-4 text-blue-600" />
              )}
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Image Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search for Images
          </CardTitle>
          <CardDescription>
            Find representative images from online sources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search for images (e.g., 'Great Ocean Road', 'Australian outback')"
              value={imageSearchQuery}
              onChange={(e) => setImageSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchImages()}
            />
            <Button onClick={searchImages} disabled={searching}>
              {searching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {searchResults.map((result) => (
                <div key={result.id} className="relative group">
                  <img
                    src={result.thumbnail}
                    alt={result.description}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <Button
                      size="sm"
                      onClick={() => addSearchedImage(result.url, result.thumbnail)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Images */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Current Images ({images.length})</CardTitle>
              <CardDescription>
                Manage template images and set primary image
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-2 text-gray-600">Loading images...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Image className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No images uploaded yet</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-3 gap-4">
              {images.map((image) => (
                <div key={image.id} className="relative group">
                  <img
                    src={image.thumbnail_url || image.image_url}
                    alt={image.caption || 'Template image'}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  {image.is_primary && (
                    <Badge className="absolute top-2 left-2">
                      <Star className="h-3 w-3 mr-1" />
                      Primary
                    </Badge>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedImage(image)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!image.is_primary && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPrimaryImage(image.id)}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteImage(image.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {images.map((image) => (
                <div key={image.id} className="flex items-center gap-4 p-2 border rounded-lg">
                  <img
                    src={image.thumbnail_url || image.image_url}
                    alt={image.caption || 'Template image'}
                    className="w-20 h-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{image.caption || 'No caption'}</p>
                    <p className="text-sm text-gray-500">
                      Source: {image.source} • Added: {new Date(image.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {image.is_primary && (
                      <Badge>
                        <Star className="h-3 w-3 mr-1" />
                        Primary
                      </Badge>
                    )}
                    {!image.is_primary && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPrimaryImage(image.id)}
                      >
                        Set Primary
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => deleteImage(image.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedImage.image_url}
              alt={selectedImage.caption || 'Template image'}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <Button
              className="absolute top-4 right-4"
              variant="secondary"
              size="sm"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripImageManager;