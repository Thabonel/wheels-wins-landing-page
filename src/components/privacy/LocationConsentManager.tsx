import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserSettings } from '@/hooks/useUserSettings';
import LocationConsentModal from './LocationConsentModal';

export const LocationConsentManager: React.FC = () => {
  const { user } = useAuth();
  const { settings, loading } = useUserSettings();
  const [open, setOpen] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [initializationTimeout, setInitializationTimeout] = useState(false);

  // Track when settings are definitively ready
  useEffect(() => {
    const isReady = !loading && settings !== null && user !== null;
    setSettingsReady(isReady);

    // Failsafe: If loading takes too long, assume ready after 10 seconds
    if (!isReady && !initializationTimeout) {
      const timeout = setTimeout(() => {
        console.warn('LocationConsentManager: Initialization timeout reached, proceeding anyway');
        setInitializationTimeout(true);
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [loading, settings, user, initializationTimeout]);

  // Only check settings AFTER they're ready
  useEffect(() => {
    if (!settingsReady && !initializationTimeout) return;
    if (!user) return;

    const seen = localStorage.getItem('loc_consent_seen') === '1';
    const useCurrent = settings?.location_preferences?.use_current_location;
    const shareMap = settings?.privacy_preferences?.location_sharing;

    // Show once after login if neither is enabled and we haven't shown before
    if (!seen && !useCurrent && !shareMap) {
      setOpen(true);
    }
  }, [settingsReady, initializationTimeout, user, settings]);

  // Register event listeners ONLY when settings are ready
  useEffect(() => {
    if (!settingsReady && !initializationTimeout) return;

    const handler = (e: Event) => {
      try {
        e.preventDefault();
        setOpen(true);
      } catch (err) {
        console.error('LocationConsentManager: Event handler error:', err);
      }
    };

    const events = ['open-location-consent'];

    // Add mobile touch variant for iOS Safari
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      events.push('touchstart-location-consent');
    }

    try {
      events.forEach(event => {
        window.addEventListener(event, handler, { passive: false });
      });
    } catch (err) {
      console.error('LocationConsentManager: Failed to register event listeners:', err);
    }

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handler);
      });
    };
  }, [settingsReady, initializationTimeout]);

  // Only render modal when settings are definitively ready
  if (!settingsReady && !initializationTimeout) return null;
  if (!open) return null;
  return <LocationConsentModal open={open} onClose={() => setOpen(false)} />;
};

export default LocationConsentManager;
