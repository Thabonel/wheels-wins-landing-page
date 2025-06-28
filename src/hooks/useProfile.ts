import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Profile {
  id: number;
  user_id: string;
  email: string;
  role: string;
  status: string;
  region: string;
  full_name?: string;
  nickname?: string;
  profile_image_url?: string;
  travel_style?: string;
  partner_name?: string;
  partner_email?: string;
  partner_profile_image_url?: string;
  vehicle_type?: string;
  vehicle_make_model?: string;
  fuel_type?: string;
  towing?: string;
  second_vehicle?: string;
  max_driving?: string;
  camp_types?: string;
  accessibility?: string;
  pets?: string;
  created_at: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Call your backend API instead of direct Supabase
        const response = await fetch(`https://pam-backend.onrender.com/api/v1/users/${user.id}/profile`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        
        const data = await response.json();
        setProfile(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const refreshProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(`https://pam-backend.onrender.com/api/v1/users/${user.id}/profile`);
      
      if (!response.ok) {
        throw new Error('Failed to refresh profile');
      }
      
      const data = await response.json();
      setProfile(data);
      setError(null);
    } catch (err) {
      console.error('Error refreshing profile:', err);
      setError('Failed to refresh profile');
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    loading,
    error,
    refreshProfile
  };
};
