/**
 * PAM AI SDK Component
 * Complete migration from WebSocket to Vercel AI SDK
 */

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Loader2, 
  AlertCircle,
  MapPin,
  DollarSign,
  Calendar,
  Bot,
  User,
  Settings,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { pamConfig } from '@/experiments/ai-sdk-poc/config/pam-config';
import { tripPlannerBridge } from '@/experiments/ai-sdk-poc/services/tripPlannerBridge';
import { extractTripPlan } from '@/experiments/ai-sdk-poc/services/routeParser';
import * as Sentry from '@sentry/react';
import { cn } from '@/lib/utils';

interface PamAiSdkProps {
  className?: string;
  mode?: 'floating' | 'embedded' | 'fullscreen';
}

export const PamAiSdk: React.FC<PamAiSdkProps> = ({ 
  className, 
  mode = 'floating' 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastRoute, setLastRoute] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Use Vercel AI SDK chat hook
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
  } = useChat({
    api: '/api/v1/pam-ai-sdk/chat',
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hi ${user?.user_metadata?.name || 'there'}! I'm PAM, your AI travel assistant. I can help you plan trips, track expenses, find campgrounds, and more. How can I help you today?`,
      },
    ],
    onResponse: (response) => {
      // Track response metrics
      Sentry.addBreadcrumb({
        message: 'PAM AI SDK response received',
        data: { status: response.status },
        level: 'info',
      });
    },
    onFinish: (message) => {
      // Check for trip planning content
      const tripPlan = extractTripPlan(message.content);
      if (tripPlan) {
        setLastRoute(tripPlan);
      }

      // Speak response if voice enabled
      if (voiceEnabled && !isListening) {
        speakText(message.content);
      }
    },
    onError: (error) => {
      console.error('PAM AI SDK Error:', error);
      Sentry.captureException(error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to PAM. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');

          if (event.results[0].isFinal) {
            handleInputChange({ target: { value: transcript } } as any);
            // Auto-submit after voice input
            setTimeout(() => {
              formRef.current?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }, 100);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [handleInputChange]);

  // Voice functions
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      // Use a natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') ||
        voice.name.includes('Samantha')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Handle adding route to trip planner
  const handleAddToTripPlanner = () => {
    if (!lastRoute) {
      toast({
        title: 'No route found',
        description: 'Ask PAM to plan a trip first',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (lastRoute.origin && lastRoute.destination) {
        tripPlannerBridge.addRoute(
          lastRoute.origin.name,
          lastRoute.destination.name,
          lastRoute.waypoints?.map((w: any) => w.name)
        );
        
        toast({
          title: 'Route added to map',
          description: `${lastRoute.origin.name} → ${lastRoute.destination.name}`,
        });
      }
    } catch (error) {
      console.error('Error adding route to trip planner:', error);
      toast({
        title: 'Failed to add route',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  // Render message with formatting
  const renderMessage = (message: any) => {
    const isUser = message.role === 'user';
    
    return (
      <div
        key={message.id}
        className={cn(
          'flex gap-3 mb-4',
          isUser ? 'justify-end' : 'justify-start'
        )}
      >
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
        )}
        
        <div
          className={cn(
            'max-w-[80%] rounded-lg px-4 py-2',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          
          {/* Show tools used */}
          {message.toolInvocations?.map((tool: any, index: number) => (
            <div key={index} className="mt-2 text-xs opacity-70">
              <span className="inline-flex items-center gap-1">
                {tool.toolName === 'weather' && <MapPin className="w-3 h-3" />}
                {tool.toolName === 'trackExpense' && <DollarSign className="w-3 h-3" />}
                {tool.toolName === 'planTrip' && <Calendar className="w-3 h-3" />}
                {tool.toolName}
              </span>
            </div>
          ))}
        </div>
        
        {isUser && (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
      </div>
    );
  };

  // Floating mode button
  if (mode === 'floating' && !isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-lg',
          className
        )}
      >
        <Bot className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        mode === 'floating' && 'fixed bottom-4 right-4 w-96 h-[600px] shadow-xl',
        mode === 'fullscreen' && 'w-full h-full',
        mode === 'embedded' && 'w-full h-full',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">PAM - AI Travel Assistant</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {lastRoute && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddToTripPlanner}
              title="Add to trip planner"
            >
              <MapPin className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
          >
            {voiceEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </Button>
          
          {mode === 'floating' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" style={{ height: 'calc(100% - 140px)' }}>
        {messages.map(renderMessage)}
        
        {isLoading && (
          <div className="flex justify-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div className="bg-muted rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Connection error. Please try again.</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => reload()}
            >
              Retry
            </Button>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="p-4 border-t"
      >
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={
              isListening
                ? 'Listening...'
                : 'Ask PAM anything...'
            }
            disabled={isLoading || isListening}
            className="flex-1"
          />
          
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading || !recognitionRef.current}
          >
            {isListening ? (
              <MicOff className="w-4 h-4 text-red-500" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
          
          {isSpeaking && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={stopSpeaking}
            >
              <VolumeX className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default PamAiSdk;