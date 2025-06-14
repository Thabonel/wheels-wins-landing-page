
import { useState } from "react";
import { v4 as uuid } from "uuid";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { useRegion } from "@/context/RegionContext";
import { IntentClassifier } from "@/utils/intentClassifier";
import { usePamSession } from "@/hooks/usePamSession";
import { PamWebhookPayload } from "@/types/pamTypes";

const WEBHOOK_URL = "https://treflip2025.app.n8n.cloud/webhook/pam-chat";

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

export function usePam() {
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const { region } = useRegion();
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

    // Add PAM memory if available
    const pamMemory = getPamMemory(region);
    if (pamMemory) {
      payload.pam_memory = pamMemory;
    }

    console.log("🚀 USEPAM DETAILED DEBUG - SENDING TO PAM API");
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

      console.log("📡 USEPAM DETAILED DEBUG - RAW RESPONSE STATUS:", res.status);
      console.log("📡 USEPAM DETAILED DEBUG - RAW RESPONSE HEADERS:", Object.fromEntries(res.headers.entries()));

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      // Get response as text first for debugging
      const responseText = await res.text();
      console.log("📄 USEPAM DETAILED DEBUG - RAW RESPONSE TEXT LENGTH:", responseText.length);
      console.log("📄 USEPAM DETAILED DEBUG - RAW RESPONSE TEXT:", responseText);
      
      // Parse the JSON
      let rawData;
      try {
        rawData = JSON.parse(responseText);
        console.log("🔍 USEPAM DETAILED DEBUG - JSON PARSE SUCCESS");
      } catch (parseError) {
        console.error("❌ USEPAM DETAILED DEBUG - JSON PARSE FAILED:", parseError);
        throw new Error("Failed to parse JSON response");
      }
      
      console.log("🔍 USEPAM DETAILED DEBUG - PARSED JSON TYPE:", typeof rawData);
      console.log("🔍 USEPAM DETAILED DEBUG - IS ARRAY:", Array.isArray(rawData));
      console.log("🔍 USEPAM DETAILED DEBUG - ARRAY LENGTH:", Array.isArray(rawData) ? rawData.length : 'N/A');
      console.log("🔍 USEPAM DETAILED DEBUG - RAW DATA STRUCTURE:", JSON.stringify(rawData, null, 2));
      
      // Handle both array and object responses
      let data;
      if (Array.isArray(rawData)) {
        console.log("🎯 USEPAM DETAILED DEBUG - EXTRACTING FROM ARRAY, INDEX 0");
        data = rawData[0];
      } else {
        console.log("🎯 USEPAM DETAILED DEBUG - USING DIRECT OBJECT");
        data = rawData;
      }
      
      console.log("🎯 USEPAM DETAILED DEBUG - EXTRACTED DATA:", JSON.stringify(data, null, 2));
      console.log("🎯 USEPAM DETAILED DEBUG - DATA TYPE:", typeof data);
      console.log("🎯 USEPAM DETAILED DEBUG - DATA KEYS:", Object.keys(data || {}));
      
      // Check if the response indicates success
      console.log("✅ USEPAM DETAILED DEBUG - SUCCESS FIELD:", data?.success);
      console.log("✅ USEPAM DETAILED DEBUG - SUCCESS TYPE:", typeof data?.success);
      
      if (!data || data.success !== true) {
        console.error("❌ USEPAM DETAILED DEBUG - PAM response indicates failure or missing success field:", data);
        throw new Error("PAM response indicates failure or is malformed");
      }

      // Extract the message from the correct field
      assistantContent = data.message;
      assistantRender = data.render || null;
      
      console.log("💬 USEPAM DETAILED DEBUG - MESSAGE FIELD RAW:", assistantContent);
      console.log("💬 USEPAM DETAILED DEBUG - MESSAGE TYPE:", typeof assistantContent);
      console.log("💬 USEPAM DETAILED DEBUG - MESSAGE LENGTH:", assistantContent?.length);
      console.log("💬 USEPAM DETAILED DEBUG - MESSAGE PREVIEW:", assistantContent?.substring(0, 100));

      if (!assistantContent || typeof assistantContent !== 'string') {
        console.error("❌ USEPAM DETAILED DEBUG - Message field is missing or not a string:", assistantContent);
        assistantContent = "I'm sorry, I received a malformed response.";
      } else {
        console.log("✅ USEPAM DETAILED DEBUG - SUCCESSFULLY EXTRACTED MESSAGE LENGTH:", assistantContent.length);
        console.log("✅ USEPAM DETAILED DEBUG - FINAL MESSAGE TO DISPLAY:", assistantContent);
      }

    } catch (err: any) {
      console.error("❌ USEPAM DETAILED DEBUG - PAM API ERROR:", err);
      console.error("❌ USEPAM DETAILED DEBUG - ERROR TYPE:", typeof err);
      console.error("❌ USEPAM DETAILED DEBUG - ERROR MESSAGE:", err instanceof Error ? err.message : 'Unknown error');
      console.error("❌ USEPAM DETAILED DEBUG - ERROR STACK:", err instanceof Error ? err.stack : 'No stack');
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
