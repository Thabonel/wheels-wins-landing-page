import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useRegion } from "@/context/RegionContext";
import { usePam } from "@/hooks/usePam";
import PamHeader from "@/components/pam/PamHeader";
import ChatMessages from "@/components/pam/ChatMessages";
import ChatInput from "@/components/pam/ChatInput";

type Message = {
  sender: "user" | "pam";
  content: string;
  timestamp: Date;
};

const PamAssistant = ({ user }: { user: { name: string } }) => {
  const { region } = useRegion();
  const { messages: pamMessages, send } = usePam();
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = async (message: string) => {
    setMessages((prev) => [
      ...prev,
      { sender: "user", content: message, timestamp: new Date() },
    ]);
    const assistantMsg = await send(message);
    setMessages((prev) => [
      ...prev,
      { sender: "pam", content: assistantMsg.content, timestamp: new Date() },
    ]);
  };

  useEffect(() => {
    setMessages([...pamMessages]);
  }, [region, user.name, pamMessages]);

  if (!user) {
    return null;
  }

  return (
    <Card className="flex flex-col h-full p-4 rounded-xl shadow-md border-2 border-blue-100/30">
      <PamHeader region={region} />
      <div className="flex-1 overflow-auto my-4">
        <ChatMessages messages={messages} />
      </div>
      <div className="mt-auto">
        <ChatInput onSendMessage={handleSend} />
      </div>
    </Card>
  );
};

export default PamAssistant;
