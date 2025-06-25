
import { useState } from "react";
import { v4 as uuid } from "uuid";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";

// DEPRECATED: This hook is deprecated in favor of usePamWebSocket
// Use usePamWebSocket for real-time WebSocket communication instead
// This hook is kept for backward compatibility only

const DEPRECATED_WEBHOOK_URL = "https://treflip2025.app.n8n.cloud/webhook/pam-chat";

export function usePam() {
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const [messages, setMessages] = useState<any[]>([]);

  const send = async (userMessage: string) => {
    console.warn('⚠️ DEPRECATED: usePam hook is deprecated. Use usePamWebSocket for real-time communication.');
    
    if (!user?.id) {
      console.error("No authenticated user ID – cannot send to Pam");
      return {
        id: uuid(),
        role: "assistant",
        content: "Please log in to chat with PAM.",
        render: null,
        timestamp: new Date(),
      };
    }

    if (isOffline) {
      return {
        id: uuid(),
        role: "assistant",
        content: "Pam is offline. Please use the WebSocket connection when online.",
        render: null,
        timestamp: new Date(),
      };
    }

    // Return deprecation notice instead of making actual API calls
    return {
      id: uuid(),
      role: "assistant",
      content: "This PAM integration is deprecated. Please use the WebSocket-based PAM chat instead.",
      render: null,
      timestamp: new Date(),
    };
  };

  return { messages, send };
}
