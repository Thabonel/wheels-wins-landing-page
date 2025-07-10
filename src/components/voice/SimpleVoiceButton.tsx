/**
 * Simple Voice Button Component
 * Basic voice recording without complex dependencies
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface SimpleVoiceButtonProps {
  onTranscription?: (text: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function SimpleVoiceButton({ 
  onTranscription, 
  className = '',
  size = 'md'
}: SimpleVoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      console.log('🎤 Starting voice recording...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        console.log('🎤 Recording stopped, processing...');
        setIsProcessing(true);
        
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        try {
          // Send to voice processing endpoint
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');
          
          const response = await fetch('/api/v1/pam/voice', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('🎙️ Voice processing result:', result);
            
            if (result.text && onTranscription) {
              onTranscription(result.text);
            }
          } else {
            console.error('❌ Voice processing failed');
          }
        } catch (error) {
          console.error('❌ Voice processing error:', error);
        } finally {
          setIsProcessing(false);
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        }
      };

      recorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('🛑 Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (!isProcessing) {
      startRecording();
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'sm': return 'h-8 w-8';
      case 'lg': return 'h-12 w-12';
      default: return 'h-10 w-10';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'h-3 w-3';
      case 'lg': return 'h-5 w-5';
      default: return 'h-4 w-4';
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isProcessing}
      variant={isRecording ? "destructive" : "default"}
      size="icon"
      className={`${getButtonSize()} rounded-full transition-all duration-200 ${
        isRecording ? 'animate-pulse bg-red-600 hover:bg-red-700' : ''
      } ${className}`}
      title={
        isProcessing 
          ? 'Processing voice...' 
          : isRecording 
            ? 'Stop recording' 
            : 'Start voice recording'
      }
    >
      {isProcessing ? (
        <Loader2 className={`${getIconSize()} animate-spin`} />
      ) : isRecording ? (
        <MicOff className={getIconSize()} />
      ) : (
        <Mic className={getIconSize()} />
      )}
    </Button>
  );
}