import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/AnimatedDialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, X } from 'lucide-react';
import { useAuth } from "@/context/AuthContext";
import { usePamConnection } from "@/hooks/usePamConnection";

interface AdminPamChatProps {
  isPamChatOpen: boolean;
  setIsPamChatOpen: (open: boolean) => void;
}

interface ChatMessage {
  id: string;
  message: string;
  sender: 'user' | 'pam';
  timestamp: Date;
}

const AdminPamChat: React.FC<AdminPamChatProps> = ({
  isPamChatOpen,
  setIsPamChatOpen,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      message: 'Hello! I\'m PAM, your AI assistant. How can I help you manage the admin panel today?',
      sender: 'pam',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const { user } = useAuth();
  const pamConnection = usePamConnection();

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user?.id || isTyping) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      message: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const sentText = inputMessage;
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await pamConnection.sendMessage(sentText, {
        user_id: user.id,
        current_page: 'admin_dashboard',
        input_mode: 'text',
      });

      const responseText = response.error
        ? (response.message || 'PAM encountered an error. Please try again.')
        : (response.response || response.content || response.message || 'I could not process that request.');

      const pamResponse: ChatMessage = {
        id: crypto.randomUUID(),
        message: responseText,
        sender: 'pam',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, pamResponse]);
    } catch {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        message: 'Sorry, I was unable to connect to PAM right now. Please try again.',
        sender: 'pam',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={isPamChatOpen} onOpenChange={setIsPamChatOpen}>
      <DialogContent className="max-w-md h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-blue-500 text-white">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <DialogTitle>PAM Admin Assistant</DialogTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsPamChatOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'pam' && (
                  <Avatar className="h-6 w-6 mt-1">
                    <AvatarFallback className="bg-blue-500 text-white text-xs">
                      <Bot className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 text-sm ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.message}
                </div>
                {message.sender === 'user' && (
                  <Avatar className="h-6 w-6 mt-1">
                    <AvatarFallback className="bg-gray-500 text-white text-xs">
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-2 justify-start">
                <Avatar className="h-6 w-6 mt-1">
                  <AvatarFallback className="bg-blue-500 text-white text-xs">
                    <Bot className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 rounded-lg p-3 text-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask PAM about admin tasks..."
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage} 
              size="sm"
              disabled={!inputMessage.trim() || isTyping}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminPamChat;