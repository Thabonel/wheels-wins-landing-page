/**
 * Optimized PAM Components
 * 
 * Performance-optimized React components using React.memo, useMemo, useCallback,
 * and other optimization techniques to minimize re-renders and improve performance.
 */

import React, { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { performanceMonitor, usePerformanceOptimizer } from '../performance/performanceOptimizer';
import { cn } from '@/lib/utils';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    responseTime?: number;
    tokenCount?: number;
    cached?: boolean;
  };
}

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

interface MessageListProps {
  messages: Message[];
  onMessageAction?: (messageId: string, action: string) => void;
  className?: string;
}

interface PamStatusProps {
  isConnected: boolean;
  responseTime?: number;
  totalMessages: number;
  errorCount: number;
  className?: string;
}

interface TypingIndicatorProps {
  isVisible: boolean;
  className?: string;
}

// =====================================================
// OPTIMIZED CHAT INPUT COMPONENT
// =====================================================

const ChatInput = memo<ChatInputProps>(({
  onSendMessage,
  isLoading = false,
  placeholder = "Type your message...",
  maxLength = 2000,
  className = ''
}) => {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { debounce, measureLatency } = usePerformanceOptimizer();

  // Debounced auto-resize function
  const debouncedResize = useMemo(
    () => debounce(
      () => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      },
      'textarea-resize',
      { delay: 100 }
    ),
    []
  );

  // Handle input change with performance tracking
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    if (newValue.length <= maxLength) {
      setMessage(newValue);
      debouncedResize();
    }
  }, [maxLength, debouncedResize]);

  // Handle send message with performance measurement
  const handleSend = useCallback(async () => {
    if (!message.trim() || isLoading) return;

    const messageToSend = message.trim();
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await measureLatency(
        () => onSendMessage(messageToSend),
        'chat-send-message'
      );
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [message, isLoading, onSendMessage, measureLatency]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend, isComposing]);

  // Composition event handlers for better international input support
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  const isDisabled = isLoading || !message.trim();

  return (
    <Card className={cn('border-t-0 rounded-t-none', className)}>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              placeholder={placeholder}
              disabled={isLoading}
              className="min-h-[60px] max-h-[200px] resize-none pr-20"
              rows={1}
            />
            
            {/* Character count */}
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {message.length}/{maxLength}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {isLoading && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  PAM is thinking...
                </div>
              )}
            </div>

            <Button
              onClick={handleSend}
              disabled={isDisabled}
              size="sm"
              className="ml-auto"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ChatInput.displayName = 'ChatInput';

// =====================================================
// OPTIMIZED MESSAGE ITEM COMPONENT
// =====================================================

const MessageItem = memo<{
  message: Message;
  onAction?: (messageId: string, action: string) => void;
}>(({ message, onAction }) => {
  const [isVisible, setIsVisible] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  // Intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (messageRef.current) {
      observer.observe(messageRef.current);
    }

    return () => {
      if (messageRef.current) {
        observer.unobserve(messageRef.current);
      }
    };
  }, []);

  // Memoized action handler
  const handleAction = useCallback((action: string) => {
    onAction?.(message.id, action);
    performanceMonitor.trackRender('MessageAction', performance.now());
  }, [message.id, onAction]);

  const isUser = message.role === 'user';

  return (
    <div
      ref={messageRef}
      className={cn(
        'flex w-full mb-4 animate-in slide-in-from-bottom-2 duration-300',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {isVisible ? (
        <div
          className={cn(
            'max-w-[80%] rounded-lg px-4 py-3 shadow-sm',
            isUser 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-900 border'
          )}
        >
          {/* Message content */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>

          {/* Metadata */}
          {message.metadata && (
            <div className={cn(
              'mt-2 flex items-center gap-2 text-xs',
              isUser ? 'text-blue-100' : 'text-gray-500'
            )}>
              {message.metadata.responseTime && (
                <Badge variant="outline" className="text-xs">
                  {message.metadata.responseTime}ms
                </Badge>
              )}
              {message.metadata.cached && (
                <Badge variant="outline" className="text-xs">
                  📋 Cached
                </Badge>
              )}
              {message.metadata.tokenCount && (
                <Badge variant="outline" className="text-xs">
                  {message.metadata.tokenCount} tokens
                </Badge>
              )}
            </div>
          )}

          {/* Timestamp */}
          <div className={cn(
            'mt-2 text-xs opacity-70',
            isUser ? 'text-right' : 'text-left'
          )}>
            {message.timestamp.toLocaleTimeString()}
          </div>

          {/* Action buttons for assistant messages */}
          {!isUser && onAction && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAction('thumbsUp')}
                className="h-6 px-2 text-xs hover:bg-gray-200"
              >
                👍
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAction('thumbsDown')}
                className="h-6 px-2 text-xs hover:bg-gray-200"
              >
                👎
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAction('copy')}
                className="h-6 px-2 text-xs hover:bg-gray-200"
              >
                📋
              </Button>
            </div>
          )}
        </div>
      ) : (
        // Skeleton loader while not visible
        <div className={cn(
          'max-w-[80%] rounded-lg px-4 py-3 bg-gray-200 animate-pulse',
          isUser ? 'ml-auto' : 'mr-auto'
        )}>
          <div className="h-4 bg-gray-300 rounded mb-2" />
          <div className="h-4 bg-gray-300 rounded w-3/4" />
        </div>
      )}
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

// =====================================================
// OPTIMIZED MESSAGE LIST COMPONENT
// =====================================================

const MessageList = memo<MessageListProps>(({ 
  messages, 
  onMessageAction,
  className = ''
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Memoized messages to prevent unnecessary re-renders
  const memoizedMessages = useMemo(() => messages, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, shouldAutoScroll]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = useCallback(() => {
    if (listRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
      setShouldAutoScroll(isAtBottom);
    }
  }, []);

  // Memoized message action handler
  const handleMessageAction = useCallback((messageId: string, action: string) => {
    onMessageAction?.(messageId, action);
  }, [onMessageAction]);

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      className={cn(
        'flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100',
        className
      )}
    >
      {memoizedMessages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onAction={handleMessageAction}
        />
      ))}
    </div>
  );
});

MessageList.displayName = 'MessageList';

// =====================================================
// OPTIMIZED TYPING INDICATOR
// =====================================================

const TypingIndicator = memo<TypingIndicatorProps>(({ 
  isVisible, 
  className = '' 
}) => {
  if (!isVisible) return null;

  return (
    <div className={cn('flex items-center gap-2 px-4 py-2 text-gray-500', className)}>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
      </div>
      <span className="text-sm">PAM is typing...</span>
    </div>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

// =====================================================
// OPTIMIZED PAM STATUS COMPONENT
// =====================================================

const PamStatus = memo<PamStatusProps>(({
  isConnected,
  responseTime,
  totalMessages,
  errorCount,
  className = ''
}) => {
  // Memoized status calculation
  const status = useMemo(() => {
    if (!isConnected) return 'offline';
    if (errorCount > 5) return 'error';
    if (responseTime && responseTime > 3000) return 'slow';
    return 'online';
  }, [isConnected, responseTime, errorCount]);

  const statusConfig = useMemo(() => {
    const configs = {
      online: { color: 'bg-green-500', text: 'Online', textColor: 'text-green-700' },
      slow: { color: 'bg-yellow-500', text: 'Slow', textColor: 'text-yellow-700' },
      error: { color: 'bg-red-500', text: 'Issues', textColor: 'text-red-700' },
      offline: { color: 'bg-gray-500', text: 'Offline', textColor: 'text-gray-700' }
    };
    return configs[status];
  }, [status]);

  return (
    <Card className={cn('border-b border-gray-200', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">PAM Assistant</CardTitle>
          
          <div className="flex items-center gap-3">
            {/* Connection status */}
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full', statusConfig.color)} />
              <span className={cn('text-sm font-medium', statusConfig.textColor)}>
                {statusConfig.text}
              </span>
            </div>

            {/* Performance metrics */}
            {responseTime && (
              <Badge variant="outline" className="text-xs">
                {responseTime}ms
              </Badge>
            )}
          </div>
        </div>

        <CardDescription className="flex items-center gap-4 text-sm">
          <span>{totalMessages} messages</span>
          {errorCount > 0 && (
            <span className="text-red-600">{errorCount} errors</span>
          )}
        </CardDescription>
      </CardHeader>
    </Card>
  );
});

PamStatus.displayName = 'PamStatus';

// =====================================================
// OPTIMIZED MAIN PAM CHAT COMPONENT
// =====================================================

interface OptimizedPamChatProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  onMessageAction?: (messageId: string, action: string) => void;
  isLoading?: boolean;
  isConnected?: boolean;
  className?: string;
}

const OptimizedPamChat = memo<OptimizedPamChatProps>(({
  messages,
  onSendMessage,
  onMessageAction,
  isLoading = false,
  isConnected = true,
  className = ''
}) => {
  // Memoized calculations
  const stats = useMemo(() => {
    const totalMessages = messages.length;
    const errorCount = messages.filter(m => 
      m.metadata?.responseTime && m.metadata.responseTime > 5000
    ).length;
    const avgResponseTime = messages
      .filter(m => m.metadata?.responseTime)
      .reduce((sum, m) => sum + (m.metadata?.responseTime || 0), 0) / 
      Math.max(messages.filter(m => m.metadata?.responseTime).length, 1);

    return { totalMessages, errorCount, avgResponseTime };
  }, [messages]);

  // Memoized handlers
  const handleSendMessage = useCallback(async (message: string) => {
    await onSendMessage(message);
  }, [onSendMessage]);

  const handleMessageAction = useCallback((messageId: string, action: string) => {
    onMessageAction?.(messageId, action);
  }, [onMessageAction]);

  return (
    <div className={cn('flex flex-col h-full bg-white rounded-lg overflow-hidden', className)}>
      {/* Status header */}
      <PamStatus
        isConnected={isConnected}
        responseTime={stats.avgResponseTime}
        totalMessages={stats.totalMessages}
        errorCount={stats.errorCount}
      />

      {/* Message list */}
      <MessageList
        messages={messages}
        onMessageAction={handleMessageAction}
        className="flex-1"
      />

      {/* Typing indicator */}
      <TypingIndicator isVisible={isLoading} />

      {/* Chat input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        placeholder="Ask PAM anything..."
        maxLength={2000}
      />
    </div>
  );
});

OptimizedPamChat.displayName = 'OptimizedPamChat';

// =====================================================
// PERFORMANCE WRAPPER COMPONENT
// =====================================================

interface PerformanceWrapperProps {
  children: React.ReactNode;
  componentName: string;
  enableProfiling?: boolean;
}

const PerformanceWrapper = memo<PerformanceWrapperProps>(({
  children,
  componentName,
  enableProfiling = process.env.NODE_ENV === 'development'
}) => {
  const renderStart = useRef<number>(0);

  useEffect(() => {
    if (enableProfiling) {
      renderStart.current = performance.now();
    }
  });

  useEffect(() => {
    if (enableProfiling && renderStart.current > 0) {
      const renderTime = performance.now() - renderStart.current;
      performanceMonitor.trackRender(componentName, renderTime);
      
      if (renderTime > 16) {
        console.warn(`⚠️ Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
    }
  });

  return <>{children}</>;
});

PerformanceWrapper.displayName = 'PerformanceWrapper';

// =====================================================
// EXPORTS
// =====================================================

export {
  ChatInput,
  MessageItem,
  MessageList,
  TypingIndicator,
  PamStatus,
  OptimizedPamChat,
  PerformanceWrapper
};

export default OptimizedPamChat;