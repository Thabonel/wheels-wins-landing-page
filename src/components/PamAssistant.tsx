
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizonal, MessageCircle } from "lucide-react";

interface PamAssistantProps {
  user: {
    name: string;
    avatar: string;
  };
}

const PamAssistant = ({ user }: PamAssistantProps) => {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Mock chat messages for visual layout
  const initialMessages = [
    { 
      sender: "pam", 
      content: `Hi ${user.name}! Ready to plan your next adventure?`, 
      timestamp: new Date() 
    }
  ];
  
  const [messages, setMessages] = useState(initialMessages);
  
  const quickReplies = [
    "Show this week's spending",
    "Add new event to calendar",
    "Where am I headed next?",
    "Find cheapest fuel nearby"
  ];

  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const handleQuickReply = (reply: string) => {
    const newMessages = [
      ...messages,
      { sender: "user", content: reply, timestamp: new Date() },
    ];
    setMessages(newMessages);
    
    // In a real app, we would process the message and generate a response
    // For this visual layout, we'll just simulate a response
    setTimeout(() => {
      setMessages([
        ...newMessages,
        { 
          sender: "pam", 
          content: "I'm just a visual demo right now, but I'd be happy to help with that in the real app!", 
          timestamp: new Date() 
        }
      ]);
    }, 1000);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    handleQuickReply(message);
    setMessage("");
  };
  
  return (
    <Card className="h-[calc(100vh-200px)] flex flex-col sticky top-20 rounded-xl shadow-md overflow-hidden border-2 border-blue-100/30">
      <CardHeader className="pb-2 sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-blue-50">
        <CardTitle className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-16 w-16 border-2 border-blue-200/50 shadow-sm animate-pulse-slow">
              <AvatarImage src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/Pam.webp" alt="Pam" className="object-cover" />
              <AvatarFallback className="bg-blue-100 text-blue-500 text-xl">PA</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-400 rounded-full border-2 border-white"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-blue-900">Chat with Pam</span>
            <span className="text-sm text-muted-foreground">Your Friendly Travel Companion</span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col h-full pt-4 px-3 pb-3">
        {/* Chat Messages */}
        <ScrollArea className="flex-1 pr-4 mb-4">
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.sender === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-blue-50 text-blue-900 relative before:absolute before:top-5 before:-left-2 before:w-4 before:h-4 before:rotate-45 before:bg-blue-50'
                  }`}
                >
                  <p className="leading-relaxed">{msg.content}</p>
                  <div className={`text-xs mt-2 ${
                    msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Quick Replies */}
        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <MessageCircle size={14} />
            <span>Suggestions:</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((reply, i) => (
              <Button 
                key={i} 
                variant="outline" 
                size="sm" 
                className="text-wrap text-left justify-start h-auto py-1.5 hover:bg-blue-50 border-blue-100 transition-colors"
                onClick={() => handleQuickReply(reply)}
              >
                {reply}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Message Input */}
        <form onSubmit={handleSubmit} className="mt-auto">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border-blue-100 focus-visible:ring-blue-200"
            />
            <Button type="submit" size="icon" className="bg-blue-500 hover:bg-blue-600">
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PamAssistant;
