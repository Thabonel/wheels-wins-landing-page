/**
 * Message Deduplication Hook
 * Prevents duplicate messages from being processed in PAM chat
 */

import { useRef, useCallback } from 'react';

interface DeduplicationEntry {
  hash: string;
  timestamp: number;
  messageId: string;
}

interface DeduplicationOptions {
  windowMs?: number;  // Time window for deduplication (default: 5000ms)
  maxEntries?: number; // Max entries to keep in memory (default: 100)
}

export const useMessageDeduplication = (options: DeduplicationOptions = {}) => {
  const { windowMs = 5000, maxEntries = 100 } = options;
  
  // Store recent messages for deduplication
  const messageHistoryRef = useRef<Map<string, DeduplicationEntry>>(new Map());
  const lastProcessedRef = useRef<string>('');
  const lastProcessedTimeRef = useRef<number>(0);

  /**
   * Generate a hash for a message
   */
  const generateHash = useCallback((content: string, type?: string): string => {
    const normalizedContent = content.trim().toLowerCase();
    const typePrefix = type ? `${type}:` : '';
    return `${typePrefix}${normalizedContent}`;
  }, []);

  /**
   * Clean up old entries outside the deduplication window
   */
  const cleanupOldEntries = useCallback(() => {
    const now = Date.now();
    const entries = Array.from(messageHistoryRef.current.entries());
    
    // Remove entries outside the time window
    for (const [hash, entry] of entries) {
      if (now - entry.timestamp > windowMs) {
        messageHistoryRef.current.delete(hash);
      }
    }
    
    // Keep only the most recent maxEntries
    if (messageHistoryRef.current.size > maxEntries) {
      const sortedEntries = Array.from(messageHistoryRef.current.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp)
        .slice(0, maxEntries);
      
      messageHistoryRef.current = new Map(sortedEntries);
    }
  }, [windowMs, maxEntries]);

  /**
   * Check if a message is a duplicate
   */
  const isDuplicate = useCallback((content: string, type?: string, messageId?: string): boolean => {
    // Clean up old entries first
    cleanupOldEntries();
    
    const hash = generateHash(content, type);
    const now = Date.now();
    
    // Check if this exact message was processed recently
    if (messageHistoryRef.current.has(hash)) {
      const entry = messageHistoryRef.current.get(hash)!;
      const timeDiff = now - entry.timestamp;
      
      if (timeDiff < windowMs) {
        console.log(`🔄 Duplicate message detected (${timeDiff}ms old):`, content.substring(0, 50));
        return true;
      }
    }
    
    // Check if this is the same as the last processed message
    if (content === lastProcessedRef.current) {
      const timeDiff = now - lastProcessedTimeRef.current;
      if (timeDiff < windowMs) {
        console.log(`🔄 Same as last message (${timeDiff}ms old):`, content.substring(0, 50));
        return true;
      }
    }
    
    return false;
  }, [generateHash, cleanupOldEntries, windowMs]);

  /**
   * Mark a message as processed
   */
  const markAsProcessed = useCallback((content: string, type?: string, messageId?: string) => {
    const hash = generateHash(content, type);
    const now = Date.now();
    
    messageHistoryRef.current.set(hash, {
      hash,
      timestamp: now,
      messageId: messageId || `${now}-${Math.random()}`
    });
    
    lastProcessedRef.current = content;
    lastProcessedTimeRef.current = now;
    
    console.log('✅ Message marked as processed:', content.substring(0, 50));
  }, [generateHash]);

  /**
   * Process a message with deduplication
   */
  const processMessage = useCallback(<T extends { content?: string; message?: string; type?: string; id?: string }>(
    message: T,
    onProcess: (message: T) => void
  ): boolean => {
    const content = message.content || message.message || '';
    const type = message.type;
    const id = message.id;
    
    if (!content) {
      console.warn('Empty message content, skipping deduplication');
      onProcess(message);
      return true;
    }
    
    if (isDuplicate(content, type, id)) {
      return false;
    }
    
    markAsProcessed(content, type, id);
    onProcess(message);
    return true;
  }, [isDuplicate, markAsProcessed]);

  /**
   * Reset deduplication state
   */
  const reset = useCallback(() => {
    messageHistoryRef.current.clear();
    lastProcessedRef.current = '';
    lastProcessedTimeRef.current = 0;
    console.log('🔄 Deduplication state reset');
  }, []);

  /**
   * Get deduplication statistics
   */
  const getStats = useCallback(() => {
    return {
      totalTracked: messageHistoryRef.current.size,
      oldestEntry: Math.min(...Array.from(messageHistoryRef.current.values()).map(e => e.timestamp)),
      newestEntry: Math.max(...Array.from(messageHistoryRef.current.values()).map(e => e.timestamp)),
      lastProcessed: lastProcessedRef.current,
      lastProcessedTime: lastProcessedTimeRef.current
    };
  }, []);

  return {
    isDuplicate,
    markAsProcessed,
    processMessage,
    reset,
    getStats
  };
};

export default useMessageDeduplication;