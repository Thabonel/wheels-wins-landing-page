/**
 * Accessible Virtualized Conversation Component
 * 
 * High-performance virtual scrolling with full accessibility support:
 * - ARIA roles and labels for virtual items
 * - Keyboard navigation through virtualized messages
 * - Screen reader announcements for scroll position
 * - Focus management for virtual elements
 * - Accessible loading states and error handling
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { performanceMonitor } from '../performance/performanceOptimizer';
import { useAccessibility } from '@/services/pam/accessibility/accessibilityService';
import { cn } from '@/lib/utils';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    tokenCount?: number;
    responseTime?: number;
    cached?: boolean;
    error?: boolean;
  };
  reactions?: {
    thumbsUp?: boolean;
    thumbsDown?: boolean;
    rating?: number;
  };
}

interface AccessibleVirtualizedConversationProps {
  messages: ConversationMessage[];
  height: number;
  itemHeight?: number;
  onMessageReaction?: (messageId: string, reaction: 'thumbsUp' | 'thumbsDown' | 'rating', value?: number) => void;
  onLoadMore?: () => void;
  isLoading?: boolean;
  className?: string;
  overscan?: number;
  enableAutoScroll?: boolean;
  scrollToBottomOnNew?: boolean;
  // Accessibility-specific props
  announceNewMessages?: boolean;
  keyboardNavigationEnabled?: boolean;
  screenReaderOptimized?: boolean;
}

interface MessageItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    messages: ConversationMessage[];
    onMessageReaction?: (messageId: string, reaction: string, value?: number) => void;
    itemHeight: number;
    announceNewMessages: boolean;
    keyboardNavigationEnabled: boolean;
    activeIndex: number;
    setActiveIndex: (index: number) => void;
  };
}

// =====================================================
// ACCESSIBLE MESSAGE COMPONENT
// =====================================================

const AccessibleMessageItem = React.memo<MessageItemProps>(({ index, style, data }) => {
  const { 
    messages, 
    onMessageReaction, 
    itemHeight, 
    announceNewMessages,
    keyboardNavigationEnabled,
    activeIndex,
    setActiveIndex
  } = data;
  
  const message = messages[index];
  const [isVisible, setIsVisible] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const { announce, getAriaLabels } = useAccessibility();
  const labels = getAriaLabels();

  const isActive = keyboardNavigationEnabled && activeIndex === index;

  // Intersection observer for lazy loading message content
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        
        // Announce when message becomes visible for screen readers
        if (entry.isIntersecting && announceNewMessages && message.role === 'assistant') {
          const cleanContent = message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '');
          announce(`New assistant message: ${cleanContent}`, 'polite');
        }
      },
      { threshold: 0.1 }
    );

    if (messageRef.current) {
      observer.observe(messageRef.current);
    }

    return () => {
      if (messageRef.current) {
        observer.unobserve(messageRef.current);
      }
    };
  }, [message, announceNewMessages, announce]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!keyboardNavigationEnabled) return;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (index > 0) {
          setActiveIndex(index - 1);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (index < messages.length - 1) {
          setActiveIndex(index + 1);
        }
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(messages.length - 1);
        break;
      case 'Enter':
      case ' ':
        if (!message.metadata?.error && message.role === 'assistant') {
          event.preventDefault();
          // Focus first reaction button if available
          const firstButton = messageRef.current?.querySelector('button');
          firstButton?.focus();
        }
        break;
    }
  }, [index, messages.length, setActiveIndex, keyboardNavigationEnabled, message]);

  const handleReaction = useCallback((reaction: string, value?: number) => {
    onMessageReaction?.(message.id, reaction, value);
    
    // Track interaction for performance monitoring
    performanceMonitor.trackRender('MessageReaction', performance.now());
    
    // Announce reaction to screen reader
    announce(`${reaction} reaction ${value ? `with rating ${value}` : ''} added to message`, 'polite');
  }, [message.id, onMessageReaction, announce]);

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const hasError = message.metadata?.error;

  // Get accessible description for the message
  const getMessageDescription = () => {
    const roleText = isUser ? 'Your message' : isSystem ? 'System message' : 'PAM response';
    const timestamp = message.timestamp.toLocaleTimeString();
    const errorText = hasError ? 'Error occurred' : '';
    const metadataText = message.metadata?.responseTime ? `Response time: ${message.metadata.responseTime}ms` : '';
    
    return [roleText, errorText, metadataText, `sent at ${timestamp}`].filter(Boolean).join('. ');
  };

  return (
    <div 
      ref={messageRef} 
      style={style} 
      className={cn(
        'px-4 py-2 focus-within:outline-none',
        isActive && keyboardNavigationEnabled && 'ring-2 ring-primary ring-offset-2'
      )}
      role="article"
      aria-label={getMessageDescription()}
      tabIndex={keyboardNavigationEnabled ? (isActive ? 0 : -1) : undefined}
      onKeyDown={handleKeyDown}
      aria-posinset={index + 1}
      aria-setsize={messages.length}
    >
      {isVisible ? (
        <div
          className={cn(
            'flex w-full',
            isUser ? 'justify-end' : 'justify-start'
          )}
        >
          <div
            className={cn(
              'max-w-[80%] rounded-lg px-4 py-2 shadow-sm',
              isUser && 'bg-blue-500 text-white',
              !isUser && !isSystem && 'bg-gray-100 text-gray-900',
              isSystem && 'bg-yellow-50 border border-yellow-200 text-yellow-800',
              hasError && 'bg-red-50 border border-red-200 text-red-800'
            )}
          >
            {/* Message Content */}
            <div 
              className="text-sm leading-relaxed"
              aria-describedby={`message-${message.id}-timestamp`}
            >
              {message.content}
            </div>

            {/* Message Metadata */}
            {message.metadata && (
              <div 
                className="mt-2 text-xs opacity-70 space-y-1"
                role="group"
                aria-label="Message metadata"
              >
                {message.metadata.responseTime && (
                  <div aria-label={`Response time: ${message.metadata.responseTime} milliseconds`}>
                    Response: {message.metadata.responseTime}ms
                  </div>
                )}
                {message.metadata.tokenCount && (
                  <div aria-label={`Token count: ${message.metadata.tokenCount}`}>
                    Tokens: {message.metadata.tokenCount}
                  </div>
                )}
                {message.metadata.cached && (
                  <div className="text-green-400" aria-label="This response was cached">
                    📋 Cached
                  </div>
                )}
                {message.metadata.error && (
                  <div className="text-red-400" aria-label="An error occurred with this message">
                    ⚠️ Error
                  </div>
                )}
              </div>
            )}

            {/* Timestamp */}
            <div 
              id={`message-${message.id}-timestamp`}
              className={cn(
                'mt-2 text-xs opacity-60',
                isUser ? 'text-right' : 'text-left'
              )}
              aria-label={`Message sent at ${message.timestamp.toLocaleTimeString()}`}
            >
              {message.timestamp.toLocaleTimeString()}
            </div>

            {/* Reaction Buttons (for assistant messages) */}
            {!isUser && !isSystem && !hasError && (
              <div 
                className="mt-2 flex items-center gap-2"
                role="group"
                aria-label="Message reaction buttons"
              >
                <button
                  onClick={() => handleReaction('thumbsUp')}
                  className={cn(
                    'text-xs px-2 py-1 rounded transition-colors focus:ring-2 focus:ring-primary focus:ring-offset-1',
                    message.reactions?.thumbsUp
                      ? 'bg-green-100 text-green-700'
                      : 'hover:bg-gray-200 focus:bg-gray-200'
                  )}
                  aria-label={`${message.reactions?.thumbsUp ? 'Remove' : 'Add'} thumbs up reaction`}
                  aria-pressed={message.reactions?.thumbsUp}
                >
                  👍
                </button>
                <button
                  onClick={() => handleReaction('thumbsDown')}
                  className={cn(
                    'text-xs px-2 py-1 rounded transition-colors focus:ring-2 focus:ring-primary focus:ring-offset-1',
                    message.reactions?.thumbsDown
                      ? 'bg-red-100 text-red-700'
                      : 'hover:bg-gray-200 focus:bg-gray-200'
                  )}
                  aria-label={`${message.reactions?.thumbsDown ? 'Remove' : 'Add'} thumbs down reaction`}
                  aria-pressed={message.reactions?.thumbsDown}
                >
                  👎
                </button>
                
                {/* Rating display */}
                {message.reactions?.rating && (
                  <div 
                    className="text-xs text-gray-500 ml-2"
                    aria-label={`Current rating: ${message.reactions.rating} out of 5 stars`}
                  >
                    Rating: {message.reactions.rating}/5
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Placeholder while not visible
        <div 
          className="flex items-center justify-center text-gray-400 text-sm"
          style={{ height: itemHeight - 16 }}
          aria-label="Message loading..."
          role="status"
        >
          <span className="sr-only">Loading message {index + 1} of {messages.length}</span>
          Loading message...
        </div>
      )}
    </div>
  );
});

AccessibleMessageItem.displayName = 'AccessibleMessageItem';

// =====================================================
// ACCESSIBLE VIRTUALIZED CONVERSATION COMPONENT
// =====================================================

const AccessibleVirtualizedConversation: React.FC<AccessibleVirtualizedConversationProps> = ({
  messages,
  height,
  itemHeight = 120,
  onMessageReaction,
  onLoadMore,
  isLoading = false,
  className = '',
  overscan = 5,
  enableAutoScroll = true,
  scrollToBottomOnNew = true,
  announceNewMessages = true,
  keyboardNavigationEnabled = true,
  screenReaderOptimized = true
}) => {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [lastMessageCount, setLastMessageCount] = useState(messages.length);
  const [renderStartTime, setRenderStartTime] = useState<number>(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);

  const { announce, getAriaLabels } = useAccessibility();
  const labels = getAriaLabels();

  // Memoized data for virtual list
  const itemData = useMemo(() => ({
    messages,
    onMessageReaction,
    itemHeight,
    announceNewMessages,
    keyboardNavigationEnabled,
    activeIndex,
    setActiveIndex
  }), [messages, onMessageReaction, itemHeight, announceNewMessages, keyboardNavigationEnabled, activeIndex]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollToBottomOnNew && messages.length > lastMessageCount && isAtBottom) {
      listRef.current?.scrollToItem(messages.length - 1, 'end');
      
      if (announceNewMessages) {
        const newMessageCount = messages.length - lastMessageCount;
        announce(`${newMessageCount} new message${newMessageCount > 1 ? 's' : ''} received`, 'polite');
      }
    }
    setLastMessageCount(messages.length);
  }, [messages.length, lastMessageCount, isAtBottom, scrollToBottomOnNew, announceNewMessages, announce]);

  // Performance tracking
  useEffect(() => {
    if (renderStartTime > 0) {
      const renderTime = performance.now() - renderStartTime;
      performanceMonitor.trackRender('AccessibleVirtualizedConversation', renderTime);
    }
  });

  useEffect(() => {
    setRenderStartTime(performance.now());
  }, [messages]);

  // Handle scroll events with accessibility announcements
  const handleScroll = useCallback(({
    scrollDirection,
    scrollOffset,
    scrollUpdateWasRequested
  }: {
    scrollDirection: 'forward' | 'backward';
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
  }) => {
    const totalHeight = messages.length * itemHeight;
    const visibleHeight = height;
    const isNearBottom = scrollOffset >= totalHeight - visibleHeight - 100;
    
    setIsAtBottom(isNearBottom);
    setScrollPosition(scrollOffset);

    // Announce scroll position for screen readers (throttled)
    if (screenReaderOptimized && !scrollUpdateWasRequested) {
      const currentItem = Math.floor(scrollOffset / itemHeight);
      const totalItems = messages.length;
      const percentage = Math.round((currentItem / totalItems) * 100);
      
      // Throttle announcements to avoid spam
      if (Math.abs(scrollOffset - scrollPosition) > itemHeight * 5) {
        announce(`Scrolled to message ${currentItem + 1} of ${totalItems}. ${percentage}% through conversation.`, 'polite');
      }
    }

    // Load more messages when scrolling to top
    if (scrollOffset < 200 && scrollDirection === 'backward' && onLoadMore && !isLoading) {
      onLoadMore();
    }
  }, [messages.length, itemHeight, height, onLoadMore, isLoading, screenReaderOptimized, announce, scrollPosition]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToItem(messages.length - 1, 'end');
    setIsAtBottom(true);
    setActiveIndex(messages.length - 1);
    announce('Scrolled to latest message', 'polite');
  }, [messages.length, announce]);

  // Handle keyboard navigation for the container
  const handleContainerKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!keyboardNavigationEnabled) return;

    switch (event.key) {
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        listRef.current?.scrollToItem(0, 'start');
        announce('Moved to first message', 'polite');
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(messages.length - 1);
        scrollToBottom();
        break;
      case 'PageUp':
        event.preventDefault();
        const pageUpIndex = Math.max(0, activeIndex - Math.floor(height / itemHeight));
        setActiveIndex(pageUpIndex);
        listRef.current?.scrollToItem(pageUpIndex, 'start');
        announce(`Moved up one page to message ${pageUpIndex + 1}`, 'polite');
        break;
      case 'PageDown':
        event.preventDefault();
        const pageDownIndex = Math.min(messages.length - 1, activeIndex + Math.floor(height / itemHeight));
        setActiveIndex(pageDownIndex);
        listRef.current?.scrollToItem(pageDownIndex, 'start');
        announce(`Moved down one page to message ${pageDownIndex + 1}`, 'polite');
        break;
    }
  }, [keyboardNavigationEnabled, activeIndex, messages.length, height, itemHeight, scrollToBottom, announce]);

  // Optimized item renderer
  const renderItem = useCallback((props: any) => (
    <AccessibleMessageItem {...props} data={itemData} />
  ), [itemData]);

  return (
    <div 
      ref={containerRef}
      className={cn('relative flex flex-col', className)}
      role="log"
      aria-label={labels.messagesArea}
      aria-live="polite"
      aria-busy={isLoading}
      onKeyDown={handleContainerKeyDown}
      tabIndex={keyboardNavigationEnabled ? 0 : -1}
    >
      {/* Screen reader instructions */}
      <div className="sr-only">
        Conversation messages area. Use arrow keys to navigate between messages, 
        Home and End to go to first and last messages, Page Up and Page Down to scroll by pages.
        Press Enter on a message to interact with its reaction buttons.
        Total messages: {messages.length}.
      </div>

      {/* Loading indicator at top */}
      {isLoading && (
        <div 
          className="flex items-center justify-center py-4 bg-gray-50 border-b"
          role="status"
          aria-label="Loading earlier messages"
        >
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" aria-hidden="true" />
            Loading earlier messages...
          </div>
        </div>
      )}

      {/* Virtual scrolling list */}
      <div className="flex-1">
        <List
          ref={listRef}
          height={height - (isLoading ? 56 : 0)}
          itemCount={messages.length}
          itemSize={itemHeight}
          itemData={itemData}
          overscanCount={overscan}
          onScroll={handleScroll}
          className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          role="list"
          aria-label={`${messages.length} conversation messages`}
        >
          {renderItem}
        </List>
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && enableAutoScroll && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-10 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Scroll to bottom of conversation"
          title="Scroll to latest message"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      )}

      {/* Performance indicator (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded"
          role="status"
          aria-label={`Performance: ${messages.length} messages, ${Math.round(renderStartTime > 0 ? performance.now() - renderStartTime : 0)} milliseconds render time`}
        >
          {messages.length} messages, {Math.round(renderStartTime > 0 ? performance.now() - renderStartTime : 0)}ms render
        </div>
      )}

      {/* Current position indicator for screen readers */}
      {screenReaderOptimized && keyboardNavigationEnabled && (
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          Message {activeIndex + 1} of {messages.length} focused
        </div>
      )}
    </div>
  );
};

export default AccessibleVirtualizedConversation;