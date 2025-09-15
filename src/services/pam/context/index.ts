/**
 * Advanced PAM Context Management System - Main Export
 * 
 * This module provides a complete context management solution for PAM with:
 * - Sliding window context management
 * - Token counting and Claude API limit handling
 * - Intelligent message summarization
 * - Conversation branching for topic shifts
 * - Multi-backend persistence (localStorage, IndexedDB, Supabase)
 * - Cross-tab synchronization
 * - Performance optimization
 */

// Main Classes
export { AdvancedContextManager } from './contextManager';
export { ClaudeTokenCounter } from './tokenCounter';
export { ContextSummarizer } from './summarizer';
export { ConversationBranchManager } from './branchManager';
export { ContextPersistenceManager } from './persistenceManager';

// Types and Interfaces
export type {
  ContextWindow,
  EnhancedMessage,
  ContextSummary,
  ConversationBranch,
  UserContext,
  MessageMetadata,
  ContextMetadata
} from './contextManager';

export type {
  TokenCount,
  TokenAnalysis,
  ClaudeTokenLimits,
  TokenBudget
} from './tokenCounter';

export type {
  SummarizationResult,
  SummarizationQuality,
  SummarizationContext
} from './summarizer';

export type {
  BranchTreeNode,
  TopicShiftAnalysis,
  BranchMergeCandidate,
  BranchNavigationPath
} from './branchManager';

export type {
  StoredContext,
  PersistenceMetadata,
  StorageQuota,
  SyncStatus
} from './persistenceManager';

// Utility Functions
import { AdvancedContextManager } from './contextManager';
import { ClaudeTokenCounter } from './tokenCounter';
import { ContextSummarizer } from './summarizer';
import { ConversationBranchManager } from './branchManager';
import { ContextPersistenceManager } from './persistenceManager';

/**
 * Factory function to create a complete context management system
 */
export function createContextSystem(
  userId: string,
  conversationId: string,
  config?: {
    maxWindowSize?: number;
    maxTokens?: number;
    enableBranching?: boolean;
    enableSummarization?: boolean;
    persistenceBackend?: 'localStorage' | 'indexedDB' | 'supabase';
  }
) {
  const contextManager = new AdvancedContextManager(userId, conversationId, {
    maxWindowSize: config?.maxWindowSize || 50,
    maxTokens: config?.maxTokens || 180000,
    summarizationThreshold: config?.enableSummarization ? 30 : Infinity,
    enableAutoBranching: config?.enableBranching ?? true,
  });

  const tokenCounter = new ClaudeTokenCounter();
  
  const summarizer = config?.enableSummarization 
    ? new ContextSummarizer({
        strategy: 'hybrid',
        maxSummaryLength: 1000,
        compressionRatio: 0.3
      })
    : null;

  const branchManager = config?.enableBranching
    ? new ConversationBranchManager(userId, contextManager, {
        enableAutoBranching: true,
        topicShiftThreshold: 0.6,
        maxBranchDepth: 5
      })
    : null;

  const persistenceManager = new ContextPersistenceManager(userId, {
    primaryStorage: config?.persistenceBackend || 'indexedDB',
    backupStorage: 'localStorage',
    enableCompression: true,
    enableCrossTabs: true
  });

  return {
    contextManager,
    tokenCounter,
    summarizer,
    branchManager,
    persistenceManager,
    
    /**
     * Initialize the complete system
     */
    async initialize(existingMessages?: any[]) {
      await contextManager.initializeContext(existingMessages);
      return this;
    },

    /**
     * Add a message with full context management
     */
    async addMessage(message: any) {
      await contextManager.addMessage(message);

      // Check for topic shifts and branching
      if (branchManager) {
        const recentMessages = contextManager.getContextForClaude()
          .slice(-5)
          .map(msg => ({
            id: msg.id || 'unknown',
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp || new Date(),
            topics: [], // Would be populated by actual message enhancement
            entities: [],
            importance: 0.5,
            contextRelevance: 0.7,
            messageType: msg.role,
            createdAt: msg.timestamp || new Date(),
            metadata: {},
            tokenCount: tokenCounter.countMessageTokens(msg).total
          }));

        if (recentMessages.length > 2) {
          const newEnhancedMessage = {
            ...message,
            topics: [], // Would be populated by actual enhancement
            entities: [],
            importance: 0.5,
            contextRelevance: 0.7,
            messageType: message.role,
            createdAt: message.timestamp || new Date(),
            metadata: {},
            tokenCount: tokenCounter.countMessageTokens(message).total
          };

          const shiftAnalysis = await branchManager.analyzeTopicShift(
            newEnhancedMessage,
            recentMessages,
            {}
          );

          if (shiftAnalysis.recommendedAction === 'branch') {
            await branchManager.createBranch(
              shiftAnalysis.newTopics[0] || 'New Topic',
              'topic_shift',
              message.id
            );
          }
        }
      }

      return this;
    },

    /**
     * Get optimized context for Claude API
     */
    getOptimizedContext() {
      const context = contextManager.getContextForClaude();
      const tokenCheck = tokenCounter.checkContextFits(context, true);
      
      if (!tokenCheck.fits) {
        // Context is too large, need optimization
        contextManager.forceOptimization();
        return contextManager.getContextForClaude();
      }
      
      return context;
    },

    /**
     * Get comprehensive system statistics
     */
    getSystemStats() {
      const contextStats = contextManager.getContextStats();
      const branchStats = branchManager?.getBranchStats();
      
      return {
        context: contextStats,
        branches: branchStats,
        tokenUsage: {
          current: contextStats.tokenCount,
          limit: 180000,
          utilization: contextStats.tokenCount / 180000
        },
        performance: {
          averageMessageTokens: contextStats.tokenCount / Math.max(contextStats.messageCount, 1),
          tokenEfficiency: contextStats.tokenEfficiency
        }
      };
    },

    /**
     * Export complete system state
     */
    async exportState() {
      const contexts = await persistenceManager.getAllContexts();
      const branches = branchManager?.getBranches() || [];
      
      return {
        version: '1.0',
        exportedAt: new Date(),
        userId,
        conversationId,
        contexts,
        branches,
        statistics: this.getSystemStats()
      };
    },

    /**
     * Cleanup and dispose all resources
     */
    dispose() {
      contextManager.dispose();
      summarizer?.dispose?.();
      branchManager?.dispose();
      persistenceManager.dispose();
    }
  };
}

/**
 * Default configuration for different use cases
 */
export const CONTEXT_CONFIGS = {
  // Lightweight configuration for simple chatbots
  lightweight: {
    maxWindowSize: 20,
    maxTokens: 50000,
    enableBranching: false,
    enableSummarization: false,
    persistenceBackend: 'localStorage' as const
  },

  // Standard configuration for most applications
  standard: {
    maxWindowSize: 50,
    maxTokens: 180000,
    enableBranching: true,
    enableSummarization: true,
    persistenceBackend: 'indexedDB' as const
  },

  // Advanced configuration for complex applications
  advanced: {
    maxWindowSize: 100,
    maxTokens: 180000,
    enableBranching: true,
    enableSummarization: true,
    persistenceBackend: 'supabase' as const
  }
};

// Default export for easy integration
export default {
  createContextSystem,
  CONTEXT_CONFIGS,
  AdvancedContextManager,
  ClaudeTokenCounter,
  ContextSummarizer,
  ConversationBranchManager,
  ContextPersistenceManager
};