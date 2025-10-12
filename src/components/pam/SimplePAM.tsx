import React, { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react';
import { Send, Loader2, AlertCircle, Bot, User, VolumeX, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
// import claudeService, { type ChatMessage as ClaudeMessage } from '@/services/claude';
// import { getToolsForClaude } from '@/services/pam/tools/toolRegistry';
import { PamApiService } from '@/services/pamApiService';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { VoiceSettings } from './voice/VoiceSettings';
import { VoiceToggle } from './voice/VoiceToggle';
import { useTextToSpeech } from '@/hooks/voice/useTextToSpeech';
import { toast } from 'sonner';
import './SimplePAM.css';

/**
 * Message interface for PAM chat
 */
export interface PAMMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
  isLoading?: boolean;
}

/**
 * Props for SimplePAM component
 */
export interface SimplePAMProps {
  className?: string;
  defaultMessage?: string;
  onMessageSent?: (message: string, response: string) => void;
  enableVoice?: boolean;
  autoSendVoiceInput?: boolean;
  showVoiceSettings?: boolean;
}

/**
 * Simple PAM chat component
 */
export const SimplePAM: React.FC<SimplePAMProps> = ({
  className,
  defaultMessage = "👋 Hi! I'm PAM, your personal AI manager. I can help you with your finances, trip planning, and expense tracking. What would you like to know?",
  onMessageSent,
  enableVoice = true,
  autoSendVoiceInput = true,
  showVoiceSettings = true
}) => {
  // State management
  const [messages, setMessages] = useState<PAMMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: defaultMessage,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceInputEnabled, setVoiceInputEnabled] = useState(true);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [isListeningForVoice, setIsListeningForVoice] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { user, token, session } = useAuth();
  const tts = useTextToSpeech({
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8
  });

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Generate unique message ID
   */
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  /**
   * Get PAM API service instance
   */
  const pamApiService = PamApiService.getInstance();

  /**
   * Handle voice input from VoiceToggle
   */
  const handleVoiceInput = useCallback((transcript: string, confidence: number) => {
    if (!voiceInputEnabled || !transcript.trim()) return;

    // Populate the text input
    setInput(transcript.trim());

    // Auto-send if enabled and confidence is high enough
    if (autoSendVoiceInput && confidence > 0.7) {
      // Small delay to allow UI to update
      setTimeout(() => {
        if (!isLoading) {
          // We'll call sendMessage directly with the transcript
          const messageText = transcript.trim();
          if (messageText) {
            handleSendMessage(messageText);
          }
        }
      }, 100);
    } else {
      // Focus input for user to review/edit
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [voiceInputEnabled, autoSendVoiceInput, isLoading]);

  /**
   * Handle voice command from VoiceToggle
   */
  const handleVoiceCommand = useCallback((command: string) => {
    // Stop any current TTS before processing new command
    if (tts.isSpeaking) {
      tts.stopSpeaking();
    }

    // Process common voice commands
    const normalizedCommand = command.toLowerCase().trim();
    
    if (normalizedCommand.includes('clear chat') || normalizedCommand.includes('reset')) {
      clearChat();
      if (voiceOutputEnabled) {
        tts.speak('Chat cleared.');
      }
      return;
    }
    
    if (normalizedCommand.includes('stop speaking') || normalizedCommand.includes('be quiet')) {
      tts.stopSpeaking();
      return;
    }

    // For other commands, treat as regular input
    handleVoiceInput(command, 1.0);
  }, [tts, voiceOutputEnabled, handleVoiceInput]);

  /**
   * Speak assistant response if voice output is enabled
   */
  const speakResponse = useCallback((text: string) => {
    if (!voiceOutputEnabled || !tts.isSupported) return;

    // Clean up text for TTS (remove markdown, etc.)
    const cleanText = text
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*(.+?)\*/g, '$1')     // Remove italic markdown
      .replace(/`(.+?)`/g, '$1')       // Remove code markdown
      .replace(/#{1,6}\s(.+)/g, '$1')  // Remove headers
      .replace(/\n+/g, ' ')            // Replace newlines with spaces
      .trim();

    if (cleanText) {
      tts.speak(cleanText);
    }
  }, [voiceOutputEnabled, tts]);

  /**
   * Handle voice settings changes
   */
  const handleVoiceInputToggle = useCallback((enabled: boolean) => {
    setVoiceInputEnabled(enabled);
    if (!enabled && tts.isSpeaking) {
      // If disabling voice and TTS is speaking, stop it
      tts.stopSpeaking();
    }
  }, [tts]);

  const handleVoiceOutputToggle = useCallback((enabled: boolean) => {
    setVoiceOutputEnabled(enabled);
    if (!enabled && tts.isSpeaking) {
      tts.stopSpeaking();
    }
  }, [tts]);

  /**
   * Send message to Claude
   */
  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    // Stop any current TTS before sending new message
    if (tts.isSpeaking) {
      tts.stopSpeaking();
    }

    // Clear input and error
    setInput('');
    setError(null);

    // Add user message
    const userMessage: PAMMessage = {
      id: generateId(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Add loading message
    const loadingMessage: PAMMessage = {
      id: 'loading',
      role: 'assistant',
      content: 'PAM is thinking...',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, loadingMessage]);

    try {
      // Ensure user is authenticated for backend API
      if (!user || !token) {
        throw new Error('User authentication required');
      }

      // Use backend PAM API service for authenticated users
      const response = await pamApiService.sendMessage({
        message: textToSend,
        user_id: user.id,
        context: {
          current_page: 'simple-pam-test',
          session_data: {
            conversation_length: messages.length
          }
        }
      }, token);

      // Remove loading message and add response
      const responseContent = response.response || response.message || response.content || 'Sorry, I did not receive a proper response.';

      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'loading');
        return [...filtered, {
          id: generateId(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date()
        }];
      });

      // Speak the response if voice output is enabled
      setTimeout(() => {
        speakResponse(responseContent);
      }, 100);

      // Call callback if provided
      if (onMessageSent) {
        onMessageSent(textToSend, responseContent);
      }

    } catch (error) {
      console.error('PAM Error:', error);
      console.error('PAM Error Details:', {
        message: error?.message,
        stack: error?.stack,
        user: !!user,
        hasToken: !!token,
        tokenLength: token?.length
      });

      // Remove loading message and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'loading');
        return [...filtered, {
          id: generateId(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error?.message || 'Unknown error'}. Please try again or contact support if this continues.`,
          timestamp: new Date(),
          isError: true
        }];
      });

      setError(`Failed to get response from PAM: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      // Focus input for next message
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Wrapper for sending message from input
   */
  const sendMessage = () => {
    handleSendMessage();
  };

  /**
   * Clear chat history
   */
  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: defaultMessage,
      timestamp: new Date()
    }]);
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <Card className={cn('flex flex-col h-full max-h-[600px] w-full', className)}>
      {/* Header */}
      <div className="pam-header flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">PAM - Personal AI Manager</h2>
          {tts.isSpeaking && (
            <div className="flex items-center gap-1">
              <Volume2 className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-xs text-primary">Speaking...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {tts.isSpeaking && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => tts.stopSpeaking()}
              className="text-xs"
            >
              <VolumeX className="h-4 w-4" />
              Stop
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="text-xs"
          >
            Clear Chat
          </Button>
        </div>
      </div>

      {/* Voice Settings */}
      {enableVoice && showVoiceSettings && (
        <VoiceSettings
          onVoiceInputChange={handleVoiceInputToggle}
          onVoiceOutputChange={handleVoiceOutputToggle}
        />
      )}

      {/* Messages Area */}
      <ScrollArea className="pam-messages flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'pam-message flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'pam-message-bubble max-w-[80%] rounded-lg p-3',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-12'
                    : 'bg-muted mr-12',
                  message.isError && 'bg-destructive/10 text-destructive',
                  message.isLoading && 'pam-message-loading'
                )}
              >
                {/* Avatar */}
                <div className="flex items-start gap-2">
                  <div className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
                    message.role === 'user' 
                      ? 'bg-primary-foreground/20' 
                      : 'bg-muted-foreground/20'
                  )}>
                    {message.role === 'user' ? (
                      <User className="h-3 w-3" />
                    ) : (
                      <Bot className="h-3 w-3" />
                    )}
                  </div>
                  
                  {/* Message Content */}
                  <div className="flex-1">
                    {message.isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">{message.content}</span>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    
                    {/* Timestamp */}
                    <span className="text-xs opacity-50 mt-1 block">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mx-4 mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Input Area */}
      <div className="pam-input-area p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isLoading ? "PAM is thinking..." : "Ask PAM about your finances, trips, or expenses..."}
            disabled={isLoading}
            className="flex-1"
          />
          
          {/* Voice Toggle */}
          {enableVoice && voiceInputEnabled && (
            <VoiceToggle
              onTranscript={handleVoiceInput}
              onVoiceCommand={handleVoiceCommand}
              disabled={isLoading}
              size="md"
              showTTSButton={false}
              className="flex-shrink-0"
            />
          )}
          
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
      </div>
    </Card>
  );
};