
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, Loader2, Settings } from 'lucide-react';
import { pamVoiceService, VoiceGenerationOptions, VoiceSettings } from '@/lib/voiceService';
import { useUserSettings } from '@/hooks/useUserSettings';

interface PamVoiceProps {
  text: string;
  emotion?: 'excited' | 'helpful' | 'calm' | 'celebrates';
  context?: 'shopping' | 'planning' | 'achievement' | 'safety' | 'general';
  autoPlay?: boolean;
  className?: string;
}

export default function PamVoice({ 
  text, 
  emotion, 
  context, 
  autoPlay = false, 
  className = '' 
}: PamVoiceProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { settings } = useUserSettings();

  const voiceEnabled = settings?.pam_preferences?.voice_enabled ?? false;
  const userAutoPlay = settings?.pam_preferences?.proactive_suggestions ?? false;

  useEffect(() => {
    if (voiceEnabled && (autoPlay || userAutoPlay)) {
      generateAndPlay();
    }
  }, [text, voiceEnabled, autoPlay, userAutoPlay]);

  const generateAndPlay = async () => {
    if (!voiceEnabled || !text.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const voiceOptions: VoiceGenerationOptions = {
        text,
        emotion,
        context,
        priority: 'normal'
      };

      const voiceResponse = await pamVoiceService.generateVoice(voiceOptions);
      
      if (audioRef.current) {
        audioRef.current.src = voiceResponse.audioUrl;
        audioRef.current.volume = volume;
        audioRef.current.playbackRate = speed;
        setDuration(voiceResponse.duration);
        
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Voice generation failed:', err);
      setError('Voice unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    if (!audioRef.current) {
      await generateAndPlay();
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      await audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleSpeedChange = (value: number[]) => {
    const newSpeed = value[0];
    setSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!voiceEnabled) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
      />

      <Button
        size="sm"
        variant="ghost"
        onClick={togglePlayPause}
        disabled={isLoading}
        className="h-8 w-8 p-0"
        aria-label={isPlaying ? "Pause Pam's voice" : "Play Pam's voice"}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {error && (
        <span className="text-xs text-gray-500">{error}</span>
      )}

      {duration > 0 && !error && (
        <span className="text-xs text-gray-500">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      )}

      <Button
        size="sm"
        variant="ghost"
        onClick={() => setShowControls(!showControls)}
        className="h-8 w-8 p-0"
        aria-label="Voice settings"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {showControls && (
        <div className="flex items-center gap-2 ml-2 p-2 bg-gray-50 rounded-lg">
          <Volume2 className="h-4 w-4" />
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={1}
            min={0}
            step={0.1}
            className="w-16"
          />
          
          <span className="text-xs">Speed</span>
          <Slider
            value={[speed]}
            onValueChange={handleSpeedChange}
            max={2}
            min={0.5}
            step={0.1}
            className="w-16"
          />
        </div>
      )}
    </div>
  );
}
