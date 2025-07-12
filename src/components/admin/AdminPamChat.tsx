import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, X } from 'lucide-react';

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

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const pamResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: getPamResponse(inputMessage),
        sender: 'pam',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, pamResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const getPamResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('user') || input.includes('manage users')) {
      return 'I can help you manage users! You can view user analytics, update user roles, or export user data from the User Management section.';
    } else if (input.includes('analytics') || input.includes('data')) {
      return 'The analytics dashboard shows user behavior, system performance, and travel insights. Would you like me to explain any specific metrics?';
    } else if (input.includes('shop') || input.includes('product')) {
      return 'For shop management, you can create products, manage inventory, and track orders. The shop system integrates with affiliate programs and digital products.';
    } else if (input.includes('help') || input.includes('how')) {
      return 'I can assist with: User Management, Analytics Review, Shop Administration, System Settings, and Content Moderation. What would you like to explore?';
    } else if (input.includes('problem') || input.includes('issue')) {
      return 'I can help troubleshoot admin panel issues. Check the System Health in Settings, review error logs, or let me know what specific problem you\'re experiencing.';
    } else {
      return 'I understand you\'re asking about admin management. I can help with users, analytics, shop management, and system administration. What specific area interests you?';
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
              onKeyPress={handleKeyPress}
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