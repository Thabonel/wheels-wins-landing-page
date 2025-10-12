import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserSettings } from '@/hooks/useUserSettings';
import LocationConsentModal from './LocationConsentModal';

export const LocationConsentManager: React.FC = () => {
  const { user } = useAuth();
  const { settings, loading } = useUserSettings();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || loading) return;

    const seen = localStorage.getItem('loc_consent_seen') === '1';
    const useCurrent = settings?.location_preferences?.use_current_location;
    const shareMap = settings?.privacy_preferences?.location_sharing;

    // Show once after login if neither is enabled and we haven't shown before
    if (!seen && !useCurrent && !shareMap) {
      setOpen(true);
    }
  }, [user?.id, loading, settings?.location_preferences?.use_current_location, settings?.privacy_preferences?.location_sharing]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-location-consent', handler);
    return () => window.removeEventListener('open-location-consent', handler);
  }, []);

  if (!open) return null;
  return <LocationConsentModal open={open} onClose={() => setOpen(false)} />;
};

export default LocationConsentManager;
