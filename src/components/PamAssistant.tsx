import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useRegion } from "@/context/RegionContext";
import PamHeader from "./pam/PamHeader";
import ChatMessages from "./pam/ChatMessages";
import QuickReplies from "./pam/QuickReplies";
import ChatInput from "./pam/ChatInput";
import { getQuickReplies } from "./pam/chatUtils";
import { PamAssistantProps, ChatMessage } from "./pam/types";

const PamAssistant = ({ user }: PamAssistantProps) => {
  const { region } = useRegion();

  const initialMessages: ChatMessage[] = [
    {
      sender: "pam",
      content: `Hi ${user.name}! Ready to plan your next adventure in ${region}?`,
      timestamp: new Date(),
    },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const quickReplies = getQuickReplies(region);

  useEffect(() => {
    setMessages([
      {
        sender: "pam" as const,
        content: `Hi ${user.name}! Ready to plan your next adventure in ${region}?`,
        timestamp: new Date(),
      },
    ]);
  }, [region, user.name]);

  const handleQuickReply = (reply: string) => {
    const newMessages = [
      ...messages,
      { sender: "user" as const, content: reply, timestamp: new Date() },
    ];
    setMessages(newMessages);

    setTimeout(() => {
      const regionSpecificResponse = `I'd be happy to help with that for your adventures in ${region}! This is just a visual demo, but in the real app I'd provide region-specific assistance.`;

      setMessages([
        ...newMessages,
        {
          sender: "pam" as const,
          content: regionSpecificResponse,
          timestamp: new Date(),
        },
      ]);
    }, 1000);
  };

  return (
    <Card className="h-[calc(100vh-200px)] flex flex-col sticky top-20 rounded-xl shadow-md overflow-hidden border-2 border-blue-100/30">
      <PamHeader region={region} />

      <CardContent className="flex-1 flex flex-col h-full pt-4 px-3 pb-3">
        <ChatMessages messages={messages} />
        <div className="mt-4">
          <ChatInput onSendMessage={handleQuickReply} />
          <div className="overflow-x-auto mt-3">
            <QuickReplies
              replies={quickReplies}
              onReplyClick={handleQuickReply}
              region={region}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PamAssistant;
