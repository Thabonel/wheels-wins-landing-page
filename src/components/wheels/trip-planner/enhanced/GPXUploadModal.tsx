import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { parseGPX, validateGPXFile, GPXTrack } from './map/utils/tracks/parsers';
import { useToast } from '@/hooks/use-toast';

interface GPXUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackLoaded: (track: GPXTrack) => void;
}

export const GPXUploadModal: React.FC<GPXUploadModalProps> = ({
  isOpen,
  onClose,
  onTrackLoaded
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    setParseError(null);
    setUploadedFile(file);
    
    // Validate file
    if (!validateGPXFile(file)) {
      setParseError('Invalid file. Please upload a GPX file under 10MB.');
      return;
    }

    setIsProcessing(true);

    try {
      // Read and parse file
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const track = parseGPX(content);
          
          // Success!
          toast({
            title: "Track Imported",
            description: `Successfully imported "${track.name}" with ${track.points.length} points.`,
          });
          
          onTrackLoaded(track);
          onClose();
        } catch (error) {
          setParseError('Failed to parse GPX file. Please ensure it\'s a valid GPX format.');
          console.error('GPX parse error:', error);
        } finally {
          setIsProcessing(false);
        }
      };

      reader.onerror = () => {
        setParseError('Failed to read file.');
        setIsProcessing(false);
      };

      reader.readAsText(file);
    } catch (error) {
      setParseError('An error occurred while processing the file.');
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setParseError(null);
    setIsProcessing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import GPX Track</DialogTitle>
          <DialogDescription>
            Upload a GPX file to import your track onto the map.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!uploadedFile ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-2">
                Drag and drop your GPX file here
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                or
              </p>
              <label htmlFor="gpx-upload">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    Browse Files
                    <input
                      id="gpx-upload"
                      type="file"
                      accept=".gpx"
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={isProcessing}
                    />
                  </span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-4">
                Supports .gpx files up to 10MB
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                {!isProcessing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Status */}
              {isProcessing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  Processing GPX file...
                </div>
              )}

              {parseError && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{parseError}</p>
                </div>
              )}
            </div>
          )}

          {/* Example tracks */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              💡 Tip: You can export GPX files from apps like:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Garmin Connect</li>
              <li>• Strava</li>
              <li>• AllTrails</li>
              <li>• RV Trip Wizard</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};