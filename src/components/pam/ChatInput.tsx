
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import MicButton from "@/components/MicButton";
import { useOffline } from "@/context/OfflineContext";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isConnected?: boolean;
  isProcessing?: boolean;
}

export default function ChatInput({ onSendMessage, isConnected = true, isProcessing = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const { isOffline } = useOffline();

  // Always allow typing unless explicitly offline
  const isDisabled = isOffline;

  const handleSend = () => {
    if (!message.trim() || isProcessing) return;
    onSendMessage(message.trim());
    setMessage("");
  };

  const getPlaceholderText = () => {
    if (isOffline) return "PAM is offline...";
    if (!isConnected) return "Type your message (Demo mode)...";
    if (isProcessing) return "PAM is thinking...";
    return "Type your message...";
  };

  return (
    <div className="flex items-center gap-2 p-3 border-t bg-white">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={getPlaceholderText()}
        className="flex-1 border-blue-100 focus-visible:ring-blue-200"
        disabled={isDisabled}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !isProcessing) {
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
          disabled={isDisabled || !message.trim() || isProcessing}
          className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
        >
          <ArrowUp className="h-4 w-4 rotate-45" />
        </Button>
        <MicButton inline disabled={isDisabled} />
      </div>
    </div>
  );
}
