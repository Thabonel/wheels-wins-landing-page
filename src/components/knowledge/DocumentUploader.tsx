
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Trash2, Eye, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useUserKnowledge } from '@/hooks/useUserKnowledge';
import type { UserKnowledgeDocument } from '@/types/knowledgeTypes';

interface DocumentUploaderProps {
  bucketId: string;
  bucketName: string;
  documents: UserKnowledgeDocument[];
}

export const DocumentUploader = ({ bucketId, bucketName, documents }: DocumentUploaderProps) => {
  const { uploadDocument, deleteDocument } = useUserKnowledge();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    await handleFileUpload(files);
  }, [bucketId]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await handleFileUpload(files);
    e.target.value = ''; // Reset input
  }, [bucketId]);

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    setUploading(true);
    
    // Filter supported file types
    const supportedTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const validFiles = files.filter(file => 
      supportedTypes.includes(file.type) || 
      file.name.endsWith('.txt') || 
      file.name.endsWith('.md')
    );
    
    if (validFiles.length !== files.length) {
      console.warn('Some files were skipped due to unsupported format');
    }
    
    // Upload files sequentially to avoid overwhelming the system
    for (const file of validFiles) {
      await uploadDocument(bucketId, file);
    }
    
    setUploading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Queued';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Ready';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents in "{bucketName}"
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Drop files here or click to upload
            </p>
            <p className="text-sm text-gray-500">
              Supports: PDF, Word docs, Text files, Markdown
            </p>
            <p className="text-xs text-gray-400">
              Max 10MB per file
            </p>
          </div>
          
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={uploading}
          />
          
          <Button 
            asChild 
            className="mt-4"
            disabled={uploading}
          >
            <label htmlFor="file-upload" className="cursor-pointer">
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </>
              )}
            </label>
          </Button>
        </div>

        {/* Document List */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">Uploaded Documents</h3>
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(doc.processing_status)}
                  <div className="flex-1">
                    <p className="font-medium truncate">{doc.filename}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{doc.file_size ? formatFileSize(doc.file_size) : 'Unknown size'}</span>
                      <Badge variant="outline" className="text-xs">
                        {getStatusLabel(doc.processing_status)}
                      </Badge>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDocument(doc.id, doc.file_path)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {documents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No documents uploaded yet</p>
            <p className="text-sm">Upload your first document to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
