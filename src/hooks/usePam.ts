
import { useState } from "react";
import { v4 as uuid } from "uuid";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { IntentClassifier } from "@/utils/intentClassifier";
import { usePamSession } from "@/hooks/usePamSession";
import { PamWebhookPayload } from "@/types/pamTypes";

const WEBHOOK_URL = "https://treflip2025.app.n8n.cloud/webhook/pam-chat";

export function usePam() {
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const { sessionData, updateSession } = usePamSession(user?.id);
  console.log("Pam Auth User ID:", user?.id);
  const [messages, setMessages] = useState<any[]>([]);

  const send = async (userMessage: string) => {
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
        content: "Pam is offline. Check your saved tips below.",
        render: null,
        timestamp: new Date(),
      };
    }

    const userMsg = {
      id: uuid(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Classify the intent
    const intentResult = IntentClassifier.classifyIntent(userMessage);
    
    // Update session data
    updateSession(intentResult.type);

    // Build enhanced payload with the correct field name expected by n8n
    const payload = {
      user_id: user.id,
      chatInput: userMessage, // Changed from 'message' to 'chatInput'
      intent: intentResult.type,
      is_first_time: sessionData.isFirstTime,
      session_context: {
        message_count: sessionData.messageCount + 1,
        previous_intents: sessionData.previousIntents
      }
    };

    console.log("Sending PAM payload:", payload);

    // Call n8n production webhook
    let assistantContent = "I'm sorry, I didn't understand that.";
    let assistantRender = null;

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      
      if (!data.success) {
        throw new Error("PAM response indicates failure");
      }

      assistantContent = data.content || "I'm sorry, I didn't understand that.";
      assistantRender = data.render || null;

    } catch (err: any) {
      console.error("PAM API Error:", err);
      assistantContent = "I'm having trouble connecting right now. Please try again in a moment.";
    }

    const assistantMsg = {
      id: uuid(),
      role: "assistant",
      content: assistantContent,
      render: assistantRender,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMsg]);

    return assistantMsg;
  };

  return { messages, send };
}
