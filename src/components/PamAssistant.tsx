
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { SendHorizonal } from "lucide-react";

interface PamAssistantProps {
  user: {
    name: string;
    avatar: string;
  };
}

const PamAssistant = ({ user }: PamAssistantProps) => {
  const [message, setMessage] = useState("");
  
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
    <Card className="h-[calc(100vh-200px)] flex flex-col sticky top-20">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Avatar className="h-8 w-8 bg-primary">
            <AvatarImage src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets//Pam.webp" alt="Pam" />
            <AvatarFallback>PA</AvatarFallback>
          </Avatar>
          <span>Chat with Pam</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col h-full">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-lg p-3 ${
                  msg.sender === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}
              >
                <p>{msg.content}</p>
                <div className={`text-xs mt-1 ${
                  msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Quick Replies */}
        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-medium text-muted-foreground">Suggestions:</h4>
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((reply, i) => (
              <Button 
                key={i} 
                variant="outline" 
                size="sm" 
                className="text-wrap text-left justify-start h-auto py-1.5"
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
              className="flex-1"
            />
            <Button type="submit" size="icon">
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PamAssistant;
