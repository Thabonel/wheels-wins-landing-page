
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RegionSelector from "@/components/RegionSelector";
import { ProfileImageUpload } from "./ProfileImageUpload";

interface ProfileIdentityProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
  user: any;
  profile: any;
  region: string;
  setRegion: (region: string) => void;
  uploadingPhoto: boolean;
  uploadingPartnerPhoto: boolean;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>, isPartner?: boolean) => void;
}

export const ProfileIdentity = ({
  formData,
  setFormData,
  user,
  profile,
  region,
  setRegion,
  uploadingPhoto,
  uploadingPartnerPhoto,
  handleFileUpload
}: ProfileIdentityProps) => {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <ProfileImageUpload
          imageUrl={profile?.profile_image_url}
          uploading={uploadingPhoto}
          onFileUpload={(e) => handleFileUpload(e, false)}
          label="Profile Picture"
          altText="Profile"
        />
        
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input 
            placeholder="John Smith" 
            value={formData.fullName}
            onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Nickname (for social)</Label>
          <Input 
            placeholder="GreyNomadJohn" 
            value={formData.nickname}
            onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Email</Label>
          <Input 
            type="email" 
            value={user?.email || ''} 
            disabled 
            className="bg-gray-50"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Region</Label>
          <RegionSelector 
            defaultValue={profile?.region || region} 
            onRegionChange={setRegion} 
          />
        </div>
        
        <div className="space-y-2">
          <Label>Travel Style</Label>
          <Select
            value={formData.travelStyle}
            onValueChange={(val) => setFormData(prev => ({ ...prev, travelStyle: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Solo or Couple?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solo">Solo</SelectItem>
              <SelectItem value="couple">Couple</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.travelStyle === "couple" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Partner's Name</Label>
              <Input 
                placeholder="Mary Smith" 
                value={formData.partnerName}
                onChange={(e) => setFormData(prev => ({ ...prev, partnerName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Partner's Email</Label>
              <Input 
                placeholder="mary@example.com" 
                value={formData.partnerEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, partnerEmail: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <ProfileImageUpload
                imageUrl={profile?.partner_profile_image_url}
                uploading={uploadingPartnerPhoto}
                onFileUpload={(e) => handleFileUpload(e, true)}
                label="Partner's Profile Picture"
                altText="Partner"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
