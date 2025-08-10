import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Mic, MicOff, VolumeX, MapPin, Calendar, DollarSign, Volume2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePamErrorRecovery } from "@/hooks/pam/usePamErrorRecovery";
import { PamErrorBoundary } from "@/components/pam/PamErrorBoundary";
import { pamUIController } from "@/lib/PamUIController";
import { getWebSocketUrl, apiFetch, authenticatedFetch } from "@/services/api";
import { getPublicAssetUrl } from "@/utils/publicAssets";
import { supabase } from "@/integrations/supabase/client";
import { pamCalendarService } from "@/services/pamCalendarService";
import { pamFeedbackService } from "@/services/pamFeedbackService";
import { pamVoiceService } from "@/lib/voiceService";
import { useUserSettings } from "@/hooks/useUserSettings";
import { vadService, type ConversationState } from "@/services/voiceActivityDetection";
import { trackPAMMetrics } from "@/lib/sentry";
import { 
  WebSocketAuthManager, 
  getValidAccessToken, 
  createAuthenticatedWebSocketUrl 
} from "@/utils/websocketAuth";
import { 
  AuthErrorHandler, 
  mapWebSocketCloseCodeToAuthError,
  mapHttpStatusToAuthError 
} from "@/utils/authErrorHandler";
import { AuthTestSuite, quickAuthCheck } from "@/utils/authTestSuite";
import { audioManager } from "@/utils/audioManager";
import { TTSQueueManager } from "@/utils/ttsQueueManager";
import { locationService } from "@/services/locationService";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { flags, getUserVariant } from "@/config/featureFlags";
import { usePamVisualControl } from "@/hooks/pam/usePamVisualControl";
import { pamService } from '@/services/pamService';
import { usePamWebSocket } from '@/hooks/usePamWebSocket';
// Temporarily disabled - AI SDK not configured
// import { PamWithFallback } from "@/experiments/ai-sdk-poc/components/PamWithFallback";

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
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
}

interface PamProps {
  mode?: "floating" | "sidebar" | "modal";
}

const Pam: React.FC<PamProps> = ({ mode = "floating" }) => {
  const { user, session } = useAuth();
  
  // AI SDK Integration - Temporarily disabled until AI SDK is configured
  // if (user?.id && flags.useAiSdkPam) {
  //   const variant = getUserVariant(user.id);
  //   if (variant === 'ai-sdk') {
  //     // Use the new AI SDK version
  //     return <PamWithFallback className={mode === "floating" ? "fixed bottom-4 right-4" : ""} />;
  //   }
  // }
  const { settings, updateSettings } = useUserSettings();
  
  // Error recovery system
  const errorRecovery = usePamErrorRecovery();
  
  // Enhanced PAM WebSocket integration with voice and error recovery
  // Use the hook with correct parameters
  const wsHook = usePamWebSocket(
    user?.id || '', 
    session?.access_token || ''
  );
  
  // Create a wrapper object that provides the expected interface
  const pamWebSocket = {
    isConnected: wsHook.isConnected,
    messages: wsHook.messages,
    sendMessage: wsHook.sendMessage,
    connect: wsHook.connect,
    disconnect: () => { /* The hook doesn't have disconnect, but we can close via connect */ },
    connectionStatus: wsHook.isConnected ? 'connected' : 'disconnected',
    isConnecting: false, // The hook doesn't track this state
    voiceRecovery: null // Not implemented in the basic hook
  };
  
  // Handle messages from WebSocket
  useEffect(() => {
    if (pamWebSocket.messages.length > 0) {
      const lastMessage = pamWebSocket.messages[pamWebSocket.messages.length - 1];
      console.log('📨 PAM component received message:', lastMessage);
      
      // Handle message in the component
      if ('role' in lastMessage && lastMessage.role === 'assistant') {
        // New pamService message format
        addMessage(lastMessage.content, "pam");
      } else if ('message' in lastMessage) {
        // Legacy message format
        addMessage(lastMessage.message || lastMessage.content || '', "pam");
      }
    }
  }, [pamWebSocket.messages]);
  
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "processing" | "error">("idle");
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [messages, setMessages] = useState<PamMessage[]>([]);
  // Legacy connectionStatus now derived from pamWebSocket state
  const connectionStatus = pamWebSocket.connectionStatus;
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
      () => console.log('🔇 Speech interrupted')
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
      console.log('🎤 VAD detected user speech start:', result);
      setConversationState(prev => ({ ...prev, userSpeaking: true }));
      
      // Interrupt PAM if currently speaking
      if (isSpeaking && currentAudio && !currentAudio.paused) {
        console.log('🔇 VAD interrupting PAM speech due to user speaking');
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setIsSpeaking(false);
        vadService.setPAMSpeaking(false);
      }
    });
    
    // User speech end - update conversation state
    vadService.onSpeechEnd((result) => {
      console.log('🔇 VAD detected user speech end:', result);
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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownWelcomeRef = useRef(false);
  const authManagerRef = useRef<WebSocketAuthManager>(new WebSocketAuthManager({
    maxRetries: 3,
    retryDelay: 1000,
    refreshThreshold: 5 // Refresh if token expires in 5 minutes
  }));
  const authErrorHandler = new AuthErrorHandler();
  
  const sessionToken = session?.access_token;

  // Load user context and memory when component mounts
  useEffect(() => {
    console.log('🚀 PAM useEffect triggered with user:', { userId: user?.id, hasUser: !!user, hasSession: !!session });
    
    // Expose test functions to window for debugging (development only)
    if (import.meta.env.DEV) {
      (window as any).testPamConnection = testMinimalConnection;
      (window as any).runAuthTests = async () => {
        const testSuite = new AuthTestSuite();
        return await testSuite.runFullTestSuite();
      };
      (window as any).quickAuthCheck = quickAuthCheck;
      
      console.log('🧪 PAM DEBUG: Test functions exposed:');
      console.log('  - window.testPamConnection() - Original connection test');
      console.log('  - window.runAuthTests() - Full authentication test suite');
      console.log('  - window.quickAuthCheck() - Quick auth health check');
    }
    
    if (user?.id) {
      console.log('📋 PAM: Loading user context and connecting via enhanced pamService...');
      
      // Persist session ID for conversation continuity
      localStorage.setItem('pam_session_id', sessionId);
      
      loadUserContext();
      loadConversationMemory();
      
      // Use enhanced pamService connection (handled automatically by usePamWebSocket)
      if (!pamWebSocket.isConnected && !pamWebSocket.isConnecting) {
        console.log('🚀 Manually triggering PAM connection...');
        pamWebSocket.connect().catch(error => {
          console.error('❌ Failed to connect PAM service:', error);
        });
      } else {
        console.log('✅ PAM service already connected or connecting');
      }
    } else {
      console.log('❌ PAM: No user ID, skipping connection');
    }
  }, [user?.id, sessionId, pamWebSocket.isConnected, pamWebSocket.isConnecting, pamWebSocket.connect]);

  // Initialize PAM Visual Control
  const { handlePamMessage: handleVisualMessage } = usePamVisualControl();

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
            console.log('📍 Updated PAM location context from trip planner:', locationString);
          }
        } catch (error) {
          console.warn('⚠️ Failed to update location context:', error);
        }
      }
    };

    updateLocationContext();
  }, [user?.id, locationState?.isTracking, locationState?.lastUpdate]);

  // Listen for external PAM control events
  useEffect(() => {
    const handleOpenWithMessage = (event: CustomEvent) => {
      const { message } = event.detail;
      console.log('🎯 PAM: Opening with message:', message);
      setIsOpen(true);
      setInputMessage(message);
      // Focus input after a brief delay to ensure component is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    };

    const handleOpen = () => {
      console.log('🎯 PAM: Opening');
      setIsOpen(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    };

    const handleSendMessageEvent = (event: CustomEvent) => {
      const { message } = event.detail;
      console.log('🎯 PAM: Sending message:', message);
      if (isOpen) {
        setInputMessage(message);
        // Send the message directly
        setTimeout(() => {
          handleSendMessage(message);
        }, 100);
      } else {
        // Open PAM and send message
        setIsOpen(true);
        setInputMessage(message);
        setTimeout(() => {
          handleSendMessage(message);
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
        console.log('📋 Loaded user context:', data);
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
            console.log('📍 Added location from trip planner:', locationString);
            locationObtained = true;
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch location from trip planner:', error);
        }
      }
      
      // Second try: If no location from trip planner, request fresh location
      if (!locationObtained) {
        console.log('📍 No location from trip planner, requesting fresh location for PAM');
        const location = await requestUserLocation();
        if (location) {
          const locationString = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
          contextData = {
            ...contextData,
            current_location: locationString,
            location_source: 'geolocation'
          };
          console.log('📍 Got fresh location for PAM:', locationString);
        }
      }

      setUserContext(contextData);
    } catch (error) {
      console.error('Failed to load user context:', error);
    }
  };

  const requestUserLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (isRequestingLocation) {
      console.log('📍 Location request already in progress');
      return null;
    }

    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      addMessage("I'm sorry, but location services are not available in your browser. You can tell me your location manually for better assistance.", "pam");
      return null;
    }

    setIsRequestingLocation(true);
    
    try {
      // First, check if we already have location from the tracking service
      if (locationState?.isTracking && user?.id) {
        console.log('📍 Using existing location from tracking service');
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
            console.log('📍 Successfully got user location:', { latitude, longitude });
            
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
                console.log('✅ Location stored in database');
              } catch (error) {
                console.warn('⚠️ Failed to update location in database:', error);
              }
            }
            
            setIsRequestingLocation(false);
            resolve({ latitude, longitude });
          },
          (error) => {
            console.error('❌ Failed to get location:', error);
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
      console.error('❌ Location request error:', error);
      setIsRequestingLocation(false);
      return null;
    }
  };

  const detectFallbackLocation = async (): Promise<string | null> => {
    try {
      // Try to get rough location from timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('🌍 Detected timezone:', timezone);
      
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
        console.log('🌍 Approximate location detected:', approximateLocation);
        return approximateLocation;
      }
      
      // Extract region from timezone as fallback
      const region = timezone.split('/')[1]?.replace('_', ' ') || timezone;
      console.log('🌍 Region fallback:', region);
      return region;
      
    } catch (error) {
      console.warn('⚠️ Failed to detect fallback location:', error);
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
            console.log('📚 PAM: Restored conversation from localStorage:', parsed.messages.length, 'messages');
            
            // Restore session ID if available
            if (parsed.sessionId) {
              setSessionId(parsed.sessionId);
            }
            return; // Successfully restored from localStorage
          }
        } catch (parseError) {
          console.warn('⚠️ Could not parse saved conversation state:', parseError);
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
        console.log('📚 PAM: Loaded conversation from backend:', memoryMessages.length, 'messages');
      }
    } catch (error) {
      console.error('Failed to load conversation memory:', error);
    }
  };

  const saveToMemory = async (message: string, sender: 'user' | 'pam', context?: any) => {
    try {
      // Use PAM's built-in memory system instead of generic actions endpoint
      // The PAM chat endpoint automatically saves conversation history
      console.log('💾 Saving to PAM memory:', { message: message.substring(0, 100), sender, user_id: user?.id });
      
      // PAM automatically saves messages when processing them through the chat endpoint
      // No need for explicit memory saving as it's handled by the agentic orchestrator
      
    } catch (error) {
      console.error('Failed to save to memory:', error);
    }
  };

  const testRestApiConnection = async () => {
    try {
      console.log('🔄 Testing REST API connection...');
      
      // First try the health endpoint (no auth required)
      const healthResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://wheels-wins-backend-staging.onrender.com'}/health`);
      if (!healthResponse.ok) {
        throw new Error('Backend health check failed');
      }
      
      console.log('✅ Backend health check passed');
      
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
        console.log('✅ REST API connection successful:', data);
        const pamResponse = data.response || data.message || data.content || "Hello! I'm PAM and I'm working properly now!";
        addMessage(pamResponse, "pam");
        setConnectionStatus("Connected");
      } else {
        const errorText = await response.text();
        console.error('❌ REST API connection failed:', response.status, response.statusText, errorText);
        
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
      console.error('❌ REST API test failed:', error);
      addMessage("❌ Backend services are currently unavailable. Please try again later. In the meantime, I can help you with general travel advice!", "pam");
    }
  };

  const connectToBackend = useCallback(async () => {
    console.log('🚀 PAM DEBUG: ==================== CONNECTION START ====================');
    console.log('🚀 PAM DEBUG: connectToBackend called');
    console.log('🚀 PAM DEBUG: User context:', { 
      userId: user?.id, 
      userEmail: user?.email,
      hasUser: !!user,
      hasSession: !!session, 
      hasToken: !!sessionToken,
      tokenLength: sessionToken?.length || 0
    });
    
    if (!user?.id) {
      console.error('❌ PAM DEBUG: No user ID available, cannot connect');
      console.log('❌ PAM DEBUG: User object:', user);
      console.log('❌ PAM DEBUG: Session object:', session);
      return;
    }

    console.log('🏥 PAM DEBUG: ==================== HEALTH CHECK ====================');
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://wheels-wins-backend-staging.onrender.com';
    console.log('🏥 PAM DEBUG: Backend URL:', backendUrl);
    console.log('🏥 PAM DEBUG: Health check URL:', `${backendUrl}/health`);
    
    // Health check with enhanced logging
    try {
      const healthStartTime = Date.now();
      console.log('🏥 PAM DEBUG: Starting health check at:', new Date().toISOString());
      
      const healthResponse = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      const healthTime = Date.now() - healthStartTime;
      console.log('🏥 PAM DEBUG: Health check completed in:', `${healthTime  }ms`);
      console.log('🏥 PAM DEBUG: Health response status:', healthResponse.status);
      console.log('🏥 PAM DEBUG: Health response ok:', healthResponse.ok);
      
      if (!healthResponse.ok) {
        console.warn('⚠️ PAM DEBUG: Backend health check failed');
        console.warn('⚠️ PAM DEBUG: Response status:', healthResponse.status);
        console.warn('⚠️ PAM DEBUG: Response statusText:', healthResponse.statusText);
        
        setConnectionStatus("Disconnected");
        addMessage("🤖 Hi! I'm PAM. Backend health check failed. Let me try to establish a connection...", "pam");
        await testRestApiConnection();
        return;
      }
      
      const healthData = await healthResponse.json();
      console.log('✅ PAM DEBUG: Health check successful:', healthData);
      
    } catch (error) {
      console.error('❌ PAM DEBUG: Health check error:', error);
      console.error('❌ PAM DEBUG: Error type:', error.constructor.name);
      console.error('❌ PAM DEBUG: Error message:', error.message);
      console.error('❌ PAM DEBUG: Error stack:', error.stack);
      
      setConnectionStatus("Disconnected");
      addMessage("🤖 Hi! I'm PAM. Backend health check failed, but I can still help using REST API.", "pam");
      return;
    }

    console.log('🔧 PAM DEBUG: ==================== WEBSOCKET SETUP ====================');
    
    try {
      // Step 1: Get valid JWT token using new authentication manager
      console.log('🔧 PAM DEBUG: Getting valid JWT token for WebSocket...');
      const tokenResult = await authManagerRef.current.getValidTokenWithRetry();
      
      if (!tokenResult.isValid || !tokenResult.token) {
        console.error('❌ PAM DEBUG: Failed to get valid token:', tokenResult.error);
        setConnectionStatus("Disconnected");
        addMessage(`🤖 Hi! I'm PAM. Authentication failed: ${tokenResult.error}. Please try logging out and back in.`, "pam");
        return;
      }
      
      console.log('✅ PAM DEBUG: Valid JWT token obtained:', {
        tokenLength: tokenResult.token.length,
        tokenPreview: `${tokenResult.token.substring(0, 30)  }...`,
        expiresAt: tokenResult.expiresAt,
        needsRefresh: tokenResult.needsRefresh
      });
      
      // CRITICAL: Verify this is actually a JWT, not a UUID
      if (tokenResult.token.includes('-') && tokenResult.token.length === 36) {
        console.error('❌ PAM DEBUG: ERROR - Token appears to be a UUID, not a JWT!');
        console.error('❌ PAM DEBUG: Token type: UUID (length: 36, contains dashes)');
        console.error('❌ PAM DEBUG: This will cause authentication to fail');
        
        // Try to get the actual JWT from session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          console.log('🔄 PAM DEBUG: Found JWT in session, using that instead');
          tokenResult.token = session.access_token;
          console.log('✅ PAM DEBUG: JWT token from session:', {
            tokenLength: session.access_token.length,
            tokenPreview: `${session.access_token.substring(0, 30)  }...`
          });
        } else {
          console.error('❌ PAM DEBUG: No JWT found in session either!');
          setConnectionStatus("Disconnected");
          addMessage("🤖 Hi! I'm PAM. Authentication failed - no valid JWT token found. Please try logging out and back in.", "pam");
          return;
        }
      }
      
      // Step 2: Get WebSocket base URL with user ID
      console.log('🔧 PAM DEBUG: Getting WebSocket base URL...');
      const userIdString = String(user.id);
      const baseWebSocketUrl = getWebSocketUrl(`/api/v1/pam/ws/${userIdString}`);
      console.log('🔧 PAM DEBUG: Base WebSocket URL:', baseWebSocketUrl);
      
      // Step 3: Create authenticated WebSocket URL
      console.log('🔧 PAM DEBUG: Creating authenticated WebSocket URL...');
      const wsUrl = createAuthenticatedWebSocketUrl(baseWebSocketUrl, tokenResult.token);
      
      // Step 4: Validate URL format
      console.log('✅ PAM DEBUG: URL validation:');
      console.log('✅ PAM DEBUG: - Contains endpoint:', wsUrl.includes('/api/v1/pam/ws'));
      console.log('✅ PAM DEBUG: - Contains user ID:', wsUrl.includes(userIdString));
      console.log('✅ PAM DEBUG: - Uses secure protocol:', wsUrl.startsWith('wss://'));
      console.log('✅ PAM DEBUG: - Contains token parameter:', wsUrl.includes('token='));
      
      if (!wsUrl.includes('/api/v1/pam/ws') || !wsUrl.includes(userIdString)) {
        console.error('❌ PAM DEBUG: URL validation failed!');
        console.error('❌ PAM DEBUG: Expected /api/v1/pam/ws in URL');
        console.error('❌ PAM DEBUG: Actual URL:', `${wsUrl.substring(0, 100)  }...`);
        throw new Error('WebSocket endpoint validation failed');
      }
      
      console.log('🔄 PAM DEBUG: ==================== WEBSOCKET CONNECTION ====================');
      setConnectionStatus("Connecting");
      console.log('🔄 PAM DEBUG: Status set to Connecting');
      console.log('🔄 PAM DEBUG: Creating WebSocket with URL:', wsUrl);
      
      const connectionStartTime = Date.now();
      wsRef.current = new WebSocket(wsUrl);
      
      console.log('🔄 PAM DEBUG: WebSocket created, initial readyState:', wsRef.current.readyState);
      console.log('🔄 PAM DEBUG: WebSocket URL property:', wsRef.current.url);
      console.log('🔄 PAM DEBUG: Connection timestamp:', new Date().toISOString());

      wsRef.current.onopen = (event) => {
        const connectionTime = Date.now() - connectionStartTime;
        console.log('✅ PAM DEBUG: ==================== CONNECTION SUCCESS ====================');
        console.log('✅ PAM DEBUG: WebSocket OPENED successfully!');
        console.log('✅ PAM DEBUG: Connection time:', `${connectionTime  }ms`);
        console.log('✅ PAM DEBUG: Event:', event);
        console.log('✅ PAM DEBUG: WebSocket readyState:', wsRef.current?.readyState);
        console.log('✅ PAM DEBUG: WebSocket URL:', wsRef.current?.url);
        console.log('✅ PAM DEBUG: WebSocket protocol:', wsRef.current?.protocol);
        
        // Track baseline metrics
        trackPAMMetrics.websocketConnection(true, connectionTime, reconnectAttempts.current + 1);
        
        setConnectionStatus("Connected");
        setReconnectAttempts(0);
        
        console.log('✅ PAM DEBUG: Connection status updated to Connected');
        console.log('✅ PAM DEBUG: WebSocket ready state:', wsRef.current?.readyState);
        
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
        
        console.log('📍 PAM DEBUG: Sending init message with location:', initMessage);
        wsRef.current.send(JSON.stringify(initMessage));
        
        if (messages.length === 0 && !hasShownWelcomeRef.current) {
          console.log('💬 PAM DEBUG: Adding greeting message');
          addMessage("🤖 Hi! I'm PAM, your AI travel companion! How can I help you today?", "pam");
          hasShownWelcomeRef.current = true;
        } else {
          console.log('📚 PAM DEBUG: Restoring existing conversation');
        }
      };

      wsRef.current.onmessage = async (event) => {
        console.log('📨 PAM DEBUG: Message received:', event.data);
        try {
          const message = JSON.parse(event.data);
          console.log('📨 PAM DEBUG: Parsed message:', message);
          console.log('📨 PAM DEBUG: Message type:', message.type);
          console.log('📨 PAM DEBUG: Message keys:', Object.keys(message));
          console.log('📨 PAM DEBUG: Content fields:', {
            content: message.content,
            message: message.message,
            response: message.response,
            text: message.text
          });
          
          // Handle streaming chat responses
          if (message.type === 'chat_response_start') {
            console.log('🌊 PAM DEBUG: Streaming response started');
            // Show immediate processing indicator
            addMessage(message.message || "🔍 Processing your request...", "pam", undefined, undefined, 'normal');
            return;
          }
          
          if (message.type === 'chat_response_delta') {
            console.log('🌊 PAM DEBUG: Streaming delta received:', message.content);
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
            console.log('🌊 PAM DEBUG: Streaming response completed');
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
            console.log('💬 PAM DEBUG: Response received:', { type: message.type, content: `${content?.substring(0, 100)  }...` });
            
            if (content && content.trim()) {
              // Check if PAM is asking for location and offer to get it automatically
              const locationKeywords = [
                'current location', 'your location', 'where you are', 'share your location',
                'tell me your location', 'location manually', 'provide your location'
              ];
              
              const needsLocation = locationKeywords.some(keyword => 
                content.toLowerCase().includes(keyword)
              );
              
              if (needsLocation && !userContext?.current_location) {
                console.log('📍 PAM is asking for location, offering automatic request');
                addMessage(content, "pam");
                
                // Add a helpful message with location request button
                setTimeout(() => {
                  addMessage(
                    "I can automatically get your current location if you'd like. Would you like me to request access to your location?",
                    "pam"
                  );
                  
                  // Auto-request location after a brief delay
                  setTimeout(async () => {
                    console.log('📍 Auto-requesting location for better assistance');
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
                
                // Track response time if we have tracking data
                if (window.pamMessageTracking) {
                  const trackingKeys = Object.keys(window.pamMessageTracking);
                  if (trackingKeys.length > 0) {
                    const lastKey = trackingKeys[trackingKeys.length - 1];
                    const tracking = window.pamMessageTracking[lastKey];
                    const responseTime = Date.now() - tracking.sendTime;
                    trackPAMMetrics.messageResponse(responseTime, true, tracking.type);
                    delete window.pamMessageTracking[lastKey]; // Clean up
                  }
                }
              }
            } else {
              console.warn('⚠️ Empty content in response:', message);
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
            console.log('🎛️ PAM DEBUG: UI action received:', message);
            handleUIAction(message);
          }

          // Handle visual control actions
          if (message.type === 'visual_action' || message.visual_action) {
            console.log('🎨 PAM DEBUG: Visual action received:', message.visual_action || message);
            handleVisualMessage(message);
          }
          
          // Handle welcome messages
          if (message.type === 'welcome') {
            console.log('👋 PAM DEBUG: Welcome message received:', message.message);
          }
          
          // Handle ping/pong for connection health
          if (message.type === 'ping') {
            console.log('🏓 PAM DEBUG: Ping received, sending pong');
            wsRef.current?.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
          
          // Fallback: Display any message with content that we haven't handled
          if (!['chat_response', 'response', 'ui_action', 'welcome', 'ping', 'pong'].includes(message.type)) {
            const fallbackContent = message.content || message.message || message.response || message.text;
            if (fallbackContent && typeof fallbackContent === 'string' && fallbackContent.trim()) {
              console.log('🔄 PAM DEBUG: Displaying fallback message:', { type: message.type, content: fallbackContent });
              addMessage(fallbackContent, "pam");
            }
          }
          
        } catch (error) {
          console.error('❌ PAM DEBUG: Error parsing message:', error);
          console.error('❌ PAM DEBUG: Raw message data:', event.data);
          
          // Try to display raw message if JSON parsing fails
          if (typeof event.data === 'string' && event.data.trim()) {
            addMessage(`📨 Received: ${event.data}`, "pam");
          }
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 PAM DEBUG: ==================== CONNECTION CLOSED ====================');
        console.log('🔌 PAM DEBUG: WebSocket closed');
        console.log('🔌 PAM DEBUG: Close code:', event.code);
        console.log('🔌 PAM DEBUG: Close reason:', event.reason);
        console.log('🔌 PAM DEBUG: Was clean:', event.wasClean);
        console.log('🔌 PAM DEBUG: Close event:', event);
        
        // Common close codes and their meanings
        const closeCodeMeanings = {
          1000: 'Normal closure',
          1001: 'Going away',
          1002: 'Protocol error',
          1003: 'Unsupported data',
          1006: 'Abnormal closure (no close frame)',
          1007: 'Invalid frame payload data',
          1008: 'Policy violation',
          1009: 'Message too big',
          1010: 'Missing extension',
          1011: 'Internal server error',
          1015: 'TLS handshake failure'
        };
        
        console.log('🔌 PAM DEBUG: Close code meaning:', closeCodeMeanings[event.code] || 'Unknown');
        
        setConnectionStatus("Disconnected");
        
        // Save conversation state
        try {
          localStorage.setItem(`pam_conversation_${user?.id}`, JSON.stringify({
            messages: messages.slice(-10),
            sessionId,
            timestamp: new Date().toISOString()
          }));
          console.log('💾 PAM DEBUG: Conversation state saved');
        } catch (error) {
          console.warn('⚠️ PAM DEBUG: Could not save conversation state:', error);
        }
        
        // Enhanced reconnection logic with comprehensive authentication error handling
        // Stop reconnecting if we're getting authentication errors repeatedly
        if (event.code === 1008 && reconnectAttempts >= 2) {
          console.error('🔐 PAM DEBUG: Authentication failing repeatedly, stopping reconnection');
          setConnectionStatus("Disconnected");
          if (!hasShownWelcomeRef.current) {
            addMessage("🤖 I'm having trouble connecting. Please try refreshing the page.", "pam");
            hasShownWelcomeRef.current = true;
          }
          return;
        }
        
        if (event.code !== 1000 && reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
          console.log(`🔄 PAM DEBUG: Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/5)`);
          
          // Check if disconnection was due to authentication issues
          const authError = mapWebSocketCloseCodeToAuthError(event.code, event.reason);
          
          if (authError) {
            console.log('🔐 PAM DEBUG: Authentication error detected:', authError);
            
            reconnectTimeoutRef.current = setTimeout(async () => {
              console.log('🔄 PAM DEBUG: Executing auth-aware reconnect attempt');
              
              // Handle the authentication error appropriately
              const handled = await authErrorHandler.handleAuthError(authError);
              
              if (handled) {
                console.log('🔐 PAM DEBUG: Auth error handled successfully, attempting reconnection');
                setReconnectAttempts(prev => prev + 1);
                connectToBackend();
              } else {
                console.error('🔐 PAM DEBUG: Failed to handle auth error, stopping reconnection attempts');
                setConnectionStatus("Disconnected");
                addMessage("🤖 Unable to resolve authentication issue. Please refresh the page or contact support.", "pam");
              }
            }, delay);
          } else {
            // Non-authentication related disconnection
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('🔄 PAM DEBUG: Executing standard reconnect attempt');
              setReconnectAttempts(prev => prev + 1);
              connectToBackend();
            }, delay);
          }
        } else {
          console.log('🔄 PAM DEBUG: Not reconnecting - max attempts reached or normal close');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ PAM DEBUG: ==================== CONNECTION ERROR ====================');
        console.error('❌ PAM DEBUG: WebSocket error occurred');
        console.error('❌ PAM DEBUG: Error event:', error);
        console.error('❌ PAM DEBUG: Error type:', error.type);
        console.error('❌ PAM DEBUG: WebSocket readyState:', wsRef.current?.readyState);
        console.error('❌ PAM DEBUG: WebSocket URL:', wsRef.current?.url);
        
        // Track baseline metrics
        trackPAMMetrics.websocketConnection(false, undefined, reconnectAttempts.current + 1);
        trackPAMMetrics.baseline.record('connection_failure');
        
        setConnectionStatus("Disconnected");
      };
    } catch (error) {
      console.error('❌ PAM DEBUG: ==================== SETUP ERROR ====================');
      console.error('❌ PAM DEBUG: WebSocket setup failed');
      console.error('❌ PAM DEBUG: Error type:', error.constructor.name);
      console.error('❌ PAM DEBUG: Error message:', error.message);
      console.error('❌ PAM DEBUG: Error stack:', error.stack);
      console.error('❌ PAM DEBUG: Full error:', error);
      
      setConnectionStatus("Disconnected");
      addMessage("🤖 Hi! I'm PAM. I encountered an error setting up the WebSocket connection. I'll try to help you using the REST API instead.", "pam");
    }
  }, [user?.id, sessionToken]);

  // Minimal test function for debugging WebSocket connection
  const testMinimalConnection = useCallback(async () => {
    console.log('🧪 PAM MINIMAL TEST: ==================== STARTING ====================');
    
    // Test 1: Basic environment variables
    console.log('🧪 TEST 1: Environment Variables');
    console.log('- VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
    console.log('- VITE_PAM_WEBSOCKET_URL:', import.meta.env.VITE_PAM_WEBSOCKET_URL);
    
    // Test 2: User context
    console.log('🧪 TEST 2: User Context');
    console.log('- User ID:', user?.id);
    console.log('- Has session:', !!session);
    
    // Test 3: URL construction
    console.log('🧪 TEST 3: URL Construction');
    const testUrl = getWebSocketUrl(`/api/v1/pam/ws/${user?.id || 'test-user'}`);
    console.log('- getWebSocketUrl result:', testUrl);
    
    // Test 4: Token preparation
    console.log('🧪 TEST 4: Token Preparation');
    const testToken = user?.id || 'test_user';
    console.log('- Test token length:', testToken?.length || 0);
    
    // Test 5: Final URL
    console.log('🧪 TEST 5: Final URL');
    const finalUrl = `${testUrl}?token=${encodeURIComponent(testToken)}`;
    console.log('- Final WebSocket URL:', finalUrl);
    
    // Test 6: WebSocket creation (minimal)
    console.log('🧪 TEST 6: WebSocket Creation');
    try {
      const testWs = new WebSocket(finalUrl);
      console.log('- WebSocket created successfully');
      console.log('- Initial readyState:', testWs.readyState);
      console.log('- URL property:', testWs.url);
      
      // Set up basic event handlers for testing
      testWs.onopen = (event) => {
        console.log('🧪 TEST SUCCESS: WebSocket opened!', event);
        testWs.close(1000, 'Test completed');
      };
      
      testWs.onerror = (error) => {
        console.error('🧪 TEST ERROR: WebSocket error:', error);
      };
      
      testWs.onclose = (event) => {
        console.log('🧪 TEST CLOSE: WebSocket closed:', event.code, event.reason);
      };
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (testWs.readyState !== WebSocket.OPEN) {
          console.log('🧪 TEST TIMEOUT: Connection did not open within 10 seconds');
          console.log('🧪 TEST TIMEOUT: Final readyState:', testWs.readyState);
          testWs.close();
        }
      }, 10000);
      
    } catch (error) {
      console.error('🧪 TEST FAILED: Could not create WebSocket:', error);
    }
    
    console.log('🧪 PAM MINIMAL TEST: ==================== COMPLETED ====================');
  }, [user?.id, session]);

  const displayAgenticInfo = (agenticInfo: any) => {
    console.log('🧠 Agentic capabilities displayed:', agenticInfo);
    const infoMessage = `🧠 **Agentic Analysis Active**\n\n${agenticInfo.capabilities?.join('\n• ') || 'Advanced AI reasoning engaged'}`;
    addMessage(infoMessage, "pam");
  };

  const displayThinkingProcess = (thinkingProcess: any) => {
    console.log('💭 Thinking process:', thinkingProcess);
    const thinkingMessage = `💭 **PAM's Thinking Process**\n\n${thinkingProcess.process?.join('\n') || 'Processing complex request...'}`;
    addMessage(thinkingMessage, "pam");
  };

  const handleAutonomousActions = (autonomousActions: any[]) => {
    console.log('🚀 Autonomous actions triggered:', autonomousActions);
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
          console.warn('Unknown UI action:', action);
      }
      
      // Add message about the action
      addMessage(`🔧 ${action.replace('_', ' ')} action completed`, "pam");
      
    } catch (error) {
      console.error('Error handling UI action:', error);
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
      
      console.log('🎤 Requesting microphone with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Microphone access granted');
      
      if (keepStream) {
        // Return the stream for use
        return stream;
      } else {
        // Just checking permission - stop the stream
        stream.getTracks().forEach(track => track.stop());
        return true;
      }
    } catch (error: any) {
      console.error('⚠️ Microphone access failed:', {
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
        console.warn('⚠️ SpeechRecognition not supported in this browser');
        return;
      }

      // Don't automatically request microphone permission - wait for user action
      console.log('🎙️ Wake word detection available, waiting for user to enable...');

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
        
        console.log('🎙️ Speech detected:', {
          transcript,
          isFinal: latest.isFinal,
          confidence: latest[0].confidence,
          isWakeWordListening: currentIsWakeWordListening,
          isContinuousMode: currentIsContinuousMode
        });
        
        if (latest.isFinal) {
          console.log('🎙️ Final speech result:', transcript);
          
          // Check for wake word patterns and process the entire message
          if (transcript.includes('hi pam') || transcript.includes('hey pam') || 
              transcript.includes('hello pam') || transcript.includes('hi palm') ||
              transcript.includes('hi bam') || transcript.includes('hey bam')) {
            console.log('✅ Wake word detected - activating PAM!');
            handleWakeWordDetected();
            
            // If there's more after the wake word, process it as a question
            const wakeWordPattern = /(hi|hey|hello)\s+(pam|palm|bam)\s+/i;
            const questionAfterWakeWord = transcript.replace(wakeWordPattern, '').trim();
            
            if (questionAfterWakeWord.length > 0 && currentIsContinuousMode) {
              console.log('🎯 Processing question after wake word:', questionAfterWakeWord);
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
            console.log('✅ PAM conversation detected in continuous mode!');
            handleContinuousConversation(transcript);
          }
          // Log when no match is found for debugging
          else {
            console.log('🔍 Speech detected but no wake word match:', transcript);
          }
        }
      };

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started successfully');
      };

      recognition.onerror = (event) => {
        console.error('⚠️ Speech recognition error:', {
          error: event.error,
          message: event.message,
          isWakeWordListening,
          isContinuousMode
        });
        
        if (event.error === 'not-allowed') {
          console.warn('⚠️ Microphone permission denied for speech recognition');
          addMessage("🚫 Microphone permission denied. Please allow microphone access for voice features.", "pam");
        } else if (event.error === 'no-speech') {
          console.log('🔇 No speech detected, will restart automatically');
        } else if (event.error === 'audio-capture') {
          console.warn('⚠️ Audio capture error - check microphone');
          addMessage("🎤 Microphone error. Please check your audio device.", "pam");
        } else if (event.error === 'network') {
          console.warn('⚠️ Network error in speech recognition');
          addMessage("🌐 Network error during speech recognition.", "pam");
        }
      };

      recognition.onend = () => {
        // Use current ref values for restart logic
        const currentIsWakeWordListening = isWakeWordListeningRef.current;
        const currentIsContinuousMode = isContinuousModeRef.current;
        const currentIsListening = isListeningRef.current;
        
        console.log('🔚 Speech recognition ended, checking restart conditions:', {
          isWakeWordListening: currentIsWakeWordListening,
          isContinuousMode: currentIsContinuousMode,
          isListening: currentIsListening
        });
        
        // Restart if wake word OR continuous mode is active AND not doing voice recording
        if ((currentIsWakeWordListening || currentIsContinuousMode) && !currentIsListening) {
          setTimeout(() => {
            try {
              recognition.start();
              console.log('🔄 Restarting speech recognition...');
            } catch (error) {
              console.warn('⚠️ Could not restart speech recognition:', error);
            }
          }, 100);
        }
      };

      setWakeWordRecognition(recognition);
      
      // Don't auto-start wake word detection - only start when user clicks continuous button
      // Remove automatic startup based on localStorage
      console.log('✅ Wake word detection initialized, but not started. User must click Continuous button to activate.');
    } catch (error) {
      console.warn('⚠️ Could not initialize wake word detection:', error);
    }
  };

  const startWakeWordListening = async (recognition?: any) => {
    // Request microphone permission first
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      console.warn('⚠️ Cannot start wake word detection without microphone permission');
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
      console.log('👂 Wake word detection started - say "Hi PAM" to activate');
      addMessage("👂 Wake word detection enabled. Say 'Hi PAM' to activate voice chat.", "pam", undefined, false);
    } catch (error) {
      console.warn('⚠️ Could not start wake word detection:', error);
      addMessage("❌ Could not start wake word detection. Please try again.", "pam");
    }
  };

  const stopWakeWordListening = () => {
    if (wakeWordRecognition) {
      wakeWordRecognition.stop();
      setIsWakeWordListening(false);
      localStorage.setItem('pam_wake_word_enabled', 'false');
      console.log('🔇 Wake word detection stopped');
    }
  };

  const handleWakeWordDetected = () => {
    // Open PAM if not already open
    if (!isOpen) {
      setIsOpen(true);
      console.log('📱 PAM opened by wake word');
    }
    
    // Don't automatically start continuous mode when wake word detected
    // The user should explicitly choose to start continuous mode via the button
    console.log('👂 Wake word "PAM" detected - PAM is now open and ready');
  };

  const handleContinuousConversation = async (transcript: string) => {
    console.log('🎙️ Processing continuous conversation transcript:', transcript);
    
    // If the transcript is already cleaned (passed from wake word detection), use it as-is
    // Otherwise, extract the actual question after "PAM/BAM" and clean it up
    let question = transcript;
    if (transcript.match(/\b(pam|palm|bam)\b/i)) {
      question = transcript.replace(/^.*?\b(pam|palm|bam)\s+/i, '').trim();
    }
    
    console.log('🎯 Extracted question:', question);
    
    if (question.length > 0) {
      // Send the question directly without relying on state
      console.log('🚀 Sending voice question to PAM...');
      setInputMessage(question); // Update UI to show what was said
      
      // Send message directly with the question
      handleSendMessage(question);
    } else {
      console.log('⚠️ No question extracted from transcript after wake word');
    }
  };

  // Add a new handler for direct speech input (without wake word in continuous mode)
  const handleDirectSpeechInput = async (transcript: string) => {
    console.log('🎙️ Processing direct speech input:', transcript);
    
    if (transcript.trim().length > 0) {
      // Send the transcript directly without relying on state
      console.log('🚀 Processing speech input through text chat...');
      setInputMessage(transcript); // Update UI to show what was said
      
      // Send message directly with the transcript
      handleSendMessage(transcript);
    }
  };

  // Voice settings handlers removed - using default settings

  const startContinuousVoiceMode = async () => {
    console.log('🔄 Starting continuous voice mode');
    
    // Request microphone permission and get the stream
    const permissionResult = await requestMicrophonePermission(true);
    if (!permissionResult || typeof permissionResult === 'boolean') {
      console.warn('⚠️ Cannot start continuous mode without microphone permission');
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
        console.log('✅ VAD initialized for continuous mode - advanced conversation management enabled');
      } catch (vadError) {
        console.warn('⚠️ VAD initialization failed, continuing without advanced conversation management:', vadError);
        console.log('ℹ️ Continuous mode will work normally, but without sophisticated turn-taking');
        setIsVADActive(false);
      }
      
      // Keep the stream open for audio level monitoring
      // Store stream reference for cleanup later
      audioStreamRef.current = stream;
    } catch (error) {
      console.warn('⚠️ Could not start audio level monitoring for continuous mode:', error);
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
    console.log('🔇 Stopping continuous voice mode');
    setIsContinuousMode(false);
    setVoiceStatus("idle");
    
    // Stop audio level monitoring and release microphone
    stopAudioLevelMonitoring();
    
    // Stop VAD
    await vadService.cleanup();
    setIsVADActive(false);
    console.log('🔇 VAD stopped and cleaned up');
    
    // Stop wake word listening when continuous mode is turned off
    stopWakeWordListening();
    
    addMessage("🔇 Continuous voice mode deactivated. Microphone access has been released.", "pam", undefined, false);
  };

  // Removed duplicate handleTextMessage function - now using handleSendMessage for all message sending

  // Simple voice output toggle - separate from continuous mode
  const toggleVoiceOutput = async () => {
    const currentVoiceEnabled = settings?.pam_preferences?.voice_enabled ?? true;
    const newVoiceEnabled = !currentVoiceEnabled;
    
    console.log('🔊 Toggling voice output:', currentVoiceEnabled, '->', newVoiceEnabled);
    
    try {
      await updateSettings({
        pam_preferences: {
          ...settings?.pam_preferences,
          voice_enabled: newVoiceEnabled
        }
      });
      
      // Provide feedback to user
      const message = newVoiceEnabled 
        ? "🔊 Voice responses enabled! PAM will now speak her responses."
        : "🔇 Voice responses disabled. PAM will respond silently.";
      
      addMessage(message, "pam", undefined, newVoiceEnabled); // Only speak if voice was just enabled
      
    } catch (error) {
      console.error('❌ Failed to update voice settings:', error);
      addMessage("❌ Failed to update voice settings. Please try again.", "pam");
    }
  };

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
          console.warn('⚠️ Cannot start voice recording without microphone permission');
          addMessage("🚫 Microphone permission needed for voice recording. Please allow microphone access.", "pam");
          return;
        }
        // Stop speech recognition while recording to avoid conflicts
        if (wakeWordRecognition) {
          try {
            wakeWordRecognition.stop();
            console.log('🔇 Stopped speech recognition for voice recording');
          } catch (error) {
            console.warn('⚠️ Could not stop speech recognition:', error);
          }
        }
        
        // Start recording
        setVoiceStatus("listening");
        console.log('🎤 Requesting microphone access...');
        
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
          console.log('🛑 Recording stopped, processing audio...');
          setVoiceStatus("processing");
          
          const audioBlob = new Blob(chunks, { type: recorder.mimeType });
          console.log('📦 Audio blob created:', audioBlob.size, 'bytes');
          
          await handleVoiceSubmission(audioBlob);
          
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('🔌 Audio track stopped');
          });
          
          // Stop audio level monitoring
          stopAudioLevelMonitoring();
          
          setVoiceStatus("idle");
        };

        recorder.onerror = (event) => {
          console.error('❌ MediaRecorder error:', event);
          setVoiceStatus("error");
          addMessage("Recording error occurred. Please try again.", "pam");
        };

        recorder.start();
        setMediaRecorder(recorder);
        setAudioChunks(chunks);
        setIsListening(true);
        
        // Setup audio level monitoring
        await setupAudioLevelMonitoring(stream);
        
        console.log('🎤 Started voice recording');
        addMessage("🟢 Recording... Click the green microphone to stop recording.", "pam");
        
        // Auto-stop after 30 seconds to prevent infinite recording
        setTimeout(() => {
          if (isListening && recorder.state === 'recording') {
            console.log('⏰ Auto-stopping recording after 30 seconds');
            recorder.stop();
            setIsListening(false);
          }
        }, 30000);
        
      } else {
        // Stop recording
        console.log('🛑 Stopping voice recording...');
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsListening(false);
        }
        // Stop audio level monitoring
        stopAudioLevelMonitoring();
      }
    } catch (error) {
      console.error('❌ Voice recording error:', error);
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
      console.log('🎤 Processing voice message...', `${audioBlob.size} bytes`);
      setIsProcessingVoice(true);
      
      // Remove the temporary processing message and add a better one
      const processingMessage = addMessage("🎤 Processing your voice message...", "pam");

      const formData = new FormData();
      formData.append('audio', audioBlob, `recording.${audioBlob.type.includes('webm') ? 'webm' : 'mp4'}`);

      console.log('📤 Sending audio to backend via /api/v1/pam/voice...');
      console.log('📦 FormData contains:', formData.get('audio'));
      
      const response = await authenticatedFetch('/api/v1/pam/voice', {
        method: 'POST',
        body: formData
      });
      
      console.log('📥 Voice API response status:', response.status, response.statusText);

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        console.log('📥 Response received, content-type:', contentType);
        
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
          
          console.log(`✅ Voice response received via ${pipeline}`);
          console.log('📝 Transcription:', transcription);
          console.log('🤖 Response:', responseText);
          
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
                console.log('🔊 Playing audio response in continuous mode...');
                audio.oncanplaythrough = () => {
                  audio.play().catch(err => {
                    console.warn('⚠️ Could not play audio:', err);
                    addMessage("(Audio response ready but playback failed)", "pam");
                  });
                };
                vadService.setPAMSpeaking(true);
              } else {
                console.log('🔇 VAD determined not appropriate time to speak - audio ready for manual play');
              }
            });
          } else {
            console.log('🔇 Auto-play disabled - audio ready for manual activation');
            // Store audio for manual playback but don't auto-play
            setCurrentAudio(audio);
          }
          
          audio.onerror = (err) => {
            console.warn('⚠️ Audio playback error:', err);
            addMessage("(Audio response received but playback failed)", "pam");
          };
          
          // Cleanup audio URL after playback
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            console.log('🔄 Audio playback completed');
          };
          
        } else {
          // Backend returned JSON (fallback or error)
          const data = await response.json();
          console.log('📝 Voice response received as JSON:', data);
          
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
            console.log(`🔧 Voice pipeline: ${data.pipeline}`);
          }
          if (data.technical_details) {
            console.log(`🔍 Technical details: ${data.technical_details}`);
          }
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Voice API response error:', response.status, response.statusText);
        console.error('❌ Voice API error details:', errorText);
        
        // Remove processing message
        setMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
        addMessage("Sorry, I had trouble processing your voice message. Please try again.", "pam");
      }
    } catch (error) {
      console.error('❌ Voice submission error:', error);
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
      
      console.log('🎵 Audio level monitoring setup successful');
      setIsShowingAudioLevel(true);
      
      // Start monitoring loop
      monitorAudioLevel();
      
    } catch (error) {
      console.warn('⚠️ Audio level monitoring setup failed:', error);
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
        console.log('🔌 Audio stream track stopped');
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
    
    console.log('🔇 Audio level monitoring stopped');
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
        console.log('📅 Processing calendar request:', { userMessage, pamResponse: content });
        
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
        
        console.log('📅 Creating calendar event:', eventData);
        
        const result = await pamCalendarService.createCalendarEvent(eventData);
        
        if (result.success) {
          console.log('✅ Calendar event created successfully:', result);
          setTimeout(() => {
            addMessage(`✅ **Done!** I've created "${title}" in your calendar for ${date} at ${time}. Check the Calendar tab to see it!`, "pam");
          }, 1000);
        } else {
          console.error('❌ Calendar event creation failed:', result);
          setTimeout(() => {
            addMessage(`⚠️ I had trouble creating the calendar event: ${result.message}`, "pam");
          }, 1000);
        }
      }
    } catch (error) {
      console.error('❌ Calendar processing error:', error);
    }
  };

  // Process PAM responses for feedback and issue reporting
  const processFeedbackActions = async (content: string, userMessage: string) => {
    try {
      console.log('🔧 Checking for feedback intent in message:', userMessage);
      
      // Check if this is feedback-related using the service
      if (pamFeedbackService.detectFeedbackIntent(userMessage)) {
        console.log('📝 Feedback intent detected, processing...');
        
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
      console.error('❌ Feedback processing error:', error);
    }
  };

  // Function to speak PAM's messages using TTS with simplified activation
  const speakMessage = async (content: string, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal', forceSpeak: boolean = false) => {
    console.log('🔊 Voice request - Priority:', priority, 'Force speak:', forceSpeak);
    
    // Check if voice is enabled in user settings - consistent with addMessage default
    const isVoiceEnabled = settings?.pam_preferences?.voice_enabled ?? true;
    if (!isVoiceEnabled) {
      console.log('🔇 Voice is disabled in user settings');
      return;
    }

    // If forceSpeak is true, always proceed (for explicit user voice requests)
    // If forceSpeak is false, only speak if voice is enabled (normal PAM responses)
    if (!forceSpeak && !isVoiceEnabled) {
      console.log('🔇 Voice not requested and not enabled in settings');
      return;
    }

    console.log('🎵 Speaking PAM response with priority:', priority);

    try {
      // Clean the content for TTS (remove emojis and markdown)
      const cleanContent = content
        .replace(/[🤖🎤🚫🔇🎙️✅❌⚠️🔊💡🔧👂🌐🟢]/g, '') // Remove emojis
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
        .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
        .replace(/`(.*?)`/g, '$1') // Remove code blocks
        .trim();

      if (cleanContent.length === 0) {
        console.log('🔇 No content to speak after cleaning');
        return;
      }

      // Use TTS Queue Manager to handle speech
      if (ttsQueueRef.current) {
        ttsQueueRef.current.enqueue({
          content: cleanContent,
          priority,
          context: 'general',
          onComplete: () => {
            console.log('✅ Speech completed');
            vadService.setPAMSpeaking(false);
          },
          onError: (error) => {
            console.error('❌ Speech error:', error);
            vadService.setPAMSpeaking(false);
          }
        });
        
        vadService.setPAMSpeaking(true);
      } else {
        console.error('❌ TTS Queue Manager not initialized');
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

      console.log('🎵 Voice response received:', voiceResponse);

      // Use audio manager to prevent WebMediaPlayer overflow
      const audio = audioManager.getAudio(voiceResponse.audioUrl);
      setCurrentAudio(audio);

      // Set up audio event listeners
      audio.addEventListener('ended', () => {
        console.log('✅ Voice playback completed');
        setIsSpeaking(false);
        vadService.setPAMSpeaking(false);
        setCurrentAudio(null);
        // Audio manager handles URL cleanup
      });

      audio.addEventListener('error', (error) => {
        console.warn('🔊 Voice playback error:', error);
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
          console.log('✅ Voice playback started (VAD-controlled)');
        } else {
          console.log('🔇 VAD determined not appropriate time to speak - skipping TTS playback');
          setIsSpeaking(false);
          vadService.setPAMSpeaking(false);
          setCurrentAudio(null);
          
        }
      } else {
        // Normal manual TTS playback (user clicked a voice button)
        await audio.play();
        console.log('✅ Voice playback started (manual)');
      }

    } catch (error) {
      console.warn('🔊 Voice synthesis failed:', error);
      setIsSpeaking(false);
      vadService.setPAMSpeaking(false);
      setCurrentAudio(null);
      
      // Show user-friendly error notification for voice failures
      if (error instanceof Error && error.message.includes('generate')) {
        console.log('ℹ️ Voice generation temporarily unavailable - continuing with text response');
      }
    }
  };

  const stopSpeaking = () => {
    if (currentAudio && !currentAudio.paused) {
      console.log('🔇 User stopped PAM voice playback');
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsSpeaking(false);
      vadService.setPAMSpeaking(false);
      setCurrentAudio(null);
    }
  };

  const addMessage = (content: string, sender: "user" | "pam", triggeredByUserMessage?: string, shouldSpeak?: boolean, voicePriority?: 'low' | 'normal' | 'high' | 'urgent'): PamMessage => {
    // Auto-determine shouldSpeak based on user settings for PAM messages
    // Default to true for PAM if settings aren't loaded yet (fallback)
    const voiceEnabled = settings?.pam_preferences?.voice_enabled ?? true; // Default to enabled
    const finalShouldSpeak = shouldSpeak !== undefined 
      ? shouldSpeak 
      : (sender === "pam" && voiceEnabled);
    
    console.log('🔊 addMessage voice decision:', {
      sender,
      explicitShouldSpeak: shouldSpeak,
      voiceEnabled,
      settingsLoaded: !!settings,
      finalShouldSpeak
    });
    
    const newMessage: PamMessage = {
      id: Date.now().toString(),
      content,
      sender,
      timestamp: new Date().toISOString(),
      shouldSpeak: finalShouldSpeak,
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
        console.log('🔊 PAM message marked for speech - shouldSpeak:', newMessage.shouldSpeak, 'priority:', newMessage.voicePriority);
        speakMessage(content, newMessage.voicePriority || 'normal', true);
      } else if (sender === "pam") {
        console.log('🔇 PAM message added without voice - shouldSpeak:', newMessage.shouldSpeak);
      }
      
      // ROBUST MEMORY: Save to localStorage on every message
      try {
        localStorage.setItem(`pam_conversation_${user?.id}`, JSON.stringify({
          messages: updatedMessages.slice(-10), // Keep last 10 messages
          sessionId,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.warn('⚠️ Could not save message to localStorage:', error);
      }
      
      return updatedMessages;
    });
    
    return newMessage;
  };

  const handleSendMessage = async (messageOverride?: string) => {
    const messageToSend = messageOverride || inputMessage;
    
    if (!messageToSend?.trim()) {
      console.warn('⚠️ PAM DEBUG: Attempted to send empty message');
      return;
    }
    
    const message = messageToSend.trim();
    const sendStartTime = Date.now();
    
    // Track baseline metrics
    trackPAMMetrics.baseline.record('message');
    
    addMessage(message, "user");
    // Note: PAM backend automatically saves all conversation history
    
    // Clear input regardless of source
    setInputMessage("");

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
      console.log('📍 Location-based query detected, requesting location proactively');
      const location = await requestUserLocation();
      
      if (location) {
        // Update context with precise location
        setUserContext(prev => ({
          ...prev,
          current_location: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
        }));
      } else {
        // Fallback to approximate location detection
        console.log('📍 Precise location failed, trying fallback detection');
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
      message,  // Backend expects 'message' not 'content'
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

    // Use enhanced PAM WebSocket service with voice integration and error recovery
    try {
      console.log('📤 Sending message via enhanced pamService...');
      
      const messageId = await pamWebSocket.sendMessage(message, {
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
      });
      
      // Store message send time for response tracking
      window.pamMessageTracking = window.pamMessageTracking || {};
      if (typeof messageId === 'string') {
        window.pamMessageTracking[messageId] = { 
          sendTime: sendStartTime, 
          type: 'text' 
        };
      }
      
      console.log('✅ Message sent successfully via pamService, ID:', messageId);
      
      // Track successful message send
      trackPAMMetrics.messageResponse(Date.now() - sendStartTime, true, 'text');
      
    } catch (error) {
      console.error('❌ Failed to send message via pamService:', error);
      
      // Track failed message send
      trackPAMMetrics.messageResponse(Date.now() - sendStartTime, false, 'text', error.message);
      
      // Show user-friendly error (pamService handles toast notifications, but add backup message)
      addMessage("I'm experiencing connection issues. Please try again or check your internet connection.", "pam");
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
      console.log('🧹 PAM component unmounting - cleaning up resources...');
      
      // Clear timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Disconnect PAM service (pamService handles proper cleanup)
      pamWebSocket.disconnect();
      console.log('🔌 PAM service disconnected during cleanup');
      
      // Stop all voice-related activities and release microphone
      stopAudioLevelMonitoring();
      stopWakeWordListening();
      
      // Clean up audio manager
      audioManager.stopAll();
      console.log('🎵 Audio manager stats:', audioManager.getStats());
      
      // Stop any active media recording
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      
      console.log('✅ PAM cleanup completed - microphone released');
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
                  onClick={toggleVoiceOutput}
                  className={`flex items-center gap-2 w-full p-2 text-left text-xs rounded-lg ${
                    (settings?.pam_preferences?.voice_enabled ?? true) ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {(settings?.pam_preferences?.voice_enabled ?? true) ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  {(settings?.pam_preferences?.voice_enabled ?? true) ? "🔊 Voice Responses ON" : "🔇 Voice Responses OFF"}
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
                    console.log('🧪 PAM DIAGNOSTIC: Starting full diagnostic...');
                    
                    // Check authentication
                    const { data: { session } } = await supabase.auth.getSession();
                    console.log('🧪 Session details:');
                    console.log('  - Has session:', !!session);
                    console.log('  - Has access_token:', !!session?.access_token);
                    console.log('  - Token length:', session?.access_token?.length || 0);
                    console.log('  - Token parts:', session?.access_token?.split('.').length);
                    console.log('  - User email:', user?.email);
                    console.log('  - User ID:', user?.id);
                    
                    // Test backend health
                    try {
                      const healthResponse = await fetch('https://wheels-wins-backend-staging.onrender.com/health');
                      console.log('🧪 Backend health:', healthResponse.ok ? 'HEALTHY' : 'UNHEALTHY');
                    } catch (error) {
                      console.log('🧪 Backend health: ERROR', error);
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
                        console.log('🧪 PAM API test:', testResponse.ok ? 'SUCCESS' : 'FAILED');
                        if (!testResponse.ok) {
                          const errorText = await testResponse.text();
                          console.log('🧪 PAM API error:', errorText);
                        } else {
                          const data = await testResponse.json();
                          console.log('🧪 PAM API response:', data);
                        }
                      } catch (apiError) {
                        console.log('🧪 PAM API exception:', apiError);
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
                  {/* Speaking indicator for the most recent PAM message */}
                  {msg.sender === "pam" && isSpeaking && messages[messages.length - 1]?.id === msg.id && (
                    <div className="flex items-center mt-1 text-xs text-blue-600">
                      <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
                      <span>speaking...</span>
                    </div>
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
                className="p-2 rounded-lg transition-colors relative flex-shrink-0 bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 animate-pulse"
                title="🔇 Stop PAM voice"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <VolumeX className="w-4 h-4" />
                  <span className="text-xs font-medium">Stop</span>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-ping" />
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
                    {connectionStatus === "Connected" ? "🟢 Enhanced PAM Service" : 
                     connectionStatus === "Connecting" ? "🟡 Connecting..." : "🔴 Offline"}
                  </p>
                  {/* Voice Recovery Status */}
                  {pamWebSocket.voiceRecovery && (
                    <p className={`text-xs ${
                      pamWebSocket.voiceRecovery.status === 'healthy' ? 'text-green-600' :
                      pamWebSocket.voiceRecovery.status === 'degraded' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      🎙️ {pamWebSocket.voiceRecovery.isRecovering ? 'Recovering Voice...' : 
                          pamWebSocket.voiceRecovery.fallbackMode === 'text-only' ? 'Text Only Mode' :
                          pamWebSocket.voiceRecovery.fallbackMode === 'silent' ? 'Voice Silent' :
                          'Voice Ready'}
                    </p>
                  )}
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
                    onClick={toggleVoiceOutput}
                    className={`flex items-center gap-2 w-full p-2 text-left text-xs rounded-lg ${
                      (settings?.pam_preferences?.voice_enabled ?? true) ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {(settings?.pam_preferences?.voice_enabled ?? true) ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    {(settings?.pam_preferences?.voice_enabled ?? true) ? "🔊 Voice Responses ON" : "🔇 Voice Responses OFF"}
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
                      console.log('🧪 PAM DIAGNOSTIC: Starting full diagnostic...');
                      
                      // Check authentication  
                      const { data: { session } } = await supabase.auth.getSession();
                      console.log('🧪 Session details:');
                      console.log('  - Has session:', !!session);
                      console.log('  - Has access_token:', !!session?.access_token);
                      console.log('  - Token length:', session?.access_token?.length || 0);
                      console.log('  - Token parts:', session?.access_token?.split('.').length);
                      console.log('  - User email:', user?.email);
                      console.log('  - User ID:', user?.id);
                      
                      // Test backend health
                      try {
                        const healthResponse = await fetch('https://wheels-wins-backend-staging.onrender.com/health');
                        console.log('🧪 Backend health:', healthResponse.ok ? 'HEALTHY' : 'UNHEALTHY');
                      } catch (error) {
                        console.log('🧪 Backend health: ERROR', error);
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
                          console.log('🧪 PAM API test:', testResponse.ok ? 'SUCCESS' : 'FAILED');
                          if (!testResponse.ok) {
                            const errorText = await testResponse.text();
                            console.log('🧪 PAM API error:', errorText);
                          } else {
                            const data = await testResponse.json();
                            console.log('🧪 PAM API response:', data);
                          }
                        } catch (apiError) {
                          console.log('🧪 PAM API exception:', apiError);
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
                    {/* Speaking indicator for the most recent PAM message */}
                    {msg.sender === "pam" && isSpeaking && messages[messages.length - 1]?.id === msg.id && (
                      <div className="flex items-center mt-1 text-xs text-blue-600">
                        <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
                        <span>speaking...</span>
                      </div>
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
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
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
                  className="p-2 rounded-lg transition-colors relative flex-shrink-0 bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 animate-pulse"
                  title="🔇 Stop PAM voice"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <VolumeX className="w-4 h-4" />
                    <span className="text-xs font-medium">Stop</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-ping" />
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

// Enhanced Pam with Error Boundary
const PamWithErrorBoundary: React.FC<PamProps> = (props) => (
  <PamErrorBoundary
    onError={(error, errorInfo) => {
      console.error('🚨 PAM Error Boundary: Component crashed', {
        error: error.message,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
      
      // Track error for analytics
      if (window.gtag) {
        window.gtag('event', 'pam_error', {
          event_category: 'error',
          event_label: error.message,
          value: 1,
        });
      }
    }}
    showRetryButton={true}
    maxRetries={3}
  >
    <Pam {...props} />
  </PamErrorBoundary>
);

export default PamWithErrorBoundary;
