// src/components/pam/ChatInput.tsx
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import MicButton from "@/components/MicButton";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;
    onSendMessage(message.trim());
    setMessage("");
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        className="flex-1 border-blue-100 focus-visible:ring-blue-200"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
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
          className="bg-blue-500 hover:bg-blue-600"
        >
          <ArrowUp className="h-4 w-4 rotate-45" />
        </Button>
        <MicButton inline />
      </div>
    </div>
  );
}
