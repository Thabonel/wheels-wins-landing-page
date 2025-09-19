import React from 'react';

// Safe wrapper for PAM context that returns null if PAM is not available
export function usePAMContextSafe() {
  try {
    // Try to import and use PAMContext
    const PAMContext = React.useContext(React.createContext<any>(null));
    
    // Return a mock PAM state if context is not available
    return {
      isPAMReady: false,
      isPAMListening: false,
      startListening: () => {},
      stopListening: () => {},
      sendToPAM: () => {},
      messages: [],
      isProcessing: false,
      suggestions: [],
      clearSuggestions: () => {},
      isPAMActive: false,
      togglePAM: () => {},
      hasVoiceCapabilities: false,
    };
  } catch (error) {
    // Return mock PAM state if context throws error
    return {
      isPAMReady: false,
      isPAMListening: false,
      startListening: () => {},
      stopListening: () => {},
      sendToPAM: () => {},
      messages: [],
      isProcessing: false,
      suggestions: [],
      clearSuggestions: () => {},
      isPAMActive: false,
      togglePAM: () => {},
      hasVoiceCapabilities: false,
    };
  }
}