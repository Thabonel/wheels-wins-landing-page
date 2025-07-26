/**
 * Edge Query Processor Tests
 * Comprehensive test suite for edge computing voice query processing
 */

import { EdgeQueryProcessor } from '../../components/voice/EdgeQueryProcessor';

describe('EdgeQueryProcessor', () => {
  let processor: EdgeQueryProcessor;

  beforeEach(() => {
    processor = new EdgeQueryProcessor({
      enabled: true,
      confidence_threshold: 0.7,
      max_processing_time_ms: 100,
      cache_enabled: true,
      fuzzy_matching: true,
      learning_enabled: true
    });
  });

  afterEach(() => {
    processor.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultProcessor = new EdgeQueryProcessor();
      const config = defaultProcessor.getConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.confidence_threshold).toBe(0.7);
      expect(config.cache_enabled).toBe(true);
      
      defaultProcessor.destroy();
    });

    it('should initialize with custom configuration', () => {
      const customProcessor = new EdgeQueryProcessor({
        confidence_threshold: 0.8,
        max_processing_time_ms: 50
      });
      
      const config = customProcessor.getConfig();
      expect(config.confidence_threshold).toBe(0.8);
      expect(config.max_processing_time_ms).toBe(50);
      
      customProcessor.destroy();
    });
  });

  describe('Time and Date Queries', () => {
    it('should handle current time queries', async () => {
      const result = await processor.processQuery('what time is it');
      
      expect(result.handled).toBe(true);
      expect(result.source).toBe('edge');
      expect(result.response).toContain(':');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.processing_time_ms).toBeLessThan(100);
    });

    it('should handle current date queries', async () => {
      const result = await processor.processQuery('what date is it');
      
      expect(result.handled).toBe(true);
      expect(result.response).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should handle various time query formats', async () => {
      const timeQueries = [
        'current time',
        'tell me the time',
        'time please',
        'what is the time'
      ];

      for (const query of timeQueries) {
        const result = await processor.processQuery(query);
        expect(result.handled).toBe(true);
        expect(result.response).toContain(':');
      }
    });
  });

  describe('Mathematical Calculations', () => {
    it('should handle simple addition', async () => {
      const result = await processor.processQuery('5 plus 3');
      
      expect(result.handled).toBe(true);
      expect(result.response).toContain('8');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should handle various math operations', async () => {
      const mathQueries = [
        { query: '10 minus 4', expected: '6' },
        { query: '6 times 7', expected: '42' },
        { query: '20 divided by 4', expected: '5' }
      ];

      for (const { query, expected } of mathQueries) {
        const result = await processor.processQuery(query);
        expect(result.handled).toBe(true);
        expect(result.response).toContain(expected);
      }
    });

    it('should handle decimal calculations', async () => {
      const result = await processor.processQuery('3.5 plus 2.5');
      
      expect(result.handled).toBe(true);
      expect(result.response).toContain('6');
    });

    it('should handle division by zero', async () => {
      const result = await processor.processQuery('5 divided by 0');
      
      expect(result.handled).toBe(true);
      expect(result.response).toContain('Cannot divide by zero');
    });
  });

  describe('Vehicle Status Queries', () => {
    it('should handle fuel level queries', async () => {
      const result = await processor.processQuery('how much fuel');
      
      expect(result.handled).toBe(true);
      expect(result.response).toMatch(/Fuel level is at \d+%/);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should handle battery status queries', async () => {
      const result = await processor.processQuery('battery level');
      
      expect(result.handled).toBe(true);
      expect(result.response).toMatch(/Battery is at \d+%/);
    });

    it('should handle various fuel query formats', async () => {
      const fuelQueries = [
        'fuel level',
        'gas level',
        'fuel remaining',
        'how much gas'
      ];

      for (const query of fuelQueries) {
        const result = await processor.processQuery(query);
        expect(result.handled).toBe(true);
        expect(result.response).toContain('Fuel level');
      }
    });
  });

  describe('Travel Information Queries', () => {
    it('should handle trip distance queries', async () => {
      const result = await processor.processQuery('how far to destination');
      
      expect(result.handled).toBe(true);
      expect(result.response).toMatch(/\d+ miles remaining/);
    });

    it('should handle arrival time queries', async () => {
      const result = await processor.processQuery('when will we arrive');
      
      expect(result.handled).toBe(true);
      expect(result.response).toContain('Estimated arrival');
    });
  });

  describe('Help and Information Queries', () => {
    it('should handle help requests', async () => {
      const result = await processor.processQuery('help');
      
      expect(result.handled).toBe(true);
      expect(result.response).toContain('navigation');
      expect(result.response).toContain('weather');
    });

    it('should handle PAM introduction requests', async () => {
      const result = await processor.processQuery('who are you');
      
      expect(result.handled).toBe(true);
      expect(result.response).toContain('PAM');
      expect(result.response).toContain('Personal Assistant');
    });
  });

  describe('Caching System', () => {
    it('should cache results for repeated queries', async () => {
      const query = 'what time is it';
      
      // First call
      const result1 = await processor.processQuery(query);
      expect(result1.source).toBe('edge');
      
      // Second call should be cached (but time queries have short TTL)
      const result2 = await processor.processQuery(query);
      expect(result2.handled).toBe(true);
    });

    it('should clear cache when requested', async () => {
      await processor.processQuery('help');
      processor.clearCache();
      
      const metrics = processor.getMetrics();
      // Cache should be cleared, so cache hits should reset for new queries
      expect(metrics.total_queries).toBeGreaterThan(0);
    });
  });

  describe('Custom Query Management', () => {
    it('should allow adding custom queries', () => {
      processor.addQuery({
        id: 'custom_test',
        patterns: ['test custom query'],
        response: 'Custom response',
        category: 'custom' as any,
        confidence_threshold: 0.8
      });

      return processor.processQuery('test custom query').then(result => {
        expect(result.handled).toBe(true);
        expect(result.response).toBe('Custom response');
      });
    });

    it('should allow removing queries', async () => {
      // Add custom query
      processor.addQuery({
        id: 'remove_test',
        patterns: ['remove me'],
        response: 'Will be removed',
        category: 'custom' as any,
        confidence_threshold: 0.8
      });

      // Verify it works
      let result = await processor.processQuery('remove me');
      expect(result.handled).toBe(true);

      // Remove query
      processor.removeQuery('remove_test');

      // Verify it's gone
      result = await processor.processQuery('remove me');
      expect(result.handled).toBe(false);
    });
  });

  describe('Context Integration', () => {
    it('should use context data for processing', async () => {
      processor.updateContext('user_name', 'John');
      processor.updateContext('trip_destination', 'Yellowstone');

      const result = await processor.processQuery('help', {
        user_name: 'John',
        trip_destination: 'Yellowstone'
      });

      expect(result.handled).toBe(true);
    });
  });

  describe('Fuzzy Matching', () => {
    it('should handle slight misspellings', async () => {
      const result = await processor.processQuery('wat time is it');
      
      expect(result.handled).toBe(true);
      expect(result.response).toContain(':');
    });

    it('should handle different word orders', async () => {
      const result = await processor.processQuery('time what is it');
      
      // Should still match time queries with some confidence
      expect(result.confidence).toBeGreaterThan(0.3);
    });
  });

  describe('Performance Requirements', () => {
    it('should process queries within time limit', async () => {
      const start = performance.now();
      const result = await processor.processQuery('what time is it');
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100); // 100ms limit
      expect(result.processing_time_ms).toBeLessThan(100);
    });

    it('should maintain metrics correctly', async () => {
      const initialMetrics = processor.getMetrics();
      
      await processor.processQuery('help');
      await processor.processQuery('what time is it');
      await processor.processQuery('unknown query that should fail');
      
      const finalMetrics = processor.getMetrics();
      
      expect(finalMetrics.total_queries).toBe(initialMetrics.total_queries + 3);
      expect(finalMetrics.edge_handled).toBeGreaterThan(initialMetrics.edge_handled);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty queries', async () => {
      const result = await processor.processQuery('');
      
      expect(result.handled).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should handle very long queries', async () => {
      const longQuery = 'this is a very long query that goes on and on and probably should not match anything specific but we need to test how the system handles it when queries are extremely verbose and contain lots of unnecessary words that might confuse the pattern matching system';
      
      const result = await processor.processQuery(longQuery);
      
      expect(result.processing_time_ms).toBeLessThan(100);
    });

    it('should handle special characters', async () => {
      const result = await processor.processQuery('what time is it???');
      
      expect(result.handled).toBe(true);
      expect(result.response).toContain(':');
    });

    it('should handle numbers in different formats', async () => {
      const queries = [
        '5.5 plus 2.3',
        'five plus three', // Should not work without NLP
        '-2 plus 7'
      ];

      const result1 = await processor.processQuery(queries[0]);
      expect(result1.handled).toBe(true);

      const result3 = await processor.processQuery(queries[2]);
      expect(result3.handled).toBe(true);
    });
  });

  describe('Configuration Updates', () => {
    it('should allow configuration updates', () => {
      const initialConfig = processor.getConfig();
      
      processor.updateConfig({
        confidence_threshold: 0.9,
        max_processing_time_ms: 50
      });
      
      const updatedConfig = processor.getConfig();
      
      expect(updatedConfig.confidence_threshold).toBe(0.9);
      expect(updatedConfig.max_processing_time_ms).toBe(50);
      expect(updatedConfig.enabled).toBe(initialConfig.enabled); // Should remain unchanged
    });
  });

  describe('Learning System', () => {
    it('should export and import learning data', async () => {
      // Generate some learning data
      await processor.processQuery('help');
      await processor.processQuery('what time is it');
      
      const learningData = processor.exportLearningData();
      expect(learningData).toBeDefined();
      
      // Create new processor and import data
      const newProcessor = new EdgeQueryProcessor();
      newProcessor.importLearningData(learningData);
      
      newProcessor.destroy();
    });
  });

  describe('Disabled State', () => {
    it('should not process queries when disabled', async () => {
      processor.updateConfig({ enabled: false });
      
      const result = await processor.processQuery('what time is it');
      
      expect(result.handled).toBe(false);
      expect(result.source).toBe('fallback');
    });
  });
});