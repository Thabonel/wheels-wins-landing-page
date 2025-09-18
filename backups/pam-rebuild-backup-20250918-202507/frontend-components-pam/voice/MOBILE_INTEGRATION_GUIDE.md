# Mobile Voice Integration Guide

## 🚀 Quick Start

### Basic Integration
```typescript
import { MobileVoiceToggle } from '@/components/pam/voice/MobileVoiceToggle';
import { useMobileVoice } from '@/hooks/voice/useMobileVoice';

// In your component
const MyComponent = () => {
  const mobileVoice = useMobileVoice({
    pauseOnBackground: true,
    handleOrientationChange: true
  });

  return (
    <MobileVoiceToggle
      onTranscript={(transcript, confidence) => {
        console.log('Voice input:', transcript);
      }}
      showMobileHints={true}
      enableVisualFeedback={true}
    />
  );
};
```

### CSS Integration
```css
/* Add to your main CSS file */
@import './components/pam/voice/VoiceComponents.mobile.css';

/* Apply mobile classes dynamically */
.app {
  /* Mobile classes will be applied automatically */
}
```

---

## 📱 Platform-Specific Optimizations

### iOS Safari Optimizations

#### Audio Context Unlock
```typescript
import { unlockAudioContextIOS, getMobileInfo } from '@/lib/mobile';

const handleUserInteraction = async () => {
  const { isIOS } = getMobileInfo();
  
  if (isIOS) {
    // Unlock audio context on first user interaction
    await unlockAudioContextIOS();
  }
};
```

#### Prevent Zoom on Input Focus
```typescript
import { preventIOSZoom } from '@/lib/mobile';

useEffect(() => {
  const cleanup = preventIOSZoom();
  return cleanup;
}, []);
```

#### Touch Target Optimization
```css
/* iOS prefers 44px minimum touch targets */
.voice-toggle-ios {
  min-height: 44px;
  min-width: 44px;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
}
```

### Android Chrome Optimizations

#### Material Design Touch Targets
```css
/* Android prefers 48dp touch targets */
.voice-toggle-android {
  min-height: 48px;
  min-width: 48px;
}

/* Material ripple effect */
.voice-toggle-android::before {
  content: '';
  position: absolute;
  /* Ripple animation styles */
}
```

#### Speech Recognition Optimization
```typescript
const voiceOptions = {
  // Android works better with non-continuous mode
  continuous: false,
  // Enable interim results for better UX
  interimResults: true,
  // Use device default language
  lang: navigator.language || 'en-US'
};
```

---

## 🎯 Feature Detection & Fallbacks

### Browser Capability Detection
```typescript
import { checkSpeechSynthesisSupport, checkSpeechRecognitionSupport } from '@/lib/mobile';

const MyComponent = () => {
  const [capabilities, setCapabilities] = useState({
    tts: checkSpeechSynthesisSupport(),
    stt: checkSpeechRecognitionSupport()
  });

  return (
    <div>
      {capabilities.tts && <TTSButton />}
      {capabilities.stt && <VoiceInputButton />}
      {!capabilities.tts && !capabilities.stt && (
        <p>Voice features not supported on this device</p>
      )}
    </div>
  );
};
```

### Progressive Enhancement
```typescript
const VoiceEnabledComponent = () => {
  const mobileInfo = getMobileInfo();
  
  if (!mobileInfo.isMobile) {
    // Use standard voice components for desktop
    return <VoiceToggle />;
  }
  
  if (mobileInfo.isIOS && mobileInfo.isSafari) {
    // iOS-specific optimizations
    return <MobileVoiceToggle enableVisualFeedback={true} />;
  }
  
  if (mobileInfo.isAndroid && mobileInfo.isChrome) {
    // Android-specific optimizations
    return <MobileVoiceToggle showMobileHints={true} />;
  }
  
  // Fallback for other browsers
  return <BasicVoiceToggle />;
};
```

---

## 🔄 State Management

### Handling App Lifecycle
```typescript
import { addVisibilityChangeListener, addOrientationChangeListener } from '@/lib/mobile';

const useMobileAppState = () => {
  const [appState, setAppState] = useState({
    isVisible: true,
    orientation: 'portrait'
  });

  useEffect(() => {
    // Handle app background/foreground
    const visibilityCleanup = addVisibilityChangeListener((isVisible) => {
      setAppState(prev => ({ ...prev, isVisible }));
      
      if (!isVisible) {
        // Pause voice features when app goes to background
        stopAllVoiceOperations();
      }
    });

    // Handle orientation changes
    const orientationCleanup = addOrientationChangeListener((isPortrait) => {
      setAppState(prev => ({ 
        ...prev, 
        orientation: isPortrait ? 'portrait' : 'landscape' 
      }));
      
      // Stop voice input on orientation change
      stopVoiceInput();
    });

    return () => {
      visibilityCleanup();
      orientationCleanup();
    };
  }, []);

  return appState;
};
```

### Virtual Keyboard Detection
```typescript
import { isVirtualKeyboardOpen } from '@/lib/mobile';

const useKeyboardState = () => {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const checkKeyboard = () => {
      const isOpen = isVirtualKeyboardOpen();
      if (isOpen !== keyboardOpen) {
        setKeyboardOpen(isOpen);
        
        if (isOpen) {
          // Stop voice input when keyboard opens
          stopVoiceInput();
        }
      }
    };

    const interval = setInterval(checkKeyboard, 500);
    return () => clearInterval(interval);
  }, [keyboardOpen]);

  return keyboardOpen;
};
```

---

## 🎨 UI/UX Best Practices

### Touch-Friendly Design
```css
/* Ensure adequate spacing between touch targets */
.voice-controls {
  gap: 8px; /* Minimum 8px between buttons */
}

/* Provide clear visual feedback */
.voice-button:active {
  transform: scale(0.95);
  background-color: rgba(0, 0, 0, 0.05);
}

/* Use appropriate contrast ratios */
.voice-button {
  background: #007AFF; /* iOS blue */
  color: white;
  /* Ensure 4.5:1 contrast ratio */
}
```

### Loading States
```typescript
const VoiceButtonWithStates = () => {
  const [state, setState] = useState<'idle' | 'loading' | 'listening' | 'processing'>('idle');

  return (
    <Button
      className={cn(
        'voice-button',
        state === 'listening' && 'animate-pulse',
        state === 'processing' && 'opacity-75'
      )}
      disabled={state === 'loading' || state === 'processing'}
    >
      {state === 'loading' && <Loader size={20} className="animate-spin" />}
      {state === 'listening' && <Mic size={20} />}
      {state === 'processing' && <Loader2 size={20} className="animate-spin" />}
      {state === 'idle' && <MicOff size={20} />}
    </Button>
  );
};
```

### Error States & Recovery
```typescript
const VoiceErrorHandler = () => {
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleVoiceError = (errorMessage: string) => {
    setError(errorMessage);
    
    // Auto-retry for certain errors
    if (errorMessage.includes('network') && retryCount < 3) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        retryVoiceOperation();
      }, 2000);
    }
  };

  const dismissError = () => {
    setError(null);
    setRetryCount(0);
  };

  return (
    <>
      <MobileVoiceToggle onError={handleVoiceError} />
      
      {error && (
        <div className="voice-error-mobile show">
          <p>{error}</p>
          <button onClick={dismissError}>Dismiss</button>
          {retryCount < 3 && (
            <button onClick={retryVoiceOperation}>Retry</button>
          )}
        </div>
      )}
    </>
  );
};
```

---

## 🧪 Testing Strategies

### Device Testing Matrix
```typescript
// Test configuration for different devices
const testDevices = [
  { name: 'iPhone 12', userAgent: 'iPhone...', tests: ['ios-safari', 'audio-unlock'] },
  { name: 'Galaxy S21', userAgent: 'Android...', tests: ['android-chrome', 'continuous-voice'] },
  { name: 'iPad Air', userAgent: 'iPad...', tests: ['ios-safari', 'orientation'] }
];

// Automated testing with device simulation
testDevices.forEach(device => {
  describe(`Voice features on ${device.name}`, () => {
    beforeEach(() => {
      mockUserAgent(device.userAgent);
    });

    device.tests.forEach(testName => {
      it(`should pass ${testName} test`, () => {
        // Test implementation
      });
    });
  });
});
```

### Real Device Testing Checklist
```markdown
## iOS Safari Testing
- [ ] Audio context unlocks on first interaction
- [ ] TTS works after unlock
- [ ] Voice recognition permissions work
- [ ] Orientation changes handled
- [ ] Background/foreground transitions work
- [ ] Virtual keyboard detection works

## Android Chrome Testing
- [ ] Speech recognition accuracy acceptable
- [ ] Network speech recognition works
- [ ] Offline fallback works
- [ ] Battery optimization compatibility
- [ ] Material design touch targets
- [ ] Haptic feedback works
```

---

## 🚨 Common Issues & Solutions

### iOS Safari Issues

#### Issue: TTS doesn't work initially
```typescript
// Solution: Unlock audio context on user interaction
const handleFirstInteraction = async () => {
  if (getMobileInfo().isIOS) {
    await unlockAudioContextIOS();
    setAudioUnlocked(true);
  }
};

// Add to any button click handler
<Button onClick={handleFirstInteraction}>
```

#### Issue: Voice input stops on orientation change
```typescript
// Solution: Properly handle orientation changes
useEffect(() => {
  const cleanup = addOrientationChangeListener(() => {
    if (isListening) {
      stopListening();
      // Optionally restart after orientation settles
      setTimeout(() => {
        if (shouldRestart) {
          startListening();
        }
      }, 500);
    }
  });
  
  return cleanup;
}, [isListening]);
```

### Android Chrome Issues

#### Issue: Voice recognition accuracy poor
```typescript
// Solution: Optimize recognition settings
const optimizedOptions = {
  continuous: false, // Better for Android
  interimResults: true,
  lang: navigator.language, // Use device language
  grammars: new SpeechGrammarList() // If available
};
```

#### Issue: Battery optimization kills voice features
```typescript
// Solution: Handle visibility changes gracefully
useEffect(() => {
  const cleanup = addVisibilityChangeListener((isVisible) => {
    if (!isVisible) {
      // Save state before backgrounding
      saveVoiceState();
      stopAllVoiceFeatures();
    } else {
      // Restore state when returning
      restoreVoiceState();
    }
  });
  
  return cleanup;
}, []);
```

---

## 📊 Performance Optimization

### Memory Management
```typescript
const useVoiceMemoryOptimization = () => {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      
      if (utteranceRef.current) {
        speechSynthesis.cancel();
        utteranceRef.current = null;
      }
    };
  }, []);
};
```

### Battery Optimization
```typescript
const useBatteryAwareVoice = () => {
  const [batteryStatus, setBatteryStatus] = useState({ level: 1, charging: false });

  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then((battery: any) => {
        const updateBattery = () => {
          setBatteryStatus({
            level: battery.level,
            charging: battery.charging
          });
        };

        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      });
    }
  }, []);

  const shouldLimitVoiceFeatures = batteryStatus.level < 0.2 && !batteryStatus.charging;

  return { batteryStatus, shouldLimitVoiceFeatures };
};
```

---

## 📚 Additional Resources

### Documentation Links
- [Web Speech API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [iOS Safari Speech Synthesis](https://developer.apple.com/documentation/safari-release-notes)
- [Android Chrome Speech Features](https://developer.chrome.com/docs/capabilities/speech)

### Testing Tools
- [BrowserStack Mobile Testing](https://www.browserstack.com/mobile-browser-testing)
- [Sauce Labs Real Device Cloud](https://saucelabs.com/platform/real-device-cloud)
- [AWS Device Farm](https://aws.amazon.com/device-farm/)

### Performance Monitoring
```typescript
// Add performance monitoring
const trackVoicePerformance = () => {
  performance.mark('voice-start');
  
  // After voice operation completes
  performance.mark('voice-end');
  performance.measure('voice-duration', 'voice-start', 'voice-end');
  
  const measure = performance.getEntriesByName('voice-duration')[0];
  console.log(`Voice operation took ${measure.duration}ms`);
};
```

This comprehensive guide covers all aspects of mobile voice feature integration, from basic setup to advanced optimization techniques. Use it as a reference when implementing voice features in your mobile web application.