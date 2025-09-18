/**
 * Virtualized Conversation Component
 * 
 * High-performance virtual scrolling for long PAM conversations.
 * Handles thousands of messages without performance degradation.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { performanceMonitor } from '../performance/performanceOptimizer';
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

interface VirtualizedConversationProps {
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
}

interface MessageItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    messages: ConversationMessage[];
    onMessageReaction?: (messageId: string, reaction: string, value?: number) => void;
    itemHeight: number;
  };
}

// =====================================================
// MESSAGE COMPONENT (MEMOIZED)
// =====================================================

const MessageItem = React.memo<MessageItemProps>(({ index, style, data }) => {
  const { messages, onMessageReaction, itemHeight } = data;
  const message = messages[index];
  const [isVisible, setIsVisible] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  // Intersection observer for lazy loading message content
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
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
  }, []);

  const handleReaction = useCallback((reaction: string, value?: number) => {
    onMessageReaction?.(message.id, reaction, value);
    
    // Track interaction for performance monitoring
    performanceMonitor.trackRender('MessageReaction', performance.now());
  }, [message.id, onMessageReaction]);

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div ref={messageRef} style={style} className="px-4 py-2">
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
              isSystem && 'bg-yellow-50 border border-yellow-200 text-yellow-800'
            )}
          >
            {/* Message Content */}
            <div className="text-sm leading-relaxed">
              {message.content}
            </div>

            {/* Message Metadata */}
            {message.metadata && (
              <div className="mt-2 text-xs opacity-70 space-y-1">
                {message.metadata.responseTime && (
                  <div>Response: {message.metadata.responseTime}ms</div>
                )}
                {message.metadata.tokenCount && (
                  <div>Tokens: {message.metadata.tokenCount}</div>
                )}
                {message.metadata.cached && (
                  <div className="text-green-400">📋 Cached</div>
                )}
                {message.metadata.error && (
                  <div className="text-red-400">⚠️ Error</div>
                )}
              </div>
            )}

            {/* Timestamp */}
            <div className={cn(
              'mt-2 text-xs opacity-60',
              isUser ? 'text-right' : 'text-left'
            )}>
              {message.timestamp.toLocaleTimeString()}
            </div>

            {/* Reaction Buttons (for assistant messages) */}
            {!isUser && !isSystem && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => handleReaction('thumbsUp')}
                  className={cn(
                    'text-xs px-2 py-1 rounded transition-colors',
                    message.reactions?.thumbsUp
                      ? 'bg-green-100 text-green-700'
                      : 'hover:bg-gray-200'
                  )}
                  aria-label="Thumbs up"
                >
                  👍
                </button>
                <button
                  onClick={() => handleReaction('thumbsDown')}
                  className={cn(
                    'text-xs px-2 py-1 rounded transition-colors',
                    message.reactions?.thumbsDown
                      ? 'bg-red-100 text-red-700'
                      : 'hover:bg-gray-200'
                  )}
                  aria-label="Thumbs down"
                >
                  👎
                </button>
                
                {/* Rating */}
                {message.reactions?.rating && (
                  <div className="text-xs text-gray-500 ml-2">
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
        >
          Loading message...
        </div>
      )}
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

// =====================================================
// VIRTUALIZED CONVERSATION COMPONENT
// =====================================================

const VirtualizedConversation: React.FC<VirtualizedConversationProps> = ({
  messages,
  height,
  itemHeight = 120,
  onMessageReaction,
  onLoadMore,
  isLoading = false,
  className = '',
  overscan = 5,
  enableAutoScroll = true,
  scrollToBottomOnNew = true
}) => {
  const listRef = useRef<List>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [lastMessageCount, setLastMessageCount] = useState(messages.length);
  const [renderStartTime, setRenderStartTime] = useState<number>(0);

  // Memoized data for virtual list
  const itemData = useMemo(() => ({
    messages,
    onMessageReaction,
    itemHeight
  }), [messages, onMessageReaction, itemHeight]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollToBottomOnNew && messages.length > lastMessageCount && isAtBottom) {
      listRef.current?.scrollToItem(messages.length - 1, 'end');
    }
    setLastMessageCount(messages.length);
  }, [messages.length, lastMessageCount, isAtBottom, scrollToBottomOnNew]);

  // Performance tracking
  useEffect(() => {
    if (renderStartTime > 0) {
      const renderTime = performance.now() - renderStartTime;
      performanceMonitor.trackRender('VirtualizedConversation', renderTime);
    }
  });

  useEffect(() => {
    setRenderStartTime(performance.now());
  }, [messages]);

  // Handle scroll events
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

    // Load more messages when scrolling to top
    if (scrollOffset < 200 && scrollDirection === 'backward' && onLoadMore && !isLoading) {
      onLoadMore();
    }
  }, [messages.length, itemHeight, height, onLoadMore, isLoading]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToItem(messages.length - 1, 'end');
    setIsAtBottom(true);
  }, [messages.length]);

  // Optimized item renderer
  const renderItem = useCallback((props: any) => (
    <MessageItem {...props} data={itemData} />
  ), [itemData]);

  return (
    <div className={cn('relative flex flex-col', className)}>
      {/* Loading indicator at top */}
      {isLoading && (
        <div className="flex items-center justify-center py-4 bg-gray-50 border-b">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
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
        >
          {renderItem}
        </List>
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && enableAutoScroll && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-10"
          aria-label="Scroll to bottom"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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
        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {messages.length} messages, {Math.round(renderStartTime > 0 ? performance.now() - renderStartTime : 0)}ms render
        </div>
      )}
    </div>
  );
};

// =====================================================
// ENHANCED CONVERSATION WRAPPER
// =====================================================

interface EnhancedConversationProps extends Omit<VirtualizedConversationProps, 'height'> {
  maxHeight?: number;
  minHeight?: number;
  autoResize?: boolean;
  searchQuery?: string;
  highlightMatches?: boolean;
}

export const EnhancedConversation: React.FC<EnhancedConversationProps> = ({
  messages,
  maxHeight = 600,
  minHeight = 300,
  autoResize = true,
  searchQuery = '',
  highlightMatches = true,
  ...props
}) => {
  const [containerHeight, setContainerHeight] = useState(maxHeight);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) {
      return messages;
    }

    return messages.filter(message =>
      message.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  // Auto-resize based on content
  useEffect(() => {
    if (autoResize && containerRef.current) {
      const idealHeight = Math.min(
        Math.max(filteredMessages.length * (props.itemHeight || 120), minHeight),
        maxHeight
      );
      setContainerHeight(idealHeight);
    }
  }, [filteredMessages.length, autoResize, maxHeight, minHeight, props.itemHeight]);

  // Highlight search matches in content
  const enhancedMessages = useMemo(() => {
    if (!highlightMatches || !searchQuery.trim()) {
      return filteredMessages;
    }

    return filteredMessages.map(message => ({
      ...message,
      content: message.content.replace(
        new RegExp(`(${searchQuery})`, 'gi'),
        '<mark class="bg-yellow-200">$1</mark>'
      )
    }));
  }, [filteredMessages, searchQuery, highlightMatches]);

  return (
    <div
      ref={containerRef}
      className="border border-gray-200 rounded-lg overflow-hidden bg-white"
      style={{ height: containerHeight }}
    >
      {searchQuery && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-800">
          {enhancedMessages.length} of {messages.length} messages match "{searchQuery}"
        </div>
      )}
      
      <VirtualizedConversation
        {...props}
        messages={enhancedMessages}
        height={containerHeight - (searchQuery ? 40 : 0)}
      />
    </div>
  );
};

export default VirtualizedConversation;