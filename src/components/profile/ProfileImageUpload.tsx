
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, User, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileImageUploadProps {
  imageUrl?: string;
  uploading: boolean;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  altText: string;
}

export const ProfileImageUpload = ({
  imageUrl,
  uploading,
  onFileUpload,
  label,
  altText
}: ProfileImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setUploadSuccess(false);
    }
    onFileUpload(event);
  };

  // Show success state briefly after upload completes
  if (!uploading && selectedFileName && !uploadSuccess) {
    setTimeout(() => {
      setUploadSuccess(true);
      setTimeout(() => {
        setSelectedFileName("");
        setUploadSuccess(false);
      }, 2000);
    }, 100);
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <div className={cn(
          "relative w-20 h-20 rounded-full overflow-hidden border-2",
          uploading ? "border-primary animate-pulse" : "border-gray-200"
        )}>
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={altText}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <User className="w-8 h-8 text-gray-400" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
        
        <div className="flex-1 space-y-2">
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" 
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          
          <Button
            type="button"
            variant={uploadSuccess ? "default" : "outline"}
            onClick={handleButtonClick}
            disabled={uploading}
            className={cn(
              "min-w-[140px] transition-all",
              uploadSuccess && "bg-green-600 hover:bg-green-700"
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : uploadSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Uploaded!
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Choose Photo
              </>
            )}
          </Button>
          
          <div className="text-xs text-muted-foreground">
            {selectedFileName ? (
              <span className="text-primary">{selectedFileName}</span>
            ) : (
              <span>Max 10MB • JPEG, PNG, GIF, WebP</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
