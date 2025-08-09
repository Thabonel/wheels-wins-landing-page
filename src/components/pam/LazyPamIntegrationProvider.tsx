import React, { lazy, Suspense, createContext, useContext, useState } from 'react';

// Lazy load the heavy PAM integration with all voice services
const PamIntegrationProvider = lazy(() => import('./PamIntegrationProvider').then(module => ({
  default: module.PamIntegrationProvider
})));

// Context to manage PAM loading state
interface PamLoadingContextType {
  isPamLoaded: boolean;
  loadPam: () => void;
}

const PamLoadingContext = createContext<PamLoadingContextType>({
  isPamLoaded: false,
  loadPam: () => {}
});

export const usePamLoading = () => useContext(PamLoadingContext);

const PamLoadingFallback = () => (
  <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border animate-pulse">
    <div className="flex items-center space-x-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <div className="space-y-1">
        <div className="text-sm font-medium text-gray-900">Loading PAM...</div>
        <div className="text-xs text-gray-500">Initializing voice services</div>
      </div>
    </div>
  </div>
);

interface LazyPamIntegrationProviderProps {
  children: React.ReactNode;
}

export const LazyPamIntegrationProvider: React.FC<LazyPamIntegrationProviderProps> = ({ children }) => {
  const [isPamLoaded, setIsPamLoaded] = useState(false);

  const loadPam = () => {
    setIsPamLoaded(true);
  };

  return (
    <PamLoadingContext.Provider value={{ isPamLoaded, loadPam }}>
      {isPamLoaded ? (
        <Suspense fallback={<PamLoadingFallback />}>
          <PamIntegrationProvider>
            {children}
          </PamIntegrationProvider>
        </Suspense>
      ) : (
        children
      )}
    </PamLoadingContext.Provider>
  );
};