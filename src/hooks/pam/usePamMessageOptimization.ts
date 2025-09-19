/**
 * PAM Message Optimization Hook - Day 3 Performance Enhancement
 * Optimizes message parsing, rendering, and memory management
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PamMessage } from '@/hooks/pam/usePamWebSocketUnified';

export interface MessageCache {
  id: string;
  content: string;
  parsedContent?: any;
  timestamp: number;
  renderCount: number;
  lastAccessed: number;
}

export interface OptimizationConfig {
  maxCacheSize: number;
  maxHistorySize: number;
  enableVirtualization: boolean;
  enableParseCaching: boolean;
  enableDeduplication: boolean;
  cacheExpirationTime: number;
  renderBatchSize: number;
}

export interface PerformanceMetrics {
  totalMessages: number;
  cachedMessages: number;
  parseTime: number;
  renderTime: number;
  memoryUsage: number;
  deduplicatedCount: number;
  cacheHitRate: number;
}

const DEFAULT_CONFIG: OptimizationConfig = {
  maxCacheSize: 500,
  maxHistorySize: 1000,
  enableVirtualization: true,
  enableParseCaching: true,
  enableDeduplication: true,
  cacheExpirationTime: 30 * 60 * 1000, // 30 minutes
  renderBatchSize: 50
};

export function usePamMessageOptimization(
  messages: PamMessage[],
  config: Partial<OptimizationConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const [optimizedMessages, setOptimizedMessages] = useState<PamMessage[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalMessages: 0,
    cachedMessages: 0,
    parseTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    deduplicatedCount: 0,
    cacheHitRate: 0
  });

  // Caching and optimization refs
  const messageCacheRef = useRef<Map<string, MessageCache>>(new Map());
  const deduplicationMapRef = useRef<Map<string, string>>(new Map());
  const parseTimesRef = useRef<number[]>([]);
  const renderTimesRef = useRef<number[]>([]);
  const cacheHitsRef = useRef(0);
  const cacheMissesRef = useRef(0);

  // Virtual rendering state
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: finalConfig.renderBatchSize });

  // Memoized message parser
  const parseMessage = useCallback((message: PamMessage): any => {
    const startTime = performance.now();

    // Check cache first
    const cached = messageCacheRef.current.get(message.id);
    if (cached && cached.parsedContent) {
      cached.lastAccessed = Date.now();
      cached.renderCount++;
      cacheHitsRef.current++;
      return cached.parsedContent;
    }

    cacheMissesRef.current++;

    // Parse message content
    let parsedContent: any = {
      id: message.id,
      type: message.type,
      content: message.content || message.message || '',
      timestamp: message.timestamp,
      metadata: message.metadata || {}
    };

    // Enhanced parsing based on message type
    try {
      switch (message.type) {
        case 'chat_response':
          parsedContent = {
            ...parsedContent,
            isResponse: true,
            formattedContent: formatChatResponse(parsedContent.content),
            wordCount: countWords(parsedContent.content),
            estimatedReadTime: estimateReadTime(parsedContent.content)
          };
          break;

        case 'visual_action':
        case 'ui_actions':
          parsedContent = {
            ...parsedContent,
            actions: parseActionData(message.actions || []),
            hasActions: (message.actions || []).length > 0
          };
          break;

        case 'error':
          parsedContent = {
            ...parsedContent,
            isError: true,
            severity: determineErrorSeverity(parsedContent.content),
            errorType: classifyError(parsedContent.content)
          };
          break;

        default:
          // Basic parsing for other types
          parsedContent.formattedContent = formatBasicContent(parsedContent.content);
      }

      // Add to cache
      if (finalConfig.enableParseCaching) {
        messageCacheRef.current.set(message.id, {
          id: message.id,
          content: parsedContent.content,
          parsedContent,
          timestamp: Date.now(),
          renderCount: 1,
          lastAccessed: Date.now()
        });
      }

    } catch (error) {
      console.warn('Error parsing message:', error);
      parsedContent.parseError = true;
    }

    const parseTime = performance.now() - startTime;
    parseTimesRef.current.push(parseTime);
    if (parseTimesRef.current.length > 100) {
      parseTimesRef.current = parseTimesRef.current.slice(-100);
    }

    return parsedContent;
  }, [finalConfig.enableParseCaching]);

  // Deduplication function
  const deduplicateMessages = useCallback((messages: PamMessage[]): PamMessage[] => {
    if (!finalConfig.enableDeduplication) return messages;

    const seen = new Set<string>();
    const deduplicated: PamMessage[] = [];
    let duplicateCount = 0;

    for (const message of messages) {
      const hash = createMessageHash(message);

      if (!seen.has(hash)) {
        seen.add(hash);
        deduplicated.push(message);
        deduplicationMapRef.current.set(message.id, hash);
      } else {
        duplicateCount++;
      }
    }

    setMetrics(prev => ({
      ...prev,
      deduplicatedCount: duplicateCount
    }));

    return deduplicated;
  }, [finalConfig.enableDeduplication]);

  // Virtual rendering optimization
  const getVisibleMessages = useCallback((messages: PamMessage[]): PamMessage[] => {
    if (!finalConfig.enableVirtualization) return messages;

    const start = Math.max(0, visibleRange.start);
    const end = Math.min(messages.length, visibleRange.end);

    return messages.slice(start, end);
  }, [finalConfig.enableVirtualization, visibleRange]);

  // Update visible range for virtual scrolling
  const updateVisibleRange = useCallback((newRange: { start: number; end: number }) => {
    setVisibleRange(newRange);
  }, []);

  // Cache cleanup
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const cache = messageCacheRef.current;

    // Remove expired entries
    for (const [id, entry] of cache.entries()) {
      if (now - entry.lastAccessed > finalConfig.cacheExpirationTime) {
        cache.delete(id);
      }
    }

    // If still too large, remove least recently used
    if (cache.size > finalConfig.maxCacheSize) {
      const entries = Array.from(cache.entries())
        .sort(([,a], [,b]) => a.lastAccessed - b.lastAccessed);

      const toRemove = entries.slice(0, cache.size - finalConfig.maxCacheSize);
      toRemove.forEach(([id]) => cache.delete(id));
    }
  }, [finalConfig.maxCacheSize, finalConfig.cacheExpirationTime]);

  // Process messages with optimizations
  const processMessages = useCallback(async (messages: PamMessage[]): Promise<PamMessage[]> => {
    const startTime = performance.now();

    // Step 1: Deduplication
    const deduplicated = deduplicateMessages(messages);

    // Step 2: Limit history size
    const limited = deduplicated.slice(-finalConfig.maxHistorySize);

    // Step 3: Parse and cache
    const parsed = limited.map(parseMessage);

    // Step 4: Virtual rendering
    const visible = getVisibleMessages(parsed);

    const processTime = performance.now() - startTime;
    renderTimesRef.current.push(processTime);
    if (renderTimesRef.current.length > 100) {
      renderTimesRef.current = renderTimesRef.current.slice(-100);
    }

    return visible;
  }, [deduplicateMessages, finalConfig.maxHistorySize, parseMessage, getVisibleMessages]);

  // Update optimized messages when input changes
  useEffect(() => {
    processMessages(messages).then(setOptimizedMessages);
  }, [messages, processMessages]);

  // Periodic cache cleanup
  useEffect(() => {
    const interval = setInterval(cleanupCache, 60000); // Every minute
    return () => clearInterval(interval);
  }, [cleanupCache]);

  // Update performance metrics
  useEffect(() => {
    const updateMetrics = () => {
      const avgParseTime = parseTimesRef.current.length > 0
        ? parseTimesRef.current.reduce((sum, time) => sum + time, 0) / parseTimesRef.current.length
        : 0;

      const avgRenderTime = renderTimesRef.current.length > 0
        ? renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length
        : 0;

      const totalRequests = cacheHitsRef.current + cacheMissesRef.current;
      const cacheHitRate = totalRequests > 0 ? (cacheHitsRef.current / totalRequests) * 100 : 0;

      const memoryUsage = estimateMemoryUsage();

      setMetrics({
        totalMessages: messages.length,
        cachedMessages: messageCacheRef.current.size,
        parseTime: Math.round(avgParseTime * 100) / 100,
        renderTime: Math.round(avgRenderTime * 100) / 100,
        memoryUsage: Math.round(memoryUsage * 100) / 100,
        deduplicatedCount: metrics.deduplicatedCount,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100
      });
    };

    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, [messages.length, metrics.deduplicatedCount]);

  // Clear cache
  const clearCache = useCallback(() => {
    messageCacheRef.current.clear();
    deduplicationMapRef.current.clear();
    cacheHitsRef.current = 0;
    cacheMissesRef.current = 0;
    parseTimesRef.current = [];
    renderTimesRef.current = [];
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const cache = messageCacheRef.current;
    const entries = Array.from(cache.values());

    return {
      size: cache.size,
      totalRenderCount: entries.reduce((sum, entry) => sum + entry.renderCount, 0),
      averageAge: entries.length > 0
        ? entries.reduce((sum, entry) => sum + (Date.now() - entry.timestamp), 0) / entries.length
        : 0,
      oldestEntry: entries.length > 0
        ? Math.min(...entries.map(entry => entry.timestamp))
        : null
    };
  }, []);

  // Utility functions
  const formatChatResponse = (content: string): string => {
    // Basic formatting for chat responses
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  };

  const formatBasicContent = (content: string): string => {
    return content.replace(/\n/g, '<br>');
  };

  const countWords = (text: string): number => {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  };

  const estimateReadTime = (text: string): number => {
    const wordsPerMinute = 200;
    const words = countWords(text);
    return Math.ceil(words / wordsPerMinute);
  };

  const parseActionData = (actions: any[]): any[] => {
    return actions.map(action => ({
      ...action,
      id: action.id || Math.random().toString(36),
      timestamp: Date.now()
    }));
  };

  const determineErrorSeverity = (content: string): 'low' | 'medium' | 'high' => {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('critical') || lowerContent.includes('fatal')) return 'high';
    if (lowerContent.includes('error') || lowerContent.includes('failed')) return 'medium';
    return 'low';
  };

  const classifyError = (content: string): string => {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('network')) return 'network';
    if (lowerContent.includes('auth')) return 'authentication';
    if (lowerContent.includes('timeout')) return 'timeout';
    return 'unknown';
  };

  const createMessageHash = (message: PamMessage): string => {
    const content = message.content || message.message || '';
    const type = message.type;
    const roundedTimestamp = Math.floor(message.timestamp / 1000) * 1000; // Round to second
    return `${type}-${content.substring(0, 50)}-${roundedTimestamp}`;
  };

  const estimateMemoryUsage = (): number => {
    const cache = messageCacheRef.current;
    let totalSize = 0;

    for (const entry of cache.values()) {
      totalSize += JSON.stringify(entry).length * 2; // Rough estimate (2 bytes per char)
    }

    return totalSize / 1024; // Return in KB
  };

  return {
    optimizedMessages,
    metrics,
    updateVisibleRange,
    clearCache,
    getCacheStats,
    processMessages
  };
}

export default usePamMessageOptimization;