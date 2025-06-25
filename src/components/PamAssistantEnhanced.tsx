import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Mic, MicOff } from "lucide-react";
import { usePamWebSocketConnection } from "@/hooks/pam/usePamWebSocketConnection";

interface PamAssistantEnhancedProps {
  userId: string;
  authToken: string;
}

const PamAssistantEnhanced: React.FC<PamAssistantEnhancedProps> = ({ userId, authToken }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"Connected" | "Connecting" | "Disconnected">("Disconnected");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle incoming messages
  const handleMessage = useCallback((message: any) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      content: message.content || message.message || JSON.stringify(message),
      sender: "pam",
      timestamp: new Date().toISOString()
    }]);
  }, []);

  // Handle connection status changes
  const handleStatusChange = useCallback((isConnected: boolean) => {
    setConnectionStatus(isConnected ? "Connected" : "Disconnected");
  }, []);

  // Use the WebSocket hook with correct interface
  const { sendMessage } = usePamWebSocketConnection({
    userId,
    onMessage: handleMessage,
    onStatusChange: handleStatusChange
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = () => {
    if (inputMessage.trim() && connectionStatus === "Connected") {
      // Add user message to the messages array
      const userMessage = {
        id: Date.now(),
        content: inputMessage,
        sender: "user",
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Send structured message to backend
      sendMessage({
        type: "chat",
        content: inputMessage,
        userId: userId,
        timestamp: new Date().toISOString()
      });
      setInputMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoice = () => {
    setIsListening(!isListening);
    // Voice recognition implementation would go here
  };

  return (
    <>
      {/* PAM Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-primary hover:bg-primary/90 text-white rounded-full p-1 shadow-lg transition-all z-50"
      >
        <div className="relative">
          <img 
            src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/Pam.webp"
            alt="PAM Assistant"
            className="w-10 h-10 rounded-full"
          />
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
            connectionStatus === "Connected" ? "bg-green-500" : 
            connectionStatus === "Connecting" ? "bg-yellow-500" : "bg-red-500"
          }`} />
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-80 h-96 bg-white rounded-lg shadow-xl border z-50 flex flex-col">
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
                  {connectionStatus === "Connected" ? "Online" : 
                   connectionStatus === "Connecting" ? "Connecting..." : "Offline"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm">
                <p>👋 Hi! I'm PAM, your travel assistant.</p>
                <p className="mt-2">Ask me about camping spots, routes, or travel tips!</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
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
                onClick={toggleVoice}
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

export default PamAssistantEnhanced;