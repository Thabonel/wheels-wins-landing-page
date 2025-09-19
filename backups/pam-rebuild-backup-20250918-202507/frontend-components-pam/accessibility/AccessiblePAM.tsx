/**
 * Accessible PAM Component
 * 
 * Fully accessible version of SimplePAM with:
 * - ARIA labels and roles
 * - Keyboard navigation
 * - Screen reader announcements
 * - Focus management
 * - Skip links
 * - Color contrast compliance
 */

import React, { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react';
import { Send, Loader2, AlertCircle, Bot, User, VolumeX, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import claudeService, { type ChatMessage as ClaudeMessage } from '@/services/claude';
import { getToolsForClaude } from '@/services/pam/tools/toolRegistry';
import { useUser } from '@supabase/auth-helpers-react';
import { cn } from '@/lib/utils';
import { VoiceSettings } from '../voice/VoiceSettings';
import { VoiceToggle } from '../voice/VoiceToggle';
import { useTextToSpeech } from '@/hooks/voice/useTextToSpeech';
import { useAccessibility } from '@/services/pam/accessibility/accessibilityService';
import { toast } from 'sonner';
import '../SimplePAM.css';

// Message interface (same as SimplePAM)
export interface PAMMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
  isLoading?: boolean;
}

// Props interface (same as SimplePAM)
export interface AccessiblePAMProps {
  className?: string;
  defaultMessage?: string;
  onMessageSent?: (message: string, response: string) => void;
  enableVoice?: boolean;
  autoSendVoiceInput?: boolean;
  showVoiceSettings?: boolean;
}

/**
 * Skip Links Component
 */
const SkipLinks: React.FC = () => {
  const { getAriaLabels } = useAccessibility();
  const labels = getAriaLabels();

  return (
    <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-0 focus-within:left-0 focus-within:z-50">
      <div className="bg-primary text-primary-foreground p-2 rounded-br-md shadow-lg">
        <Button
          variant="ghost"
          size="sm"
          className="mr-2 text-primary-foreground hover:bg-primary/20"
          onClick={() => {
            const messagesArea = document.getElementById('pam-messages-area');
            messagesArea?.focus();
          }}
        >
          {labels.skipToMessages}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:bg-primary/20"
          onClick={() => {
            const messageInput = document.getElementById('pam-message-input');
            messageInput?.focus();
          }}
        >
          {labels.skipToInput}
        </Button>
      </div>
    </div>
  );
};

/**
 * Accessible Message Component
 */
interface AccessibleMessageProps {
  message: PAMMessage;
  isLatest: boolean;
}

const AccessibleMessage: React.FC<AccessibleMessageProps> = ({ message, isLatest }) => {
  const { getAriaLabels } = useAccessibility();
  const labels = getAriaLabels();

  const getMessageLabel = () => {
    if (message.isLoading) return labels.loadingMessage;
    if (message.isError) return labels.errorMessage;
    return message.role === 'user' ? labels.userMessage : labels.assistantMessage;
  };

  const getMessageContent = () => {
    const content = message.content;
    const timestamp = message.timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return `${content}. Sent at ${timestamp}`;
  };

  return (
    <div
      role="article"
      aria-label={getMessageLabel()}
      aria-live={isLatest && message.role === 'assistant' ? 'polite' : 'off'}
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
          message.isError && 'bg-destructive/10 text-destructive border border-destructive',
          message.isLoading && 'pam-message-loading'
        )}
      >
        {/* Avatar with accessible description */}
        <div className="flex items-start gap-2">
          <div 
            className={cn(
              'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
              message.role === 'user' 
                ? 'bg-primary-foreground/20' 
                : 'bg-muted-foreground/20'
            )}
            aria-hidden="true"
          >
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
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span className="text-sm">{message.content}</span>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
            
            {/* Timestamp */}
            <span 
              className="text-xs opacity-50 mt-1 block"
              aria-label={`${labels.messageTimestamp}: ${message.timestamp.toLocaleTimeString()}`}
            >
              {message.timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Main Accessible PAM Component
 */
export const AccessiblePAM: React.FC<AccessiblePAMProps> = ({
  className,
  defaultMessage = "👋 Hi! I'm PAM, your personal AI manager. I can help you with your finances, trip planning, and expense tracking. What would you like to know?",
  onMessageSent,
  enableVoice = true,
  autoSendVoiceInput = true,
  showVoiceSettings = true
}) => {
  // All state management (same as SimplePAM)
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
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const clearButtonRef = useRef<HTMLButtonElement>(null);

  // Hooks
  const user = useUser();
  const tts = useTextToSpeech({
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8
  });
  
  const { 
    announce, 
    announceNewMessage, 
    announceStatusChange, 
    manageFocus, 
    getAriaLabels 
  } = useAccessibility();
  
  const labels = getAriaLabels();

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Listen for accessibility keyboard events
  useEffect(() => {
    const handleAccessibilityEvents = (event: Event) => {
      switch (event.type) {
        case 'pam-send-message':
          handleSendMessage();
          break;
        case 'pam-clear-chat':
          clearChat();
          break;
        case 'pam-toggle-voice':
          setVoiceInputEnabled(prev => !prev);
          break;
        case 'pam-stop-speaking':
          if (tts.isSpeaking) {
            tts.stopSpeaking();
            announceStatusChange('ready');
          }
          break;
      }
    };

    document.addEventListener('pam-send-message', handleAccessibilityEvents);
    document.addEventListener('pam-clear-chat', handleAccessibilityEvents);
    document.addEventListener('pam-toggle-voice', handleAccessibilityEvents);
    document.addEventListener('pam-stop-speaking', handleAccessibilityEvents);

    return () => {
      document.removeEventListener('pam-send-message', handleAccessibilityEvents);
      document.removeEventListener('pam-clear-chat', handleAccessibilityEvents);
      document.removeEventListener('pam-toggle-voice', handleAccessibilityEvents);
      document.removeEventListener('pam-stop-speaking', handleAccessibilityEvents);
    };
  }, [input, isLoading, tts, announceStatusChange]);

  // Generate unique message ID (same as SimplePAM)
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Convert internal messages to Claude format (same as SimplePAM)
  const toClaudeMessages = (msgs: PAMMessage[]): ClaudeMessage[] => {
    return msgs
      .filter(msg => !msg.isError && !msg.isLoading && msg.role !== 'assistant' || msg.id !== 'welcome')
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.timestamp
      }));
  };

  // Voice input handler with accessibility announcements
  const handleVoiceInput = useCallback((transcript: string, confidence: number) => {
    if (!voiceInputEnabled || !transcript.trim()) return;

    announce(`Voice input received: ${transcript}`, 'polite');
    setInput(transcript.trim());

    if (autoSendVoiceInput && confidence > 0.7) {
      setTimeout(() => {
        if (!isLoading) {
          const messageText = transcript.trim();
          if (messageText) {
            handleSendMessage(messageText);
          }
        }
      }, 100);
    } else {
      setTimeout(() => {
        if (inputRef.current) {
          manageFocus({ element: inputRef.current, reason: 'completion' });
        }
      }, 100);
    }
  }, [voiceInputEnabled, autoSendVoiceInput, isLoading, announce, manageFocus]);

  // Voice command handler (same as SimplePAM but with announcements)
  const handleVoiceCommand = useCallback((command: string) => {
    if (tts.isSpeaking) {
      tts.stopSpeaking();
    }

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
      announceStatusChange('ready');
      return;
    }

    handleVoiceInput(command, 1.0);
  }, [tts, voiceOutputEnabled, handleVoiceInput, announceStatusChange]);

  // Speak response with accessibility support
  const speakResponse = useCallback((text: string) => {
    if (!voiceOutputEnabled || !tts.isSupported) return;

    const cleanText = text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/#{1,6}\s(.+)/g, '$1')
      .replace(/\n+/g, ' ')
      .trim();

    if (cleanText) {
      announceStatusChange('speaking');
      tts.speak(cleanText);
    }
  }, [voiceOutputEnabled, tts, announceStatusChange]);

  // Voice settings handlers with announcements
  const handleVoiceInputToggle = useCallback((enabled: boolean) => {
    setVoiceInputEnabled(enabled);
    announce(`Voice input ${enabled ? 'enabled' : 'disabled'}`, 'polite');
    if (!enabled && tts.isSpeaking) {
      tts.stopSpeaking();
    }
  }, [tts, announce]);

  const handleVoiceOutputToggle = useCallback((enabled: boolean) => {
    setVoiceOutputEnabled(enabled);
    announce(`Voice output ${enabled ? 'enabled' : 'disabled'}`, 'polite');
    if (!enabled && tts.isSpeaking) {
      tts.stopSpeaking();
    }
  }, [tts, announce]);

  // Send message with accessibility support
  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    // Stop TTS and announce
    if (tts.isSpeaking) {
      tts.stopSpeaking();
    }
    
    announceStatusChange('thinking');
    setInput('');
    setError(null);

    const userMessage: PAMMessage = {
      id: generateId(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    announceNewMessage('user', textToSend);
    setIsLoading(true);

    const loadingMessage: PAMMessage = {
      id: 'loading',
      role: 'assistant',
      content: 'PAM is thinking...',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, loadingMessage]);

    try {
      // Same Claude API call as SimplePAM
      const claudeMessages = toClaudeMessages([...messages, userMessage]);
      
      const systemPrompt = `You are PAM (Personal AI Manager), a helpful AI assistant for the Wheels & Wins platform.
      ${user ? `The user is logged in with email: ${user.email}` : 'The user is not logged in.'}
      
      Your role:
      - Help users with financial tracking, budgeting, and expense analysis
      - Assist with trip planning, fuel tracking, and travel expenses
      - Provide personalized insights and recommendations using the available tools
      - Be conversational, helpful, and concise
      
      Available Tools:
      You have access to 10 powerful tools to help users:
      
      Financial Tools:
      - getUserExpenses: Get expense data with filtering by date, category, or amount
      - getUserBudgets: Get budget information and spending analysis
      - getIncomeData: Retrieve income information for financial planning
      - calculateSavings: Calculate savings rates and goal progress
      
      Profile & Settings:
      - getUserProfile: Get user profile and financial goals
      - getUserSettings: Access user preferences and settings
      
      Calendar & Events:
      - getUpcomingEvents: Get upcoming trips, bills, and financial deadlines
      
      Travel & Vehicle:
      - getTripHistory: Analyze past trips, costs, and travel patterns
      - getVehicleData: Get vehicle info, maintenance, and insurance details
      - getFuelData: Analyze fuel consumption, costs, and efficiency
      
      When users ask questions about their data, use the appropriate tools to provide accurate, personalized responses. Always explain what data you're retrieving and why it's helpful for their situation.
      
      Keep responses friendly and focused on practical advice.`;

      const pamTools = getToolsForClaude();
      
      const response = await claudeService.chat(claudeMessages, {
        systemPrompt,
        maxTokens: 500,
        temperature: 0.7,
        tools: pamTools,
        userId: user?.id
      });

      // Remove loading message and add response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'loading');
        return [...filtered, {
          id: generateId(),
          role: 'assistant',
          content: response.content,
          timestamp: response.timestamp || new Date()
        }];
      });

      // Announce new message and speak response
      announceNewMessage('assistant', response.content);
      setTimeout(() => {
        speakResponse(response.content);
      }, 100);

      if (onMessageSent) {
        onMessageSent(textToSend, response.content);
      }

    } catch (error) {
      console.error('PAM Error:', error);
      
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'loading');
        return [...filtered, {
          id: generateId(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again or contact support if this continues.',
          timestamp: new Date(),
          isError: true
        }];
      });

      setError('Failed to get response from PAM. Please try again.');
      announceStatusChange('error');
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        if (inputRef.current) {
          manageFocus({ element: inputRef.current, reason: 'completion' });
        }
      }, 100);
    }
  };

  // Keyboard handler with accessibility
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Send message wrapper
  const sendMessage = () => {
    handleSendMessage();
  };

  // Clear chat with accessibility
  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: defaultMessage,
      timestamp: new Date()
    }]);
    setError(null);
    announce('Chat history cleared', 'polite');
    if (inputRef.current) {
      manageFocus({ element: inputRef.current, reason: 'user-action' });
    }
  };

  return (
    <>
      <SkipLinks />
      
      <Card 
        className={cn('flex flex-col h-full max-h-[600px] w-full', className)}
        role="region"
        aria-label={labels.pamContainer}
      >
        {/* Header */}
        <div 
          className="pam-header flex items-center justify-between p-4 border-b"
          role="banner"
          aria-label={labels.pamHeader}
        >
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
            <h1 className="text-lg font-semibold">PAM - Personal AI Manager</h1>
            {tts.isSpeaking && (
              <div 
                className="flex items-center gap-1"
                aria-label={labels.speakingIndicator}
              >
                <Volume2 className="h-4 w-4 text-primary animate-pulse" aria-hidden="true" />
                <span className="text-xs text-primary">Speaking...</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {tts.isSpeaking && (
              <Button
                ref={clearButtonRef}
                variant="ghost"
                size="sm"
                onClick={() => {
                  tts.stopSpeaking();
                  announceStatusChange('ready');
                }}
                className="text-xs"
                aria-label={labels.stopSpeakingButton}
              >
                <VolumeX className="h-4 w-4" aria-hidden="true" />
                Stop
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-xs"
              aria-label={labels.clearButton}
              aria-describedby="clear-chat-help"
            >
              Clear Chat
            </Button>
            <div id="clear-chat-help" className="sr-only">
              Removes all messages and starts a new conversation
            </div>
          </div>
        </div>

        {/* Voice Settings */}
        {enableVoice && showVoiceSettings && (
          <div aria-label={labels.voiceSettings}>
            <VoiceSettings
              onVoiceInputChange={handleVoiceInputToggle}
              onVoiceOutputChange={handleVoiceOutputToggle}
            />
          </div>
        )}

        {/* Messages Area */}
        <ScrollArea 
          id="pam-messages-area"
          className="pam-messages flex-1 p-4" 
          ref={scrollAreaRef}
          role="log"
          aria-label={labels.messagesArea}
          aria-live="polite"
          tabIndex={0}
        >
          <div className="space-y-4">
            {messages.map((message, index) => (
              <AccessibleMessage
                key={message.id}
                message={message}
                isLatest={index === messages.length - 1}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Error Alert */}
        {error && (
          <Alert 
            variant="destructive" 
            className="mx-4 mb-2"
            role="alert"
            aria-label={labels.errorAlert}
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Input Area */}
        <div 
          className="pam-input-area p-4 border-t"
          role="form"
          aria-label="Send message to PAM"
        >
          <div className="flex gap-2">
            <Input
              id="pam-message-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isLoading ? "PAM is thinking..." : "Ask PAM about your finances, trips, or expenses..."}
              disabled={isLoading}
              className="flex-1"
              aria-label={labels.messageInput}
              aria-describedby="message-input-help"
            />
            <div id="message-input-help" className="sr-only">
              Type your message and press Enter to send, or use the send button
            </div>
            
            {/* Voice Toggle */}
            {enableVoice && voiceInputEnabled && (
              <VoiceToggle
                onTranscript={handleVoiceInput}
                onVoiceCommand={handleVoiceCommand}
                disabled={isLoading}
                size="md"
                showTTSButton={false}
                className="flex-shrink-0"
                aria-label={labels.voiceToggle}
              />
            )}
            
            <Button
              ref={sendButtonRef}
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="flex-shrink-0"
              aria-label={labels.sendButton}
              aria-describedby="send-button-help"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
            <div id="send-button-help" className="sr-only">
              Send your message to PAM. Also works with Ctrl+Enter keyboard shortcut.
            </div>
          </div>
          
          {/* Helper Text */}
          {!user && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Log in to get personalized financial insights and access your data
            </p>
          )}

          {/* Keyboard Shortcuts Help */}
          <div className="text-xs text-muted-foreground mt-2 text-center">
            Press Ctrl+/ for keyboard shortcuts
          </div>
        </div>
      </Card>
    </>
  );
};

export default AccessiblePAM;