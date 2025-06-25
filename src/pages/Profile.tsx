import { useState, useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, Settings, MapPin, Car, Brain } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRegion } from "@/context/RegionContext";
import { useProfile } from "@/hooks/useProfile";
import { ProfileHeader, ProfileStatus } from "@/components/profile/ProfileHeader";
import { ProfileImageUpload } from "@/components/profile/ProfileImageUpload";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { TravelPreferences } from "@/components/profile/TravelPreferences";
import { VehicleSetup } from "@/components/profile/VehicleSetup";
import { UserKnowledgeManager } from "@/components/knowledge/UserKnowledgeManager";
import { supabase } from "@/integrations/supabase";
import { toast } from "sonner";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { PamSettings } from "@/components/settings/PamSettings";
import { DisplaySettings } from "@/components/settings/DisplaySettings";
import { AccountSecurity } from "@/components/settings/AccountSecurity";
import { AccountDeletion } from "@/components/settings/AccountDeletion";

const Profile = () => {
  const { user } = useAuth();
  const { region, setRegion } = useRegion();
  const { profile, loading } = useProfile();
  const [activeTab, setActiveTab] = useState("identity");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPartnerPhoto, setUploadingPartnerPhoto] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    nickname: profile?.nickname || '',
    travelStyle: profile?.travel_style || 'solo',
    partnerName: profile?.partner_name || '',
    partnerEmail: profile?.partner_email || '',
    vehicleType: profile?.vehicle_type || '',
    vehicleMakeModel: profile?.vehicle_make_model || '',
    fuelType: profile?.fuel_type || '',
    towing: profile?.towing || '',
    secondVehicle: profile?.second_vehicle || '',
    maxDriving: profile?.max_driving || '',
    campTypes: profile?.camp_types || '',
    accessibility: profile?.accessibility || '',
    pets: profile?.pets || ''
  });

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || '',
        nickname: profile.nickname || '',
        travelStyle: profile.travel_style || 'solo',
        partnerName: profile.partner_name || '',
        partnerEmail: profile.partner_email || '',
        vehicleType: profile.vehicle_type || '',
        vehicleMakeModel: profile.vehicle_make_model || '',
        fuelType: profile.fuel_type || '',
        towing: profile.towing || '',
        secondVehicle: profile.second_vehicle || '',
        maxDriving: profile.max_driving || '',
        campTypes: profile.camp_types || '',
        accessibility: profile.accessibility || '',
        pets: profile.pets || ''
      });
    }
  }, [profile]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isPartner = false) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const setUploading = isPartner ? setUploadingPartnerPhoto : setUploadingPhoto;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${isPartner ? 'partner' : 'profile'}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName);

      const updateField = isPartner ? 'partner_profile_image_url' : 'profile_image_url';
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: data.publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success(`${isPartner ? 'Partner' : 'Profile'} photo updated successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Please log in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <ErrorBoundary>
          <ProfileHeader profile={profile} region={region} />
          <ProfileStatus profile={profile} region={region} />
        </ErrorBoundary>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="identity" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Identity
            </TabsTrigger>
            <TabsTrigger value="travel" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Travel
            </TabsTrigger>
            <TabsTrigger value="vehicle" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Vehicle
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Knowledge
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identity" className="space-y-6">
            <ErrorBoundary>
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
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="travel" className="space-y-6">
            <ErrorBoundary>
              <TravelPreferences
                formData={formData}
                setFormData={setFormData}
              />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="vehicle" className="space-y-6">
            <ErrorBoundary>
              <VehicleSetup
                formData={formData}
                setFormData={setFormData}
              />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-6">  
            <ErrorBoundary>
              <UserKnowledgeManager />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <ErrorBoundary>
              <div className="grid gap-6">
                <Tabs defaultValue="security" className="w-full">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="privacy">Privacy</TabsTrigger>
                    <TabsTrigger value="display">Display</TabsTrigger>
                    <TabsTrigger value="pam">Pam AI</TabsTrigger>
                    <TabsTrigger value="danger">Account</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="security" className="mt-6">
                    <ErrorBoundary>
                      <AccountSecurity />
                    </ErrorBoundary>
                  </TabsContent>
                  
                  <TabsContent value="notifications" className="mt-6">
                    <ErrorBoundary>
                      <NotificationSettings />
                    </ErrorBoundary>
                  </TabsContent>
                  
                  <TabsContent value="privacy" className="mt-6">
                    <ErrorBoundary>
                      <PrivacySettings />
                    </ErrorBoundary>
                  </TabsContent>
                  
                  <TabsContent value="display" className="mt-6">
                    <ErrorBoundary>
                      <DisplaySettings />
                    </ErrorBoundary>
                  </TabsContent>
                  
                  <TabsContent value="pam" className="mt-6">
                    <ErrorBoundary>
                      <PamSettings />
                    </ErrorBoundary>
                  </TabsContent>
                  
                  <TabsContent value="danger" className="mt-6">
                    <ErrorBoundary>
                      <AccountDeletion />
                    </ErrorBoundary>
                  </TabsContent>
                </Tabs>
              </div>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
};

export default Profile;
