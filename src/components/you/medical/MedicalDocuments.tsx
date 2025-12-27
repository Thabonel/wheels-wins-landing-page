import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Upload,
  Search,
  Download,
  Trash2,
  Eye,
  Filter,
  Calendar,
  X,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useMedical } from '@/contexts/MedicalContext';
import { format } from 'date-fns';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MedicalRecordType } from '@/types/medical';
import { getDocumentSignedUrl, downloadDocument } from '@/services/MedicalService';
import { toast } from 'sonner';

export default function MedicalDocuments() {
  const { records, deleteRecord } = useMedical();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Handle viewing a document
  const handleView = async (record: any) => {
    setPreviewRecord(record);
    setPreviewDialogOpen(true);
    setPreviewUrl(null);

    if (record.document_url) {
      setIsLoadingPreview(true);
      try {
        const url = await getDocumentSignedUrl(record.document_url);
        setPreviewUrl(url);
      } catch (error) {
        console.error('Error loading preview:', error);
        toast.error('Could not load document preview');
      } finally {
        setIsLoadingPreview(false);
      }
    }
  };

  // Handle downloading a document
  const handleDownload = async (record: any) => {
    if (!record.document_url) {
      toast.error('No document file attached');
      return;
    }

    try {
      await downloadDocument(record.document_url, `${record.title}.${record.document_url.split('.').pop()}`);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  // Check if a URL is an image (including iPhone formats)
  const isImageUrl = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp|svg|heic|heif|bmp|tiff|tif|ico)$/i.test(url);
  };

  // Check if a URL is a PDF
  const isPdfUrl = (url: string) => {
    return /\.pdf$/i.test(url);
  };

  // Get file extension from URL
  const getFileExtension = (url: string) => {
    const match = url.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toUpperCase() : 'FILE';
  };

  // Get friendly file type name
  const getFileTypeName = (url: string) => {
    const ext = getFileExtension(url).toLowerCase();
    const typeNames: Record<string, string> = {
      'doc': 'Word Document',
      'docx': 'Word Document',
      'xls': 'Excel Spreadsheet',
      'xlsx': 'Excel Spreadsheet',
      'ppt': 'PowerPoint',
      'pptx': 'PowerPoint',
      'txt': 'Text File',
      'csv': 'CSV File',
      'heic': 'iPhone Photo',
      'heif': 'iPhone Photo',
    };
    return typeNames[ext] || `${ext.toUpperCase()} File`;
  };

  // Filter records based on search and type
  const filteredRecords = records.filter(record => {
    const matchesSearch = record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          record.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          record.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || record.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleDelete = async () => {
    if (selectedRecordId) {
      await deleteRecord(selectedRecordId);
      setDeleteDialogOpen(false);
      setSelectedRecordId(null);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lab_result': return 'bg-blue-100 text-blue-800';
      case 'prescription': return 'bg-green-100 text-green-800';
      case 'vaccination': return 'bg-purple-100 text-purple-800';
      case 'insurance_card': return 'bg-orange-100 text-orange-800';
      case 'doctor_note': return 'bg-yellow-100 text-yellow-800';
      case 'imaging': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Medical Documents</CardTitle>
          <CardDescription>Upload and manage your medical records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="lab_result">Lab Result</SelectItem>
                <SelectItem value="prescription">Prescription</SelectItem>
                <SelectItem value="insurance_card">Insurance Card</SelectItem>
                <SelectItem value="doctor_note">Doctor Note</SelectItem>
                <SelectItem value="vaccination">Vaccination</SelectItem>
                <SelectItem value="imaging">Imaging</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredRecords.length > 0 ? (
          filteredRecords.map(record => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <Badge className={getTypeColor(record.type)}>
                    {record.type.replace('_', ' ')}
                  </Badge>
                </div>
                <CardTitle className="text-base mt-2">{record.title}</CardTitle>
                {record.summary && (
                  <CardDescription className="text-sm line-clamp-2">
                    {record.summary}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {record.test_date && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      Test date: {format(new Date(record.test_date), 'MMM d, yyyy')}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Added {format(new Date(record.created_at), 'MMM d, yyyy')}
                  </div>
                  {record.tags && record.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {record.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleView(record)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  {record.document_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(record)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRecordId(record.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No documents found</p>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Upload your first medical document to get started'}
              </p>
              {!searchTerm && filterType === 'all' && (
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medical Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this medical record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Document Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      {/* Document Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewRecord?.title || 'Document Preview'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Document metadata */}
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {previewRecord?.type && (
                <Badge className={getTypeColor(previewRecord.type)}>
                  {previewRecord.type.replace('_', ' ')}
                </Badge>
              )}
              {previewRecord?.test_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Test date: {format(new Date(previewRecord.test_date), 'MMM d, yyyy')}
                </span>
              )}
              {previewRecord?.created_at && (
                <span>
                  Added: {format(new Date(previewRecord.created_at), 'MMM d, yyyy')}
                </span>
              )}
            </div>

            {/* Summary */}
            {previewRecord?.summary && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Summary</h4>
                <p className="text-sm">{previewRecord.summary}</p>
              </div>
            )}

            {/* Tags */}
            {previewRecord?.tags && previewRecord.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {previewRecord.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Document preview */}
            {previewRecord?.document_url ? (
              <div className="border rounded-lg overflow-hidden">
                {isLoadingPreview ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading preview...</span>
                  </div>
                ) : previewUrl ? (
                  <>
                    {isImageUrl(previewRecord.document_url) ? (
                      // Native image display - best quality and performance
                      <img
                        src={previewUrl}
                        alt={previewRecord.title}
                        className="max-w-full h-auto mx-auto"
                        onError={(e) => {
                          // If image fails to load, show download option
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement?.classList.add('image-load-failed');
                        }}
                      />
                    ) : isPdfUrl(previewRecord.document_url) ? (
                      // PDF - native browser viewer
                      <iframe
                        src={previewUrl}
                        className="w-full h-[600px]"
                        title={previewRecord.title}
                      />
                    ) : (
                      // All other formats - show file info and download option
                      <div className="p-8 text-center bg-muted/30">
                        <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-2xl flex items-center justify-center">
                          <FileText className="h-10 w-10 text-primary" />
                        </div>
                        <h4 className="text-lg font-semibold mb-2">{previewRecord.title}</h4>
                        <p className="text-sm text-muted-foreground mb-1">
                          {getFileTypeName(previewRecord.document_url)}
                        </p>
                        <p className="text-xs text-muted-foreground mb-6">
                          .{getFileExtension(previewRecord.document_url)} file
                        </p>
                        <div className="flex justify-center gap-3">
                          <Button
                            variant="outline"
                            onClick={() => window.open(previewUrl, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open in Browser
                          </Button>
                          <Button onClick={() => handleDownload(previewRecord)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          This file type requires an external app to view
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    Could not load preview
                  </div>
                )}

                {/* Open in new tab button */}
                {previewUrl && (
                  <div className="p-3 border-t bg-muted/50 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(previewUrl, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open in New Tab
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDownload(previewRecord)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center border rounded-lg">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No document file attached to this record
                </p>
              </div>
            )}

            {/* OCR text if available */}
            {previewRecord?.ocr_text && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Extracted Text (OCR)</h4>
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {previewRecord.ocr_text}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}