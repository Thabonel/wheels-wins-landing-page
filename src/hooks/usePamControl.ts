import { useCallback } from 'react';

/**
 * Hook for controlling PAM chat from external components
 * Allows opening PAM and sending messages programmatically
 */
export function usePamControl() {
  
  const openPamWithMessage = useCallback((message: string) => {
    // Emit a custom event that the PAM component can listen to
    window.dispatchEvent(new CustomEvent('pam-open-with-message', {
      detail: { message }
    }));
  }, []);

  const openPam = useCallback(() => {
    // Emit event to open PAM without a message
    window.dispatchEvent(new CustomEvent('pam-open'));
  }, []);

  const sendMessageToPam = useCallback((message: string) => {
    // Emit event to send a message to PAM (if already open)
    window.dispatchEvent(new CustomEvent('pam-send-message', {
      detail: { message }
    }));
  }, []);

  return {
    openPamWithMessage,
    openPam,
    sendMessageToPam
  };
}