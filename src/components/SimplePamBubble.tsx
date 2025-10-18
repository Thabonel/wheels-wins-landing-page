import React, { useState, useRef, useEffect } from 'react';
import { getPublicAssetUrl } from '@/utils/publicAssets';
import { Mic, MicOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * Simple PAM Bubble - Direct ChatGPT voice connection
 * Microphone → OpenAI Realtime API → Voice response
 */
export function SimplePamBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [message, setMessage] = useState('');
  const { user, session } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Connect to OpenAI Realtime API via backend
  const connectToVoice = async () => {
    if (!user || !session?.access_token) {
      setMessage('Please sign in to use voice mode');
      return;
    }

    setIsConnecting(true);
    setMessage('Connecting to ChatGPT...');

    try {
      // Get session token from backend
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/api/v1/pam/realtime/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const { client_secret } = await response.json();

      // Connect directly to OpenAI Realtime API
      const ws = new WebSocket(
        `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
        ['realtime', `openai-insecure-api-key.${client_secret.value}`]
      );

      ws.onopen = () => {
        console.log('✅ Connected to ChatGPT');
        setIsConnecting(false);
        setIsListening(true);
        setMessage('Listening... speak now!');

        // Configure session
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are PAM, a helpful RV travel assistant. Be concise and friendly.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
          },
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📩 OpenAI:', data.type);

        if (data.type === 'response.audio.delta' && data.delta) {
          // Play audio response
          playAudioChunk(data.delta);
        }

        if (data.type === 'response.done') {
          setMessage('Response complete. Speak again anytime!');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setMessage('Connection error. Please try again.');
        setIsListening(false);
        setIsConnecting(false);
      };

      ws.onclose = () => {
        console.log('🔌 Disconnected from ChatGPT');
        setIsListening(false);
        setIsConnecting(false);
        setMessage('Disconnected');
      };

      wsRef.current = ws;

      // Start capturing microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));

          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64,
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

    } catch (error) {
      console.error('❌ Connection failed:', error);
      setMessage('Failed to connect. Please try again.');
      setIsConnecting(false);
    }
  };

  // Disconnect from voice
  const disconnectVoice = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsListening(false);
    setMessage('');
  };

  // Play audio chunk from OpenAI
  const playAudioChunk = (base64Audio: string) => {
    // Decode base64 to PCM16
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);

    // Convert PCM16 to float32
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }

    // Play audio
    const audioContext = new AudioContext({ sampleRate: 24000 });
    const buffer = audioContext.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
  };

  // Toggle voice mode
  const toggleVoice = () => {
    if (isListening) {
      disconnectVoice();
    } else {
      connectToVoice();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectVoice();
    };
  }, []);

  return (
    <>
      {/* Floating PAM Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all z-50"
        aria-label="Open PAM Assistant"
        style={{ width: '64px', height: '64px' }}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={getPublicAssetUrl('Pam.webp')}
            alt="PAM"
            className="w-10 h-10 rounded-full"
          />
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500" />
        </div>
      </button>

      {/* Simple Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border-2 border-gray-200 z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-blue-50 rounded-t-lg">
            <div className="flex items-center space-x-3">
              <img
                src={getPublicAssetUrl('Pam.webp')}
                alt="PAM"
                className="w-10 h-10 rounded-full"
              />
              <div>
                <h3 className="font-semibold text-gray-800">PAM Assistant</h3>
                <p className="text-xs text-gray-500">Ready to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col items-center justify-center">
            {/* Voice Button */}
            <button
              onClick={toggleVoice}
              disabled={isConnecting}
              className={`rounded-full p-8 transition-all shadow-lg ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : isConnecting
                  ? 'bg-yellow-500'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isListening ? (
                <MicOff className="w-12 h-12 text-white" />
              ) : (
                <Mic className="w-12 h-12 text-white" />
              )}
            </button>

            {/* Status Message */}
            <p className="mt-6 text-center text-gray-700 font-medium">
              {isConnecting && 'Connecting to ChatGPT...'}
              {isListening && 'Listening... speak now!'}
              {!isConnecting && !isListening && 'Click to start voice chat'}
            </p>

            {message && (
              <p className="mt-2 text-sm text-gray-500 text-center">{message}</p>
            )}

            {/* Instructions */}
            {!isListening && !isConnecting && (
              <div className="mt-8 text-center text-sm text-gray-500 max-w-xs">
                <p className="mb-2">Direct ChatGPT voice connection</p>
                <p>Click the microphone, speak naturally, and ChatGPT will respond with voice.</p>
              </div>
            )}
          </div>

          {/* Footer - Sign In Prompt */}
          {!user && (
            <div className="p-4 border-t bg-yellow-50 text-center">
              <p className="text-sm text-gray-700">Please sign in to use voice mode</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
