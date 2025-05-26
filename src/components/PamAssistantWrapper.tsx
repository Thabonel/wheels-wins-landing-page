tsx
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useRegion } from "@/context/RegionContext";
import { usePam } from "@/hooks/usePam";
import PamHeader from "@/components/pam/PamHeader";
import ChatMessages from "@/components/pam/ChatMessages";
import ChatInput from "@/components/pam/ChatInput";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button"; 
import { useMobile } from "@/hooks/use-mobile";

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

  const { isMobile } = useMobile();

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <Button className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
            Open Pam Assistant
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Pam Assistant</DrawerTitle>
            <DrawerDescription>Your personal AI helper.</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col h-[70vh] p-4">
            <PamHeader region={region} />
            <div className="flex-1 overflow-auto my-4">
              <ChatMessages messages={messages} />
            </div>
            <div className="mt-auto">
              <ChatInput onSendMessage={handleSend} />
            </div>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <>
      {/* Render PamAssistant here for desktop if needed, or nothing if this wrapper is only for mobile */}
    </>
  );
};

export default PamAssistant;