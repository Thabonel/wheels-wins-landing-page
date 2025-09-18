/**
 * Phase 5A: TTS Controls Component
 * Provides voice playback controls for PAM responses
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useTTS } from '@/hooks/useTTS';

interface TTSAudio {
  audio_data: string;
  format: string;
  duration?: number;
  voice_used?: string;
  engine_used?: string;
}

interface TTSControlsProps {
  ttsData?: TTSAudio;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const TTSControls: React.FC<TTSControlsProps> = ({
  ttsData,
  className = '',
  size = 'sm',
  showLabel = false
}) => {
  const { isPlaying, error, playTTS, stopTTS } = useTTS();

  if (!ttsData) {
    return null;
  }

  const handleToggle = () => {
    if (isPlaying) {
      stopTTS();
    } else {
      playTTS(ttsData);
    }
  };

  const buttonSize = size === 'sm' ? 'h-8 w-8' : size === 'md' ? 'h-10 w-10' : 'h-12 w-12';
  const iconSize = size === 'sm' ? 16 : size === 'md' ? 20 : 24;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        disabled={!!error}
        className={`${buttonSize} rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20`}
        title={
          error 
            ? `TTS Error: ${error}` 
            : isPlaying 
              ? 'Stop voice playback'
              : `Play voice (${ttsData.voice_used || 'AI Voice'})`
        }
      >
        {isPlaying ? (
          <Loader2 className={`animate-spin`} size={iconSize} />
        ) : error ? (
          <VolumeX className="text-red-500" size={iconSize} />
        ) : (
          <Volume2 className="text-blue-600 dark:text-blue-400" size={iconSize} />
        )}
      </Button>
      
      {showLabel && (
        <div className="text-xs text-muted-foreground">
          {error ? (
            <span className="text-red-500">TTS Error</span>
          ) : isPlaying ? (
            <span className="text-blue-600 dark:text-blue-400">Playing...</span>
          ) : (
            <span>
              Voice ({ttsData.engine_used === 'EdgeTTS' ? '🤖' : '🔊'})
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TTSControls;