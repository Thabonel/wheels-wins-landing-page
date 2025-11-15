import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, Loader2, AlertTriangle } from 'lucide-react';
import { useMobileVoice } from '@/hooks/voice/useMobileVoice';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getMobileInfo, getOptimalTouchTargetSize, getMobileCSSClasses } from '@/lib/mobile';
import './VoiceComponents.mobile.css';

export interface MobileVoiceToggleProps {
  onTranscript?: (transcript: string, confidence: number) => void;
  onVoiceCommand?: (command: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTTSButton?: boolean;
  className?: string;
  ariaLabel?: string;
  enableVisualFeedback?: boolean;
  showMobileHints?: boolean;
}

export const MobileVoiceToggle: React.FC<MobileVoiceToggleProps> = ({
  onTranscript,
  onVoiceCommand,
  disabled = false,
  size = 'md',
  showTTSButton = true,
  className,
  ariaLabel = 'Toggle voice input',
  enableVisualFeedback = true,
  showMobileHints = true
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [showStatusMessage, setShowStatusMessage] = useState<string | null>(null);

  // Mobile voice hook with optimizations - destructure for proper React reactivity
  const {
    isListening,
    isProcessing,
    isSupported,
    canListen,
    startListening,
    stopListening,
    ttsSupported,
    isSpeaking,
    speak,
    stopSpeaking,
    audioUnlocked,
    unlockAudio,
    keyboardOpen,
    mobileInfo
  } = useMobileVoice(
    {
      pauseOnBackground: true,
      resumeOnForeground: true,
      handleOrientationChange: true,
      unlockAudioOnInteraction: true
    },
    useCallback((result) => {
      if (result.isFinal && result.transcript.trim()) {
        onTranscript?.(result.transcript, result.confidence);
        onVoiceCommand?.(result.transcript.trim());

        // Mobile-optimized toast
        toast.success('Voice input received', {
          description: `"${result.transcript.substring(0, 50)}${result.transcript.length > 50 ? '...' : ''}"`,
          duration: 2000, // Shorter on mobile
        });
      }
    }, [onTranscript, onVoiceCommand]),

    useCallback((error: string) => {
      setShowStatusMessage(error);
      setTimeout(() => setShowStatusMessage(null), 4000);
    }, [])
  );
  const touchTargetSize = getOptimalTouchTargetSize();
  
  // Handle audio unlock for iOS
  const handleAudioUnlock = useCallback(async () => {
    if (!mobileInfo.isIOS || audioUnlocked) return;

    await unlockAudio();
  }, [mobileInfo.isIOS, audioUnlocked, unlockAudio]);

  // Handle voice toggle with mobile optimizations
  const handleVoiceToggle = useCallback(async () => {
    if (disabled || !isSupported) {
      setShowStatusMessage('Voice input not available on this device');
      setTimeout(() => setShowStatusMessage(null), 3000);
      return;
    }

    // Check if keyboard is open
    if (keyboardOpen) {
      setShowStatusMessage('Close keyboard to use voice input');
      setTimeout(() => setShowStatusMessage(null), 3000);
      return;
    }

    // Handle iOS audio unlock
    if (mobileInfo.isIOS && !audioUnlocked) {
      await handleAudioUnlock();
    }

    // Check for permission
    if (!canListen && !isListening) {
      setShowPermissionPrompt(true);
      return;
    }

    try {
      if (isListening) {
        stopListening();
        setShowStatusMessage('Voice input stopped');
      } else {
        const started = await startListening();
        if (started) {
          setShowStatusMessage('Listening... Speak now');
        } else {
          setShowStatusMessage('Could not start voice input');
        }
      }
      setTimeout(() => setShowStatusMessage(null), 2000);
    } catch (error) {
      setShowStatusMessage('Voice input error occurred');
      setTimeout(() => setShowStatusMessage(null), 3000);
    }
  }, [disabled, isSupported, keyboardOpen, mobileInfo.isIOS, audioUnlocked, handleAudioUnlock, canListen, isListening, stopListening, startListening]);

  // Handle TTS toggle
  const handleTTSToggle = useCallback(async () => {
    if (!ttsSupported) {
      setShowStatusMessage('Text-to-speech not available');
      setTimeout(() => setShowStatusMessage(null), 3000);
      return;
    }

    // Handle iOS audio unlock
    if (mobileInfo.isIOS && !audioUnlocked) {
      await handleAudioUnlock();
    }

    if (isSpeaking) {
      stopSpeaking();
      setShowStatusMessage('Speech stopped');
    } else {
      await speak('Voice system is ready.');
      setShowStatusMessage('Text-to-speech enabled');
    }
    setTimeout(() => setShowStatusMessage(null), 2000);
  }, [ttsSupported, mobileInfo.isIOS, audioUnlocked, handleAudioUnlock, isSpeaking, stopSpeaking, speak]);

  // Handle touch feedback
  const handleTouchStart = useCallback(() => {
    setIsPressed(true);
    // Haptic feedback on supported devices
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
  }, []);

  // Listen for global stop events (e.g., when hybrid voice stops)
  useEffect(() => {
    const handleGlobalStop = () => {
      if (isListening || isProcessing) {
        stopListening();
      }
      setIsPressed(false);
    };
    window.addEventListener('pam-voice:stop-all', handleGlobalStop as EventListener);
    return () => window.removeEventListener('pam-voice:stop-all', handleGlobalStop as EventListener);
  }, [isListening, isProcessing, stopListening]);

  // Size classes for mobile optimization
  const getSizeClasses = () => {
    const baseSize = {
      sm: Math.max(36, touchTargetSize - 8),
      md: touchTargetSize,
      lg: touchTargetSize + 8
    };
    
    return {
      height: baseSize[size],
      width: baseSize[size]
    };
  };

  const sizeStyle = getSizeClasses();
  const mobileCSSClasses = getMobileCSSClasses();

  // Determine button states - NOW REACTIVE!
  const isVoiceActive = isListening || isProcessing;
  const isVoiceDisabled = disabled || !canListen;
  const isTTSActive = isSpeaking;

  return (
    <>
      <div className={cn(
        'voice-component flex items-center gap-2',
        ...mobileCSSClasses,
        className
      )}>
        {/* Voice Input Toggle */}
        <Button
          variant={isVoiceActive ? 'default' : 'outline'}
          className={cn(
            'voice-toggle-button relative transition-all duration-200',
            isVoiceActive && 'voice-listening-mobile',
            isSpeaking && 'voice-speaking-mobile',
            isVoiceDisabled && 'opacity-50 cursor-not-allowed',
            isPressed && 'scale-95'
          )}
          style={sizeStyle}
          disabled={isVoiceDisabled}
          onClick={handleVoiceToggle}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          aria-label={ariaLabel}
          aria-pressed={isVoiceActive}
          title={
            isVoiceDisabled
              ? 'Voice input not available'
              : keyboardOpen
              ? 'Close keyboard to use voice'
              : isVoiceActive
              ? 'Stop voice input'
              : 'Start voice input'
          }
        >
          {isProcessing ? (
            <Loader2 size={20} className="animate-spin" />
          ) : isVoiceActive ? (
            <Mic size={20} />
          ) : (
            <MicOff size={20} />
          )}
        </Button>

        {/* Text-to-Speech Toggle */}
        {showTTSButton && (
          <Button
            variant={isTTSActive ? 'default' : 'outline'}
            className={cn(
              'voice-toggle-button transition-all duration-200',
              isTTSActive && 'voice-speaking-mobile',
              !ttsSupported && 'opacity-50 cursor-not-allowed'
            )}
            style={sizeStyle}
            disabled={!ttsSupported || disabled}
            onClick={handleTTSToggle}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            aria-label="Toggle text-to-speech"
            aria-pressed={isTTSActive}
            title={
              !ttsSupported
                ? 'Text-to-speech not available'
                : isTTSActive
                ? 'Stop speech'
                : 'Test speech'
            }
          >
            {isTTSActive ? (
              <Volume2 size={20} />
            ) : (
              <VolumeX size={20} />
            )}
          </Button>
        )}
      </div>

      {/* Mobile Status Messages */}
      {enableVisualFeedback && showStatusMessage && (
        <div className="voice-status-mobile show">
          {showStatusMessage}
        </div>
      )}

      {/* Mobile Hints */}
      {showMobileHints && (
        <>
          {/* Keyboard Open Hint */}
          {keyboardOpen && isListening && (
            <div className="voice-status-mobile show">
              <AlertTriangle size={16} className="inline mr-1" />
              Close keyboard to continue voice input
            </div>
          )}

          {/* Orientation Change Hint */}
          {!mobileInfo.isPortrait && isListening && (
            <div className="voice-status-mobile show">
              Voice input works better in portrait mode
            </div>
          )}

          {/* Background Warning */}
          {mobileInfo.isInBackground && (
            <div className="voice-status-mobile show">
              Voice features paused - return to app
            </div>
          )}
        </>
      )}

      {/* Permission Prompt Modal */}
      {showPermissionPrompt && (
        <div className="voice-permission-prompt-mobile">
          <h3>Enable Voice Input</h3>
          <p>
            {mobileInfo.isIOS 
              ? 'Allow microphone access to use voice input. This will open Safari settings.'
              : 'Allow microphone access to use voice input.'
            }
          </p>
          <div className="buttons">
            <button
              className="primary-button"
              onClick={async () => {
                setShowPermissionPrompt(false);
                await startListening();
              }}
            >
              Enable
            </button>
            <button
              className="secondary-button"
              onClick={() => setShowPermissionPrompt(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};
