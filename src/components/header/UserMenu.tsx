
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LogoutButton from "./LogoutButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase";

const UserMenu = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!user || !isAuthenticated) return;

      const { data } = await supabase
        .from('profiles')
        .select('profile_image_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.profile_image_url) {
        setProfileImageUrl(data.profile_image_url);
      }
    };

    fetchProfileImage();
  }, [user, isAuthenticated]);

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex items-center space-x-4">
      {/* Profile avatar */}
      <button
        onClick={() => navigate("/profile")}
        className="hover:ring-2 ring-blue-500 transition rounded-full"
        title="Your Profile"
      >
        <Avatar>
          {profileImageUrl && <AvatarImage src={profileImageUrl} alt="Profile" />}
          <AvatarFallback className="bg-primary text-primary-foreground">
            {user?.email?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      </button>
      
      {/* Log Out button */}
      <LogoutButton />
    </div>
  );
};

export default UserMenu;
