import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { useMedical } from '@/contexts/MedicalContext';
import { MedicalRecordType } from '@/types/medical';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentUploadDialog({ open, onOpenChange }: DocumentUploadDialogProps) {
  const { user } = useAuth();
  const { addRecord } = useMedical();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: MedicalRecordType.DOCUMENT,
    summary: '',
    tags: '',
    test_date: ''
  });

  // Check file type helpers
  const isTextFile = (filename: string) => /\.(txt|csv)$/i.test(filename);
  const isMarkdownFile = (filename: string) => /\.(md|markdown)$/i.test(filename);
  const isPdfFile = (filename: string) => /\.pdf$/i.test(filename);
  const isImageFile = (filename: string) => /\.(jpg|jpeg|png|gif|webp|bmp|tiff|tif)$/i.test(filename);

  // Extract text from PDF using pdf.js
  const extractPdfText = async (file: File): Promise<string> => {
    setExtractionStatus('Extracting text from PDF...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        setExtractionProgress(Math.round((i / pdf.numPages) * 100));
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }

      return fullText.trim();
    } catch (error) {
      console.error('PDF extraction error:', error);
      return '';
    }
  };

  // Extract text from image using Tesseract.js OCR
  const extractImageText = async (file: File): Promise<string> => {
    setExtractionStatus('Running OCR on image...');
    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setExtractionProgress(Math.round(m.progress * 100));
          }
        }
      });
      return result.data.text.trim();
    } catch (error) {
      console.error('OCR error:', error);
      return '';
    }
  };

  // Main text extraction function
  const extractTextContent = async (file: File): Promise<string | null> => {
    const filename = file.name;

    // Plain text files - read directly
    if (isTextFile(filename) || isMarkdownFile(filename)) {
      setExtractionStatus('Reading text file...');
      setExtractionProgress(50);
      const text = await file.text();
      setExtractionProgress(100);
      return text;
    }

    // PDF files - use pdf.js
    if (isPdfFile(filename)) {
      return await extractPdfText(file);
    }

    // Image files - use Tesseract OCR
    if (isImageFile(filename)) {
      return await extractImageText(file);
    }

    // Other file types - no extraction
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill title if empty
      if (!formData.title) {
        setFormData(prev => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, '') // Remove file extension
        }));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.title) {
        setFormData(prev => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, '')
        }));
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to upload documents');
      return;
    }

    setIsUploading(true);
    setExtractionProgress(0);
    setExtractionStatus(null);
    let documentUrl = null;
    let extractedText: string | null = null;

    try {
      // Upload file to Supabase Storage if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('medical-documents')
          .upload(fileName, selectedFile);

        if (uploadError) {
          // If bucket doesn't exist, create it
          if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
            // Try creating the bucket (this will fail if not admin, but that's ok)
            await supabase.storage.createBucket('medical-documents', {
              public: false,
              allowedMimeTypes: ['image/*', 'application/pdf', 'text/*']
            });

            // Retry upload
            const { data: retryData, error: retryError } = await supabase.storage
              .from('medical-documents')
              .upload(fileName, selectedFile);

            if (retryError) throw retryError;
            documentUrl = retryData?.path;
          } else {
            throw uploadError;
          }
        } else {
          documentUrl = uploadData?.path;
        }

        // Extract text content from the file for AI search
        extractedText = await extractTextContent(selectedFile);
        if (extractedText) {
          setExtractionStatus('Text extracted successfully');
        }
      }

      // Parse tags
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Create medical record with extracted text
      await addRecord({
        title: formData.title,
        type: formData.type,
        summary: formData.summary || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        test_date: formData.test_date || null,
        document_url: documentUrl,
        content_json: null,
        ocr_text: extractedText
      });

      // Reset form
      setFormData({
        title: '',
        type: MedicalRecordType.DOCUMENT,
        summary: '',
        tags: '',
        test_date: ''
      });
      setSelectedFile(null);
      setExtractionProgress(0);
      setExtractionStatus(null);
      onOpenChange(false);

      const successMsg = extractedText
        ? 'Document uploaded with text extraction'
        : 'Document uploaded successfully';
      toast.success(successMsg);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
      setExtractionStatus(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Upload Medical Document</DialogTitle>
          <DialogDescription>
            Add a new medical record to your collection
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* File Upload Area */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,application/pdf,.doc,.docx,.txt,.md,.markdown,.csv"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">{selectedFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, images, or documents up to 10MB
                </p>
              </>
            )}
          </div>

          {/* Document Details */}
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Blood Test Results"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Document Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as MedicalRecordType })}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MedicalRecordType.DOCUMENT}>Document</SelectItem>
                <SelectItem value={MedicalRecordType.LAB_RESULT}>Lab Result</SelectItem>
                <SelectItem value={MedicalRecordType.PRESCRIPTION}>Prescription</SelectItem>
                <SelectItem value={MedicalRecordType.INSURANCE_CARD}>Insurance Card</SelectItem>
                <SelectItem value={MedicalRecordType.DOCTOR_NOTE}>Doctor Note</SelectItem>
                <SelectItem value={MedicalRecordType.VACCINATION}>Vaccination</SelectItem>
                <SelectItem value={MedicalRecordType.IMAGING}>Imaging</SelectItem>
                <SelectItem value={MedicalRecordType.OTHER}>Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="test_date">Test/Document Date</Label>
            <Input
              id="test_date"
              type="date"
              value={formData.test_date}
              onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Brief description of the document..."
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., annual checkup, cardiology, 2024 (comma separated)"
            />
          </div>
        </div>

        {/* Extraction Progress */}
        {isUploading && extractionStatus && (
          <div className="space-y-2 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{extractionStatus}</span>
            </div>
            {extractionProgress > 0 && extractionProgress < 100 && (
              <Progress value={extractionProgress} className="h-2" />
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!formData.title || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Document'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}