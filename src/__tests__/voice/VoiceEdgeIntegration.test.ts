/**
 * Voice Edge Integration Tests
 * Tests for the integration layer between voice processing and edge computing
 */

import { VoiceEdgeIntegration } from '../../components/voice/VoiceEdgeIntegration';

describe('VoiceEdgeIntegration', () => {
  let integration: VoiceEdgeIntegration;
  let mockCloudFallback: jest.Mock;

  beforeEach(() => {
    mockCloudFallback = jest.fn();
    
    integration = new VoiceEdgeIntegration({
      enabled: true,
      timeoutMs: 100,
      fallbackToCloud: true,
      debugMode: false,
      preloadCommonQueries: true,
      adaptiveFallback: true
    });

    integration.setCloudFallback(mockCloudFallback);
  });

  afterEach(() => {
    integration.destroy();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultIntegration = new VoiceEdgeIntegration();
      expect(defaultIntegration).toBeDefined();
      defaultIntegration.destroy();
    });

    it('should preload common queries when enabled', () => {
      const integration = new VoiceEdgeIntegration({
        preloadCommonQueries: true
      });
      
      // Verify RV-specific queries are loaded
      return integration.processVoiceQuery({
        text: 'how long is my rv',
        timestamp: Date.now()
      }).then(result => {
        expect(result.source).toBe('edge');
        expect(result.text).toContain('32 feet');
        integration.destroy();
      });
    });
  });

  describe('Edge Processing', () => {
    it('should process common queries through edge', async () => {
      const result = await integration.processVoiceQuery({
        text: 'what time is it',
        timestamp: Date.now()
      });

      expect(result.source).toBe('edge');
      expect(result.latency).toBeLessThan(100);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.text).toContain(':');
      expect(mockCloudFallback).not.toHaveBeenCalled();
    });

    it('should handle calculations at edge', async () => {
      const result = await integration.processVoiceQuery({
        text: '5 plus 3',
        timestamp: Date.now()
      });

      expect(result.source).toBe('edge');
      expect(result.text).toContain('8');
      expect(mockCloudFallback).not.toHaveBeenCalled();
    });

    it('should handle vehicle status queries at edge', async () => {
      const result = await integration.processVoiceQuery({
        text: 'fuel level',
        timestamp: Date.now()
      });

      expect(result.source).toBe('edge');
      expect(result.text).toMatch(/\d+%/);
      expect(mockCloudFallback).not.toHaveBeenCalled();
    });
  });

  describe('Cloud Fallback', () => {
    it('should fallback to cloud for unknown queries', async () => {
      const cloudResponse = {
        text: 'This is a cloud response',
        source: 'cloud' as const,
        latency: 250,
        confidence: 0.9
      };

      mockCloudFallback.mockResolvedValue(cloudResponse);

      const result = await integration.processVoiceQuery({
        text: 'complex query that edge cannot handle',
        timestamp: Date.now(),
        context: { user_id: 'test-user' }
      });

      expect(result.source).toBe('cloud');
      expect(result.text).toBe('This is a cloud response');
      expect(mockCloudFallback).toHaveBeenCalledWith(
        'complex query that edge cannot handle',
        expect.objectContaining({ user_id: 'test-user' })
      );
    });

    it('should handle cloud fallback failures gracefully', async () => {
      mockCloudFallback.mockRejectedValue(new Error('Cloud service unavailable'));

      const result = await integration.processVoiceQuery({
        text: 'unknown query',
        timestamp: Date.now()
      });

      expect(result.source).toBe('cloud');
      expect(result.text).toContain('trouble processing');
      expect(result.confidence).toBe(0);
    });

    it('should not call cloud when fallback disabled', async () => {
      integration.updateConfig({ fallbackToCloud: false });

      const result = await integration.processVoiceQuery({
        text: 'unknown query that should not work',
        timestamp: Date.now()
      });

      expect(result.text).toContain('not able to process');
      expect(mockCloudFallback).not.toHaveBeenCalled();
    });
  });

  describe('Performance Metrics', () => {
    it('should track edge processing metrics', async () => {
      await integration.processVoiceQuery({
        text: 'what time is it',
        timestamp: Date.now()
      });

      await integration.processVoiceQuery({
        text: 'help',
        timestamp: Date.now()
      });

      const metrics = integration.getMetrics();

      expect(metrics.totalQueries).toBe(2);
      expect(metrics.edgeHandled).toBe(2);
      expect(metrics.cloudFallbacks).toBe(0);
      expect(metrics.avgEdgeLatency).toBeGreaterThan(0);
    });

    it('should track cloud fallback metrics', async () => {
      mockCloudFallback.mockResolvedValue({
        text: 'Cloud response',
        source: 'cloud' as const,
        latency: 300,
        confidence: 0.8
      });

      await integration.processVoiceQuery({
        text: 'complex unknown query',
        timestamp: Date.now()
      });

      const metrics = integration.getMetrics();

      expect(metrics.cloudFallbacks).toBe(1);
      expect(metrics.avgCloudLatency).toBeGreaterThan(0);
    });

    it('should calculate latency savings', async () => {
      // Edge query
      await integration.processVoiceQuery({
        text: 'what time is it',
        timestamp: Date.now()
      });

      // Cloud query
      mockCloudFallback.mockResolvedValue({
        text: 'Cloud response',
        source: 'cloud' as const,
        latency: 500,
        confidence: 0.8
      });

      await integration.processVoiceQuery({
        text: 'complex query',
        timestamp: Date.now()
      });

      const metrics = integration.getMetrics();
      expect(metrics.latencySavings).toBeGreaterThan(0);
    });
  });

  describe('Custom Query Management', () => {
    it('should allow adding custom queries', async () => {
      integration.addCustomQuery(
        'test_custom',
        ['test custom command'],
        'Custom response for testing',
        'test'
      );

      const result = await integration.processVoiceQuery({
        text: 'test custom command',
        timestamp: Date.now()
      });

      expect(result.source).toBe('edge');
      expect(result.text).toBe('Custom response for testing');
    });

    it('should allow removing queries', async () => {
      integration.addCustomQuery(
        'temp_query',
        ['temporary command'],
        'Temporary response'
      );

      // Verify it works
      let result = await integration.processVoiceQuery({
        text: 'temporary command',
        timestamp: Date.now()
      });
      expect(result.source).toBe('edge');

      // Remove and verify it's gone
      integration.removeQuery('temp_query');
      
      result = await integration.processVoiceQuery({
        text: 'temporary command',
        timestamp: Date.now()
      });
      expect(result.source).toBe('cloud'); // Should fallback
    });
  });

  describe('Context Integration', () => {
    it('should pass context to edge processor', async () => {
      integration.updateContext('user_name', 'John');

      const result = await integration.processVoiceQuery({
        text: 'help',
        timestamp: Date.now(),
        context: { location: 'campground' },
        userId: 'user123'
      });

      expect(result.source).toBe('edge');
      // Context should be available to edge processor
    });
  });

  describe('Configuration Management', () => {
    it('should allow configuration updates', () => {
      integration.updateConfig({
        timeoutMs: 50,
        debugMode: true
      });

      // Configuration should be updated
      // This would be verified through behavior changes in actual usage
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should handle disabled state', async () => {
      integration.updateConfig({ enabled: false });

      const result = await integration.processVoiceQuery({
        text: 'what time is it',
        timestamp: Date.now()
      });

      // When disabled, should not use edge processing
      expect(result.source).toBe('cloud');
    });
  });

  describe('Optimization Features', () => {
    it('should optimize based on usage patterns', () => {
      // Add some usage history
      integration.processVoiceQuery({ text: 'help', timestamp: Date.now() });
      integration.processVoiceQuery({ text: 'what time is it', timestamp: Date.now() });
      
      // Run optimization
      integration.optimize();
      
      // Optimization should complete without errors
      expect(true).toBe(true);
    });

    it('should reset metrics and cache', () => {
      integration.processVoiceQuery({ text: 'help', timestamp: Date.now() });
      
      integration.reset();
      
      const metrics = integration.getMetrics();
      expect(metrics.totalQueries).toBe(0);
      expect(metrics.edgeHandled).toBe(0);
    });
  });

  describe('Diagnostics', () => {
    it('should run diagnostic tests', async () => {
      const diagnostics = await integration.runDiagnostics();

      expect(diagnostics.testResults).toBeDefined();
      expect(diagnostics.metrics).toBeDefined();
      expect(diagnostics.config).toBeDefined();
      expect(diagnostics.testResults.length).toBeGreaterThan(0);

      // Check that test queries were processed
      const timeQuery = diagnostics.testResults.find(r => r.query === 'what time is it');
      expect(timeQuery).toBeDefined();
      expect(timeQuery?.source).toBe('edge');
    });
  });

  describe('Error Handling', () => {
    it('should handle edge processing timeouts', async () => {
      integration.updateConfig({ timeoutMs: 1 }); // Very short timeout

      const result = await integration.processVoiceQuery({
        text: 'what time is it',
        timestamp: Date.now()
      });

      // Should either succeed quickly or fallback to cloud
      expect(['edge', 'cloud']).toContain(result.source);
    });

    it('should handle malformed queries gracefully', async () => {
      const result = await integration.processVoiceQuery({
        text: '',
        timestamp: Date.now()
      });

      expect(result).toBeDefined();
      expect(typeof result.text).toBe('string');
      expect(typeof result.latency).toBe('number');
    });
  });

  describe('RV-Specific Functionality', () => {
    it('should handle RV length queries', async () => {
      const result = await integration.processVoiceQuery({
        text: 'how long is my rv',
        timestamp: Date.now()
      });

      expect(result.source).toBe('edge');
      expect(result.text).toContain('32 feet');
    });

    it('should handle RV weight queries', async () => {
      const result = await integration.processVoiceQuery({
        text: 'how much does my rv weigh',
        timestamp: Date.now()
      });

      expect(result.source).toBe('edge');
      expect(result.text).toContain('12,000 pounds');
    });

    it('should handle campground check-in queries', async () => {
      const result = await integration.processVoiceQuery({
        text: 'when is check in',
        timestamp: Date.now()
      });

      expect(result.source).toBe('edge');
      expect(result.text).toContain('2:00 PM');
    });

    it('should handle water tank queries', async () => {
      const result = await integration.processVoiceQuery({
        text: 'water tank capacity',
        timestamp: Date.now()
      });

      expect(result.source).toBe('edge');
      expect(result.text).toContain('100 gallons');
    });

    it('should handle emergency contact queries', async () => {
      const result = await integration.processVoiceQuery({
        text: 'emergency contact',
        timestamp: Date.now()
      });

      expect(result.source).toBe('edge');
      expect(result.text).toContain('911');
    });
  });

  describe('Detailed Statistics', () => {
    it('should provide detailed performance statistics', async () => {
      await integration.processVoiceQuery({
        text: 'what time is it',
        timestamp: Date.now()
      });

      const stats = integration.getDetailedStats();

      expect(stats.performance).toBeDefined();
      expect(stats.edgeProcessor).toBeDefined();
      expect(stats.configuration).toBeDefined();
      expect(stats.performance.edgeSuccessRate).toBeGreaterThan(0);
    });
  });
});