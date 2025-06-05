
// src/components/PamAssistant.tsx
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useRegion } from "@/context/RegionContext";
import { usePam } from "@/hooks/usePam";
import { useOffline } from "@/context/OfflineContext";
import { useCachedPamTips } from "@/hooks/useCachedPamTips";
import PamHeader from "@/components/pam/PamHeader";
import ChatMessages from "@/components/pam/ChatMessages";
import ChatInput from "@/components/pam/ChatInput";
import OfflinePamChat from "@/components/pam/OfflinePamChat";
import { useAuth } from "@/context/AuthContext";

type Message = {
  sender: "user" | "pam";
  content: string;
  timestamp: Date;
};

export default function PamAssistant() {
  const { region } = useRegion();
  const { user: authUser } = useAuth();
  const { messages: pamMessages, send } = usePam();
  const { isOffline } = useOffline();
  const { addTip } = useCachedPamTips();
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = async (message: string) => {
    if (isOffline) return; // Don't send messages when offline
    
    setMessages((prev) => [
      ...prev,
      { sender: "user", content: message, timestamp: new Date() },
    ]);
    const assistantMsg = await send(message);
    
    // Cache the tip when online
    if (assistantMsg.content) {
      addTip(assistantMsg.content);
    }
    
    setMessages((prev) => [
      ...prev,
      { sender: "pam", content: assistantMsg.content, timestamp: new Date() },
    ]);
  };

  useEffect(() => {
    // Reset messages when region or user changes
    setMessages(pamMessages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })));
  }, [region, authUser?.id, pamMessages]);

  // If not logged in, don't render
  if (!authUser) return null;

  return (
    <Card className="flex flex-col h-full p-4 rounded-xl shadow-md border-2 border-blue-100/30">
      <PamHeader region={region} />
      
      {isOffline ? (
        <OfflinePamChat />
      ) : (
        <>
          <div className="flex-1 overflow-auto my-4">
            <ChatMessages messages={messages} />
          </div>
          <ChatInput onSendMessage={handleSend} />
        </>
      )}
    </Card>
  );
}
