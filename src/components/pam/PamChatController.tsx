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
import { PamWebhookPayload } from "@/types/pamTypes";
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

// Helper function to get PAM memory from available sources
const getPamMemory = (region: string) => {
  try {
    // Check localStorage for various memory sources
    const travelPrefs = localStorage.getItem('travel_preferences');
    const vehicleInfo = localStorage.getItem('vehicle_info');
    const budgetPrefs = localStorage.getItem('budget_preferences');
    const userPrefs = localStorage.getItem('user_preferences');
    
    const memory: any = {};
    
    // Add region
    if (region) {
      memory.region = region;
    }
    
    // Parse and include travel preferences
    if (travelPrefs) {
      try {
        const parsed = JSON.parse(travelPrefs);
        if (parsed.travel_style) memory.travel_style = parsed.travel_style;
        if (parsed.preferences) memory.preferences = parsed.preferences;
      } catch (e) {
        console.warn('Failed to parse travel preferences:', e);
      }
    }
    
    // Parse and include vehicle info
    if (vehicleInfo) {
      try {
        const parsed = JSON.parse(vehicleInfo);
        if (parsed.vehicle_type) memory.vehicle_type = parsed.vehicle_type;
      } catch (e) {
        console.warn('Failed to parse vehicle info:', e);
      }
    }
    
    // Parse and include budget preferences
    if (budgetPrefs) {
      try {
        const parsed = JSON.parse(budgetPrefs);
        if (parsed.budget_focus) memory.budget_focus = parsed.budget_focus;
      } catch (e) {
        console.warn('Failed to parse budget preferences:', e);
      }
    }
    
    // Parse and include user preferences
    if (userPrefs) {
      try {
        const parsed = JSON.parse(userPrefs);
        if (parsed.preferences) {
          memory.preferences = { ...memory.preferences, ...parsed.preferences };
        }
      } catch (e) {
        console.warn('Failed to parse user preferences:', e);
      }
    }
    
    return Object.keys(memory).length > 0 ? memory : null;
  } catch (error) {
    console.warn('Error getting PAM memory:', error);
    return null;
  }
};

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

  // Initialize WebSocket connection
  const { isConnected, sendMessage: sendWebSocketMessage, messages: wsMessages } = usePamWebSocket();

  // Handle WebSocket messages
  useEffect(() => {
    if (wsMessages.length > 0) {
      const latestMessage = wsMessages[wsMessages.length - 1];
      
      switch (latestMessage.type) {
        case 'chat_response':
          const pamMessage: ChatMessage = {
            sender: "pam",
            content: latestMessage.message,
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
      console.error("No authenticated user ID – cannot send to Pam");
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

    // Classify the intent for session tracking (but don't send to n8n)
    const intentResult = IntentClassifier.classifyIntent(cleanMessage);
    
    // Update session data
    updateSession(intentResult.type);

    // Send via WebSocket if connected, otherwise fallback to N8N
    if (isConnected) {
      sendWebSocketMessage({
        type: 'chat',
        message: cleanMessage,
        user_id: user.id,
        context: {
          region,
          current_page: pathname,
          session_data: sessionData
        }
      });
    } else {
      // Fallback to existing N8N webhook
      await sendToN8NWebhook(cleanMessage);
    }
  };

  const sendToN8NWebhook = async (message: string) => {
    // Keep existing N8N webhook logic as fallback
    const WEBHOOK_URL = "https://treflip2025.app.n8n.cloud/webhook/pam-chat";
    
    try {
      // Build payload for new pam-chat endpoint
      const payload: PamWebhookPayload = {
        chatInput: message,
        user_id: user.id,
        voice_enabled: true
      };

      // Add PAM memory if available
      const pamMemory = getPamMemory(region);
      if (pamMemory) {
        payload.pam_memory = pamMemory;
      }

      console.log("🚀 DETAILED DEBUG - SENDING TO PAM API");
      console.log("📍 URL:", WEBHOOK_URL);
      console.log("📦 PAYLOAD:", JSON.stringify(payload, null, 2));

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("📡 DETAILED DEBUG - RAW RESPONSE STATUS:", response.status);
      console.log("📡 DETAILED DEBUG - RAW RESPONSE HEADERS:", Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get response as text first for debugging
      const responseText = await response.text();
      console.log("📄 DETAILED DEBUG - RAW RESPONSE TEXT LENGTH:", responseText.length);
      console.log("📄 DETAILED DEBUG - RAW RESPONSE TEXT:", responseText);
      
      // Parse the JSON
      let rawData;
      try {
        rawData = JSON.parse(responseText);
        console.log("🔍 DETAILED DEBUG - JSON PARSE SUCCESS");
      } catch (parseError) {
        console.error("❌ DETAILED DEBUG - JSON PARSE FAILED:", parseError);
        throw new Error("Failed to parse JSON response");
      }
      
      console.log("🔍 DETAILED DEBUG - PARSED JSON TYPE:", typeof rawData);
      console.log("🔍 DETAILED DEBUG - IS ARRAY:", Array.isArray(rawData));
      console.log("🔍 DETAILED DEBUG - ARRAY LENGTH:", Array.isArray(rawData) ? rawData.length : 'N/A');
      console.log("🔍 DETAILED DEBUG - RAW DATA STRUCTURE:", JSON.stringify(rawData, null, 2));
      
      // Handle both array and object responses
      let data;
      if (Array.isArray(rawData)) {
        console.log("🎯 DETAILED DEBUG - EXTRACTING FROM ARRAY, INDEX 0");
        data = rawData[0];
      } else {
        console.log("🎯 DETAILED DEBUG - USING DIRECT OBJECT");
        data = rawData;
      }
      
      console.log("🎯 DETAILED DEBUG - EXTRACTED DATA:", JSON.stringify(data, null, 2));
      console.log("🎯 DETAILED DEBUG - DATA TYPE:", typeof data);
      console.log("🎯 DETAILED DEBUG - DATA KEYS:", Object.keys(data || {}));
      
      // Check if the response indicates success
      console.log("✅ DETAILED DEBUG - SUCCESS FIELD:", data?.success);
      console.log("✅ DETAILED DEBUG - SUCCESS TYPE:", typeof data?.success);
      
      if (!data || data.success !== true) {
        console.error("❌ DETAILED DEBUG - PAM response indicates failure or missing success field:", data);
        throw new Error("PAM response indicates failure or is malformed");
      }

      // Extract the message from the correct field
      const reply = data.message;
      console.log("💬 DETAILED DEBUG - MESSAGE FIELD RAW:", reply);
      console.log("💬 DETAILED DEBUG - MESSAGE TYPE:", typeof reply);
      console.log("💬 DETAILED DEBUG - MESSAGE LENGTH:", reply?.length);
      console.log("💬 DETAILED DEBUG - MESSAGE PREVIEW:", reply?.substring(0, 100));

      if (!reply || typeof reply !== 'string') {
        console.error("❌ DETAILED DEBUG - Message field is missing or not a string:", reply);
        throw new Error("Message field is missing or invalid");
      }

      // Cache the tip when online
      addTip(reply);

      const pamMessage: ChatMessage = {
        sender: "pam",
        content: reply,
        timestamp: new Date(),
      };
      
      console.log("✅ DETAILED DEBUG - SUCCESSFULLY EXTRACTED MESSAGE LENGTH:", reply.length);
      console.log("✅ DETAILED DEBUG - FINAL MESSAGE TO DISPLAY:", reply);
      setMessages((prev) => [...prev, pamMessage]);
    } catch (error) {
      console.error("❌ DETAILED DEBUG - PAM API ERROR:", error);
      console.error("❌ DETAILED DEBUG - ERROR TYPE:", typeof error);
      console.error("❌ DETAILED DEBUG - ERROR MESSAGE:", error instanceof Error ? error.message : 'Unknown error');
      console.error("❌ DETAILED DEBUG - ERROR STACK:", error instanceof Error ? error.stack : 'No stack');
      
      const errorMessage: ChatMessage = {
        sender: "pam",
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
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
        content: `🤖 Hi! I'm PAM, your AI assistant. I can help you manage expenses, plan trips, and more. Try saying: "I spent $25 on fuel" or "Show my budget"`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [user?.id, messages.length]);

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
                    {isConnected ? "Connected" : "Offline"}
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
                      disabled={isProcessing}
                    >
                      💰 Add Expense
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAction('check_budget')}
                      className="text-xs"
                      disabled={isProcessing}
                    >
                      📊 Check Budget
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAction('plan_trip')}
                      className="text-xs"
                      disabled={isProcessing}
                    >
                      🚗 Plan Trip
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAction('add_groceries')}
                      className="text-xs"
                      disabled={isProcessing}
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
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
          </div>
        )}
      </div>
    </>
  );
};

export default PamChatController;
