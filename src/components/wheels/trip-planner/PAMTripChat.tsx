import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MessageSquare,
  Send,
  Minimize2,
  Maximize2,
  X,
  Mic,
  MicOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePAMContext } from './PAMContext';

interface PAMTripChatProps {
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  onClose?: () => void;
  className?: string;
}

export default function PAMTripChat({
  isMinimized = false,
  onToggleMinimize,
  onClose,
  className
}: PAMTripChatProps) {
  const { context, sendMessage, isConnected } = usePAMContext();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [context.chatHistory]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const messageContent = message.trim();
    setMessage('');
    setIsLoading(true);

    try {
      await sendMessage(messageContent);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setMessage(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const quickSuggestions = [
    "Plan a 2-week Southwest loop under $1500",
    "Add rest day but keep same budget", 
    "Any friends nearby on this route?",
    "Find scenic route to avoid traffic",
    "Optimize for fuel efficiency"
  ];

  if (isMinimized) {
    return (
      <div className={cn("fixed bottom-4 right-4 z-50", className)}>
        <Button
          onClick={onToggleMinimize}
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        >
          <div className="relative">
            <MessageSquare className="w-6 h-6" />
            {context.chatHistory.length > 0 && (
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                <span className="text-xs text-destructive-foreground font-bold">
                  {context.chatHistory.filter(m => m.role === 'assistant').length}
                </span>
              </div>
            )}
          </div>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("fixed bottom-4 right-4 z-50 w-96 h-[32rem]", className)}>
      <Card className="h-full flex flex-col shadow-xl border-primary/20">
        {/* Header */}
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src="/pam-avatar.png" alt="PAM AI trip planning assistant avatar" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                  PAM
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-sm">
                  PAM Trip Assistant
                </h3>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isConnected ? "bg-success animate-pulse" : "bg-muted"
                  )} />
                  <span className="text-xs text-muted-foreground">
                    {isConnected ? 'Ready to help plan your trip' : 'Connecting...'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onToggleMinimize && (
                <Button variant="ghost" size="sm" onClick={onToggleMinimize}>
                  <Minimize2 className="w-4 h-4" />
                </Button>
              )}
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto space-y-3 pb-3">
          {context.chatHistory.length === 0 && (
            <div className="text-center py-8">
              <h4 className="font-medium text-sm mb-2">Ready to plan your RV adventure?</h4>
              <p className="text-xs text-muted-foreground mb-4">
                I can help you plan routes, optimize budgets, find friends, and more!
              </p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Try asking:</p>
                {quickSuggestions.slice(0, 3).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setMessage(suggestion)}
                    className="block w-full text-left text-xs p-2 bg-muted/50 rounded hover:bg-muted transition-colors"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {context.chatHistory.map((msg) => (
            <div key={msg.id} className={cn(
              "flex gap-3",
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}>
              {msg.role === 'assistant' && (
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarImage src="/pam-avatar.png" alt="PAM AI trip planning assistant avatar" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    P
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                msg.role === 'user' 
                  ? "bg-primary text-primary-foreground ml-auto" 
                  : "bg-muted"
              )}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs opacity-70">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.context?.suggestion && (
                    <Badge variant="secondary" className="text-xs ml-2">
                      {msg.context.suggestion}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <Avatar className="w-6 h-6 flex-shrink-0">
                <AvatarImage src="/pam-avatar.png" alt="PAM AI trip planning assistant avatar" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  P
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <div className="flex-shrink-0 p-4 pt-0">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask PAM about your trip..."
                disabled={isLoading || !isConnected}
                className="pr-10"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={handleVoiceInput}
                disabled={isLoading || !isConnected}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4 text-destructive animate-pulse" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading || !isConnected}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {context.currentTrip.origin && (
            <div className="mt-2 text-xs text-muted-foreground">
              Current trip: {context.currentTrip.origin} → {context.currentTrip.destination}
              {context.currentTrip.budget && ` • $${context.currentTrip.budget} budget`}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}