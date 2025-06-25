
import { useState, useCallback } from 'react';

interface LockedPointsState {
  originLocked: boolean;
  destinationLocked: boolean;
}

export function useLockedPoints() {
  const [lockedPoints, setLockedPoints] = useState<LockedPointsState>({
    originLocked: false,
    destinationLocked: false
  });

  const lockOrigin = useCallback(() => {
    setLockedPoints(prev => ({ ...prev, originLocked: true }));
  }, []);

  const lockDestination = useCallback(() => {
    setLockedPoints(prev => ({ ...prev, destinationLocked: true }));
  }, []);

  const unlockOrigin = useCallback(() => {
    setLockedPoints(prev => ({ ...prev, originLocked: false }));
  }, []);

  const unlockDestination = useCallback(() => {
    setLockedPoints(prev => ({ ...prev, destinationLocked: false }));
  }, []);

  const resetLocks = useCallback(() => {
    setLockedPoints({ originLocked: false, destinationLocked: false });
  }, []);

  return {
    ...lockedPoints,
    lockOrigin,
    lockDestination,
    unlockOrigin,
    unlockDestination,
    resetLocks
  };
}
