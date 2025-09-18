import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useVoiceInput, type VoiceInputResult } from '@/hooks/voice/useVoiceInput';
import { useTextToSpeech } from '@/hooks/voice/useTextToSpeech';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface VoiceToggleProps {
  onTranscript?: (transcript: string, confidence: number) => void;
  onVoiceCommand?: (command: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTTSButton?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const VoiceToggle: React.FC<VoiceToggleProps> = ({
  onTranscript,
  onVoiceCommand,
  disabled = false,
  size = 'md',
  showTTSButton = true,
  className,
  ariaLabel = 'Toggle voice input'
}) => {
  // Voice input hook
  const voiceInput = useVoiceInput(
    useCallback((result: VoiceInputResult) => {
      if (result.isFinal && result.transcript.trim()) {
        onTranscript?.(result.transcript, result.confidence);
        onVoiceCommand?.(result.transcript.trim());
        
        // Show success toast
        toast.success('Voice input received', {
          description: `"${result.transcript.substring(0, 50)}${result.transcript.length > 50 ? '...' : ''}"`,
          duration: 3000,
        });
      }
    }, [onTranscript, onVoiceCommand]),
    
    useCallback((error: string) => {
      toast.error('Voice input error', {
        description: error,
        duration: 5000,
      });
    }, [])
  );

  // Text-to-speech hook for feedback
  const tts = useTextToSpeech({
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8
  });

  // Local state for UI feedback
  const [isPressed, setIsPressed] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);

  // Handle permission request on first use
  const handlePermissionRequest = useCallback(async () => {
    if (permissionRequested || voiceInput.hasPermission !== null) return;

    setPermissionRequested(true);
    const granted = await voiceInput.requestPermission();
    
    if (!granted) {
      toast.error('Microphone access required', {
        description: 'Please allow microphone access to use voice input.',
        duration: 7000,
      });
    }
  }, [permissionRequested, voiceInput]);

  // Initialize permission check
  useEffect(() => {
    if (voiceInput.isSupported && !permissionRequested) {
      handlePermissionRequest();
    }
  }, [voiceInput.isSupported, handlePermissionRequest, permissionRequested]);

  // Handle voice toggle
  const handleVoiceToggle = useCallback(async () => {
    if (disabled || !voiceInput.isSupported) {
      toast.error('Voice input not available', {
        description: 'Your browser does not support voice input.',
        duration: 5000,
      });
      return;
    }

    if (voiceInput.hasPermission === false) {
      toast.error('Microphone access denied', {
        description: 'Please enable microphone access in your browser settings.',
        duration: 7000,
      });
      return;
    }

    try {
      if (voiceInput.isListening) {
        voiceInput.stopListening();
        toast.info('Voice input stopped', {
          duration: 2000,
        });
      } else {
        const started = await voiceInput.startListening();
        if (started) {
          toast.info('Listening...', {
            description: 'Speak now to input voice commands.',
            duration: 2000,
          });
        }
      }
    } catch (error) {
      toast.error('Failed to toggle voice input', {
        description: error instanceof Error ? error.message : 'Unknown error occurred.',
        duration: 5000,
      });
    }
  }, [disabled, voiceInput]);

  // Handle TTS toggle
  const handleTTSToggle = useCallback(() => {
    if (!tts.isSupported) {
      toast.error('Text-to-speech not available', {
        description: 'Your browser does not support text-to-speech.',
        duration: 5000,
      });
      return;
    }

    if (tts.isSpeaking) {
      tts.stopSpeaking();
      toast.info('Speech stopped', {
        duration: 2000,
      });
    } else {
      // Test TTS with a sample phrase
      tts.speak('Voice system is ready.');
      toast.success('Text-to-speech enabled', {
        duration: 2000,
      });
    }
  }, [tts]);

  // Handle mouse/touch feedback
  const handleMouseDown = useCallback(() => setIsPressed(true), []);
  const handleMouseUp = useCallback(() => setIsPressed(false), []);

  // Determine button state and styling
  const isVoiceActive = voiceInput.isListening || voiceInput.isProcessing;
  const isVoiceDisabled = disabled || !voiceInput.isSupported || voiceInput.hasPermission === false;
  const isTTSActive = tts.isSpeaking;
  const isTTSDisabled = disabled || !tts.isSupported;

  // Size variants
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg'
  };

  // Icon size variants
  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Voice Input Toggle */}
      <Button
        variant={isVoiceActive ? 'default' : 'outline'}
        size="icon"
        className={cn(
          sizeClasses[size],
          'relative transition-all duration-200 ease-in-out',
          isVoiceActive && 'bg-primary text-primary-foreground shadow-lg',
          isVoiceDisabled && 'opacity-50 cursor-not-allowed',
          isPressed && 'scale-95',
          // Pulsing animation when listening
          isVoiceActive && 'animate-pulse shadow-primary/50'
        )}
        disabled={isVoiceDisabled}
        onClick={handleVoiceToggle}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        aria-label={ariaLabel}
        aria-pressed={isVoiceActive}
        title={
          isVoiceDisabled
            ? 'Voice input not available'
            : isVoiceActive
            ? 'Stop voice input'
            : 'Start voice input'
        }
      >
        {voiceInput.isProcessing ? (
          <Loader2 size={iconSizes[size]} className="animate-spin" />
        ) : isVoiceActive ? (
          <Mic size={iconSizes[size]} />
        ) : (
          <MicOff size={iconSizes[size]} />
        )}

        {/* Visual indicator for active listening */}
        {isVoiceActive && (
          <div className="absolute inset-0 rounded-md border-2 border-primary animate-ping opacity-75" />
        )}
      </Button>

      {/* Text-to-Speech Toggle (Optional) */}
      {showTTSButton && (
        <Button
          variant={isTTSActive ? 'default' : 'outline'}
          size="icon"
          className={cn(
            sizeClasses[size],
            'transition-all duration-200 ease-in-out',
            isTTSActive && 'bg-primary text-primary-foreground',
            isTTSDisabled && 'opacity-50 cursor-not-allowed'
          )}
          disabled={isTTSDisabled}
          onClick={handleTTSToggle}
          aria-label="Toggle text-to-speech"
          aria-pressed={isTTSActive}
          title={
            isTTSDisabled
              ? 'Text-to-speech not available'
              : isTTSActive
              ? 'Stop speech'
              : 'Test speech'
          }
        >
          {isTTSActive ? (
            <Volume2 size={iconSizes[size]} />
          ) : (
            <VolumeX size={iconSizes[size]} />
          )}
        </Button>
      )}

      {/* Status Indicator */}
      {(voiceInput.isListening || voiceInput.isProcessing) && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
            <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-75" />
            <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-150" />
          </div>
          <span className="hidden sm:inline">
            {voiceInput.isProcessing ? 'Processing...' : 'Listening...'}
          </span>
        </div>
      )}
    </div>
  );
};