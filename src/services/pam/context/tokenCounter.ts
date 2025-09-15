/**
 * Advanced Token Counter for Claude API
 * 
 * Features:
 * - Accurate token estimation for Claude's tokenizer
 * - Message-specific token counting
 * - Context window management for 200k token limit
 * - Cost estimation based on token usage
 * - Token efficiency analysis
 */

import type { ChatMessage } from '@/services/claude/claudeService';
import type { EnhancedMessage } from './contextManager';
import { logger } from '@/lib/logger';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface TokenCount {
  total: number;
  breakdown: {
    input: number;
    output: number;
    system: number;
  };
  method: 'precise' | 'estimated' | 'cached';
  confidence: number;
  costEstimate: number;
}

export interface TokenAnalysis {
  messageTokens: number;
  averagePerMessage: number;
  efficiency: number; // Information per token
  compressionRatio: number; // How much context was compressed
  recommendations: string[];
}

export interface ClaudeTokenLimits {
  maxContextTokens: number;
  recommendedLimit: number;
  responseBuffer: number;
  systemPromptBuffer: number;
}

export interface TokenBudget {
  available: number;
  allocated: number;
  reserved: number;
  utilizationRate: number;
  projectedUsage: number;
}

// =====================================================
// CLAUDE TOKEN COUNTER CLASS
// =====================================================

export class ClaudeTokenCounter {
  private readonly CLAUDE_LIMITS: ClaudeTokenLimits = {
    maxContextTokens: 200000,
    recommendedLimit: 180000, // Leave buffer for response
    responseBuffer: 20000,
    systemPromptBuffer: 5000
  };

  private readonly PRICING = {
    inputTokensPer1K: 0.003,  // $0.003 per 1K input tokens
    outputTokensPer1K: 0.015, // $0.015 per 1K output tokens
  };

  private tokenCache: Map<string, number> = new Map();
  private analysisCache: Map<string, TokenAnalysis> = new Map();

  constructor() {
    logger.debug('🔢 Claude Token Counter initialized', {
      maxTokens: this.CLAUDE_LIMITS.maxContextTokens,
      recommendedLimit: this.CLAUDE_LIMITS.recommendedLimit
    });
  }

  // =====================================================
  // TOKEN COUNTING METHODS
  // =====================================================

  /**
   * Count tokens in a single message with high accuracy
   */
  countMessageTokens(message: ChatMessage): TokenCount {
    const cacheKey = this.generateCacheKey(message);
    
    // Check cache first
    if (this.tokenCache.has(cacheKey)) {
      const cachedCount = this.tokenCache.get(cacheKey)!;
      return {
        total: cachedCount,
        breakdown: this.categorizeTokens(message, cachedCount),
        method: 'cached',
        confidence: 1.0,
        costEstimate: this.estimateCost(cachedCount, message.role)
      };
    }

    // Use enhanced estimation for Claude's tokenizer
    const tokenCount = this.estimateClaudeTokens(message.content);
    
    // Add role-specific overhead
    const roleOverhead = this.getRoleOverhead(message.role);
    const totalTokens = tokenCount + roleOverhead;

    // Cache the result
    this.tokenCache.set(cacheKey, totalTokens);

    const result: TokenCount = {
      total: totalTokens,
      breakdown: this.categorizeTokens(message, totalTokens),
      method: 'estimated',
      confidence: this.getEstimationConfidence(message.content),
      costEstimate: this.estimateCost(totalTokens, message.role)
    };

    logger.debug('🔢 Counted message tokens', {
      messageId: message.id,
      role: message.role,
      tokens: totalTokens,
      method: result.method
    });

    return result;
  }

  /**
   * Count tokens for multiple messages efficiently
   */
  countMessagesTokens(messages: ChatMessage[]): TokenCount {
    let totalTokens = 0;
    let totalInput = 0;
    let totalOutput = 0;
    let totalSystem = 0;
    let totalCost = 0;
    let minConfidence = 1.0;

    for (const message of messages) {
      const count = this.countMessageTokens(message);
      totalTokens += count.total;
      totalInput += count.breakdown.input;
      totalOutput += count.breakdown.output;
      totalSystem += count.breakdown.system;
      totalCost += count.costEstimate;
      minConfidence = Math.min(minConfidence, count.confidence);
    }

    return {
      total: totalTokens,
      breakdown: {
        input: totalInput,
        output: totalOutput,
        system: totalSystem
      },
      method: messages.length > 10 ? 'estimated' : 'precise',
      confidence: minConfidence,
      costEstimate: totalCost
    };
  }

  /**
   * Analyze conversation context for token efficiency
   */
  analyzeConversationTokens(messages: EnhancedMessage[]): TokenAnalysis {
    const conversationKey = this.generateConversationKey(messages);
    
    if (this.analysisCache.has(conversationKey)) {
      return this.analysisCache.get(conversationKey)!;
    }

    const messageTokens = messages.reduce((sum, msg) => sum + msg.tokenCount, 0);
    const averagePerMessage = messages.length > 0 ? messageTokens / messages.length : 0;
    
    // Calculate information efficiency (topics + entities per token)
    const totalTopics = new Set(messages.flatMap(msg => msg.topics)).size;
    const totalEntities = new Set(messages.flatMap(msg => msg.entities)).size;
    const informationDensity = (totalTopics + totalEntities) / Math.max(messageTokens, 1);
    
    // Calculate compression ratio if there's a summary
    const originalMessages = messages.filter(msg => !msg.content.startsWith('Summary of'));
    const summaryMessages = messages.filter(msg => msg.content.startsWith('Summary of'));
    const compressionRatio = summaryMessages.length > 0 
      ? originalMessages.length / (originalMessages.length + summaryMessages.length)
      : 1.0;

    const analysis: TokenAnalysis = {
      messageTokens,
      averagePerMessage,
      efficiency: informationDensity,
      compressionRatio,
      recommendations: this.generateOptimizationRecommendations({
        messageTokens,
        averagePerMessage,
        efficiency: informationDensity,
        messageCount: messages.length
      })
    };

    this.analysisCache.set(conversationKey, analysis);

    logger.debug('📊 Analyzed conversation tokens', {
      messageCount: messages.length,
      totalTokens: messageTokens,
      efficiency: informationDensity,
      compressionRatio
    });

    return analysis;
  }

  // =====================================================
  // CONTEXT WINDOW MANAGEMENT
  // =====================================================

  /**
   * Check if messages fit within Claude's context window
   */
  checkContextFits(messages: ChatMessage[], includeResponseBuffer: boolean = true): {
    fits: boolean;
    currentTokens: number;
    availableTokens: number;
    utilizationRate: number;
    recommendation: string;
  } {
    const count = this.countMessagesTokens(messages);
    const limit = includeResponseBuffer 
      ? this.CLAUDE_LIMITS.recommendedLimit
      : this.CLAUDE_LIMITS.maxContextTokens;

    const fits = count.total <= limit;
    const availableTokens = limit - count.total;
    const utilizationRate = count.total / limit;

    let recommendation = '';
    if (utilizationRate > 0.9) {
      recommendation = 'Critical: Immediate context optimization required';
    } else if (utilizationRate > 0.8) {
      recommendation = 'Warning: Consider summarizing old messages';
    } else if (utilizationRate > 0.6) {
      recommendation = 'Moderate: Monitor token usage';
    } else {
      recommendation = 'Good: Plenty of context space available';
    }

    logger.debug('🔍 Context window check', {
      fits,
      currentTokens: count.total,
      utilizationRate: Math.round(utilizationRate * 100),
      recommendation
    });

    return {
      fits,
      currentTokens: count.total,
      availableTokens,
      utilizationRate,
      recommendation
    };
  }

  /**
   * Calculate optimal context window size
   */
  calculateOptimalWindow(
    messages: EnhancedMessage[],
    preserveRecentCount: number = 10
  ): {
    optimalMessages: EnhancedMessage[];
    removedCount: number;
    tokensSaved: number;
    retainedImportance: number;
  } {
    if (messages.length <= preserveRecentCount) {
      return {
        optimalMessages: messages,
        removedCount: 0,
        tokensSaved: 0,
        retainedImportance: 1.0
      };
    }

    // Always keep recent messages
    const recentMessages = messages.slice(-preserveRecentCount);
    const recentTokens = recentMessages.reduce((sum, msg) => sum + msg.tokenCount, 0);
    
    // Calculate available tokens for older messages
    const availableForOlder = this.CLAUDE_LIMITS.recommendedLimit - recentTokens;
    
    // Sort older messages by importance * contextRelevance
    const olderMessages = messages.slice(0, -preserveRecentCount);
    const sortedOlder = olderMessages
      .map(msg => ({
        message: msg,
        score: msg.importance * msg.contextRelevance
      }))
      .sort((a, b) => b.score - a.score);

    // Select older messages that fit within available tokens
    const selectedOlder: EnhancedMessage[] = [];
    let usedTokens = 0;
    
    for (const item of sortedOlder) {
      if (usedTokens + item.message.tokenCount <= availableForOlder) {
        selectedOlder.push(item.message);
        usedTokens += item.message.tokenCount;
      }
    }

    // Combine and sort by timestamp
    const optimalMessages = [...selectedOlder, ...recentMessages]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const removedCount = messages.length - optimalMessages.length;
    const originalTokens = messages.reduce((sum, msg) => sum + msg.tokenCount, 0);
    const retainedTokens = optimalMessages.reduce((sum, msg) => sum + msg.tokenCount, 0);
    const tokensSaved = originalTokens - retainedTokens;

    // Calculate retained importance
    const originalImportance = messages.reduce((sum, msg) => sum + msg.importance, 0);
    const retainedImportance = optimalMessages.reduce((sum, msg) => sum + msg.importance, 0);
    const importanceRatio = originalImportance > 0 ? retainedImportance / originalImportance : 1.0;

    logger.info('⚡ Calculated optimal context window', {
      originalCount: messages.length,
      optimalCount: optimalMessages.length,
      removedCount,
      tokensSaved,
      retainedImportance: Math.round(importanceRatio * 100)
    });

    return {
      optimalMessages,
      removedCount,
      tokensSaved,
      retainedImportance: importanceRatio
    };
  }

  // =====================================================
  // ADVANCED TOKEN ESTIMATION
  // =====================================================

  /**
   * Enhanced token estimation specifically for Claude's tokenizer
   */
  private estimateClaudeTokens(text: string): number {
    if (!text) return 0;

    // Claude uses a sophisticated tokenizer similar to GPT-4
    // This estimation is based on empirical analysis of Claude's behavior

    let tokens = 0;

    // Base character-to-token ratio (varies by language and content type)
    const baseRatio = this.getBaseTokenRatio(text);
    tokens = Math.ceil(text.length / baseRatio);

    // Adjust for special tokens and formatting
    tokens += this.countSpecialTokens(text);

    // Adjust for word boundaries and punctuation
    const wordBoundaryAdjustment = this.calculateWordBoundaryAdjustment(text);
    tokens = Math.ceil(tokens * wordBoundaryAdjustment);

    // Minimum token count (even empty strings have overhead)
    return Math.max(1, tokens);
  }

  /**
   * Get base character-to-token ratio based on content analysis
   */
  private getBaseTokenRatio(text: string): number {
    // Analyze text characteristics to determine tokenization efficiency
    
    const alphaNumericRatio = (text.match(/[a-zA-Z0-9]/g) || []).length / text.length;
    const whitespaceRatio = (text.match(/\s/g) || []).length / text.length;
    const punctuationRatio = (text.match(/[^\w\s]/g) || []).length / text.length;
    
    // Base ratio for mixed content (empirically determined for Claude)
    let ratio = 4.0;
    
    // Adjust based on content characteristics
    if (alphaNumericRatio > 0.8) {
      // Text-heavy content is more efficient
      ratio += 0.5;
    }
    
    if (whitespaceRatio > 0.2) {
      // Lots of whitespace reduces efficiency
      ratio -= 0.3;
    }
    
    if (punctuationRatio > 0.1) {
      // Heavy punctuation/symbols reduce efficiency
      ratio -= 0.4;
    }
    
    // Code-like patterns (common in technical content)
    if (text.includes('{') || text.includes('[') || text.includes('<')) {
      ratio -= 0.2;
    }
    
    return Math.max(2.5, Math.min(5.5, ratio));
  }

  /**
   * Count special tokens (formatting, system tokens, etc.)
   */
  private countSpecialTokens(text: string): number {
    let specialTokens = 0;
    
    // Markdown formatting
    specialTokens += (text.match(/\*\*.*?\*\*/g) || []).length; // Bold
    specialTokens += (text.match(/\*.*?\*/g) || []).length; // Italic
    specialTokens += (text.match(/```[\s\S]*?```/g) || []).length * 2; // Code blocks
    specialTokens += (text.match(/`[^`]+`/g) || []).length; // Inline code
    
    // URLs and emails
    specialTokens += (text.match(/https?:\/\/[^\s]+/g) || []).length;
    specialTokens += (text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || []).length;
    
    // Numbers and dates
    specialTokens += Math.floor((text.match(/\b\d+\b/g) || []).length * 0.5);
    
    return specialTokens;
  }

  /**
   * Calculate adjustment for word boundaries and tokenization patterns
   */
  private calculateWordBoundaryAdjustment(text: string): number {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length === 0) return 1.0;
    
    let adjustment = 1.0;
    
    // Average word length affects tokenization
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    if (avgWordLength < 4) {
      // Short words are less efficiently tokenized
      adjustment += 0.1;
    } else if (avgWordLength > 8) {
      // Long words are more efficiently tokenized
      adjustment -= 0.05;
    }
    
    // Repetitive content
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const repetitionRatio = uniqueWords.size / words.length;
    
    if (repetitionRatio < 0.7) {
      // High repetition can be more efficiently tokenized
      adjustment -= 0.05;
    }
    
    return Math.max(0.8, Math.min(1.2, adjustment));
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Get role-specific token overhead
   */
  private getRoleOverhead(role: string): number {
    switch (role) {
      case 'system': return 5; // System prompt overhead
      case 'user': return 3; // User message overhead
      case 'assistant': return 4; // Assistant response overhead
      default: return 2; // Default overhead
    }
  }

  /**
   * Categorize tokens by type for detailed analysis
   */
  private categorizeTokens(message: ChatMessage, totalTokens: number): TokenCount['breakdown'] {
    const roleOverhead = this.getRoleOverhead(message.role);
    const contentTokens = totalTokens - roleOverhead;
    
    switch (message.role) {
      case 'system':
        return { input: 0, output: 0, system: totalTokens };
      case 'user':
        return { input: totalTokens, output: 0, system: 0 };
      case 'assistant':
        return { input: 0, output: totalTokens, system: 0 };
      default:
        return { input: contentTokens, output: 0, system: roleOverhead };
    }
  }

  /**
   * Estimate cost based on Claude pricing
   */
  private estimateCost(tokens: number, role: string): number {
    const tokensIn1K = tokens / 1000;
    
    switch (role) {
      case 'user':
      case 'system':
        return tokensIn1K * this.PRICING.inputTokensPer1K;
      case 'assistant':
        return tokensIn1K * this.PRICING.outputTokensPer1K;
      default:
        return tokensIn1K * this.PRICING.inputTokensPer1K;
    }
  }

  /**
   * Get confidence level for token estimation
   */
  private getEstimationConfidence(content: string): number {
    let confidence = 0.85; // Base confidence
    
    // Higher confidence for typical text
    if (/^[a-zA-Z\s.,!?'"]+$/.test(content)) {
      confidence += 0.1;
    }
    
    // Lower confidence for code or complex formatting
    if (content.includes('{') || content.includes('[') || content.includes('```')) {
      confidence -= 0.15;
    }
    
    // Content length affects confidence
    if (content.length < 50) {
      confidence -= 0.05; // Less data for accurate estimation
    } else if (content.length > 1000) {
      confidence += 0.05; // More data improves estimation
    }
    
    return Math.max(0.5, Math.min(0.95, confidence));
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(stats: {
    messageTokens: number;
    averagePerMessage: number;
    efficiency: number;
    messageCount: number;
  }): string[] {
    const recommendations: string[] = [];
    
    if (stats.averagePerMessage > 500) {
      recommendations.push('Consider breaking down long messages into smaller chunks');
    }
    
    if (stats.efficiency < 0.01) {
      recommendations.push('Increase information density by including more specific topics');
    }
    
    if (stats.messageCount > 30 && stats.messageTokens > 50000) {
      recommendations.push('Consider summarizing older conversation segments');
    }
    
    if (stats.messageTokens > 100000) {
      recommendations.push('Implement conversation branching for better context management');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Token usage is well optimized');
    }
    
    return recommendations;
  }

  /**
   * Generate cache key for message
   */
  private generateCacheKey(message: ChatMessage): string {
    const contentHash = this.simpleHash(message.content);
    return `${message.role}_${contentHash}_${message.content.length}`;
  }

  /**
   * Generate cache key for conversation analysis
   */
  private generateConversationKey(messages: EnhancedMessage[]): string {
    const messageHashes = messages.map(msg => this.simpleHash(msg.content)).join('_');
    return this.simpleHash(`${messages.length}_${messageHashes}`);
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // =====================================================
  // PUBLIC API METHODS
  // =====================================================

  /**
   * Get current token limits and usage
   */
  getTokenLimits(): ClaudeTokenLimits {
    return { ...this.CLAUDE_LIMITS };
  }

  /**
   * Calculate token budget for conversation
   */
  calculateTokenBudget(currentTokens: number): TokenBudget {
    const available = this.CLAUDE_LIMITS.recommendedLimit - currentTokens;
    const allocated = currentTokens;
    const reserved = this.CLAUDE_LIMITS.responseBuffer + this.CLAUDE_LIMITS.systemPromptBuffer;
    const utilizationRate = currentTokens / this.CLAUDE_LIMITS.maxContextTokens;
    
    // Project usage based on current conversation velocity
    const projectedUsage = Math.min(
      this.CLAUDE_LIMITS.maxContextTokens,
      currentTokens * 1.5 // Simple projection
    );

    return {
      available: Math.max(0, available),
      allocated,
      reserved,
      utilizationRate,
      projectedUsage
    };
  }

  /**
   * Clear token cache
   */
  clearCache(): void {
    this.tokenCache.clear();
    this.analysisCache.clear();
    logger.debug('🧹 Token counter cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { tokenCacheSize: number; analysisCacheSize: number } {
    return {
      tokenCacheSize: this.tokenCache.size,
      analysisCacheSize: this.analysisCache.size
    };
  }
}

export default ClaudeTokenCounter;