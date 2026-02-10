import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, FileImage, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReceiptUploadProps {
  onReceiptChange: (file: File | null) => void;
  existingReceiptUrl?: string;
  className?: string;
}

export default function ReceiptUpload({
  onReceiptChange,
  existingReceiptUrl,
  className
}: ReceiptUploadProps) {
  const [preview, setPreview] = useState<string | null>(existingReceiptUrl || null);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const docTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (file && (file.type.startsWith("image/") || docTypes.includes(file.type))) {
      // Validate file size (max 5MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setFileName(file.name);
        onReceiptChange(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReceipt = () => {
    setPreview(null);
    setFileName("");
    onReceiptChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-3", className)}>
      <label className="text-sm font-medium">Receipt (Optional)</label>
      
      {!preview ? (
        <div className="flex gap-2">
          {/* Upload from gallery */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Receipt
          </Button>
          
          {/* Capture from camera (mobile) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 md:hidden"
          >
            <Camera className="w-4 h-4 mr-2" />
            Take Photo
          </Button>
        </div>
      ) : (
        <div className="relative rounded-lg border-2 border-dashed border-gray-300 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileImage className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {fileName || "Receipt attached"}
                </p>
                <p className="text-xs text-gray-500">Click to preview</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeReceipt}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Preview modal trigger */}
          <button
            type="button"
            onClick={() => window.open(preview, '_blank')}
            className="mt-3 w-full"
          >
            {fileName && /\.(pdf|doc|docx)$/i.test(fileName) ? (
              <div className="w-full h-32 flex flex-col items-center justify-center bg-gray-50 rounded">
                <FileText className="w-10 h-10 text-red-500" />
                <span className="text-xs text-gray-500 mt-1">{fileName}</span>
              </div>
            ) : (
              <img
                src={preview}
                alt="Receipt preview"
                className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
              />
            )}
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.pdf,.doc,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}