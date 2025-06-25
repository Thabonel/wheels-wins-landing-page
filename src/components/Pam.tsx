import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Mic, MicOff, MapPin, Calendar, DollarSign } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface PamMessage {
  id: string;
  content: string;
  sender: "user" | "pam";
  timestamp: string;
  context?: any;
}

interface PamProps {
  mode?: "floating" | "sidebar" | "modal";
}

const Pam: React.FC<PamProps> = ({ mode = "floating" }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<PamMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"Connected" | "Connecting" | "Disconnected">("Disconnected");
  const [userContext, setUserContext] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Load user context and memory when component mounts
  useEffect(() => {
    if (user?.id) {
      loadUserContext();
      loadConversationMemory();
      connectToBackend();
    }
    // eslint-disable-next-line
  }, [user?.id]);

  const loadUserContext = async () => {
    try {
      const response = await fetch('/api/you/profile', {
        headers: { 'Authorization': `Bearer ${user?.access_token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserContext(data.data);
      }
    } catch (error) {
      console.error('Failed to load user context:', error);
    }
  };

  const loadConversationMemory = async () => {
    try {
      const response = await fetch(`/api/pam/memory?user_id=${user?.id}&limit=10`, {
        headers: { 'Authorization': `Bearer ${user?.access_token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const memoryMessages = data.memories?.map((memory: any) => ({
          id: memory.id,
          content: memory.content,
          sender: memory.topic === 'user_message' ? 'user' : 'pam',
          timestamp: memory.created_at,
          context: memory.context
        })) || [];
        setMessages(memoryMessages);
      }
    } catch (error) {
      console.error('Failed to load conversation memory:', error);
    }
  };

  const saveToMemory = async (message: string, sender: 'user' | 'pam', context?: any) => {
    try {
      await fetch('/api/pam/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          user_id: user?.id,
          content: message,
          topic: sender === 'user' ? 'user_message' : 'pam_response',
          context: context
        })
      });
    } catch (error) {
      console.error('Failed to save to memory:', error);
    }
  };

  const connectToBackend = useCallback(() => {
    if (!user?.id) return;

    try {
      const backendUrl = import.meta.env.VITE_PAM_BACKEND_URL || "https://pam-backend.onrender.com";
      const wsUrl = `${backendUrl.replace("https", "wss")}/ws/${user.id}?token=${user.access_token || "demo-token"}`;
      
      setConnectionStatus("Connecting");
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setConnectionStatus("Connected");
        addMessage("🤖 Hi! I'm PAM, your intelligent travel companion. I remember our conversations and know your preferences. How can I help you today?", "pam");
      };

      wsRef.current.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'chat_response') {
            const content = message.message || message.content;
            addMessage(content, "pam");
            await saveToMemory(content, "pam", message.actions);
          }
        } catch (error) {
          console.error('Error parsing PAM message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setConnectionStatus("Disconnected");
      };

      wsRef.current.onerror = () => {
        setConnectionStatus("Disconnected");
      };
    } catch (error) {
      setConnectionStatus("Disconnected");
    }
  }, [user?.id, user?.access_token]);

  const addMessage = (content: string, sender: "user" | "pam") => {
    const newMessage: PamMessage = {
      id: Date.now().toString(),
      content,
      sender,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() && connectionStatus === "Connected" && wsRef.current) {
      const message = inputMessage.trim();
      addMessage(message, "user");
      await saveToMemory(message, "user");
      const messageData = {
        type: "chat",
        content: message,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        context: {
          userLocation: userContext?.current_location,
          vehicleInfo: userContext?.vehicle_info,
          travelStyle: userContext?.travel_style,
          conversationHistory: messages.slice(-5)
        }
      };
      wsRef.current.send(JSON.stringify(messageData));
      setInputMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getPersonalizedGreeting = () => {
    if (!userContext) return "Hi! I'm PAM";
    const location = userContext.current_location || "your location";
    const vehicle = userContext.vehicle_info?.type || "vehicle";
    return `Hi! I'm PAM, your travel companion. I see you're in ${location} with your ${vehicle}. Ready for an adventure?`;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // --- UI ---
  if (mode === "sidebar") {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex items-center justify-between p-4 border-b bg-primary/5">
          <div className="flex items-center space-x-3">
            <img 
              src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/Pam.webp"
              alt="PAM"
              className="w-8 h-8 rounded-full"
            />
            <div>
              <h3 className="font-semibold text-gray-800">PAM</h3>
              <p className="text-xs text-gray-500">
                {connectionStatus === "Connected" ? "🟢 Online & Ready" : 
                 connectionStatus === "Connecting" ? "🟡 Connecting..." : "🔴 Offline"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 text-sm">
              <p>{getPersonalizedGreeting()}</p>
              <div className="mt-4 space-y-2">
                <button className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20">
                  <MapPin className="w-4 h-4" />
                  Plan my next trip
                </button>
                <button className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20">
                  <Calendar className="w-4 h-4" />
                  Check my schedule
                </button>
                <button className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20">
                  <DollarSign className="w-4 h-4" />
                  Review my budget
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-lg ${
                  msg.sender === "user" ? "bg-primary text-white" : "bg-gray-100 text-gray-800"
                }`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-3 border-t">
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask PAM anything..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              disabled={connectionStatus !== "Connected"}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || connectionStatus !== "Connected"}
              className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default/floating mode
  return (
    <>
      {/* Floating PAM Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-primary hover:bg-primary/90 text-white rounded-full p-3 shadow-lg transition-all z-50"
        aria-label="Open PAM Chat"
      >
        <div className="relative">
          <img 
            src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/Pam.webp"
            alt="PAM Assistant"
            className="w-8 h-8 rounded-full"
          />
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
            connectionStatus === "Connected" ? "bg-green-500" : 
            connectionStatus === "Connecting" ? "bg-yellow-500" : "bg-red-500"
          }`} />
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-lg shadow-xl border z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary/5 rounded-t-lg">
            <div className="flex items-center space-x-3">
              <img 
                src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/Pam.webp"
                alt="PAM"
                className="w-8 h-8 rounded-full"
              />
              <div>
                <h3 className="font-semibold text-gray-800">PAM</h3>
                <p className="text-xs text-gray-500">
                  {connectionStatus === "Connected" ? "🟢 Online & Intelligent" : 
                   connectionStatus === "Connecting" ? "🟡 Connecting..." : "🔴 Offline"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close PAM Chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm">
                <p>{getPersonalizedGreeting()}</p>
                <div className="mt-4 space-y-2">
                  <button className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20">
                    <MapPin className="w-4 h-4" />
                    Plan my next adventure
                  </button>
                  <button className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20">
                    <Calendar className="w-4 h-4" />
                    What's my schedule?
                  </button>
                  <button className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20">
                    <DollarSign className="w-4 h-4" />
                    How's my budget?
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    msg.sender === "user" ? "bg-primary text-white" : "bg-gray-100 text-gray-800"
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask PAM anything..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                disabled={connectionStatus !== "Connected"}
              />
              <button
                onClick={() => setIsListening(!isListening)}
                className={`p-2 rounded-lg transition-colors ${
                  isListening ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || connectionStatus !== "Connected"}
                className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {connectionStatus !== "Connected" && (
              <p className="text-xs text-red-500 mt-1">
                {connectionStatus === "Connecting" ? "Connecting to PAM..." : "PAM is offline"}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Pam;
