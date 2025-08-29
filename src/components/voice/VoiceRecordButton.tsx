/**
 * Voice Record Button Component
 * Provides a button for voice recording with visual feedback
 */

import React from 'react';
import { Mic, MicOff, Square, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';

interface VoiceRecordButtonProps {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showDuration?: boolean;
  autoStop?: number; // Auto-stop after X milliseconds
}

export const VoiceRecordButton: React.FC<VoiceRecordButtonProps> = ({
  onRecordingComplete,
  onError,
  className,
  size = 'md',
  variant = 'default',
  showDuration = true,
  autoStop,
}) => {
  const {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useVoiceRecording({
    onStop: onRecordingComplete,
    onError,
  });

  // Auto-stop timer
  React.useEffect(() => {
    if (state.isRecording && autoStop && state.duration >= autoStop) {
      stopRecording();
    }
  }, [state.isRecording, state.duration, autoStop, stopRecording]);

  // Format duration display
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Determine button state and icon
  const getButtonContent = () => {
    if (!state.isSupported) {
      return {
        icon: <MicOff className="h-4 w-4" />,
        text: 'Not Supported',
        disabled: true,
      };
    }

    if (state.error) {
      return {
        icon: <MicOff className="h-4 w-4" />,
        text: 'Error',
        disabled: false,
      };
    }

    if (!state.isRecording) {
      return {
        icon: <Mic className="h-4 w-4" />,
        text: 'Start Recording',
        disabled: false,
      };
    }

    if (state.isPaused) {
      return {
        icon: <Play className="h-4 w-4" />,
        text: 'Resume',
        disabled: false,
      };
    }

    return {
      icon: <Square className="h-4 w-4" />,
      text: showDuration ? formatDuration(state.duration) : 'Stop',
      disabled: false,
    };
  };

  const handleClick = () => {
    if (!state.isRecording) {
      startRecording();
    } else if (state.isPaused) {
      resumeRecording();
    } else {
      stopRecording();
    }
  };

  const handleSecondaryAction = () => {
    if (state.isRecording && !state.isPaused) {
      pauseRecording();
    }
  };

  const buttonContent = getButtonContent();
  
  // Size classes
  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleClick}
        disabled={buttonContent.disabled}
        variant={variant}
        className={cn(
          sizeClasses[size],
          state.isRecording && !state.isPaused && 'animate-pulse bg-red-500 hover:bg-red-600',
          state.isPaused && 'bg-yellow-500 hover:bg-yellow-600',
          className
        )}
      >
        {buttonContent.icon}
        <span className="ml-2">{buttonContent.text}</span>
      </Button>

      {state.isRecording && !state.isPaused && (
        <Button
          onClick={handleSecondaryAction}
          variant="outline"
          size="icon"
          className={cn(sizeClasses[size], 'w-auto aspect-square')}
          title="Pause"
        >
          <Pause className="h-4 w-4" />
        </Button>
      )}

      {state.error && (
        <span className="text-sm text-red-500" title={state.error}>
          ⚠️
        </span>
      )}
    </div>
  );
};