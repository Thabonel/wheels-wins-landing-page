
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { useRegion } from "@/context/RegionContext";
import { usePamWebSocketConnection } from "@/hooks/pam/usePamWebSocketConnection";
import { pamApiService } from "@/services/pamApiService";
import { IntentClassifier } from "@/utils/intentClassifier";
import { usePamSession } from "@/hooks/usePamSession";
import { ChatMessage } from "./types";
import PamMobileChat from "./PamMobileChat";
import PamFloatingButton from "./PamFloatingButton";

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

    // Try WebSocket first, then HTTP API, finally demo mode
    if (isConnected) {
      console.log('📤 Sending message via PAM WebSocket backend');
      const messageSent = sendWebSocketMessage({
        type: 'chat',
        message: cleanMessage,
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

  return (
    <>
      {/* Mobile floating button */}
      <div className="md:hidden fixed bottom-6 right-4 z-40">
        {isMobileOpen ? (
          <PamMobileChat
            isOpen={isMobileOpen}
            onClose={() => setIsMobileOpen(false)}
            messages={messages}
            isProcessing={isProcessing}
            isConnected={isConnected}
            onSendMessage={sendMessage}
            onQuickAction={handleQuickAction}
          />
        ) : (
          <PamFloatingButton
            onClick={() => setIsMobileOpen(true)}
            isConnected={isConnected}
          />
        )}
      </div>
    </>
  );
};

export default PamChatController;
