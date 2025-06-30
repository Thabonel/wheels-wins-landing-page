
import { useAuthState } from './hooks/useAuthState';
import { useDrawerFetch } from './hooks/useDrawerFetch';
import { useDrawerCreation } from './hooks/useDrawerCreation';
import { useDrawerDeletion } from './hooks/useDrawerDeletion';

export const useDrawerOperations = (
  onDrawerCreated?: (drawer: any) => void,
  onDrawerDeleted?: (drawer: any) => void
) => {
  const authState = useAuthState();
  const { existingDrawers, setExistingDrawers, fetchExistingDrawers } = useDrawerFetch(authState);
  const { isCreating, createDrawer } = useDrawerCreation(
    authState,
    existingDrawers,
    setExistingDrawers,
    onDrawerCreated
  );
  const { isDeleting, deleteDrawer } = useDrawerDeletion(
    authState,
    setExistingDrawers,
    onDrawerDeleted
  );

  return {
    existingDrawers,
    isCreating,
    isDeleting,
    authState,
    retryCount: 0, // Simplified - no retry logic
    createDrawer,
    deleteDrawer,
    fetchExistingDrawers
  };
};
