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
  const [isCouple, setIsCouple] = useState(false);
  const [fuelType, setFuelType] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchOrCreateProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          toast({
            title: "Error",
            description: "Failed to fetch profile",
            variant: "destructive",
          });
        }

        if (!data) {
          const { data: created, error: insertError } = await supabase
            .from("profiles")
            .insert({ user_id: user.id, region: region, status: "active", email: user.email })
            .select()
            .single();

          if (insertError) {
            toast({
              title: "Error",
              description: "Could not create profile",
              variant: "destructive",
            });
          } else {
            setProfile(created);
            setFormData(created);
          }
        } else {
          setProfile(data);
          setFormData(data);
          setIsCouple(data.travel_style === "couple");
          setFuelType(data.fuel_type || "");
        }
      } catch (err) {
        toast({
          title: "Error",
          description: "Unexpected error fetching profile",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateProfile();
  }, [user]);

  const updateForm = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const uploadProfileImage = async (): Promise<string | null> => {
    if (!profileImageFile || !user) return null;

    const filename = `user-${user.id}-${Date.now()}.${profileImageFile.name.split(".").pop()}`;
    const { data, error } = await supabase.storage
      .from("user-avatars")
      .upload(filename, profileImageFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      toast({
        title: "Upload Error",
        description: "Failed to upload profile image",
        variant: "destructive",
      });
      return null;
    }

    const { publicUrl } = supabase.storage.from("user-avatars").getPublicUrl(filename).data;
    return publicUrl;
  };

  const saveProfile = async () => {
    if (!user) return;

    let profileImageUrl = formData.profile_image_url;
    if (profileImageFile) {
      const uploadedUrl = await uploadProfileImage();
      if (uploadedUrl) {
        profileImageUrl = uploadedUrl;
        updateForm("profile_image_url", uploadedUrl);
      }
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({ ...formData, user_id: user.id, profile_image_url: profileImageUrl });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Your Profile</h1>
        <Card>
          <CardContent className="p-6">
            <p>Loading profile...</p>
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
            <Badge variant="outline">{profile.role}</Badge>
            <Badge variant={profile.status === "active" ? "default" : "destructive"}>
              {profile.status}
            </Badge>
          </div>
        )}
      </div>

      {profile?.profile_image_url && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <img
              src={profile.profile_image_url}
              alt="Profile"
              className="w-16 h-16 rounded-full border"
            />
            <span className="text-sm text-gray-600">Current profile image</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <Input
              type="file"
              accept="image/png, image/jpeg"
              onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              placeholder="John Smith"
              value={formData.full_name || ""}
              onChange={(e) => updateForm("full_name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Nickname (for social)</Label>
            <Input
              placeholder="GreyNomadJohn"
              value={formData.nickname || ""}
              onChange={(e) => updateForm("nickname", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={profile?.email || user?.email || ""}
              disabled
              className="bg-gray-50"
            />
          </div>
          <div className="space-y-2">
            <Label>Region</Label>
            <RegionSelector
              defaultValue={profile?.region || region}
              onRegionChange={(val) => {
                setRegion(val);
                updateForm("region", val);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Travel Style</Label>
            <Select
              value={isCouple ? "couple" : "solo"}
              onValueChange={(val) => {
                setIsCouple(val === "couple");
                updateForm("travel_style", val);
              }}
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

          {/* Partner UI kept untouched */}
          {isCouple && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Partner's Name</Label>
                <Input placeholder="Mary Smith" />
              </div>
              <div className="space-y-2">
                <Label>Partner's Email</Label>
                <Input placeholder="mary@example.com" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Partner's Profile Picture</Label>
                <Input type="file" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveProfile}>Save Profile</Button>
      </div>
    </div>
  );
}
