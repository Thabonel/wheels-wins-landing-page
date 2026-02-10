import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera,
  Upload,
  Loader2,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useReceiptScanner,
  type UniversalExtractedData,
} from "@/hooks/useReceiptScanner";

interface SmartReceiptScannerProps {
  onExtracted: (data: UniversalExtractedData) => void;
  onFileChange?: (file: File | null) => void;
  onReceiptUploaded?: (url: string) => void;
  className?: string;
  compact?: boolean;
}

export default function SmartReceiptScanner({
  onExtracted,
  onFileChange,
  onReceiptUploaded,
  className,
  compact = false,
}: SmartReceiptScannerProps) {
  const {
    selectedFile,
    previewUrl,
    isProcessing,
    processingStep,
    extracted,
    receiptUrl,
    error,
    handleFileSelect,
    processReceipt,
    clearSelection,
  } = useReceiptScanner();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Notify parent when extraction completes
  useEffect(() => {
    if (extracted) {
      onExtracted(extracted);
    }
  }, [extracted, onExtracted]);

  // Notify parent when file changes
  useEffect(() => {
    onFileChange?.(selectedFile);
  }, [selectedFile, onFileChange]);

  // Notify parent when receipt URL is available
  useEffect(() => {
    if (receiptUrl) {
      onReceiptUploaded?.(receiptUrl);
    }
  }, [receiptUrl, onReceiptUploaded]);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset the input so the same file can be re-selected
    e.target.value = "";
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const handleChangeFile = () => {
    clearSelection();
  };

  const handleRescan = () => {
    // Keep file but re-run the pipeline
    processReceipt();
  };

  const confidenceColor = (score: number): string => {
    if (score >= 0.7) return "text-green-700 bg-green-50 border-green-200";
    if (score >= 0.4) return "text-yellow-700 bg-yellow-50 border-yellow-200";
    return "text-red-700 bg-red-50 border-red-200";
  };

  const confidenceLabel = (score: number): string => {
    if (score >= 0.7) return "High confidence";
    if (score >= 0.4) return "Medium confidence";
    return "Low confidence";
  };

  const isImageFile = selectedFile?.type.startsWith("image/");

  // -- State 1: No file selected - show upload area --
  if (!selectedFile) {
    return (
      <div className={cn("space-y-2", className)}>
        <div
          className={cn(
            "border-2 border-dashed rounded-lg text-center transition-colors",
            "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500",
            compact ? "p-4" : "p-8"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.pdf,.doc,.docx"
            onChange={onFileInputChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileInputChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={openCamera}
                variant="outline"
                size={compact ? "sm" : "default"}
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
              <Button
                type="button"
                onClick={openFilePicker}
                variant="outline"
                size={compact ? "sm" : "default"}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </div>
            {!compact && (
              <p className="text-sm text-muted-foreground">
                Upload a receipt photo, PDF invoice, or Word document
              </p>
            )}
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  // -- State 3: Processing --
  if (isProcessing) {
    return (
      <div className={cn("space-y-3", className)}>
        <Card>
          <CardContent className={cn("flex flex-col items-center gap-3", compact ? "p-4" : "p-6")}>
            <Loader2 className="h-8 w-8 animate-spin text-[#C67B4B]" />
            <p className="text-sm text-muted-foreground font-medium">
              {processingStep || "Processing..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -- State 4: Scanned - show results --
  if (extracted) {
    const confidence = extracted.overall_confidence;
    return (
      <div className={cn("space-y-3", className)}>
        <Card>
          <CardContent className={cn("space-y-3", compact ? "p-3" : "p-4")}>
            {/* Confidence badge */}
            <div className="flex items-center justify-between">
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                  confidenceColor(confidence)
                )}
              >
                {confidence >= 0.7 ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
                {confidenceLabel(confidence)}
                {confidence > 0 && (
                  <span className="opacity-70">
                    ({Math.round(confidence * 100)}%)
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRescan}
                  className="text-xs"
                >
                  Rescan
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleChangeFile}
                  className="text-xs"
                >
                  Change File
                </Button>
              </div>
            </div>

            {/* Compact preview */}
            {previewUrl && !compact && (
              <div className="flex justify-center">
                {isImageFile ? (
                  <img
                    src={previewUrl}
                    alt="Scanned receipt"
                    className="max-h-24 rounded shadow-sm"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <FileText className="w-5 h-5 text-red-500 shrink-0" />
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {selectedFile.name}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  // -- State 2: File selected, not yet scanned --
  return (
    <div className={cn("space-y-3", className)}>
      {/* Hidden file inputs for re-selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.pdf,.doc,.docx"
        onChange={onFileInputChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileInputChange}
        className="hidden"
      />

      {/* Preview */}
      {isImageFile ? (
        <img
          src={previewUrl!}
          alt="Receipt preview"
          className={cn(
            "mx-auto rounded-lg shadow",
            compact ? "max-h-40" : "max-h-64"
          )}
        />
      ) : (
        <div
          className={cn(
            "mx-auto rounded-lg shadow bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center",
            compact ? "p-4" : "p-8"
          )}
        >
          <FileText className="w-12 h-12 text-red-500" />
          <p className="text-sm text-muted-foreground mt-2">
            {selectedFile.name}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 justify-center">
        <Button
          type="button"
          onClick={handleChangeFile}
          variant="outline"
          size={compact ? "sm" : "default"}
        >
          Change File
        </Button>
        <Button
          type="button"
          onClick={processReceipt}
          size={compact ? "sm" : "default"}
          className="bg-[#C67B4B] hover:bg-[#B06A3A] text-white"
        >
          Scan Receipt
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
