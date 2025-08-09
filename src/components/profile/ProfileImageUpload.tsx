
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        {imageUrl && (
          <img 
            src={imageUrl} 
            alt={altText}
            className="w-16 h-16 rounded-full object-cover"
          />
        )}
        <Input 
          type="file" 
          accept="image/*" 
          onChange={onFileUpload}
          disabled={uploading}
        />
        {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
      </div>
    </div>
  );
};
