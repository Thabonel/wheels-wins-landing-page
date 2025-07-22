import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, Navigation, Car } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { pamVoiceService } from '@/lib/voiceService';
import { usePamWebSocket } from '@/hooks/usePamWebSocket';

interface ConversationState {
  sessionId: string | null;
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  drivingStatus: 'driving' | 'parked' | 'passenger';
  location: { lat: number; lng: number } | null;
}

interface VoiceMessage {
  id: string;
  text: string;
  speaker: 'user' | 'pam';
  timestamp: Date;
  audioUrl?: string;
}

const PamVoiceCompanion: React.FC = () => {
  const [conversation, setConversation] = useState<ConversationState>({
    sessionId: null,
    isActive: false,
    isListening: false,
    isSpeaking: false,
    drivingStatus: 'parked',
    location: null
  });

  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const { toast } = useToast();

  // Get user's current location
  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  };

  // Start voice conversation
  const startConversation = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Get current location
      let location = null;
      try {
        location = await getCurrentLocation();
      } catch (locationError) {
        console.warn('Could not get location:', locationError);
      }

      // Start conversation with backend
      const response = await fetch('/api/v1/voice/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}` // Adjust based on your auth
        },
        body: JSON.stringify({
          driving_status: conversation.drivingStatus,
          current_location: location
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start conversation: ${response.statusText}`);
      }

      const data = await response.json();

      setConversation(prev => ({
        ...prev,
        sessionId: data.session_id,
        isActive: true,
        location
      }));

      // Add PAM's greeting message
      if (data.greeting_text) {
        const greetingMessage: VoiceMessage = {
          id: `greeting_${Date.now()}`,
          text: data.greeting_text || "Hello! How can I help you on the road today?",
          speaker: 'pam',
          timestamp: new Date()
        };
        setMessages([greetingMessage]);
      }

      toast({
        title: "Voice Companion Active",
        description: "PAM is ready to help you on your journey!"
      });

    } catch (error) {
      console.error('Failed to start conversation:', error);
      setError(error instanceof Error ? error.message : 'Failed to start conversation');
      toast({
        title: "Connection Failed",
        description: "Could not connect to PAM. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // End voice conversation
  const endConversation = async () => {
    if (!conversation.sessionId) return;

    try {
      await fetch(`/api/v1/voice/end/${conversation.sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      setConversation({
        sessionId: null,
        isActive: false,
        isListening: false,
        isSpeaking: false,
        drivingStatus: 'parked',
        location: null
      });

      setMessages([]);
      
      toast({
        title: "Conversation Ended",
        description: "Safe travels! PAM will be here when you need her."
      });

    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
  };

  // Initialize audio recording
  const initializeAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        audioChunksRef.current = [];
        
        await sendAudioToBackend(audioBlob);
      };

      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      setError('Microphone access denied or not available');
      return false;
    }
  };

  // Send audio to backend for processing
  const sendAudioToBackend = async (audioBlob: Blob) => {
    if (!conversation.sessionId) return;

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      if (conversation.location) {
        formData.append('location', JSON.stringify(conversation.location));
      }

      const response = await fetch(`/api/v1/voice/input/${conversation.sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to process audio: ${response.statusText}`);
      }

      const data = await response.json();

      // Add user message
      const userMessage: VoiceMessage = {
        id: `user_${Date.now()}`,
        text: data.transcript || 'Audio message',
        speaker: 'user',
        timestamp: new Date()
      };

      // Add PAM response
      const pamMessage: VoiceMessage = {
        id: `pam_${Date.now()}`,
        text: data.response_text,
        speaker: 'pam',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage, pamMessage]);

      // Play PAM's audio response
      if (data.response_audio) {
        playAudioResponse(data.response_audio);
      }

      // Handle proactive suggestions
      if (data.proactive_suggestions && data.proactive_suggestions.length > 0) {
        toast({
          title: "PAM suggests:",
          description: data.proactive_suggestions[0]
        });
      }

    } catch (error) {
      console.error('Failed to process audio:', error);
      setError('Failed to process your message');
    }
  };

  // Play audio response from PAM
  const playAudioResponse = (audioData: ArrayBuffer | string) => {
    try {
      setConversation(prev => ({ ...prev, isSpeaking: true }));

      // Create audio from base64 or ArrayBuffer
      let audioBlob: Blob;
      if (typeof audioData === 'string') {
        // Base64 data
        const byteCharacters = atob(audioData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });
      } else {
        audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setConversation(prev => ({ ...prev, isSpeaking: false }));
        URL.revokeObjectURL(audioUrl);
      };

      audio.play().catch(error => {
        console.error('Failed to play audio:', error);
        setConversation(prev => ({ ...prev, isSpeaking: false }));
      });

    } catch (error) {
      console.error('Failed to play audio response:', error);
      setConversation(prev => ({ ...prev, isSpeaking: false }));
    }
  };

  // Start/stop recording
  const toggleRecording = async () => {
    if (!conversation.isActive) return;

    if (conversation.isListening) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setConversation(prev => ({ ...prev, isListening: false }));
    } else {
      // Start recording
      if (!mediaRecorderRef.current) {
        const success = await initializeAudio();
        if (!success) return;
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
        mediaRecorderRef.current.start();
        setConversation(prev => ({ ...prev, isListening: true }));
      }
    }
  };

  // Update driving status
  const updateDrivingStatus = async (status: 'driving' | 'parked' | 'passenger') => {
    setConversation(prev => ({ ...prev, drivingStatus: status }));

    if (conversation.sessionId) {
      try {
        await fetch(`/api/v1/voice/status/${conversation.sessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({ driving_status: status })
        });
      } catch (error) {
        console.error('Failed to update driving status:', error);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversation.sessionId) {
        endConversation();
      }
    };
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          PAM Voice Companion
          {conversation.isActive && (
            <Badge variant="secondary" className="ml-auto">
              Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Driving Status Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status:</label>
          <div className="flex gap-2">
            {(['driving', 'parked', 'passenger'] as const).map((status) => (
              <Button
                key={status}
                variant={conversation.drivingStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateDrivingStatus(status)}
                className="capitalize"
              >
                {status === 'driving' && <Navigation className="h-3 w-3 mr-1" />}
                {status}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex gap-2">
          {!conversation.isActive ? (
            <Button 
              onClick={startConversation} 
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? 'Connecting...' : 'Start Voice Chat'}
            </Button>
          ) : (
            <>
              <Button
                onClick={toggleRecording}
                variant={conversation.isListening ? 'destructive' : 'default'}
                size="lg"
                className="flex-1"
                disabled={conversation.isSpeaking}
              >
                {conversation.isListening ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                {conversation.isListening ? 'Stop' : 'Talk'}
              </Button>
              
              <Button
                onClick={endConversation}
                variant="outline"
                size="lg"
              >
                End Chat
              </Button>
            </>
          )}
        </div>

        {/* Status Indicators */}
        {conversation.isActive && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              {conversation.isListening && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Listening...
                </div>
              )}
              {conversation.isSpeaking && (
                <div className="flex items-center gap-1">
                  <Volume2 className="h-3 w-3" />
                  PAM speaking...
                </div>
              )}
              {!conversation.isListening && !conversation.isSpeaking && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Ready
                </div>
              )}
            </div>
            
            {conversation.location && (
              <div className="text-xs">
                📍 Location tracked
              </div>
            )}
          </div>
        )}

        {/* Recent Messages */}
        {messages.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            <div className="text-sm font-medium">Recent conversation:</div>
            {messages.slice(-4).map((message) => (
              <div
                key={message.id}
                className={`text-xs p-2 rounded-md ${
                  message.speaker === 'pam' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'bg-gray-50 text-gray-700'
                }`}
              >
                <div className="font-medium">
                  {message.speaker === 'pam' ? 'PAM' : 'You'}:
                </div>
                <div>{message.text}</div>
              </div>
            ))}
          </div>
        )}

        {/* Usage Tips */}
        {!conversation.isActive && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div>💡 Tips:</div>
            <div>• Set your status before starting</div>
            <div>• PAM can suggest stops and provide directions</div>
            <div>• Works best with location services enabled</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PamVoiceCompanion;