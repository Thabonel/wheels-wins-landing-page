import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useExpenseVoiceCommands } from '@/components/pam/voice/ExpenseVoiceCommands';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface VoiceExpenseLoggerProps {
  onExpenseLogged?: () => void;
  className?: string;
}

export default function VoiceExpenseLogger({ 
  onExpenseLogged,
  className 
}: VoiceExpenseLoggerProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isDriving, setIsDriving] = useState(false);
  const { toast } = useToast();
  
  const { isListening, transcript } = useExpenseVoiceCommands({
    enabled: voiceEnabled,
    onExpenseCreated: () => {
      if (onExpenseLogged) onExpenseLogged();
    },
    debug: true
  });

  // Auto-enable voice when driving mode is activated
  useEffect(() => {
    if (isDriving && !voiceEnabled) {
      setVoiceEnabled(true);
    }
  }, [isDriving]);

  const toggleVoice = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    
    if (newState) {
      toast({
        title: "Voice logging activated",
        description: "Say 'log [amount] dollars for [category]'",
        duration: 3000
      });
    } else {
      toast({
        title: "Voice logging deactivated",
        description: "Tap the microphone to re-enable",
        duration: 2000
      });
    }
  };

  const toggleDrivingMode = () => {
    const newState = !isDriving;
    setIsDriving(newState);
    
    if (newState) {
      // Speak instructions when entering driving mode
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(
          "Driving mode activated. Voice expense logging is ready. " +
          "Say 'log' followed by the amount and category. " +
          "For example: 'log 45 dollars for gas'"
        );
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Driving mode indicator */}
      {isDriving && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-green-500 animate-pulse" />
      )}
      
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Voice Expense Logger
              {isDriving && (
                <Badge variant="secondary" className="gap-1">
                  <Car className="h-3 w-3" />
                  Driving
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Hands-free expense tracking while you drive
            </CardDescription>
          </div>
          
          <Button
            variant={isDriving ? "default" : "outline"}
            size="sm"
            onClick={toggleDrivingMode}
            className="gap-2"
          >
            <Car className="h-4 w-4" />
            {isDriving ? "Exit Driving" : "Driving Mode"}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main voice button */}
        <div className="flex justify-center">
          <Button
            onClick={toggleVoice}
            variant={voiceEnabled ? "default" : "secondary"}
            size="lg"
            className={cn(
              "rounded-full w-24 h-24 transition-all duration-200",
              voiceEnabled && "shadow-lg",
              isListening && "animate-pulse ring-4 ring-offset-2 ring-primary/20"
            )}
          >
            {voiceEnabled ? (
              <Mic className="h-8 w-8" />
            ) : (
              <MicOff className="h-8 w-8" />
            )}
          </Button>
        </div>

        {/* Status and transcript */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            {isListening && <Volume2 className="h-4 w-4 animate-pulse text-green-500" />}
            <span className="text-sm text-muted-foreground">
              {voiceEnabled 
                ? (isListening ? "Listening..." : "Voice ready") 
                : "Voice disabled"}
            </span>
          </div>
          
          {transcript && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm italic">"{transcript}"</p>
            </div>
          )}
        </div>

        {/* Voice command examples */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Example commands:</h4>
          <div className="grid gap-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>"Log 45 dollars for gas"</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>"Expense thirty two fifty for food at diner"</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>"Add 15 bucks for toll"</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>"Spent twenty for parking"</span>
            </div>
          </div>
        </div>

        {/* Safety notice */}
        {isDriving && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <Car className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                Voice commands are designed for hands-free use while driving. 
                Keep your eyes on the road and hands on the wheel.
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}