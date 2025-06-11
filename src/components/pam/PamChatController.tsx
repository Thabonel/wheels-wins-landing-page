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

    const userMessage: ChatMessage = {
      sender: "user",
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Classify the intent for session tracking (but don't send to n8n)
    const intentResult = IntentClassifier.classifyIntent(message);
    
    // Update session data
    updateSession(intentResult.type);

    // Build payload exactly as n8n expects
    const payload: PamWebhookPayload = {
      chatInput: "test message", // Temporarily hardcoded for debugging
      user_id: user.id,
      session_id: `session_${user.id}`,
      voice_enabled: true
    };

    console.log("✅ Sending to PAM webhook:", {
      chatInput: "test message", // Temporarily hardcoded for debugging
      user_id: user?.id,
      session_id: `session_${user.id}`,
      voice_enabled: true
    });

    console.log("Sending PAM payload:", payload);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error("PAM response indicates failure");
      }

      const reply = data.content || "I'm sorry, I didn't understand that.";

      // Cache the tip when online
      addTip(reply);

      const pamMessage: ChatMessage = {
        sender: "pam",
        content: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, pamMessage]);
    } catch (error) {
      console.error("PAM API Error:", error);
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
