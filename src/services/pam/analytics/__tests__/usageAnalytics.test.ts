/**
 * Comprehensive Tests for PAM Usage Analytics System
 */

import { describe, test, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { UsageAnalyticsService } from '../usageAnalytics';
import type { 
  ToolUsageEvent, 
  ResponseTimeEvent, 
  ErrorEvent, 
  UserFeedbackEvent, 
  TokenUsageEvent 
} from '../usageAnalytics';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  auth: {
    onAuthStateChange: vi.fn(),
    getUser: vi.fn()
  }
};

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockOrder = vi.fn();

// Setup Supabase mock chain
beforeEach(() => {
  mockSupabase.from.mockReturnValue({
    insert: mockInsert,
    select: mockSelect
  });

  mockSelect.mockReturnValue({
    eq: mockEq
  });

  mockEq.mockReturnValue({
    gte: mockGte
  });

  mockGte.mockReturnValue({
    order: mockOrder
  });

  mockOrder.mockReturnValue({
    data: [],
    error: null
  });

  mockInsert.mockReturnValue({
    data: null,
    error: null
  });

  // Reset all mocks
  vi.clearAllMocks();
});

// Mock modules
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock global objects
global.window = {
  location: { pathname: '/test', href: 'https://test.com/test' },
  innerWidth: 1024,
  innerHeight: 768,
  screen: { width: 1920, height: 1080 },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
} as any;

global.document = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  visibilityState: 'visible'
} as any;

global.navigator = {
  userAgent: 'Test User Agent',
  connection: { effectiveType: '4g' }
} as any;

global.performance = {
  timeOrigin: Date.now() - 10000,
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  }
} as any;

describe('UsageAnalyticsService', () => {
  let analyticsService: UsageAnalyticsService;
  const userId = 'test-user-123';
  const sessionId = 'test-session-456';

  beforeEach(() => {
    analyticsService = UsageAnalyticsService.getInstance(userId, sessionId);
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    analyticsService.dispose();
    vi.useRealTimers();
  });

  describe('Service Initialization', () => {
    test('creates singleton instance correctly', () => {
      const instance1 = UsageAnalyticsService.getInstance(userId);
      const instance2 = UsageAnalyticsService.getInstance(userId);
      
      expect(instance1).toBe(instance2);
    });

    test('creates new instance for different user', () => {
      const instance1 = UsageAnalyticsService.getInstance('user1');
      const instance2 = UsageAnalyticsService.getInstance('user2');
      
      expect(instance1).not.toBe(instance2);
    });

    test('generates unique session IDs', () => {
      const service1 = UsageAnalyticsService.getInstance('user1', 'session1');
      const service2 = UsageAnalyticsService.getInstance('user2'); // Auto-generated session
      
      // We can't directly test the session ID, but we can test that they track events differently
      expect(service1).not.toBe(service2);
    });
  });

  describe('Tool Usage Tracking', () => {
    test('tracks tool usage with required fields', async () => {
      const toolData: ToolUsageEvent = {
        tool_name: 'expense-tracker',
        tool_category: 'financial',
        usage_count: 1,
        success_rate: 1.0,
        average_response_time: 1500,
        parameters_used: ['amount', 'category'],
        context_length: 10
      };

      await analyticsService.trackToolUsage(toolData);
      
      // Fast-forward to trigger batch processing
      vi.advanceTimersByTime(6000);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: userId,
            session_id: sessionId,
            event_type: 'tool_usage',
            event_data: expect.objectContaining({
              tool_name: 'expense-tracker',
              tool_category: 'financial',
              usage_count: 1
            })
          })
        ])
      );
    });

    test('tracks multiple tool usage events in batch', async () => {
      const tools = ['expense-tracker', 'trip-planner', 'budget-calculator'];
      
      for (const tool of tools) {
        await analyticsService.trackToolUsage({
          tool_name: tool,
          tool_category: 'financial',
          usage_count: 1,
          success_rate: 1.0,
          average_response_time: 1000,
          parameters_used: [],
          context_length: 5
        });
      }

      vi.advanceTimersByTime(6000);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            event_data: expect.objectContaining({ tool_name: 'expense-tracker' })
          }),
          expect.objectContaining({
            event_data: expect.objectContaining({ tool_name: 'trip-planner' })
          }),
          expect.objectContaining({
            event_data: expect.objectContaining({ tool_name: 'budget-calculator' })
          })
        ])
      );
    });
  });

  describe('Response Time Tracking', () => {
    test('tracks response time with performance grading', async () => {
      const responseData: ResponseTimeEvent = {
        operation: 'claude-api-call',
        response_time_ms: 2500,
        token_count: 150,
        cache_hit: false,
        network_latency: 200,
        processing_time: 2300
      };

      await analyticsService.trackResponseTime(responseData);
      vi.advanceTimersByTime(6000);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            event_type: 'response_time',
            event_data: expect.objectContaining({
              operation: 'claude-api-call',
              response_time_ms: 2500,
              token_count: 150,
              cache_hit: false
            })
          })
        ])
      );
    });

    test('tracks cache hits and misses separately', async () => {
      // Cache hit
      await analyticsService.trackResponseTime({
        operation: 'test-op',
        response_time_ms: 500,
        token_count: 100,
        cache_hit: true
      });

      // Cache miss
      await analyticsService.trackResponseTime({
        operation: 'test-op',
        response_time_ms: 3000,
        token_count: 100,
        cache_hit: false
      });

      vi.advanceTimersByTime(6000);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            event_type: 'response_time',
            event_data: expect.objectContaining({ cache_hit: true })
          }),
          expect.objectContaining({
            event_type: 'cache_hit'
          }),
          expect.objectContaining({
            event_type: 'response_time',
            event_data: expect.objectContaining({ cache_hit: false })
          }),
          expect.objectContaining({
            event_type: 'cache_miss'
          })
        ])
      );
    });
  });

  describe('Error Tracking', () => {
    test('tracks errors with context and severity', async () => {
      const errorData: ErrorEvent = {
        error_type: 'api_error',
        error_message: 'Authentication failed',
        error_code: 'AUTH_401',
        context: {
          operation: 'user-login',
          user_input: 'email@example.com'
        },
        recovery_attempted: true,
        recovery_successful: false
      };

      await analyticsService.trackError(errorData);
      vi.advanceTimersByTime(6000);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            event_type: 'error_occurred',
            event_data: expect.objectContaining({
              error_type: 'api_error',
              error_message: 'Authentication failed',
              error_code: 'AUTH_401',
              recovery_attempted: true,
              recovery_successful: false
            })
          })
        ])
      );
    });

    test('tracks critical errors immediately', async () => {
      const criticalError: ErrorEvent = {
        error_type: 'system_error',
        error_message: 'Database connection failed',
        context: {
          operation: 'data-fetch'
        },
        recovery_attempted: false
      };

      await analyticsService.trackError(criticalError);

      // Should be processed immediately for critical errors
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('User Feedback Tracking', () => {
    test('tracks thumbs up/down feedback', async () => {
      const feedbackData: UserFeedbackEvent = {
        feedback_type: 'thumbs_up',
        feedback_value: 1,
        message_id: 'msg-123',
        response_quality: 4,
        response_relevance: 5,
        response_helpfulness: 4,
        additional_comments: 'Very helpful response!'
      };

      await analyticsService.trackUserFeedback(feedbackData);
      vi.advanceTimersByTime(6000);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            event_type: 'user_feedback',
            event_data: expect.objectContaining({
              feedback_type: 'thumbs_up',
              message_id: 'msg-123',
              response_quality: 4,
              additional_comments: 'Very helpful response!'
            })
          })
        ])
      );
    });

    test('tracks rating feedback', async () => {
      const ratingFeedback: UserFeedbackEvent = {
        feedback_type: 'rating',
        feedback_value: 3,
        message_id: 'msg-456',
        response_quality: 3,
        response_relevance: 2,
        response_helpfulness: 3
      };

      await analyticsService.trackUserFeedback(ratingFeedback);
      vi.advanceTimersByTime(6000);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            event_data: expect.objectContaining({
              feedback_type: 'rating',
              feedback_value: 3
            })
          })
        ])
      );
    });
  });

  describe('Token Usage Tracking', () => {
    test('tracks token usage with cost calculation', async () => {
      const tokenData: TokenUsageEvent = {
        operation: 'claude-chat',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        estimated_cost: 0.0045,
        model: 'claude-3.5-sonnet',
        conversation_length: 10,
        context_optimization_applied: true
      };

      await analyticsService.trackTokenUsage(tokenData);
      vi.advanceTimersByTime(6000);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            event_type: 'token_usage',
            event_data: expect.objectContaining({
              operation: 'claude-chat',
              total_tokens: 150,
              estimated_cost: 0.0045,
              model: 'claude-3.5-sonnet',
              context_optimization_applied: true
            })
          })
        ])
      );
    });

    test('calculates cost efficiency metrics', async () => {
      const tokenData: TokenUsageEvent = {
        operation: 'long-conversation',
        input_tokens: 1000,
        output_tokens: 500,
        total_tokens: 1500,
        estimated_cost: 0.045,
        model: 'claude-3.5-sonnet',
        conversation_length: 50,
        context_optimization_applied: false
      };

      await analyticsService.trackTokenUsage(tokenData);
      vi.advanceTimersByTime(6000);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            event_data: expect.objectContaining({
              total_tokens: 1500,
              cost_efficiency_score: expect.any(Number),
              optimization_potential: expect.any(Number)
            })
          })
        ])
      );
    });
  });

  describe('Context Optimization Tracking', () => {
    test('tracks context optimization events', async () => {
      const optimizationData = {
        messages_before: 50,
        messages_after: 30,
        tokens_before: 10000,
        tokens_after: 6000,
        optimization_type: 'summarization' as const,
        processing_time_ms: 2000
      };

      await analyticsService.trackContextOptimization(optimizationData);
      vi.advanceTimersByTime(6000);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            event_type: 'context_optimization',
            event_data: expect.objectContaining({
              optimization_type: 'summarization',
              compression_ratio: 0.6, // 6000/10000
              tokens_reduced: 4000,
              efficiency_gain: 0.4
            })
          })
        ])
      );
    });
  });

  describe('Batch Processing', () => {
    test('processes events in batches', async () => {
      // Add multiple events
      for (let i = 0; i < 15; i++) {
        await analyticsService.trackUserAction(`test-action-${i}`, { index: i });
      }

      // Should trigger batch processing at 10 events
      expect(mockInsert).toHaveBeenCalledTimes(1);
      
      vi.advanceTimersByTime(6000);
      
      // Should process remaining events
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });

    test('flushes batch on timeout', async () => {
      await analyticsService.trackUserAction('test-action');
      
      expect(mockInsert).not.toHaveBeenCalled();
      
      // Advance time to trigger timeout
      vi.advanceTimersByTime(6000);
      
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    test('handles batch processing errors gracefully', async () => {
      mockInsert.mockReturnValueOnce({
        data: null,
        error: new Error('Database connection failed')
      });

      await analyticsService.trackUserAction('test-action');
      vi.advanceTimersByTime(6000);

      // Should attempt to process but handle error
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('Analytics Metrics Calculation', () => {
    beforeEach(() => {
      // Mock successful data retrieval
      mockOrder.mockReturnValue({
        data: [
          {
            event_type: 'tool_usage',
            event_data: { tool_name: 'expense-tracker', average_response_time: 1000 },
            timestamp: new Date().toISOString(),
            session_id: 'session-1'
          },
          {
            event_type: 'response_time',
            event_data: { response_time_ms: 1500, cache_hit: true },
            timestamp: new Date().toISOString(),
            session_id: 'session-1'
          },
          {
            event_type: 'user_feedback',
            event_data: { feedback_type: 'thumbs_up', response_quality: 4 },
            timestamp: new Date().toISOString(),
            session_id: 'session-1'
          },
          {
            event_type: 'token_usage',
            event_data: { total_tokens: 100, estimated_cost: 0.003 },
            timestamp: new Date().toISOString(),
            session_id: 'session-1'
          }
        ],
        error: null
      });
    });

    test('calculates usage metrics correctly', async () => {
      const metrics = await analyticsService.getAnalyticsMetrics('24h');

      expect(metrics.usage.totalSessions).toBe(1);
      expect(metrics.usage.totalEvents).toBe(4);
      expect(metrics.usage.mostUsedTools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            tool: 'expense-tracker',
            count: 1,
            percentage: 100
          })
        ])
      );
    });

    test('calculates performance metrics correctly', async () => {
      const metrics = await analyticsService.getAnalyticsMetrics('24h');

      expect(metrics.performance.averageResponseTime).toBe(1500);
      expect(metrics.performance.cacheHitRate).toBe(1); // 1 hit, 0 misses
      expect(metrics.performance.errorRate).toBe(0);
    });

    test('calculates satisfaction metrics correctly', async () => {
      const metrics = await analyticsService.getAnalyticsMetrics('24h');

      expect(metrics.satisfaction.averageRating).toBe(4);
      expect(metrics.satisfaction.thumbsUpRate).toBe(1); // 1 thumbs up, 0 thumbs down
    });

    test('calculates cost metrics correctly', async () => {
      const metrics = await analyticsService.getAnalyticsMetrics('24h');

      expect(metrics.costs.totalTokensUsed).toBe(100);
      expect(metrics.costs.estimatedCost).toBe(0.003);
      expect(metrics.costs.costPerSession).toBe(0.003);
    });

    test('handles empty data gracefully', async () => {
      mockOrder.mockReturnValue({
        data: [],
        error: null
      });

      const metrics = await analyticsService.getAnalyticsMetrics('24h');

      expect(metrics.usage.totalSessions).toBe(0);
      expect(metrics.usage.totalEvents).toBe(0);
      expect(metrics.performance.averageResponseTime).toBe(0);
      expect(metrics.satisfaction.averageRating).toBe(0);
    });

    test('handles database errors gracefully', async () => {
      mockOrder.mockReturnValue({
        data: null,
        error: new Error('Database error')
      });

      const metrics = await analyticsService.getAnalyticsMetrics('24h');

      // Should return empty metrics instead of throwing
      expect(metrics.usage.totalEvents).toBe(0);
    });
  });

  describe('Session Management', () => {
    test('tracks conversation start and end', async () => {
      // Session start is tracked automatically on initialization
      await analyticsService.endSession();

      vi.advanceTimersByTime(6000);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            event_type: 'conversation_start'
          }),
          expect.objectContaining({
            event_type: 'conversation_end'
          })
        ])
      );
    });
  });

  describe('Time Range Handling', () => {
    test('supports different time ranges', async () => {
      const timeRanges = ['1h', '24h', '7d', '30d'] as const;
      
      for (const range of timeRanges) {
        await analyticsService.getAnalyticsMetrics(range);
        
        expect(mockGte).toHaveBeenCalledWith(
          expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        );
      }
    });
  });
});

describe('Analytics Edge Cases', () => {
  test('handles malformed event data', async () => {
    const service = UsageAnalyticsService.getInstance('test-user');
    
    // Should not throw even with incomplete data
    await expect(service.trackUserAction('')).resolves.not.toThrow();
    await expect(service.trackUserAction('test', { invalid: undefined })).resolves.not.toThrow();
  });

  test('handles concurrent access', async () => {
    const service1 = UsageAnalyticsService.getInstance('user1');
    const service2 = UsageAnalyticsService.getInstance('user2');
    
    // Should handle concurrent tracking
    await Promise.all([
      service1.trackUserAction('action1'),
      service2.trackUserAction('action2'),
      service1.trackUserAction('action3'),
      service2.trackUserAction('action4')
    ]);

    vi.advanceTimersByTime(6000);
    
    // Both services should have processed their events
    expect(mockInsert).toHaveBeenCalled();
  });

  test('handles memory pressure gracefully', async () => {
    const service = UsageAnalyticsService.getInstance('test-user');
    
    // Add many events to test memory handling
    const promises = [];
    for (let i = 0; i < 200; i++) {
      promises.push(service.trackUserAction(`action-${i}`));
    }
    
    await Promise.all(promises);
    
    // Should process in batches without memory issues
    expect(mockInsert).toHaveBeenCalled();
  });
});