
import { useAuthState } from './hooks/useAuthState';
import { useDrawerFetch } from './hooks/useDrawerFetch';
import { useDrawerCreation } from './hooks/useDrawerCreation';

export const useDrawerOperations = (onDrawerCreated?: (drawer: any) => void) => {
  const authState = useAuthState();
  const { existingDrawers, setExistingDrawers, fetchExistingDrawers } = useDrawerFetch(authState);
  const { isCreating, createDrawer } = useDrawerCreation(
    authState,
    existingDrawers,
    setExistingDrawers,
    onDrawerCreated
  );

  return {
    existingDrawers,
    isCreating,
    authState,
    retryCount: 0, // Simplified - no retry logic
    createDrawer,
    fetchExistingDrawers
  };
};
