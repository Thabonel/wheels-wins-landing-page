
import { useRef, useEffect } from "react";
import { ChatMessage } from "./types";
import { PamKnowledgeIndicator } from "@/components/knowledge/PamKnowledgeIndicator";

interface ChatMessagesProps {
  messages: ChatMessage[];
}

const ChatMessages = ({ messages }: ChatMessagesProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the bottom when messages change
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      className="flex-1 overflow-y-auto px-4 pb-4"
      style={{ maxHeight: "60vh", scrollPaddingBottom: '80px' }} // Locks scroll to this area and adds padding
    >
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} mb-3`}
        >
          <div
            className={`max-w-[85%] rounded-2xl p-4 ${
              msg.sender === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-blue-50 text-blue-900 relative before:absolute before:top-5 before:-left-2 before:w-4 before:h-4 before:rotate-45 before:bg-blue-50"
            }`}
          >
            <p className="leading-relaxed">{msg.content}</p>
            
            {/* Show knowledge indicator for assistant messages with knowledge */}
            {msg.sender === "pam" && (msg as any).knowledgeUsed && (msg as any).knowledgeUsed.length > 0 && (
              <div className="mt-3">
                <PamKnowledgeIndicator knowledgeUsed={(msg as any).knowledgeUsed} />
              </div>
            )}
            
            <div
              className={`text-xs mt-2 ${
                msg.sender === "user"
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground"
              }`}
            >
              {msg.timestamp?.toLocaleTimeString?.([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatMessages;
