import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { PAMErrorBoundary } from '@/components/common/PAMErrorBoundary';

// Always enable PAM as a core feature
const pamEnabled = true;

// Regular imports
import { X, Send, Mic, MicOff, VolumeX, MapPin, Calendar, DollarSign, Volume2, ThumbsUp, ThumbsDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
// Use WebSocket PAM Service for real-time communication
import { usePamConnection } from "@/hooks/usePamConnection";
import { getPublicAssetUrl } from "@/utils/publicAssets";
import { supabase } from "@/integrations/supabase/client";
import { pamCalendarService } from "@/services/pamCalendarService";
import { pamFeedbackService } from "@/services/pamFeedbackService";
import { pamVoiceService } from "@/lib/voiceService";
import { useUserSettings } from "@/hooks/useUserSettings";
import { vadService, type ConversationState } from "@/services/voiceActivityDetection";
import { audioManager } from "@/utils/audioManager";
import { OpenAIRealtimeService } from "@/services/openaiRealtimeService";
import { TTSQueueManager } from "@/utils/ttsQueueManager";
import TTSControls from "@/components/pam/TTSControls";
import { locationService } from "@/services/locationService";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { pamAgenticService } from "@/services/pamAgenticService";
import { logger } from '../lib/logger';
import { formatPamMessage, extractTravelSummary } from "@/utils/messageFormatter";

// Using Backend PersonalizedPamAgent API for proper authentication and tool execution

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface TTSAudio {
  audio_data: string;
  format: string;
  duration?: number;
  voice_used?: string;
  engine_used?: string;
}

interface PamMessage {
  id: string;
  content: string;
  sender: "user" | "pam";
  timestamp: string;
  context?: any;
  shouldSpeak?: boolean;  // Control whether this message should be spoken
  voicePriority?: 'low' | 'normal' | 'high' | 'urgent';
  isStreaming?: boolean;  // Indicates if this message is currently being streamed
  tts?: TTSAudio;  // Phase 5A: TTS audio data from backend
  feedback?: 1 | -1;  // Simple feedback: 1 = helpful, -1 = not helpful
}

interface PamProps {
  mode?: "floating" | "sidebar" | "modal";
}

// Removed authenticatedFetch - using Direct Claude API only

// The actual PAM implementation
const PamImplementation: React.FC<PamProps> = ({ mode = "floating" }) => {
  const { user, session } = useAuth();
  const { settings, updateSettings } = useUserSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [shouldAutoSend, setShouldAutoSend] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "processing" | "error">("idle");
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [messages, setMessages] = useState<PamMessage[]>([]);
  const { status: pamStatus, isReady, sendMessage: sendPamMessage } = usePamConnection();
  const connectionStatus: "Connected" | "Connecting" | "Disconnected" = pamStatus.isConnected
    ? "Connected"
    : pamStatus.isConnecting
    ? "Connecting"
    : "Disconnected";
  const [userContext, setUserContext] = useState<any>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const [wakeWordRecognition, setWakeWordRecognition] = useState<any | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [voiceActivationMode, setVoiceActivationMode] = useState<'manual' | 'auto' | 'command'>('manual');
  const [realtimeService, setRealtimeService] = useState<OpenAIRealtimeService | null>(null);
  const ttsQueueRef = useRef<TTSQueueManager | null>(null);
  const { startTracking, stopTracking, getCurrentLocation, ...locationState } = useLocationTracking();
  const [audioLevel, setAudioLevel] = useState(0);
  const [isShowingAudioLevel, setIsShowingAudioLevel] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  
  // Voice settings - simplified to default values
  const voiceSettings = {
    voice: 'en-US-AriaNeural',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  };
  
  // VAD and conversation management
  const [isVADActive, setIsVADActive] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>({
    userSpeaking: false,
    pamSpeaking: false,
    waitingForPause: false,
    lastSpeechEnd: 0,
    lastSilenceStart: 0,
  });
  
  // Audio analysis refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  
  // Use refs to avoid stale closure problem
  const isWakeWordListeningRef = useRef(false);
  const isContinuousModeRef = useRef(false);
  const isListeningRef = useRef(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    // Generate or restore session ID for conversation continuity
    const saved = localStorage.getItem('pam_session_id');
    return saved || `session_${user?.id}_${Date.now()}`;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownWelcomeRef = useRef(false);
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStartTimeRef = useRef<number>(0);
  const reconnectAttemptsRef = useRef<number>(0);
  
  const sessionToken = session?.access_token;

  // Keep refs in sync with state
  useEffect(() => {
    isWakeWordListeningRef.current = isWakeWordListening;
  }, [isWakeWordListening]);

  // Initialize TTS Queue Manager
  useEffect(() => {
    ttsQueueRef.current = new TTSQueueManager(
      (isSpeaking) => setIsSpeaking(isSpeaking),
      () => logger.debug('🔇 Speech interrupted')
    );
    
    return () => {
      ttsQueueRef.current?.destroy();
    };
  }, []);

  // Cleanup audio level monitoring and VAD on unmount
  useEffect(() => {
    return () => {
      stopAudioLevelMonitoring();
      vadService.cleanup();
    };
  }, []);
  
  useEffect(() => {
    isContinuousModeRef.current = isContinuousMode;
  }, [isContinuousMode]);
  
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);
  
  // Set up VAD event handlers
  useEffect(() => {
    // User speech start - interrupt PAM if speaking
    vadService.onSpeechStart((result) => {
      logger.debug('🎤 VAD detected user speech start:', result);
      setConversationState(prev => ({ ...prev, userSpeaking: true }));
      
      // Interrupt PAM if currently speaking
      if (isSpeaking && currentAudio && !currentAudio.paused) {
        logger.debug('🔇 VAD interrupting PAM speech due to user speaking');
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setIsSpeaking(false);
        vadService.setPAMSpeaking(false);
      }
    });
    
    // User speech end - update conversation state
    vadService.onSpeechEnd((result) => {
      logger.debug('🔇 VAD detected user speech end:', result);
      setConversationState(prev => ({ 
        ...prev, 
        userSpeaking: false,
        lastSpeechEnd: Date.now(),
        lastSilenceStart: Date.now(),
      }));
    });
    
    // General VAD results for debugging
    vadService.onVADResult((result) => {
      setConversationState(vadService.getConversationState());
    });
    
    return () => {
      // Cleanup is handled in the main cleanup useEffect
    };
  }, [isSpeaking, currentAudio]);

  // Initialize PAM when component mounts (no direct WS handling here)
  useEffect(() => {
    if (!pamEnabled) return;
    logger.debug('🚀 PAM mount: user context', { userId: user?.id, hasUser: !!user, hasSession: !!session });
    if (user?.id) {
      localStorage.setItem('pam_session_id', sessionId);
      loadConversationMemory();
    }
    // eslint-disable-next-line
  }, [user?.id, sessionId]);

  // On first ready connection, show greeting once
  useEffect(() => {
    if (!pamEnabled) return;
    if (isReady && messages.length === 0 && !hasShownWelcomeRef.current) {
      logger.debug('💬 PAM: Adding greeting message on first ready connection');
      addMessage("🤖 Hi! I'm PAM, your AI travel companion! How can I help you today?", "pam");
      hasShownWelcomeRef.current = true;
    }
  }, [isReady, messages.length]);

  // Update location context when tracking state changes
  useEffect(() => {
    const updateLocationContext = async () => {
      if (user?.id && locationState?.isTracking) {
        try {
          const userLocation = await locationService.getUserLocation(user.id);
          if (userLocation && userLocation.current_latitude && userLocation.current_longitude) {
            const { current_latitude, current_longitude } = userLocation;
            const locationString = `${current_latitude.toFixed(4)}, ${current_longitude.toFixed(4)}`;
            setUserContext(prev => ({
              ...prev,
              current_location: locationString,
              location_source: 'trip_planner'
            }));
            logger.debug('📍 Updated PAM location context from trip planner:', locationString);
          }
        } catch (error) {
          logger.warn('⚠️ Failed to update location context:', error);
        }
      }
    };

    updateLocationContext();
  }, [user?.id, locationState?.isTracking, locationState?.lastUpdate]);

  // Listen for external PAM control events
  useEffect(() => {
    const handleOpenWithMessage = (event: CustomEvent) => {
      const { message } = event.detail;
      logger.debug('🎯 PAM: Opening with message:', message);
      setIsOpen(true);
      setInputMessage(message);
      // Focus input after a brief delay to ensure component is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    };

    const handleOpen = () => {
      logger.debug('🎯 PAM: Opening');
      setIsOpen(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    };

    const handleSendMessageEvent = (event: CustomEvent) => {
      const { message } = event.detail;
      logger.debug('🎯 PAM: Sending message:', message);
      // Set message and trigger send flag
      setInputMessage(message);
      setIsOpen(true);
      // Use a ref to trigger the send after state updates
      setShouldAutoSend(true);
    };

    // Add event listeners
    window.addEventListener('pam-open-with-message', handleOpenWithMessage as EventListener);
    window.addEventListener('pam-open', handleOpen);
    window.addEventListener('pam-send-message', handleSendMessageEvent as EventListener);

    return () => {
      window.removeEventListener('pam-open-with-message', handleOpenWithMessage as EventListener);
      window.removeEventListener('pam-open', handleOpen);
      window.removeEventListener('pam-send-message', handleSendMessageEvent as EventListener);
    };
  }, []); // Empty dependency array - register once

  // Removed loadUserContext - using Direct Claude API only

  const requestUserLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (isRequestingLocation) {
      logger.debug('📍 Location request already in progress');
      return null;
    }

    if (!navigator.geolocation) {
      logger.error('❌ Geolocation not supported');
      addMessage("I'm sorry, but location services are not available in your browser. You can tell me your location manually for better assistance.", "pam");
      return null;
    }

    setIsRequestingLocation(true);
    
    try {
      // First, check if we already have location from the tracking service
      if (locationState?.isTracking && user?.id) {
        logger.debug('📍 Using existing location from tracking service');
        const userLocation = await locationService.getUserLocation(user.id);
        if (userLocation && userLocation.current_latitude && userLocation.current_longitude) {
          const { current_latitude, current_longitude } = userLocation;
          const locationString = `${current_latitude.toFixed(4)}, ${current_longitude.toFixed(4)}`;
          setUserContext(prev => ({
            ...prev,
            current_location: locationString
          }));
          setIsRequestingLocation(false);
          return { latitude: current_latitude, longitude: current_longitude };
        }
      }

      // If not tracking or no stored location, request fresh location
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            logger.debug('📍 Successfully got user location:', { latitude, longitude });
            
            // Update user context with fresh location
            const locationString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setUserContext(prev => ({
              ...prev,
              current_location: locationString
            }));
            
            // Store in locationService
            if (user?.id) {
              try {
                await locationService.updateUserLocation({
                  user_id: user.id,
                  current_latitude: latitude,
                  current_longitude: longitude,
                  status: 'active'
                });
                logger.debug('✅ Location stored in database');
              } catch (error) {
                logger.warn('⚠️ Failed to update location in database:', error);
              }
            }
            
            setIsRequestingLocation(false);
            resolve({ latitude, longitude });
          },
          (error) => {
            logger.error('❌ Failed to get location:', error);
            setIsRequestingLocation(false);
            
            let errorMessage = "I couldn't access your location. ";
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage += "Please enable location access in your browser settings and try again.";
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage += "Your location information is unavailable.";
                break;
              case error.TIMEOUT:
                errorMessage += "Location request timed out.";
                break;
              default:
                errorMessage += "You can tell me your location manually.";
                break;
            }
            
            addMessage(errorMessage, "pam");
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000, // 5 minutes
          }
        );
      });
    } catch (error) {
      logger.error('❌ Location request error:', error);
      setIsRequestingLocation(false);
      return null;
    }
  };

  const loadConversationMemory = async () => {
    try {
      // ROBUST MEMORY: Restore from localStorage only (Direct Claude API mode)
      const savedState = localStorage.getItem(`pam_conversation_${user?.id}`);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          if (parsed.messages && Array.isArray(parsed.messages)) {
            setMessages(parsed.messages);
            logger.debug('📚 PAM: Restored conversation from localStorage:', parsed.messages.length, 'messages');
            
            // Restore session ID if available
            if (parsed.sessionId) {
              setSessionId(parsed.sessionId);
            }
            return; // Successfully restored from localStorage
          }
        } catch (parseError) {
          logger.warn('⚠️ Could not parse saved conversation state:', parseError);
        }
      }
      
      // No backend fallback - using Direct Claude API only
      logger.debug('📚 PAM: No saved conversation found, starting fresh');
      
    } catch (error) {
      logger.error('Failed to load conversation memory:', error);
    }
  };

  // Removed saveToMemory - using localStorage only in Direct Claude API mode

  const handleFeedback = async (messageId: string, rating: 1 | -1) => {
    try {
      logger.debug('👍👎 Processing feedback:', { messageId, rating });
      
      // Update message feedback in state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, feedback: rating } : msg
      ));

      // Save feedback to localStorage only (Direct Claude API mode)
      if (user?.id) {
        try {
          const feedbackKey = `pam_feedback_${user.id}`;
          const existingFeedback = JSON.parse(localStorage.getItem(feedbackKey) || '[]');
          existingFeedback.push({
            response_id: messageId,
            rating,
            timestamp: new Date().toISOString()
          });
          localStorage.setItem(feedbackKey, JSON.stringify(existingFeedback.slice(-50))); // Keep last 50 feedbacks
          logger.debug('✅ Feedback saved to localStorage');
        } catch (error) {
          logger.warn('⚠️ Failed to save feedback to localStorage:', error);
        }
      }
    } catch (error) {
      logger.error('❌ Failed to handle feedback:', error);
    }
  };

  const connectToBackend = useCallback(async () => {
    logger.debug('🤖 PAM: connectToBackend called (provider manages socket)');
    if (!user?.id || !sessionToken) {
      addMessage("🤖 Hi! I'm PAM. Please sign in to continue...", "pam");
      logger.warn('⚠️ PAM: Missing user authentication');
      
    }
    // Greeting is handled in isReady effect
  }, [user?.id, sessionToken]);

  // Minimal test function for debugging Backend API connection
  const testMinimalConnection = useCallback(async () => {
    logger.debug('🧪 PAM MINIMAL TEST: Backend PersonalizedPamAgent API Test');

    // Test backend API availability
    const isReady = user && sessionToken;
    logger.debug('🤖 Backend API Ready:', isReady);

    if (isReady) {
      addMessage("Backend API available. PAM is ready.", "pam");
      logger.debug('✅ PAM: Backend API test successful');
    } else {
      addMessage("Backend API not available. Please sign in.", "pam");
      logger.debug('❌ PAM: Backend API test failed - no user authentication');
    }
  }, [user, sessionToken]);

  // Placeholder functions for voice and audio features
  const stopAudioLevelMonitoring = () => {
    logger.debug('🔇 Audio level monitoring stopped');
  };

  const startWakeWordListening = () => {
    logger.debug('👂 Wake word listening started');
    setIsWakeWordListening(true);
  };

  const stopWakeWordListening = () => {
    logger.debug('🔇 Wake word listening stopped');
    setIsWakeWordListening(false);
  };

  const startContinuousVoiceMode = async () => {
    try {
      if (!user || !session) {
        logger.error('❌ User not authenticated');
        alert('Please log in to use voice mode');
        return;
      }

      logger.debug('🎙️ Starting OpenAI Realtime voice mode');

      // Get API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      // Create OpenAI Realtime service with direct connection
      const service = new OpenAIRealtimeService(
        user.id,
        session.access_token,
        apiBaseUrl
      );

      // Connect to OpenAI (gets session token, opens WebSocket)
      await service.connect();

      // Start voice mode (microphone → OpenAI)
      await service.startVoiceMode();

      setRealtimeService(service);
      setIsContinuousMode(true);

      logger.info('✅ PAM voice mode active (ChatGPT quality, zero latency!)');

    } catch (error) {
      logger.error('❌ Failed to start voice mode:', error);
      alert(`Failed to start voice mode: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const stopContinuousVoiceMode = async () => {
    logger.debug('🔇 Stopping continuous voice mode');

    // Stop OpenAI Realtime service
    if (realtimeService) {
      realtimeService.stopVoiceMode();
      setRealtimeService(null);
    }

    setIsContinuousMode(false);
    logger.debug('✅ Continuous voice mode stopped');
  };

  const speakText = async (text: string) => {
    try {
      logger.debug('🔊 Speaking text:', text.substring(0, 50));

      // Stop any currently playing audio
      if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      // Generate voice using PAM voice service
      const voiceResponse = await pamVoiceService.generateVoice({
        text,
        voice: voiceSettings.voice,
        emotion: 'helpful',
        context: 'general'
      });

      // Create and play audio
      const audio = new Audio(voiceResponse.audioUrl);
      audio.volume = 1.0;

      setCurrentAudio(audio);
      setIsSpeaking(true);
      vadService.setPAMSpeaking(true);

      // Play audio
      await audio.play();

      // Handle audio end
      audio.onended = () => {
        logger.debug('🔇 Audio playback completed');
        setIsSpeaking(false);
        vadService.setPAMSpeaking(false);
        setCurrentAudio(null);
      };

      // Handle audio errors
      audio.onerror = (error) => {
        logger.error('🔇 Audio playback error:', error);
        setIsSpeaking(false);
        vadService.setPAMSpeaking(false);
        setCurrentAudio(null);
      };

    } catch (error) {
      logger.error('Failed to generate or play voice:', error);
      setIsSpeaking(false);
      vadService.setPAMSpeaking(false);

      // Optionally show a toast notification
      // toast.error('Failed to play voice response');
    }
  };

  const speakMessage = (content: string, priority: string, shouldSpeak: boolean) => {
    if (shouldSpeak) {
      logger.debug('🔊 Speaking message with priority:', priority);
      speakText(content);
    }
  };

  const processCalendarActions = (content: string, triggeredByUserMessage: string) => {
    logger.debug('📅 Processing calendar actions for:', content.substring(0, 50));
  };

  const processFeedbackActions = (pamResponse: string, userMessage: string) => {
    logger.debug('👍 Processing feedback actions');
  };

  const AudioLevelMeter = () => {
    return <div className="audio-level-meter" style={{ display: 'none' }}></div>;
  };

  const stopSpeaking = () => {
    if (currentAudio && !currentAudio.paused) {
      logger.debug('🔇 User stopped PAM voice playback');
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsSpeaking(false);
      vadService.setPAMSpeaking(false);
      setCurrentAudio(null);
    }
  };

  const addMessage = (content: string, sender: "user" | "pam", triggeredByUserMessage?: string, shouldSpeak: boolean = false, voicePriority?: 'low' | 'normal' | 'high' | 'urgent'): PamMessage => {
    // Generate a unique ID using timestamp + random string to avoid duplicate keys
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: PamMessage = {
      id: uniqueId,
      content,
      sender,
      timestamp: new Date().toISOString(),
      shouldSpeak,
      voicePriority
    };
    setMessages(prev => {
      const updatedMessages = [...prev, newMessage];
      
      // Process calendar actions if this is a PAM response and we have the triggering user message
      if (sender === "pam" && triggeredByUserMessage) {
        processCalendarActions(content, triggeredByUserMessage);
      }
      
      // Process feedback actions for user messages
      if (sender === "user") {
        processFeedbackActions("", content); // content is the user message for user sender
      }

      // 🔊 VOICE OUTPUT: Controlled voice activation for PAM responses
      // CRITICAL: Only speak when explicitly requested by user action
      if (sender === "pam" && newMessage.shouldSpeak) {
        logger.debug('🔊 PAM message marked for speech - shouldSpeak:', newMessage.shouldSpeak, 'priority:', newMessage.voicePriority);
        speakMessage(content, newMessage.voicePriority || 'normal', true);
      } else if (sender === "pam") {
        logger.debug('🔇 PAM message added without voice - shouldSpeak:', newMessage.shouldSpeak);
      }
      
      // ROBUST MEMORY: Save to localStorage on every message
      try {
        localStorage.setItem(`pam_conversation_${user?.id}`, JSON.stringify({
          messages: updatedMessages.slice(-10), // Keep last 10 messages
          sessionId,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        logger.warn('⚠️ Could not save message to localStorage:', error);
      }
      
      return updatedMessages;
    });
    
    return newMessage;
  };

  // Determine if message needs agentic planning
  const needsAgenticPlanning = (message: string): boolean => {
    const planningKeywords = [
      'plan', 'autonomously', 'complex', 'multi-step', 'analyze',
      'strategy', 'comprehensive', 'detailed', 'coordinate', 'optimize',
      'thinking process', 'reasoning', 'tools', 'execute'
    ];
    const lowercaseMsg = message.toLowerCase();
    return planningKeywords.some(keyword => lowercaseMsg.includes(keyword));
  };

  const handleSendMessage = async () => {
    if (!inputMessage?.trim()) {
      logger.warn('⚠️ PAM DEBUG: Attempted to send empty message');
      return;
    }
    
    const message = inputMessage.trim();
    addMessage(message, "user");
    setInputMessage("");
    
    // Show thinking message for better UX
    const thinkingMessage = addMessage("PAM is thinking", "pam");
    thinkingMessage.isStreaming = true;

    try {
      // Check if user is asking for location-based services and we don't have location
      const locationQueries = [
        'weather', 'forecast', 'temperature', 'near me', 'nearby', 'close to me', 'in my area', 'around here',
        'pizza', 'restaurant', 'food', 'gas station', 'hotel', 'attraction',
        'next town', 'distance to', 'how far', 'directions to'
      ];
      
      const isLocationQuery = locationQueries.some(query => 
        message.toLowerCase().includes(query)
      );
      
      // Get user location for weather and location-based queries
      let currentLocation = userContext?.current_location;
      let locationObj: { latitude: number; longitude: number } | undefined;
      
      if (isLocationQuery && !currentLocation) {
        // If user has not opted in to precise location, show just-in-time consent modal
        const allowPrecise = settings?.location_preferences?.use_current_location !== false;
        if (!allowPrecise) {
          window.dispatchEvent(new Event('open-location-consent'));
          setMessages(prev => prev.filter(m => !m.content.includes("PAM is thinking")));
          addMessage("To give you local weather, please enable location or tell me your city.", "pam");
          return;
        }
        logger.debug('📍 Location-based query detected, requesting location proactively');
        const location = await requestUserLocation();
        
        if (location) {
          currentLocation = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
          locationObj = { latitude: location.latitude, longitude: location.longitude };
          setUserContext(prev => ({
            ...prev,
            current_location: currentLocation
          }));
        }
      }

      // If we still only have a string, try to parse to structured coords
      if (!locationObj && typeof currentLocation === 'string') {
        const parts = currentLocation.split(',').map(s => parseFloat(s.trim()));
        if (parts.length === 2 && parts.every(n => Number.isFinite(n))) {
          locationObj = { latitude: parts[0], longitude: parts[1] };
        }
      }

      // Prepare conversation history for Claude
      const conversationHistory = messages.slice(-5).map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
        timestamp: msg.timestamp
      }));

      // Create location-aware system prompt for weather and location queries
      const locationContext = currentLocation 
        ? `\n\n**Current User Location:**\n- Coordinates: ${currentLocation}\n- Current time: ${new Date().toLocaleString()}\n\n**IMPORTANT: When users ask about weather, use this location to provide current weather conditions and forecasts directly. You have access to real-time weather data - use it to give immediate, helpful weather information.**`
        : '';

      const systemPrompt = `You are PAM (Personal Assistant Manager), an AI assistant for the Wheels & Wins platform - a comprehensive personal finance and travel management app.

**Your Role:**
- Help users manage their finances, track expenses, plan trips, and achieve their goals
- Provide personalized insights based on their data
- Use available tools to access user information and perform actions
- Be conversational, helpful, and proactive
- Provide real-time weather information based on user's location

**Available Data & Tools:**
- User expenses, budgets, income, and financial goals
- Trip history, vehicle data, and fuel consumption
- User profiles, settings, and preferences
- Calendar events and upcoming plans
- User's current location for weather and local information
- Direct access to weather data and forecasts

**Weather & Location Capabilities:**
- When users ask about weather, immediately provide current conditions and forecast
- Use their location context to give relevant local information
- No need to ask for location - it's provided in the system context
- Give detailed, helpful weather insights for travel and daily planning

**Guidelines:**
- Always be helpful and accurate
- Use tools when you need specific user data
- Keep responses concise but informative
- Ask clarifying questions when needed
- Suggest actionable insights when relevant
- For weather queries, be immediate and specific

**Context:** You are integrated into a React application where users can chat with you to get help with their personal finances and travel planning. You have access to their location and can provide weather information directly.${locationContext}`;

      // Ensure user is authenticated for backend API
      if (!user || !session?.access_token) {
        throw new Error('User authentication required');
      }

      // Use WebSocket PAM Service for real-time communication
      logger.debug('🤖 Sending message to PAM WebSocket service');

      const pamResponse = await sendPamMessage(
        message,
        {
          region: userContext?.region,
          current_page: 'pam_chat',
          // Backend tools expect structured location context with latitude/longitude
          location: locationObj || undefined,
          userLocation: locationObj || undefined,
          conversation_history: conversationHistory.slice(-3)
        }
      );

      // Remove thinking indicator and add PAM's response
      setMessages(prev => prev.filter(m => !m.content.includes("PAM is thinking")));

      // Extract response content from various possible response formats
      const responseContent = pamResponse.response || pamResponse.message || pamResponse.content || "I encountered an issue processing your request.";
      addMessage(responseContent, "pam", message);

      // Check if PAM created/updated/deleted a calendar event and trigger refresh
      const calendarKeywords = ['calendar', 'appointment', 'event', 'meeting', 'schedule', 'booked', 'added to your calendar', 'created event'];
      const isCalendarAction = calendarKeywords.some(keyword =>
        responseContent.toLowerCase().includes(keyword) || message.toLowerCase().includes(keyword)
      );

      if (isCalendarAction) {
        logger.debug('📅 Calendar action detected, dispatching reload event');
        window.dispatchEvent(new CustomEvent('reload-calendar'));
      }

      // If voice is enabled, speak the response
      if (settings?.pam_preferences?.voice_enabled) {
        await speakText(responseContent);
      }

      logger.debug('✅ PAM WebSocket response received successfully');

    } catch (error) {
      logger.error('❌ Failed to send message via PAM WebSocket service:', error);
      logger.error('❌ PAM Error Details:', {
        message: error?.message,
        user: !!user,
        hasToken: !!session?.access_token,
        tokenLength: session?.access_token?.length
      });

      setMessages(prev => prev.filter(m => !m.content.includes("PAM is thinking")));
      addMessage(`I encountered an error: ${error?.message || 'Unknown error'}. Please try again or contact support if this continues.`, "pam");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getPersonalizedGreeting = () => {
    if (!userContext) return "Hi! I'm PAM";
    const location = userContext.current_location || "your location";
    const vehicle = userContext.vehicle_info?.type || "vehicle";
    return `Hi! I'm PAM, your travel companion. I see you're in ${location} with your ${vehicle}. Ready for an adventure?`;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle auto-send when triggered by external events
  useEffect(() => {
    if (shouldAutoSend) {
      // Reset the flag first
      setShouldAutoSend(false);
      // Only send if there's actually a message to send
      if (inputMessage.trim()) {
        // Delay to ensure UI updates
        const timer = setTimeout(() => {
          handleSendMessage();
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [shouldAutoSend]); // Removed inputMessage from dependencies to prevent triggering on every character

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      logger.debug('🧹 PAM component unmounting - cleaning up resources...');

      // Clear timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Provider manages the shared WebSocket lifecycle; no direct close here
      // Provider manages shared socket; do not close here

      // Stop all voice-related activities and release microphone
      stopAudioLevelMonitoring();
      stopWakeWordListening();

      // Clean up audio manager
      audioManager.stopAll();
      logger.debug('🎵 Audio manager stats:', audioManager.getStats());

      // Stop any active media recording
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }

      logger.debug('✅ PAM cleanup completed - WebSocket disconnected, microphone released');
    };
  }, []);

  // --- UI ---
  if (mode === "sidebar") {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex items-center justify-between p-4 border-b bg-primary/5">
          <div className="flex items-center space-x-3">
            <img
              src={getPublicAssetUrl('Pam.webp')}
              alt="PAM"
              className="w-8 h-8 rounded-full"
            />
            <div>
              <h3 className="font-semibold text-gray-800">PAM</h3>
              <div className="text-xs text-gray-500 space-y-0.5">
                <p>
                  {connectionStatus === "Connected" ? "🟢 Agentic AI Online" : 
                   connectionStatus === "Connecting" ? "🟡 Connecting..." : "🔴 Offline"}
                </p>
                {isVADActive && (
                  <p className="text-xs">
                    {conversationState.userSpeaking ? "🎤 User Speaking" :
                     conversationState.pamSpeaking ? "🤖 PAM Speaking" :
                     conversationState.waitingForPause ? "⏳ Waiting for Pause" :
                     "👂 Listening for Voice"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 text-sm">
              <p>{getPersonalizedGreeting()}</p>
              <div className="mt-4 space-y-2">
                <button 
                  onClick={() => setInputMessage("What's the weather like today?")}
                  className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20"
                >
                  <MapPin className="w-4 h-4" />
                  🌤️ Get Current Weather
                </button>
                <button 
                  onClick={() => setInputMessage("Plan a trip from Sydney to Hobart")}
                  className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20"
                >
                  <Calendar className="w-4 h-4" />
                  🗺️ Plan a Trip
                </button>
                <button 
                  onClick={() => setInputMessage("Help me analyze my budget")}
                  className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20"
                >
                  <DollarSign className="w-4 h-4" />
                  💰 Budget Analysis
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-lg ${
                  msg.sender === "user" ? "bg-primary text-white" : "bg-gray-100 text-gray-800"
                }`}>
                  <p className={`text-sm ${msg.content === 'PAM is thinking' ? 'animate-pulse text-blue-600' : ''}`}>
                    {msg.content}
                  </p>
                  {/* Streaming indicator */}
                  {msg.isStreaming && (
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full mr-1"></div>
                      <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full mr-1 animation-delay-100"></div>
                      <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full mr-2 animation-delay-200"></div>
                      <span>thinking...</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs opacity-70">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                    {/* Simple feedback buttons for PAM responses */}
                    {msg.sender === "pam" && !msg.isStreaming && (
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleFeedback(msg.id, 1)}
                          className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                            msg.feedback === 1 ? 'text-green-600 bg-green-100' : 'text-gray-400 hover:text-green-600'
                          }`}
                          title="Helpful"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, -1)}
                          className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                            msg.feedback === -1 ? 'text-red-600 bg-red-100' : 'text-gray-400 hover:text-red-600'
                          }`}
                          title="Not helpful"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-3 border-t">
          <AudioLevelMeter />
          
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => {
                console.log('🔍 DEBUG: Input changed from', inputMessage, 'to', e.target.value);
                setInputMessage(e.target.value);
              }}
              onKeyPress={handleKeyPress}
              placeholder="Ask PAM anything..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              disabled={connectionStatus !== "Connected"}
            />
            <button
              onClick={isContinuousMode ? stopContinuousVoiceMode : startContinuousVoiceMode}
              className={`p-2 rounded-lg transition-colors ${
                isContinuousMode ? "bg-blue-600 text-white hover:bg-blue-700" : "text-gray-600 hover:bg-gray-100"
              }`}
              disabled={connectionStatus !== "Connected"}
              title={isContinuousMode ? "Stop voice mode" : "Start voice mode"}
            >
              {isContinuousMode ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || connectionStatus !== "Connected"}
              className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default/floating mode
  return (
    <>
      {/* Floating PAM Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-primary hover:bg-primary/90 text-white rounded-full p-3 shadow-lg transition-all z-50"
        aria-label="Open PAM Chat"
      >
          <div className="relative">
            <img
              src={getPublicAssetUrl('Pam.webp')}
              alt="PAM Assistant"
              className="w-8 h-8 rounded-full"
            />
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
            connectionStatus === "Connected" ? "bg-green-500" : 
            connectionStatus === "Connecting" ? "bg-yellow-500" : "bg-red-500"
          }`} />
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-lg shadow-xl border z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary/5 rounded-t-lg">
            <div className="flex items-center space-x-3">
              <img
                src={getPublicAssetUrl('Pam.webp')}
                alt="PAM"
                className="w-8 h-8 rounded-full"
              />
              <div>
                <h3 className="font-semibold text-gray-800">PAM</h3>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <p>
                    {connectionStatus === "Connected" ? "🟢 Agentic AI Reasoning" : 
                     connectionStatus === "Connecting" ? "🟡 Connecting..." : "🔴 Offline"}
                  </p>
                  {isVADActive && (
                    <p className="text-xs">
                      {conversationState.userSpeaking ? "🎤 User Speaking" :
                       conversationState.pamSpeaking ? "🤖 PAM Speaking" :
                       conversationState.waitingForPause ? "⏳ Waiting for Pause" :
                       "👂 Listening for Voice"}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close PAM Chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm">
                <p className="mb-3">{getPersonalizedGreeting()}</p>
                <p className="text-xs text-gray-500 mb-2">Try asking:</p>
                <div className="space-y-1">
                  <p 
                    onClick={() => setInputMessage("What's the weather like today?")}
                    className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    "What's the weather like today?"
                  </p>
                  <p 
                    onClick={() => setInputMessage("Plan a trip from Sydney to Hobart")}
                    className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    "Plan a trip from Sydney to Hobart"
                  </p>
                  <p 
                    onClick={() => setInputMessage("Help me budget for a 3-week road trip")}
                    className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    "Help me budget for a 3-week road trip"
                  </p>
                  <p 
                    onClick={() => setInputMessage("What can you help me with?")}
                    className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    "What can you help me with?"
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    msg.sender === "user" ? "bg-primary text-white" : "bg-gray-100 text-gray-800"
                  }`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        {/* Format PAM messages for better readability */}
                        {msg.sender === "pam" ? (
                          <div>
                            <div className={`text-sm whitespace-pre-line ${msg.content === 'PAM is thinking' ? 'animate-pulse text-blue-600' : ''}`}>
                              {formatPamMessage(msg.content).content}
                            </div>
                            {/* Show travel summary if available */}
                            {(() => {
                              const summary = extractTravelSummary(msg.content);
                              return summary ? (
                                <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded mt-1 border-l-2 border-blue-300">
                                  {summary}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <p className="text-sm">{msg.content}</p>
                        )}
                        {/* Streaming indicator */}
                        {msg.isStreaming && (
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full mr-1"></div>
                            <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full mr-1 animation-delay-100"></div>
                            <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full mr-2 animation-delay-200"></div>
                            <span>thinking...</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs opacity-70">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                          {/* Simple feedback buttons for PAM responses */}
                          {msg.sender === "pam" && !msg.isStreaming && (
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={() => handleFeedback(msg.id, 1)}
                                className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                  msg.feedback === 1 ? 'text-green-600 bg-green-100' : 'text-gray-400 hover:text-green-600'
                                }`}
                                title="Helpful"
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleFeedback(msg.id, -1)}
                                className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                  msg.feedback === -1 ? 'text-red-600 bg-red-100' : 'text-gray-400 hover:text-red-600'
                                }`}
                                title="Not helpful"
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Phase 5A: TTS Controls for PAM messages */}
                      {msg.sender === "pam" && msg.tts && (
                        <TTSControls ttsData={msg.tts} size="sm" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Input */}
          <div className="p-4 border-t">
            <AudioLevelMeter />
            
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask PAM anything..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                disabled={connectionStatus !== "Connected"}
              />
              <button
                onClick={isContinuousMode ? stopContinuousVoiceMode : startContinuousVoiceMode}
                className={`p-2 rounded-lg transition-colors ${
                  isContinuousMode ? "bg-blue-600 text-white hover:bg-blue-700" : "text-gray-600 hover:bg-gray-100"
                }`}
                disabled={connectionStatus !== "Connected"}
                title={isContinuousMode ? "Stop voice mode" : "Start voice mode"}
              >
                {isContinuousMode ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || connectionStatus !== "Connected"}
                className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {connectionStatus !== "Connected" && (
              <p className="text-xs text-red-500 mt-1">
                {connectionStatus === "Connecting" ? "Connecting to PAM..." : "PAM is offline"}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Main exported component with error boundary
const Pam: React.FC<PamProps> = ({ mode = "floating" }) => {
  // Always render PAM with error boundary
  return (
    <PAMErrorBoundary>
      <PamImplementation mode={mode} />
    </PAMErrorBoundary>
  );
};

export default Pam;
