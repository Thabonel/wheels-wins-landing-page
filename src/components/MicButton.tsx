
// src/components/MicButton.tsx
import React, { useState, useRef } from 'react';

interface MicButtonProps {
  inline?: boolean;
  disabled?: boolean;
}

export default function MicButton({ inline = false, disabled = false }: MicButtonProps) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleClick = async () => {
    if (disabled) return;
    
    if (!recording) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          await fetch(import.meta.env.VITE_N8N_VOICE_WEBHOOK_URL, {
            method: 'POST',
            body: blob,
          });
        } catch (err) {
          console.error('Failed to send audio blob', err);
        }
      };

      recorder.start();
      setRecording(true);
    } else {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
    }
  };

  const baseClasses = `z-30 flex items-center justify-center rounded-full
    ${recording ? 'bg-red-600' : 'bg-primary text-white'}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;
  const sizeClasses = inline ? 'w-8 h-8' : 'w-10 h-10';
  const positionClasses = inline
    ? ''
    : 'fixed bottom-4 right-4';

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses} ${positionClasses}`}
      title={disabled ? 'Voice recording unavailable' : (recording ? 'Stop recording' : 'Record voice')}
    >
      {recording ? (
        <span className={inline ? 'text-sm' : 'text-lg'}>■</span>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className={inline ? 'w-5 h-5' : 'w-6 h-6'} fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 1a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M5 8a3 3 0 0 0 6 0V4a3 3 0 0 0-6 0v4z" />
          <path d="M11.5 9a.5.5 0 0 1 .5.5v.5a4.5 4.5 0 0 1-9 0v-.5a.5.5 0 0 1 1 0v.5a3.5 3.5 0 0 0 7 0v-.5a.5.5 0 0 1 .5-.5z" />
          <path d="M8 13.5a.5.5 0 0 1 .5.5h.5v1a.5.5 0 0 1-1 0v-1h.5a.5.5 0 0 1 .5-.5z" />
        </svg>
      )}
    </button>
  );
}
