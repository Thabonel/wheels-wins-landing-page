/**
 * Voice Playback Controls Component
 * Provides audio playback controls with visual feedback
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface VoicePlaybackControlsProps {
  audioUrl?: string;
  audioBlob?: Blob;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  showVolume?: boolean;
  autoPlay?: boolean;
  onPlaybackEnd?: () => void;
  onPlaybackStart?: () => void;
  onError?: (error: Error) => void;
}

export const VoicePlaybackControls: React.FC<VoicePlaybackControlsProps> = ({
  audioUrl,
  audioBlob,
  className,
  size = 'md',
  showProgress = true,
  showVolume = true,
  autoPlay = false,
  onPlaybackEnd,
  onPlaybackStart,
  onError,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create audio URL from blob if needed
  const audioSource = React.useMemo(() => {
    if (audioUrl) return audioUrl;
    if (audioBlob) return URL.createObjectURL(audioBlob);
    return null;
  }, [audioUrl, audioBlob]);

  // Initialize audio element
  useEffect(() => {
    if (!audioSource) {
      setError('No audio source provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    const audio = new Audio(audioSource);
    audioRef.current = audio;

    // Set up event listeners
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
      setIsLoading(false);
      if (autoPlay) {
        handlePlay();
      }
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onPlaybackEnd?.();
    });

    audio.addEventListener('error', (e) => {
      const errorMessage = `Audio playback error: ${e.type}`;
      setError(errorMessage);
      setIsLoading(false);
      setIsPlaying(false);
      onError?.(new Error(errorMessage));
    });

    audio.volume = volume;

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      audio.pause();
      audio.removeEventListener('loadedmetadata', () => {});
      audio.removeEventListener('ended', () => {});
      audio.removeEventListener('error', () => {});
      
      // Clean up blob URL if we created one
      if (audioBlob && audioSource) {
        URL.revokeObjectURL(audioSource);
      }
    };
  }, [audioSource, audioBlob, autoPlay, volume]);

  // Update progress while playing
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 100);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying]);

  const handlePlay = async () => {
    if (!audioRef.current) return;

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      onPlaybackStart?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to play audio';
      setError(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        handlePlay();
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      const newTime = (value[0] / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      audioRef.current.muted = newMuted;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Size classes
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (!audioSource) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <Button
          onClick={isPlaying ? handlePause : handlePlay}
          disabled={isLoading || !!error}
          variant="outline"
          size="icon"
          className={sizeClasses[size]}
        >
          {isPlaying ? (
            <Pause className={iconSizes[size]} />
          ) : (
            <Play className={iconSizes[size]} />
          )}
        </Button>

        {/* Restart Button */}
        <Button
          onClick={handleRestart}
          disabled={isLoading || !!error}
          variant="ghost"
          size="icon"
          className={sizeClasses[size]}
        >
          <RotateCcw className={iconSizes[size]} />
        </Button>

        {/* Progress Bar */}
        {showProgress && (
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
              onValueChange={handleSeek}
              disabled={isLoading || !!error}
              max={100}
              step={0.1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(duration)}
            </span>
          </div>
        )}

        {/* Volume Controls */}
        {showVolume && (
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleMute}
              variant="ghost"
              size="icon"
              className={cn(sizeClasses[size], 'w-auto h-auto p-1')}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className={iconSizes[size]} />
              ) : (
                <Volume2 className={iconSizes[size]} />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="w-20"
            />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-xs text-red-500 px-2">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-xs text-muted-foreground px-2">
          Loading audio...
        </div>
      )}
    </div>
  );
};