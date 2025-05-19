import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import PamHeader from "./PamHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import QuickReplies from "./QuickReplies";
import { getQuickReplies } from "./chatUtils";
import { ChatMessage } from "./types";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

const WEBHOOK_URL = "https://treflip2025.app.n8n.cloud/webhook/d8be6676-487e-40cf-8a32-91188c70cbef";
const EXCLUDED_ROUTES = ["/", "/profile"];

const PamChatController = () => {
  const { pathname } = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [region, setRegion] = useState("Australia"); // Default, could be dynamic

  const isExcluded = EXCLUDED_ROUTES.includes(pathname);
  const isMobile = window.innerWidth < 768;

  const sendMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      sender: "user",
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();

      const pamMessage: ChatMessage = {
        sender: "pam",
        content: data.reply || "I'm not sure how to respond to that.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, pamMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "pam",
          content: "Sorry, I couldn’t connect to Pam right now.",
          timestamp: new Date(),
        },
      ]);
    }
  };

  if (isExcluded) return null;

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-[340px] flex-col border-l h-full bg-white shadow-lg fixed top-0 right-0 z-30"
        style={{ height: "100vh" }}
      >
        <PamHeader region={region} />
        <div className="flex flex-col flex-1 overflow-hidden px-4">
          <ChatMessages messages={messages} />
          <QuickReplies replies={getQuickReplies(region)} onReplyClick={sendMessage} region={region} />
          <ChatInput onSendMessage={sendMessage} />
        </div>
      </aside>

      {/* Mobile floating button */}
      <div className="md:hidden fixed bottom-6 right-4 z-40">
        {isMobileOpen ? (
          <div className="w-full max-w-sm h-[80vh] rounded-xl shadow-xl bg-white border border-blue-100 flex flex-col overflow-hidden">
            <PamHeader region={region} />
            <div className="flex flex-col flex-1 px-4 pb-2">
              <ChatMessages messages={messages} />
              <QuickReplies replies={getQuickReplies(region)} onReplyClick={sendMessage} region={region} />
              <ChatInput onSendMessage={sendMessage} />
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
