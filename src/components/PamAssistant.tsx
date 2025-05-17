import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useRegion } from "@/context/RegionContext";
import { usePam } from "@/hooks/usePam";
import PamHeader from "./pam/PamHeader";
import ChatMessages from "./pam/ChatMessages";
import ChatInput from "./pam/ChatInput";

const PamAssistant = ({ user }: { user: { name: string } }) => {
  const initialMessages: ChatMessage[] = [
    {
      sender: "pam",
      content: `Hi ${user.name}! Ready to plan your next adventure in ${region}?`,
      timestamp: new Date(),
    },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const { region } = useRegion();
  const { messages: pamMessages, send } = usePam();

  useEffect(() => {
    // No need to manage messages state here, use usePam's messages
  }, [region, user.name]);

  useEffect(() => {
    const configure = () => {
      (window as any).botpress.on("webchat:ready", () => (window as any).botpress.open());
      (window as any).botpress.init({
        botId: "4df68009-c8b1-46ef-8d26-af6b2b6a384b",
        configuration: {
          composerPlaceholder: "Where are we heading today? 🚐",
          botName: "Pam",
          botAvatar: "https://files.bpcontent.cloud/2025/04/17/03/20250417033327-8SFLHLTI.webp",
          botDescription: "Hey there! I’m Pam – your smart, travel-savvy sidekick.\nNeed help with planning, budgeting, or just curious? I’ve got answers!",
          website: { title: "https://wheelsandwins.com", link: "https://wheelsandwins.com" },
          email: { title: "info@wheelsandwins.com", link: "info@wheelsandwins.com" },
          phone: {},
          termsOfService: { title: "Terms of service", link: "https://wheelsandwins.com/terms" },
          privacyPolicy: { title: "Privacy policy", link: "https://wheelsandwins.com/privacy" },
          color: "#218380",
          variant: "solid",
          themeMode: "light",
          fontFamily: "inter",
          radius: 1,
          showPoweredBy: true
        },
        clientId: "67cb8c1b-bcb4-4b12-98f5-f807b85b31a9",
        selector: "#webchat"
      });
    };

    if ((window as any).botpress) {
      configure();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdn.botpress.cloud/webchat/v2.4/inject.js";
      script.onload = configure;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <>
    <Card className="h-[calc(100vh-200px)] flex flex-col sticky top-20 rounded-xl shadow-md overflow-hidden border-2 border-blue-100/30">
      <PamHeader region={region} />

      <CardContent className="flex-1 flex flex-col h-full pt-4 px-3 pb-3">
        <ChatMessages messages={pamMessages} />
        <div className="mt-4">
          <ChatInput onSendMessage={send} />
          <div className="overflow-x-auto mt-3"> {/* This div is kept for potential future use or styling */}
          </div>
        </div>
      </CardContent>
    </Card>
    <div id="webchat"></div>
    </>
  );
};

export default PamAssistant;
