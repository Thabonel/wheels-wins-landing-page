
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { useRegion } from "@/context/RegionContext";
import { useCachedPamTips } from "@/hooks/useCachedPamTips";
import { usePamWebSocket } from "@/hooks/usePamWebSocket";
import { pamUIController } from "@/lib/pam/PamUIController";
import { IntentClassifier } from "@/utils/intentClassifier";
import { usePamSession } from "@/hooks/usePamSession";
import PamHeader from "./PamHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import QuickReplies from "./QuickReplies";
import OfflinePamChat from "./OfflinePamChat";
import { getQuickReplies } from "./chatUtils";
import { ChatMessage } from "./types";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wifi, WifiOff } from "lucide-react";

// Define excluded routes where Pam chat should not be shown (unless mobile)
const EXCLUDED_ROUTES = ["/", "/profile"];

const PamChatController = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const { region } = useRegion();
  const { addTip } = useCachedPamTips();
  const { sessionData, updateSession } = usePamSession(user?.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isExcluded = EXCLUDED_ROUTES.includes(pathname);
  const isMobile = window.innerWidth < 768;

  // Initialize WebSocket connection to our new PAM backend
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
          // Execute UI actions through PamUIController
          executeUIActions(latestMessage.actions);
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
          // Handle connection status messages
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

  const executeUIActions = async (actions: any[]) => {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'navigate':
            await pamUIController.navigateToPage(action.target, action.params);
            break;
          case 'fill_form':
            for (const [field, value] of Object.entries(action.data || {})) {
              await pamUIController.fillInput(`#${field}`, value);
            }
            break;
          case 'click':
            await pamUIController.clickButton(action.selector);
            break;
          case 'alert':
            // Show visual feedback
            const alertMessage: ChatMessage = {
              sender: "pam",
              content: `💡 ${action.content}`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, alertMessage]);
            break;
        }
      } catch (error) {
        console.error('Error executing UI action:', error);
      }
    }
  };

  const sendMessage = async (message: string) => {
    if (isOffline) return; // Don't send messages when offline

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

    // Validate and clean the message
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

    // Use WebSocket-first approach instead of N8N fallback
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
        connect(); // Try to reconnect
        setIsProcessing(false);
      }
    } else {
      console.warn('⚠️ PAM WebSocket not connected, attempting connection...');
      connect(); // Try to connect
      
      // Show connection attempt message
      const connectingMessage: ChatMessage = {
        sender: "pam",
        content: "🔄 Connecting to PAM backend... Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, connectingMessage]);
      setIsProcessing(false);
    }
  };

  // Quick action handlers
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

  useEffect(() => {
    if (isMobile && isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileOpen, isMobile]);

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
          <div className="w-full max-w-sm h-[80vh] rounded-xl shadow-xl bg-white border border-blue-100 flex flex-col overflow-hidden">
            {/* Enhanced Header with Connection Status */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <img src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/Pam.webp" alt="Pam" />
                  </Avatar>
                  <div>
                    <h3 className="font-bold">Chat with Pam</h3>
                    <p className="text-xs opacity-90">Your {region} AI Assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Connection Status */}
                  <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                    {isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                    {isConnected ? "Backend" : "Connecting"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsMobileOpen(false)}
                    className="text-white hover:bg-white/20"
                  >
                    ×
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col flex-1 px-4 pb-2 overflow-y-auto">
              {isOffline ? (
                <OfflinePamChat />
              ) : (
                <>
                  <ChatMessages messages={messages} />
                  
                  {/* Processing Indicator */}
                  {isProcessing && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg mb-3">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm text-blue-600">PAM is thinking...</span>
                    </div>
                  )}
                  
                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAction('add_expense')}
                      className="text-xs"
                      disabled={isProcessing || !isConnected}
                    >
                      💰 Add Expense
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAction('check_budget')}
                      className="text-xs"
                      disabled={isProcessing || !isConnected}
                    >
                      📊 Check Budget
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAction('plan_trip')}
                      className="text-xs"
                      disabled={isProcessing || !isConnected}
                    >
                      🚗 Plan Trip
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAction('add_groceries')}
                      className="text-xs"
                      disabled={isProcessing || !isConnected}
                    >
                      🛒 Groceries
                    </Button>
                  </div>
                  
                  <QuickReplies replies={getQuickReplies(region)} onReplyClick={sendMessage} region={region} />
                  <ChatInput onSendMessage={sendMessage} />
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="relative">
            <Button
              className="h-14 w-14 rounded-full shadow-lg border border-blue-100 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              onClick={() => setIsMobileOpen(true)}
            >
              <Avatar className="h-10 w-10">
                <img src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/Pam.webp" alt="Pam" />
              </Avatar>
            </Button>
            
            {/* Connection Status Indicator */}
            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              isConnected ? 'bg-green-500' : 'bg-orange-500'
            }`} />
          </div>
        )}
      </div>
    </>
  );
};

export default PamChatController;
