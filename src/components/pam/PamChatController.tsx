import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { useCachedPamTips } from "@/hooks/useCachedPamTips";
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

const WEBHOOK_URL = "https://treflip2025.app.n8n.cloud/webhook/pam-chat";

// Define excluded routes where Pam chat should not be shown (unless mobile)
const EXCLUDED_ROUTES = ["/", "/profile"];

const PamChatController = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const { addTip } = useCachedPamTips();
  const { sessionData, updateSession } = usePamSession(user?.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [region, setRegion] = useState("Australia"); // Default, could be dynamic

  const isExcluded = EXCLUDED_ROUTES.includes(pathname);
  const isMobile = window.innerWidth < 768;

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
    setMessages((prev) => [...prev, userMessage]);

    // Classify the intent for session tracking (but don't send to n8n)
    const intentResult = IntentClassifier.classifyIntent(cleanMessage);
    
    // Update session data
    updateSession(intentResult.type);

    // Build payload for new pam-chat endpoint
    const payload: PamWebhookPayload = {
      chatInput: cleanMessage,
      user_id: user.id,
      voice_enabled: true
    };

    console.log("🚀 DETAILED DEBUG - SENDING TO PAM API");
    console.log("📍 URL:", WEBHOOK_URL);
    console.log("📦 PAYLOAD:", JSON.stringify(payload, null, 2));

    try {
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
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  useEffect(() => {
    if (isMobile && isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileOpen, isMobile]);

  return (
    <>
      {/* Mobile floating button */}
      <div className="md:hidden fixed bottom-6 right-4 z-40">
        {isMobileOpen ? (
          <div className="w-full max-w-sm h-[80vh] rounded-xl shadow-xl bg-white border border-blue-100 flex flex-col overflow-hidden">
            <PamHeader region={region} />
            <div className="flex flex-col flex-1 px-4 pb-2 overflow-y-auto">
              {isOffline ? (
                <OfflinePamChat />
              ) : (
                <>
                  <ChatMessages messages={messages} />
                  <QuickReplies replies={getQuickReplies(region)} onReplyClick={sendMessage} region={region} />
                  <ChatInput onSendMessage={sendMessage} />
                </>
              )}
            </div>
          </div>
        ) : (
          <Button
            className="h-14 w-14 rounded-full shadow-lg border border-blue-100 bg-white hover:bg-blue-100"
            onClick={() => setIsMobileOpen(true)}
          >
            <Avatar className="h-10 w-10">
              <img src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/Pam.webp" alt="Pam" />
            </Avatar>
          </Button>
        )}
      </div>
    </>
  );
};

export default PamChatController;
