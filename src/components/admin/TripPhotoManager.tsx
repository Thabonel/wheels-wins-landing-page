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
  Trash2,
  Plus,
  RefreshCw,
  X,
  Camera,
  Link,
  Check,
  AlertCircle
} from 'lucide-react';

interface TripPhotoManagerProps {
  templateId?: string;
  templateName?: string;
  onPhotosUpdated?: () => void;
}

const TripPhotoManager: React.FC<TripPhotoManagerProps> = ({
  templateId,
  templateName,
  onPhotosUpdated
}) => {
  const [currentPhotos, setCurrentPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (templateId) {
      fetchCurrentPhotos();
    }
  }, [templateId]);

  const fetchCurrentPhotos = async () => {
    if (!templateId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trip_templates')
        .select('media_urls')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      const photos = data?.media_urls || [];
      setCurrentPhotos(Array.isArray(photos) ? photos : []);
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast({
        title: 'Error',
        description: 'Failed to load current photos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePhotosInDatabase = async (newPhotos: string[]) => {
    if (!templateId) return false;

    try {
      const { error } = await supabase
        .from('trip_templates')
        .update({ media_urls: newPhotos })
        .eq('id', templateId);

      if (error) throw error;

      setCurrentPhotos(newPhotos);
      if (onPhotosUpdated) onPhotosUpdated();
      return true;
    } catch (error) {
      console.error('Error updating photos:', error);
      toast({
        title: 'Error',
        description: 'Failed to update photos in database',
        variant: 'destructive'
      });
      return false;
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !templateId) return;

    setUploading(true);
    const uploadPromises = [];
    const newPhotoUrls = [...currentPhotos];

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

      const fileExt = file.name.split('.').pop();
      const fileName = `trip-images/${templateId}-${Date.now()}-${i}.${fileExt}`;
      uploadPromises.push(uploadSingleFile(file, fileName));
    }

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(r => r !== null) as string[];

      if (successfulUploads.length > 0) {
        const updatedPhotos = [...newPhotoUrls, ...successfulUploads];
        const success = await updatePhotosInDatabase(updatedPhotos);

        if (success) {
          toast({
            title: 'Success',
            description: `Uploaded ${successfulUploads.length} photo(s) successfully`
          });
        }
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload some photos',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const uploadSingleFile = async (file: File, fileName: string): Promise<string | null> => {
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('trip-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('trip-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
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

  const addPhotoByUrl = async () => {
    if (!newPhotoUrl.trim() || !templateId) return;

    try {
      const updatedPhotos = [...currentPhotos, newPhotoUrl.trim()];
      const success = await updatePhotosInDatabase(updatedPhotos);

      if (success) {
        setNewPhotoUrl('');
        toast({
          title: 'Success',
          description: 'Photo URL added successfully'
        });
      }
    } catch (error) {
      console.error('Error adding photo URL:', error);
      toast({
        title: 'Error',
        description: 'Failed to add photo URL',
        variant: 'destructive'
      });
    }
  };

  const removePhoto = async (index: number) => {
    if (!confirm('Are you sure you want to remove this photo?')) return;

    try {
      const updatedPhotos = currentPhotos.filter((_, i) => i !== index);
      const success = await updatePhotosInDatabase(updatedPhotos);

      if (success) {
        toast({
          title: 'Success',
          description: 'Photo removed successfully'
        });
      }
    } catch (error) {
      console.error('Error removing photo:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove photo',
        variant: 'destructive'
      });
    }
  };

  const clearAllPhotos = async () => {
    if (!confirm('Are you sure you want to remove ALL photos from this template?')) return;

    try {
      const success = await updatePhotosInDatabase([]);

      if (success) {
        toast({
          title: 'Success',
          description: 'All photos cleared successfully'
        });
      }
    } catch (error) {
      console.error('Error clearing photos:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear photos',
        variant: 'destructive'
      });
    }
  };

  if (!templateId) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Camera className="h-12 w-12 mx-auto mb-2 text-gray-300" />
        <p>Select a template to manage photos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Photo Management</h3>
          <p className="text-sm text-gray-500">
            Managing photos for: <strong>{templateName}</strong>
          </p>
        </div>
        {currentPhotos.length > 0 && (
          <Button variant="destructive" size="sm" onClick={clearAllPhotos}>
            Clear All Photos
          </Button>
        )}
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Photos
          </CardTitle>
          <CardDescription>
            Drag and drop photos or click to browse. Photos will be uploaded to Supabase storage.
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
              id="photo-upload"
              className="hidden"
              multiple
              accept="image/*"
              onChange={(e) => handleFileUpload(e.target.files)}
              disabled={uploading}
            />
            <label htmlFor="photo-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">
                {uploading ? 'Uploading...' : 'Drop photos here or click to browse'}
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

      {/* Add Photo by URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Add Photo by URL
          </CardTitle>
          <CardDescription>
            Add photos that are already hosted online (including existing Supabase photos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/photo.jpg or https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/..."
              value={newPhotoUrl}
              onChange={(e) => setNewPhotoUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPhotoByUrl()}
            />
            <Button onClick={addPhotoByUrl} disabled={!newPhotoUrl.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Photos */}
      <Card>
        <CardHeader>
          <CardTitle>Current Photos ({currentPhotos.length})</CardTitle>
          <CardDescription>
            Photos currently assigned to this template. First photo is the primary image.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-2 text-gray-600">Loading photos...</p>
            </div>
          ) : currentPhotos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Image className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No photos assigned yet</p>
              <p className="text-sm">Upload photos or add by URL to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentPhotos.map((photoUrl, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="relative">
                    <img
                      src={photoUrl}
                      alt={`Photo ${index + 1}`}
                      className="w-20 h-20 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00MCAyNUM0Ni42Mjc0IDI1IDUyIDMwLjM3MjYgNTIgMzdDNTIgNDMuNjI3NCA0Ni42Mjc0IDQ5IDQwIDQ5QzMzLjM3MjYgNDkgMjggNDMuNjI3NCAyOCAzN0MyOCAzMC4zNzI2IDMzLjM3MjYgMjUgNDAgMjVaIiBmaWxsPSIjOTU5REE2Ii8+CjxwYXRoIGQ9Ik0yMCA1NUw2MCA1NUw1MCA0MEwyMCA1NVoiIGZpbGw9IiM5NTlEQTYiLz4KPC9zdmc+';
                      }}
                    />
                    {index === 0 && (
                      <Badge className="absolute -top-2 -right-2 text-xs">Primary</Badge>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Photo {index + 1}</p>
                    <p className="text-xs text-gray-500 break-all">{photoUrl}</p>
                    {index === 0 && (
                      <p className="text-xs text-blue-600">This is the primary photo shown in templates</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removePhoto(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Quick Reference
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Storage Location:</strong> Photos are stored in the Supabase 'trip-images' bucket</p>
          <p><strong>Primary Photo:</strong> The first photo in the list is used as the main template image</p>
          <p><strong>URL Format:</strong> https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/filename.jpg</p>
          <p><strong>Supported Formats:</strong> JPG, PNG, GIF up to 10MB each</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TripPhotoManager;