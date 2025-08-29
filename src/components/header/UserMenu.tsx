
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LogoutButton from "./LogoutButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase";
import { useProfile } from "@/hooks/useProfile";

const UserMenu = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { profile } = useProfile(); // Use the shared profile hook
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // Use profile from the hook first
    if (profile?.profile_image_url) {
      console.log('Using profile image from hook:', profile.profile_image_url);
      setProfileImageUrl(profile.profile_image_url);
      return;
    }

    // Fallback to direct fetch if hook doesn't have it
    const fetchProfileImage = async () => {
      if (!user || !isAuthenticated) return;

      console.log('Fetching profile image for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('profile_image_url')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Profile data:', data);
      console.log('Profile fetch error:', error);

      if (data?.profile_image_url) {
        console.log('Setting profile image URL:', data.profile_image_url);
        setProfileImageUrl(data.profile_image_url);
      } else {
        console.log('No profile image URL found');
      }
    };

    fetchProfileImage();
  }, [user, isAuthenticated, profile]);

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
          {profileImageUrl && (
            <>
              {console.log('Rendering avatar with URL:', profileImageUrl)}
              <AvatarImage 
                src={profileImageUrl} 
                alt="User profile picture - Wheels & Wins RV trip planner account"
                onError={(e) => {
                  console.error('Avatar image failed to load:', e);
                  console.error('Failed URL was:', profileImageUrl);
                }}
                onLoad={() => console.log('Avatar image loaded successfully')}
              />
            </>
          )}
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
