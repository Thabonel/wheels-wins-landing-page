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

// Excluded routes where Pam chat should not be shown (unless mobile)
const EXCLUDED_ROUTES = ["/", "/profile"];

// Fallback demo responses
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

  // Use WebSocket-based PAM connection
  const { isConnected, messages: wsMessages, sendMessage: sendWebSocketMessage } = usePamWebSocket();

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (wsMessages.length === 0) return;
    const latest = wsMessages[wsMessages.length - 1];

    if (latest.role === 'assistant') {
      const pamMsg: ChatMessage = {
        sender: 'pam',
        content: latest.content,
        timestamp: new Date(latest.timestamp),
      };
      setMessages(prev => [...prev, pamMsg]);
      setIsProcessing(false);
    }

    if (latest.role === 'error') {
      const errMsg: ChatMessage = {
        sender: 'pam',
        content: `❌ ${latest.content}`,
        timestamp: new Date(latest.timestamp),
      };
      setMessages(prev => [...prev, errMsg]);
      setIsProcessing(false);
    }
  }, [wsMessages]);

  const generateDemoResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();
    if (lower.includes('expense') || lower.includes('spent') || lower.includes('cost')) {
      return "💰 I'd normally help you track that expense, but I'm in demo mode. Try: 'I spent $25 on fuel' when I'm fully connected!";
    }
    if (lower.includes('budget') || lower.includes('money')) {
      return "📊 In demo mode, I can't access your live budget data. When connected, I can show you detailed budget insights and spending patterns!";
    }
    if (lower.includes('trip') || lower.includes('travel') || lower.includes('drive')) {
      return "🚗 I'd love to help plan your trip! In demo mode, I can't access live route data, but when connected I can provide detailed travel planning and fuel estimates.";
    }
    if (lower.includes('help') || lower.includes('what can you do')) {
      return "🤖 I'm PAM, your AI assistant! I can help with expenses, budgets, trip planning, and more. I'm currently in demo mode - try connecting to the backend for full functionality!";
    }
    return DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
  };

  const sendMessage = async (text: string) => {
    if (isOffline) return;
    if (!user?.id) {
      setMessages(prev => [...prev, { sender: 'pam', content: 'Please log in to chat with PAM.', timestamp: new Date() }]);
      return;
    }
    const content = text.trim();
    if (!content) return;

    setMessages(prev => [...prev, { sender: 'user', content, timestamp: new Date() }]);
    setIsProcessing(true);

    // Track intent
    const intent = IntentClassifier.classifyIntent(content);
    updateSession(intent.type);

    if (isConnected) {
      console.log('Sending via WebSocket');
      sendWebSocketMessage(content);
    } else {
      console.log('Demo mode fallback');
      setTimeout(() => {
        setMessages(prev => [...prev, { sender: 'pam', content: generateDemoResponse(content), timestamp: new Date() }]);
        setIsProcessing(false);
      }, 500);
    }
  };

  const handleQuickAction = (action: string) => {
    const actions: Record<string, string> = {
      add_expense: 'I spent $25 on fuel today',
      check_budget: 'Show my budget status',
      plan_trip: 'Help me plan a trip',
      add_groceries: 'Add $50 groceries expense'
    };
    if (actions[action]) sendMessage(actions[action]);
  };

  // Initial welcome message
  useEffect(() => {
    if (user?.id && messages.length === 0) {
      setMessages([{ sender: 'pam', content: `🤖 Hi! I'm PAM, your AI assistant. I'm ${isConnected ? 'fully connected' : 'running in demo mode'}. Try: "I spent $25 on fuel" or "Show my budget"`, timestamp: new Date() }]);
    }
  }, [user?.id, isConnected]);

  return (
    <>
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
          <PamFloatingButton onClick={() => setIsMobileOpen(true)} isConnected={isConnected} />
        )}
      </div>
    </>
  );
};

export default PamChatController;
