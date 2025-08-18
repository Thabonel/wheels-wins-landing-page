import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Trash2, Loader2, FileCheck, AlertCircle } from 'lucide-react';
import { useUserKnowledge } from '@/hooks/useUserKnowledge';
import { formatDate } from '@/utils/format';
import { toast } from 'sonner';

export const UserKnowledgeManager = () => {
  const { documents, loading, uploadDocument, deleteDocument } = useUserKnowledge();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
        continue;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/markdown',
        'text/html',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error(`File type not supported for "${file.name}"`);
        continue;
      }

      await uploadDocument(file);
      setUploadProgress(((i + 1) / files.length) * 100);
    }

    setIsUploading(false);
    setUploadProgress(0);
    
    // Reset file input
    event.target.value = '';
  };

  const handleDeleteDocument = async (documentId: string, fileName: string) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      await deleteDocument(documentId);
    }
  };

  if (loading && documents.length === 0) {
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
          <h2 className="text-2xl font-bold">Document Library</h2>
          <p className="text-muted-foreground">
            Upload documents to help PAM provide better, personalized assistance
          </p>
        </div>
        
        <div>
          <input
            type="file"
            id="document-upload"
            className="hidden"
            multiple
            accept=".pdf,.txt,.doc,.docx,.md,.html,.csv,.xls,.xlsx"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <label htmlFor="document-upload">
            <Button asChild disabled={isUploading}>
              <span>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading... {Math.round(uploadProgress)}%
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                How it works:
              </p>
              <ul className="text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Upload travel plans, preferences, business documents, or any relevant information</li>
                <li>• PAM will automatically analyze and learn from your documents</li>
                <li>• Get personalized recommendations based on your uploaded content</li>
                <li>• All documents are securely stored and only accessible by you</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document List */}
      {documents.length > 0 ? (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    {doc.processing_status === 'completed' ? (
                      <FileCheck className="h-5 w-5 text-green-600" />
                    ) : doc.processing_status === 'processing' ? (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{doc.filename}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Uploaded {formatDate(doc.created_at)}</span>
                      <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                      {doc.processing_status === 'processing' && (
                        <span className="text-blue-600">Processing...</span>
                      )}
                      {doc.processing_status === 'completed' && (
                        <span className="text-green-600">Ready</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No documents uploaded yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start uploading documents to help PAM understand your preferences and provide better assistance.
            </p>
            <label htmlFor="document-upload-empty">
              <input
                type="file"
                id="document-upload-empty"
                className="hidden"
                multiple
                accept=".pdf,.txt,.doc,.docx,.md,.html,.csv,.xls,.xlsx"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <Button asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your First Document
                </span>
              </Button>
            </label>
          </CardContent>
        </Card>
      )}

      {/* Supported Formats */}
      <div className="text-sm text-muted-foreground">
        <p className="font-medium mb-1">Supported formats:</p>
        <p>PDF, Word (.doc, .docx), Text (.txt), Markdown (.md), HTML, Excel (.xls, .xlsx), CSV</p>
        <p className="mt-1">Maximum file size: 10MB per document</p>
      </div>
    </div>
  );
};