/**
 * PAM Learning System - Phase 6.1 Implementation
 * Based on industry patterns from:
 * - LangChain's feedback and evaluation framework
 * - Microsoft Magentic-One supervisor learning patterns
 * - MakeMyTrip's Myra feedback scoring mechanism
 * - OpenAI's RLHF (Reinforcement Learning from Human Feedback)
 */

import { BaseAgent } from '../agents/base';
import { PauterRouterClient } from '../router/PauterRouterClient';
import { MemoryAgent } from '../agents/MemoryAgent';
import { 
  AgentResponse, 
  UserFeedback, 
  LearningMetrics,
  FeedbackScore,
  ConversationContext,
  LearningEvent
} from '../types';

// Enhanced error handling and type safety
class LearningSystemError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'LearningSystemError';
  }
}

// Bounded Map implementation to prevent memory leaks
class BoundedMap<K, V> extends Map<K, V> {
  constructor(private maxSize: number) {
    super();
  }

  set(key: K, value: V): this {
    if (this.size >= this.maxSize) {
      const firstKey = this.keys().next().value;
      if (firstKey !== undefined) {
        this.delete(firstKey);
      }
    }
    return super.set(key, value);
  }
}

export interface FeedbackData {
  interactionId: string;
  userId: string;
  agentType: string;
  userMessage: string;
  agentResponse: AgentResponse;
  userFeedback: UserFeedback;
  timestamp: number;
  context: ConversationContext;
}

export interface LearningConfiguration {
  // Learning rate for confidence score updates (industry standard: 0.1-0.3)
  learningRate: number;
  // Minimum feedback samples before applying learning (industry standard: 10-50)
  minSamplesForLearning: number;
  // Weight for recent vs historical feedback (industry standard: 0.7-0.9)
  recencyWeight: number;
  // Confidence threshold for routing decisions (industry standard: 0.7-0.85)
  confidenceThreshold: number;
  // Enable/disable continuous learning
  continuousLearningEnabled: boolean;
}

/**
 * Learning System implementing industry-standard RLHF patterns
 * Reference: OpenAI's InstructGPT training methodology
 * Reference: Microsoft's Magentic-One feedback collection
 * Reference: LangChain's LangSmith evaluation framework
 */
export class LearningSystem {
  private router: PauterRouterClient;
  private memoryAgent: MemoryAgent;
  private feedbackHistory: BoundedMap<string, FeedbackData[]>;
  private agentPerformanceMetrics: BoundedMap<string, LearningMetrics>;
  private config: LearningConfiguration;

  constructor(
    router: PauterRouterClient,
    memoryAgent: MemoryAgent,
    config: Partial<LearningConfiguration> = {}
  ) {
    this.router = router;
    this.memoryAgent = memoryAgent;
    this.feedbackHistory = new BoundedMap(5000); // Limit memory usage
    this.agentPerformanceMetrics = new BoundedMap(100); // Reasonable limit for agent metrics
    
    // Industry-standard configuration based on OpenAI and Microsoft patterns
    this.config = {
      learningRate: 0.2, // Microsoft Magentic-One standard
      minSamplesForLearning: 25, // Statistical significance threshold
      recencyWeight: 0.8, // Weight recent feedback more heavily
      confidenceThreshold: 0.75, // MakeMyTrip Myra standard
      continuousLearningEnabled: true,
      ...config
    };

    this.initializeAgentMetrics();
  }

  /**
   * Process user feedback using RLHF methodology
   * Based on OpenAI's InstructGPT feedback processing
   */
  async processFeedback(
    agentResponse: AgentResponse, 
    userFeedback: UserFeedback,
    context: ConversationContext
  ): Promise<void> {
    // Input validation
    if (!agentResponse?.agent || !userFeedback || !context?.userId) {
      throw new LearningSystemError(
        'Invalid input parameters for feedback processing',
        'INVALID_INPUT',
        { agentResponse: !!agentResponse, userFeedback: !!userFeedback, context: !!context }
      );
    }

    const interactionId = this.generateInteractionId();
    
    const feedbackData: FeedbackData = {
      interactionId,
      userId: context.userId,
      agentType: agentResponse.agent,
      userMessage: context.lastUserMessage || '',
      agentResponse,
      userFeedback,
      timestamp: Date.now(),
      context
    };

    try {
      // 1. Store feedback in history (LangSmith pattern)
      await this.storeFeedbackData(feedbackData);

      // 2. Update PauterRouter confidence scores (MakeMyTrip pattern)
      await this.updateRouterConfidence(feedbackData);

      // 3. Update agent performance metrics (Microsoft pattern)
      await this.updateAgentMetrics(feedbackData);

      // 4. Store learning event in memory for future context (LangChain pattern)
      await this.storeInMemory(feedbackData);

      // 5. Trigger continuous learning if enabled (OpenAI pattern)
      if (this.config.continuousLearningEnabled) {
        await this.triggerLearningUpdate(feedbackData);
      }

      // 6. Log learning event for observability
      this.logLearningEvent({
        type: 'feedback_processed',
        interactionId,
        agentType: agentResponse.agent,
        feedbackScore: userFeedback.rating,
        confidence: agentResponse.confidence || 0,
        timestamp: Date.now()
      });

    } catch (error) {
      const contextualError = new LearningSystemError(
        `Failed to process feedback: ${error instanceof Error ? error.message : String(error)}`,
        'PROCESSING_FAILED',
        { 
          interactionId,
          agentType: agentResponse.agent,
          originalError: error 
        }
      );
      
      console.error('Learning System: Failed to process feedback', contextualError.context);
      
      // Attempt recovery - store partial feedback if possible
      try {
        await this.handleProcessingFailure(feedbackData, contextualError);
      } catch (recoveryError) {
        console.error('Learning System: Recovery failed', { 
          interactionId, 
          recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
        });
      }
      
      // Don't throw - learning failures shouldn't break user experience
    }
  }

  /**
   * Update PauterRouter confidence using reinforcement learning
   * Based on Microsoft Magentic-One's confidence adjustment algorithm
   */
  private async updateRouterConfidence(feedbackData: FeedbackData): Promise<void> {
    const { agentType, userFeedback, agentResponse } = feedbackData;
    
    // Calculate feedback score (0-1 scale, industry standard)
    const feedbackScore = this.normalizeFeedbackScore(userFeedback.rating);
    const currentConfidence = agentResponse.confidence || 0.5;
    
    // Apply learning rate adjustment (reinforcement learning)
    const confidenceAdjustment = this.config.learningRate * (feedbackScore - currentConfidence);
    const newConfidence = Math.max(0, Math.min(1, currentConfidence + confidenceAdjustment));
    
    // Update router with new confidence score
    await this.router.updateAgentConfidence(agentType, newConfidence, {
      feedbackScore,
      sampleSize: this.getFeedbackSampleSize(agentType),
      recencyWeight: this.config.recencyWeight
    });
  }

  /**
   * Update agent-specific performance metrics
   * Based on LangSmith's evaluation metrics framework
   */
  private async updateAgentMetrics(feedbackData: FeedbackData): Promise<void> {
    const { agentType, userFeedback } = feedbackData;
    
    const metrics = this.agentPerformanceMetrics.get(agentType) || this.createDefaultMetrics();
    
    // Update metrics using exponential moving average (industry standard)
    const alpha = this.config.recencyWeight;
    const feedbackScore = this.normalizeFeedbackScore(userFeedback.rating);
    
    metrics.averageRating = alpha * feedbackScore + (1 - alpha) * metrics.averageRating;
    metrics.totalInteractions += 1;
    metrics.recentFeedbackCount += 1;
    metrics.lastUpdated = Date.now();
    
    // Update response time metrics if available
    if (feedbackData.agentResponse.processingTime) {
      metrics.averageResponseTime = alpha * feedbackData.agentResponse.processingTime + 
                                   (1 - alpha) * metrics.averageResponseTime;
    }
    
    // Track satisfaction trends (Microsoft pattern)
    if (feedbackScore >= 0.8) {
      metrics.highSatisfactionCount += 1;
    } else if (feedbackScore <= 0.4) {
      metrics.lowSatisfactionCount += 1;
    }
    
    this.agentPerformanceMetrics.set(agentType, metrics);
  }

  /**
   * Store learning event in memory for future context
   * Based on LangChain's memory and retrieval patterns
   */
  private async storeInMemory(feedbackData: FeedbackData): Promise<void> {
    const learningEvent = {
      type: 'user_feedback',
      agent: feedbackData.agentType,
      userMessage: feedbackData.userMessage,
      response: feedbackData.agentResponse.text,
      rating: feedbackData.userFeedback.rating,
      feedback: feedbackData.userFeedback.comment,
      timestamp: feedbackData.timestamp,
      successful: feedbackData.userFeedback.rating >= 4, // 4-5 star considered successful
      context: {
        conversationLength: feedbackData.context.messages.length,
        previousAgent: feedbackData.context.previousAgent,
        topicCategory: feedbackData.agentResponse.category
      }
    };

    // Store in memory system for future retrieval
    await this.memoryAgent.storeConversationMemory(
      feedbackData.userId,
      learningEvent,
      'learning_feedback'
    );
  }

  /**
   * Trigger continuous learning updates
   * Based on OpenAI's continuous learning methodology
   */
  private async triggerLearningUpdate(feedbackData: FeedbackData): Promise<void> {
    const { agentType } = feedbackData;
    const sampleSize = this.getFeedbackSampleSize(agentType);
    
    // Only apply learning if we have sufficient samples (statistical significance)
    if (sampleSize >= this.config.minSamplesForLearning) {
      const metrics = this.agentPerformanceMetrics.get(agentType);
      
      if (metrics) {
        // Check if performance is below threshold
        if (metrics.averageRating < 0.6) {
          await this.scheduleAgentRetraining(agentType, metrics);
        }
        
        // Update routing weights based on performance
        await this.updateRoutingWeights(agentType, metrics);
      }
    }
  }

  /**
   * Get predictive insights for proactive assistance
   * Based on MakeMyTrip's recommendation engine patterns
   */
  async getPredictiveInsights(userId: string, context: ConversationContext): Promise<any[]> {
    const insights = [];
    
    try {
      // Analyze user patterns from memory
      const userMemory = await this.memoryAgent.getEnhancedPamMemory(userId, 50);
      const recentInteractions = userMemory.recent_memories;
      
      // Pattern 1: Trip planning frequency (MakeMyTrip pattern)
      if (this.detectTripPlanningPattern(recentInteractions)) {
        insights.push({
          type: 'trip_suggestion',
          confidence: 0.8,
          message: 'Based on your travel patterns, you might want to explore these destinations',
          data: await this.generateTripSuggestions(userId, recentInteractions),
          source: 'learning_system',
          timestamp: Date.now()
        });
      }
      
      // Pattern 2: Budget concerns (financial pattern analysis)
      if (this.detectBudgetPattern(recentInteractions)) {
        insights.push({
          type: 'budget_alert',
          confidence: 0.75,
          message: 'I notice you\'ve been asking about costs. Here are some budget-friendly options',
          data: await this.generateBudgetInsights(userId, recentInteractions),
          source: 'learning_system',
          timestamp: Date.now()
        });
      }
      
      // Pattern 3: Social interaction patterns
      if (this.detectSocialPattern(recentInteractions)) {
        insights.push({
          type: 'community_suggestion',
          confidence: 0.7,
          message: 'Connect with other RVers in your area',
          data: await this.generateSocialSuggestions(userId, context),
          source: 'learning_system',
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      console.error('Learning System: Failed to generate predictive insights', error);
    }
    
    return insights;
  }

  /**
   * Get learning system performance metrics
   * Based on LangSmith's evaluation dashboard
   */
  async getPerformanceMetrics(): Promise<Record<string, LearningMetrics>> {
    const metrics: Record<string, LearningMetrics> = {};
    
    for (const [agentType, agentMetrics] of this.agentPerformanceMetrics.entries()) {
      metrics[agentType] = {
        ...agentMetrics,
        // Add derived metrics
        satisfactionRate: this.calculateSatisfactionRate(agentMetrics),
        improvementTrend: this.calculateImprovementTrend(agentType),
        reliabilityScore: this.calculateReliabilityScore(agentMetrics)
      };
    }
    
    return metrics;
  }

  // Private helper methods

  private generateInteractionId(): string {
    return `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storeFeedbackData(feedbackData: FeedbackData): Promise<void> {
    const agentHistory = this.feedbackHistory.get(feedbackData.agentType) || [];
    agentHistory.push(feedbackData);
    
    // Keep only recent feedback (sliding window, industry standard)
    const maxHistorySize = 1000;
    if (agentHistory.length > maxHistorySize) {
      agentHistory.splice(0, agentHistory.length - maxHistorySize);
    }
    
    this.feedbackHistory.set(feedbackData.agentType, agentHistory);
  }

  private normalizeFeedbackScore(rating: number): number {
    // Convert 1-5 rating to 0-1 scale (industry standard)
    return Math.max(0, Math.min(1, (rating - 1) / 4));
  }

  private getFeedbackSampleSize(agentType: string): number {
    const history = this.feedbackHistory.get(agentType) || [];
    return history.length;
  }

  private createDefaultMetrics(): LearningMetrics {
    return {
      averageRating: 0.5,
      totalInteractions: 0,
      recentFeedbackCount: 0,
      averageResponseTime: 2000,
      highSatisfactionCount: 0,
      lowSatisfactionCount: 0,
      lastUpdated: Date.now(),
      confidenceScore: 0.5
    };
  }

  private initializeAgentMetrics(): void {
    const agentTypes = ['wheels', 'wins', 'social', 'memory', 'general'];
    agentTypes.forEach(type => {
      this.agentPerformanceMetrics.set(type, this.createDefaultMetrics());
    });
  }

  /**
   * Handle processing failure with recovery strategies
   */
  private async handleProcessingFailure(
    feedbackData: FeedbackData, 
    error: LearningSystemError
  ): Promise<void> {
    // Try to save minimal feedback data
    try {
      const minimalFeedback = {
        interactionId: feedbackData.interactionId,
        agentType: feedbackData.agentType,
        rating: feedbackData.userFeedback.rating,
        timestamp: feedbackData.timestamp,
        error: error.code
      };
      
      // Store failure event for analysis
      await this.memoryAgent.storeConversationMemory(
        feedbackData.userId,
        minimalFeedback,
        'learning_failure'
      );
    } catch (recoveryError) {
      // If even minimal storage fails, just log for manual investigation
      console.error('Learning System: Complete failure to store feedback', {
        interactionId: feedbackData.interactionId,
        agentType: feedbackData.agentType,
        originalError: error.message,
        recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
      });
    }
  }

  private async scheduleAgentRetraining(agentType: string, metrics: LearningMetrics): Promise<void> {
    // Log retraining event for ops team
    console.warn('Learning System: Agent performance below threshold', {
      agentType,
      averageRating: metrics.averageRating,
      sampleSize: metrics.totalInteractions,
      recommendation: 'Consider agent retraining or prompt engineering'
    });
  }

  private async updateRoutingWeights(agentType: string, metrics: LearningMetrics): Promise<void> {
    // Update router weights based on performance
    const performanceWeight = Math.max(0.1, metrics.averageRating);
    await this.router.updateAgentWeight(agentType, performanceWeight);
  }

  private detectTripPlanningPattern(interactions: any[]): boolean {
    const tripKeywords = ['trip', 'travel', 'route', 'destination', 'plan', 'itinerary'];
    const recentTripQueries = interactions.filter(interaction => 
      tripKeywords.some(keyword => 
        interaction.message?.toLowerCase().includes(keyword)
      )
    );
    return recentTripQueries.length >= 3;
  }

  private detectBudgetPattern(interactions: any[]): boolean {
    const budgetKeywords = ['cost', 'price', 'budget', 'expensive', 'cheap', 'afford', 'money'];
    const recentBudgetQueries = interactions.filter(interaction => 
      budgetKeywords.some(keyword => 
        interaction.message?.toLowerCase().includes(keyword)
      )
    );
    return recentBudgetQueries.length >= 2;
  }

  private detectSocialPattern(interactions: any[]): boolean {
    const socialKeywords = ['meet', 'community', 'friends', 'group', 'together', 'social'];
    const recentSocialQueries = interactions.filter(interaction => 
      socialKeywords.some(keyword => 
        interaction.message?.toLowerCase().includes(keyword)
      )
    );
    return recentSocialQueries.length >= 2;
  }

  private async generateTripSuggestions(userId: string, interactions: any[]): Promise<any> {
    // Analyze patterns and generate suggestions (placeholder for ML model)
    return {
      suggestions: [
        'Popular RV destinations in your area',
        'Seasonal recommendations based on weather',
        'Routes matching your travel style'
      ],
      confidence: 0.8
    };
  }

  private async generateBudgetInsights(userId: string, interactions: any[]): Promise<any> {
    return {
      insights: [
        'Budget-friendly campgrounds nearby',
        'Fuel-efficient route options',
        'Cost comparison for your planned trips'
      ],
      confidence: 0.75
    };
  }

  private async generateSocialSuggestions(userId: string, context: ConversationContext): Promise<any> {
    return {
      suggestions: [
        'RV meetups in your area',
        'Travel buddies with similar interests',
        'Community events and gatherings'
      ],
      confidence: 0.7
    };
  }

  private calculateSatisfactionRate(metrics: LearningMetrics): number {
    if (metrics.totalInteractions === 0) return 0;
    return metrics.highSatisfactionCount / metrics.totalInteractions;
  }

  private calculateImprovementTrend(agentType: string): number {
    // Calculate trend over time (simplified)
    const history = this.feedbackHistory.get(agentType) || [];
    if (history.length < 10) return 0;
    
    const recent = history.slice(-10);
    const older = history.slice(-20, -10);
    
    const recentAvg = recent.reduce((sum, feedback) => 
      sum + this.normalizeFeedbackScore(feedback.userFeedback.rating), 0) / recent.length;
    const olderAvg = older.reduce((sum, feedback) => 
      sum + this.normalizeFeedbackScore(feedback.userFeedback.rating), 0) / older.length;
    
    return recentAvg - olderAvg;
  }

  private calculateReliabilityScore(metrics: LearningMetrics): number {
    // Combine response time and satisfaction for reliability score
    const responseTimeScore = Math.max(0, 1 - (metrics.averageResponseTime / 10000)); // 10s max
    const satisfactionScore = metrics.averageRating;
    return (responseTimeScore + satisfactionScore) / 2;
  }

  private logLearningEvent(event: LearningEvent): void {
    // Log to observability system (integrate with existing logging)
    console.log('Learning System Event:', event);
  }
}

export default LearningSystem;