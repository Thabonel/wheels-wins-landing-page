
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Trash2, Edit3, FileText, Loader2 } from 'lucide-react';
import { useUserKnowledge } from '@/hooks/useUserKnowledge';
import { DocumentUploader } from './DocumentUploader';
import { KnowledgeBucketCard } from './KnowledgeBucketCard';

export const UserKnowledgeManager = () => {
  const { buckets, documents, loading, createBucket, updateBucket, deleteBucket } = useUserKnowledge();
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketDescription, setNewBucketDescription] = useState('');
  const [newBucketColor, setNewBucketColor] = useState('#3B82F6');

  const handleCreateBucket = async () => {
    if (!newBucketName.trim()) return;
    
    const bucket = await createBucket(newBucketName, newBucketDescription, newBucketColor);
    if (bucket) {
      setIsCreateDialogOpen(false);
      setNewBucketName('');
      setNewBucketDescription('');
      setNewBucketColor('#3B82F6');
    }
  };

  const selectedDocuments = selectedBucketId 
    ? documents.filter(doc => doc.bucket_id === selectedBucketId)
    : documents;

  if (loading && buckets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Personal Knowledge</h2>
          <p className="text-muted-foreground">
            Upload documents to help Pam understand your specific context and preferences
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Bucket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Knowledge Bucket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newBucketName}
                  onChange={(e) => setNewBucketName(e.target.value)}
                  placeholder="e.g., Travel Preferences, Business Info"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newBucketDescription}
                  onChange={(e) => setNewBucketDescription(e.target.value)}
                  placeholder="What kind of knowledge will this contain?"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newBucketColor}
                    onChange={(e) => setNewBucketColor(e.target.value)}
                    className="w-12 h-8 rounded border cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">{newBucketColor}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBucket} disabled={!newBucketName.trim()}>
                  Create Bucket
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {buckets.map((bucket) => (
          <KnowledgeBucketCard
            key={bucket.id}
            bucket={bucket}
            documentCount={documents.filter(doc => doc.bucket_id === bucket.id).length}
            onUpdate={updateBucket}
            onDelete={deleteBucket}
            onSelect={() => setSelectedBucketId(selectedBucketId === bucket.id ? null : bucket.id)}
            isSelected={selectedBucketId === bucket.id}
          />
        ))}
      </div>

      {buckets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No knowledge buckets yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first knowledge bucket to start uploading documents that will help Pam understand your context.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Bucket
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedBucketId && (
        <DocumentUploader 
          bucketId={selectedBucketId}
          bucketName={buckets.find(b => b.id === selectedBucketId)?.name || ''}
          documents={selectedDocuments}
        />
      )}
    </div>
  );
};
