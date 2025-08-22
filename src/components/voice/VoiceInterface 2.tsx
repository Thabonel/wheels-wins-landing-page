/**
 * Voice Interface Component
 * Integrated voice interaction for PAM with recording and playback
 */

import React, { useState, useCallback, useRef } from 'react';
import { VoiceRecordButton } from './VoiceRecordButton';
import { VoicePlaybackControls } from './VoicePlaybackControls';
import { VoiceStatusIndicator, VoiceStatus } from './VoiceStatusIndicator';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Send, X, Mic, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceInterfaceProps {
  onSendAudio: (audioBlob: Blob, autoSend?: boolean) => Promise<void>;
  onSendText: (text: string) => void;
  onTTSRequest?: (text: string) => Promise<Blob | null>;
  className?: string;
  compact?: boolean;
  showTranscript?: boolean;
  autoSend?: boolean;
  maxRecordingDuration?: number;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  onSendAudio,
  onSendText,
  onTTSRequest,
  className,
  compact = false,
  showTranscript = true,
  autoSend = false,
  maxRecordingDuration = 60000, // 1 minute default
}) => {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [ttsAudioBlob, setTtsAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    setAudioBlob(blob);
    setStatus('transcribing');
    setError(null);
    setIsProcessing(true);

    try {
      // Send audio for transcription
      await onSendAudio(blob, autoSend);
      
      // Status will be updated by parent component through WebSocket events
      if (!autoSend) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 2000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process audio';
      setError(errorMessage);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setIsProcessing(false);
    }
  }, [onSendAudio, autoSend]);

  const handleRecordingError = useCallback((error: Error) => {
    setError(error.message);
    setStatus('error');
    setTimeout(() => {
      setStatus('idle');
      setError(null);
    }, 3000);
  }, []);

  const handleSendTranscript = useCallback(() => {
    if (transcript.trim()) {
      onSendText(transcript);
      setTranscript('');
      setAudioBlob(null);
      setStatus('idle');
    }
  }, [transcript, onSendText]);

  const handleClearTranscript = useCallback(() => {
    setTranscript('');
    setAudioBlob(null);
    setTtsAudioBlob(null);
    setStatus('idle');
    setError(null);
  }, []);

  const handleRequestTTS = useCallback(async () => {
    if (!onTTSRequest || !transcript) return;

    setStatus('processing');
    setError(null);

    try {
      const ttsBlob = await onTTSRequest(transcript);
      if (ttsBlob) {
        setTtsAudioBlob(ttsBlob);
        setStatus('idle');
      } else {
        throw new Error('No audio generated');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'TTS failed';
      setError(errorMessage);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [transcript, onTTSRequest]);

  // Update transcript from parent (e.g., from WebSocket STT result)
  const updateTranscript = useCallback((text: string) => {
    setTranscript(text);
    setStatus('success');
    setTimeout(() => setStatus('idle'), 2000);
  }, []);

  // Update status from parent
  const updateStatus = useCallback((newStatus: VoiceStatus) => {
    setStatus(newStatus);
  }, []);

  // Expose methods to parent
  React.useImperativeHandle(
    useRef(null),
    () => ({
      updateTranscript,
      updateStatus,
      clearTranscript: handleClearTranscript,
    }),
    [updateTranscript, updateStatus, handleClearTranscript]
  );

  if (compact) {
    // Compact mode - just the record button with status
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <VoiceRecordButton
          onRecordingComplete={handleRecordingComplete}
          onError={handleRecordingError}
          size="sm"
          autoStop={maxRecordingDuration}
        />
        <VoiceStatusIndicator
          status={status}
          message={error || undefined}
          size="sm"
          showLabel={!isProcessing}
        />
      </div>
    );
  }

  return (
    <Card className={cn('p-4 space-y-4', className)}>
      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <VoiceStatusIndicator
          status={status}
          message={error || undefined}
          size="md"
        />
        {(transcript || audioBlob || ttsAudioBlob) && (
          <Button
            onClick={handleClearTranscript}
            variant="ghost"
            size="sm"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Recording Controls */}
      <div className="flex items-center justify-center">
        <VoiceRecordButton
          onRecordingComplete={handleRecordingComplete}
          onError={handleRecordingError}
          size="md"
          showDuration
          autoStop={maxRecordingDuration}
        />
      </div>

      {/* Playback Controls for Recorded Audio */}
      {audioBlob && (
        <div className="space-y-2">
          <div className="text-sm font-medium flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Your Recording
          </div>
          <VoicePlaybackControls
            audioBlob={audioBlob}
            size="sm"
            showProgress
            showVolume={false}
          />
        </div>
      )}

      {/* Transcript Display */}
      {showTranscript && transcript && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Transcript</div>
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm">{transcript}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSendTranscript}
              disabled={isProcessing || !transcript.trim()}
              size="sm"
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
            {onTTSRequest && (
              <Button
                onClick={handleRequestTTS}
                disabled={isProcessing || !transcript.trim()}
                variant="outline"
                size="sm"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Play
              </Button>
            )}
          </div>
        </div>
      )}

      {/* TTS Playback Controls */}
      {ttsAudioBlob && (
        <div className="space-y-2">
          <div className="text-sm font-medium flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            PAM Response
          </div>
          <VoicePlaybackControls
            audioBlob={ttsAudioBlob}
            size="sm"
            showProgress
            showVolume={false}
            autoPlay
          />
        </div>
      )}

      {/* Error Display */}
      {error && status === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </Card>
  );
};

// Export a hook for parent components to control the interface
export interface VoiceInterfaceHandle {
  updateTranscript: (text: string) => void;
  updateStatus: (status: VoiceStatus) => void;
  clearTranscript: () => void;
}

export const VoiceInterfaceWithRef = React.forwardRef<
  VoiceInterfaceHandle,
  VoiceInterfaceProps
>((props, ref) => {
  const internalRef = useRef<VoiceInterfaceHandle>(null);

  React.useImperativeHandle(ref, () => ({
    updateTranscript: (text: string) => {
      internalRef.current?.updateTranscript(text);
    },
    updateStatus: (status: VoiceStatus) => {
      internalRef.current?.updateStatus(status);
    },
    clearTranscript: () => {
      internalRef.current?.clearTranscript();
    },
  }));

  return <VoiceInterface {...props} />;
});