import React, { useState, useRef, useEffect } from 'react';
import { getPublicAssetUrl } from '@/utils/publicAssets';
import { Mic, Send, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'pam';
  timestamp: string;
}

/**
 * Simple PAM Bubble - Chat interface with voice support
 */
export function SimplePamBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm PAM, your AI travel companion! How can I help you today?",
      sender: 'pam',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { user, session } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Connect to OpenAI Realtime API
  const connectToVoice = async () => {
    if (!user || !session?.access_token) {
      addMessage('pam', 'Please sign in to use voice mode');
      return;
    }

    setIsConnecting(true);

    try {
      // Call Supabase Edge Function (simple, like Barry)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/pam-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ mode: 'realtime' }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const { session_token } = await response.json();

      // Connect directly to OpenAI
      const ws = new WebSocket(
        `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`,
        ['realtime', `openai-insecure-api-key.${session_token}`]
      );

      ws.onopen = () => {
        console.log('✅ Connected to ChatGPT');
        setIsConnecting(false);
        setIsListening(true);
        addMessage('pam', '🎤 Voice mode active - speak now!');

        // Configure session with transcription support
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are PAM, a helpful RV travel assistant. Be concise and friendly.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: { type: 'server_vad' },
            input_audio_transcription: { model: 'whisper-1' }  // Enable user speech transcription
          },
        }));
      };

      ws.onmessage = (event) => {
        try {
          console.log('📨 OpenAI Realtime message received');
          const data = JSON.parse(event.data);
          console.log('📨 Message type:', data.type, 'Data:', data);

          // Handle user speech transcription (what the user said)
          if (data.type === 'conversation.item.input_audio_transcription.completed') {
            console.log('🎤 User said:', data.transcript);
            addMessage('user', data.transcript);
          }

          // Handle assistant complete response (best way to get full response)
          if (data.type === 'response.output_item.done') {
            console.log('🤖 Assistant response complete:', data.item);
            if (data.item.content) {
              data.item.content.forEach((content: any) => {
                if (content.type === 'audio' && content.transcript) {
                  console.log('✅ Assistant transcript:', content.transcript);
                  addMessage('pam', content.transcript);
                }
                if (content.type === 'text' && content.text) {
                  console.log('✅ Assistant text:', content.text);
                  addMessage('pam', content.text);
                }
              });
            }
          }

          // Handle audio transcript (legacy, still useful for debugging)
          if (data.type === 'response.audio_transcript.done' && data.transcript) {
            console.log('✅ Audio transcript (legacy):', data.transcript);
            // Don't add message here, handled by response.output_item.done
          }

          // Handle text-only response (text mode)
          if (data.type === 'response.text.done' && data.text) {
            console.log('✅ Text response received:', data.text);
            addMessage('pam', data.text);
          }

          // Handle streaming audio chunks (plays through device speakers)
          if (data.type === 'response.audio.delta' && data.delta) {
            console.log('🔊 Audio chunk received');
            playAudioChunk(data.delta);
          }

          // Log if we receive an unexpected message type
          const knownTypes = [
            'response.audio_transcript.done',
            'response.text.done',
            'response.audio.delta',
            'response.output_item.done',
            'conversation.item.input_audio_transcription.completed',
            'conversation.item.input_audio_transcription.failed',
            'session.created',
            'session.updated',
            'input_audio_buffer.committed',
            'input_audio_buffer.speech_started',
            'input_audio_buffer.speech_stopped',
            'conversation.item.created',
            'response.created',
            'response.done',
            'response.content_part.done'
          ];

          if (!knownTypes.includes(data.type)) {
            console.warn('⚠️ Unhandled message type:', data.type);
          }
        } catch (error) {
          console.error('❌ Error processing WebSocket message:', error, event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        addMessage('pam', '❌ Connection error. Please try again.');
        setIsListening(false);
        setIsConnecting(false);
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', { code: event.code, reason: event.reason, wasClean: event.wasClean });
        setIsListening(false);
        setIsConnecting(false);
      };

      wsRef.current = ws;

      // Start microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext({ sampleRate: 24000 });
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
          ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: base64 }));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

    } catch (error) {
      console.error('❌ Voice connection failed:', error);
      addMessage('pam', '❌ Failed to connect. Please try again.');
      setIsConnecting(false);
    }
  };

  const disconnectVoice = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsListening(false);
    addMessage('pam', '🔇 Voice mode ended');
  };

  const playAudioChunk = (base64Audio: string) => {
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }

    const audioContext = new AudioContext({ sampleRate: 24000 });
    const buffer = audioContext.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
  };

  const addMessage = (sender: 'user' | 'pam', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      sender,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText('');
    addMessage('user', userMessage);

    // Call Backend API with full tool support
    if (!user || !session?.access_token) {
      addMessage('pam', 'Please sign in to chat with PAM');
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://wheels-wins-backend-staging.onrender.com';

      // Build conversation history for Claude (last 10 messages)
      const conversationHistory = messages
        .slice(-10) // Keep last 10 messages
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      console.log('🚀 Calling backend with tool support:', backendUrl);

      const response = await fetch(`${backendUrl}/api/v1/pam-simple/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          conversation_history: conversationHistory,
          user_id: user.id
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend error:', errorText);
        throw new Error(`Backend returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Show which tools were used (for debugging)
      if (data.tools_used && data.tools_used.length > 0) {
        console.log('🔧 PAM used tools:', data.tools_used.join(', '));
      }

      // Backend returns 'content' not 'response'
      const pamResponse = data.content || data.response || 'Sorry, I could not process that.';
      console.log('✅ PAM response received:', pamResponse.substring(0, 100));
      addMessage('pam', pamResponse);
    } catch (error) {
      console.error('❌ Chat error:', error);
      addMessage('pam', '❌ Sorry, I encountered an error. Please try again.');
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      disconnectVoice();
    } else {
      connectToVoice();
    }
  };

  return (
    <>
      {/* Floating PAM Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-xl transition-all z-50 hover:scale-110"
        aria-label="Open PAM Chat"
      >
        <div className="relative w-12 h-12 flex items-center justify-center">
          <img
            src={getPublicAssetUrl('Pam.webp')}
            alt="PAM"
            className="w-full h-full rounded-full object-cover"
          />
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex items-center space-x-3">
              <img
                src={getPublicAssetUrl('Pam.webp')}
                alt="PAM"
                className="w-10 h-10 rounded-full border-2 border-white"
              />
              <div>
                <h3 className="font-semibold">PAM</h3>
                <p className="text-xs text-blue-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  Agentic AI Reasoning
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                  }`}
                >
                  {msg.sender === 'pam' && (
                    <div className="text-xs text-gray-500 mb-1">🤖</div>
                  )}
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask PAM anything..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={toggleVoice}
                disabled={isConnecting}
                className={`rounded-full p-2 transition-all ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : isConnecting
                    ? 'bg-yellow-500'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                title={isListening ? 'Stop voice mode' : 'Start voice mode'}
              >
                <Mic className={`w-4 h-4 ${isListening ? 'text-white' : 'text-gray-600'}`} />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full p-3 transition-colors shadow-lg"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
