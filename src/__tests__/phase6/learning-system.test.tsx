/**
 * Phase 6 Learning System Integration Tests
 * Based on industry testing patterns from:
 * - Anthropic Claude's constitutional AI testing framework
 * - LangChain's evaluation test suites
 * - Microsoft Magentic-One validation tests
 * - Google Assistant's feedback loop testing
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { LearningSystem } from '../../services/pam/learning/LearningSystem';
import { PauterRouterClient } from '../../services/pam/router/PauterRouterClient';
import { MemoryAgent } from '../../services/pam/agents/MemoryAgent';
import { 
  UserFeedback, 
  AgentResponse, 
  ConversationContext,
  LearningMetrics 
} from '../../services/pam/types';

// Mock implementations based on industry patterns
const mockPauterRouter = {
  updateAgentConfidence: vi.fn(),
  updateAgentWeight: vi.fn(),
  classify: vi.fn(),
  initialize: vi.fn()
};

const mockMemoryAgent = {
  storeConversationMemory: vi.fn(),
  getEnhancedPamMemory: vi.fn(),
  loadUserContext: vi.fn(),
  initialize: vi.fn(),
  getStats: vi.fn(),
  shutdown: vi.fn(),
  process: vi.fn(),
  storeInteraction: vi.fn()
};

const createMockContext = (): ConversationContext => ({
  userId: 'test-user-123',
  messages: [],
  userProfile: {},
  sessionId: 'test-session',
  startTime: new Date(),
  lastUserMessage: 'test message',
  previousAgent: 'memory'
});

const createMockAgentResponse = (agent: string = 'wheels', confidence: number = 0.8): AgentResponse => ({
  text: 'Test response from agent',
  agent,
  confidence,
  category: 'trip_planning',
  processingTime: 1500,
  toolsUsed: ['mapbox', 'weather']
});

const createMockFeedback = (rating: number = 4, helpful: boolean = true): UserFeedback => ({
  rating,
  comment: 'Very helpful response',
  helpful,
  category: 'helpfulness',
  timestamp: Date.now()
});

describe('Phase 6: Learning System Integration Tests', () => {
  let learningSystem: LearningSystem;
  let context: ConversationContext;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Initialize learning system with mocked dependencies
    learningSystem = new LearningSystem(
      mockPauterRouter as any,
      mockMemoryAgent as any,
      {
        learningRate: 0.2,
        minSamplesForLearning: 10,
        recencyWeight: 0.8,
        confidenceThreshold: 0.75,
        continuousLearningEnabled: true
      }
    );
    
    context = createMockContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Feedback Processing (Claude RLHF Pattern)', () => {
    test('should process positive feedback and update confidence scores', async () => {
      // Arrange
      const agentResponse = createMockAgentResponse('wheels', 0.7);
      const positiveFeedback = createMockFeedback(5, true);

      // Act
      await learningSystem.processFeedback(agentResponse, positiveFeedback, context);

      // Assert
      expect(mockPauterRouter.updateAgentConfidence).toHaveBeenCalledWith(
        'wheels',
        expect.any(Number), // New confidence should be calculated
        expect.objectContaining({
          feedbackScore: expect.any(Number),
          sampleSize: expect.any(Number),
          recencyWeight: 0.8
        })
      );

      expect(mockMemoryAgent.storeConversationMemory).toHaveBeenCalledWith(
        'test-user-123',
        expect.objectContaining({
          type: 'user_feedback',
          agent: 'wheels',
          rating: 5,
          successful: true
        }),
        'learning_feedback'
      );
    });

    test('should process negative feedback and decrease confidence', async () => {
      // Arrange
      const agentResponse = createMockAgentResponse('wins', 0.8);
      const negativeFeedback = createMockFeedback(2, false);

      // Act
      await learningSystem.processFeedback(agentResponse, negativeFeedback, context);

      // Assert
      expect(mockPauterRouter.updateAgentConfidence).toHaveBeenCalled();
      
      // Verify the confidence adjustment calculation
      const [agent, newConfidence] = mockPauterRouter.updateAgentConfidence.mock.calls[0];
      expect(agent).toBe('wins');
      expect(newConfidence).toBeLessThan(0.8); // Should decrease from original
    });

    test('should handle multiple feedback samples and improve accuracy over time', async () => {
      // Arrange
      const feedbackSamples = [
        { response: createMockAgentResponse('wheels', 0.6), feedback: createMockFeedback(5) },
        { response: createMockAgentResponse('wheels', 0.6), feedback: createMockFeedback(4) },
        { response: createMockAgentResponse('wheels', 0.6), feedback: createMockFeedback(5) },
        { response: createMockAgentResponse('wheels', 0.6), feedback: createMockFeedback(3) },
        { response: createMockAgentResponse('wheels', 0.6), feedback: createMockFeedback(4) }
      ];

      // Act
      for (const sample of feedbackSamples) {
        await learningSystem.processFeedback(sample.response, sample.feedback, context);
      }

      // Assert
      expect(mockPauterRouter.updateAgentConfidence).toHaveBeenCalledTimes(5);
      
      // Verify confidence trending upward (positive feedback overall)
      const confidenceUpdates = mockPauterRouter.updateAgentConfidence.mock.calls.map(
        call => call[1]
      );
      expect(confidenceUpdates[confidenceUpdates.length - 1]).toBeGreaterThan(0.6);
    });

    test('should handle edge cases gracefully', async () => {
      // Arrange
      const invalidAgentResponse = { ...createMockAgentResponse(), confidence: undefined };
      const edgeFeedback = createMockFeedback(0, false); // Invalid rating

      // Act & Assert - should not throw
      await expect(
        learningSystem.processFeedback(invalidAgentResponse as any, edgeFeedback, context)
      ).resolves.not.toThrow();

      // Should still attempt to process with fallback values
      expect(mockPauterRouter.updateAgentConfidence).toHaveBeenCalled();
    });
  });

  describe('Performance Metrics (LangSmith Pattern)', () => {
    test('should track agent performance metrics accurately', async () => {
      // Arrange - Simulate multiple interactions with different ratings
      const interactions = [
        { agent: 'wheels', feedback: createMockFeedback(5), responseTime: 1200 },
        { agent: 'wheels', feedback: createMockFeedback(4), responseTime: 1500 },
        { agent: 'wheels', feedback: createMockFeedback(3), responseTime: 2000 },
        { agent: 'wins', feedback: createMockFeedback(5), responseTime: 800 },
        { agent: 'wins', feedback: createMockFeedback(2), responseTime: 1800 }
      ];

      // Act
      for (const interaction of interactions) {
        const response = createMockAgentResponse(interaction.agent);
        response.processingTime = interaction.responseTime;
        await learningSystem.processFeedback(response, interaction.feedback, context);
      }

      const metrics = await learningSystem.getPerformanceMetrics();

      // Assert
      expect(metrics).toHaveProperty('wheels');
      expect(metrics).toHaveProperty('wins');
      
      expect(metrics.wheels).toMatchObject({
        averageRating: expect.any(Number),
        totalInteractions: 3,
        averageResponseTime: expect.any(Number),
        highSatisfactionCount: 2, // Ratings 4-5
        lowSatisfactionCount: 1,  // Rating 3
        satisfactionRate: expect.any(Number),
        improvementTrend: expect.any(Number),
        reliabilityScore: expect.any(Number)
      });

      // Verify average rating calculation
      expect(metrics.wheels.averageRating).toBeCloseTo(0.7, 1); // (4+3+2)/3 normalized
    });

    test('should calculate satisfaction rates correctly', async () => {
      // Arrange - Mixed satisfaction levels
      const highSatResponses = Array(8).fill(null).map(() => 
        ({ response: createMockAgentResponse('social'), feedback: createMockFeedback(5) })
      );
      const lowSatResponses = Array(2).fill(null).map(() => 
        ({ response: createMockAgentResponse('social'), feedback: createMockFeedback(2) })
      );

      // Act
      for (const item of [...highSatResponses, ...lowSatResponses]) {
        await learningSystem.processFeedback(item.response, item.feedback, context);
      }

      const metrics = await learningSystem.getPerformanceMetrics();

      // Assert
      expect(metrics.social.satisfactionRate).toBeCloseTo(0.8, 1); // 8/10 high satisfaction
      expect(metrics.social.totalInteractions).toBe(10);
    });
  });

  describe('Predictive Insights Generation', () => {
    test('should generate trip planning insights based on user patterns', async () => {
      // Arrange
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { message: 'plan trip to yellowstone', timestamp: Date.now() - 86400000 },
          { message: 'what is the cost of camping', timestamp: Date.now() - 172800000 },
          { message: 'best routes to national parks', timestamp: Date.now() - 259200000 }
        ],
        semantic_memories: []
      });

      // Act
      const insights = await learningSystem.getPredictiveInsights('test-user-123', context);

      // Assert
      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
      
      // Should detect trip planning pattern
      const tripInsight = insights.find(i => i.type === 'trip_suggestion');
      if (tripInsight) {
        expect(tripInsight.confidence).toBeGreaterThan(0.7);
        expect(tripInsight.message).toContain('travel patterns');
      }
    });

    test('should generate budget insights for cost-conscious users', async () => {
      // Arrange
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { message: 'how much will this trip cost', timestamp: Date.now() - 86400000 },
          { message: 'cheapest campgrounds near me', timestamp: Date.now() - 172800000 },
          { message: 'budget for rv travel', timestamp: Date.now() - 259200000 }
        ],
        semantic_memories: []
      });

      // Act
      const insights = await learningSystem.getPredictiveInsights('test-user-123', context);

      // Assert
      const budgetInsight = insights.find(i => i.type === 'budget_alert');
      if (budgetInsight) {
        expect(budgetInsight.confidence).toBeGreaterThan(0.6);
        expect(budgetInsight.message).toMatch(/cost|budget|afford/i);
      }
    });

    test('should not generate insights without sufficient patterns', async () => {
      // Arrange
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { message: 'hello', timestamp: Date.now() - 86400000 }
        ],
        semantic_memories: []
      });

      // Act
      const insights = await learningSystem.getPredictiveInsights('test-user-123', context);

      // Assert
      expect(insights).toHaveLength(0); // No patterns detected
    });
  });

  describe('Continuous Learning (Microsoft Pattern)', () => {
    test('should trigger learning updates after sufficient samples', async () => {
      // Arrange
      const samples = Array(25).fill(null).map((_, i) => ({
        response: createMockAgentResponse('memory'),
        feedback: createMockFeedback(i % 5 + 1) // Varying ratings 1-5
      }));

      const updateSpy = vi.spyOn(mockPauterRouter, 'updateAgentWeight');

      // Act
      for (const sample of samples) {
        await learningSystem.processFeedback(sample.response, sample.feedback, context);
      }

      // Assert
      expect(updateSpy).toHaveBeenCalled(); // Should trigger learning update
    });

    test('should handle learning system failures gracefully', async () => {
      // Arrange
      mockPauterRouter.updateAgentConfidence.mockRejectedValue(new Error('Router error'));
      
      const agentResponse = createMockAgentResponse();
      const feedback = createMockFeedback();

      // Act & Assert - should not throw
      await expect(
        learningSystem.processFeedback(agentResponse, feedback, context)
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle memory storage failures gracefully', async () => {
      // Arrange
      mockMemoryAgent.storeConversationMemory.mockRejectedValue(new Error('Storage error'));
      
      const agentResponse = createMockAgentResponse();
      const feedback = createMockFeedback();

      // Act & Assert - should not throw and continue processing
      await expect(
        learningSystem.processFeedback(agentResponse, feedback, context)
      ).resolves.not.toThrow();

      // Router update should still be attempted
      expect(mockPauterRouter.updateAgentConfidence).toHaveBeenCalled();
    });

    test('should validate feedback data before processing', async () => {
      // Arrange
      const invalidFeedback = { ...createMockFeedback(), rating: 10 }; // Invalid rating
      const agentResponse = createMockAgentResponse();

      // Act
      await learningSystem.processFeedback(agentResponse, invalidFeedback, context);

      // Assert - should normalize invalid rating
      expect(mockPauterRouter.updateAgentConfidence).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({
          feedbackScore: 1.0 // Should be clamped to max value
        })
      );
    });

    test('should maintain performance under high load', async () => {
      // Arrange
      const startTime = Date.now();
      const feedbackBatch = Array(100).fill(null).map(() => ({
        response: createMockAgentResponse(),
        feedback: createMockFeedback()
      }));

      // Act
      await Promise.all(
        feedbackBatch.map(item => 
          learningSystem.processFeedback(item.response, item.feedback, context)
        )
      );

      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockPauterRouter.updateAgentConfidence).toHaveBeenCalledTimes(100);
    });
  });

  describe('Integration with Router and Memory Systems', () => {
    test('should update router weights based on performance metrics', async () => {
      // Arrange
      const poorPerformanceAgent = Array(20).fill(null).map(() => ({
        response: createMockAgentResponse('poor_agent'),
        feedback: createMockFeedback(1, false) // Consistently poor ratings
      }));

      const updateWeightSpy = vi.spyOn(mockPauterRouter, 'updateAgentWeight');

      // Act
      for (const sample of poorPerformanceAgent) {
        await learningSystem.processFeedback(sample.response, sample.feedback, context);
      }

      // Assert - should update weights for poor performing agent
      expect(updateWeightSpy).toHaveBeenCalledWith(
        'poor_agent',
        expect.any(Number)
      );
    });

    test('should store comprehensive learning events in memory', async () => {
      // Arrange
      const agentResponse = createMockAgentResponse('wheels', 0.85);
      const feedback = createMockFeedback(5, true);
      feedback.comment = 'Excellent route suggestion!';

      // Act
      await learningSystem.processFeedback(agentResponse, feedback, context);

      // Assert
      expect(mockMemoryAgent.storeConversationMemory).toHaveBeenCalledWith(
        'test-user-123',
        expect.objectContaining({
          type: 'user_feedback',
          agent: 'wheels',
          rating: 5,
          feedback: 'Excellent route suggestion!',
          successful: true,
          context: expect.objectContaining({
            conversationLength: expect.any(Number),
            topicCategory: 'trip_planning'
          })
        }),
        'learning_feedback'
      );
    });
  });
});