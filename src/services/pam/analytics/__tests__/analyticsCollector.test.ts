/**
 * Tests for Analytics Collector Service
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnalyticsCollector } from '../analyticsCollector';

// Mock the UsageAnalyticsService
const mockAnalyticsService = {
  trackToolUsage: vi.fn(),
  trackResponseTime: vi.fn(),
  trackError: vi.fn(),
  trackUserFeedback: vi.fn(),
  trackTokenUsage: vi.fn(),
  trackUserAction: vi.fn(),
  dispose: vi.fn()
};

vi.mock('../usageAnalytics', () => ({
  UsageAnalyticsService: {
    getInstance: vi.fn(() => mockAnalyticsService)
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

global.Intl = {
  DateTimeFormat: () => ({
    resolvedOptions: () => ({ timeZone: 'UTC' })
  })
} as any;

describe('AnalyticsCollector', () => {
  let collector: AnalyticsCollector;
  const userId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
    
    collector = AnalyticsCollector.getInstance();
    collector.initialize(userId);
  });

  afterEach(() => {
    collector.dispose();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    test('creates singleton instance', () => {
      const instance1 = AnalyticsCollector.getInstance();
      const instance2 = AnalyticsCollector.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    test('initializes with user context', () => {
      collector.initialize('new-user');
      
      collector.collectUserAction('test-action');
      
      vi.advanceTimersByTime(11000);
      
      expect(mockAnalyticsService.trackUserAction).toHaveBeenCalled();
    });

    test('can be enabled and disabled', () => {
      collector.setEnabled(false);
      
      collector.collectToolUsage({ tool_name: 'test-tool' });
      
      vi.advanceTimersByTime(11000);
      
      expect(mockAnalyticsService.trackToolUsage).not.toHaveBeenCalled();
      
      collector.setEnabled(true);
      
      collector.collectToolUsage({ tool_name: 'test-tool' });
      
      vi.advanceTimersByTime(11000);
      
      expect(mockAnalyticsService.trackToolUsage).toHaveBeenCalled();
    });
  });

  describe('Tool Usage Collection', () => {
    test('collects basic tool usage data', () => {
      collector.collectToolUsage({
        tool_name: 'expense-tracker'
      });

      vi.advanceTimersByTime(11000);

      expect(mockAnalyticsService.trackToolUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          tool_name: 'expense-tracker',
          tool_category: 'financial', // Should be inferred
          usage_count: 1,
          success_rate: 1.0
        })
      );
    });

    test('infers tool category correctly', () => {
      const testCases = [
        { tool: 'expense-tracker', expected: 'financial' },
        { tool: 'budget-planner', expected: 'financial' },
        { tool: 'trip-planner', expected: 'travel' },
        { tool: 'unknown-tool', expected: 'general' }
      ];

      testCases.forEach(({ tool, expected }) => {
        collector.collectToolUsage({ tool_name: tool });
      });

      vi.advanceTimersByTime(11000);

      testCases.forEach(({ expected }, index) => {
        expect(mockAnalyticsService.trackToolUsage).toHaveBeenNthCalledWith(
          index + 1,
          expect.objectContaining({
            tool_category: expected
          })
        );
      });
    });

    test('enhances tool usage with timing data', () => {
      collector.collectToolUsage({
        tool_name: 'test-tool',
        average_response_time: 1500
      });

      vi.advanceTimersByTime(11000);

      expect(mockAnalyticsService.trackToolUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          average_response_time: 1500,
          collected_at: expect.any(String),
          client_timezone: 'UTC'
        })
      );
    });
  });

  describe('Response Time Collection', () => {
    test('collects response time with performance grading', () => {
      collector.collectResponseTime({
        operation: 'api-call',
        response_time_ms: 2500
      });

      vi.advanceTimersByTime(11000);

      expect(mockAnalyticsService.trackResponseTime).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'api-call',
          response_time_ms: 2500,
          performance_grade: 'good', // 2500ms should be 'good'
          is_slow: false,
          percentile_bucket: 'p50-p75'
        })
      );
    });

    test('grades performance correctly', () => {
      const testCases = [
        { time: 500, grade: 'excellent' },
        { time: 1500, grade: 'good' },
        { time: 4000, grade: 'fair' },
        { time: 8000, grade: 'poor' }
      ];

      testCases.forEach(({ time }) => {
        collector.collectResponseTime({
          operation: 'test',
          response_time_ms: time
        });
      });

      vi.advanceTimersByTime(11000);

      testCases.forEach(({ grade }, index) => {
        expect(mockAnalyticsService.trackResponseTime).toHaveBeenNthCalledWith(
          index + 1,
          expect.objectContaining({
            performance_grade: grade
          })
        );
      });
    });

    test('categorizes response times into percentile buckets', () => {
      const testCases = [
        { time: 300, bucket: 'p0-p25' },
        { time: 1000, bucket: 'p25-p50' },
        { time: 2000, bucket: 'p50-p75' },
        { time: 4000, bucket: 'p75-p90' },
        { time: 8000, bucket: 'p90-p95' },
        { time: 15000, bucket: 'p95-p100' }
      ];

      testCases.forEach(({ time }) => {
        collector.collectResponseTime({
          operation: 'test',
          response_time_ms: time
        });
      });

      vi.advanceTimersByTime(11000);

      testCases.forEach(({ bucket }, index) => {
        expect(mockAnalyticsService.trackResponseTime).toHaveBeenNthCalledWith(
          index + 1,
          expect.objectContaining({
            percentile_bucket: bucket
          })
        );
      });
    });
  });

  describe('Error Collection', () => {
    test('collects errors with context and severity', () => {
      collector.collectError({
        error_type: 'api_error',
        error_message: 'Request failed'
      });

      vi.advanceTimersByTime(11000);

      expect(mockAnalyticsService.trackError).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: 'api_error',
          error_message: 'Request failed',
          error_severity: expect.oneOf(['low', 'medium', 'high', 'critical']),
          user_impact: expect.oneOf(['none', 'minimal', 'moderate', 'severe'])
        })
      );
    });

    test('calculates error severity correctly', () => {
      const testCases = [
        {
          error: { error_type: 'system_error' as const, recovery_attempted: false },
          expected: 'critical'
        },
        {
          error: { error_type: 'api_error' as const, error_message: 'authentication failed' },
          expected: 'high'
        },
        {
          error: { error_type: 'validation_error' as const, recovery_attempted: true, recovery_successful: true },
          expected: 'low'
        },
        {
          error: { error_type: 'network_error' as const },
          expected: 'medium'
        }
      ];

      testCases.forEach(({ error }) => {
        collector.collectError({
          ...error,
          error_message: error.error_message || 'Test error'
        });
      });

      vi.advanceTimersByTime(11000);

      testCases.forEach(({ expected }, index) => {
        expect(mockAnalyticsService.trackError).toHaveBeenNthCalledWith(
          index + 1,
          expect.objectContaining({
            error_severity: expected
          })
        );
      });
    });

    test('captures error context automatically', () => {
      collector.collectError({
        error_type: 'system_error',
        error_message: 'Test error'
      });

      vi.advanceTimersByTime(11000);

      expect(mockAnalyticsService.trackError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            url: 'https://test.com/test',
            user_agent: 'Test User Agent',
            viewport_size: '1024x768',
            connection_type: '4g'
          })
        })
      );
    });
  });

  describe('User Feedback Collection', () => {
    test('collects thumbs up/down feedback', () => {
      collector.collectUserFeedback({
        feedback_type: 'thumbs_up',
        message_id: 'msg-123'
      });

      vi.advanceTimersByTime(11000);

      expect(mockAnalyticsService.trackUserFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          feedback_type: 'thumbs_up',
          message_id: 'msg-123',
          feedback_value: 1,
          response_quality: 4, // Should be inferred from thumbs up
          sentiment_score: 0.8
        })
      );
    });

    test('collects rating feedback', () => {
      collector.collectUserFeedback({
        feedback_type: 'rating',
        message_id: 'msg-456',
        feedback_value: 3
      });

      vi.advanceTimersByTime(11000);

      expect(mockAnalyticsService.trackUserFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          feedback_type: 'rating',
          feedback_value: 3,
          response_quality: 3,
          sentiment_score: 0 // 3 on 1-5 scale = neutral
        })
      );
    });

    test('infers quality scores from feedback type', () => {
      const testCases = [
        { type: 'thumbs_up' as const, expectedQuality: 4 },
        { type: 'thumbs_down' as const, expectedQuality: 2 },
        { type: 'rating' as const, value: 5, expectedQuality: 5 }
      ];

      testCases.forEach(({ type, value }) => {
        collector.collectUserFeedback({
          feedback_type: type,
          message_id: 'test',
          feedback_value: value
        });
      });

      vi.advanceTimersByTime(11000);

      testCases.forEach(({ expectedQuality }, index) => {
        expect(mockAnalyticsService.trackUserFeedback).toHaveBeenNthCalledWith(
          index + 1,
          expect.objectContaining({
            response_quality: expectedQuality
          })
        );
      });
    });
  });

  describe('Token Usage Collection', () => {
    test('collects token usage with cost calculation', () => {
      collector.collectTokenUsage({
        operation: 'claude-chat',
        total_tokens: 150
      });

      vi.advanceTimersByTime(11000);

      expect(mockAnalyticsService.trackTokenUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'claude-chat',
          total_tokens: 150,
          estimated_cost: expect.any(Number),
          model: 'claude-3.5-sonnet',
          cost_efficiency: expect.any(Number),
          optimization_potential: expect.any(Number)
        })
      );
    });

    test('calculates cost based on token count', () => {
      const testCases = [100, 1000, 5000, 10000];

      testCases.forEach(tokens => {
        collector.collectTokenUsage({
          operation: 'test',
          total_tokens: tokens
        });
      });

      vi.advanceTimersByTime(11000);

      // Verify costs are calculated proportionally
      const calls = mockAnalyticsService.trackTokenUsage.mock.calls;
      expect(calls[1][0].estimated_cost).toBeGreaterThan(calls[0][0].estimated_cost);
      expect(calls[2][0].estimated_cost).toBeGreaterThan(calls[1][0].estimated_cost);
    });

    test('calculates optimization potential based on token count', () => {
      const testCases = [
        { tokens: 500, expectedPotential: 0.1 },
        { tokens: 2000, expectedPotential: 0.3 },
        { tokens: 7000, expectedPotential: 0.6 },
        { tokens: 15000, expectedPotential: 0.9 }
      ];

      testCases.forEach(({ tokens }) => {
        collector.collectTokenUsage({
          operation: 'test',
          total_tokens: tokens
        });
      });

      vi.advanceTimersByTime(11000);

      testCases.forEach(({ expectedPotential }, index) => {
        expect(mockAnalyticsService.trackTokenUsage).toHaveBeenNthCalledWith(
          index + 1,
          expect.objectContaining({
            optimization_potential: expectedPotential
          })
        );
      });
    });
  });

  describe('Cache Event Collection', () => {
    test('collects cache hits and misses', () => {
      collector.collectCacheEvent('hit', {
        operation: 'api-call',
        response_time_saved: 1000
      });

      collector.collectCacheEvent('miss', {
        operation: 'api-call'
      });

      vi.advanceTimersByTime(11000);

      expect(mockAnalyticsService.trackUserAction).toHaveBeenCalledWith(
        'cache_hit',
        expect.objectContaining({
          operation: 'api-call',
          response_time_saved: 1000,
          cache_efficiency: 1
        })
      );

      expect(mockAnalyticsService.trackUserAction).toHaveBeenCalledWith(
        'cache_miss',
        expect.objectContaining({
          operation: 'api-call',
          cache_efficiency: 0
        })
      );
    });
  });

  describe('User Action Collection', () => {
    test('collects user actions with context', () => {
      collector.collectUserAction('button-click', { button: 'submit' });

      vi.advanceTimersByTime(11000);

      expect(mockAnalyticsService.trackUserAction).toHaveBeenCalledWith(
        'button-click',
        expect.objectContaining({
          button: 'submit',
          page_url: '/test',
          session_context: expect.objectContaining({
            device_type: 'desktop'
          })
        })
      );
    });
  });

  describe('Buffer Management', () => {
    test('processes buffer automatically after timeout', () => {
      collector.collectUserAction('test-action');

      expect(mockAnalyticsService.trackUserAction).not.toHaveBeenCalled();

      vi.advanceTimersByTime(11000);

      expect(mockAnalyticsService.trackUserAction).toHaveBeenCalled();
    });

    test('processes buffer when it reaches size limit', () => {
      // Add 51 events (should trigger processing at 50)
      for (let i = 0; i < 51; i++) {
        collector.collectUserAction(`action-${i}`);
      }

      expect(mockAnalyticsService.trackUserAction).toHaveBeenCalled();
    });

    test('flushes buffer immediately when requested', async () => {
      collector.collectUserAction('test-action');

      expect(mockAnalyticsService.trackUserAction).not.toHaveBeenCalled();

      await collector.flush();

      expect(mockAnalyticsService.trackUserAction).toHaveBeenCalled();
    });
  });

  describe('Device and Context Detection', () => {
    test('detects device type correctly', () => {
      const testCases = [
        { width: 600, expected: 'mobile' },
        { width: 800, expected: 'tablet' },
        { width: 1200, expected: 'desktop' }
      ];

      testCases.forEach(({ width, expected }) => {
        // Mock window width
        (global.window as any).innerWidth = width;

        collector.collectUserAction('test');
        
        vi.advanceTimersByTime(11000);

        expect(mockAnalyticsService.trackUserAction).toHaveBeenCalledWith(
          'test',
          expect.objectContaining({
            session_context: expect.objectContaining({
              device_type: expected
            })
          })
        );

        vi.clearAllMocks();
      });
    });

    test('captures session context correctly', () => {
      collector.collectUserAction('test-action');

      vi.advanceTimersByTime(11000);

      expect(mockAnalyticsService.trackUserAction).toHaveBeenCalledWith(
        'test-action',
        expect.objectContaining({
          session_context: expect.objectContaining({
            session_duration: expect.any(Number),
            page_views: expect.any(Number),
            interactions: expect.any(Number),
            device_type: 'desktop'
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('handles processing errors gracefully', async () => {
      mockAnalyticsService.trackUserAction.mockRejectedValue(new Error('Processing failed'));

      collector.collectUserAction('test-action');

      await expect(collector.flush()).resolves.not.toThrow();
    });

    test('continues processing after errors', async () => {
      mockAnalyticsService.trackUserAction
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValue(undefined);

      collector.collectUserAction('action1');
      collector.collectUserAction('action2');

      await collector.flush();

      expect(mockAnalyticsService.trackUserAction).toHaveBeenCalledTimes(2);
    });
  });

  describe('Disposal', () => {
    test('cleans up resources on disposal', () => {
      const spy = vi.spyOn(collector, 'flush');

      collector.dispose();

      expect(spy).toHaveBeenCalled();
      expect(mockAnalyticsService.dispose).toHaveBeenCalled();
    });

    test('stops processing after disposal', async () => {
      collector.dispose();

      collector.collectUserAction('test-action');

      vi.advanceTimersByTime(11000);

      // Should not process events after disposal
      expect(mockAnalyticsService.trackUserAction).not.toHaveBeenCalled();
    });
  });
});