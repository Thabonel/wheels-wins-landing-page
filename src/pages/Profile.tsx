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
      if (!user) return setLoading(false);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        toast({ title: "Error", description: "Failed to fetch profile.", variant: "destructive" });
      } else if (data) {
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
      } else {
        const newProfile = { user_id: user.id, email: user.email, region, status: "active" };
        const { data: created, error: createError } = await supabase.from("profiles").insert(newProfile).select().single();
        if (!createError) setProfile(created);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user, region]);

  const convertHeicToJpeg = async (file: File): Promise<File> => {
    if (file.type.includes("heic")) {
      const heic2any = (await import("heic2any")).default;
      const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
      return new File([blob as Blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
    }
    return file;
  };

  const uploadFile = async (file: File, isPartner = false) => {
    if (!user) throw new Error("Not authenticated");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${isPartner ? "partner" : "profile"}_${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from("user-avatars").upload(path, file, { upsert: true });
    if (error) throw error;
    const { publicUrl } = supabase.storage.from("user-avatars").getPublicUrl(path).data;
    return publicUrl;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isPartner = false) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast({ title: "Error", description: "Max file size is 5MB", variant: "destructive" });

    isPartner ? setUploadingPartnerPhoto(true) : setUploadingPhoto(true);
    try {
      const processed = await convertHeicToJpeg(file);
      const url = await uploadFile(processed, isPartner);
      const update = isPartner ? { partner_profile_image_url: url } : { profile_image_url: url };
      await supabase.from("profiles").update(update).eq("user_id", user.id);
      setProfile(prev => ({ ...prev, ...update }));
    } catch (e) {
      toast({ title: "Upload Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      isPartner ? setUploadingPartnerPhoto(false) : setUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!user) return toast({ title: "Error", description: "Not logged in", variant: "destructive" });
    setSaving(true);
    const payload = {
      user_id: user.id,
      email: user.email,
      region,
      status: "active",
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
      profile_image_url: profile?.profile_image_url,
      partner_profile_image_url: profile?.partner_profile_image_url
    };

    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProfile(payload);
      toast({ title: "Success", description: "Profile saved" });
    }
    setSaving(false);
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return <div className="p-6">Please log in</div>;

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
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Button>
      </div>
    </div>
  );
}
