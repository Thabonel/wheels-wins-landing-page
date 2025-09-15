/**
 * Lazy Loaded Voice Components
 * 
 * Progressive enhancement for voice features with lazy loading,
 * feature detection, and graceful fallbacks.
 */

import React, { 
  lazy, 
  Suspense, 
  memo, 
  useState, 
  useEffect, 
  useCallback, 
  useRef 
} from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { performanceMonitor } from '../performance/performanceOptimizer';
import { cn } from '@/lib/utils';

// =====================================================
// LAZY LOADED COMPONENTS
// =====================================================

// Lazy load voice components with chunk naming for better caching
const VoiceRecorder = lazy(() => 
  import('./VoiceRecorder').then(module => ({ 
    default: module.VoiceRecorder 
  })).catch(() => ({ 
    default: () => <VoiceFallback type="recorder" /> 
  }))
);

const VoicePlayer = lazy(() => 
  import('./VoicePlayer').then(module => ({ 
    default: module.VoicePlayer 
  })).catch(() => ({ 
    default: () => <VoiceFallback type="player" /> 
  }))
);

const VoiceSettings = lazy(() => 
  import('./VoiceSettings').then(module => ({ 
    default: module.VoiceSettings 
  })).catch(() => ({ 
    default: () => <VoiceFallback type="settings" /> 
  }))
);

const SpeechToText = lazy(() => 
  import('./SpeechToText').then(module => ({ 
    default: module.SpeechToText 
  })).catch(() => ({ 
    default: () => <VoiceFallback type="stt" /> 
  }))
);

const TextToSpeech = lazy(() => 
  import('./TextToSpeech').then(module => ({ 
    default: module.TextToSpeech 
  })).catch(() => ({ 
    default: () => <VoiceFallback type="tts" /> 
  }))
);

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface VoiceCapabilities {
  speechRecognition: boolean;
  speechSynthesis: boolean;
  mediaRecorder: boolean;
  audioContext: boolean;
  getUserMedia: boolean;
}

export interface VoiceFeatureState {
  isEnabled: boolean;
  isLoading: boolean;
  isSupported: boolean;
  error?: string;
}

interface LazyVoiceProviderProps {
  children: React.ReactNode;
  enablePreloading?: boolean;
  fallbackMode?: 'graceful' | 'disabled' | 'text-only';
}

interface VoiceFallbackProps {
  type: 'recorder' | 'player' | 'settings' | 'stt' | 'tts';
  message?: string;
}

// =====================================================
// FEATURE DETECTION
// =====================================================

export class VoiceFeatureDetector {
  private static capabilities: VoiceCapabilities | null = null;

  static async detectCapabilities(): Promise<VoiceCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    const startTime = performance.now();

    const capabilities: VoiceCapabilities = {
      speechRecognition: this.checkSpeechRecognition(),
      speechSynthesis: this.checkSpeechSynthesis(),
      mediaRecorder: this.checkMediaRecorder(),
      audioContext: this.checkAudioContext(),
      getUserMedia: await this.checkGetUserMedia()
    };

    const detectionTime = performance.now() - startTime;
    
    performanceMonitor.trackRender('VoiceFeatureDetection', detectionTime);

    console.log('🎤 Voice capabilities detected:', capabilities);
    
    this.capabilities = capabilities;
    return capabilities;
  }

  private static checkSpeechRecognition(): boolean {
    return !!(
      'SpeechRecognition' in window ||
      'webkitSpeechRecognition' in window ||
      'mozSpeechRecognition' in window
    );
  }

  private static checkSpeechSynthesis(): boolean {
    return !!(
      'speechSynthesis' in window &&
      'SpeechSynthesisUtterance' in window
    );
  }

  private static checkMediaRecorder(): boolean {
    return !!(
      'MediaRecorder' in window &&
      typeof MediaRecorder.isTypeSupported === 'function'
    );
  }

  private static checkAudioContext(): boolean {
    return !!(
      'AudioContext' in window ||
      'webkitAudioContext' in window
    );
  }

  private static async checkGetUserMedia(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }

      // Test with a minimal constraint to avoid permission prompts
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      
      // Immediately close the stream
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.warn('getUserMedia not available:', error);
      return false;
    }
  }

  static getCompatibilityScore(): number {
    if (!this.capabilities) return 0;
    
    const features = Object.values(this.capabilities);
    const supportedCount = features.filter(Boolean).length;
    
    return (supportedCount / features.length) * 100;
  }

  static getRecommendedFeatures(): string[] {
    if (!this.capabilities) return [];
    
    const recommendations: string[] = [];
    
    if (this.capabilities.speechRecognition && this.capabilities.getUserMedia) {
      recommendations.push('voice-input');
    }
    
    if (this.capabilities.speechSynthesis) {
      recommendations.push('voice-output');
    }
    
    if (this.capabilities.mediaRecorder && this.capabilities.getUserMedia) {
      recommendations.push('voice-recording');
    }
    
    if (this.capabilities.audioContext) {
      recommendations.push('audio-processing');
    }
    
    return recommendations;
  }
}

// =====================================================
// VOICE FEATURE MANAGER
// =====================================================

export class VoiceFeatureManager {
  private static instance: VoiceFeatureManager;
  private features = new Map<string, VoiceFeatureState>();
  private preloadPromises = new Map<string, Promise<void>>();
  
  private constructor() {}

  static getInstance(): VoiceFeatureManager {
    if (!VoiceFeatureManager.instance) {
      VoiceFeatureManager.instance = new VoiceFeatureManager();
    }
    return VoiceFeatureManager.instance;
  }

  async enableFeature(featureName: string): Promise<VoiceFeatureState> {
    const currentState = this.features.get(featureName) || {
      isEnabled: false,
      isLoading: false,
      isSupported: false
    };

    // Don't re-enable if already enabled
    if (currentState.isEnabled) {
      return currentState;
    }

    // Set loading state
    this.features.set(featureName, {
      ...currentState,
      isLoading: true
    });

    try {
      const capabilities = await VoiceFeatureDetector.detectCapabilities();
      const isSupported = this.checkFeatureSupport(featureName, capabilities);

      if (!isSupported) {
        const state: VoiceFeatureState = {
          isEnabled: false,
          isLoading: false,
          isSupported: false,
          error: `${featureName} is not supported in this browser`
        };
        
        this.features.set(featureName, state);
        return state;
      }

      // Preload the component if not already done
      await this.preloadComponent(featureName);

      const state: VoiceFeatureState = {
        isEnabled: true,
        isLoading: false,
        isSupported: true
      };

      this.features.set(featureName, state);
      
      console.log(`✅ Voice feature enabled: ${featureName}`);
      
      return state;

    } catch (error) {
      const state: VoiceFeatureState = {
        isEnabled: false,
        isLoading: false,
        isSupported: false,
        error: `Failed to enable ${featureName}: ${error.message}`
      };

      this.features.set(featureName, state);
      
      console.error(`❌ Failed to enable voice feature: ${featureName}`, error);
      
      return state;
    }
  }

  private checkFeatureSupport(featureName: string, capabilities: VoiceCapabilities): boolean {
    const requirements: Record<string, (caps: VoiceCapabilities) => boolean> = {
      'voice-recorder': (caps) => caps.mediaRecorder && caps.getUserMedia,
      'voice-player': (caps) => caps.audioContext,
      'speech-to-text': (caps) => caps.speechRecognition && caps.getUserMedia,
      'text-to-speech': (caps) => caps.speechSynthesis,
      'voice-settings': () => true // Always supported as it's just UI
    };

    const requirement = requirements[featureName];
    return requirement ? requirement(capabilities) : false;
  }

  private async preloadComponent(featureName: string): Promise<void> {
    if (this.preloadPromises.has(featureName)) {
      return this.preloadPromises.get(featureName);
    }

    const preloadMap: Record<string, () => Promise<void>> = {
      'voice-recorder': () => import('./VoiceRecorder').then(() => {}),
      'voice-player': () => import('./VoicePlayer').then(() => {}),
      'speech-to-text': () => import('./SpeechToText').then(() => {}),
      'text-to-speech': () => import('./TextToSpeech').then(() => {}),
      'voice-settings': () => import('./VoiceSettings').then(() => {})
    };

    const preloadFn = preloadMap[featureName];
    if (!preloadFn) {
      return Promise.resolve();
    }

    const startTime = performance.now();
    const promise = preloadFn().then(() => {
      const loadTime = performance.now() - startTime;
      performanceMonitor.trackRender(`VoiceComponent-${featureName}`, loadTime);
      console.log(`📦 Voice component preloaded: ${featureName} (${loadTime.toFixed(2)}ms)`);
    });

    this.preloadPromises.set(featureName, promise);
    return promise;
  }

  getFeatureState(featureName: string): VoiceFeatureState {
    return this.features.get(featureName) || {
      isEnabled: false,
      isLoading: false,
      isSupported: false
    };
  }

  disableFeature(featureName: string): void {
    const currentState = this.features.get(featureName);
    if (currentState) {
      this.features.set(featureName, {
        ...currentState,
        isEnabled: false,
        isLoading: false
      });
    }
  }

  async preloadAllFeatures(): Promise<void> {
    const features = ['voice-recorder', 'voice-player', 'speech-to-text', 'text-to-speech', 'voice-settings'];
    
    console.log('🚀 Preloading all voice features...');
    
    await Promise.allSettled(
      features.map(feature => this.preloadComponent(feature))
    );
    
    console.log('✅ Voice features preload completed');
  }
}

// =====================================================
// FALLBACK COMPONENTS
// =====================================================

const VoiceFallback = memo<VoiceFallbackProps>(({ type, message }) => {
  const fallbackMessages: Record<string, string> = {
    recorder: 'Voice recording is not available in your browser. You can still type your messages.',
    player: 'Voice playback is not available. Text responses are still fully functional.',
    settings: 'Voice settings are not available, but you can still use all text-based features.',
    stt: 'Speech-to-text is not supported. Please use the text input instead.',
    tts: 'Text-to-speech is not available. You can still read all responses normally.'
  };

  return (
    <Alert className="border-yellow-200 bg-yellow-50">
      <AlertDescription className="text-sm">
        {message || fallbackMessages[type]}
      </AlertDescription>
    </Alert>
  );
});

VoiceFallback.displayName = 'VoiceFallback';

// =====================================================
// LOADING COMPONENTS
// =====================================================

const VoiceComponentSkeleton = memo<{ type: string }>(({ type }) => (
  <Card className="p-4">
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-10 w-full" />
      {type === 'recorder' && (
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      )}
    </div>
  </Card>
));

VoiceComponentSkeleton.displayName = 'VoiceComponentSkeleton';

// =====================================================
// PROGRESSIVE ENHANCEMENT WRAPPER
// =====================================================

interface ProgressiveVoiceComponentProps {
  featureName: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  enableOnMount?: boolean;
  className?: string;
}

const ProgressiveVoiceComponent = memo<ProgressiveVoiceComponentProps>(({
  featureName,
  children,
  fallback,
  enableOnMount = false,
  className = ''
}) => {
  const [state, setState] = useState<VoiceFeatureState>({
    isEnabled: false,
    isLoading: false,
    isSupported: false
  });
  
  const featureManager = useRef(VoiceFeatureManager.getInstance());

  const enableFeature = useCallback(async () => {
    const newState = await featureManager.current.enableFeature(featureName);
    setState(newState);
  }, [featureName]);

  const disableFeature = useCallback(() => {
    featureManager.current.disableFeature(featureName);
    setState(prev => ({ ...prev, isEnabled: false }));
  }, [featureName]);

  useEffect(() => {
    if (enableOnMount) {
      enableFeature();
    }
  }, [enableOnMount, enableFeature]);

  if (!state.isSupported && !state.isLoading) {
    return (
      <div className={className}>
        {fallback || <VoiceFallback type={featureName as any} />}
      </div>
    );
  }

  if (state.isLoading) {
    return (
      <div className={className}>
        <VoiceComponentSkeleton type={featureName} />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={className}>
        <VoiceFallback type={featureName as any} message={state.error} />
      </div>
    );
  }

  if (!state.isEnabled) {
    return (
      <div className={className}>
        <Card className="p-4">
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              Enable voice features for a better experience
            </p>
            <Button onClick={enableFeature} size="sm">
              Enable Voice Features
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative">
        {children}
        <Button
          onClick={disableFeature}
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 h-6 w-6 p-0"
        >
          ×
        </Button>
      </div>
    </div>
  );
});

ProgressiveVoiceComponent.displayName = 'ProgressiveVoiceComponent';

// =====================================================
// VOICE CAPABILITY INDICATOR
// =====================================================

const VoiceCapabilityIndicator = memo(() => {
  const [capabilities, setCapabilities] = useState<VoiceCapabilities | null>(null);
  const [score, setScore] = useState<number>(0);

  useEffect(() => {
    VoiceFeatureDetector.detectCapabilities().then(caps => {
      setCapabilities(caps);
      setScore(VoiceFeatureDetector.getCompatibilityScore());
    });
  }, []);

  if (!capabilities) {
    return <Skeleton className="h-6 w-32" />;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="flex items-center gap-2">
      <Badge className={cn('text-xs', getScoreColor(score))}>
        Voice: {score.toFixed(0)}%
      </Badge>
      
      <div className="flex gap-1">
        {capabilities.speechRecognition && <span title="Speech Recognition">🎤</span>}
        {capabilities.speechSynthesis && <span title="Speech Synthesis">🔊</span>}
        {capabilities.mediaRecorder && <span title="Media Recording">📼</span>}
        {capabilities.audioContext && <span title="Audio Processing">🎵</span>}
      </div>
    </div>
  );
});

VoiceCapabilityIndicator.displayName = 'VoiceCapabilityIndicator';

// =====================================================
// LAZY VOICE PROVIDER
// =====================================================

const LazyVoiceProvider = memo<LazyVoiceProviderProps>(({
  children,
  enablePreloading = false,
  fallbackMode = 'graceful'
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const featureManager = useRef(VoiceFeatureManager.getInstance());

  useEffect(() => {
    const initialize = async () => {
      try {
        await VoiceFeatureDetector.detectCapabilities();
        
        if (enablePreloading) {
          await featureManager.current.preloadAllFeatures();
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.warn('Voice initialization failed:', error);
        setIsInitialized(true); // Still initialize in fallback mode
      }
    };

    initialize();
  }, [enablePreloading]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-600">Initializing voice features...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
});

LazyVoiceProvider.displayName = 'LazyVoiceProvider';

// =====================================================
// EXPORTS
// =====================================================

export {
  VoiceRecorder,
  VoicePlayer,
  VoiceSettings,
  SpeechToText,
  TextToSpeech,
  VoiceFallback,
  VoiceComponentSkeleton,
  ProgressiveVoiceComponent,
  VoiceCapabilityIndicator,
  LazyVoiceProvider,
  VoiceFeatureDetector,
  VoiceFeatureManager
};

export default LazyVoiceProvider;