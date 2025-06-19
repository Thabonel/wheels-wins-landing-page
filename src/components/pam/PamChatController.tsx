
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { useRegion } from "@/context/RegionContext";
import { usePamWebSocket } from "@/hooks/usePamWebSocket";
import { IntentClassifier } from "@/utils/intentClassifier";
import { usePamSession } from "@/hooks/usePamSession";
import { ChatMessage } from "./types";
import PamMobileChat from "./PamMobileChat";
import PamFloatingButton from "./PamFloatingButton";

// Define excluded routes where Pam chat should not be shown (unless mobile)
const EXCLUDED_ROUTES = ["/", "/profile"];

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

  // Use WebSocket connection to our new PAM backend
  const { isConnected, sendMessage: sendWebSocketMessage, messages: wsMessages, connect } = usePamWebSocket();

  // Handle WebSocket messages from our new backend
  useEffect(() => {
    if (wsMessages.length > 0) {
      const latestMessage = wsMessages[wsMessages.length - 1];
      
      switch (latestMessage.type) {
        case 'chat_response':
          const pamMessage: ChatMessage = {
            sender: "pam",
            content: latestMessage.message || "I'm processing your request...",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, pamMessage]);
          setIsProcessing(false);
          break;
          
        case 'ui_actions':
          // UI actions are handled in the usePamWebSocket hook
          break;
          
        case 'error':
          const errorMessage: ChatMessage = {
            sender: "pam",
            content: `❌ ${latestMessage.message}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsProcessing(false);
          break;

        case 'connection':
          const connectionMessage: ChatMessage = {
            sender: "pam",
            content: latestMessage.message || "Connected to PAM backend",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, connectionMessage]);
          break;
      }
    }
  }, [wsMessages]);

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

    // Use WebSocket-only approach (no more N8N fallback)
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
        console.warn('WebSocket message failed, attempting reconnection...');
        connect();
        setIsProcessing(false);
      }
    } else {
      console.warn('⚠️ PAM WebSocket not connected, attempting connection...');
      connect();
      
      const connectingMessage: ChatMessage = {
        sender: "pam",
        content: "🔄 Connecting to PAM backend... Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, connectingMessage]);
      setIsProcessing(false);
    }
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

  // Add initial welcome message
  useEffect(() => {
    if (user?.id && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        sender: "pam",
        content: `🤖 Hi! I'm PAM with ${isConnected ? 'intelligent backend' : 'basic'} capabilities. I can help you manage expenses, plan trips, and more. Try saying: "I spent $25 on fuel" or "Show my budget"`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
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
