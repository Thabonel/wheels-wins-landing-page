import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRegion } from "@/context/RegionContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase";
import { toast } from "@/hooks/use-toast";
import { ProfileHeader, ProfileStatus } from "@/components/profile/ProfileHeader";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { VehicleSetup } from "@/components/profile/VehicleSetup";
import { TravelPreferences } from "@/components/profile/TravelPreferences";

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
    if (!user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${isPartner ? 'partner' : 'profile'}_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, file, {
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isPartner = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error", 
        description: "File size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    if (isPartner) {
      setUploadingPartnerPhoto(true);
    } else {
      setUploadingPhoto(true);
    }

    try {
      const imageUrl = await uploadFile(file, isPartner);
      
      const updateData = isPartner 
        ? { partner_profile_image_url: imageUrl }
        : { profile_image_url: imageUrl };

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user!.id,
          email: user!.email || '',
          ...profile,
          ...updateData
        });

      if (error) {
        toast({
          title: "Error",
          description: `Failed to save picture: ${error.message}`,
          variant: "destructive"
        });
      } else {
        setProfile(prev => ({ ...prev, ...updateData }));
        toast({
          title: "Success",
          description: `${isPartner ? 'Partner' : 'Profile'} picture uploaded successfully`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      if (isPartner) {
        setUploadingPartnerPhoto(false);
      } else {
        setUploadingPhoto(false);
      }
      event.target.value = '';
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
      <ProfileHeader profile={profile} region={region} />
      <ProfileStatus profile={profile} region={region} />
      
      <ProfileIdentity
        formData={formData}
        setFormData={setFormData}
        user={user}
        profile={profile}
        region={region}
        setRegion={setRegion}
        uploadingPhoto={uploadingPhoto}
        uploadingPartnerPhoto={uploadingPartnerPhoto}
        handleFileUpload={handleFileUpload}
      />

      <VehicleSetup formData={formData} setFormData={setFormData} />
      <TravelPreferences formData={formData} setFormData={setFormData} />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}
