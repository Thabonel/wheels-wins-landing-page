/**
 * Health Consultation Component
 * AI-powered health information assistant with medical disclaimers
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Bot,
  Send,
  Loader2,
  Info,
  Heart,
  Clock,
  FileText,
  Sparkles,
  Shield,
  Phone
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMedical } from '@/contexts/MedicalContext';
import { toast } from 'sonner';
import { 
  sendHealthConsultation, 
  buildHealthContext, 
  checkForEmergency as checkEmergency,
  saveConsultationToHistory,
  formatHealthResponse 
} from '@/services/health-ai/healthConsultationClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';

// Health consultation message type
interface HealthMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  hasEmergency?: boolean;
  tools?: string[];
}

export default function HealthConsultation() {
  const { user } = useAuth();
  const { medications, emergencyInfo, records } = useMedical();
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<HealthMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (disclaimerAccepted && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm your health information assistant. I can help you:

• Understand medical terms and test results
• Prepare questions for doctor appointments
• Learn about general health topics
• Get travel health tips for RV living
• Understand your medications (information only)

Remember: I provide health information only, not medical advice. Always consult healthcare professionals for medical concerns.

How can I help you today?`,
        timestamp: new Date()
      }]);
    }
  }, [disclaimerAccepted]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);


  // Handle message submission
  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const hasEmergency = checkEmergency(userMessage);

    // Add user message
    const newUserMessage: HealthMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      hasEmergency
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    // Check for emergency
    if (hasEmergency) {
      const emergencyMessage: HealthMessage = {
        id: `emergency-${Date.now()}`,
        role: 'system',
        content: '🚨 EMERGENCY DETECTED: If this is a medical emergency, call 911 immediately or go to the nearest emergency room. Do not rely on this assistant for emergency medical situations.',
        timestamp: new Date(),
        hasEmergency: true
      };
      setMessages(prev => [...prev, emergencyMessage]);
    }

    try {
      // Build context from medical records
      const context = await buildHealthContext(user?.id || '');

      // Call the real AI endpoint
      const result = await sendHealthConsultation(userMessage, context, {
        model: 'balanced',
        disclaimerAccepted
      });

      if (result.success) {
        const assistantMessage: HealthMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: formatHealthResponse(result.response),
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Save to history
        if (user?.id) {
          await saveConsultationToHistory(
            user.id,
            userMessage,
            result.response,
            hasEmergency
          );
        }
      } else {
        throw new Error(result.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Consultation error:', error);
      
      // Add error message
      const errorMessage: HealthMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I\'m unable to process your health question at the moment. For urgent medical concerns, please contact your healthcare provider or call 911.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  // Disclaimer dialog
  const DisclaimerDialog = () => (
    <Dialog open={showDisclaimer} onOpenChange={setShowDisclaimer}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Important Medical Disclaimer
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="space-y-4 text-sm">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Not Medical Advice</AlertTitle>
            <AlertDescription>
              This AI assistant provides general health information only. It is NOT a substitute for professional medical advice, diagnosis, or treatment.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <p className="font-semibold">By using this feature, you understand and agree that:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li>This service provides health information only, not medical advice</li>
              <li>You should never disregard professional medical advice or delay seeking it because of information provided here</li>
              <li>For medical emergencies, you will call 911 or seek immediate medical attention</li>
              <li>You will consult qualified healthcare professionals for all medical concerns</li>
              <li>This service does not create a doctor-patient relationship</li>
              <li>The information may not apply to your specific health situation</li>
            </ul>
          </div>

          <div className="flex items-center space-x-2 border-t pt-4">
            <Checkbox 
              id="accept-disclaimer" 
              checked={disclaimerAccepted}
              onCheckedChange={(checked) => setDisclaimerAccepted(checked as boolean)}
            />
            <label 
              htmlFor="accept-disclaimer" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I understand and accept these terms
            </label>
          </div>
        </DialogDescription>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setShowDisclaimer(false)}
            disabled={!disclaimerAccepted}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => setShowDisclaimer(false)}
            disabled={!disclaimerAccepted}
          >
            Continue to Health Assistant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (showDisclaimer) {
    return <DisclaimerDialog />;
  }

  return (
    <div className="space-y-4">
      {/* Header with emergency info */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Health Information Assistant
              </CardTitle>
              <CardDescription>
                Get health information and prepare for medical appointments
              </CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Information Only
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setInput('Help me prepare questions for my doctor appointment')}
        >
          <FileText className="h-4 w-4 mr-2" />
          Prepare for Visit
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setInput('Explain my recent test results')}
        >
          <Heart className="h-4 w-4 mr-2" />
          Test Results
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setInput('What are common side effects of my medications?')}
        >
          <Info className="h-4 w-4 mr-2" />
          Medication Info
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setInput('Travel health tips for RV living')}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Travel Health
        </Button>
      </div>

      {/* Chat interface */}
      <Card className="h-[500px] flex flex-col">
        <CardContent className="flex-1 p-0 flex flex-col">
          {/* Messages area */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : message.role === 'system'
                        ? 'bg-yellow-50 border border-yellow-200'
                        : 'bg-muted'
                    }`}
                  >
                    {message.hasEmergency && (
                      <div className="flex items-center gap-2 mb-2 font-semibold">
                        <Phone className="h-4 w-4" />
                        Emergency: Call 911
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {format(message.timestamp, 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Ask a health information question..."
                className="min-h-[60px] resize-none"
                disabled={isLoading}
              />
              <Button 
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-[60px] w-[60px]"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Persistent disclaimer */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          This assistant provides health information only. Always consult healthcare professionals for medical advice. In emergencies, call 911.
        </AlertDescription>
      </Alert>
    </div>
  );
}