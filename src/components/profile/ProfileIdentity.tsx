
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import RegionSelector from "@/components/RegionSelector";
import { ProfileImageUpload } from "./ProfileImageUpload";

interface ProfileIdentityProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
  user: any;
  profile: any;
  region: string;
  setRegion: (region: string) => void;
  handleImageUploaded: (url: string | null, isPartner?: boolean) => void;
}

export const ProfileIdentity = ({
  formData,
  setFormData,
  user,
  profile,
  region,
  setRegion,
  handleImageUploaded
}: ProfileIdentityProps) => {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <ProfileImageUpload
          imageUrl={profile?.profile_image_url}
          onImageUploaded={(url) => handleImageUploaded(url, false)}
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

        {/* Gender Identity (Optional) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="gender_identity">Gender Identity (Optional)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">This helps us provide relevant community features and safety resources.</p>
                  <p className="text-sm mt-1">Your gender is private by default - you control who sees it.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={formData.genderIdentity || "prefer_not_to_say"}
            onValueChange={(val) => setFormData(prev => ({
              ...prev,
              genderIdentity: val === "prefer_not_to_say" ? "" : val
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Prefer not to say" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              <SelectItem value="Woman">Woman</SelectItem>
              <SelectItem value="Man">Man</SelectItem>
              <SelectItem value="Non-binary">Non-binary</SelectItem>
              <SelectItem value="Genderqueer">Genderqueer</SelectItem>
              <SelectItem value="Agender">Agender</SelectItem>
              <SelectItem value="Genderfluid">Genderfluid</SelectItem>
              <SelectItem value="Two-Spirit">Two-Spirit</SelectItem>
              <SelectItem value="Self-describe">Prefer to self-describe</SelectItem>
            </SelectContent>
          </Select>
          {formData.genderIdentity === 'Self-describe' && (
            <Input
              placeholder="Please specify"
              value={formData.genderCustom || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, genderCustom: e.target.value }))}
              className="mt-2"
            />
          )}
        </div>

        {/* Pronouns (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="pronouns">Pronouns (Optional)</Label>
          <Select
            value={formData.pronouns || "prefer_not_to_say"}
            onValueChange={(val) => setFormData(prev => ({
              ...prev,
              pronouns: val === "prefer_not_to_say" ? "" : val
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Prefer not to say" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              <SelectItem value="she/her">she/her</SelectItem>
              <SelectItem value="he/him">he/him</SelectItem>
              <SelectItem value="they/them">they/them</SelectItem>
              <SelectItem value="she/they">she/they</SelectItem>
              <SelectItem value="he/they">he/they</SelectItem>
              <SelectItem value="any">any pronouns</SelectItem>
              <SelectItem value="Self-describe">Prefer to self-describe</SelectItem>
            </SelectContent>
          </Select>
          {formData.pronouns === 'Self-describe' && (
            <Input
              placeholder="Please specify"
              value={formData.pronounsCustom || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, pronounsCustom: e.target.value }))}
              className="mt-2"
            />
          )}
        </div>

        {/* Travel Style (Multi-select) */}
        <div className="space-y-2">
          <Label>Travel Style</Label>
          <p className="text-sm text-gray-500">Select all that apply</p>
          <div className="space-y-2">
            {[
              { value: 'Solo traveler', label: 'Solo traveler' },
              { value: 'Open to companions', label: 'Open to meeting travel companions' },
              { value: 'Traveling with partner', label: 'Traveling with partner' },
              { value: 'Traveling with family', label: 'Traveling with family' },
              { value: 'Prefer privacy', label: 'Prefer privacy' }
            ].map((style) => (
              <div key={style.value} className="flex items-center space-x-2">
                <Checkbox
                  id={style.value}
                  checked={formData.travelStyle?.includes(style.value) || false}
                  onCheckedChange={(checked) => {
                    setFormData(prev => {
                      const currentStyles = prev.travelStyle || [];
                      if (checked) {
                        return { ...prev, travelStyle: [...currentStyles, style.value] };
                      } else {
                        return { ...prev, travelStyle: currentStyles.filter((s: string) => s !== style.value) };
                      }
                    });
                  }}
                />
                <label htmlFor={style.value} className="text-sm cursor-pointer">
                  {style.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Interests & Activities */}
        <div className="space-y-2">
          <Label>Interests & Activities (Optional)</Label>
          <p className="text-sm text-gray-500">
            Select activities you enjoy - we'll help you connect with others who share them
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Outdoor</p>
              {[
                { value: 'hiking', label: 'Hiking' },
                { value: 'fishing', label: 'Fishing' },
                { value: 'kayaking', label: 'Kayaking/Water Sports' },
                { value: 'mountain-biking', label: 'Mountain Biking' },
                { value: 'birdwatching', label: 'Birdwatching' },
                { value: 'stargazing', label: 'Stargazing' }
              ].map((interest) => (
                <div key={interest.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={interest.value}
                    checked={formData.interests?.includes(interest.value) || false}
                    onCheckedChange={(checked) => {
                      setFormData(prev => {
                        const currentInterests = prev.interests || [];
                        if (checked) {
                          return { ...prev, interests: [...currentInterests, interest.value] };
                        } else {
                          return { ...prev, interests: currentInterests.filter((i: string) => i !== interest.value) };
                        }
                      });
                    }}
                  />
                  <label htmlFor={interest.value} className="text-sm cursor-pointer">
                    {interest.label}
                  </label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Skills & Hobbies</p>
              {[
                { value: 'rv-repair', label: 'RV Repair & Maintenance' },
                { value: 'photography', label: 'Photography' },
                { value: 'cooking', label: 'Outdoor Cooking' },
                { value: 'cycling', label: 'Cycling' },
                { value: 'rockhounding', label: 'Rockhounding' },
                { value: 'veterans', label: 'Veterans Community' }
              ].map((interest) => (
                <div key={interest.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={interest.value}
                    checked={formData.interests?.includes(interest.value) || false}
                    onCheckedChange={(checked) => {
                      setFormData(prev => {
                        const currentInterests = prev.interests || [];
                        if (checked) {
                          return { ...prev, interests: [...currentInterests, interest.value] };
                        } else {
                          return { ...prev, interests: currentInterests.filter((i: string) => i !== interest.value) };
                        }
                      });
                    }}
                  />
                  <label htmlFor={interest.value} className="text-sm cursor-pointer">
                    {interest.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {formData.travelStyle?.includes("Traveling with partner") && (
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
                onImageUploaded={(url) => handleImageUploaded(url, true)}
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
