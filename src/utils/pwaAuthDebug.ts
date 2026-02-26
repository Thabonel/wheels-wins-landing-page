/**
 * PWA Authentication Debug Utility
 *
 * Helps diagnose PWA authentication issues on iOS devices
 */

export interface PWAAuthDiagnostics {
  isPWAStandalone: boolean;
  isIOSDevice: boolean;
  hasStorageIsolation: boolean;
  userAgent: string;
  displayMode: string;
  localStorage: {
    available: boolean;
    itemCount: number;
    supaseAuthKeys: string[];
  };
  sessionStorage: {
    available: boolean;
    itemCount: number;
  };
  navigator: {
    standalone?: boolean;
    onLine: boolean;
  };
  recommendations: string[];
}

export const diagnosePWAAuth = (): PWAAuthDiagnostics => {
  const isPWAStandalone = (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true ||
    ((window.navigator as any).standalone === true)
  );

  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const hasStorageIsolation = isPWAStandalone && isIOSDevice;

  // Check localStorage availability and Supabase keys
  let localStorageInfo = {
    available: false,
    itemCount: 0,
    supaseAuthKeys: [] as string[]
  };

  try {
    localStorageInfo.available = true;
    localStorageInfo.itemCount = localStorage.length;

    // Find all Supabase auth keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') && key.endsWith('-auth-token') || key === 'pam-auth-token')) {
        localStorageInfo.supaseAuthKeys.push(key);
      }
    }
  } catch (error) {
    localStorageInfo.available = false;
  }

  // Check sessionStorage
  let sessionStorageInfo = {
    available: false,
    itemCount: 0
  };

  try {
    sessionStorageInfo.available = true;
    sessionStorageInfo.itemCount = sessionStorage.length;
  } catch (error) {
    sessionStorageInfo.available = false;
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (hasStorageIsolation) {
    recommendations.push('iOS PWA storage isolation detected - authentication will require re-login');

    if (localStorageInfo.supaseAuthKeys.length > 0) {
      recommendations.push('Found browser auth keys - these will not be accessible in PWA mode');
    }

    recommendations.push('Use memory-based storage for PWA authentication');
  }

  if (isPWAStandalone && !isIOSDevice) {
    recommendations.push('PWA mode detected on non-iOS device - localStorage should work normally');
  }

  if (!isPWAStandalone && localStorageInfo.supaseAuthKeys.length === 0) {
    recommendations.push('No Supabase auth keys found - user needs to log in');
  }

  return {
    isPWAStandalone,
    isIOSDevice,
    hasStorageIsolation,
    userAgent: navigator.userAgent,
    displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
    localStorage: localStorageInfo,
    sessionStorage: sessionStorageInfo,
    navigator: {
      standalone: (navigator as any).standalone,
      onLine: navigator.onLine
    },
    recommendations
  };
};

export const logPWAAuthDiagnostics = (): void => {
  const diagnostics = diagnosePWAAuth();

  console.group('🔍 PWA Authentication Diagnostics');
  console.log('PWA Standalone Mode:', diagnostics.isPWAStandalone);
  console.log('iOS Device:', diagnostics.isIOSDevice);
  console.log('Storage Isolation:', diagnostics.hasStorageIsolation);
  console.log('Display Mode:', diagnostics.displayMode);
  console.log('User Agent:', diagnostics.userAgent.substring(0, 100) + '...');

  console.group('Storage Analysis');
  console.log('localStorage Available:', diagnostics.localStorage.available);
  console.log('localStorage Items:', diagnostics.localStorage.itemCount);
  console.log('Supabase Auth Keys:', diagnostics.localStorage.supaseAuthKeys);
  console.log('sessionStorage Available:', diagnostics.sessionStorage.available);
  console.log('sessionStorage Items:', diagnostics.sessionStorage.itemCount);
  console.groupEnd();

  if (diagnostics.recommendations.length > 0) {
    console.group('📋 Recommendations');
    diagnostics.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    console.groupEnd();
  }

  console.groupEnd();
};

// Auto-run diagnostics in development or when PWA issues are suspected
if (import.meta.env.MODE === 'development' || window.location.search.includes('pwa-debug')) {
  // Delay to ensure DOM is ready
  setTimeout(() => {
    logPWAAuthDiagnostics();
  }, 1000);
}