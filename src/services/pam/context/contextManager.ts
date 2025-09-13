/**
 * Advanced PAM Context Manager - Sliding Window & Token-Aware Context Management
 * 
 * Features:
 * - Sliding window context management (keep last N messages)
 * - Token counting for Claude API limits (200k context window)
 * - Context summarization for old messages
 * - Conversation branching for new topics
 * - Context persistence to localStorage
 * - Smart context optimization based on message relevance
 */

import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage } from '@/services/claude/claudeService';
import { logger } from '@/lib/logger';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface ContextWindow {
  id: string;
  conversationId: string;
  messages: EnhancedMessage[];
  summary?: ContextSummary;
  tokenCount: number;
  lastUpdated: Date;
  windowSize: number;
  metadata: ContextMetadata;
}

export interface EnhancedMessage extends ChatMessage {
  id: string;
  tokenCount: number;
  importance: number; // 0-1 scale for retention priority
  messageType: 'user' | 'assistant' | 'system' | 'tool_use' | 'tool_result';
  topics: string[];
  entities: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  contextRelevance: number; // 0-1 scale for current conversation relevance
  createdAt: Date;
  metadata: MessageMetadata;
}

export interface ContextSummary {
  id: string;
  windowId: string;
  summarizedMessages: string[]; // IDs of messages that were summarized
  summaryText: string;
  keyTopics: string[];
  importantEntities: string[];
  tokenCount: number;
  createdAt: Date;
  confidence: number; // How well this represents the original messages
}

export interface MessageMetadata {
  userIntent?: string;
  toolsUsed?: string[];
  responseTime?: number;
  modelUsed?: string;
  costEstimate?: number;
  contextSwitchTrigger?: boolean;
}

export interface ContextMetadata {
  version: string;
  createdAt: Date;
  lastOptimized?: Date;
  optimizationCount: number;
  averageMessageTokens: number;
  totalMessages: number;
  summarizedMessages: number;
}

export interface ConversationBranch {
  id: string;
  parentConversationId: string;
  branchPoint: string; // Message ID where branch started
  topic: string;
  reason: 'topic_shift' | 'user_request' | 'context_overflow' | 'manual';
  contextWindow: ContextWindow;
  createdAt: Date;
  isActive: boolean;
}

export interface ContextManagerConfig {
  maxWindowSize: number; // Maximum messages to keep in memory
  maxTokens: number; // Claude context limit (200k tokens)
  tokenBuffer: number; // Safety buffer for responses
  summarizationThreshold: number; // When to start summarizing old messages
  importanceDecayFactor: number; // How quickly message importance decays
  persistenceKey: string; // localStorage key prefix
  enableAutoBranching: boolean; // Auto-create branches for topic shifts
  topicShiftThreshold: number; // Threshold for detecting topic changes
  enableSmartOptimization: boolean; // Use AI to optimize context retention
}

export interface TokenEstimate {
  approximate: number;
  method: 'character_estimate' | 'word_count' | 'precise_encoding';
  confidence: number;
}

// =====================================================
// MAIN CONTEXT MANAGER CLASS
// =====================================================

export class AdvancedContextManager {
  private config: ContextManagerConfig;
  private currentWindow: ContextWindow | null = null;
  private branches: Map<string, ConversationBranch> = new Map();
  private summaryCache: Map<string, ContextSummary> = new Map();
  private tokenizer: TokenEstimator;
  
  constructor(
    private userId: string,
    private conversationId: string,
    config?: Partial<ContextManagerConfig>
  ) {
    this.config = {
      maxWindowSize: 50,
      maxTokens: 180000, // Leave buffer for Claude's 200k limit
      tokenBuffer: 20000, // Reserve space for response
      summarizationThreshold: 30,
      importanceDecayFactor: 0.95,
      persistenceKey: `pam_context_${userId}`,
      enableAutoBranching: true,
      topicShiftThreshold: 0.7,
      enableSmartOptimization: true,
      ...config
    };
    
    this.tokenizer = new TokenEstimator();
  }

  // =====================================================
  // CONTEXT WINDOW MANAGEMENT
  // =====================================================

  /**
   * Initialize context window for conversation
   */
  async initializeContext(existingMessages?: ChatMessage[]): Promise<ContextWindow> {
    logger.info('🔄 Initializing advanced context window', { 
      conversationId: this.conversationId,
      userId: this.userId 
    });

    try {
      // Try to load existing context from persistence
      const persistedContext = await this.loadPersistedContext();
      
      if (persistedContext && persistedContext.conversationId === this.conversationId) {
        this.currentWindow = persistedContext;
        logger.info('✅ Loaded persisted context', { 
          messageCount: persistedContext.messages.length,
          tokenCount: persistedContext.tokenCount 
        });
        return this.currentWindow;
      }

      // Create new context window
      const enhancedMessages = existingMessages 
        ? await this.enhanceMessages(existingMessages)
        : [];

      const tokenCount = enhancedMessages.reduce((sum, msg) => sum + msg.tokenCount, 0);

      this.currentWindow = {
        id: this.generateWindowId(),
        conversationId: this.conversationId,
        messages: enhancedMessages,
        tokenCount,
        lastUpdated: new Date(),
        windowSize: this.config.maxWindowSize,
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          optimizationCount: 0,
          averageMessageTokens: enhancedMessages.length > 0 ? Math.round(tokenCount / enhancedMessages.length) : 0,
          totalMessages: enhancedMessages.length,
          summarizedMessages: 0
        }
      };

      await this.persistContext();
      logger.info('✅ Created new context window', { 
        windowId: this.currentWindow.id,
        messageCount: enhancedMessages.length 
      });

      return this.currentWindow;
    } catch (error) {
      logger.error('❌ Failed to initialize context', error);
      throw new Error(`Context initialization failed: ${error.message}`);
    }
  }

  /**
   * Add new message to context with intelligent management
   */
  async addMessage(message: ChatMessage, options?: { forceOptimization?: boolean }): Promise<void> {
    if (!this.currentWindow) {
      throw new Error('Context not initialized. Call initializeContext() first.');
    }

    const enhancedMessage = await this.enhanceMessage(message);
    this.currentWindow.messages.push(enhancedMessage);
    this.currentWindow.tokenCount += enhancedMessage.tokenCount;
    this.currentWindow.lastUpdated = new Date();
    this.currentWindow.metadata.totalMessages++;

    logger.debug('📝 Added message to context', {
      messageId: enhancedMessage.id,
      tokenCount: enhancedMessage.tokenCount,
      totalTokens: this.currentWindow.tokenCount
    });

    // Check if we need optimization
    const needsOptimization = 
      options?.forceOptimization ||
      this.currentWindow.messages.length > this.config.maxWindowSize ||
      this.currentWindow.tokenCount > (this.config.maxTokens - this.config.tokenBuffer);

    if (needsOptimization) {
      await this.optimizeContext();
    }

    // Check for topic shift and auto-branching
    if (this.config.enableAutoBranching && enhancedMessage.role === 'user') {
      const topicShift = await this.detectTopicShift(enhancedMessage);
      if (topicShift.shouldBranch) {
        await this.createConversationBranch(topicShift.newTopic, 'topic_shift', enhancedMessage.id);
      }
    }

    await this.persistContext();
  }

  /**
   * Get current context optimized for Claude API
   */
  getContextForClaude(): ChatMessage[] {
    if (!this.currentWindow) {
      return [];
    }

    const messages: ChatMessage[] = [];

    // Add summary if available
    if (this.currentWindow.summary) {
      messages.push({
        role: 'system',
        content: `Previous conversation summary: ${this.currentWindow.summary.summaryText}`,
        timestamp: this.currentWindow.summary.createdAt
      });
    }

    // Add current messages, ensuring we stay within token limits
    let tokenCount = this.currentWindow.summary?.tokenCount || 0;
    const activeMessages = [...this.currentWindow.messages].reverse();

    for (const msg of activeMessages) {
      if (tokenCount + msg.tokenCount <= this.config.maxTokens - this.config.tokenBuffer) {
        messages.unshift({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          id: msg.id
        });
        tokenCount += msg.tokenCount;
      } else {
        break;
      }
    }

    logger.debug('📤 Generated context for Claude', {
      messageCount: messages.length,
      estimatedTokens: tokenCount,
      hasSummary: !!this.currentWindow.summary
    });

    return messages;
  }

  // =====================================================
  // CONTEXT OPTIMIZATION & SUMMARIZATION
  // =====================================================

  /**
   * Optimize context by summarizing old messages and removing low-importance content
   */
  private async optimizeContext(): Promise<void> {
    if (!this.currentWindow) return;

    logger.info('⚡ Optimizing context window', {
      currentMessages: this.currentWindow.messages.length,
      currentTokens: this.currentWindow.tokenCount
    });

    const startTime = Date.now();

    // Step 1: Identify messages for summarization
    const messagesToSummarize = this.identifyMessagesForSummarization();
    
    if (messagesToSummarize.length > 0) {
      // Step 2: Create summary of old messages
      const summary = await this.createSummary(messagesToSummarize);
      
      // Step 3: Remove summarized messages and add summary
      this.currentWindow.messages = this.currentWindow.messages.filter(
        msg => !messagesToSummarize.some(s => s.id === msg.id)
      );
      
      this.currentWindow.summary = summary;
      this.currentWindow.metadata.summarizedMessages += messagesToSummarize.length;
    }

    // Step 4: Remove low-importance messages if still over limits
    if (this.currentWindow.messages.length > this.config.maxWindowSize) {
      await this.pruneByImportance();
    }

    // Step 5: Update metadata
    this.currentWindow.tokenCount = this.recalculateTokenCount();
    this.currentWindow.metadata.optimizationCount++;
    this.currentWindow.metadata.lastOptimized = new Date();
    this.currentWindow.metadata.averageMessageTokens = 
      this.currentWindow.messages.length > 0 
        ? Math.round(this.currentWindow.tokenCount / this.currentWindow.messages.length)
        : 0;

    const optimizationTime = Date.now() - startTime;
    logger.info('✅ Context optimization complete', {
      finalMessages: this.currentWindow.messages.length,
      finalTokens: this.currentWindow.tokenCount,
      summarizedMessages: messagesToSummarize.length,
      optimizationTimeMs: optimizationTime
    });
  }

  /**
   * Identify messages that should be summarized
   */
  private identifyMessagesForSummarization(): EnhancedMessage[] {
    if (!this.currentWindow || this.currentWindow.messages.length < this.config.summarizationThreshold) {
      return [];
    }

    // Keep recent messages, summarize older ones
    const recentMessageCount = Math.floor(this.config.maxWindowSize * 0.6);
    const oldMessages = this.currentWindow.messages.slice(0, -recentMessageCount);

    // Filter out already important messages that shouldn't be summarized
    return oldMessages.filter(msg => {
      // Keep high-importance messages
      if (msg.importance > 0.8) return false;
      
      // Keep recent tool use results
      if (msg.messageType === 'tool_result' && 
          (Date.now() - msg.createdAt.getTime()) < 60 * 60 * 1000) return false;
      
      // Keep context switch triggers
      if (msg.metadata.contextSwitchTrigger) return false;
      
      return true;
    });
  }

  /**
   * Create a summary of multiple messages
   */
  private async createSummary(messages: EnhancedMessage[]): Promise<ContextSummary> {
    const summaryContent = messages.map(msg => 
      `${msg.role}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`
    ).join('\n');

    // Extract key topics and entities
    const allTopics = [...new Set(messages.flatMap(msg => msg.topics))];
    const allEntities = [...new Set(messages.flatMap(msg => msg.entities))];

    // Create concise summary (this could be enhanced with AI summarization)
    const keyTopics = allTopics.slice(0, 5);
    const importantEntities = allEntities.slice(0, 10);
    
    const summaryText = `Summary of ${messages.length} messages discussing: ${keyTopics.join(', ')}. Key entities mentioned: ${importantEntities.join(', ')}.`;

    const summary: ContextSummary = {
      id: `summary_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      windowId: this.currentWindow!.id,
      summarizedMessages: messages.map(msg => msg.id),
      summaryText,
      keyTopics,
      importantEntities,
      tokenCount: this.tokenizer.estimateTokens(summaryText).approximate,
      createdAt: new Date(),
      confidence: this.calculateSummaryConfidence(messages)
    };

    this.summaryCache.set(summary.id, summary);
    return summary;
  }

  /**
   * Remove messages based on importance scoring
   */
  private async pruneByImportance(): Promise<void> {
    if (!this.currentWindow) return;

    // Sort messages by importance (ascending)
    const sortedMessages = [...this.currentWindow.messages].sort((a, b) => a.importance - b.importance);
    
    // Keep only the most important messages within limits
    const targetSize = Math.floor(this.config.maxWindowSize * 0.8);
    const messagesToKeep = sortedMessages.slice(-targetSize);
    
    // Ensure we keep at least the last few messages regardless of importance
    const recentMessages = this.currentWindow.messages.slice(-5);
    const finalMessages = [...new Set([...messagesToKeep, ...recentMessages])];
    
    this.currentWindow.messages = finalMessages.sort((a, b) => 
      a.createdAt.getTime() - b.createdAt.getTime()
    );

    logger.debug('🗂️ Pruned messages by importance', {
      originalCount: sortedMessages.length,
      finalCount: finalMessages.length
    });
  }

  // =====================================================
  // MESSAGE ENHANCEMENT & ANALYSIS
  // =====================================================

  /**
   * Enhance a single message with metadata and analysis
   */
  private async enhanceMessage(message: ChatMessage): Promise<EnhancedMessage> {
    const tokenCount = this.tokenizer.estimateTokens(message.content);
    const topics = await this.extractTopics(message.content);
    const entities = await this.extractEntities(message.content);
    const sentiment = this.analyzeSentiment(message.content);
    const importance = this.calculateImportance(message, topics, entities);
    const contextRelevance = await this.calculateContextRelevance(message);

    return {
      ...message,
      id: message.id || this.generateMessageId(),
      tokenCount: tokenCount.approximate,
      importance,
      messageType: this.inferMessageType(message),
      topics,
      entities,
      sentiment,
      contextRelevance,
      createdAt: message.timestamp || new Date(),
      metadata: {
        userIntent: message.role === 'user' ? await this.extractIntent(message.content) : undefined,
        toolsUsed: this.extractToolsUsed(message),
        modelUsed: 'claude-3-sonnet-20241022', // Could be dynamic
        costEstimate: this.estimateCost(tokenCount.approximate)
      }
    };
  }

  /**
   * Enhance multiple messages efficiently
   */
  private async enhanceMessages(messages: ChatMessage[]): Promise<EnhancedMessage[]> {
    const enhanced = await Promise.all(
      messages.map(msg => this.enhanceMessage(msg))
    );

    // Update context relevance based on conversation flow
    this.updateContextRelevance(enhanced);
    
    return enhanced;
  }

  /**
   * Extract topics from message content
   */
  private async extractTopics(content: string): Promise<string[]> {
    // Simple keyword-based topic extraction (could be enhanced with NLP)
    const topics: string[] = [];
    const lowerContent = content.toLowerCase();

    // Travel/Trip topics
    if (/\b(trip|travel|journey|route|destination|campground|camping)\b/.test(lowerContent)) {
      topics.push('travel');
    }
    
    // Financial topics
    if (/\b(expense|cost|budget|money|price|payment|financial)\b/.test(lowerContent)) {
      topics.push('finance');
    }
    
    // Location topics
    if (/\b(location|place|city|state|park|hotel|restaurant)\b/.test(lowerContent)) {
      topics.push('location');
    }
    
    // Planning topics
    if (/\b(plan|schedule|organize|prepare|booking|reservation)\b/.test(lowerContent)) {
      topics.push('planning');
    }

    return topics;
  }

  /**
   * Extract entities (people, places, organizations) from content
   */
  private async extractEntities(content: string): Promise<string[]> {
    const entities: string[] = [];
    
    // Extract capitalized words as potential entities
    const words = content.split(/\s+/);
    const capitalizedWords = words.filter(word => 
      /^[A-Z][a-z]+$/.test(word) && word.length > 2
    );
    
    entities.push(...capitalizedWords);
    
    // Extract common patterns
    const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const urlPattern = /https?:\/\/[^\s]+/g;
    
    const phones = content.match(phonePattern) || [];
    const emails = content.match(emailPattern) || [];
    const urls = content.match(urlPattern) || [];
    
    entities.push(...phones, ...emails, ...urls);
    
    return [...new Set(entities)];
  }

  // =====================================================
  // CONVERSATION BRANCHING
  // =====================================================

  /**
   * Detect if a topic shift has occurred that warrants a branch
   */
  private async detectTopicShift(message: EnhancedMessage): Promise<{ shouldBranch: boolean; newTopic: string }> {
    if (!this.currentWindow || this.currentWindow.messages.length < 3) {
      return { shouldBranch: false, newTopic: '' };
    }

    const recentMessages = this.currentWindow.messages.slice(-5);
    const currentTopics = new Set(message.topics);
    
    // Calculate topic overlap with recent messages
    let overlapScore = 0;
    let totalTopics = 0;

    for (const recentMsg of recentMessages) {
      const recentTopics = new Set(recentMsg.topics);
      const intersection = new Set([...currentTopics].filter(t => recentTopics.has(t)));
      const union = new Set([...currentTopics, ...recentTopics]);
      
      if (union.size > 0) {
        overlapScore += intersection.size / union.size;
        totalTopics++;
      }
    }

    const averageOverlap = totalTopics > 0 ? overlapScore / totalTopics : 1;
    const shouldBranch = averageOverlap < this.config.topicShiftThreshold;
    
    const newTopic = message.topics.length > 0 ? message.topics[0] : 'general';

    logger.debug('🔍 Topic shift analysis', {
      averageOverlap,
      shouldBranch,
      newTopic,
      threshold: this.config.topicShiftThreshold
    });

    return { shouldBranch, newTopic };
  }

  /**
   * Create a new conversation branch
   */
  async createConversationBranch(
    topic: string, 
    reason: ConversationBranch['reason'],
    branchPoint?: string
  ): Promise<ConversationBranch> {
    if (!this.currentWindow) {
      throw new Error('No active context window');
    }

    const branchId = `branch_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const newConversationId = `${this.conversationId}_${branchId}`;

    // Create branch context with current window state
    const branchContext: ContextWindow = {
      ...this.currentWindow,
      id: this.generateWindowId(),
      conversationId: newConversationId
    };

    const branch: ConversationBranch = {
      id: branchId,
      parentConversationId: this.conversationId,
      branchPoint: branchPoint || this.currentWindow.messages[this.currentWindow.messages.length - 1]?.id || '',
      topic,
      reason,
      contextWindow: branchContext,
      createdAt: new Date(),
      isActive: false
    };

    this.branches.set(branchId, branch);

    logger.info('🌿 Created conversation branch', {
      branchId,
      topic,
      reason,
      parentConversation: this.conversationId
    });

    return branch;
  }

  /**
   * Switch to a conversation branch
   */
  async switchToBranch(branchId: string): Promise<void> {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }

    // Save current context
    if (this.currentWindow) {
      await this.persistContext();
    }

    // Switch to branch context
    this.currentWindow = branch.contextWindow;
    this.conversationId = branch.contextWindow.conversationId;
    branch.isActive = true;

    logger.info('🔄 Switched to conversation branch', {
      branchId,
      newConversationId: this.conversationId,
      messageCount: this.currentWindow.messages.length
    });
  }

  // =====================================================
  // PERSISTENCE & STORAGE
  // =====================================================

  /**
   * Persist context to localStorage
   */
  private async persistContext(): Promise<void> {
    if (!this.currentWindow) return;

    try {
      const contextData = {
        window: this.currentWindow,
        branches: Array.from(this.branches.entries()),
        summaryCache: Array.from(this.summaryCache.entries()),
        lastPersisted: new Date().toISOString()
      };

      localStorage.setItem(
        `${this.config.persistenceKey}_${this.conversationId}`,
        JSON.stringify(contextData)
      );

      logger.debug('💾 Context persisted to localStorage', {
        conversationId: this.conversationId,
        messageCount: this.currentWindow.messages.length,
        tokenCount: this.currentWindow.tokenCount
      });
    } catch (error) {
      logger.error('❌ Failed to persist context', error);
    }
  }

  /**
   * Load persisted context from localStorage
   */
  private async loadPersistedContext(): Promise<ContextWindow | null> {
    try {
      const stored = localStorage.getItem(`${this.config.persistenceKey}_${this.conversationId}`);
      if (!stored) return null;

      const contextData = JSON.parse(stored);
      
      // Restore context window
      const window: ContextWindow = {
        ...contextData.window,
        lastUpdated: new Date(contextData.window.lastUpdated),
        metadata: {
          ...contextData.window.metadata,
          createdAt: new Date(contextData.window.metadata.createdAt),
          lastOptimized: contextData.window.metadata.lastOptimized 
            ? new Date(contextData.window.metadata.lastOptimized) 
            : undefined
        }
      };

      // Restore messages with proper dates
      window.messages = window.messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        createdAt: new Date(msg.createdAt)
      }));

      // Restore branches
      if (contextData.branches) {
        this.branches = new Map(contextData.branches.map(([id, branch]: [string, any]) => [
          id,
          {
            ...branch,
            createdAt: new Date(branch.createdAt)
          }
        ]));
      }

      // Restore summary cache
      if (contextData.summaryCache) {
        this.summaryCache = new Map(contextData.summaryCache);
      }

      logger.info('📖 Loaded persisted context', {
        conversationId: this.conversationId,
        messageCount: window.messages.length,
        branchCount: this.branches.size
      });

      return window;
    } catch (error) {
      logger.error('❌ Failed to load persisted context', error);
      return null;
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private generateWindowId(): string {
    return `window_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private inferMessageType(message: ChatMessage): EnhancedMessage['messageType'] {
    if (message.role === 'system') return 'system';
    if (message.role === 'user') return 'user';
    if (message.role === 'assistant') {
      // Check if it contains tool usage patterns
      if (message.content.includes('[tool_use]') || message.content.includes('<tool_call>')) {
        return 'tool_use';
      }
      return 'assistant';
    }
    return 'assistant';
  }

  private calculateImportance(message: ChatMessage, topics: string[], entities: string[]): number {
    let importance = 0.5; // Base importance

    // Boost for user questions
    if (message.role === 'user' && message.content.includes('?')) {
      importance += 0.2;
    }

    // Boost for topic richness
    importance += Math.min(0.2, topics.length * 0.05);

    // Boost for entity richness
    importance += Math.min(0.1, entities.length * 0.02);

    // Boost for longer messages (more information)
    const contentLength = message.content.length;
    if (contentLength > 200) importance += 0.1;
    if (contentLength > 500) importance += 0.1;

    return Math.min(1.0, importance);
  }

  private async calculateContextRelevance(message: ChatMessage): Promise<number> {
    // Simple relevance calculation (could be enhanced with semantic similarity)
    let relevance = 0.5;

    if (this.currentWindow && this.currentWindow.messages.length > 0) {
      const recentMessage = this.currentWindow.messages[this.currentWindow.messages.length - 1];
      const messageWords = new Set(message.content.toLowerCase().split(/\s+/));
      const recentWords = new Set(recentMessage.content.toLowerCase().split(/\s+/));
      
      const intersection = new Set([...messageWords].filter(w => recentWords.has(w)));
      const union = new Set([...messageWords, ...recentWords]);
      
      if (union.size > 0) {
        relevance = intersection.size / union.size;
      }
    }

    return relevance;
  }

  private updateContextRelevance(messages: EnhancedMessage[]): void {
    // Update relevance based on conversation flow
    for (let i = 1; i < messages.length; i++) {
      const current = messages[i];
      const previous = messages[i - 1];
      
      // Higher relevance for follow-up messages
      if (current.role !== previous.role) {
        current.contextRelevance += 0.1;
      }
      
      // Decay relevance over time
      const timeDiff = current.createdAt.getTime() - previous.createdAt.getTime();
      const decayFactor = Math.exp(-timeDiff / (1000 * 60 * 60)); // 1 hour half-life
      current.contextRelevance *= decayFactor;
    }
  }

  private analyzeSentiment(content: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'excellent', 'perfect', 'love', 'like', 'happy', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'frustrated', 'annoying'];
    
    const words = content.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score++;
      if (negativeWords.includes(word)) score--;
    });
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  private extractToolsUsed(message: ChatMessage): string[] {
    const tools: string[] = [];
    
    // Look for tool usage patterns in content
    const toolPatterns = [
      /\[tool_use:(\w+)\]/g,
      /<tool_call>(\w+)<\/tool_call>/g,
      /used tool: (\w+)/g
    ];
    
    toolPatterns.forEach(pattern => {
      const matches = message.content.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) tools.push(match[1]);
      }
    });
    
    return [...new Set(tools)];
  }

  private async extractIntent(content: string): Promise<string> {
    // Simple intent extraction (could be enhanced with ML)
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('plan') || lowerContent.includes('route')) return 'planning';
    if (lowerContent.includes('find') || lowerContent.includes('search')) return 'search';
    if (lowerContent.includes('expense') || lowerContent.includes('cost')) return 'expense_tracking';
    if (lowerContent.includes('help') || lowerContent.includes('how')) return 'help';
    if (lowerContent.includes('?')) return 'question';
    
    return 'general';
  }

  private estimateCost(tokens: number): number {
    // Estimate cost based on Claude pricing (example rates)
    const inputCostPer1K = 0.003; // $0.003 per 1K tokens
    return (tokens / 1000) * inputCostPer1K;
  }

  private calculateSummaryConfidence(messages: EnhancedMessage[]): number {
    // Calculate how well a summary represents the original messages
    const averageImportance = messages.reduce((sum, msg) => sum + msg.importance, 0) / messages.length;
    const topicDiversity = new Set(messages.flatMap(msg => msg.topics)).size;
    
    let confidence = averageImportance * 0.7;
    confidence += Math.min(0.3, topicDiversity * 0.1);
    
    return Math.min(1.0, confidence);
  }

  private recalculateTokenCount(): number {
    if (!this.currentWindow) return 0;
    
    let total = 0;
    
    // Add summary tokens
    if (this.currentWindow.summary) {
      total += this.currentWindow.summary.tokenCount;
    }
    
    // Add message tokens
    total += this.currentWindow.messages.reduce((sum, msg) => sum + msg.tokenCount, 0);
    
    return total;
  }

  // =====================================================
  // PUBLIC API METHODS
  // =====================================================

  /**
   * Get current context statistics
   */
  getContextStats(): {
    messageCount: number;
    tokenCount: number;
    summaryCount: number;
    branchCount: number;
    averageImportance: number;
    tokenEfficiency: number;
  } {
    if (!this.currentWindow) {
      return {
        messageCount: 0,
        tokenCount: 0,
        summaryCount: 0,
        branchCount: 0,
        averageImportance: 0,
        tokenEfficiency: 0
      };
    }

    const averageImportance = this.currentWindow.messages.length > 0
      ? this.currentWindow.messages.reduce((sum, msg) => sum + msg.importance, 0) / this.currentWindow.messages.length
      : 0;

    const tokenEfficiency = this.currentWindow.tokenCount > 0
      ? this.currentWindow.messages.length / this.currentWindow.tokenCount * 1000
      : 0;

    return {
      messageCount: this.currentWindow.messages.length,
      tokenCount: this.currentWindow.tokenCount,
      summaryCount: this.summaryCache.size,
      branchCount: this.branches.size,
      averageImportance,
      tokenEfficiency
    };
  }

  /**
   * Force context optimization
   */
  async forceOptimization(): Promise<void> {
    await this.optimizeContext();
  }

  /**
   * Clear all persisted data
   */
  async clearPersistedData(): Promise<void> {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(this.config.persistenceKey)
    );
    
    keys.forEach(key => localStorage.removeItem(key));
    
    logger.info('🧹 Cleared all persisted context data', { clearedKeys: keys.length });
  }

  /**
   * Export context for backup or analysis
   */
  exportContext(): any {
    return {
      currentWindow: this.currentWindow,
      branches: Array.from(this.branches.entries()),
      summaryCache: Array.from(this.summaryCache.entries()),
      config: this.config,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Get available conversation branches
   */
  getBranches(): ConversationBranch[] {
    return Array.from(this.branches.values());
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.currentWindow = null;
    this.branches.clear();
    this.summaryCache.clear();
  }
}

// =====================================================
// TOKEN ESTIMATION UTILITY
// =====================================================

class TokenEstimator {
  /**
   * Estimate token count for text
   * Uses multiple methods for better accuracy
   */
  estimateTokens(text: string): TokenEstimate {
    // Method 1: Character-based estimate (rough)
    const charEstimate = Math.ceil(text.length / 4);
    
    // Method 2: Word-based estimate (better for English)
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const wordEstimate = Math.ceil(words.length * 1.3);
    
    // Use the higher estimate for safety
    const approximate = Math.max(charEstimate, wordEstimate);
    
    return {
      approximate,
      method: 'word_count',
      confidence: 0.8
    };
  }
}

export { AdvancedContextManager, TokenEstimator };
export default AdvancedContextManager;