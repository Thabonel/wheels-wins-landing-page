import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { PAMErrorBoundary } from '@/components/common/PAMErrorBoundary';

// Always enable PAM as a core feature
const pamEnabled = true;

// Regular imports
import { X, Send, Mic, MicOff, VolumeX, MapPin, Calendar, DollarSign, Volume2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { pamUIController } from "@/lib/PamUIController";
import { getWebSocketUrl, apiFetch, authenticatedFetch } from "@/services/api";
import { getPublicAssetUrl } from "@/utils/publicAssets";
import { supabase } from "@/integrations/supabase/client";
import { pamCalendarService } from "@/services/pamCalendarService";
import { pamFeedbackService } from "@/services/pamFeedbackService";
import { pamVoiceService } from "@/lib/voiceService";
import { useUserSettings } from "@/hooks/useUserSettings";
import { vadService, type ConversationState } from "@/services/voiceActivityDetection";
import { audioManager } from "@/utils/audioManager";
import { TTSQueueManager } from "@/utils/ttsQueueManager";
import TTSControls from "@/components/pam/TTSControls";
import { locationService } from "@/services/locationService";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { pamAgenticService } from "@/services/pamAgenticService";
import { VoiceInterface, VoiceInterfaceHandle } from "@/components/voice/VoiceInterface";
import { VoiceErrorBoundary } from "@/components/voice/VoiceErrorBoundary";
import { logger } from '../lib/logger';


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
}

interface PamProps {
  mode?: "floating" | "sidebar" | "modal";
}

// The actual PAM implementation
const PamImplementation: React.FC<PamProps> = ({ mode = "floating" }) => {
  const { user, session } = useAuth();
  const { settings, updateSettings } = useUserSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "processing" | "error">("idle");
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [messages, setMessages] = useState<PamMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"Connected" | "Connecting" | "Disconnected">("Disconnected");
  const [userContext, setUserContext] = useState<any>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const [wakeWordRecognition, setWakeWordRecognition] = useState<any | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [voiceActivationMode, setVoiceActivationMode] = useState<'manual' | 'auto' | 'command'>('manual');
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
  const voiceInterfaceRef = useRef<VoiceInterfaceHandle>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownWelcomeRef = useRef(false);
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStartTimeRef = useRef<number>(0);
  const reconnectAttemptsRef = useRef<number>(0);
  
  const sessionToken = session?.access_token;

  // Set up periodic JWT token refresh to prevent expiry during long sessions
  useEffect(() => {
    if (!pamEnabled || !user?.id) return;
    
    // Clear any existing refresh interval
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
    }
    
    // Set up token refresh every 30 minutes (tokens typically expire in 1 hour)
    tokenRefreshIntervalRef.current = setInterval(async () => {
      logger.debug('🔄 PAM: Refreshing JWT token proactively...');
      
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logger.error('❌ PAM: Failed to refresh token:', error);
        // If refresh fails, try to reconnect which will handle auth properly
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
        connectToBackend();
      } else if (newSession) {
        logger.debug('✅ PAM: Token refreshed successfully');
        
        // If WebSocket is open, send a token update message (if backend supports it)
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'token_refresh',
            token: newSession.access_token
          }));
        }
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    return () => {
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
        tokenRefreshIntervalRef.current = null;
      }
    };
  }, [user?.id, pamEnabled]);
  
  // Load user context and memory when component mounts
  useEffect(() => {
    // Guard: Don't run side effects if PAM is disabled
    if (!pamEnabled) return;
    
    logger.debug('🚀 PAM useEffect triggered with user:', { userId: user?.id, hasUser: !!user, hasSession: !!session });
    
    // Expose test functions to window for debugging (development only)
    if (import.meta.env.DEV) {
      (window as any).testPamConnection = testMinimalConnection;
      
      logger.debug('🧪 PAM DEBUG: Test functions exposed:');
      logger.debug('  - window.testPamConnection() - Original connection test');
    }
    
    if (user?.id) {
      logger.debug('📋 PAM: Loading user context and connecting...');
      
      // Persist session ID for conversation continuity
      localStorage.setItem('pam_session_id', sessionId);
      
      loadUserContext();
      loadConversationMemory();
      connectToBackend();
    } else {
      logger.debug('❌ PAM: No user ID, skipping connection');
    }
    // eslint-disable-next-line
  }, [user?.id, sessionId]);

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
      if (isOpen) {
        setInputMessage(message);
        // Auto-send the message
        setTimeout(() => {
          handleSendMessage();
        }, 100);
      } else {
        // Open PAM and send message
        setIsOpen(true);
        setInputMessage(message);
        setTimeout(() => {
          handleSendMessage();
        }, 200);
      }
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
  }, [isOpen]);

  const loadUserContext = async () => {
    try {
      // Fetch user preferences and context
      const response = await authenticatedFetch('/api/v1/pam/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'What is my current context and preferences?',
          context: {
            user_id: user?.id,
            request_type: 'load_user_context'
          }
        })
      });
      
      let contextData = {};
      if (response.ok) {
        const data = await response.json();
        logger.debug('📋 Loaded user context:', data);
        contextData = data?.context_updates || data?.actions || data;
      }

      // Try to get location on PAM startup
      let locationObtained = false;
      
      // First try: Check if user has location tracking enabled from trip planner
      if (user?.id && locationState?.isTracking) {
        try {
          const userLocation = await locationService.getUserLocation(user.id);
          if (userLocation && userLocation.current_latitude && userLocation.current_longitude) {
            const { current_latitude, current_longitude } = userLocation;
            const locationString = `${current_latitude.toFixed(4)}, ${current_longitude.toFixed(4)}`;
            contextData = {
              ...contextData,
              current_location: locationString,
              location_source: 'trip_planner'
            };
            logger.debug('📍 Added location from trip planner:', locationString);
            locationObtained = true;
          }
        } catch (error) {
          logger.warn('⚠️ Failed to fetch location from trip planner:', error);
        }
      }
      
      // Second try: If no location from trip planner, request fresh location
      if (!locationObtained) {
        logger.debug('📍 No location from trip planner, requesting fresh location for PAM');
        const location = await requestUserLocation();
        if (location) {
          const locationString = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
          contextData = {
            ...contextData,
            current_location: locationString,
            location_source: 'geolocation'
          };
          logger.debug('📍 Got fresh location for PAM:', locationString);
        }
      }

      setUserContext(contextData);
    } catch (error) {
      logger.error('Failed to load user context:', error);
    }
  };

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

  const detectFallbackLocation = async (): Promise<string | null> => {
    try {
      // Try to get rough location from timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      logger.debug('🌍 Detected timezone:', timezone);
      
      // Map common timezones to general locations
      const timezoneLocations: { [key: string]: string } = {
        'America/New_York': 'New York area',
        'America/Los_Angeles': 'Los Angeles area', 
        'America/Chicago': 'Chicago area',
        'America/Denver': 'Denver area',
        'Europe/London': 'London area',
        'Europe/Paris': 'Paris area',
        'Europe/Berlin': 'Berlin area',
        'Asia/Tokyo': 'Tokyo area',
        'Asia/Shanghai': 'Shanghai area',
        'Australia/Sydney': 'Sydney area',
        'Australia/Melbourne': 'Melbourne area'
      };
      
      const approximateLocation = timezoneLocations[timezone];
      if (approximateLocation) {
        logger.debug('🌍 Approximate location detected:', approximateLocation);
        return approximateLocation;
      }
      
      // Extract region from timezone as fallback
      const region = timezone.split('/')[1]?.replace('_', ' ') || timezone;
      logger.debug('🌍 Region fallback:', region);
      return region;
      
    } catch (error) {
      logger.warn('⚠️ Failed to detect fallback location:', error);
      return null;
    }
  };

  const loadConversationMemory = async () => {
    try {
      // ROBUST MEMORY: First try to restore from localStorage
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
      
      // Fallback to backend memory system
      const response = await authenticatedFetch('/api/v1/pam/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'What is my conversation history?',
          context: {
            user_id: user?.id,
            request_type: 'load_conversation_memory'
          }
        })
      });
      if (response.ok) {
        const data = await response.json();
        const memoryMessages = data.memories?.map((m: any) => ({
          id: m.id,
          content: m.content,
          sender: m.topic === 'user_message' ? 'user' : 'pam',
          timestamp: m.created_at,
          context: m.context
        })) || [];
        setMessages(memoryMessages);
        logger.debug('📚 PAM: Loaded conversation from backend:', memoryMessages.length, 'messages');
      }
    } catch (error) {
      logger.error('Failed to load conversation memory:', error);
    }
  };

  const saveToMemory = async (message: string, sender: 'user' | 'pam', context?: any) => {
    try {
      // Use PAM's built-in memory system instead of generic actions endpoint
      // The PAM chat endpoint automatically saves conversation history
      logger.debug('💾 Saving to PAM memory:', { message: message.substring(0, 100), sender, user_id: user?.id });
      
      // PAM automatically saves messages when processing them through the chat endpoint
      // No need for explicit memory saving as it's handled by the agentic orchestrator
      
    } catch (error) {
      logger.error('Failed to save to memory:', error);
    }
  };

  const testRestApiConnection = async () => {
    try {
      logger.debug('🔄 Testing REST API connection...');
      
      // First try the health endpoint (no auth required)
      const healthResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://pam-backend.onrender.com'}/health`);
      if (!healthResponse.ok) {
        throw new Error('Backend health check failed');
      }
      
      logger.debug('✅ Backend health check passed');
      
      // Try PAM chat endpoint with authentication
      const response = await authenticatedFetch('/api/v1/pam/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello PAM, connection test',
          context: {
            user_id: user?.id,
            request_type: 'connection_test'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        logger.debug('✅ REST API connection successful:', data);
        const pamResponse = data.response || data.message || data.content || "Hello! I'm PAM and I'm working properly now!";
        addMessage(pamResponse, "pam");
        setConnectionStatus("Connected");
      } else {
        const errorText = await response.text();
        logger.error('❌ REST API connection failed:', response.status, response.statusText, errorText);
        
        // Try to parse error details
        let errorDetail = 'Unknown error';
        try {
          const errorData = JSON.parse(errorText);
          errorDetail = errorData.message || errorData.detail || errorData.error || 'API error';
        } catch {
          errorDetail = response.statusText || 'Connection failed';
        }
        
        addMessage(`❌ Connection issue: ${errorDetail}. I'm working on reconnecting...`, "pam");
      }
    } catch (error) {
      logger.error('❌ REST API test failed:', error);
      addMessage("❌ Backend services are currently unavailable. Please try again later. In the meantime, I can help you with general travel advice!", "pam");
    }
  };

  const connectToBackend = useCallback(async () => {
    logger.debug('🚀 PAM DEBUG: ==================== CONNECTION START ====================');
    logger.debug('🚀 PAM DEBUG: connectToBackend called');
    logger.debug('🚀 PAM DEBUG: User context:', { 
      userId: user?.id, 
      userEmail: user?.email,
      hasUser: !!user,
      hasSession: !!session, 
      hasToken: !!sessionToken,
      tokenLength: sessionToken?.length || 0
    });
    
    if (!user?.id) {
      logger.error('❌ PAM DEBUG: No user ID available, cannot connect');
      logger.debug('❌ PAM DEBUG: User object:', user);
      logger.debug('❌ PAM DEBUG: Session object:', session);
      return;
    }

    logger.debug('🏥 PAM DEBUG: ==================== HEALTH CHECK ====================');
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://pam-backend.onrender.com';
    logger.debug('🏥 PAM DEBUG: Backend URL:', backendUrl);
    logger.debug('🏥 PAM DEBUG: Health check URL:', `${backendUrl}/health`);
    
    // Health check with enhanced logging
    try {
      const healthStartTime = Date.now();
      logger.debug('🏥 PAM DEBUG: Starting health check at:', new Date().toISOString());
      
      const healthResponse = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      const healthTime = Date.now() - healthStartTime;
      logger.debug('🏥 PAM DEBUG: Health check completed in:', healthTime + 'ms');
      logger.debug('🏥 PAM DEBUG: Health response status:', healthResponse.status);
      logger.debug('🏥 PAM DEBUG: Health response ok:', healthResponse.ok);
      
      if (!healthResponse.ok) {
        logger.warn('⚠️ PAM DEBUG: Backend health check failed');
        logger.warn('⚠️ PAM DEBUG: Response status:', healthResponse.status);
        logger.warn('⚠️ PAM DEBUG: Response statusText:', healthResponse.statusText);
        
        setConnectionStatus("Disconnected");
        addMessage("🤖 Hi! I'm PAM. Backend health check failed. Let me try to establish a connection...", "pam");
        await testRestApiConnection();
        return;
      }
      
      const healthData = await healthResponse.json();
      logger.debug('✅ PAM DEBUG: Health check successful:', healthData);
      
    } catch (error) {
      logger.error('❌ PAM DEBUG: Health check error:', error);
      logger.error('❌ PAM DEBUG: Error type:', error.constructor.name);
      logger.error('❌ PAM DEBUG: Error message:', error.message);
      logger.error('❌ PAM DEBUG: Error stack:', error.stack);
      
      setConnectionStatus("Disconnected");
      addMessage("🤖 Hi! I'm PAM. Backend health check failed, but I can still help using REST API.", "pam");
      return;
    }

    logger.debug('🔧 PAM DEBUG: ==================== WEBSOCKET SETUP ====================');
    
    try {
      // Step 1: Get valid JWT token from Supabase session
      logger.debug('🔧 PAM DEBUG: Getting valid JWT token for WebSocket...');
      
      // Get current session and token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session || !session.access_token) {
        logger.error('❌ PAM DEBUG: Failed to get valid token - no active session');
        setConnectionStatus("Disconnected");
        addMessage(`🤖 Hi! I'm PAM. Authentication failed - no valid session. Please try logging out and back in.`, "pam");
        return;
      }
      
      // Create pamToken object with the expected format
      const pamToken = {
        value: session.access_token,
        kind: 'jwt'
      };
      
      // Check if token is expired or will expire soon (within 5 minutes)
      const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
      
      if (expiresAt && expiresAt < fiveMinutesFromNow) {
        logger.warn('⚠️ PAM DEBUG: Token expired or expiring soon, refreshing session...');
        const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !newSession) {
          logger.error('❌ PAM DEBUG: Failed to refresh session:', refreshError);
          setConnectionStatus("Disconnected");
          addMessage(`🤖 Hi! I'm PAM. Session refresh failed. Please try logging out and back in.`, "pam");
          return;
        }
        
        logger.debug('✅ PAM DEBUG: Session refreshed successfully');
      }
      
      logger.debug('✅ PAM DEBUG: Valid JWT token obtained:', {
        tokenLength: pamToken.value.length,
        tokenPreview: pamToken.value.substring(0, 30) + '...',
        tokenKind: pamToken.kind,
        expiresAt: expiresAt?.toISOString()
      });
      
      // Verify this is actually a JWT (3 parts separated by dots)
      const tokenParts = pamToken.value.split('.');
      if (tokenParts.length !== 3) {
        logger.error('❌ PAM DEBUG: Invalid JWT format - expected 3 parts, got', tokenParts.length);
        setConnectionStatus("Disconnected");
        addMessage("🤖 Hi! I'm PAM. Invalid token format. Please try logging out and back in.", "pam");
        return;
      }
      
      // Step 2: Get WebSocket base URL with user ID
      logger.debug('🔧 PAM DEBUG: Getting WebSocket base URL...');
      // Include user ID in the WebSocket path as backend expects /ws/{user_id}
      const userId = user?.id || 'anonymous';
      const baseWebSocketUrl = getWebSocketUrl(`/api/v1/pam/ws/${userId}`);
      logger.debug('🔧 PAM DEBUG: Base WebSocket URL with user ID:', baseWebSocketUrl);
      
      // Step 3: Create authenticated WebSocket URL
      logger.debug('🔧 PAM DEBUG: Creating authenticated WebSocket URL...');
      // Add token as query parameter for WebSocket authentication
      const wsUrl = `${baseWebSocketUrl}?token=${encodeURIComponent(pamToken.value)}`;
      
      // Step 4: Validate URL format
      logger.debug('✅ PAM DEBUG: URL validation:');
      logger.debug('✅ PAM DEBUG: - Contains endpoint:', wsUrl.includes('/api/v1/pam/ws'));
      logger.debug('✅ PAM DEBUG: - Uses secure protocol:', wsUrl.startsWith('wss://'));
      logger.debug('✅ PAM DEBUG: - Using subprotocol authentication');
      
      if (!wsUrl.includes('/api/v1/pam/ws')) {
        logger.error('❌ PAM DEBUG: URL validation failed!');
        logger.error('❌ PAM DEBUG: Expected /api/v1/pam/ws in URL');
        logger.error('❌ PAM DEBUG: Actual URL:', wsUrl.substring(0, 100) + '...');
        throw new Error('WebSocket endpoint validation failed');
      }
      
      logger.debug('🔄 PAM DEBUG: ==================== WEBSOCKET CONNECTION ====================');
      setConnectionStatus("Connecting");
      logger.debug('🔄 PAM DEBUG: Status set to Connecting');
      logger.debug('🔄 PAM DEBUG: Creating WebSocket with URL:', wsUrl);
      
      connectionStartTimeRef.current = Date.now();
      wsRef.current = new WebSocket(wsUrl);
      
      logger.debug('🔄 PAM DEBUG: WebSocket created, initial readyState:', wsRef.current.readyState);
      logger.debug('🔄 PAM DEBUG: WebSocket URL property:', wsRef.current.url);
      logger.debug('🔄 PAM DEBUG: Connection timestamp:', new Date().toISOString());

      wsRef.current.onopen = (event) => {
        const connectionTime = Date.now() - connectionStartTimeRef.current;
        logger.debug('✅ PAM DEBUG: ==================== CONNECTION SUCCESS ====================');
        logger.debug('✅ PAM DEBUG: WebSocket OPENED successfully!');
        logger.debug('✅ PAM DEBUG: Connection time:', connectionTime + 'ms');
        logger.debug('✅ PAM DEBUG: Event:', event);
        logger.debug('✅ PAM DEBUG: WebSocket readyState:', wsRef.current?.readyState);
        logger.debug('✅ PAM DEBUG: WebSocket URL:', wsRef.current?.url);
        logger.debug('✅ PAM DEBUG: WebSocket protocol:', wsRef.current?.protocol);
        
        setConnectionStatus("Connected");
        setReconnectAttempts(0);
        reconnectAttemptsRef.current = 0;
        
        logger.debug('✅ PAM DEBUG: Connection status updated to Connected');
        logger.debug('✅ PAM DEBUG: WebSocket ready state:', wsRef.current?.readyState);
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        // Send initial context with location on connection
        const initMessage = {
          type: "init",
          context: {
            user_id: user?.id,
            userLocation: userContext?.current_location,
            vehicleInfo: userContext?.vehicle_info,
            travelStyle: userContext?.travel_style,
            session_id: sessionId,
            timestamp: new Date().toISOString()
          }
        };
        
        logger.debug('📍 PAM DEBUG: Sending init message with location:', initMessage);
        wsRef.current.send(JSON.stringify(initMessage));
        
        if (messages.length === 0 && !hasShownWelcomeRef.current) {
          logger.debug('💬 PAM DEBUG: Adding greeting message');
          addMessage("🤖 Hi! I'm PAM, your AI travel companion! How can I help you today?", "pam");
          hasShownWelcomeRef.current = true;
        } else {
          logger.debug('📚 PAM DEBUG: Restoring existing conversation');
        }
      };

      wsRef.current.onmessage = async (event) => {
        logger.debug('📨 PAM DEBUG: Message received:', event.data);
        try {
          const message = JSON.parse(event.data);
          logger.debug('📨 PAM DEBUG: Parsed message:', message);
          logger.debug('📨 PAM DEBUG: Message type:', message.type);
          logger.debug('📨 PAM DEBUG: Message keys:', Object.keys(message));
          logger.debug('📨 PAM DEBUG: Content fields:', {
            content: message.content,
            message: message.message,
            response: message.response,
            text: message.text
          });
          
          // Handle streaming chat responses
          if (message.type === 'chat_response_start') {
            logger.debug('🌊 PAM DEBUG: Streaming response started');
            // Show immediate processing indicator
            addMessage(message.message || "🔍 Processing your request...", "pam", undefined, false, 'normal');
            return;
          }
          
          if (message.type === 'chat_response_delta') {
            logger.debug('🌊 PAM DEBUG: Streaming delta received:', message.content);
            // Update the last PAM message with new content
            setMessages(prev => {
              const lastPamIndex = prev.length - 1;
              if (lastPamIndex >= 0 && prev[lastPamIndex].sender === 'pam') {
                const updated = [...prev];
                updated[lastPamIndex] = {
                  ...updated[lastPamIndex],
                  content: (updated[lastPamIndex].content || '') + message.content,
                  isStreaming: true
                };
                return updated;
              } else {
                // Start new streaming message if no existing PAM message
                return [...prev, {
                  id: Date.now().toString(),
                  content: message.content,
                  sender: "pam",
                  timestamp: new Date().toISOString(),
                  isStreaming: true
                }];
              }
            });
            return;
          }
          
          if (message.type === 'chat_response_complete') {
            logger.debug('🌊 PAM DEBUG: Streaming response completed');
            // Mark the last PAM message as complete
            setMessages(prev => {
              const lastPamIndex = prev.length - 1;
              if (lastPamIndex >= 0 && prev[lastPamIndex].sender === 'pam') {
                const updated = [...prev];
                updated[lastPamIndex] = {
                  ...updated[lastPamIndex],
                  isStreaming: false
                };
                return updated;
              }
              return prev;
            });
            return;
          }

          // Handle traditional chat responses (non-streaming fallback)
          if (message.type === 'chat_response' || message.type === 'response') {
            const content = message.content || message.message || message.response;
            logger.debug('💬 PAM DEBUG: Response received:', { type: message.type, content: content?.substring(0, 100) + '...' });
            
            // Phase 5A: Extract TTS data if present
            const ttsData = message.tts;
            if (ttsData) {
              logger.debug('🎵 TTS data received:', {
                format: ttsData.format,
                engine: ttsData.engine_used,
                voice: ttsData.voice_used,
                size: ttsData.audio_data?.length
              });
            }
            
            if (content && content.trim()) {
              // Phase 5A: Add message with TTS data
              const newMessage = addMessage(content, "pam");
              
              // Phase 5A: Update message with TTS data if available
              if (ttsData) {
                setMessages(prev => {
                  const updated = [...prev];
                  const messageIndex = updated.findIndex(m => m.id === newMessage.id);
                  if (messageIndex >= 0) {
                    updated[messageIndex] = { ...updated[messageIndex], tts: ttsData };
                  }
                  return updated;
                });
              }
              
              // Check if PAM is asking for location and offer to get it automatically
              const locationKeywords = [
                'current location', 'your location', 'where you are', 'share your location',
                'tell me your location', 'location manually', 'provide your location'
              ];
              
              const needsLocation = locationKeywords.some(keyword => 
                content.toLowerCase().includes(keyword)
              );
              
              if (needsLocation && !userContext?.current_location) {
                logger.debug('📍 PAM is asking for location, offering automatic request');
                
                // Add a helpful message with location request button
                setTimeout(() => {
                  addMessage(
                    "I can automatically get your current location if you'd like. Would you like me to request access to your location?",
                    "pam"
                  );
                  
                  // Auto-request location after a brief delay
                  setTimeout(async () => {
                    logger.debug('📍 Auto-requesting location for better assistance');
                    const location = await requestUserLocation();
                    
                    if (location) {
                      // Re-send the original user message with updated location context
                      const lastUserMessage = messages[messages.length - 1];
                      if (lastUserMessage && lastUserMessage.sender === 'user') {
                        const messageData = {
                          type: "chat",
                          message: lastUserMessage.content,
                          context: {
                            user_id: user?.id,
                            userLocation: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
                            vehicleInfo: userContext?.vehicle_info,
                            travelStyle: userContext?.travel_style,
                            conversation_history: messages.slice(-5).map(msg => ({
                              role: msg.sender === "user" ? "user" : "assistant",
                              content: msg.content
                            })),
                            timestamp: new Date().toISOString(),
                            session_id: sessionId,
                            location_updated: true
                          }
                        };
                        
                        if (wsRef.current?.readyState === WebSocket.OPEN) {
                          wsRef.current.send(JSON.stringify(messageData));
                          addMessage("🔄 Re-processing your request with your current location...", "pam");
                        }
                      }
                    }
                  }, 2000); // 2 second delay to allow user to read the message
                }, 500); // Short delay for better UX
              } else {
                addMessage(content, "pam");
              }
            } else {
              logger.warn('⚠️ Empty content in response:', message);
              addMessage("I received your message but couldn't generate a proper response.", "pam");
            }
            
            // Display agentic capabilities information
            if (message.agentic_info) {
              displayAgenticInfo(message.agentic_info);
            }
            
            // Show thinking process if available
            if (message.thinking_process) {
              displayThinkingProcess(message.thinking_process);
            }
            
            // Handle autonomous actions
            if (message.autonomous_actions) {
              handleAutonomousActions(message.autonomous_actions);
            }
          }
          
          // Handle UI action commands
          if (message.type === 'ui_action') {
            logger.debug('🎛️ PAM DEBUG: UI action received:', message);
            handleUIAction(message);
          }
          
          // Handle welcome messages
          if (message.type === 'welcome') {
            logger.debug('👋 PAM DEBUG: Welcome message received:', message.message);
          }
          
          // Handle ping/pong for connection health
          if (message.type === 'ping') {
            logger.debug('🏓 PAM DEBUG: Ping received, sending pong');
            wsRef.current?.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
          
          // Handle voice/STT responses - Phase 5B/5C
          if (message.type === 'stt_result') {
            logger.debug('🎤 STT result received:', message);
            voiceInterfaceRef.current?.updateTranscript(message.text);
            voiceInterfaceRef.current?.updateStatus('success');
          }
          
          if (message.type === 'stt_instruction') {
            logger.debug('🎤 STT instruction received:', message);
            if (message.instruction === 'use_browser_stt') {
              voiceInterfaceRef.current?.updateStatus('processing');
              // Browser STT would be handled client-side
            }
          }
          
          if (message.type === 'stt_capabilities') {
            logger.debug('🎤 STT capabilities received:', message);
            // Store capabilities for voice interface if needed
          }
          
          // Fallback: Display any message with content that we haven't handled
          if (!['chat_response', 'response', 'ui_action', 'welcome', 'ping', 'pong', 'stt_result', 'stt_instruction', 'stt_capabilities'].includes(message.type)) {
            const fallbackContent = message.content || message.message || message.response || message.text;
            if (fallbackContent && typeof fallbackContent === 'string' && fallbackContent.trim()) {
              logger.debug('🔄 PAM DEBUG: Displaying fallback message:', { type: message.type, content: fallbackContent });
              addMessage(fallbackContent, "pam");
            }
          }
          
        } catch (error) {
          logger.error('❌ PAM DEBUG: Error parsing message:', error);
          logger.error('❌ PAM DEBUG: Raw message data:', event.data);
          
          // Try to display raw message if JSON parsing fails
          if (typeof event.data === 'string' && event.data.trim()) {
            addMessage(`📨 Received: ${event.data}`, "pam");
          }
        }
      };

      wsRef.current.onclose = (event) => {
        wsRef.current = null;
        setConnectionStatus("Disconnected");
        
        // Check if this is an auth failure
        const connectionDuration = Date.now() - connectionStartTimeRef.current;
        if (event.code === 1008 || event.code === 401 || connectionDuration < 1000) {
          addMessage("Session expired. Please sign in again.", "pam");
          reconnectAttemptsRef.current = 0;
          return;
        }
        
        // Schedule reconnect with backoff if PAM is enabled
        if (pamEnabled && reconnectAttemptsRef.current < 4) {
          const delays = [500, 2000, 5000, 10000];
          const delay = delays[Math.min(reconnectAttemptsRef.current, delays.length - 1)];
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectToBackend();
          }, delay);
          return;
        };
        
        logger.debug('🔌 PAM DEBUG: Close code meaning:', closeCodeMeanings[event.code] || 'Unknown');
        
        setConnectionStatus("Disconnected");
        
        // Save conversation state
        try {
          localStorage.setItem(`pam_conversation_${user?.id}`, JSON.stringify({
            messages: messages.slice(-10),
            sessionId: sessionId,
            timestamp: new Date().toISOString()
          }));
          logger.debug('💾 PAM DEBUG: Conversation state saved');
        } catch (error) {
          logger.warn('⚠️ PAM DEBUG: Could not save conversation state:', error);
        }
        
        // Enhanced reconnection logic with JWT authentication error handling
        const authFailureCodes = [1008, 3000, 4000, 4001, 4401, 4403];
        const isAuthError = authFailureCodes.includes(event.code) || 
                           event.reason?.toLowerCase().includes('auth') ||
                           event.reason?.toLowerCase().includes('token');
        
        if (isAuthError) {
          logger.error('🔐 PAM DEBUG: Authentication error detected, attempting to refresh session');
          
          // Try to refresh the JWT token (wrapped in async function)
          (async () => {
            const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError || !session) {
              logger.error('🔐 PAM DEBUG: Session refresh failed:', refreshError);
              setConnectionStatus("Disconnected");
              addMessage("🔖 Your session has expired. Please sign out and sign back in to continue.", "pam");
              setReconnectAttempts(0);
              return;
            }
            
            logger.debug('✅ PAM DEBUG: Session refreshed successfully');
            
            // Retry connection with fresh token after a short delay
            if (reconnectAttempts < 3) {
              const delay = 1000 * (reconnectAttempts + 1);
              logger.debug(`🔄 PAM DEBUG: Retrying with new token in ${delay}ms`);
              
              reconnectTimeoutRef.current = setTimeout(() => {
                setReconnectAttempts(prev => prev + 1);
                connectToBackend();
              }, delay);
            } else {
              logger.error('🔐 PAM DEBUG: Max auth retry attempts reached');
              addMessage("🤖 I'm having trouble authenticating. Please refresh the page.", "pam");
            }
          })();
          return;
        }
        
        // Normal disconnection handling with exponential backoff
        if (event.code !== 1000 && event.code !== 1001) { // 1000 = Normal, 1001 = Going Away
          if (reconnectAttempts < 5) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
            logger.debug(`🔄 PAM DEBUG: Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/5)`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              logger.debug('🔄 PAM DEBUG: Executing standard reconnect attempt');
              setReconnectAttempts(prev => prev + 1);
              connectToBackend();
            }, delay);
          } else {
            logger.debug('🔄 PAM DEBUG: Max reconnection attempts reached');
            setConnectionStatus("Disconnected");
            addMessage("🤖 I'm having trouble connecting. Please try refreshing the page.", "pam");
          }
        } else {
          logger.debug('✅ PAM DEBUG: WebSocket closed normally');
        }
      };

      wsRef.current.onerror = (error) => {
        logger.error('❌ PAM DEBUG: ==================== CONNECTION ERROR ====================');
        logger.error('❌ PAM DEBUG: WebSocket error occurred');
        logger.error('❌ PAM DEBUG: Error event:', error);
        logger.error('❌ PAM DEBUG: Error type:', error.type);
        logger.error('❌ PAM DEBUG: WebSocket readyState:', wsRef.current?.readyState);
        logger.error('❌ PAM DEBUG: WebSocket URL:', wsRef.current?.url);
        
        setConnectionStatus("Disconnected");
      };
    } catch (error) {
      logger.error('❌ PAM DEBUG: ==================== SETUP ERROR ====================');
      logger.error('❌ PAM DEBUG: WebSocket setup failed');
      logger.error('❌ PAM DEBUG: Error type:', error.constructor.name);
      logger.error('❌ PAM DEBUG: Error message:', error.message);
      logger.error('❌ PAM DEBUG: Error stack:', error.stack);
      logger.error('❌ PAM DEBUG: Full error:', error);
      
      setConnectionStatus("Disconnected");
      addMessage("🤖 Hi! I'm PAM. I encountered an error setting up the WebSocket connection. I'll try to help you using the REST API instead.", "pam");
    }
  }, [user?.id, sessionToken]);

  // Minimal test function for debugging WebSocket connection
  const testMinimalConnection = useCallback(async () => {
    logger.debug('🧪 PAM MINIMAL TEST: ==================== STARTING ====================');
    
    // Test 1: Basic environment variables
    logger.debug('🧪 TEST 1: Environment Variables');
    logger.debug('- VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
    logger.debug('- VITE_PAM_WEBSOCKET_URL:', import.meta.env.VITE_PAM_WEBSOCKET_URL);
    
    // Test 2: User context
    logger.debug('🧪 TEST 2: User Context');
    logger.debug('- User ID:', user?.id);
    logger.debug('- Has session:', !!session);
    
    // Test 3: URL construction
    logger.debug('🧪 TEST 3: URL Construction');
    const testUserId = user?.id || 'test_user';
    const testUrl = getWebSocketUrl(`/api/v1/pam/ws/${testUserId}`);
    logger.debug('- getWebSocketUrl result:', testUrl);
    
    // Test 4: Cookie auth check
    logger.debug('🧪 TEST 4: Cookie Auth Check');
    logger.debug('- Using cookie-based authentication');
    
    // Test 5: Final URL
    logger.debug('🧪 TEST 5: Final URL');
    const finalUrl = testUrl; // No token in URL - using cookies
    logger.debug('- Final WebSocket URL (no token):', finalUrl);
    
    // Test 6: WebSocket creation (minimal)
    logger.debug('🧪 TEST 6: WebSocket Creation');
    try {
      const testWs = new WebSocket(finalUrl);
      logger.debug('- WebSocket created successfully');
      logger.debug('- Initial readyState:', testWs.readyState);
      logger.debug('- URL property:', testWs.url);
      
      // Set up basic event handlers for testing
      testWs.onopen = (event) => {
        logger.debug('🧪 TEST SUCCESS: WebSocket opened!', event);
        testWs.close(1000, 'Test completed');
      };
      
      testWs.onerror = (error) => {
        logger.error('🧪 TEST ERROR: WebSocket error:', error);
      };
      
      testWs.onclose = (event) => {
        logger.debug('🧪 TEST CLOSE: WebSocket closed:', event.code, event.reason);
      };
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (testWs.readyState !== WebSocket.OPEN) {
          logger.debug('🧪 TEST TIMEOUT: Connection did not open within 10 seconds');
          logger.debug('🧪 TEST TIMEOUT: Final readyState:', testWs.readyState);
          testWs.close();
        }
      }, 10000);
      
    } catch (error) {
      logger.error('🧪 TEST FAILED: Could not create WebSocket:', error);
    }
    
    logger.debug('🧪 PAM MINIMAL TEST: ==================== COMPLETED ====================');
  }, [user?.id, session]);

  const displayAgenticInfo = (agenticInfo: any) => {
    logger.debug('🧠 Agentic capabilities displayed:', agenticInfo);
    const infoMessage = `🧠 **Agentic Analysis Active**\n\n${agenticInfo.capabilities?.join('\n• ') || 'Advanced AI reasoning engaged'}`;
    addMessage(infoMessage, "pam");
  };

  // Voice Interface Handlers - Phase 5C
  const handleVoiceAudioSend = useCallback(async (audioBlob: Blob, autoSend = false) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    // Convert blob to base64
    const reader = new FileReader();
    return new Promise<void>((resolve, reject) => {
      reader.onload = () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const voiceMessage = {
          type: 'voice',
          audio_data: base64Data,
          format: 'webm',
          language: 'en',
          auto_send: autoSend,
          context: {
            user_id: user?.id,
            session_id: sessionId,
            timestamp: new Date().toISOString()
          }
        };
        
        wsRef.current?.send(JSON.stringify(voiceMessage));
        logger.debug('🎤 Voice message sent via WebSocket');
        resolve();
      };
      
      reader.onerror = () => reject(new Error('Failed to read audio blob'));
      reader.readAsDataURL(audioBlob);
    });
  }, [user?.id, sessionId]);

  const handleVoiceTextSend = useCallback((text: string) => {
    setInputMessage(text);
    // Trigger send message after setting input
    setTimeout(() => handleSendMessage(), 0);
  }, []);

  const handleTTSRequest = useCallback(async (text: string): Promise<Blob | null> => {
    try {
      const response = await authenticatedFetch('/api/v1/pam/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice: voiceSettings.voice,
          rate: voiceSettings.rate,
          pitch: voiceSettings.pitch,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        return blob;
      } else {
        logger.error('TTS request failed:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      logger.error('TTS request error:', error);
      return null;
    }
  }, [voiceSettings]);

  const displayThinkingProcess = (thinkingProcess: any) => {
    logger.debug('💭 Thinking process:', thinkingProcess);
    const thinkingMessage = `💭 **PAM's Thinking Process**\n\n${thinkingProcess.process?.join('\n') || 'Processing complex request...'}`;
    addMessage(thinkingMessage, "pam");
  };

  const handleAutonomousActions = (autonomousActions: any[]) => {
    logger.debug('🚀 Autonomous actions triggered:', autonomousActions);
    autonomousActions.forEach((action, index) => {
      setTimeout(() => {
        const actionMessage = `🚀 **Autonomous Action ${index + 1}**: ${action.description || action.action}\n${action.result || 'Action completed successfully'}`;
        addMessage(actionMessage, "pam");
      }, index * 1000); // Stagger actions for visual effect
    });
  };

  const handleUIAction = (message: any) => {
    try {
      const { action, payload } = message;
      
      // Add visual feedback with animation
      pamUIController.showToast(`PAM is performing: ${action}`, 'default');
      
      switch (action) {
        case 'navigate':
          // Highlight navigation action
          if (payload.elementId) {
            pamUIController.highlightElement(payload.elementId, 2000);
          }
          
          // Navigate with smooth transition
          setTimeout(() => {
            pamUIController.navigateToPage(payload.page, payload.params);
          }, 500);
          break;
          
        case 'fill_form':
          // Highlight form before filling
          if (payload.formId) {
            pamUIController.highlightElement(payload.formId, 3000);
          }
          
          // Fill form with delay for visual feedback
          setTimeout(() => {
            pamUIController.fillForm(payload.formId, payload.data);
            pamUIController.showToast('Form filled successfully!');
          }, 1000);
          break;
          
        case 'highlight':
          pamUIController.highlightElement(payload.elementId, payload.duration || 3000);
          break;
          
        case 'toast':
          pamUIController.showToast(payload.message, payload.variant);
          break;
          
        default:
          logger.warn('Unknown UI action:', action);
      }
      
      // Add message about the action
      addMessage(`🔧 ${action.replace('_', ' ')} action completed`, "pam");
      
    } catch (error) {
      logger.error('Error handling UI action:', error);
      pamUIController.showToast('Failed to perform UI action', 'destructive');
    }
  };

  // Don't auto-initialize wake word detection - only when user explicitly enables it
  // Removed auto-initialization to prevent unwanted microphone access

  const requestMicrophonePermission = async (keepStream: boolean = false): Promise<MediaStream | boolean> => {
    try {
      // Request microphone with explicit constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      logger.debug('🎤 Requesting microphone with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      logger.debug('✅ Microphone access granted');
      
      if (keepStream) {
        // Return the stream for use
        return stream;
      } else {
        // Just checking permission - stop the stream
        stream.getTracks().forEach(track => track.stop());
        return true;
      }
    } catch (error: any) {
      logger.error('⚠️ Microphone access failed:', {
        name: error.name,
        message: error.message,
        constraint: error.constraint,
        toString: error.toString()
      });
      
      // Provide specific error messages based on the error type
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        // More specific guidance for permission issues
        const isHttps = window.location.protocol === 'https:';
        if (!isHttps) {
          addMessage("🚫 Microphone access requires HTTPS. This site is not using HTTPS.", "pam");
        } else {
          addMessage("🚫 Microphone access was blocked. Please: 1) Click the lock icon in your address bar, 2) Set Microphone to 'Allow', 3) Refresh the page.", "pam");
        }
      } else if (error.name === 'NotFoundError') {
        addMessage("🚫 No microphone found. Please connect a microphone and try again.", "pam");
      } else if (error.name === 'NotReadableError') {
        addMessage("🚫 Microphone is in use by another application. Please close other apps using the microphone.", "pam");
      } else if (error.name === 'AbortError') {
        addMessage("🚫 Microphone access was aborted. Please try again.", "pam");
      } else if (error.name === 'OverconstrainedError') {
        addMessage("🚫 Microphone constraints cannot be satisfied. Please try a different microphone.", "pam");
      } else {
        addMessage(`🚫 Microphone error: ${error.name || 'Unknown'}. Please check your browser settings.`, "pam");
      }
      return false;
    }
  };

  const initializeWakeWordDetection = async () => {
    try {
      // Check if SpeechRecognition is available
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        logger.warn('⚠️ SpeechRecognition not supported in this browser');
        return;
      }

      // Don't automatically request microphone permission - wait for user action
      logger.debug('🎙️ Wake word detection available, waiting for user to enable...');

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const latest = event.results[event.results.length - 1];
        const transcript = latest[0].transcript.toLowerCase().trim();
        
        // Use current ref values instead of stale state
        const currentIsWakeWordListening = isWakeWordListeningRef.current;
        const currentIsContinuousMode = isContinuousModeRef.current;
        
        logger.debug('🎙️ Speech detected:', {
          transcript: transcript,
          isFinal: latest.isFinal,
          confidence: latest[0].confidence,
          isWakeWordListening: currentIsWakeWordListening,
          isContinuousMode: currentIsContinuousMode
        });
        
        if (latest.isFinal) {
          logger.debug('🎙️ Final speech result:', transcript);
          
          // Check for wake word patterns and process the entire message
          if (transcript.includes('hi pam') || transcript.includes('hey pam') || 
              transcript.includes('hello pam') || transcript.includes('hi palm') ||
              transcript.includes('hi bam') || transcript.includes('hey bam')) {
            logger.debug('✅ Wake word detected - activating PAM!');
            handleWakeWordDetected();
            
            // If there's more after the wake word, process it as a question
            const wakeWordPattern = /(hi|hey|hello)\s+(pam|palm|bam)\s+/i;
            const questionAfterWakeWord = transcript.replace(wakeWordPattern, '').trim();
            
            if (questionAfterWakeWord.length > 0 && currentIsContinuousMode) {
              logger.debug('🎯 Processing question after wake word:', questionAfterWakeWord);
              // Small delay to ensure PAM is open first
              setTimeout(() => {
                handleContinuousConversation(questionAfterWakeWord);
              }, 100);
            }
          }
          // Check for "PAM" followed by question (continuous conversation) - including "bam"
          else if (currentIsContinuousMode && (
            transcript.startsWith('pam ') || transcript.startsWith('palm ') || transcript.startsWith('bam ') ||
            transcript.includes(' pam ') || transcript.includes(' palm ') || transcript.includes(' bam ')
          )) {
            logger.debug('✅ PAM conversation detected in continuous mode!');
            handleContinuousConversation(transcript);
          }
          // Log when no match is found for debugging
          else {
            logger.debug('🔍 Speech detected but no wake word match:', transcript);
          }
        }
      };

      recognition.onstart = () => {
        logger.debug('🎤 Speech recognition started successfully');
      };

      recognition.onerror = (event) => {
        logger.error('⚠️ Speech recognition error:', {
          error: event.error,
          message: event.message,
          isWakeWordListening: isWakeWordListening,
          isContinuousMode: isContinuousMode
        });
        
        if (event.error === 'not-allowed') {
          logger.warn('⚠️ Microphone permission denied for speech recognition');
          addMessage("🚫 Microphone permission denied. Please allow microphone access for voice features.", "pam");
        } else if (event.error === 'no-speech') {
          logger.debug('🔇 No speech detected, will restart automatically');
        } else if (event.error === 'audio-capture') {
          logger.warn('⚠️ Audio capture error - check microphone');
          addMessage("🎤 Microphone error. Please check your audio device.", "pam");
        } else if (event.error === 'network') {
          logger.warn('⚠️ Network error in speech recognition');
          addMessage("🌐 Network error during speech recognition.", "pam");
        }
      };

      recognition.onend = () => {
        // Use current ref values for restart logic
        const currentIsWakeWordListening = isWakeWordListeningRef.current;
        const currentIsContinuousMode = isContinuousModeRef.current;
        const currentIsListening = isListeningRef.current;
        
        logger.debug('🔚 Speech recognition ended, checking restart conditions:', {
          isWakeWordListening: currentIsWakeWordListening,
          isContinuousMode: currentIsContinuousMode,
          isListening: currentIsListening
        });
        
        // Restart if wake word OR continuous mode is active AND not doing voice recording
        if ((currentIsWakeWordListening || currentIsContinuousMode) && !currentIsListening) {
          setTimeout(() => {
            try {
              recognition.start();
              logger.debug('🔄 Restarting speech recognition...');
            } catch (error) {
              logger.warn('⚠️ Could not restart speech recognition:', error);
            }
          }, 100);
        }
      };

      setWakeWordRecognition(recognition);
      
      // Don't auto-start wake word detection - only start when user clicks continuous button
      // Remove automatic startup based on localStorage
      logger.debug('✅ Wake word detection initialized, but not started. User must click Continuous button to activate.');
    } catch (error) {
      logger.warn('⚠️ Could not initialize wake word detection:', error);
    }
  };

  const startWakeWordListening = async (recognition?: any) => {
    // Request microphone permission first
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      logger.warn('⚠️ Cannot start wake word detection without microphone permission');
      // Error message already shown by requestMicrophonePermission
      return;
    }

    const recognizer = recognition || wakeWordRecognition;
    if (!recognizer) {
      // Initialize if not already done
      await initializeWakeWordDetection();
      return;
    }

    try {
      recognizer.start();
      setIsWakeWordListening(true);
      localStorage.setItem('pam_wake_word_enabled', 'true');
      logger.debug('👂 Wake word detection started - say "Hi PAM" to activate');
      addMessage("👂 Wake word detection enabled. Say 'Hi PAM' to activate voice chat.", "pam");
    } catch (error) {
      logger.warn('⚠️ Could not start wake word detection:', error);
      addMessage("❌ Could not start wake word detection. Please try again.", "pam");
    }
  };

  const stopWakeWordListening = () => {
    if (wakeWordRecognition) {
      wakeWordRecognition.stop();
      setIsWakeWordListening(false);
      localStorage.setItem('pam_wake_word_enabled', 'false');
      logger.debug('🔇 Wake word detection stopped');
    }
  };

  const handleWakeWordDetected = () => {
    // Open PAM if not already open
    if (!isOpen) {
      setIsOpen(true);
      logger.debug('📱 PAM opened by wake word');
    }
    
    // Don't automatically start continuous mode when wake word detected
    // The user should explicitly choose to start continuous mode via the button
    logger.debug('👂 Wake word "PAM" detected - PAM is now open and ready');
  };

  const handleContinuousConversation = async (transcript: string) => {
    logger.debug('🎙️ Processing continuous conversation transcript:', transcript);
    
    // If the transcript is already cleaned (passed from wake word detection), use it as-is
    // Otherwise, extract the actual question after "PAM/BAM" and clean it up
    let question = transcript;
    if (transcript.match(/\b(pam|palm|bam)\b/i)) {
      question = transcript.replace(/^.*?\b(pam|palm|bam)\s+/i, '').trim();
    }
    
    logger.debug('🎯 Extracted question:', question);
    
    if (question.length > 0) {
      // Set the input message and send it
      logger.debug('🚀 Sending voice question to PAM...');
      setInputMessage(question);
      
      // Use a small delay to ensure state update before sending
      setTimeout(() => {
        handleSendMessage();
      }, 50);
    } else {
      logger.debug('⚠️ No question extracted from transcript after wake word');
    }
  };

  // Add a new handler for direct speech input (without wake word in continuous mode)
  const handleDirectSpeechInput = async (transcript: string) => {
    logger.debug('🎙️ Processing direct speech input:', transcript);
    
    if (transcript.trim().length > 0) {
      // Set the input message and send it
      logger.debug('🚀 Processing speech input through text chat...');
      setInputMessage(transcript);
      
      // Use a small delay to ensure state update before sending
      setTimeout(() => {
        handleSendMessage();
      }, 50);
    }
  };

  // Voice settings handlers removed - using default settings

  const startContinuousVoiceMode = async () => {
    logger.debug('🔄 Starting continuous voice mode');
    
    // Request microphone permission and get the stream
    const permissionResult = await requestMicrophonePermission(true);
    if (!permissionResult || typeof permissionResult === 'boolean') {
      logger.warn('⚠️ Cannot start continuous mode without microphone permission');
      // Error message already shown by requestMicrophonePermission
      return;
    }

    // permissionResult is now the MediaStream
    const stream = permissionResult as MediaStream;
    
    setIsContinuousMode(true);
    setVoiceStatus("listening");
    
    // Setup audio level monitoring for continuous mode
    try {
      await setupAudioLevelMonitoring(stream);
      
      // Try to initialize VAD with the same stream (optional - continuous mode works without it)
      try {
        await vadService.initialize(stream);
        setIsVADActive(true);
        logger.debug('✅ VAD initialized for continuous mode - advanced conversation management enabled');
      } catch (vadError) {
        logger.warn('⚠️ VAD initialization failed, continuing without advanced conversation management:', vadError);
        logger.debug('ℹ️ Continuous mode will work normally, but without sophisticated turn-taking');
        setIsVADActive(false);
      }
      
      // Keep the stream open for audio level monitoring
      // Store stream reference for cleanup later
      audioStreamRef.current = stream;
    } catch (error) {
      logger.warn('⚠️ Could not start audio level monitoring for continuous mode:', error);
      addMessage("❌ Could not access microphone for continuous mode. Please check permissions.", "pam");
      setIsContinuousMode(false);
      setVoiceStatus("idle");
      return;
    }
    
    // Initialize speech recognition for continuous mode
    if (!wakeWordRecognition) {
      await initializeWakeWordDetection();
    }
    
    // Start wake word listening for continuous mode
    await startWakeWordListening();
    
    addMessage("Hi, how can I help you?", "pam");
  };

  const stopContinuousVoiceMode = async () => {
    logger.debug('🔇 Stopping continuous voice mode');
    setIsContinuousMode(false);
    setVoiceStatus("idle");
    
    // Stop audio level monitoring and release microphone
    stopAudioLevelMonitoring();
    
    // Stop VAD
    await vadService.cleanup();
    setIsVADActive(false);
    logger.debug('🔇 VAD stopped and cleaned up');
    
    // Stop wake word listening when continuous mode is turned off
    stopWakeWordListening();
    
    addMessage("🔇 Continuous voice mode deactivated. Microphone access has been released.", "pam");
  };

  // Removed duplicate handleTextMessage function - now using handleSendMessage for all message sending

  const handleVoiceToggle = async () => {
    try {
      // If in continuous mode, just toggle it off
      if (isContinuousMode) {
        stopContinuousVoiceMode();
        return;
      }

      if (!isListening) {
        // Request microphone permission first
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
          logger.warn('⚠️ Cannot start voice recording without microphone permission');
          addMessage("🚫 Microphone permission needed for voice recording. Please allow microphone access.", "pam");
          return;
        }
        // Stop speech recognition while recording to avoid conflicts
        if (wakeWordRecognition) {
          try {
            wakeWordRecognition.stop();
            logger.debug('🔇 Stopped speech recognition for voice recording');
          } catch (error) {
            logger.warn('⚠️ Could not stop speech recognition:', error);
          }
        }
        
        // Start recording
        setVoiceStatus("listening");
        logger.debug('🎤 Requesting microphone access...');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
        });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        recorder.onstop = async () => {
          logger.debug('🛑 Recording stopped, processing audio...');
          setVoiceStatus("processing");
          
          const audioBlob = new Blob(chunks, { type: recorder.mimeType });
          logger.debug('📦 Audio blob created:', audioBlob.size, 'bytes');
          
          await handleVoiceSubmission(audioBlob);
          
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => {
            track.stop();
            logger.debug('🔌 Audio track stopped');
          });
          
          // Stop audio level monitoring
          stopAudioLevelMonitoring();
          
          setVoiceStatus("idle");
        };

        recorder.onerror = (event) => {
          logger.error('❌ MediaRecorder error:', event);
          setVoiceStatus("error");
          addMessage("Recording error occurred. Please try again.", "pam");
        };

        recorder.start();
        setMediaRecorder(recorder);
        setAudioChunks(chunks);
        setIsListening(true);
        
        // Setup audio level monitoring
        await setupAudioLevelMonitoring(stream);
        
        logger.debug('🎤 Started voice recording');
        addMessage("🟢 Recording... Click the green microphone to stop recording.", "pam");
        
        // Auto-stop after 30 seconds to prevent infinite recording
        setTimeout(() => {
          if (isListening && recorder.state === 'recording') {
            logger.debug('⏰ Auto-stopping recording after 30 seconds');
            recorder.stop();
            setIsListening(false);
          }
        }, 30000);
        
      } else {
        // Stop recording
        logger.debug('🛑 Stopping voice recording...');
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsListening(false);
        }
        // Stop audio level monitoring
        stopAudioLevelMonitoring();
      }
    } catch (error) {
      logger.error('❌ Voice recording error:', error);
      setVoiceStatus("error");
      setIsListening(false);
      
      if (error.name === 'NotAllowedError') {
        addMessage("🚫 Microphone access denied. Please allow microphone permissions and try again.", "pam");
      } else if (error.name === 'NotFoundError') {
        addMessage("🎤 No microphone found. Please check your audio devices.", "pam");
      } else {
        addMessage(`Voice recording error: ${error.message}. Please try again.`, "pam");
      }
    }
  };

  const handleVoiceSubmission = async (audioBlob: Blob) => {
    try {
      logger.debug('🎤 Processing voice message...', `${audioBlob.size} bytes`);
      setIsProcessingVoice(true);
      
      // Remove the temporary processing message and add a better one
      const processingMessage = addMessage("🎤 Processing your voice message...", "pam");

      const formData = new FormData();
      formData.append('audio', audioBlob, `recording.${audioBlob.type.includes('webm') ? 'webm' : 'mp4'}`);

      logger.debug('📤 Sending audio to backend via /api/v1/pam/voice...');
      logger.debug('📦 FormData contains:', formData.get('audio'));
      
      const response = await authenticatedFetch('/api/v1/pam/voice', {
        method: 'POST',
        body: formData
      });
      
      logger.debug('📥 Voice API response status:', response.status, response.statusText);

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        logger.debug('📥 Response received, content-type:', contentType);
        
        if (contentType && contentType.startsWith('audio/')) {
          // Backend returned audio - play it
          const audioBuffer = await response.arrayBuffer();
          const responseAudioBlob = new Blob([audioBuffer], { type: contentType });
          const audioUrl = URL.createObjectURL(responseAudioBlob);
          const audio = audioManager.getAudio(audioUrl);
          
          // Get transcription and response text from headers
          const transcription = response.headers.get('X-Transcription') || '';
          const responseText = response.headers.get('X-Response-Text') || 'PAM responded with audio';
          const pipeline = response.headers.get('X-Pipeline') || 'STT→LLM→TTS';
          
          logger.debug(`✅ Voice response received via ${pipeline}`);
          logger.debug('📝 Transcription:', transcription);
          logger.debug('🤖 Response:', responseText);
          
          // Remove processing message
          setMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
          
          // Show transcription and response
          if (transcription && transcription.trim()) {
            addMessage(transcription, "user");
          }
          // Don't trigger TTS since we already have audio
          addMessage(`${responseText} 🔊`, "pam", undefined, false);
          
          // CONTROLLED AUDIO PLAYBACK: Only play if user has voice enabled and expects it
          // Check if this is a continuous conversation mode response that should auto-play
          const shouldAutoPlay = isContinuousMode && (settings?.pam_preferences?.voice_enabled ?? false);
          
          if (shouldAutoPlay) {
            // Wait for natural conversation pause before speaking (preserves VAD intelligence)
            vadService.waitForPause(2000).then(() => {
              if (vadService.canPAMSpeak()) {
                logger.debug('🔊 Playing audio response in continuous mode...');
                audio.oncanplaythrough = () => {
                  audio.play().catch(err => {
                    logger.warn('⚠️ Could not play audio:', err);
                    addMessage("(Audio response ready but playback failed)", "pam");
                  });
                };
                vadService.setPAMSpeaking(true);
              } else {
                logger.debug('🔇 VAD determined not appropriate time to speak - audio ready for manual play');
              }
            });
          } else {
            logger.debug('🔇 Auto-play disabled - audio ready for manual activation');
            // Store audio for manual playback but don't auto-play
            setCurrentAudio(audio);
          }
          
          audio.onerror = (err) => {
            logger.warn('⚠️ Audio playback error:', err);
            addMessage("(Audio response received but playback failed)", "pam");
          };
          
          // Cleanup audio URL after playback
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            logger.debug('🔄 Audio playback completed');
          };
          
        } else {
          // Backend returned JSON (fallback or error)
          const data = await response.json();
          logger.debug('📝 Voice response received as JSON:', data);
          
          // Remove processing message
          setMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
          
          // Show user's transcribed message if available
          if (data.text && data.text.trim()) {
            addMessage(data.text, "user");
          }
          
          // Handle different response types with better user guidance
          if (data.response) {
            // Successful voice processing but no audio
            if (data.voice_ready === false && data.guidance) {
              addMessage(data.response, "pam", undefined, false);
              addMessage(`💡 ${data.guidance}`, "pam", undefined, false);
            } else {
              addMessage(data.response, "pam", undefined, false);
            }
          } else if (data.error) {
            // Voice processing error
            if (data.guidance) {
              addMessage(`${data.response || "I had trouble processing your voice message."}`, "pam", undefined, false);
              addMessage(`💡 ${data.guidance}`, "pam", undefined, false);
            } else {
              addMessage(`❌ ${data.error}`, "pam", undefined, false);
            }
          } else {
            // Fallback message
            addMessage("I processed your voice message but couldn't generate an audio response. You can continue typing your messages!", "pam", undefined, false);
          }
          
          // Log technical details for debugging
          if (data.pipeline) {
            logger.debug(`🔧 Voice pipeline: ${data.pipeline}`);
          }
          if (data.technical_details) {
            logger.debug(`🔍 Technical details: ${data.technical_details}`);
          }
        }
      } else {
        const errorText = await response.text();
        logger.error('❌ Voice API response error:', response.status, response.statusText);
        logger.error('❌ Voice API error details:', errorText);
        
        // Remove processing message
        setMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
        addMessage("Sorry, I had trouble processing your voice message. Please try again.", "pam");
      }
    } catch (error) {
      logger.error('❌ Voice submission error:', error);
      setIsProcessingVoice(false);
      addMessage("Sorry, there was an error processing your voice message.", "pam");
    } finally {
      setIsProcessingVoice(false);
      setVoiceStatus("idle");
    }
  };

  // Audio Level Monitoring Functions
  const setupAudioLevelMonitoring = async (stream: MediaStream) => {
    try {
      // Create audio context and analyser
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      // Configure analyser
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      microphone.connect(analyser);
      
      // Set up data array for frequency analysis
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      // Store references
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      
      logger.debug('🎵 Audio level monitoring setup successful');
      setIsShowingAudioLevel(true);
      
      // Start monitoring loop
      monitorAudioLevel();
      
    } catch (error) {
      logger.warn('⚠️ Audio level monitoring setup failed:', error);
    }
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current || !dataArrayRef.current) {
      return;
    }

    // Get frequency data
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Calculate average volume level
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i];
    }
    const average = sum / dataArrayRef.current.length;
    
    // Normalize to 0-100 scale
    const level = Math.min(100, Math.max(0, (average / 255) * 100));
    setAudioLevel(level);
    
    // Continue monitoring
    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
  };

  const stopAudioLevelMonitoring = () => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop audio stream tracks
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => {
        track.stop();
        logger.debug('🔌 Audio stream track stopped');
      });
      audioStreamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Clear references
    analyserRef.current = null;
    dataArrayRef.current = null;
    
    // Reset state
    setAudioLevel(0);
    setIsShowingAudioLevel(false);
    
    logger.debug('🔇 Audio level monitoring stopped');
  };

  // Audio Level Meter Component
  const AudioLevelMeter = () => {
    if (!isShowingAudioLevel) return null;
    
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-1">
          <Mic className="w-3 h-3 text-gray-600" />
          <span className="text-xs text-gray-600">Audio</span>
        </div>
        <div className="flex items-center gap-0.5">
          {[...Array(10)].map((_, i) => {
            const barThreshold = (i + 1) * 10;
            const isActive = audioLevel >= barThreshold;
            return (
              <div
                key={i}
                className={`w-1 h-4 rounded-sm transition-colors duration-75 ${
                  isActive
                    ? i < 6
                      ? 'bg-green-500'
                      : i < 8
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                    : 'bg-gray-200'
                }`}
              />
            );
          })}
        </div>
        <span className="text-xs text-gray-500 min-w-[3ch]">
          {Math.round(audioLevel)}%
        </span>
      </div>
    );
  };

  // Process PAM responses for calendar actions
  const processCalendarActions = async (content: string, userMessage: string) => {
    try {
      // Look for calendar-related keywords in user message
      const lowerUserMessage = userMessage.toLowerCase();
      const lowerContent = content.toLowerCase();
      
      const hasCalendarKeywords = 
        lowerUserMessage.includes("add") ||
        lowerUserMessage.includes("appointment") ||
        lowerUserMessage.includes("calendar") ||
        lowerUserMessage.includes("schedule") ||
        lowerUserMessage.includes("remind");
      
      const pamConfirmsCalendar = 
        lowerContent.includes("appointment") ||
        lowerContent.includes("calendar") ||
        lowerContent.includes("scheduled") ||
        lowerContent.includes("reminder") ||
        lowerContent.includes("added");
        
      if (hasCalendarKeywords && pamConfirmsCalendar) {
        logger.debug('📅 Processing calendar request:', { userMessage, pamResponse: content });
        
        // Simple extraction: get appointment title and basic details
        let title = "New Appointment";
        let date = "tomorrow";
        let time = "12:00 PM";
        
        // Extract appointment with someone
        const withMatch = lowerUserMessage.match(/(?:appointment|meeting)\s+with\s+(\w+)/);
        if (withMatch) {
          title = `Appointment with ${withMatch[1]}`;
        }
        
        // Extract time
        const timeMatch = lowerUserMessage.match(/(?:at|@)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
        if (timeMatch) {
          time = timeMatch[1];
        }
        
        // Extract date
        if (lowerUserMessage.includes("tomorrow")) {
          date = "tomorrow";
        } else if (lowerUserMessage.includes("today")) {
          date = "today";
        }
        
        const eventData = {
          title,
          date,
          time,
          type: "reminder" as const
        };
        
        logger.debug('📅 Creating calendar event:', eventData);
        
        const result = await pamCalendarService.createCalendarEvent(eventData);
        
        if (result.success) {
          logger.debug('✅ Calendar event created successfully:', result);
          setTimeout(() => {
            addMessage(`✅ **Done!** I've created "${title}" in your calendar for ${date} at ${time}. Check the Calendar tab to see it!`, "pam");
          }, 1000);
        } else {
          logger.error('❌ Calendar event creation failed:', result);
          setTimeout(() => {
            addMessage(`⚠️ I had trouble creating the calendar event: ${result.message}`, "pam");
          }, 1000);
        }
      }
    } catch (error) {
      logger.error('❌ Calendar processing error:', error);
    }
  };

  // Process PAM responses for feedback and issue reporting
  const processFeedbackActions = async (content: string, userMessage: string) => {
    try {
      logger.debug('🔧 Checking for feedback intent in message:', userMessage);
      
      // Check if this is feedback-related using the service
      if (pamFeedbackService.detectFeedbackIntent(userMessage)) {
        logger.debug('📝 Feedback intent detected, processing...');
        
        // Process feedback through the service
        const result = await pamFeedbackService.processFeedbackFromConversation(userMessage, content);
        
        if (result.feedbackProcessed && result.response) {
          // Replace PAM's response with our feedback-aware response
          setTimeout(() => {
            addMessage(result.response!, "pam");
          }, 1000);
        }
      }
    } catch (error) {
      logger.error('❌ Feedback processing error:', error);
    }
  };

  // Function to speak PAM's messages using TTS with controlled activation
  const speakMessage = async (content: string, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal', forceSpeak: boolean = false) => {
    // STRICT VOICE CONTROL: Only speak when explicitly triggered by user action
    // Do not speak automatically regardless of settings
    logger.debug('🔊 Voice request - Priority:', priority, 'Force speak:', forceSpeak, 'Activation mode:', voiceActivationMode);
    
    // CRITICAL: Never auto-speak unless forceSpeak is true AND user explicitly triggered it
    if (!forceSpeak) {
      logger.debug('🔇 Auto-speaking disabled - PAM will not speak automatically');
      return;
    }

    // Additional safety check: Only speak in manual mode when explicitly forced
    if (voiceActivationMode === 'manual' && !forceSpeak) {
      logger.debug('🔇 Manual voice mode - no auto-speaking allowed');
      return;
    }

    // Check if voice is enabled in user settings (but still require explicit trigger)
    const isVoiceEnabled = settings?.pam_preferences?.voice_enabled ?? false;
    if (!isVoiceEnabled) {
      logger.debug('🔇 Voice is disabled in user settings');
      return;
    }

    logger.debug('🎵 Speaking PAM response with priority:', priority);

    try {
      // Clean the content for TTS (remove emojis and markdown)
      const cleanContent = content
        .replace(/[🤖🎤🚫🔇🎙️✅❌⚠️🔊💡🔧👂🌐🟢]/g, '') // Remove emojis
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
        .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
        .replace(/`(.*?)`/g, '$1') // Remove code blocks
        .trim();

      if (cleanContent.length === 0) {
        logger.debug('🔇 No content to speak after cleaning');
        return;
      }

      // Use TTS Queue Manager to handle speech
      if (ttsQueueRef.current) {
        ttsQueueRef.current.enqueue({
          content: cleanContent,
          priority,
          context: 'general',
          onComplete: () => {
            logger.debug('✅ Speech completed');
            vadService.setPAMSpeaking(false);
          },
          onError: (error) => {
            logger.error('❌ Speech error:', error);
            vadService.setPAMSpeaking(false);
          }
        });
        
        vadService.setPAMSpeaking(true);
      } else {
        logger.error('❌ TTS Queue Manager not initialized');
      }
      
      // Generate voice using pamVoiceService with user settings
      const voiceResponse = await pamVoiceService.generateVoice({
        text: cleanContent,
        emotion: 'helpful',
        context: 'general',
        priority: 'normal',
        voice: voiceSettings.voice,
        rate: voiceSettings.rate,
        pitch: voiceSettings.pitch,
        volume: voiceSettings.volume
      });

      logger.debug('🎵 Voice response received:', voiceResponse);

      // Use audio manager to prevent WebMediaPlayer overflow
      const audio = audioManager.getAudio(voiceResponse.audioUrl);
      setCurrentAudio(audio);

      // Set up audio event listeners
      audio.addEventListener('ended', () => {
        logger.debug('✅ Voice playback completed');
        setIsSpeaking(false);
        vadService.setPAMSpeaking(false);
        setCurrentAudio(null);
        // Audio manager handles URL cleanup
      });

      audio.addEventListener('error', (error) => {
        logger.warn('🔊 Voice playback error:', error);
        setIsSpeaking(false);
        vadService.setPAMSpeaking(false);
        setCurrentAudio(null);
        // Audio manager handles URL cleanup
      });

      // CONTROLLED TTS PLAYBACK: Respect VAD conversation management
      // Wait for appropriate moment to speak if in continuous mode
      if (isContinuousMode && isVADActive) {
        await vadService.waitForPause(2000);
        if (vadService.canPAMSpeak()) {
          await audio.play();
          logger.debug('✅ Voice playback started (VAD-controlled)');
        } else {
          logger.debug('🔇 VAD determined not appropriate time to speak - skipping TTS playback');
          setIsSpeaking(false);
          vadService.setPAMSpeaking(false);
          setCurrentAudio(null);
          return;
        }
      } else {
        // Normal manual TTS playback (user clicked a voice button)
        await audio.play();
        logger.debug('✅ Voice playback started (manual)');
      }

    } catch (error) {
      logger.warn('🔊 Voice synthesis failed:', error);
      setIsSpeaking(false);
      vadService.setPAMSpeaking(false);
      setCurrentAudio(null);
      
      // Show user-friendly error notification for voice failures
      if (error instanceof Error && error.message.includes('generate')) {
        logger.debug('ℹ️ Voice generation temporarily unavailable - continuing with text response');
      }
    }
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
    const newMessage: PamMessage = {
      id: Date.now().toString(),
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
          sessionId: sessionId,
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
    // Note: PAM backend automatically saves all conversation history
    setInputMessage("");
    
    // Check if we should use agentic planning for complex queries
    if (needsAgenticPlanning(message)) {
      logger.debug('🧠 Using agentic planning for complex query');
      try {
        // Show planning indicator
        const planningMsgId = Date.now().toString();
        addMessage("🧠 Planning your request...", "pam");
        
        const result = await pamAgenticService.planAndExecute(message, {
          conversation_history: messages.slice(-5).map(m => ({
            content: m.content,
            role: m.sender === 'user' ? 'user' : 'assistant'
          })),
          user_context: userContext,
          user_preferences: settings
        });
        
        if (result.execution.success && result.execution.execution_result) {
          // Remove planning message and add result
          setMessages(prev => prev.filter(m => m.content !== "🧠 Planning your request..."));
          addMessage(result.execution.execution_result.response, "pam");
          
          // If voice is enabled, speak the response
          if (settings?.pam_preferences?.voice_enabled) {
            await speakText(result.execution.execution_result.response);
          }
          return; // Exit early, we've handled the message
        } else {
          // Remove planning message
          setMessages(prev => prev.filter(m => m.content !== "🧠 Planning your request..."));
          logger.debug('Agentic planning unsuccessful, falling back to WebSocket');
        }
      } catch (error) {
        logger.error('Agentic planning error:', error);
        setMessages(prev => prev.filter(m => m.content !== "🧠 Planning your request..."));
        // Fall through to WebSocket
      }
    }

    // Check if user is asking for location-based services and we don't have location
    const locationQueries = [
      'near me', 'nearby', 'close to me', 'in my area', 'around here',
      'pizza', 'restaurant', 'food', 'gas station', 'hotel', 'attraction',
      'next town', 'distance to', 'how far', 'directions to'
    ];
    
    const isLocationQuery = locationQueries.some(query => 
      message.toLowerCase().includes(query)
    );
    
    // If it's a location-based query and we don't have location, request it proactively
    if (isLocationQuery && !userContext?.current_location) {
      logger.debug('📍 Location-based query detected, requesting location proactively');
      const location = await requestUserLocation();
      
      if (location) {
        // Update context with precise location
        setUserContext(prev => ({
          ...prev,
          current_location: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
        }));
      } else {
        // Fallback to approximate location detection
        logger.debug('📍 Precise location failed, trying fallback detection');
        const fallbackLocation = await detectFallbackLocation();
        if (fallbackLocation) {
          setUserContext(prev => ({
            ...prev,
            current_location: fallbackLocation,
            location_type: 'approximate'
          }));
          addMessage(`I'll use your approximate location (${fallbackLocation}) based on your timezone. For more accurate results, you can share your precise location.`, "pam");
        }
      }
    }

    const messageData = {
      type: "chat",
      message: message,  // Backend expects 'message' not 'content'
      stream: true,  // Request streaming response for better UX
      context: {
        user_id: user?.id,  // Move userId into context as expected by backend
        userLocation: userContext?.current_location,
        vehicleInfo: userContext?.vehicle_info,
        travelStyle: userContext?.travel_style,
        conversation_history: messages.slice(-5).map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content
        })),
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        location_request_attempted: isLocationQuery && !userContext?.current_location
      }
    };

    // Try WebSocket first if connected
    if (connectionStatus === "Connected" && wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(messageData));
        return;
      } catch (error) {
        logger.error('❌ Failed to send via WebSocket:', error);
      }
    }

    // Fallback to REST API
    try {
      const response = await authenticatedFetch('/api/v1/pam/chat', {
        method: 'POST',
        body: JSON.stringify({
          message,
          context: messageData.context
        })
      });

      if (response.ok) {
        const data = await response.json();
        const pamResponse = data.response || data.message || data.content || "I'm sorry, I couldn't process that request.";
        addMessage(pamResponse, "pam", message);
        // Note: PAM backend automatically saves all conversation history
        
        // Handle any UI actions from the response
        if (data.ui_action) {
          handleUIAction(data.ui_action);
        }
      } else {
        addMessage("I'm having trouble connecting to the server. Please try again later.", "pam");
      }
    } catch (error) {
      logger.error('❌ Failed to send message via REST API:', error);
      addMessage("I'm experiencing connection issues. Please check your internet connection and try again.", "pam");
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      logger.debug('🧹 PAM component unmounting - cleaning up resources...');
      
      // Clear timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
      
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
      
      logger.debug('✅ PAM cleanup completed - microphone released');
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
                  onClick={() => setInputMessage("Autonomously plan a complex trip from Sydney to Hobart with ferry logistics")}
                  className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20"
                >
                  <MapPin className="w-4 h-4" />
                  🧠 Autonomous Complex Trip Planning
                </button>
                <button 
                  onClick={() => setInputMessage("Show me your thinking process for planning a budget-friendly 3-week road trip")}
                  className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20"
                >
                  <Calendar className="w-4 h-4" />
                  💭 Show AI Reasoning Process
                </button>
                <button 
                  onClick={() => setInputMessage("Use your agentic tools to analyze my profile and suggest improvements")}
                  className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20"
                >
                  <DollarSign className="w-4 h-4" />
                  🚀 Proactive Profile Analysis
                </button>
                <button 
                  onClick={() => isWakeWordListening ? stopWakeWordListening() : startWakeWordListening()}
                  className={`flex items-center gap-2 w-full p-2 text-left text-xs rounded-lg ${
                    isWakeWordListening ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  {isWakeWordListening ? "👂 Wake Word Active - Say 'Hi PAM'" : "🎙️ Enable 'Hi PAM' Wake Word (Needs Mic)"}
                </button>
                <button 
                  onClick={isContinuousMode ? stopContinuousVoiceMode : startContinuousVoiceMode}
                  className={`flex items-center gap-2 w-full p-2 text-left text-xs rounded-lg ${
                    isContinuousMode ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  {isContinuousMode ? "🔄 Continuous Mode ON - Say 'PAM'" : "🎙️ Start Continuous Voice Chat (Needs Mic)"}
                </button>
                <button 
                  onClick={async () => {
                    logger.debug('🧪 PAM DIAGNOSTIC: Starting full diagnostic...');
                    
                    // Check authentication
                    const { data: { session } } = await supabase.auth.getSession();
                    logger.debug('🧪 Session details:');
                    logger.debug('  - Has session:', !!session);
                    logger.debug('  - Has access_token:', !!session?.access_token);
                    logger.debug('  - Token length:', session?.access_token?.length || 0);
                    logger.debug('  - Token parts:', session?.access_token?.split('.').length);
                    logger.debug('  - User email:', user?.email);
                    logger.debug('  - User ID:', user?.id);
                    
                    // Test backend health
                    try {
                      const healthResponse = await fetch('https://pam-backend.onrender.com/health');
                      logger.debug('🧪 Backend health:', healthResponse.ok ? 'HEALTHY' : 'UNHEALTHY');
                    } catch (error) {
                      logger.debug('🧪 Backend health: ERROR', error);
                    }
                    
                    // Test PAM connection
                    if (session?.access_token) {
                      try {
                        const testResponse = await authenticatedFetch('/api/v1/pam/chat', {
                          method: 'POST',
                          body: JSON.stringify({
                            message: 'Debug test message',
                            context: { user_id: user?.id, debug: true }
                          })
                        });
                        logger.debug('🧪 PAM API test:', testResponse.ok ? 'SUCCESS' : 'FAILED');
                        if (!testResponse.ok) {
                          const errorText = await testResponse.text();
                          logger.debug('🧪 PAM API error:', errorText);
                        } else {
                          const data = await testResponse.json();
                          logger.debug('🧪 PAM API response:', data);
                        }
                      } catch (apiError) {
                        logger.debug('🧪 PAM API exception:', apiError);
                      }
                    }
                    
                    addMessage("🧪 Diagnostic completed - check browser console for details", "pam");
                  }}
                  className="flex items-center gap-2 w-full p-2 text-left text-xs bg-blue-100 rounded-lg hover:bg-blue-200"
                >
                  🧪 Run Full Diagnostic
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-lg ${
                  msg.sender === "user" ? "bg-primary text-white" : "bg-gray-100 text-gray-800"
                }`}>
                  <p className="text-sm">{msg.content}</p>
                  {/* Streaming indicator */}
                  {msg.isStreaming && (
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full mr-1"></div>
                      <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full mr-1 animation-delay-100"></div>
                      <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full mr-2 animation-delay-200"></div>
                      <span>thinking...</span>
                    </div>
                  )}
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-3 border-t">
          <AudioLevelMeter />
          
          {/* Voice Interface - Phase 5C */}
          <VoiceErrorBoundary>
            <VoiceInterface
              ref={voiceInterfaceRef}
              onSendAudio={handleVoiceAudioSend}
              onSendText={handleVoiceTextSend}
              onTTSRequest={handleTTSRequest}
              compact={true}
              showTranscript={false}
              autoSend={true}
              className="mb-2"
            />
          </VoiceErrorBoundary>
          
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
              className={`p-2 rounded-lg transition-colors relative flex-shrink-0 ${
                isContinuousMode ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
              }`}
              disabled={connectionStatus !== "Connected"}
              title={isContinuousMode ? "🔄 Stop Live mode" : "🎙️ Live mode - Say 'Hey PAM'"}
            >
              <div className="flex flex-col items-center gap-0.5">
                <Mic className="w-4 h-4" />
                <span className="text-xs font-medium">Live</span>
              </div>
              {isContinuousMode && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-300 rounded-full animate-pulse" 
                     title="Live mode active - Say 'Hey PAM'" />
              )}
            </button>
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="p-2 rounded-lg transition-colors relative flex-shrink-0 bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100"
                title="🔇 Stop PAM voice"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <VolumeX className="w-4 h-4" />
                  <span className="text-xs font-medium">Stop</span>
                </div>
              </button>
            )}
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
                <p>{getPersonalizedGreeting()}</p>
                <div className="mt-4 space-y-2">
                  <button 
                    onClick={() => setInputMessage("Autonomously plan a complex trip from Sydney to Hobart with ferry logistics")}
                    className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20"
                  >
                    <MapPin className="w-4 h-4" />
                    🧠 Autonomous Complex Trip Planning
                  </button>
                  <button 
                    onClick={() => setInputMessage("Show me your thinking process for planning a budget-friendly 3-week road trip")}
                    className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20"
                  >
                    <Calendar className="w-4 h-4" />
                    💭 Show AI Reasoning Process
                  </button>
                  <button 
                    onClick={() => setInputMessage("Use your agentic tools to analyze my profile and suggest improvements")}
                    className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20"
                  >
                    <DollarSign className="w-4 h-4" />
                    🚀 Proactive Profile Analysis
                  </button>
                  <button 
                    onClick={() => isWakeWordListening ? stopWakeWordListening() : startWakeWordListening()}
                    className={`flex items-center gap-2 w-full p-2 text-left text-xs rounded-lg ${
                      isWakeWordListening ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                    {isWakeWordListening ? "👂 Wake Word Active - Say 'Hi PAM'" : "🎙️ Enable 'Hi PAM' Wake Word (Needs Mic)"}
                  </button>
                  <button 
                    onClick={isContinuousMode ? stopContinuousVoiceMode : startContinuousVoiceMode}
                    className={`flex items-center gap-2 w-full p-2 text-left text-xs rounded-lg ${
                      isContinuousMode ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                    {isContinuousMode ? "🔄 Continuous Mode ON - Say 'PAM'" : "🎙️ Start Continuous Voice Chat (Needs Mic)"}
                  </button>
                  <button 
                    onClick={async () => {
                      logger.debug('🧪 PAM DIAGNOSTIC: Starting full diagnostic...');
                      
                      // Check authentication  
                      const { data: { session } } = await supabase.auth.getSession();
                      logger.debug('🧪 Session details:');
                      logger.debug('  - Has session:', !!session);
                      logger.debug('  - Has access_token:', !!session?.access_token);
                      logger.debug('  - Token length:', session?.access_token?.length || 0);
                      logger.debug('  - Token parts:', session?.access_token?.split('.').length);
                      logger.debug('  - User email:', user?.email);
                      logger.debug('  - User ID:', user?.id);
                      
                      // Test backend health
                      try {
                        const healthResponse = await fetch('https://pam-backend.onrender.com/health');
                        logger.debug('🧪 Backend health:', healthResponse.ok ? 'HEALTHY' : 'UNHEALTHY');
                      } catch (error) {
                        logger.debug('🧪 Backend health: ERROR', error);
                      }
                      
                      // Test PAM connection
                      if (session?.access_token) {
                        try {
                          const testResponse = await authenticatedFetch('/api/v1/pam/chat', {
                            method: 'POST',
                            body: JSON.stringify({
                              message: 'Debug test message',
                              context: { user_id: user?.id, debug: true }
                            })
                          });
                          logger.debug('🧪 PAM API test:', testResponse.ok ? 'SUCCESS' : 'FAILED');
                          if (!testResponse.ok) {
                            const errorText = await testResponse.text();
                            logger.debug('🧪 PAM API error:', errorText);
                          } else {
                            const data = await testResponse.json();
                            logger.debug('🧪 PAM API response:', data);
                          }
                        } catch (apiError) {
                          logger.debug('🧪 PAM API exception:', apiError);
                        }
                      }
                      
                      addMessage("🧪 Diagnostic completed - check browser console for details", "pam");
                    }}
                    className="flex items-center gap-2 w-full p-2 text-left text-xs bg-blue-100 rounded-lg hover:bg-blue-200"
                  >
                    🧪 Run Full Diagnostic
                  </button>
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
                        <p className="text-sm">{msg.content}</p>
                        {/* Streaming indicator */}
                        {msg.isStreaming && (
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full mr-1"></div>
                            <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full mr-1 animation-delay-100"></div>
                            <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full mr-2 animation-delay-200"></div>
                            <span>thinking...</span>
                          </div>
                        )}
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
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
            
            {/* Voice Interface - Phase 5C */}
            <VoiceErrorBoundary>
              <VoiceInterface
                ref={voiceInterfaceRef}
                onSendAudio={handleVoiceAudioSend}
                onSendText={handleVoiceTextSend}
                onTTSRequest={handleTTSRequest}
                compact={true}
                showTranscript={false}
                autoSend={true}
                className="mb-2"
              />
            </VoiceErrorBoundary>
            
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
                className={`p-2 rounded-lg transition-colors relative flex-shrink-0 ${
                  isContinuousMode ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
                }`}
                disabled={connectionStatus !== "Connected"}
                title={isContinuousMode ? "🔄 Stop Live mode" : "🎙️ Live mode - Say 'Hey PAM'"}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <Mic className="w-4 h-4" />
                  <span className="text-xs font-medium">Live</span>
                </div>
                {isContinuousMode && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-300 rounded-full animate-pulse" 
                       title="Live mode active - Say 'Hey PAM'" />
                )}
              </button>
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="p-2 rounded-lg transition-colors relative flex-shrink-0 bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100"
                  title="🔇 Stop PAM voice"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <VolumeX className="w-4 h-4" />
                    <span className="text-xs font-medium">Stop</span>
                  </div>
                </button>
              )}
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
