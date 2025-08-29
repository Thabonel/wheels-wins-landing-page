
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, User, CheckCircle, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadFile, getLocalPhoto, verifyImageExists } from "@/utils/fileUploadUtils";
import { validateFile, formatFileSize } from "@/utils/fileValidation";
import { createThumbnail } from "@/utils/imageCompression";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface ProfileImageUploadProps {
  imageUrl?: string;
  onImageUploaded: (url: string | null) => void;
  label?: string;
  altText?: string;
  size?: 'sm' | 'md' | 'lg';
  type?: 'profile' | 'vehicle';
}

export const ProfileImageUpload = ({
  imageUrl: initialImageUrl,
  onImageUploaded,
  label = "Profile Picture",
  altText = "Profile",
  size = 'md',
  type = 'profile'
}: ProfileImageUploadProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Size configurations
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-20 h-20",
    lg: "w-32 h-32"
  };

  // Check for local storage fallback on mount
  useEffect(() => {
    if (!initialImageUrl && user) {
      const localPhoto = getLocalPhoto(type, user.id);
      if (localPhoto) {
        setImageUrl(localPhoto.data);
        toast.info('Using locally stored photo. Will sync when online.');
      }
    }
  }, [initialImageUrl, user, type]);

  // Verify remote image exists
  useEffect(() => {
    if (initialImageUrl && !initialImageUrl.startsWith('data:')) {
      verifyImageExists(initialImageUrl).then(exists => {
        if (!exists && user) {
          // Try local fallback
          const localPhoto = getLocalPhoto(type, user.id);
          if (localPhoto) {
            setImageUrl(localPhoto.data);
          }
        }
      });
    }
  }, [initialImageUrl, user, type]);

  const handleButtonClick = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset state
    setError(null);
    setSelectedFile(file);

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error!);
      toast.error(validation.error!);
      return;
    }

    // Show warnings
    if (validation.warnings) {
      validation.warnings.forEach(warning => toast.warning(warning));
    }

    // Create preview
    try {
      const preview = await createThumbnail(file, 200);
      setPreviewUrl(preview);
    } catch (err) {
      console.error('Failed to create preview:', err);
    }

    // Start upload
    await handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    if (!user) {
      setError('You must be logged in to upload photos');
      toast.error('Please log in to upload photos');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress (real progress would come from upload API)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload file with compression and fallback
      const result = await uploadFile(file, type, true);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.url) {
        setImageUrl(result.url);
        onImageUploaded(result.url);
        
        // Clear preview after successful upload
        setTimeout(() => {
          setPreviewUrl(null);
          setSelectedFile(null);
          setUploadProgress(0);
        }, 1000);

        if (result.isLocal) {
          toast.warning('Photo saved locally. Will sync when connection is restored.');
        } else {
          toast.success('Photo uploaded successfully!');
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setError(errorMessage);
      toast.error(errorMessage);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setImageUrl(null);
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
    onImageUploaded(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayUrl = previewUrl || imageUrl;

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <div className={cn(
          "relative rounded-full overflow-hidden border-2 transition-all",
          sizeClasses[size],
          isUploading ? "border-primary animate-pulse" : "border-gray-200",
          error && "border-red-500"
        )}>
          {displayUrl ? (
            <img 
              src={displayUrl} 
              alt={altText}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <User className="w-1/2 h-1/2 text-gray-400" />
            </div>
          )}
          
          {/* Upload overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin mb-1" />
              <span className="text-white text-xs">{uploadProgress}%</span>
            </div>
          )}

          {/* Remove button */}
          {displayUrl && !isUploading && (
            <button
              onClick={handleRemovePhoto}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              type="button"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        
        <div className="flex-1 space-y-2">
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif" 
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
          />
          
          <Button
            type="button"
            variant={uploadProgress === 100 ? "default" : "outline"}
            onClick={handleButtonClick}
            disabled={isUploading}
            className={cn(
              "min-w-[140px] transition-all",
              uploadProgress === 100 && "bg-green-600 hover:bg-green-700"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading... {uploadProgress}%
              </>
            ) : uploadProgress === 100 ? (
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
          
          <div className="text-xs space-y-1">
            {error ? (
              <div className="text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </div>
            ) : selectedFile ? (
              <div className="text-primary">
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </div>
            ) : (
              <div className="text-muted-foreground">
                Max 5MB • JPEG, PNG, GIF, WebP, HEIC
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
