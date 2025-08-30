import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileText, Shield, Lock, AlertCircle, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/utils/format';

interface UploadStageProps {
  onFileSelect: (file: File) => void;
}

export const UploadStage: React.FC<UploadStageProps> = ({ onFileSelect }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Strict file type validation for security - now includes images
    const allowedTypes = [
      'application/pdf', 
      'text/csv', 
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/tiff',
      'image/bmp'
    ];
    const allowedExtensions = ['pdf', 'csv', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif', 'bmp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const minSize = 1; // Prevent empty files

    // Validate file size
    if (file.size < minSize) {
      setError('File is empty or corrupted');
      return false;
    }

    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return false;
    }

    // Get file extension first for validation
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // Validate MIME type (primary security check)
    // For images, also check if type is empty (some browsers don't set MIME for images)
    if (!allowedTypes.includes(file.type) && !(file.type === '' && extension && allowedExtensions.includes(extension))) {
      setError('Invalid file type. Please upload a PDF, CSV, Excel file, or an image (JPG, PNG)');
      return false;
    }

    // Validate file extension (secondary check)
    if (!extension || !allowedExtensions.includes(extension)) {
      setError('Invalid file extension. Please upload a PDF, CSV, Excel file, or an image');
      return false;
    }

    // Validate filename (prevent path traversal)
    const filename = file.name;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      setError('Invalid filename');
      return false;
    }

    // Check for suspicious file patterns
    if (filename.match(/\.(exe|bat|cmd|scr|pif|com|js|jar|app|dmg)$/i)) {
      setError('Executable files are not allowed');
      return false;
    }

    setError(null);
    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      setError(null);
    }
  }, []);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleContinue = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Security Notice */}
      <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <Shield className="w-4 h-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <strong>100% Private:</strong> Your documents are processed locally in your browser. 
          No data is sent to our servers until you explicitly approve it. Works with bank statements, 
          invoices, receipts, and even photos taken with your phone camera!
        </AlertDescription>
      </Alert>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Your Document</CardTitle>
          <CardDescription>
            Drag and drop your bank statement, invoice, or receipt. We support PDF, CSV, Excel, and image formats (photos of documents work too!).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClick}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-primary/5'
                }
                ${error ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}
              `}
            >
              <input 
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.tiff,.tif,.bmp,image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-lg font-medium">Drop your file here...</p>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">
                    Drag & drop your document here
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Bank statements, invoices, receipts, or photos of documents
                  </p>
                  <div className="flex justify-center gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">PDF</span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">CSV</span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Excel</span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">JPG/PNG</span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">📷 Photos</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-10 h-10 text-primary" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(selectedFile.size)} • Ready to process
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  className="text-gray-500 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {selectedFile && (
            <div className="mt-6 flex justify-end">
              <Button onClick={handleContinue} size="lg">
                Continue to Processing
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Features */}
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-lg">How We Protect Your Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <Lock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">Client-Side Processing</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Files under 5MB are processed entirely in your browser
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">Automatic Redaction</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Account numbers show only last 4 digits
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">No Personal Data Storage</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Names, addresses, and SSNs are never saved
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">Immediate Deletion</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Original files deleted after processing
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};