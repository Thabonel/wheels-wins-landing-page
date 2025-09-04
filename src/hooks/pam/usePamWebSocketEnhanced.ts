/**
 * PAM WebSocket Enhanced Hook - With Context & Memory Integration
 * 
 * Builds on the stable usePamWebSocketCore foundation and adds:
 * - Context-aware message enrichment
 * - Memory integration and learning
 * - Intelligent response handling
 * - Proactive assistance capabilities
 * 
 * This hook maintains the reliability of the core WebSocket while adding
 * the intelligence layer from PAMContextManager and PAMMemoryService
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePamWebSocketCore, type PamMessage, type WebSocketOptions, type ConnectionStatus } from './usePamWebSocketCore';
import { PAMContextManager, type UserContext, type MessageEnrichment } from '@/services/pam/contextManager';
import { PAMMemoryService } from '@/services/pam/memoryService';

// Enhanced interfaces
export interface EnhancedPamMessage extends PamMessage {
  enrichment?: MessageEnrichment;
  context?: UserContext;
  learningSignals?: LearningSignal[];
}

export interface LearningSignal {
  type: 'preference_detected' | 'pattern_identified' | 'context_switch' | 'user_feedback';
  confidence: number;
  data: any;
  timestamp: number;
}

export interface EnhancedWebSocketOptions extends WebSocketOptions {
  // Memory & Context Options
  enableContextEnrichment?: boolean;
  enableMemoryLearning?: boolean;
  enableProactiveInsights?: boolean;
  
  // Enhanced Callbacks
  onEnrichedMessage?: (enrichedMessage: EnhancedPamMessage) => void;
  onContextUpdate?: (context: UserContext) => void;
  onLearningSignal?: (signal: LearningSignal) => void;
  onProactiveInsight?: (insight: any) => void;
  
  // Performance Options
  maxContextRefreshMs?: number;
  memoryLookbackHours?: number;
}

export interface EnhancedWebSocketStats {
  // Core WebSocket stats
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  totalMessages: number;
  queuedMessages: number;
  reconnectAttempts: number;
  
  // Enhanced stats
  enrichedMessages: number;
  contextRefreshCount: number;
  memoriesStored: number;
  preferencesLearned: number;
  averageEnrichmentTime: number;
  
  // Context stats
  contextConfidence: number;
  relevantMemoriesFound: number;
  lastContextUpdate?: Date;
}

export const usePamWebSocketEnhanced = (
  userId: string | null,
  token: string | null,
  options: EnhancedWebSocketOptions = {}
) => {
  const {
    // Enhanced options
    enableContextEnrichment = true,
    enableMemoryLearning = true,
    enableProactiveInsights = false,
    onEnrichedMessage,
    onContextUpdate,
    onLearningSignal,
    onProactiveInsight,
    maxContextRefreshMs = 900000, // 15 minutes
    memoryLookbackHours = 24,
    
    // Pass through core options
    ...coreOptions
  } = options;

  // Enhanced state
  const [enrichedMessages, setEnrichedMessages] = useState<EnhancedPamMessage[]>([]);
  const [currentContext, setCurrentContext] = useState<UserContext | null>(null);
  const [isEnrichmentEnabled, setIsEnrichmentEnabled] = useState(enableContextEnrichment);
  
  // Enhanced stats
  const [enrichmentStats, setEnrichmentStats] = useState({
    enrichedCount: 0,
    contextRefreshCount: 0,
    memoriesStored: 0,
    preferencesLearned: 0,
    totalEnrichmentTime: 0,
    lastContextUpdate: null as Date | null
  });

  // Service instances
  const contextManagerRef = useRef<PAMContextManager | null>(null);
  const memoryServiceRef = useRef<PAMMemoryService | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  // Core WebSocket hook
  const {
    isConnected,
    connectionStatus,
    messages: coreMessages,
    sendMessage: coreSendMessage,
    connect,
    disconnect,
    reset,
    reconnectAttempts,
    queuedMessages,
    totalMessages,
    clearMessages,
    error
  } = usePamWebSocketCore(userId, token, {
    ...coreOptions,
    onMessage: handleCoreMessage
  });

  // Initialize services when user ID is available
  useEffect(() => {
    if (!userId || !enableContextEnrichment) {
      contextManagerRef.current = null;
      memoryServiceRef.current = null;
      return;
    }

    console.log('🧠 Initializing PAM intelligence services...');
    
    // Initialize memory service
    memoryServiceRef.current = new PAMMemoryService(userId);
    
    // Initialize context manager
    contextManagerRef.current = new PAMContextManager(userId, {
      includeRecentMemories: true,
      memoryLookbackHours,
      includeRelevantMemories: true,
      maxRelevantMemories: 5,
      includeActiveData: true,
      includePreferences: true,
      refreshThreshold: Math.floor(maxContextRefreshMs / 60000) // Convert to minutes
    });

    // Initialize context
    initializeContext();

    return () => {
      contextManagerRef.current?.dispose();
      contextManagerRef.current = null;
      memoryServiceRef.current = null;
    };
  }, [userId, enableContextEnrichment]);

  // Initialize context
  const initializeContext = useCallback(async () => {
    if (!contextManagerRef.current || !userId) return;

    try {
      console.log('🔄 Initializing PAM context...');
      const context = await contextManagerRef.current.initializeContext(conversationIdRef.current || undefined);
      
      setCurrentContext(context);
      setEnrichmentStats(prev => ({
        ...prev,
        contextRefreshCount: prev.contextRefreshCount + 1,
        lastContextUpdate: new Date()
      }));

      onContextUpdate?.(context);
      console.log('✅ PAM context initialized');
    } catch (error) {
      console.error('❌ Failed to initialize context:', error);
    }
  }, [userId, onContextUpdate]);

  // Handle core messages with enrichment
  async function handleCoreMessage(message: PamMessage) {
    try {
      let enrichedMessage: EnhancedPamMessage = { ...message };

      // Apply enrichment if enabled and services are available
      if (isEnrichmentEnabled && contextManagerRef.current && message.type === 'chat_response') {
        const startTime = Date.now();
        
        try {
          const enrichment = await contextManagerRef.current.enrichMessage(message);
          enrichedMessage.enrichment = enrichment;
          enrichedMessage.context = contextManagerRef.current.getCurrentContext();

          // Update stats
          const enrichmentTime = Date.now() - startTime;
          setEnrichmentStats(prev => ({
            ...prev,
            enrichedCount: prev.enrichedCount + 1,
            totalEnrichmentTime: prev.totalEnrichmentTime + enrichmentTime
          }));

          // Extract learning signals
          const signals = extractLearningSignals(enrichment);
          enrichedMessage.learningSignals = signals;

          // Process learning signals
          for (const signal of signals) {
            onLearningSignal?.(signal);
            await processLearningSignal(signal);
          }

          console.log(`💎 Message enriched (${enrichmentTime}ms, confidence: ${enrichment.enrichedContent.confidence})`);
        } catch (enrichmentError) {
          console.error('⚠️ Enrichment failed:', enrichmentError);
          // Continue with non-enriched message
        }
      }

      // Store message in memory if learning is enabled
      if (enableMemoryLearning && memoryServiceRef.current && message.type === 'chat_response') {
        try {
          await memoryServiceRef.current.storeMemory(
            {
              message: message.message || message.content,
              type: message.type,
              enrichment_confidence: enrichedMessage.enrichment?.enrichedContent.confidence || 0,
              user_intent: enrichedMessage.enrichment?.enrichedContent.userIntent
            },
            'episodic', // Chat responses are episodic memories
            {
              importance: Math.min(0.8, (enrichedMessage.enrichment?.enrichedContent.confidence || 0.3) + 0.2),
              context: {
                page: currentContext?.currentPage,
                activity: currentContext?.currentActivity,
                conversation_id: conversationIdRef.current
              },
              tags: ['chat_response', enrichedMessage.enrichment?.enrichedContent.userIntent || 'general'],
              conversationId: conversationIdRef.current || undefined
            }
          );

          setEnrichmentStats(prev => ({
            ...prev,
            memoriesStored: prev.memoriesStored + 1
          }));
        } catch (memoryError) {
          console.error('⚠️ Memory storage failed:', memoryError);
        }
      }

      // Add to enhanced messages
      setEnrichedMessages(prev => [...prev, enrichedMessage]);

      // Call enhanced callback
      onEnrichedMessage?.(enrichedMessage);
    } catch (error) {
      console.error('❌ Error handling enhanced message:', error);
      // Fallback: treat as regular message
      const fallbackMessage: EnhancedPamMessage = { ...message };
      setEnrichedMessages(prev => [...prev, fallbackMessage]);
      onEnrichedMessage?.(fallbackMessage);
    }
  }

  // Enhanced send message with context
  const sendEnhancedMessage = useCallback(async (messageData: Partial<PamMessage> | string) => {
    if (!userId) {
      console.warn('⚠️ Cannot send message: No user ID');
      return false;
    }

    try {
      // Store user message in memory
      if (enableMemoryLearning && memoryServiceRef.current && typeof messageData === 'string') {
        await memoryServiceRef.current.storeMemory(
          {
            user_message: messageData,
            type: 'user_input'
          },
          'working', // User inputs are working memory initially
          {
            importance: 0.6, // User messages have moderate importance
            context: {
              page: currentContext?.currentPage,
              activity: currentContext?.currentActivity
            },
            tags: ['user_input'],
            conversationId: conversationIdRef.current || undefined
          }
        );
      }

      // Send using core WebSocket
      return coreSendMessage(messageData);
    } catch (error) {
      console.error('❌ Error sending enhanced message:', error);
      // Fallback to core send
      return coreSendMessage(messageData);
    }
  }, [userId, coreSendMessage, enableMemoryLearning, currentContext]);

  // Update context when page changes
  const updateContext = useCallback(async (page?: string, additionalData?: any) => {
    if (!contextManagerRef.current) return;

    try {
      if (page) {
        await contextManagerRef.current.switchContext(page, additionalData);
      } else {
        await contextManagerRef.current.refreshContext();
      }

      const updatedContext = contextManagerRef.current.getCurrentContext();
      if (updatedContext) {
        setCurrentContext(updatedContext);
        setEnrichmentStats(prev => ({
          ...prev,
          contextRefreshCount: prev.contextRefreshCount + 1,
          lastContextUpdate: new Date()
        }));
        onContextUpdate?.(updatedContext);
      }
    } catch (error) {
      console.error('❌ Error updating context:', error);
    }
  }, [onContextUpdate]);

  // Extract learning signals from enrichment
  const extractLearningSignals = (enrichment: MessageEnrichment): LearningSignal[] => {
    const signals: LearningSignal[] = [];

    // High confidence interactions suggest strong preferences
    if (enrichment.enrichedContent.confidence > 0.8) {
      signals.push({
        type: 'preference_detected',
        confidence: enrichment.enrichedContent.confidence,
        data: {
          intent: enrichment.enrichedContent.userIntent,
          context_clues: enrichment.enrichedContent.contextClues
        },
        timestamp: Date.now()
      });
    }

    // Repeated patterns suggest behavioral patterns
    if (enrichment.enrichedContent.contextClues.length > 2) {
      signals.push({
        type: 'pattern_identified',
        confidence: Math.min(0.9, enrichment.enrichedContent.contextClues.length * 0.2),
        data: {
          pattern: enrichment.enrichedContent.contextClues,
          intent: enrichment.enrichedContent.userIntent
        },
        timestamp: Date.now()
      });
    }

    return signals;
  };

  // Process learning signals
  const processLearningSignal = async (signal: LearningSignal) => {
    if (!memoryServiceRef.current) return;

    try {
      switch (signal.type) {
        case 'preference_detected':
          if (signal.data.intent !== 'general') {
            await memoryServiceRef.current.learnPreference(
              'communication',
              'preferred_interaction_type',
              signal.data.intent,
              {
                confidence: signal.confidence,
                source: 'inferred',
                context: { timestamp: signal.timestamp }
              }
            );

            setEnrichmentStats(prev => ({
              ...prev,
              preferencesLearned: prev.preferencesLearned + 1
            }));
          }
          break;

        case 'pattern_identified':
          await memoryServiceRef.current.recordIntentPattern(
            signal.data.intent,
            {
              pattern_elements: signal.data.pattern,
              confidence: signal.confidence
            },
            { detected_at: signal.timestamp }
          );
          break;
      }
    } catch (error) {
      console.error('❌ Error processing learning signal:', error);
    }
  };

  // Clear enhanced messages
  const clearEnhancedMessages = useCallback(() => {
    setEnrichedMessages([]);
    clearMessages();
  }, [clearMessages]);

  // Toggle enrichment
  const toggleEnrichment = useCallback((enabled: boolean) => {
    setIsEnrichmentEnabled(enabled);
    console.log(`${enabled ? '🧠' : '💤'} Context enrichment ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  // Get comprehensive stats
  const getEnhancedStats = useCallback((): EnhancedWebSocketStats => {
    const avgEnrichmentTime = enrichmentStats.enrichedCount > 0 
      ? enrichmentStats.totalEnrichmentTime / enrichmentStats.enrichedCount 
      : 0;

    const contextStats = contextManagerRef.current?.getContextStats();

    return {
      // Core stats
      isConnected,
      connectionStatus,
      totalMessages,
      queuedMessages,
      reconnectAttempts,
      
      // Enhanced stats
      enrichedMessages: enrichmentStats.enrichedCount,
      contextRefreshCount: enrichmentStats.contextRefreshCount,
      memoriesStored: enrichmentStats.memoriesStored,
      preferencesLearned: enrichmentStats.preferencesLearned,
      averageEnrichmentTime: avgEnrichmentTime,
      
      // Context stats
      contextConfidence: currentContext ? 0.8 : 0.0, // Simplified confidence
      relevantMemoriesFound: contextStats?.memoryCount || 0,
      lastContextUpdate: enrichmentStats.lastContextUpdate || undefined
    };
  }, [
    isConnected, 
    connectionStatus, 
    totalMessages, 
    queuedMessages, 
    reconnectAttempts,
    enrichmentStats,
    currentContext
  ]);

  // Memoized return value
  return useMemo(() => ({
    // Core WebSocket functionality
    isConnected,
    connectionStatus,
    error,
    
    // Enhanced messaging
    messages: enrichedMessages,
    sendMessage: sendEnhancedMessage,
    clearMessages: clearEnhancedMessages,
    
    // Context management
    currentContext,
    updateContext,
    
    // Connection management
    connect,
    disconnect,
    reset,
    
    // Enhanced features
    isEnrichmentEnabled,
    toggleEnrichment,
    
    // Stats and monitoring
    getStats: getEnhancedStats,
    
    // Service access (for advanced use)
    memoryService: memoryServiceRef.current,
    contextManager: contextManagerRef.current
  }), [
    isConnected,
    connectionStatus,
    error,
    enrichedMessages,
    sendEnhancedMessage,
    clearEnhancedMessages,
    currentContext,
    updateContext,
    connect,
    disconnect,
    reset,
    isEnrichmentEnabled,
    toggleEnrichment,
    getEnhancedStats
  ]);
};

export default usePamWebSocketEnhanced;