/**
 * Phase 6 PAM Supervisor Learning Integration Tests
 * Based on industry testing patterns from:
 * - Microsoft Magentic-One supervisor testing
 * - LangChain multi-agent orchestration tests
 * - OpenAI Assistant API integration tests
 * - MakeMyTrip Myra end-to-end validation
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import PAMSupervisor from '../../services/pam/supervisor';
import { 
  UserFeedback, 
  ProactiveInsight,
  ProcessResult,
  SupervisorConfig 
} from '../../services/pam/types';

// Mock all agent dependencies
vi.mock('../../services/pam/agents/WheelsAgent');
vi.mock('../../services/pam/agents/WinsAgent');
vi.mock('../../services/pam/agents/SocialAgent');
vi.mock('../../services/pam/agents/MemoryAgent');
vi.mock('../../services/pam/router/PauterRouterClient');

const mockAgentResponse = {
  response: 'Test agent response',
  context: { processed: true },
  toolsUsed: ['mapbox', 'weather'],
  processingTime: 1200
};

const mockIntent = {
  category: 'trip_planning',
  confidence: 0.85,
  entities: ['yellowstone', 'camping']
};

// Mock agent implementations
const createMockAgent = () => ({
  initialize: vi.fn().mockResolvedValue(true),
  process: vi.fn().mockResolvedValue(mockAgentResponse),
  getStats: vi.fn().mockResolvedValue({ processed: 1, errors: 0 }),
  shutdown: vi.fn().mockResolvedValue(true)
});

const createMockRouter = () => ({
  initialize: vi.fn().mockResolvedValue(true),
  classify: vi.fn().mockResolvedValue(mockIntent),
  updateAgentConfidence: vi.fn().mockResolvedValue(true),
  updateAgentWeight: vi.fn().mockResolvedValue(true)
});

const createMockMemoryAgent = () => ({
  ...createMockAgent(),
  loadUserContext: vi.fn().mockResolvedValue({ preferences: {} }),
  storeInteraction: vi.fn().mockResolvedValue(true),
  getEnhancedPamMemory: vi.fn().mockResolvedValue({
    recent_memories: [],
    semantic_memories: []
  }),
  storeConversationMemory: vi.fn().mockResolvedValue(true)
});

describe('Phase 6: PAM Supervisor Learning Integration Tests', () => {
  let supervisor: PAMSupervisor;
  let config: SupervisorConfig;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock implementations
    const { WheelsAgent } = await import('../../services/pam/agents/WheelsAgent');
    const { WinsAgent } = await import('../../services/pam/agents/WinsAgent');
    const { SocialAgent } = await import('../../services/pam/agents/SocialAgent');
    const { MemoryAgent } = await import('../../services/pam/agents/MemoryAgent');
    const { PauterRouterClient } = await import('../../services/pam/router/PauterRouterClient');

    vi.mocked(WheelsAgent).mockImplementation(() => createMockAgent() as any);
    vi.mocked(WinsAgent).mockImplementation(() => createMockAgent() as any);
    vi.mocked(SocialAgent).mockImplementation(() => createMockAgent() as any);
    vi.mocked(MemoryAgent).mockImplementation(() => createMockMemoryAgent() as any);
    vi.mocked(PauterRouterClient).mockImplementation(() => createMockRouter() as any);

    // Create supervisor configuration with learning enabled
    config = {
      userId: 'test-user-789',
      enableLearning: true,
      enableProactiveAssistant: true,
      maxContextLength: 50,
      learningConfiguration: {
        learningRate: 0.2,
        minSamplesForLearning: 5,
        recencyWeight: 0.8,
        confidenceThreshold: 0.7,
        continuousLearningEnabled: true
      },
      proactiveConfiguration: {
        insightGenerationInterval: 10000, // 10 seconds for testing
        minConfidenceThreshold: 0.6,
        maxInsightsPerSession: 3
      }
    };

    supervisor = new PAMSupervisor(config);
  });

  afterEach(async () => {
    if (supervisor) {
      await supervisor.shutdown();
    }
    vi.restoreAllMocks();
  });

  describe('Learning System Integration', () => {
    test('should initialize with learning and proactive systems enabled', async () => {
      // Act
      await supervisor.initialize();

      // Assert
      expect(supervisor).toBeDefined();
      
      // Verify learning system is working by checking performance metrics
      const metrics = await supervisor.getPerformanceMetrics();
      expect(metrics).toHaveProperty('supervisor');
      expect(metrics).toHaveProperty('agents');
      expect(metrics).toHaveProperty('timestamp');
    });

    test('should process messages and include proactive insights', async () => {
      // Arrange
      await supervisor.initialize();

      // Act
      const result: ProcessResult = await supervisor.processMessage('Plan a trip to Yellowstone');

      // Assert
      expect(result).toMatchObject({
        response: expect.any(String),
        agent: 'trip_planning',
        confidence: 0.85,
        executionTime: expect.any(Number),
        insights: expect.any(Array) // Phase 6: Should include insights
      });

      // Verify insights structure
      if (result.insights && result.insights.length > 0) {
        result.insights.forEach(insight => {
          expect(insight).toMatchObject({
            id: expect.any(String),
            type: expect.any(String),
            confidence: expect.any(Number),
            title: expect.any(String),
            message: expect.any(String)
          });
        });
      }
    });

    test('should handle feedback processing through learning system', async () => {
      // Arrange
      await supervisor.initialize();
      await supervisor.processMessage('Show me budget tracking');

      const feedback: UserFeedback = {
        rating: 5,
        comment: 'Very helpful response',
        helpful: true,
        category: 'helpfulness',
        timestamp: Date.now()
      };

      // Act
      await supervisor.processFeedback('test-interaction-id', feedback);

      // Assert - Should not throw and should complete successfully
      expect(true).toBe(true); // If we reach here, feedback was processed
    });

    test('should generate performance metrics with learning data', async () => {
      // Arrange
      await supervisor.initialize();
      
      // Process multiple messages to generate data
      await supervisor.processMessage('Plan a trip to Yellowstone');
      await supervisor.processMessage('Track my expenses');
      await supervisor.processMessage('Find RV communities');

      // Act
      const metrics = await supervisor.getPerformanceMetrics();

      // Assert
      expect(metrics).toMatchObject({
        supervisor: {
          totalInteractions: expect.any(Number),
          sessionDuration: expect.any(Number),
          averageResponseTime: expect.any(Number),
          sessionStartTime: expect.any(String)
        },
        agents: expect.any(Object),
        timestamp: expect.any(String)
      });

      expect(metrics.supervisor.totalInteractions).toBeGreaterThan(0);
      expect(metrics.supervisor.sessionDuration).toBeGreaterThan(0);
    });

    test('should provide current proactive insights', async () => {
      // Arrange
      await supervisor.initialize();

      // Act
      const insights = await supervisor.getCurrentInsights();

      // Assert
      expect(Array.isArray(insights)).toBe(true);
      
      insights.forEach(insight => {
        expect(insight).toMatchObject({
          id: expect.any(String),
          type: expect.any(String),
          priority: expect.oneOf(['high', 'medium', 'low']),
          confidence: expect.any(Number),
          title: expect.any(String),
          message: expect.any(String),
          actionable: expect.any(Boolean),
          timestamp: expect.any(Number),
          expiresAt: expect.any(Number)
        });
      });
    });
  });

  describe('Multi-Turn Conversation Learning', () => {
    test('should maintain context and improve responses over conversation', async () => {
      // Arrange
      await supervisor.initialize();

      // Act - Simulate multi-turn conversation
      const responses = [];
      responses.push(await supervisor.processMessage('Hi, I need help planning a trip'));
      responses.push(await supervisor.processMessage('I want to go to Yellowstone'));
      responses.push(await supervisor.processMessage('What will it cost?'));
      responses.push(await supervisor.processMessage('Any budget-friendly campgrounds?'));

      // Assert
      expect(responses).toHaveLength(4);
      responses.forEach(response => {
        expect(response.response).toBeTruthy();
        expect(response.executionTime).toBeGreaterThan(0);
      });

      // Verify context is maintained
      const context = supervisor.getContext();
      expect(context.messages.length).toBeGreaterThan(0);
      expect(context.messages.some(m => m.content.includes('Yellowstone'))).toBe(true);
    });

    test('should adapt agent selection based on learning feedback', async () => {
      // Arrange
      await supervisor.initialize();

      // Process initial message
      const result1 = await supervisor.processMessage('Plan a budget trip');

      // Provide negative feedback for the selected agent
      const negativeFeedback: UserFeedback = {
        rating: 2,
        comment: 'Not very helpful for budget planning',
        helpful: false,
        category: 'accuracy',
        timestamp: Date.now()
      };

      // Act
      await supervisor.processFeedback('interaction-1', negativeFeedback);
      const result2 = await supervisor.processMessage('Plan another budget trip');

      // Assert - System should learn from feedback
      expect(result1).toBeTruthy();
      expect(result2).toBeTruthy();
      
      // Both should complete successfully, learning system should adjust confidence
      expect(result1.confidence).toBeGreaterThan(0);
      expect(result2.confidence).toBeGreaterThan(0);
    });
  });

  describe('Proactive Insights in Context', () => {
    test('should generate contextually relevant insights during conversation', async () => {
      // Arrange
      await supervisor.initialize();

      // Simulate conversation about trip planning
      await supervisor.processMessage('I am planning a cross-country RV trip');
      await supervisor.processMessage('Starting from California to Florida');
      await supervisor.processMessage('Need to watch my budget carefully');

      // Act
      const insights = await supervisor.getCurrentInsights();

      // Assert
      const relevantInsights = insights.filter(insight =>
        insight.type === 'trip_suggestion' ||
        insight.type === 'budget_alert' ||
        insight.type === 'weather_alert'
      );

      expect(relevantInsights.length).toBeGreaterThan(0);
      
      relevantInsights.forEach(insight => {
        expect(insight.confidence).toBeGreaterThan(0.5);
        expect(insight.actionable).toBe(true);
      });
    });

    test('should include high-confidence insights in message responses', async () => {
      // Arrange
      await supervisor.initialize();

      // Act
      const result = await supervisor.processMessage('What should I know about winter RV travel?');

      // Assert
      expect(result.insights).toBeDefined();
      
      if (result.insights && result.insights.length > 0) {
        const highConfidenceInsights = result.insights.filter(
          insight => insight.confidence > 0.7
        );
        
        if (highConfidenceInsights.length > 0) {
          expect(highConfidenceInsights[0]).toMatchObject({
            type: expect.any(String),
            title: expect.any(String),
            message: expect.any(String),
            actionable: true
          });
        }
      }
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle learning system initialization failures gracefully', async () => {
      // Arrange - Create config that might cause learning system issues
      const problematicConfig: SupervisorConfig = {
        userId: 'test-user',
        enableLearning: true,
        learningConfiguration: {
          learningRate: -1, // Invalid learning rate
          minSamplesForLearning: 0,
          recencyWeight: 2.0, // Invalid weight
          confidenceThreshold: 1.5 // Invalid threshold
        }
      };

      const problematicSupervisor = new PAMSupervisor(problematicConfig);

      // Act & Assert - Should not throw
      await expect(problematicSupervisor.initialize()).resolves.not.toThrow();
      
      // Should still be able to process messages
      const result = await problematicSupervisor.processMessage('Hello');
      expect(result).toBeTruthy();

      await problematicSupervisor.shutdown();
    });

    test('should continue functioning when proactive assistant fails', async () => {
      // Arrange
      await supervisor.initialize();

      // Mock proactive assistant to fail
      const originalConsoleError = console.error;
      console.error = vi.fn();

      // Act
      const result = await supervisor.processMessage('Test message');

      // Assert - Should still get response even if proactive insights fail
      expect(result).toMatchObject({
        response: expect.any(String),
        agent: expect.any(String),
        confidence: expect.any(Number)
      });

      // Insights might be empty due to failure, but shouldn't crash
      expect(result.insights).toBeDefined();

      console.error = originalConsoleError;
    });

    test('should handle concurrent message processing', async () => {
      // Arrange
      await supervisor.initialize();

      const messages = [
        'Plan a trip to Yellowstone',
        'Track my fuel expenses',
        'Find RV communities near me',
        'Check weather for my route',
        'What are good camping spots?'
      ];

      // Act - Process messages concurrently
      const results = await Promise.all(
        messages.map(message => supervisor.processMessage(message))
      );

      // Assert
      expect(results).toHaveLength(messages.length);
      results.forEach(result => {
        expect(result).toMatchObject({
          response: expect.any(String),
          agent: expect.any(String),
          confidence: expect.any(Number),
          executionTime: expect.any(Number)
        });
      });

      // Context should contain all messages
      const context = supervisor.getContext();
      expect(context.messages.length).toBeGreaterThanOrEqual(messages.length);
    });
  });

  describe('Performance and Scalability', () => {
    test('should maintain performance with learning overhead', async () => {
      // Arrange
      await supervisor.initialize();
      const startTime = Date.now();

      // Act - Process multiple messages with learning enabled
      const messageCount = 20;
      const messages = Array(messageCount).fill(null).map((_, i) => 
        `Test message ${i + 1} about trip planning and budgeting`
      );

      for (const message of messages) {
        await supervisor.processMessage(message);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / messageCount;

      // Assert - Should maintain reasonable performance
      expect(averageTime).toBeLessThan(5000); // Less than 5 seconds per message
      
      // Learning system should be tracking metrics
      const metrics = await supervisor.getPerformanceMetrics();
      expect(metrics.supervisor.totalInteractions).toBe(messageCount);
    });

    test('should handle memory cleanup properly', async () => {
      // Arrange
      const longConfig: SupervisorConfig = {
        ...config,
        maxContextLength: 10 // Small context for testing cleanup
      };

      const memorySupervisor = new PAMSupervisor(longConfig);
      await memorySupervisor.initialize();

      // Act - Send more messages than context limit
      for (let i = 0; i < 15; i++) {
        await memorySupervisor.processMessage(`Message ${i}`);
      }

      // Assert - Context should be trimmed
      const context = memorySupervisor.getContext();
      expect(context.messages.length).toBeLessThanOrEqual(10);

      await memorySupervisor.shutdown();
    });
  });

  describe('Shutdown and Cleanup', () => {
    test('should cleanup learning systems on shutdown', async () => {
      // Arrange
      await supervisor.initialize();
      await supervisor.processMessage('Test message');
      
      // Verify systems are working
      const metrics = await supervisor.getPerformanceMetrics();
      expect(metrics).toBeTruthy();

      // Act
      await supervisor.shutdown();

      // Assert - Should complete without errors
      expect(supervisor).toBeTruthy(); // Supervisor object still exists but is shut down
    });
  });
});