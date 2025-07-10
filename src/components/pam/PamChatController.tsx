
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { useRegion } from "@/context/RegionContext";
import { usePamWebSocketConnection } from "@/hooks/pam/usePamWebSocketConnection";
import { pamApiService } from "@/services/pamApiService";
import { IntentClassifier } from "@/utils/intentClassifier";
import { usePamSession } from "@/hooks/usePamSession";
import { mundiService } from "@/services/mundiService";
import { ChatMessage } from "./types";
import PamMobileChat from "./PamMobileChat";
import PamFloatingButton from "./PamFloatingButton";
import UnifiedVoiceSystem from "@/components/voice/UnifiedVoiceSystem";

// Define excluded routes where Pam chat should not be shown (unless mobile)
const EXCLUDED_ROUTES = ["/", "/profile"];

// Fallback responses for when WebSocket is not connected
const DEMO_RESPONSES = [
  "I'm running in demo mode right now. I can still help you with basic information!",
  "Demo mode is active. While I can't access live data, I can provide general guidance.",
  "I'm in offline mode, but I can still assist with general questions and tips.",
  "Demo mode: I'm here to help with basic queries while the backend connects.",
  "Running in demo mode. I can provide general assistance and helpful tips!"
];

const PamChatController = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const { region } = useRegion();
  const { sessionData, updateSession } = usePamSession(user?.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  const isExcluded = EXCLUDED_ROUTES.includes(pathname);
  const isMobile = window.innerWidth < 768;

  // Use real WebSocket connection to PAM backend
  const { token } = useAuth();
  const { isConnected, sendMessage: sendWebSocketMessage } = usePamWebSocketConnection({
    userId: user?.id || 'anonymous',
    token,
    onMessage: (message) => {
      console.log('📨 Received PAM message:', message);
      // Handle incoming WebSocket messages
      let content = "Processing...";
      
      if (typeof message === 'string') {
        content = message;
      } else if (message.message) {
        content = message.message;
      } else if (message.content) {
        content = message.content;
      } else if (message.response) {
        content = message.response;
      }
      
      const pamMessage: ChatMessage = {
        sender: "pam",
        content,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, pamMessage]);
      setIsProcessing(false);
    },
    onStatusChange: (connected) => {
      console.log('🔗 PAM WebSocket connection status:', connected ? 'Connected' : 'Disconnected');
    }
  });


  const generateDemoResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('expense') || lowerMessage.includes('spent') || lowerMessage.includes('cost')) {
      return "💰 I'd normally help you track that expense, but I'm in demo mode. Try: 'I spent $25 on fuel' when I'm fully connected!";
    }
    
    if (lowerMessage.includes('budget') || lowerMessage.includes('money')) {
      return "📊 In demo mode, I can't access your live budget data. When connected, I can show you detailed budget insights and spending patterns!";
    }
    
    if (lowerMessage.includes('trip') || lowerMessage.includes('travel') || lowerMessage.includes('drive')) {
      return "🚗 I'd love to help plan your trip! In demo mode, I can't access live route data, but when connected I can provide detailed travel planning and fuel estimates.";
    }
    
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      return "🤖 I'm PAM, your AI assistant! I can help with expenses, budgets, trip planning, and more. I'm currently in demo mode - try connecting to the backend for full functionality!";
    }
    
    // Return random demo response
    return DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
  };

  const sendMessage = async (message: string) => {
    if (isOffline) return;

    if (!user?.id) {
      console.error("No authenticated user ID – cannot send to PAM");
      const errorMessage: ChatMessage = {
        sender: "pam",
        content: "Please log in to chat with PAM.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    const cleanMessage = message?.trim();
    if (!cleanMessage) {
      console.error("Message is empty or undefined");
      return;
    }

    const userMessage: ChatMessage = {
      sender: "user",
      content: cleanMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    // Classify the intent for session tracking
    const intentResult = IntentClassifier.classifyIntent(cleanMessage);
    updateSession(intentResult.type);

    // Check if this is a Mundi geospatial query
    const lowerMessage = cleanMessage.toLowerCase();
    if (lowerMessage.includes("route") || lowerMessage.includes("find") || lowerMessage.includes("near") || 
        lowerMessage.includes("map") || lowerMessage.includes("location") || lowerMessage.includes("camping") ||
        lowerMessage.includes("rv park") || lowerMessage.includes("directions") || lowerMessage.includes("navigate")) {
      
      console.log('🗺️ Detected geospatial query, routing to Mundi AI...');
      await handleMundiQuery(cleanMessage, user.id);
      return;
    }

    // Try WebSocket first, then HTTP API, finally demo mode
    if (isConnected) {
      console.log('📤 Sending message via PAM WebSocket backend');
      const messageSent = sendWebSocketMessage({
        type: 'chat',
        content: cleanMessage,  // Fixed: backend expects 'content' not 'message'
        user_id: user.id,
        context: {
          region,
          current_page: pathname,
          session_data: sessionData
        }
      });

      if (!messageSent) {
        console.warn('WebSocket message failed, trying HTTP fallback...');
        await tryHttpFallback(cleanMessage, user.id);
      }
    } else {
      console.log('🔄 WebSocket not connected, trying HTTP API...');
      await tryHttpFallback(cleanMessage, user.id);
    }
  };

  const tryHttpFallback = async (message: string, userId: string) => {
    try {
      const response = await pamApiService.sendMessage({
        message,
        user_id: userId,
        context: {
          region,
          current_page: pathname,
          session_data: sessionData
        }
      }, token);

      const content = response.response || response.message || response.content;
      if (content) {
        const apiResponse: ChatMessage = {
          sender: "pam",
          content,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, apiResponse]);
        setIsProcessing(false);
        return;
      }
    } catch (error) {
      console.warn('❌ PAM HTTP API failed, using demo mode:', error);
    }

    // Final fallback to demo mode
    setTimeout(() => {
      const demoResponse: ChatMessage = {
        sender: "pam",
        content: generateDemoResponse(message),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, demoResponse]);
      setIsProcessing(false);
    }, 500);
  };

  const handleMundiQuery = async (message: string, userId: string) => {
    try {
      console.log('🗺️ Querying Mundi AI for geospatial insights...');
      
      // Query Mundi AI with user context
      const response = await mundiService.queryMundi({
        prompt: message,
        context: {
          user_id: userId,
          region,
          current_page: pathname,
          session_data: sessionData
        }
      });

      if (response.success && response.data) {
        // Display Mundi response to user
        const mundiMessage: ChatMessage = {
          sender: "pam",
          content: `🗺️ Here's what I found: ${response.data.response || 'Processing your geospatial query...'}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, mundiMessage]);

        // Show results on map if we have geospatial data
        if (response.data.features || response.data.geometry || response.data.locations) {
          showOnMap(response.data);
          
          // Add map notification message
          const mapMessage: ChatMessage = {
            sender: "pam",
            content: "📍 I've highlighted the results on the map! Navigate to the Wheels section to see the interactive map with your requested locations.",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, mapMessage]);
        }
      } else {
        // Fallback if Mundi query fails
        const errorMessage: ChatMessage = {
          sender: "pam",
          content: `🗺️ I couldn't connect to the geospatial service right now, but I can still help with general travel advice! ${response.error ? `Error: ${response.error}` : ''}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('❌ Mundi query failed:', error);
      const errorMessage: ChatMessage = {
        sender: "pam",
        content: "🗺️ I'm having trouble accessing geospatial data right now, but I can still help with general travel planning advice!",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const showOnMap = (data: any) => {
    console.log('🗺️ Displaying Mundi results on map:', data);
    
    // Store Mundi data in session storage for map components to access
    const mundiData = {
      timestamp: Date.now(),
      query_id: `mundi_${Date.now()}`,
      features: data.features || [],
      geometry: data.geometry,
      locations: data.locations || [],
      routes: data.routes || [],
      pois: data.pois || [],
      metadata: {
        source: 'mundi_ai',
        user_id: user?.id,
        query: data.original_query || 'geospatial_query'
      }
    };
    
    // Store in session storage for map components to access
    sessionStorage.setItem('mundi_map_data', JSON.stringify(mundiData));
    
    // Dispatch custom event to notify map components
    const event = new CustomEvent('mundi-data-available', {
      detail: mundiData
    });
    window.dispatchEvent(event);
    
    console.log('📍 Mundi data stored and event dispatched for map visualization');
  };

  const handleQuickAction = (action: string) => {
    const quickActions: Record<string, string> = {
      'add_expense': "I spent $25 on fuel today",
      'check_budget': "Show my budget status",
      'plan_trip': "Help me plan a trip",
      'add_groceries': "Add $50 groceries expense"
    };
    
    if (quickActions[action]) {
      sendMessage(quickActions[action]);
    }
  };

  // Add initial welcome message and run health check
  useEffect(() => {
    if (user?.id && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        sender: "pam",
        content: `🤖 Hi! I'm PAM, your AI assistant. I'm ${isConnected ? 'fully connected' : 'connecting to backend'}. I can help you manage expenses, plan trips, and more. Try saying: "I spent $25 on fuel" or "Show my budget"`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      
      // Run initial health check
      console.log('🏥 Running PAM health check...');
    }
  }, [user?.id, messages.length, isConnected]);

  // Listen for voice responses from MicButton
  useEffect(() => {
    const handleVoiceResponse = (event: CustomEvent) => {
      console.log('🎙️ Received voice response:', event.detail);
      const { transcription, response, voiceReady } = event.detail;
      
      // Add user transcription to chat
      if (transcription) {
        const userMessage: ChatMessage = {
          sender: "user",
          content: `🎤 ${transcription}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
      }
      
      // Add PAM response to chat
      if (response) {
        const pamMessage: ChatMessage = {
          sender: "pam", 
          content: response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, pamMessage]);
        setIsProcessing(false);
      }
    };

    window.addEventListener('pam-voice-response', handleVoiceResponse as EventListener);
    
    return () => {
      window.removeEventListener('pam-voice-response', handleVoiceResponse as EventListener);
    };
  }, []);

  // Voice system handlers
  const handleVoiceTranscription = (text: string, isFinal: boolean) => {
    if (isFinal) {
      const userMessage: ChatMessage = {
        sender: "user",
        content: `🎙️ ${text}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setIsProcessing(true);
    }
  };

  const handleVoiceResponse = (response: string) => {
    const pamMessage: ChatMessage = {
      sender: "pam",
      content: response,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, pamMessage]);
    setIsProcessing(false);
  };

  const handleVoiceTurnDetected = (userTurnEnded: boolean) => {
    if (userTurnEnded) {
      console.log('🔄 User finished speaking - PAM can respond');
    }
  };

  return (
    <>
      {/* Mobile floating button */}
      <div className="md:hidden fixed bottom-6 right-4 z-40">
        {isMobileOpen ? (
          <div className="flex flex-col space-y-2">
            <PamMobileChat
              isOpen={isMobileOpen}
              onClose={() => setIsMobileOpen(false)}
              messages={messages}
              isProcessing={isProcessing}
              isConnected={isConnected}
              onSendMessage={sendMessage}
              onQuickAction={handleQuickAction}
            />
            
            {/* Voice System for Mobile */}
            <div className="bg-white rounded-lg shadow-lg border p-3">
              <UnifiedVoiceSystem
                onTranscription={handleVoiceTranscription}
                onResponse={handleVoiceResponse}
                onTurnDetected={handleVoiceTurnDetected}
                mode="button"
                className="w-full"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            <PamFloatingButton
              onClick={() => setIsMobileOpen(true)}
              isConnected={isConnected}
            />
            
            {/* Voice System Button for Mobile */}
            <div className="bg-white rounded-full shadow-lg border p-2">
              <UnifiedVoiceSystem
                onTranscription={handleVoiceTranscription}
                onResponse={handleVoiceResponse}
                onTurnDetected={handleVoiceTurnDetected}
                mode="button"
                className="scale-75"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PamChatController;
