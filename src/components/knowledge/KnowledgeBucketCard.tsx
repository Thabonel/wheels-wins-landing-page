
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/common/AnimatedDialog";
import { Badge } from '@/components/ui/badge';
import { Edit3, Trash2, FileText, Folder } from 'lucide-react';
import type { UserKnowledgeBucket } from '@/types/knowledgeTypes';

interface KnowledgeBucketCardProps {
  bucket: UserKnowledgeBucket;
  documentCount: number;
  onUpdate: (bucketId: string, updates: Partial<UserKnowledgeBucket>) => Promise<boolean>;
  onDelete: (bucketId: string) => Promise<boolean>;
  onSelect: () => void;
  isSelected: boolean;
}

export const KnowledgeBucketCard = ({
  bucket,
  documentCount,
  onUpdate,
  onDelete,
  onSelect,
  isSelected
}: KnowledgeBucketCardProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState(bucket.name);
  const [editDescription, setEditDescription] = useState(bucket.description || '');
  const [editColor, setEditColor] = useState(bucket.color);

  const handleUpdate = async () => {
    const success = await onUpdate(bucket.id, {
      name: editName,
      description: editDescription,
      color: editColor
    });
    
    if (success) {
      setIsEditDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this knowledge bucket? This action cannot be undone.')) {
      await onDelete(bucket.id);
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: bucket.color }}
            />
            <CardTitle className="text-lg">{bucket.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Edit3 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Knowledge Bucket</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-12 h-8 rounded border cursor-pointer"
                      />
                      <span className="text-sm text-gray-600">{editColor}</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdate} disabled={!editName.trim()}>
                      Update Bucket
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
        {bucket.description && (
          <p className="text-sm text-muted-foreground">{bucket.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {documentCount} document{documentCount !== 1 ? 's' : ''}
            </span>
          </div>
          {isSelected && (
            <Badge variant="default" className="text-xs">
              Selected
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
