import { useState } from "react";
import { v4 as uuid } from "uuid";
import { useAuth } from "@/context/AuthContext";

const WEBHOOK_URL = "https://treflip2025.app.n8n.cloud/webhook/4cd18979-6ee8-451e-b4e6-095c3d7ca31a";

export function usePam() {
  const { user } = useAuth();
  console.log("Pam Auth User ID:", user?.id);
  const [messages, setMessages] = useState<any[]>([]);

  const send = async (userMessage: string) => {
    if (!user?.id) {
      console.error("No authenticated user ID – cannot send to Pam");
      return;
    }

    const userMsg = {
      id: uuid(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    // 🔔 Call n8n webhook
    let assistantContent = "Sorry, something went wrong.";
    let assistantRender = null;

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          message: userMessage,
        }),
      });

      if (!res.ok) {
        throw new Error(`Webhook error ${res.status}`);
      }

      const data = await res.json();
      // Expecting { content: string, render?: any } from your n8n flow
      assistantContent = data.content;
      assistantRender = data.render ?? null;
    } catch (err: any) {
      console.error("Error sending to Pam:", err);
      assistantContent = "I’m having trouble reaching Pam right now.";
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
