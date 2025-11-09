import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { syncLocalPhotos } from '@/utils/fileUploadUtils';
import { toast } from 'sonner';

/**
 * Automatically syncs locally-stored photos to Supabase storage
 * This runs in the background when the app loads
 */
export const PhotoSyncHandler = () => {
  const { user } = useAuth();

  useEffect(() => {
    const performSync = async () => {
      if (!user) return;

      try {
        // Only sync if online
        if (!navigator.onLine) return;

        await syncLocalPhotos(user.id);
      } catch (error) {
        // Silently fail - sync will retry next time
        console.error('Photo sync failed:', error);
      }
    };

    // Sync immediately on mount
    performSync();

    // Also sync when coming back online
    const handleOnline = () => {
      performSync();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [user]);

  // This component doesn't render anything
  return null;
};
