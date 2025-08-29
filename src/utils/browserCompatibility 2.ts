/**
 * Browser Compatibility Utilities for Voice Features
 * Provides cross-browser compatibility checks and polyfills
 */

export interface BrowserCapabilities {
  mediaRecorder: boolean;
  webAudio: boolean;
  speechRecognition: boolean;
  speechSynthesis: boolean;
  supportedAudioFormats: string[];
  browser: string;
  version: string;
  isMobile: boolean;
  hasPermissions: boolean;
}

/**
 * Detect browser type and version
 */
export const detectBrowser = (): { browser: string; version: string } => {
  const userAgent = navigator.userAgent;
  let browser = 'Unknown';
  let version = '0';

  if (userAgent.indexOf('Firefox') > -1) {
    browser = 'Firefox';
    version = userAgent.match(/Firefox\/(\d+\.\d+)/)?.[1] || '0';
  } else if (userAgent.indexOf('Chrome') > -1) {
    browser = 'Chrome';
    version = userAgent.match(/Chrome\/(\d+\.\d+)/)?.[1] || '0';
  } else if (userAgent.indexOf('Safari') > -1) {
    browser = 'Safari';
    version = userAgent.match(/Version\/(\d+\.\d+)/)?.[1] || '0';
  } else if (userAgent.indexOf('Edge') > -1) {
    browser = 'Edge';
    version = userAgent.match(/Edge\/(\d+\.\d+)/)?.[1] || '0';
  }

  return { browser, version };
};

/**
 * Check if device is mobile
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Get supported audio formats for MediaRecorder
 */
export const getSupportedAudioFormats = (): string[] => {
  if (!window.MediaRecorder) return [];

  const formats = [
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/wav',
  ];

  return formats.filter(format => {
    try {
      return MediaRecorder.isTypeSupported(format);
    } catch {
      return false;
    }
  });
};

/**
 * Get browser capabilities for voice features
 */
export const getBrowserCapabilities = (): BrowserCapabilities => {
  const { browser, version } = detectBrowser();
  
  return {
    mediaRecorder: !!(window.MediaRecorder && navigator.mediaDevices?.getUserMedia),
    webAudio: !!(window.AudioContext || (window as any).webkitAudioContext),
    speechRecognition: !!(
      window.SpeechRecognition || 
      (window as any).webkitSpeechRecognition
    ),
    speechSynthesis: !!window.speechSynthesis,
    supportedAudioFormats: getSupportedAudioFormats(),
    browser,
    version,
    isMobile: isMobileDevice(),
    hasPermissions: !!navigator.permissions,
  };
};

/**
 * Check if voice recording is supported
 */
export const isVoiceRecordingSupported = (): boolean => {
  const capabilities = getBrowserCapabilities();
  return capabilities.mediaRecorder && capabilities.supportedAudioFormats.length > 0;
};

/**
 * Get the best audio format for the current browser
 */
export const getBestAudioFormat = (): string => {
  const formats = getSupportedAudioFormats();
  
  // Prefer webm with opus codec for best quality/size ratio
  if (formats.includes('audio/webm;codecs=opus')) {
    return 'audio/webm;codecs=opus';
  }
  
  // Fallback to regular webm
  if (formats.includes('audio/webm')) {
    return 'audio/webm';
  }
  
  // Fallback to ogg
  if (formats.includes('audio/ogg;codecs=opus')) {
    return 'audio/ogg;codecs=opus';
  }
  
  // Last resort: mp4 or wav
  if (formats.includes('audio/mp4')) {
    return 'audio/mp4';
  }
  
  if (formats.includes('audio/wav')) {
    return 'audio/wav';
  }
  
  // Default fallback
  return 'audio/webm';
};

/**
 * Request microphone permission
 */
export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop all tracks to release the microphone
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    return false;
  }
};

/**
 * Check microphone permission status
 */
export const checkMicrophonePermission = async (): Promise<PermissionState | null> => {
  if (!navigator.permissions) {
    return null;
  }

  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return result.state;
  } catch (error) {
    console.error('Error checking microphone permission:', error);
    return null;
  }
};

/**
 * Get AudioContext with vendor prefixes
 */
export const getAudioContext = (): AudioContext | null => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      return new AudioCtx();
    }
  } catch (error) {
    console.error('Error creating AudioContext:', error);
  }
  return null;
};

/**
 * Get SpeechRecognition with vendor prefixes
 */
export const getSpeechRecognition = (): any => {
  return window.SpeechRecognition || (window as any).webkitSpeechRecognition;
};

/**
 * Browser-specific fixes and workarounds
 */
export const applyBrowserFixes = () => {
  const { browser } = detectBrowser();

  // Safari-specific fixes
  if (browser === 'Safari') {
    // Safari requires user interaction for AudioContext
    document.addEventListener('click', () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    }, { once: true });
  }

  // Firefox-specific fixes
  if (browser === 'Firefox') {
    // Firefox sometimes needs explicit audio constraints
    if (navigator.mediaDevices?.getUserMedia) {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = (constraints: MediaStreamConstraints) => {
        if (constraints.audio === true) {
          constraints.audio = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          };
        }
        return originalGetUserMedia(constraints);
      };
    }
  }
};

/**
 * Show browser compatibility warning
 */
export const showCompatibilityWarning = (): string | null => {
  const capabilities = getBrowserCapabilities();
  const warnings: string[] = [];

  if (!capabilities.mediaRecorder) {
    warnings.push('Voice recording is not supported in your browser.');
  }

  if (capabilities.supportedAudioFormats.length === 0) {
    warnings.push('No compatible audio formats found.');
  }

  if (capabilities.browser === 'Safari' && parseFloat(capabilities.version) < 14) {
    warnings.push('Please update Safari to version 14 or later for better voice support.');
  }

  if (capabilities.isMobile && capabilities.browser === 'Chrome') {
    warnings.push('Voice features may have limited functionality on mobile Chrome.');
  }

  return warnings.length > 0 ? warnings.join(' ') : null;
};

/**
 * Initialize browser compatibility fixes
 */
export const initializeBrowserCompatibility = () => {
  applyBrowserFixes();
  
  const warning = showCompatibilityWarning();
  if (warning) {
    console.warn('Browser compatibility warning:', warning);
  }

  const capabilities = getBrowserCapabilities();
  console.info('Browser capabilities:', capabilities);
  
  return capabilities;
};