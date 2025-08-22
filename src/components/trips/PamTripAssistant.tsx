import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Send, 
  Sparkles,
  MapPin,
  DollarSign,
  Calendar,
  AlertCircle,
  Fuel,
  Cloud,
  Navigation
} from 'lucide-react';
import { usePam } from '@/context/PamContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PamTripAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  tripData?: {
    waypoints: any[];
    route?: any;
    startDate?: Date;
    endDate?: Date;
    budget?: number;
  };
  onSuggestion?: (suggestion: any) => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'pam';
  timestamp: Date;
  suggestions?: string[];
}

export default function PamTripAssistant({
  isOpen,
  onClose,
  tripData,
  onSuggestion
}: PamTripAssistantProps) {
  const { generateResponse, getRecommendations, updateContext, isAvailable } = usePam();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        text: "Hi! I'm PAM, your AI travel assistant. I can help you plan your trip, find campgrounds, estimate costs, and provide real-time advice. What would you like help with?",
        sender: 'pam',
        timestamp: new Date(),
        suggestions: [
          "Find campgrounds along my route",
          "Estimate fuel costs for this trip",
          "Check weather conditions",
          "Suggest scenic stops",
          "Find RV-friendly restaurants"
        ]
      };
      setMessages([welcomeMessage]);
      setSuggestions(welcomeMessage.suggestions || []);
    }
  }, [isOpen, messages.length]);

  // Update PAM context with trip data
  useEffect(() => {
    if (tripData && isOpen) {
      updateContext({
        currentTrip: {
          waypoints: tripData.waypoints,
          route: tripData.route,
          dates: {
            start: tripData.startDate,
            end: tripData.endDate
          },
          budget: tripData.budget
        }
      });
    }
  }, [tripData, isOpen, updateContext]);

  const handleSend = async () => {
    if (!input.trim() || !isAvailable) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setSuggestions([]);

    try {
      // Generate PAM response with trip context
      const response = await generateResponse(input, {
        tripData,
        messageHistory: messages
      });

      const pamMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'pam',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, pamMessage]);

      // Get contextual suggestions based on conversation
      if (input.includes('campground') || input.includes('RV park')) {
        const recommendations = await getRecommendations('travel');
        if (recommendations.length > 0) {
          setSuggestions([
            "Show on map",
            "Add to trip",
            "Check availability",
            "Read reviews"
          ]);
        }
      } else if (input.includes('fuel') || input.includes('cost')) {
        setSuggestions([
          "Calculate total trip cost",
          "Find cheapest gas stations",
          "Optimize route for fuel efficiency",
          "Set fuel budget alert"
        ]);
      } else if (input.includes('weather')) {
        setSuggestions([
          "Get 7-day forecast",
          "Check road conditions",
          "Find indoor activities",
          "Adjust travel dates"
        ]);
      }
    } catch (error) {
      console.error('PAM response error:', error);
      toast.error('PAM is having trouble responding. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    // Auto-send for quick actions
    if (suggestion.startsWith('Show') || suggestion.startsWith('Calculate')) {
      handleSend();
    }
  };

  const getQuickActions = () => {
    const actions = [];
    
    if (tripData?.waypoints && tripData.waypoints.length > 0) {
      actions.push({
        icon: <MapPin className="h-4 w-4" />,
        label: "Find stops",
        action: "Find interesting stops along my route"
      });
      
      actions.push({
        icon: <Fuel className="h-4 w-4" />,
        label: "Fuel plan",
        action: "Plan fuel stops for my RV"
      });
    }
    
    if (tripData?.route) {
      actions.push({
        icon: <DollarSign className="h-4 w-4" />,
        label: "Trip cost",
        action: "Estimate total trip costs"
      });
      
      actions.push({
        icon: <Cloud className="h-4 w-4" />,
        label: "Weather",
        action: "Check weather along route"
      });
    }
    
    actions.push({
      icon: <Navigation className="h-4 w-4" />,
      label: "Route tips",
      action: "Give me RV routing tips"
    });
    
    return actions;
  };

  if (!isOpen) return null;

  return (
    <Card className={cn(
      "absolute right-4 top-4 w-96 h-[600px] z-50",
      "shadow-xl border-2 flex flex-col"
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          PAM Assistant
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          ×
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 pt-0">
        {!isAvailable ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              PAM is currently unavailable. Please try again later.
            </p>
          </div>
        ) : (
          <>
            {/* Quick Actions */}
            {messages.length === 1 && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">Quick Actions:</p>
                <div className="grid grid-cols-2 gap-2">
                  {getQuickActions().map((action, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="justify-start text-xs"
                      onClick={() => {
                        setInput(action.action);
                        handleSend();
                      }}
                    >
                      {action.icon}
                      <span className="ml-1">{action.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2",
                        message.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      {message.suggestions && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-xs opacity-70 mb-1">Suggestions:</p>
                          <div className="flex flex-wrap gap-1">
                            {message.suggestions.map((sug, i) => (
                              <button
                                key={i}
                                onClick={() => handleSuggestionClick(sug)}
                                className="text-xs px-2 py-1 rounded bg-background/50 hover:bg-background/80 transition-colors"
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <div className="flex gap-1">
                        <span className="animate-bounce">●</span>
                        <span className="animate-bounce delay-100">●</span>
                        <span className="animate-bounce delay-200">●</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="py-2 border-t">
                <div className="flex flex-wrap gap-1">
                  {suggestions.map((sug, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleSuggestionClick(sug)}
                    >
                      {sug}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2 pt-3 border-t">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask PAM anything about your trip..."
                disabled={isTyping}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}