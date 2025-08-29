/**
 * PAM Chat POC Component
 * Testing Vercel AI SDK with basic chat functionality
 */

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { useVoiceAiSdk } from '../hooks/useVoiceAiSdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Mic, Square, Volume2, VolumeX, TestTube, Map, MapPin } from 'lucide-react';
import * as Sentry from '@sentry/react';
import { tripPlannerBridge } from '../services/tripPlannerBridge';
import { extractTripPlan } from '../services/routeParser';
import { useToast } from '@/hooks/use-toast';

interface PamChatPOCProps {
  className?: string;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

export const PamChatPOC: React.FC<PamChatPOCProps> = ({ className, onError, onSuccess }) => {
  const [metrics, setMetrics] = useState({
    totalMessages: 0,
    averageResponseTime: 0,
    successRate: 0,
  });
  const [lastTranscription, setLastTranscription] = useState<string>('');
  const [lastRoute, setLastRoute] = useState<any>(null);
  const { toast } = useToast();

  // Use AI SDK's useChat hook for chat functionality
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    api: '/api/v1/pam-ai-sdk/chat', // Backend AI SDK endpoint
    onResponse: (response) => {
      // Track response metrics
      const responseTime = Date.now();
      
      Sentry.addBreadcrumb({
        message: 'PAM POC Response received',
        data: { responseTime, status: response.status },
        level: 'info',
      });
    },
    onError: (error) => {
      Sentry.captureException(error);
      console.error('PAM POC Chat Error:', error);
      onError?.(error);
    },
    onFinish: (message) => {
      // Update metrics when message is complete
      setMetrics(prev => ({
        ...prev,
        totalMessages: prev.totalMessages + 1,
      }));
      
      // Check if response contains trip planning information
      const tripPlan = extractTripPlan(message.content);
      if (tripPlan) {
        setLastRoute(tripPlan);
        console.log('🗺️ Trip plan detected:', tripPlan);
      }
      
      // Speak the response if TTS is enabled and available
      if (isTtsSupported && !isListening) {
        speakText(message.content);
      }
      
      onSuccess?.();
    },
  });

  // Form ref for programmatic submission
  const formRef = useRef<HTMLFormElement>(null);
  const [autoSubmitOnTranscription, setAutoSubmitOnTranscription] = useState(true);

  // Use voice AI SDK hook for voice functionality
  const {
    isListening,
    isSpeaking,
    isThinking,
    voiceError,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    testVoicePipeline,
    isVoiceSupported,
    isTtsSupported,
  } = useVoiceAiSdk({
    onTranscription: (text) => {
      setLastTranscription(text);
      handleInputChange({ target: { value: text } } as any);
      
      // Auto-submit transcribed text if enabled
      if (autoSubmitOnTranscription && formRef.current) {
        setTimeout(() => {
          const submitEvent = new Event('submit', { 
            bubbles: true,
            cancelable: true 
          });
          formRef.current?.dispatchEvent(submitEvent);
        }, 100);
      }
    },
    onError: (error) => {
      console.error('Voice error:', error);
      Sentry.captureException(error);
    },
  });

  // Handle voice input toggle
  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Test voice pipeline
  const handleVoicePipelineTest = async () => {
    const result = await testVoicePipeline();
    console.log('Voice pipeline test result:', result);
  };

  // Test different scenarios
  const testScenarios = [
    "What's the weather like in New York?",
    "Search for RV parks near Yellowstone",
    "Help me plan a trip to Colorado",
    "Plan a trip from Sydney to Grampians on dirt roads",
  ];

  // Handle adding route to trip planner
  const handleAddToTripPlanner = () => {
    if (!lastRoute) {
      toast({
        title: "No route found",
        description: "Ask PAM to plan a trip first",
        variant: "destructive"
      });
      return;
    }

    try {
      // Send route to trip planner
      if (lastRoute.origin && lastRoute.destination) {
        tripPlannerBridge.addRoute(
          lastRoute.origin.name,
          lastRoute.destination.name,
          lastRoute.waypoints?.map((w: any) => w.name)
        );
        
        toast({
          title: "Route added to map",
          description: `${lastRoute.origin.name} → ${lastRoute.destination.name}`,
        });
      }
    } catch (error) {
      console.error('Error adding route to trip planner:', error);
      toast({
        title: "Failed to add route",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const runTestScenario = (scenario: string) => {
    handleInputChange({ target: { value: scenario } } as any);
    // Auto-submit after a brief delay to show the input
    setTimeout(() => {
      if (formRef.current) {
        const submitEvent = new Event('submit', { 
          bubbles: true,
          cancelable: true 
        });
        formRef.current.dispatchEvent(submitEvent);
      }
    }, 100);
  };

  return (
    <Card className={`w-full max-w-4xl mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>PAM AI SDK - Proof of Concept</span>
          <div className="flex gap-2">
            <Badge variant="secondary">Phase 0.3</Badge>
            <Badge variant={error ? "destructive" : "default"}>
              {error ? "Error" : "Active"}
            </Badge>
          </div>
        </CardTitle>
        
        {/* POC Metrics */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Messages: {metrics.totalMessages}</span>
          <span>Voice: {isVoiceSupported && isTtsSupported ? '✅' : '❌'}</span>
          <span>Status: {isListening ? 'Listening' : isSpeaking ? 'Speaking' : isThinking ? 'Thinking' : 'Ready'}</span>
          {lastTranscription && <span>Last: "{lastTranscription.slice(0, 20)}..."</span>}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Test Scenarios */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Quick Test Scenarios:</h4>
            <div className="flex gap-2">
              {lastRoute && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddToTripPlanner}
                  className="text-green-600"
                >
                  <Map className="w-3 h-3 mr-1" />
                  Add to Map
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleVoicePipelineTest}
                disabled={isLoading || isListening || isSpeaking}
              >
                <TestTube className="w-3 h-3 mr-1" />
                Test Voice
              </Button>
              {isSpeaking && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopSpeaking}
                >
                  <VolumeX className="w-3 h-3 mr-1" />
                  Stop
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {testScenarios.map((scenario, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => runTestScenario(scenario)}
                disabled={isLoading || isListening}
              >
                {scenario.slice(0, 20)}...
              </Button>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="min-h-[300px] max-h-[400px] overflow-y-auto space-y-3 p-4 border rounded-lg">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <p>PAM AI SDK POC Ready</p>
              <p className="text-xs">Test the new Vercel AI SDK integration</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <div className="text-xs opacity-70 mt-1">
                    {message.role === 'assistant' && 'PAM'} • AI SDK
                  </div>
                </div>
              </div>
            ))
          )}
          
          {/* Loading/Status indicators */}
          {(isLoading || isThinking) && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                <div className="text-xs opacity-70 mt-1">PAM is thinking...</div>
              </div>
            </div>
          )}
          
          {isListening && (
            <div className="flex justify-start">
              <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">Listening...</span>
                </div>
              </div>
            </div>
          )}
          
          {isSpeaking && (
            <div className="flex justify-start">
              <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span className="text-sm">Speaking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {(error || voiceError) && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            {error && (
              <p className="text-sm text-destructive">
                Chat Error: {error.message}
              </p>
            )}
            {voiceError && (
              <p className="text-sm text-destructive">
                Voice Error: {voiceError}
              </p>
            )}
          </div>
        )}

        {/* Input Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              placeholder={
                isListening
                  ? "Listening for voice input..."
                  : isSpeaking
                  ? "PAM is responding..."
                  : "Test PAM AI SDK integration..."
              }
              onChange={handleInputChange}
              disabled={isLoading || isListening || isSpeaking}
              className="pr-12"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`absolute right-1 top-1 h-8 w-8 ${
                isListening ? 'text-red-500' : isVoiceSupported ? 'text-blue-500' : 'text-muted-foreground'
              }`}
              onClick={handleVoiceToggle}
              disabled={isLoading || isSpeaking || !isVoiceSupported}
              title={
                !isVoiceSupported 
                  ? 'Voice not supported'
                  : isListening 
                  ? 'Stop listening'
                  : 'Start voice input'
              }
            >
              {isListening ? (
                <Square className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
          </div>
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>

        {/* POC Notes */}
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <strong>POC Notes:</strong>
          <ul className="mt-1 space-y-1">
            <li>• Testing Vercel AI SDK integration with streaming responses</li>
            <li>• Voice mode uses Web Speech API for real transcription</li>
            <li>• Trip planning integration with map (ask PAM to plan a trip)</li>
            <li>• Ready for A/B testing with feature flags</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};