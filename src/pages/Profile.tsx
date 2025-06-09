
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import RegionSelector from "@/components/RegionSelector";
import { useRegion } from "@/context/RegionContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase";
import { toast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { region, setRegion } = useRegion();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPartnerPhoto, setUploadingPartnerPhoto] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    nickname: "",
    travelStyle: "solo",
    vehicleType: "",
    vehicleMakeModel: "",
    fuelType: "",
    towing: "",
    secondVehicle: "",
    maxDriving: "",
    campTypes: "",
    accessibility: "",
    pets: "",
    partnerName: "",
    partnerEmail: ""
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        console.log('Fetching profile for user:', user.id);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
        } else if (data) {
          console.log('Profile data:', data);
          setProfile(data);
          // Populate form with existing data
          setFormData({
            fullName: data.full_name || "",
            nickname: data.nickname || "",
            travelStyle: data.travel_style || "solo",
            vehicleType: data.vehicle_type || "",
            vehicleMakeModel: data.vehicle_make_model || "",
            fuelType: data.fuel_type || "",
            towing: data.towing || "",
            secondVehicle: data.second_vehicle || "",
            maxDriving: data.max_driving || "",
            campTypes: data.camp_types || "",
            accessibility: data.accessibility || "",
            pets: data.pets || "",
            partnerName: data.partner_name || "",
            partnerEmail: data.partner_email || ""
          });
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const uploadFile = async (file: File, isPartner = false) => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${isPartner ? 'partner' : 'profile'}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, file);

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isPartner = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isPartner) {
      setUploadingPartnerPhoto(true);
    } else {
      setUploadingPhoto(true);
    }

    try {
      const imageUrl = await uploadFile(file, isPartner);
      
      if (imageUrl) {
        const updateData = isPartner 
          ? { partner_profile_image_url: imageUrl }
          : { profile_image_url: imageUrl };

        const { error } = await supabase
          .from('profiles')
          .upsert({
            user_id: user!.id,
            ...updateData
          });

        if (error) {
          console.error('Error updating profile with image:', error);
          toast({
            title: "Error",
            description: "Failed to save profile picture",
            variant: "destructive"
          });
        } else {
          setProfile(prev => ({ ...prev, ...updateData }));
          toast({
            title: "Success",
            description: `${isPartner ? 'Partner' : 'Profile'} picture uploaded successfully`,
          });
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Error",
        description: "Failed to upload picture",
        variant: "destructive"
      });
    } finally {
      if (isPartner) {
        setUploadingPartnerPhoto(false);
      } else {
        setUploadingPhoto(false);
      }
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save profile",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      const profileData = {
        user_id: user.id,
        email: user.email || '',
        region: region,
        status: 'active',
        role: 'user',
        full_name: formData.fullName,
        nickname: formData.nickname,
        travel_style: formData.travelStyle,
        vehicle_type: formData.vehicleType,
        vehicle_make_model: formData.vehicleMakeModel,
        fuel_type: formData.fuelType,
        towing: formData.towing,
        second_vehicle: formData.secondVehicle,
        max_driving: formData.maxDriving,
        camp_types: formData.campTypes,
        accessibility: formData.accessibility,
        pets: formData.pets,
        partner_name: formData.partnerName,
        partner_email: formData.partnerEmail,
        // Preserve existing image URLs
        profile_image_url: profile?.profile_image_url,
        partner_profile_image_url: profile?.partner_profile_image_url
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) {
        console.error('Error saving profile:', error);
        toast({
          title: "Error",
          description: "Failed to save profile",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Profile saved successfully",
        });
        // Refresh profile data
        setProfile({ ...profileData, created_at: new Date().toISOString() });
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Your Profile</h1>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Your Profile</h1>
        <Card>
          <CardContent className="p-6">
            <p>Please log in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Profile</h1>
        {profile && (
          <div className="flex gap-2">
            <Badge variant="outline">{profile.role || 'user'}</Badge>
            <Badge variant={profile.status === 'active' ? 'default' : 'destructive'}>
              {profile.status || 'active'}
            </Badge>
          </div>
        )}
      </div>

      {/* Profile Status */}
      {profile && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-green-800 font-medium">Profile Active</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Role: {profile.role || 'user'} | Region: {profile.region || region} | Status: {profile.status || 'active'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Identity */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              {profile?.profile_image_url && (
                <img 
                  src={profile.profile_image_url} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full object-cover"
                />
              )}
              <Input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleFileUpload(e, false)}
                disabled={uploadingPhoto}
              />
              {uploadingPhoto && <span className="text-sm text-muted-foreground">Uploading...</span>}
            </div>
          </div>
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
                <Label>Partner's Profile Picture</Label>
                <div className="flex items-center gap-4">
                  {profile?.partner_profile_image_url && (
                    <img 
                      src={profile.partner_profile_image_url} 
                      alt="Partner" 
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleFileUpload(e, true)}
                    disabled={uploadingPartnerPhoto}
                  />
                  {uploadingPartnerPhoto && <span className="text-sm text-muted-foreground">Uploading...</span>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Info */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Your Vehicle Setup</h2>
          <div className="space-y-2">
            <Label>Vehicle Type</Label>
            <Input 
              placeholder="RV, 4WD, Caravan..." 
              value={formData.vehicleType}
              onChange={(e) => setFormData(prev => ({ ...prev, vehicleType: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Make / Model / Year</Label>
            <Input 
              placeholder="Toyota LandCruiser 2022" 
              value={formData.vehicleMakeModel}
              onChange={(e) => setFormData(prev => ({ ...prev, vehicleMakeModel: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Fuel Type</Label>
            <Select
              value={formData.fuelType}
              onValueChange={(val) => setFormData(prev => ({ ...prev, fuelType: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Diesel">Diesel</SelectItem>
                <SelectItem value="Petrol">Petrol</SelectItem>
                <SelectItem value="Electric">Electric</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Are you towing?</Label>
            <Input 
              placeholder="Type, weight, make/model" 
              value={formData.towing}
              onChange={(e) => setFormData(prev => ({ ...prev, towing: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Are you towing a second vehicle?</Label>
            <Input 
              placeholder="e.g. Suzuki Jimny, 1.2T" 
              value={formData.secondVehicle}
              onChange={(e) => setFormData(prev => ({ ...prev, secondVehicle: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Travel Preferences</h2>
          <div className="space-y-2">
            <Label>Max comfortable daily driving (km)</Label>
            <Input 
              placeholder="e.g. 300" 
              value={formData.maxDriving}
              onChange={(e) => setFormData(prev => ({ ...prev, maxDriving: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Preferred camp types</Label>
            <Input 
              placeholder="Free, Paid, Bush, RV Park..." 
              value={formData.campTypes}
              onChange={(e) => setFormData(prev => ({ ...prev, campTypes: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Accessibility or mobility needs?</Label>
            <Input 
              placeholder="Optional" 
              value={formData.accessibility}
              onChange={(e) => setFormData(prev => ({ ...prev, accessibility: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Pets on board?</Label>
            <Input 
              placeholder="e.g. 2 dogs" 
              value={formData.pets}
              onChange={(e) => setFormData(prev => ({ ...prev, pets: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}
