/**
 * Advanced Context Summarization Service
 * 
 * Features:
 * - Intelligent summarization of conversation segments
 * - Preserves key information and context
 * - Multiple summarization strategies (extractive, abstractive, hybrid)
 * - Topic-aware summarization
 * - Importance-based content retention
 * - Iterative summarization for very long conversations
 */

import type { EnhancedMessage, ContextSummary } from './contextManager';
import type { ChatMessage } from '@/services/claude/claudeService';
import { ClaudeService } from '@/services/claude/claudeService';
import { logger } from '@/lib/logger';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface SummarizationConfig {
  strategy: 'extractive' | 'abstractive' | 'hybrid' | 'template_based';
  maxSummaryLength: number;
  preserveImportantMessages: boolean;
  importanceThreshold: number;
  includeTopics: boolean;
  includeEntities: boolean;
  includeEmotionalTone: boolean;
  compressionRatio: number; // Target ratio (e.g., 0.3 = compress to 30%)
}

export interface SummarizationResult {
  id: string;
  summary: ContextSummary;
  originalMessageCount: number;
  compressionAchieved: number;
  keyInformationRetained: number;
  processingTime: number;
  strategy: string;
  quality: SummarizationQuality;
}

export interface SummarizationQuality {
  score: number; // 0-1 scale
  coherence: number;
  completeness: number;
  accuracy: number;
  readability: number;
  recommendations: string[];
}

export interface SummarizationContext {
  conversationId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  participants: string[];
  dominantTopics: string[];
  keyEntities: string[];
  emotionalTone: 'positive' | 'negative' | 'neutral' | 'mixed';
}

export interface MessageCluster {
  id: string;
  messages: EnhancedMessage[];
  topic: string;
  importance: number;
  timeSpan: number;
  coherenceScore: number;
  shouldPreserveFully: boolean;
}

// =====================================================
// MAIN SUMMARIZATION SERVICE
// =====================================================

export class ContextSummarizer {
  private claudeService: ClaudeService;
  private config: SummarizationConfig;
  
  constructor(
    config?: Partial<SummarizationConfig>
  ) {
    this.config = {
      strategy: 'hybrid',
      maxSummaryLength: 1000,
      preserveImportantMessages: true,
      importanceThreshold: 0.8,
      includeTopics: true,
      includeEntities: true,
      includeEmotionalTone: true,
      compressionRatio: 0.3,
      ...config
    };
    
    this.claudeService = new ClaudeService();
  }

  // =====================================================
  // MAIN SUMMARIZATION METHODS
  // =====================================================

  /**
   * Summarize a collection of messages with intelligent context preservation
   */
  async summarizeMessages(
    messages: EnhancedMessage[],
    context?: Partial<SummarizationContext>
  ): Promise<SummarizationResult> {
    const startTime = Date.now();
    
    logger.info('📝 Starting message summarization', {
      messageCount: messages.length,
      strategy: this.config.strategy,
      targetCompression: this.config.compressionRatio
    });

    try {
      // Step 1: Analyze conversation context
      const conversationContext = await this.analyzeConversationContext(messages, context);
      
      // Step 2: Cluster messages by topic and importance
      const clusters = await this.clusterMessages(messages);
      
      // Step 3: Apply summarization strategy
      let summary: ContextSummary;
      
      switch (this.config.strategy) {
        case 'extractive':
          summary = await this.extractiveSummarization(clusters, conversationContext);
          break;
        case 'abstractive':
          summary = await this.abstractiveSummarization(clusters, conversationContext);
          break;
        case 'hybrid':
          summary = await this.hybridSummarization(clusters, conversationContext);
          break;
        case 'template_based':
          summary = await this.templateBasedSummarization(clusters, conversationContext);
          break;
        default:
          throw new Error(`Unsupported summarization strategy: ${this.config.strategy}`);
      }
      
      // Step 4: Quality assessment
      const quality = await this.assessSummaryQuality(summary, messages, conversationContext);
      
      // Step 5: Calculate metrics
      const originalTokens = messages.reduce((sum, msg) => sum + msg.tokenCount, 0);
      const summaryTokens = summary.tokenCount;
      const compressionAchieved = 1 - (summaryTokens / originalTokens);
      
      const result: SummarizationResult = {
        id: `summarization_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        summary,
        originalMessageCount: messages.length,
        compressionAchieved,
        keyInformationRetained: quality.completeness,
        processingTime: Date.now() - startTime,
        strategy: this.config.strategy,
        quality
      };

      logger.info('✅ Message summarization complete', {
        compressionRatio: Math.round(compressionAchieved * 100),
        qualityScore: Math.round(quality.score * 100),
        processingTime: result.processingTime
      });

      return result;
      
    } catch (error) {
      logger.error('❌ Summarization failed', error);
      throw new Error(`Summarization failed: ${error.message}`);
    }
  }

  /**
   * Create iterative summaries for very long conversations
   */
  async createIterativeSummary(
    messages: EnhancedMessage[],
    segmentSize: number = 20
  ): Promise<SummarizationResult> {
    logger.info('🔄 Creating iterative summary', {
      totalMessages: messages.length,
      segmentSize
    });

    const segments = this.segmentMessages(messages, segmentSize);
    const segmentSummaries: ContextSummary[] = [];

    // Summarize each segment
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      logger.debug(`📝 Summarizing segment ${i + 1}/${segments.length}`, {
        segmentSize: segment.length
      });

      const result = await this.summarizeMessages(segment);
      segmentSummaries.push(result.summary);
    }

    // Create final summary from segment summaries
    const consolidatedMessages: EnhancedMessage[] = segmentSummaries.map(summary => ({
      id: summary.id,
      role: 'system',
      content: summary.summaryText,
      tokenCount: summary.tokenCount,
      importance: 0.9, // High importance for summaries
      messageType: 'system',
      topics: summary.keyTopics,
      entities: summary.importantEntities,
      contextRelevance: 0.8,
      timestamp: summary.createdAt,
      createdAt: summary.createdAt,
      metadata: {
        userIntent: 'summary_consolidation'
      }
    }));

    return await this.summarizeMessages(consolidatedMessages);
  }

  // =====================================================
  // SUMMARIZATION STRATEGIES
  // =====================================================

  /**
   * Extractive summarization - select most important existing content
   */
  private async extractiveSummarization(
    clusters: MessageCluster[],
    context: SummarizationContext
  ): Promise<ContextSummary> {
    logger.debug('🔍 Applying extractive summarization');

    // Sort clusters by importance and select top content
    const sortedClusters = clusters.sort((a, b) => b.importance - a.importance);
    const selectedContent: string[] = [];
    let totalLength = 0;

    for (const cluster of sortedClusters) {
      if (cluster.shouldPreserveFully) {
        // Include key messages fully
        for (const message of cluster.messages) {
          if (message.importance >= this.config.importanceThreshold) {
            const content = `${message.role}: ${message.content}`;
            if (totalLength + content.length <= this.config.maxSummaryLength) {
              selectedContent.push(content);
              totalLength += content.length;
            }
          }
        }
      } else {
        // Extract key sentences from cluster
        const keyContent = this.extractKeySentences(cluster.messages);
        if (totalLength + keyContent.length <= this.config.maxSummaryLength) {
          selectedContent.push(`Topic ${cluster.topic}: ${keyContent}`);
          totalLength += keyContent.length;
        }
      }
    }

    const summaryText = this.formatExtractedContent(selectedContent, context);
    return this.createSummaryObject(summaryText, clusters, context, 'extractive');
  }

  /**
   * Abstractive summarization using Claude for natural language generation
   */
  private async abstractiveSummarization(
    clusters: MessageCluster[],
    context: SummarizationContext
  ): Promise<ContextSummary> {
    logger.debug('🤖 Applying abstractive summarization');

    // Prepare content for Claude
    const clusterDescriptions = clusters.map(cluster => ({
      topic: cluster.topic,
      importance: cluster.importance,
      messageCount: cluster.messages.length,
      keyPoints: this.extractKeyPoints(cluster.messages),
      timeSpan: this.formatTimeSpan(cluster.timeSpan)
    }));

    const claudePrompt = this.buildAbstractiveSummaryPrompt(
      clusterDescriptions,
      context,
      this.config.maxSummaryLength
    );

    try {
      const response = await this.claudeService.chat([
        {
          role: 'system',
          content: `You are an expert conversation summarizer. Create a concise, accurate summary that preserves key information while being highly readable.`
        },
        {
          role: 'user',
          content: claudePrompt
        }
      ], {
        maxTokens: Math.ceil(this.config.maxSummaryLength / 3), // Rough token conversion
        temperature: 0.1 // Low temperature for consistency
      });

      const summaryText = response.content;
      return this.createSummaryObject(summaryText, clusters, context, 'abstractive');

    } catch (error) {
      logger.error('❌ Abstractive summarization failed, falling back to extractive', error);
      return await this.extractiveSummarization(clusters, context);
    }
  }

  /**
   * Hybrid summarization combining extractive and abstractive approaches
   */
  private async hybridSummarization(
    clusters: MessageCluster[],
    context: SummarizationContext
  ): Promise<ContextSummary> {
    logger.debug('🔀 Applying hybrid summarization');

    // Use extractive for high-importance, specific content
    const importantClusters = clusters.filter(c => c.importance > this.config.importanceThreshold);
    const regularClusters = clusters.filter(c => c.importance <= this.config.importanceThreshold);

    // Extract important content directly
    const extractedSections: string[] = [];
    for (const cluster of importantClusters.slice(0, 3)) { // Limit to top 3
      const keyMessages = cluster.messages
        .filter(msg => msg.importance >= this.config.importanceThreshold)
        .slice(0, 2); // Max 2 messages per cluster
      
      for (const msg of keyMessages) {
        extractedSections.push(`${msg.role}: ${msg.content.substring(0, 200)}...`);
      }
    }

    // Use abstractive for regular content
    let abstractiveSection = '';
    if (regularClusters.length > 0) {
      try {
        const abstractiveResult = await this.abstractiveSummarization(regularClusters, context);
        abstractiveSection = abstractiveResult.summaryText;
      } catch (error) {
        logger.warn('Abstractive portion failed, using extractive fallback');
        const extractiveResult = await this.extractiveSummarization(regularClusters, context);
        abstractiveSection = extractiveResult.summaryText;
      }
    }

    // Combine sections
    const summaryParts: string[] = [];
    
    if (abstractiveSection) {
      summaryParts.push(`Overview: ${abstractiveSection}`);
    }
    
    if (extractedSections.length > 0) {
      summaryParts.push(`Key interactions: ${extractedSections.join(' ')}`);
    }

    const summaryText = summaryParts.join('\n\n');
    return this.createSummaryObject(summaryText, clusters, context, 'hybrid');
  }

  /**
   * Template-based summarization using predefined structures
   */
  private async templateBasedSummarization(
    clusters: MessageCluster[],
    context: SummarizationContext
  ): Promise<ContextSummary> {
    logger.debug('📋 Applying template-based summarization');

    const template = this.selectTemplate(context.dominantTopics);
    const templateData = this.extractTemplateData(clusters, context);
    const summaryText = this.fillTemplate(template, templateData);

    return this.createSummaryObject(summaryText, clusters, context, 'template_based');
  }

  // =====================================================
  // MESSAGE ANALYSIS AND CLUSTERING
  // =====================================================

  /**
   * Analyze conversation context for better summarization
   */
  private async analyzeConversationContext(
    messages: EnhancedMessage[],
    context?: Partial<SummarizationContext>
  ): Promise<SummarizationContext> {
    const timeRange = {
      start: messages.length > 0 ? messages[0].createdAt : new Date(),
      end: messages.length > 0 ? messages[messages.length - 1].createdAt : new Date()
    };

    const participants = [...new Set(messages.map(msg => msg.role))];
    
    // Extract dominant topics
    const topicFrequency = new Map<string, number>();
    messages.forEach(msg => {
      msg.topics.forEach(topic => {
        topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
      });
    });
    
    const dominantTopics = Array.from(topicFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    // Extract key entities
    const entityFrequency = new Map<string, number>();
    messages.forEach(msg => {
      msg.entities.forEach(entity => {
        entityFrequency.set(entity, (entityFrequency.get(entity) || 0) + 1);
      });
    });
    
    const keyEntities = Array.from(entityFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([entity]) => entity);

    // Analyze emotional tone
    const sentiments = messages
      .filter(msg => msg.sentiment)
      .map(msg => msg.sentiment!);
    
    let emotionalTone: SummarizationContext['emotionalTone'] = 'neutral';
    if (sentiments.length > 0) {
      const positiveCount = sentiments.filter(s => s === 'positive').length;
      const negativeCount = sentiments.filter(s => s === 'negative').length;
      const neutralCount = sentiments.filter(s => s === 'neutral').length;
      
      if (positiveCount > negativeCount && positiveCount > neutralCount) {
        emotionalTone = 'positive';
      } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
        emotionalTone = 'negative';
      } else if (positiveCount > 0 && negativeCount > 0) {
        emotionalTone = 'mixed';
      }
    }

    return {
      conversationId: context?.conversationId || 'unknown',
      timeRange,
      participants,
      dominantTopics,
      keyEntities,
      emotionalTone,
      ...context
    };
  }

  /**
   * Cluster messages by topic and temporal proximity
   */
  private async clusterMessages(messages: EnhancedMessage[]): Promise<MessageCluster[]> {
    if (messages.length === 0) return [];

    const clusters: MessageCluster[] = [];
    let currentCluster: EnhancedMessage[] = [messages[0]];
    let currentTopic = messages[0].topics[0] || 'general';

    for (let i = 1; i < messages.length; i++) {
      const message = messages[i];
      const prevMessage = messages[i - 1];
      
      // Check topic similarity
      const topicSimilarity = this.calculateTopicSimilarity(
        message.topics,
        currentCluster.map(m => m.topics).flat()
      );
      
      // Check temporal proximity (within 30 minutes)
      const timeDiff = message.createdAt.getTime() - prevMessage.createdAt.getTime();
      const isTemporallyClose = timeDiff < 30 * 60 * 1000;
      
      if (topicSimilarity > 0.3 && isTemporallyClose) {
        // Add to current cluster
        currentCluster.push(message);
      } else {
        // Start new cluster
        if (currentCluster.length > 0) {
          clusters.push(await this.createCluster(currentCluster, currentTopic));
        }
        currentCluster = [message];
        currentTopic = message.topics[0] || 'general';
      }
    }

    // Add final cluster
    if (currentCluster.length > 0) {
      clusters.push(await this.createCluster(currentCluster, currentTopic));
    }

    return clusters;
  }

  /**
   * Create a message cluster with analysis
   */
  private async createCluster(messages: EnhancedMessage[], topic: string): Promise<MessageCluster> {
    const importance = messages.reduce((sum, msg) => sum + msg.importance, 0) / messages.length;
    const timeSpan = messages.length > 1 
      ? messages[messages.length - 1].createdAt.getTime() - messages[0].createdAt.getTime()
      : 0;
    
    const coherenceScore = this.calculateClusterCoherence(messages);
    const shouldPreserveFully = importance > this.config.importanceThreshold || 
                               messages.some(msg => msg.importance > 0.9);

    return {
      id: `cluster_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      messages,
      topic,
      importance,
      timeSpan,
      coherenceScore,
      shouldPreserveFully
    };
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Calculate topic similarity between message topics and cluster topics
   */
  private calculateTopicSimilarity(messageTopics: string[], clusterTopics: string[]): number {
    if (messageTopics.length === 0 || clusterTopics.length === 0) return 0;

    const intersection = new Set(messageTopics.filter(t => clusterTopics.includes(t)));
    const union = new Set([...messageTopics, ...clusterTopics]);

    return intersection.size / union.size;
  }

  /**
   * Calculate coherence score for a cluster of messages
   */
  private calculateClusterCoherence(messages: EnhancedMessage[]): number {
    if (messages.length < 2) return 1.0;

    let coherenceSum = 0;
    let comparisons = 0;

    for (let i = 0; i < messages.length - 1; i++) {
      for (let j = i + 1; j < messages.length; j++) {
        const similarity = this.calculateTopicSimilarity(
          messages[i].topics,
          messages[j].topics
        );
        coherenceSum += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? coherenceSum / comparisons : 0;
  }

  /**
   * Extract key sentences from messages
   */
  private extractKeySentences(messages: EnhancedMessage[]): string {
    const sentences: string[] = [];

    for (const message of messages) {
      const messageSentences = message.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
      
      // Score sentences based on keywords and position
      const scoredSentences = messageSentences.map((sentence, index) => ({
        text: sentence.trim(),
        score: this.scoreSentence(sentence, message.topics, index === 0)
      }));

      // Take top sentence from each message
      const topSentence = scoredSentences.reduce((best, current) => 
        current.score > best.score ? current : best
      );

      if (topSentence.score > 0.3) {
        sentences.push(topSentence.text);
      }
    }

    return sentences.join('. ') + '.';
  }

  /**
   * Score a sentence for extraction
   */
  private scoreSentence(sentence: string, topics: string[], isFirst: boolean): number {
    let score = 0;

    // Boost for topic keywords
    const lowerSentence = sentence.toLowerCase();
    topics.forEach(topic => {
      if (lowerSentence.includes(topic.toLowerCase())) {
        score += 0.3;
      }
    });

    // Boost for first sentences
    if (isFirst) score += 0.2;

    // Boost for question sentences
    if (sentence.includes('?')) score += 0.1;

    // Penalize very short or very long sentences
    if (sentence.length < 20) score -= 0.2;
    if (sentence.length > 200) score -= 0.1;

    return score;
  }

  /**
   * Format extracted content into readable summary
   */
  private formatExtractedContent(content: string[], context: SummarizationContext): string {
    const sections: string[] = [];

    if (this.config.includeTopics && context.dominantTopics.length > 0) {
      sections.push(`Key topics discussed: ${context.dominantTopics.join(', ')}.`);
    }

    if (content.length > 0) {
      sections.push(...content);
    }

    if (this.config.includeEntities && context.keyEntities.length > 0) {
      sections.push(`Important entities mentioned: ${context.keyEntities.slice(0, 5).join(', ')}.`);
    }

    return sections.join(' ');
  }

  /**
   * Build prompt for abstractive summarization
   */
  private buildAbstractiveSummaryPrompt(
    clusters: any[],
    context: SummarizationContext,
    maxLength: number
  ): string {
    return `
Please create a comprehensive summary of the following conversation segments:

Conversation Context:
- Time Range: ${context.timeRange.start.toLocaleDateString()} to ${context.timeRange.end.toLocaleDateString()}
- Dominant Topics: ${context.dominantTopics.join(', ')}
- Key Entities: ${context.keyEntities.slice(0, 5).join(', ')}
- Emotional Tone: ${context.emotionalTone}

Conversation Segments:
${clusters.map((cluster, i) => `
${i + 1}. Topic: ${cluster.topic} (Importance: ${Math.round(cluster.importance * 100)}%)
   Duration: ${cluster.timeSpan}
   Messages: ${cluster.messageCount}
   Key Points: ${cluster.keyPoints}
`).join('\n')}

Requirements:
- Maximum length: ${maxLength} characters
- Preserve key information and decisions
- Maintain chronological flow where important
- Include specific details for high-importance topics
- Use clear, concise language

Summary:`;
  }

  /**
   * Extract key points from messages
   */
  private extractKeyPoints(messages: EnhancedMessage[]): string {
    const points = messages
      .filter(msg => msg.importance > 0.6)
      .map(msg => msg.content.substring(0, 100))
      .slice(0, 3);
    
    return points.join('; ');
  }

  /**
   * Format time span for human reading
   */
  private formatTimeSpan(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Create summary object with metadata
   */
  private createSummaryObject(
    summaryText: string,
    clusters: MessageCluster[],
    context: SummarizationContext,
    strategy: string
  ): ContextSummary {
    const allMessages = clusters.flatMap(c => c.messages);
    const tokenCount = Math.ceil(summaryText.length / 4); // Rough estimate

    return {
      id: `summary_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      windowId: context.conversationId,
      summarizedMessages: allMessages.map(msg => msg.id),
      summaryText,
      keyTopics: context.dominantTopics,
      importantEntities: context.keyEntities,
      tokenCount,
      createdAt: new Date(),
      confidence: this.calculateSummaryConfidence(summaryText, allMessages.length, strategy)
    };
  }

  /**
   * Calculate confidence in summary quality
   */
  private calculateSummaryConfidence(summaryText: string, originalMessageCount: number, strategy: string): number {
    let confidence = 0.7; // Base confidence

    // Strategy adjustments
    switch (strategy) {
      case 'abstractive':
        confidence += 0.1; // AI-generated summaries are generally more coherent
        break;
      case 'hybrid':
        confidence += 0.15; // Best of both worlds
        break;
      case 'extractive':
        confidence += 0.05; // Preserves original content
        break;
    }

    // Length appropriateness
    const expectedLength = originalMessageCount * 50; // Rough estimate
    const lengthRatio = summaryText.length / expectedLength;
    if (lengthRatio > 0.1 && lengthRatio < 0.5) {
      confidence += 0.1; // Good compression ratio
    }

    return Math.min(0.95, confidence);
  }

  /**
   * Assess summary quality
   */
  private async assessSummaryQuality(
    summary: ContextSummary,
    originalMessages: EnhancedMessage[],
    context: SummarizationContext
  ): Promise<SummarizationQuality> {
    // Simple quality assessment (could be enhanced with more sophisticated metrics)
    
    const coherence = this.assessCoherence(summary.summaryText);
    const completeness = this.assessCompleteness(summary, originalMessages);
    const accuracy = summary.confidence; // Use existing confidence as accuracy proxy
    const readability = this.assessReadability(summary.summaryText);

    const score = (coherence + completeness + accuracy + readability) / 4;

    const recommendations: string[] = [];
    if (coherence < 0.7) recommendations.push('Improve logical flow and connections');
    if (completeness < 0.6) recommendations.push('Include more key information');
    if (readability < 0.7) recommendations.push('Simplify language and structure');

    return {
      score,
      coherence,
      completeness,
      accuracy,
      readability,
      recommendations
    };
  }

  private assessCoherence(text: string): number {
    // Simple coherence check based on sentence transitions
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2) return 1.0;

    let transitionScore = 0;
    const transitionWords = ['however', 'therefore', 'additionally', 'furthermore', 'meanwhile'];
    
    sentences.forEach(sentence => {
      const hasTransition = transitionWords.some(word => 
        sentence.toLowerCase().includes(word)
      );
      if (hasTransition) transitionScore++;
    });

    return Math.min(1.0, 0.7 + (transitionScore / sentences.length) * 0.3);
  }

  private assessCompleteness(summary: ContextSummary, originalMessages: EnhancedMessage[]): number {
    // Check if key topics and entities are represented
    const originalTopics = new Set(originalMessages.flatMap(msg => msg.topics));
    const originalEntities = new Set(originalMessages.flatMap(msg => msg.entities));
    
    const topicCoverage = summary.keyTopics.length / Math.max(originalTopics.size, 1);
    const entityCoverage = summary.importantEntities.length / Math.max(originalEntities.size, 1);
    
    return (topicCoverage + entityCoverage) / 2;
  }

  private assessReadability(text: string): number {
    // Simple readability assessment
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const avgCharsPerWord = text.replace(/\s+/g, '').length / Math.max(words.length, 1);
    
    // Optimal ranges: 15-20 words/sentence, 4-6 chars/word
    let score = 0.8;
    
    if (avgWordsPerSentence > 25 || avgWordsPerSentence < 10) score -= 0.1;
    if (avgCharsPerWord > 7 || avgCharsPerWord < 3) score -= 0.1;
    
    return Math.max(0.5, score);
  }

  /**
   * Segment messages for iterative processing
   */
  private segmentMessages(messages: EnhancedMessage[], segmentSize: number): EnhancedMessage[][] {
    const segments: EnhancedMessage[][] = [];
    
    for (let i = 0; i < messages.length; i += segmentSize) {
      const segment = messages.slice(i, i + segmentSize);
      segments.push(segment);
    }
    
    return segments;
  }

  /**
   * Select appropriate template based on topics
   */
  private selectTemplate(topics: string[]): string {
    if (topics.includes('travel') || topics.includes('planning')) {
      return 'TRAVEL_PLANNING_TEMPLATE';
    }
    if (topics.includes('finance') || topics.includes('expense')) {
      return 'FINANCIAL_TEMPLATE';
    }
    return 'GENERAL_TEMPLATE';
  }

  /**
   * Extract data for template filling
   */
  private extractTemplateData(clusters: MessageCluster[], context: SummarizationContext): any {
    return {
      timeRange: `${context.timeRange.start.toLocaleDateString()} - ${context.timeRange.end.toLocaleDateString()}`,
      topics: context.dominantTopics,
      entities: context.keyEntities,
      keyInteractions: clusters
        .filter(c => c.importance > 0.7)
        .map(c => this.extractKeyPoints(c.messages))
    };
  }

  /**
   * Fill template with extracted data
   */
  private fillTemplate(template: string, data: any): string {
    // Simple template implementation
    switch (template) {
      case 'TRAVEL_PLANNING_TEMPLATE':
        return `Travel Planning Summary (${data.timeRange}): Discussed ${data.topics.join(', ')}. Key locations: ${data.entities.slice(0, 3).join(', ')}. Main interactions: ${data.keyInteractions.join('; ')}.`;
      
      case 'FINANCIAL_TEMPLATE':
        return `Financial Discussion Summary (${data.timeRange}): Covered topics: ${data.topics.join(', ')}. Key financial entities: ${data.entities.slice(0, 3).join(', ')}. Important decisions: ${data.keyInteractions.join('; ')}.`;
      
      default:
        return `Conversation Summary (${data.timeRange}): Main topics: ${data.topics.join(', ')}. Key points: ${data.keyInteractions.join('; ')}.`;
    }
  }

  // =====================================================
  // PUBLIC API METHODS
  // =====================================================

  /**
   * Update summarization configuration
   */
  updateConfig(newConfig: Partial<SummarizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.debug('📝 Summarization config updated', newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): SummarizationConfig {
    return { ...this.config };
  }
}

export default ContextSummarizer;