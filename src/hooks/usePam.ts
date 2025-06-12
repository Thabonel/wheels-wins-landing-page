

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

    // Classify the intent for session tracking (but don't send to n8n)
    const intentResult = IntentClassifier.classifyIntent(userMessage);
    
    // Update session data
    updateSession(intentResult.type);

    // Build payload for new pam-chat endpoint
    const payload: PamWebhookPayload = {
      chatInput: userMessage,
      user_id: user.id,
      voice_enabled: false
    };

    console.log("🚀 USEPAM - SENDING TO PAM API");
    console.log("📍 URL:", WEBHOOK_URL);
    console.log("📦 PAYLOAD:", JSON.stringify(payload, null, 2));

    // Call n8n production webhook
    let assistantContent = "I'm sorry, I didn't understand that.";
    let assistantRender = null;

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("📡 USEPAM - RAW RESPONSE STATUS:", res.status);
      console.log("📡 USEPAM - RAW RESPONSE HEADERS:", Object.fromEntries(res.headers.entries()));

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      // Get response as text first for debugging
      const responseText = await res.text();
      console.log("📄 USEPAM - RAW RESPONSE TEXT:", responseText);
      
      // Parse the JSON
      const rawData = JSON.parse(responseText);
      console.log("🔍 USEPAM - PARSED JSON TYPE:", typeof rawData);
      console.log("🔍 USEPAM - IS ARRAY:", Array.isArray(rawData));
      console.log("🔍 USEPAM - RAW DATA:", JSON.stringify(rawData, null, 2));
      
      // Handle both array and object responses
      const data = Array.isArray(rawData) ? rawData[0] : rawData;
      console.log("🎯 USEPAM - EXTRACTED DATA:", JSON.stringify(data, null, 2));
      
      // Check if the response indicates success
      if (!data || !data.success) {
        console.error("❌ USEPAM - PAM response indicates failure or missing success field:", data);
        throw new Error("PAM response indicates failure or is malformed");
      }

      // Extract the message from the correct field
      assistantContent = data.message;
      assistantRender = data.render || null;
      
      console.log("💬 USEPAM - MESSAGE FIELD EXISTS:", typeof assistantContent);
      console.log("💬 USEPAM - MESSAGE CONTENT:", assistantContent);

      if (!assistantContent || typeof assistantContent !== 'string') {
        console.error("❌ USEPAM - Message field is missing or not a string:", assistantContent);
        assistantContent = "I'm sorry, I received a malformed response.";
      } else {
        console.log("✅ USEPAM - SUCCESSFULLY EXTRACTED MESSAGE:", assistantContent);
      }

    } catch (err: any) {
      console.error("❌ USEPAM - PAM API ERROR:", err);
      console.error("❌ USEPAM - ERROR TYPE:", typeof err);
      console.error("❌ USEPAM - ERROR MESSAGE:", err instanceof Error ? err.message : 'Unknown error');
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

