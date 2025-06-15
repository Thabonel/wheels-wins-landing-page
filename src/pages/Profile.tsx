
import { useState } from "react";
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

const Profile = () => {
  const { user } = useAuth();
  const { region } = useRegion();
  const { profile, loading } = useProfile();
  const [activeTab, setActiveTab] = useState("identity");

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
    <div className="container mx-auto px-4 py-8 space-y-6">
      <ProfileHeader profile={profile} region={region} />
      <ProfileStatus profile={profile} region={region} />
      
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
          <ProfileImageUpload />
          <ProfileIdentity />
        </TabsContent>

        <TabsContent value="travel" className="space-y-6">
          <TravelPreferences />
        </TabsContent>

        <TabsContent value="vehicle" className="space-y-6">
          <VehicleSetup />
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-6">  
          <UserKnowledgeManager />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Account settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
