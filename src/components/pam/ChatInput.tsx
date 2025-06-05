
// src/components/pam/ChatInput.tsx
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import MicButton from "@/components/MicButton";
import { useOffline } from "@/context/OfflineContext";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const { isOffline } = useOffline();

  const handleSend = () => {
    if (!message.trim() || isOffline) return;
    onSendMessage(message.trim());
    setMessage("");
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={isOffline ? "Pam is offline..." : "Type your message..."}
        className="flex-1 border-blue-100 focus-visible:ring-blue-200"
        disabled={isOffline}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !isOffline) {
            e.preventDefault();
            handleSend();
          }
        }}
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={isOffline}
          className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
        >
          <ArrowUp className="h-4 w-4 rotate-45" />
        </Button>
        <MicButton inline disabled={isOffline} />
      </div>
    </div>
  );
}
