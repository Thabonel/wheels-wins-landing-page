import { useState, useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { PamSettings } from "@/components/settings/PamSettings";
import { DisplaySettings } from "@/components/settings/DisplaySettings";
import { LocationSettings } from "@/components/settings/LocationSettings";
import { AccountSecurity } from "@/components/settings/AccountSecurity";
import { AccountDeletion } from "@/components/settings/AccountDeletion";
import { TransitionSettings } from "@/components/settings/TransitionSettings";
import { syncLocalPhotos } from "@/utils/fileUploadUtils";

const Profile = () => {
  const { user } = useAuth();
  const { region, setRegion } = useRegion();
  const { profile, loading, refreshProfile } = useProfile();
  const [activeTab, setActiveTab] = useState("identity");

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

  const handleImageUploaded = async (url: string | null, isPartner = false) => {
    if (!url || !user) return;

    try {
      // Update profile with new image URL
      const updateField = isPartner ? 'partner_profile_image_url' : 'profile_image_url';
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: url })
        .eq('id', user.id);
        
      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }
      
      toast.success(`${isPartner ? 'Partner' : 'Profile'} photo updated successfully!`);
      
      // Refresh profile data to show new image
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(`Failed to update profile: ${error?.message || 'Unknown error'}`);
    }
  };

  // Save profile data to database using backend API
  const handleSaveProfile = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    try {
      const updateData = {
        full_name: formData.fullName,
        nickname: formData.nickname,
        travel_style: formData.travelStyle,
        partner_name: formData.partnerName,
        partner_email: formData.partnerEmail,
        vehicle_type: formData.vehicleType,
        vehicle_make_model: formData.vehicleMakeModel,
        fuel_type: formData.fuelType,
        towing: formData.towing,
        second_vehicle: formData.secondVehicle,
        max_driving: formData.maxDriving,
        camp_types: formData.campTypes,
        accessibility: formData.accessibility,
        pets: formData.pets,
      };

      // Use Supabase directly for profile update
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
        
      if (error) {
        throw new Error(error.message || 'Failed to update profile');
      }
      toast.success('Profile updated successfully');
      
      // Refresh profile data to reflect changes
      if (refreshProfile) {
        await refreshProfile();
      }
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      // Provide user-friendly error messages
      if (error.message.includes('404')) {
        toast.error('Profile not found. Creating new profile...');
      } else if (error.message.includes('403')) {
        toast.error('Permission denied. Please check your account status.');
      } else if (error.message.includes('401')) {
        toast.error('Authentication failed. Please log in again.');
      } else {
        toast.error(`Failed to update profile: ${error.message || 'Unknown error'}`);
      }
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
                handleImageUploaded={handleImageUploaded}
              />
              <Card>
                <CardContent className="p-6">
                  <Button onClick={handleSaveProfile} className="w-full">
                    Save Identity Information
                  </Button>
                </CardContent>
              </Card>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="travel" className="space-y-6">
            <ErrorBoundary>
              <TravelPreferences
                formData={formData}
                setFormData={setFormData}
              />
              <Card>
                <CardContent className="p-6">
                  <Button onClick={handleSaveProfile} className="w-full">
                    Save Travel Preferences
                  </Button>
                </CardContent>
              </Card>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="vehicle" className="space-y-6">
            <ErrorBoundary>
              <VehicleSetup
                formData={formData}
                setFormData={setFormData}
              />
              <Card>
                <CardContent className="p-6">
                  <Button onClick={handleSaveProfile} className="w-full">
                    Save Vehicle Setup
                  </Button>
                </CardContent>
              </Card>
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
                      <div className="mt-6">
                        <LocationSettings />
                      </div>
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

                {/* Additional Settings */}
                <div className="mt-6">
                  <ErrorBoundary>
                    <TransitionSettings />
                  </ErrorBoundary>
                </div>
              </div>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
};

// Profile component handles user profile management and settings
export default Profile;
