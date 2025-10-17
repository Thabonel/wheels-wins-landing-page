/**
 * Mobile device detection and optimization utilities
 */

export interface MobileInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isWebView: boolean;
  supportsOrientation: boolean;
  supportsVisibilityAPI: boolean;
}

/**
 * Detect mobile platform and capabilities
 */
export function getMobileInfo(): MobileInfo {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform = typeof navigator !== 'undefined' ? navigator.platform : '';

  const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(userAgent);
  const isMobile = isIOS || isAndroid || /Mobi|Mobile/.test(userAgent);
  
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isChrome = /Chrome/.test(userAgent) && !isSafari;
  const isWebView = isMobile && !isSafari && !isChrome;

  const supportsOrientation = typeof window !== 'undefined' && 'orientation' in window;
  const supportsVisibilityAPI = typeof document !== 'undefined' && 'visibilityState' in document;

  return {
    isMobile,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isWebView,
    supportsOrientation,
    supportsVisibilityAPI
  };
}

/**
 * Check if device is in portrait mode
 */
export function isPortrait(): boolean {
  if (typeof window === 'undefined') return true;
  
  // Use CSS media query as primary check
  if (window.matchMedia) {
    return window.matchMedia('(orientation: portrait)').matches;
  }
  
  // Fallback to window dimensions
  return window.innerHeight > window.innerWidth;
}

/**
 * Check if device is in landscape mode
 */
export function isLandscape(): boolean {
  return !isPortrait();
}

/**
 * Get safe area insets for notched devices
 */
export function getSafeAreaInsets() {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const style = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0', 10)
  };
}

/**
 * Check if device supports Speech Synthesis with mobile-specific checks
 */
export function checkSpeechSynthesisSupport(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hasAPI = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  if (!hasAPI) return false;

  const mobileInfo = getMobileInfo();
  
  // iOS Safari has specific requirements
  if (mobileInfo.isIOS && mobileInfo.isSafari) {
    // iOS Safari requires user interaction first
    return true; // We'll handle the user interaction requirement separately
  }
  
  // Android Chrome generally works well
  if (mobileInfo.isAndroid && mobileInfo.isChrome) {
    return true;
  }
  
  // WebView apps may have limited support
  if (mobileInfo.isWebView) {
    return false; // Conservative approach for WebView
  }
  
  return hasAPI;
}

/**
 * Check if device supports Speech Recognition with mobile-specific checks
 */
export function checkSpeechRecognitionSupport(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hasAPI = !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    (window as any).mozSpeechRecognition ||
    (window as any).msSpeechRecognition
  );
  
  if (!hasAPI) return false;

  const mobileInfo = getMobileInfo();
  
  // iOS Safari supports Speech Recognition
  if (mobileInfo.isIOS && mobileInfo.isSafari) {
    return true;
  }
  
  // Android Chrome supports Speech Recognition
  if (mobileInfo.isAndroid && mobileInfo.isChrome) {
    return true;
  }
  
  // WebView apps may have limited support
  if (mobileInfo.isWebView) {
    return false;
  }
  
  return hasAPI;
}

/**
 * Get optimal touch target size for current device
 */
export function getOptimalTouchTargetSize(): number {
  const mobileInfo = getMobileInfo();
  
  if (!mobileInfo.isMobile) {
    return 40; // Standard desktop size
  }
  
  // iOS prefers 44px minimum
  if (mobileInfo.isIOS) {
    return 44;
  }
  
  // Android prefers 48dp (48px at 1x density)
  if (mobileInfo.isAndroid) {
    return 48;
  }
  
  // Default mobile size
  return 44;
}

/**
 * Check if device is currently in background
 */
export function isInBackground(): boolean {
  if (typeof document === 'undefined') return false;
  
  return document.visibilityState === 'hidden';
}

/**
 * Add listener for app visibility changes (background/foreground)
 */
export function addVisibilityChangeListener(callback: (isVisible: boolean) => void): () => void {
  if (typeof document === 'undefined') {
    return () => {}; // No-op for SSR
  }
  
  const handleVisibilityChange = () => {
    callback(document.visibilityState === 'visible');
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

/**
 * Add listener for orientation changes
 */
export function addOrientationChangeListener(callback: (isPortrait: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op for SSR
  }
  
  const handleOrientationChange = () => {
    // Add small delay to ensure dimensions are updated
    setTimeout(() => {
      callback(isPortrait());
    }, 100);
  };
  
  // Use both orientationchange and resize for better compatibility
  window.addEventListener('orientationchange', handleOrientationChange);
  window.addEventListener('resize', handleOrientationChange);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('orientationchange', handleOrientationChange);
    window.removeEventListener('resize', handleOrientationChange);
  };
}

/**
 * Check if virtual keyboard is likely open (iOS/Android heuristic)
 */
export function isVirtualKeyboardOpen(): boolean {
  if (typeof window === 'undefined') return false;
  
  const mobileInfo = getMobileInfo();
  if (!mobileInfo.isMobile) return false;
  
  // Heuristic: If viewport height is significantly smaller than screen height,
  // virtual keyboard is likely open
  const viewportHeight = window.innerHeight;
  const screenHeight = window.screen.height;
  
  // Account for browser UI and notches
  const threshold = mobileInfo.isIOS ? 0.75 : 0.6;
  
  return viewportHeight < (screenHeight * threshold);
}

/**
 * Force iOS Safari to unlock audio context (required for TTS)
 */
export function unlockAudioContextIOS(): Promise<boolean> {
  return new Promise((resolve) => {
    const mobileInfo = getMobileInfo();
    
    if (!mobileInfo.isIOS || !mobileInfo.isSafari) {
      resolve(true);
      return;
    }
    
    // Try to create and play a silent sound to unlock audio
    try {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      utterance.rate = 10;
      utterance.pitch = 0;
      
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
      
      speechSynthesis.speak(utterance);
      
      // Fallback timeout
      setTimeout(() => resolve(true), 1000);
    } catch (error) {
      resolve(false);
    }
  });
}

/**
 * Prevent zoom on input focus (iOS Safari)
 */
export function preventIOSZoom() {
  const mobileInfo = getMobileInfo();
  
  if (!mobileInfo.isIOS) return () => {};
  
  const viewport = document.querySelector('meta[name=viewport]');
  if (!viewport) return () => {};
  
  const originalContent = viewport.getAttribute('content') || '';
  
  const handleFocusIn = () => {
    viewport.setAttribute('content', `${originalContent  }, user-scalable=no`);
  };
  
  const handleFocusOut = () => {
    viewport.setAttribute('content', originalContent);
  };
  
  document.addEventListener('focusin', handleFocusIn);
  document.addEventListener('focusout', handleFocusOut);
  
  return () => {
    document.removeEventListener('focusin', handleFocusIn);
    document.removeEventListener('focusout', handleFocusOut);
    viewport.setAttribute('content', originalContent);
  };
}

/**
 * Mobile-specific CSS class names for conditional styling
 */
export function getMobileCSSClasses(): string[] {
  const mobileInfo = getMobileInfo();
  const classes: string[] = [];
  
  if (mobileInfo.isMobile) classes.push('is-mobile');
  if (mobileInfo.isIOS) classes.push('is-ios');
  if (mobileInfo.isAndroid) classes.push('is-android');
  if (mobileInfo.isSafari) classes.push('is-safari');
  if (mobileInfo.isChrome) classes.push('is-chrome');
  if (mobileInfo.isWebView) classes.push('is-webview');
  if (isPortrait()) classes.push('is-portrait');
  if (isLandscape()) classes.push('is-landscape');
  if (isVirtualKeyboardOpen()) classes.push('keyboard-open');
  
  return classes;
}