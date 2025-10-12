import React, { useState } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/context/AuthContext';
import { locationService } from '@/services/locationService';

interface LocationConsentModalProps {
  open: boolean;
  onClose: () => void;
}

export const LocationConsentModal: React.FC<LocationConsentModalProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const { settings, updateSettings } = useUserSettings();
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [shareOnMap, setShareOnMap] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const onConfirm = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateSettings({
        location_preferences: {
          ...(settings?.location_preferences || {}),
          use_current_location: useCurrentLocation,
          auto_detect_location: useCurrentLocation,
        },
        privacy_preferences: {
          ...(settings?.privacy_preferences || {}),
          location_sharing: shareOnMap,
        },
      });

      // If user opted into map sharing, start tracking with sensible defaults
      if (shareOnMap) {
        const onWheels = window.location.pathname.includes('/wheels');
        await locationService.startLocationTracking(user.id, {
          highAccuracy: onWheels,
          minDistanceMeters: onWheels ? 300 : 500,
          minIntervalMs: onWheels ? 120000 : 180000, // 2–3 minutes
        });
      }
    } finally {
      setSaving(false);
      localStorage.setItem('loc_consent_seen', '1');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-900">Enable Location</h2>
        <p className="mt-2 text-sm text-gray-600">
          Turn on location to get instant local weather, nearby places, and show your
          position on the community map (optional).
        </p>

        <div className="mt-4 space-y-3">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={useCurrentLocation}
              onChange={(e) => setUseCurrentLocation(e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-gray-900">Use precise location</span>
              <div className="text-sm text-gray-600">For weather and personalized help</div>
            </span>
          </label>

          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={shareOnMap}
              onChange={(e) => setShareOnMap(e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-gray-900">Share on community map</span>
              <div className="text-sm text-gray-600">Visible to other members (can be turned off anytime)</div>
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Not now
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {saving ? 'Saving…' : 'Enable'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationConsentModal;

