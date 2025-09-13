/**
 * Integration Tests for PAM Analytics System
 * 
 * Tests the complete analytics pipeline from data collection to storage and visualization
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnalyticsCollector } from '../analyticsCollector';
import { UsageAnalyticsService } from '../usageAnalytics';
import type { AnalyticsMetrics } from '../usageAnalytics';

// Mock Supabase with more realistic data
const mockAnalyticsData = [
  {
    id: '1',
    user_id: 'user-123',
    session_id: 'session-1',
    event_type: 'tool_usage',
    event_data: {
      tool_name: 'expense-tracker',
      tool_category: 'financial',
      usage_count: 1,
      success_rate: 1.0,
      average_response_time: 1500
    },
    timestamp: '2024-01-14T10:00:00Z',
    metadata: {
      device_type: 'desktop',
      user_agent: 'Test Browser'
    }
  },
  {
    id: '2',
    user_id: 'user-123',
    session_id: 'session-1',
    event_type: 'response_time',
    event_data: {
      operation: 'claude-api-call',
      response_time_ms: 2000,
      token_count: 150,
      cache_hit: false
    },
    timestamp: '2024-01-14T10:01:00Z',
    metadata: {
      device_type: 'desktop'
    }
  },
  {
    id: '3',
    user_id: 'user-123',
    session_id: 'session-1',
    event_type: 'user_feedback',
    event_data: {
      feedback_type: 'thumbs_up',
      feedback_value: 1,
      message_id: 'msg-123',
      response_quality: 4,
      response_relevance: 4,
      response_helpfulness: 5
    },
    timestamp: '2024-01-14T10:02:00Z',
    metadata: {
      device_type: 'desktop'
    }
  },
  {
    id: '4',
    user_id: 'user-123',
    session_id: 'session-1',
    event_type: 'token_usage',
    event_data: {
      operation: 'claude-chat',
      input_tokens: 100,
      output_tokens: 50,
      total_tokens: 150,
      estimated_cost: 0.0045,
      model: 'claude-3.5-sonnet',
      conversation_length: 5
    },
    timestamp: '2024-01-14T10:03:00Z',
    metadata: {
      device_type: 'desktop'
    }
  },
  {
    id: '5',
    user_id: 'user-123',
    session_id: 'session-2',
    event_type: 'cache_hit',
    event_data: {
      operation: 'api-call-2',
      response_time_saved: 800
    },
    timestamp: '2024-01-14T10:30:00Z',
    metadata: {
      device_type: 'mobile'
    }
  },
  {
    id: '6',
    user_id: 'user-123',
    session_id: 'session-2',
    event_type: 'error_occurred',
    event_data: {
      error_type: 'network_error',
      error_message: 'Request timeout',
      recovery_attempted: true,
      recovery_successful: true
    },
    timestamp: '2024-01-14T10:31:00Z',
    metadata: {
      device_type: 'mobile'
    }
  }
];

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

// Setup realistic mock chain
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

  // Default successful responses
  mockInsert.mockResolvedValue({
    data: null,
    error: null
  });

  mockOrder.mockResolvedValue({
    data: mockAnalyticsData,
    error: null
  });

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

// Mock globals
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

global.Intl = {
  DateTimeFormat: () => ({
    resolvedOptions: () => ({ timeZone: 'UTC' })
  })
} as any;

describe('Analytics Integration Tests', () => {
  let collector: AnalyticsCollector;
  let analyticsService: UsageAnalyticsService;
  const userId = 'user-123';

  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
    
    collector = AnalyticsCollector.getInstance();
    collector.initialize(userId);
    
    analyticsService = UsageAnalyticsService.getInstance(userId);
  });

  afterEach(() => {
    collector.dispose();
    analyticsService.dispose();
    vi.useRealTimers();
  });

  describe('Complete Analytics Pipeline', () => {
    test('collects, processes, and stores analytics data end-to-end', async () => {
      // Step 1: Collect various types of analytics data
      collector.collectToolUsage({
        tool_name: 'expense-tracker',
        average_response_time: 1500,
        parameters_used: ['amount', 'category']
      });

      collector.collectResponseTime({
        operation: 'claude-api-call',
        response_time_ms: 2000,
        token_count: 150,
        cache_hit: false
      });

      collector.collectUserFeedback({
        feedback_type: 'thumbs_up',
        message_id: 'msg-123'
      });

      collector.collectTokenUsage({
        operation: 'claude-chat',
        total_tokens: 150,
        input_tokens: 100,
        output_tokens: 50
      });

      collector.collectCacheEvent('hit', {
        operation: 'api-call',
        response_time_saved: 800
      });

      collector.collectError({
        error_type: 'network_error',
        error_message: 'Request timeout'
      });

      // Step 2: Force processing of collected data
      vi.advanceTimersByTime(11000);

      // Step 3: Verify data was stored
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            event_type: 'tool_usage',
            event_data: expect.objectContaining({
              tool_name: 'expense-tracker'
            })
          }),
          expect.objectContaining({
            event_type: 'response_time',
            event_data: expect.objectContaining({
              operation: 'claude-api-call'
            })
          }),
          expect.objectContaining({
            event_type: 'user_feedback',
            event_data: expect.objectContaining({
              feedback_type: 'thumbs_up'
            })
          }),
          expect.objectContaining({
            event_type: 'token_usage',
            event_data: expect.objectContaining({
              operation: 'claude-chat'
            })
          }),
          expect.objectContaining({
            event_type: 'user_action',
            event_data: expect.objectContaining({
              action: 'cache_hit'
            })
          }),
          expect.objectContaining({
            event_type: 'error_occurred',
            event_data: expect.objectContaining({
              error_type: 'network_error'
            })
          })
        ])
      );
    });

    test('retrieves and calculates metrics correctly', async () => {
      // Step 1: Get analytics metrics
      const metrics = await analyticsService.getAnalyticsMetrics('24h');

      // Step 2: Verify metrics calculation
      expect(metrics).toEqual({
        usage: {
          totalSessions: 2, // session-1 and session-2
          totalEvents: 6, // All events in mockAnalyticsData
          averageSessionDuration: expect.any(Number),
          mostUsedTools: [
            {
              tool: 'expense-tracker',
              count: 1,
              percentage: 100
            }
          ],
          peakUsageHours: expect.any(Array)
        },
        performance: {
          averageResponseTime: 2000, // From response_time event
          p95ResponseTime: 2000, // Only one response time event
          cacheHitRate: 1, // 1 cache hit, 0 cache misses in mock data
          errorRate: expect.closeTo(0.167, 1), // 1 error out of 6 events
          uptime: expect.any(Number)
        },
        satisfaction: {
          averageRating: 4, // From user_feedback event
          thumbsUpRate: 1, // 1 thumbs up, 0 thumbs down
          npsScore: expect.any(Number),
          commonIssues: [
            {
              issue: 'network_error',
              count: 1
            }
          ]
        },
        costs: {
          totalTokensUsed: 150, // From token_usage event
          estimatedCost: 0.0045, // From token_usage event
          costPerSession: expect.closeTo(0.00225, 4), // 0.0045 / 2 sessions
          tokenEfficiency: expect.any(Number),
          optimizationSavings: 0 // No optimization events in mock data
        }
      });
    });

    test('handles real-time data collection during active session', async () => {
      // Simulate active user session with continuous data collection
      const sessionEvents = [
        () => collector.collectUserAction('page_view', { page: '/dashboard' }),
        () => collector.collectToolUsage({ tool_name: 'budget-planner' }),
        () => collector.collectResponseTime({ operation: 'data-fetch', response_time_ms: 1200 }),
        () => collector.collectCacheEvent('hit', { operation: 'user-profile' }),
        () => collector.collectUserFeedback({ feedback_type: 'rating', feedback_value: 5, message_id: 'msg-456' }),
        () => collector.collectTokenUsage({ operation: 'summarization', total_tokens: 200 })
      ];

      // Collect events over time
      for (let i = 0; i < sessionEvents.length; i++) {
        sessionEvents[i]();
        vi.advanceTimersByTime(2000); // 2 seconds between events
      }

      // Force final processing
      await collector.flush();

      // Verify all events were processed
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            event_type: 'user_action',
            event_data: expect.objectContaining({ action: 'page_view' })
          }),
          expect.objectContaining({
            event_type: 'tool_usage',
            event_data: expect.objectContaining({ tool_name: 'budget-planner' })
          }),
          expect.objectContaining({
            event_type: 'response_time'
          }),
          expect.objectContaining({
            event_type: 'user_action',
            event_data: expect.objectContaining({ action: 'cache_hit' })
          }),
          expect.objectContaining({
            event_type: 'user_feedback'
          }),
          expect.objectContaining({
            event_type: 'token_usage'
          })
        ])
      );
    });
  });

  describe('Performance and Scalability', () => {
    test('handles high-volume data collection efficiently', async () => {
      const startTime = Date.now();
      
      // Collect 100 events rapidly
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          collector.collectUserAction(`bulk-action-${i}`, { index: i })
        );
      }
      
      await Promise.all(promises);
      
      const collectionTime = Date.now() - startTime;
      
      // Should handle 100 events quickly (under 1 second)
      expect(collectionTime).toBeLessThan(1000);
      
      // Force processing
      vi.advanceTimersByTime(11000);
      
      // Should batch process efficiently (should be called multiple times due to batch size limits)
      expect(mockInsert).toHaveBeenCalled();
    });

    test('maintains data accuracy under concurrent access', async () => {
      const collector1 = AnalyticsCollector.getInstance();
      const collector2 = AnalyticsCollector.getInstance();
      
      // Should be the same instance (singleton)
      expect(collector1).toBe(collector2);
      
      // Collect from different "sessions" concurrently
      const promises = [
        collector1.collectToolUsage({ tool_name: 'tool-a' }),
        collector1.collectToolUsage({ tool_name: 'tool-b' }),
        collector1.collectResponseTime({ operation: 'op-a', response_time_ms: 1000 }),
        collector1.collectResponseTime({ operation: 'op-b', response_time_ms: 2000 })
      ];
      
      await Promise.all(promises);
      vi.advanceTimersByTime(11000);
      
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            event_data: expect.objectContaining({ tool_name: 'tool-a' })
          }),
          expect.objectContaining({
            event_data: expect.objectContaining({ tool_name: 'tool-b' })
          }),
          expect.objectContaining({
            event_data: expect.objectContaining({ operation: 'op-a' })
          }),
          expect.objectContaining({
            event_data: expect.objectContaining({ operation: 'op-b' })
          })
        ])
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    test('gracefully handles database connection failures', async () => {
      // Simulate database error
      mockInsert.mockRejectedValueOnce(new Error('Connection timeout'));
      
      collector.collectUserAction('test-action');
      
      // Should not throw error
      await expect(collector.flush()).resolves.not.toThrow();
    });

    test('continues processing after transient errors', async () => {
      // First call fails, second succeeds
      mockInsert
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({ data: null, error: null });
      
      collector.collectUserAction('action-1');
      await collector.flush();
      
      collector.collectUserAction('action-2');
      await collector.flush();
      
      // Both calls should have been attempted
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });

    test('handles malformed data gracefully', async () => {
      // Collect various types of potentially problematic data
      const problematicCalls = [
        () => collector.collectToolUsage({ tool_name: '' }),
        () => collector.collectResponseTime({ operation: '', response_time_ms: -1 }),
        () => collector.collectUserFeedback({ feedback_type: 'thumbs_up' as any, message_id: '' }),
        () => collector.collectTokenUsage({ operation: '', total_tokens: 0 }),
        () => collector.collectError({ error_type: 'api_error', error_message: '' })
      ];
      
      // None of these should throw
      for (const call of problematicCalls) {
        expect(call).not.toThrow();
      }
      
      vi.advanceTimersByTime(11000);
      
      // Should still attempt to process
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('Data Quality and Validation', () => {
    test('enriches data with consistent metadata', async () => {
      collector.collectToolUsage({ tool_name: 'test-tool' });
      collector.collectResponseTime({ operation: 'test-op', response_time_ms: 1000 });
      collector.collectUserFeedback({ feedback_type: 'thumbs_up', message_id: 'test-msg' });
      
      vi.advanceTimersByTime(11000);
      
      const insertedData = mockInsert.mock.calls[0][0];
      
      // All events should have consistent structure
      insertedData.forEach((event: any) => {
        expect(event).toMatchObject({
          user_id: userId,
          session_id: expect.any(String),
          event_type: expect.any(String),
          event_data: expect.any(Object),
          timestamp: expect.any(String),
          metadata: expect.objectContaining({
            user_agent: expect.any(String),
            device_type: expect.any(String)
          })
        });
      });
    });

    test('calculates derived metrics accurately', async () => {
      // Test specific calculations
      collector.collectResponseTime({
        operation: 'test',
        response_time_ms: 2500 // Should be graded as 'good'
      });
      
      collector.collectTokenUsage({
        operation: 'test',
        total_tokens: 5000 // Should have medium optimization potential
      });
      
      collector.collectError({
        error_type: 'system_error',
        error_message: 'Test error',
        recovery_attempted: false // Should be critical severity
      });
      
      vi.advanceTimersByTime(11000);
      
      const insertedData = mockInsert.mock.calls[0][0];
      
      // Verify calculated fields
      const responseTimeEvent = insertedData.find((e: any) => e.event_type === 'response_time');
      expect(responseTimeEvent.event_data.performance_grade).toBe('good');
      
      const tokenEvent = insertedData.find((e: any) => e.event_type === 'token_usage');
      expect(tokenEvent.event_data.optimization_potential).toBe(0.6);
      
      const errorEvent = insertedData.find((e: any) => e.event_type === 'error_occurred');
      expect(errorEvent.event_data.error_severity).toBe('critical');
    });
  });

  describe('Session and Context Management', () => {
    test('tracks session lifecycle correctly', async () => {
      const service = UsageAnalyticsService.getInstance('test-user-lifecycle');
      
      // Session should start automatically
      await service.endSession();
      
      vi.advanceTimersByTime(11000);
      
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

    test('maintains context across multiple operations', async () => {
      const sessionId = 'test-session-context';
      collector.initialize(userId, sessionId);
      
      // Perform multiple operations
      collector.collectToolUsage({ tool_name: 'tool-1' });
      collector.collectResponseTime({ operation: 'op-1', response_time_ms: 1000 });
      collector.collectUserAction('action-1');
      
      vi.advanceTimersByTime(11000);
      
      const insertedData = mockInsert.mock.calls[0][0];
      
      // All events should have the same session_id
      insertedData.forEach((event: any) => {
        expect(event.session_id).toBe(sessionId);
      });
    });
  });
});

describe('Real-world Usage Scenarios', () => {
  test('simulates typical user interaction flow', async () => {
    const collector = AnalyticsCollector.getInstance();
    const userId = 'real-user-123';
    collector.initialize(userId);
    
    // User opens app
    collector.collectUserAction('app_start');
    
    // User navigates to expenses
    collector.collectUserAction('navigation', { from: 'dashboard', to: 'expenses' });
    
    // User uses expense tracker
    collector.collectToolUsage({
      tool_name: 'expense-tracker',
      average_response_time: 1200,
      parameters_used: ['amount', 'category', 'date']
    });
    
    // API call to process expense
    collector.collectResponseTime({
      operation: 'expense-create',
      response_time_ms: 1800,
      token_count: 75,
      cache_hit: false
    });
    
    // Token usage for AI categorization
    collector.collectTokenUsage({
      operation: 'expense-categorization',
      total_tokens: 85,
      input_tokens: 60,
      output_tokens: 25
    });
    
    // User provides positive feedback
    collector.collectUserFeedback({
      feedback_type: 'thumbs_up',
      message_id: 'expense-created-123',
      additional_comments: 'Great automatic categorization!'
    });
    
    // User continues with budget planning
    collector.collectToolUsage({
      tool_name: 'budget-planner',
      average_response_time: 2200
    });
    
    // This call hits cache
    collector.collectResponseTime({
      operation: 'budget-data-fetch',
      response_time_ms: 400,
      token_count: 0,
      cache_hit: true
    });
    
    collector.collectCacheEvent('hit', {
      operation: 'budget-data-fetch',
      response_time_saved: 1800
    });
    
    // Process all events
    vi.useFakeTimers();
    vi.advanceTimersByTime(11000);
    
    // Verify complete interaction was tracked
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          event_type: 'user_action',
          event_data: expect.objectContaining({ action: 'app_start' })
        }),
        expect.objectContaining({
          event_type: 'user_action',
          event_data: expect.objectContaining({ 
            action: 'navigation',
            from: 'dashboard',
            to: 'expenses'
          })
        }),
        expect.objectContaining({
          event_type: 'tool_usage',
          event_data: expect.objectContaining({ tool_name: 'expense-tracker' })
        }),
        expect.objectContaining({
          event_type: 'response_time',
          event_data: expect.objectContaining({ 
            operation: 'expense-create',
            cache_hit: false
          })
        }),
        expect.objectContaining({
          event_type: 'token_usage',
          event_data: expect.objectContaining({ operation: 'expense-categorization' })
        }),
        expect.objectContaining({
          event_type: 'user_feedback',
          event_data: expect.objectContaining({ 
            feedback_type: 'thumbs_up',
            additional_comments: 'Great automatic categorization!'
          })
        }),
        expect.objectContaining({
          event_type: 'tool_usage',
          event_data: expect.objectContaining({ tool_name: 'budget-planner' })
        }),
        expect.objectContaining({
          event_type: 'response_time',
          event_data: expect.objectContaining({ 
            operation: 'budget-data-fetch',
            cache_hit: true
          })
        }),
        expect.objectContaining({
          event_type: 'user_action',
          event_data: expect.objectContaining({ action: 'cache_hit' })
        })
      ])
    );
    
    vi.useRealTimers();
    collector.dispose();
  });
});