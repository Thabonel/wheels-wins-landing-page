/**
 * Voice Edge Integration Component
 * Integrates Edge Query Processor with the voice pipeline for ultra-fast responses
 * Routes queries through edge processing before falling back to cloud APIs
 */

import { EdgeQueryProcessor, ProcessingResult } from './EdgeQueryProcessor';

interface VoiceEdgeConfig {
  enabled: boolean;
  timeoutMs: number;
  fallbackToCloud: boolean;
  debugMode: boolean;
  preloadCommonQueries: boolean;
  adaptiveFallback: boolean;
}

interface EdgeProcessingMetrics {
  totalQueries: number;
  edgeHandled: number;
  cloudFallbacks: number;
  avgEdgeLatency: number;
  avgCloudLatency: number;
  latencySavings: number;
}

interface VoiceQuery {
  text: string;
  timestamp: number;
  context?: Record<string, any>;
  userId?: string;
}

interface VoiceResponse {
  text: string;
  source: 'edge' | 'cloud';
  latency: number;
  confidence: number;
  metadata?: Record<string, any>;
}

export class VoiceEdgeIntegration {
  private edgeProcessor: EdgeQueryProcessor;
  private config: VoiceEdgeConfig;
  private metrics: EdgeProcessingMetrics;
  private cloudFallbackFunction?: (query: string, context?: Record<string, any>) => Promise<VoiceResponse>;

  constructor(config: Partial<VoiceEdgeConfig> = {}) {
    this.config = {
      enabled: true,
      timeoutMs: 100, // 100ms edge timeout
      fallbackToCloud: true,
      debugMode: false,
      preloadCommonQueries: true,
      adaptiveFallback: true,
      ...config
    };

    this.edgeProcessor = new EdgeQueryProcessor({
      enabled: this.config.enabled,
      confidence_threshold: 0.7,
      max_processing_time_ms: this.config.timeoutMs,
      cache_enabled: true,
      fuzzy_matching: true,
      learning_enabled: true
    });

    this.metrics = {
      totalQueries: 0,
      edgeHandled: 0,
      cloudFallbacks: 0,
      avgEdgeLatency: 0,
      avgCloudLatency: 0,
      latencySavings: 0
    };

    if (this.config.preloadCommonQueries) {
      this.preloadCommonQueries();
    }

    if (this.config.debugMode) {
      console.log('🚀 Voice Edge Integration initialized');
    }
  }

  /**
   * Main entry point for processing voice queries
   * Attempts edge processing first, falls back to cloud if needed
   */
  async processVoiceQuery(query: VoiceQuery): Promise<VoiceResponse> {
    this.metrics.totalQueries++;
    const startTime = performance.now();

    if (this.config.debugMode) {
      console.log(`🎤 Processing voice query: "${query.text}"`);
    }

    // Try edge processing first
    if (this.config.enabled) {
      try {
        const edgeResult = await this.tryEdgeProcessing(query);
        
        if (edgeResult.handled && edgeResult.response) {
          const latency = performance.now() - startTime;
          this.updateEdgeMetrics(latency);
          
          if (this.config.debugMode) {
            console.log(`⚡ Edge response (${latency.toFixed(1)}ms): "${edgeResult.response}"`);
          }

          return {
            text: edgeResult.response,
            source: 'edge',
            latency,
            confidence: edgeResult.confidence,
            metadata: {
              processingTimeMs: edgeResult.processing_time_ms,
              category: edgeResult.metadata?.category,
              pattern: edgeResult.metadata?.pattern
            }
          };
        }
      } catch (error) {
        console.warn('⚠️ Edge processing failed:', error);
      }
    }

    // Fallback to cloud processing
    if (this.config.fallbackToCloud && this.cloudFallbackFunction) {
      const cloudStartTime = performance.now();
      
      try {
        const cloudResponse = await this.cloudFallbackFunction(query.text, query.context);
        const cloudLatency = performance.now() - cloudStartTime;
        
        this.updateCloudMetrics(cloudLatency);
        
        if (this.config.debugMode) {
          console.log(`☁️ Cloud response (${cloudLatency.toFixed(1)}ms): "${cloudResponse.text}"`);
        }

        return {
          ...cloudResponse,
          source: 'cloud',
          latency: cloudLatency
        };
      } catch (error) {
        console.error('❌ Cloud processing failed:', error);
        
        return {
          text: "I'm having trouble processing that request right now. Please try again.",
          source: 'cloud',
          latency: performance.now() - cloudStartTime,
          confidence: 0
        };
      }
    }

    // No processing available
    return {
      text: "I'm not able to process that request at the moment.",
      source: 'edge',
      latency: performance.now() - startTime,
      confidence: 0
    };
  }

  private async tryEdgeProcessing(query: VoiceQuery): Promise<ProcessingResult> {
    const context = {
      ...query.context,
      timestamp: query.timestamp,
      userId: query.userId
    };

    return await this.edgeProcessor.processQuery(query.text, context);
  }

  private updateEdgeMetrics(latency: number): void {
    this.metrics.edgeHandled++;
    this.metrics.avgEdgeLatency = (
      (this.metrics.avgEdgeLatency * (this.metrics.edgeHandled - 1)) + latency
    ) / this.metrics.edgeHandled;
    
    this.calculateLatencySavings();
  }

  private updateCloudMetrics(latency: number): void {
    this.metrics.cloudFallbacks++;
    this.metrics.avgCloudLatency = (
      (this.metrics.avgCloudLatency * (this.metrics.cloudFallbacks - 1)) + latency
    ) / this.metrics.cloudFallbacks;
    
    this.calculateLatencySavings();
  }

  private calculateLatencySavings(): void {
    if (this.metrics.avgCloudLatency > 0 && this.metrics.avgEdgeLatency > 0) {
      this.metrics.latencySavings = this.metrics.avgCloudLatency - this.metrics.avgEdgeLatency;
    }
  }

  private preloadCommonQueries(): void {
    // Add additional common queries specific to travel and RV scenarios
    
    // RV-specific queries
    this.edgeProcessor.addQuery({
      id: 'rv_length',
      patterns: ['how long is my rv', 'rv length', 'length of rv', 'how big is my rv'],
      response: 'Your RV is 32 feet long', // This would come from user profile
      category: 'vehicle_status',
      confidence_threshold: 0.8
    });

    this.edgeProcessor.addQuery({
      id: 'rv_weight',
      patterns: ['how much does my rv weigh', 'rv weight', 'weight of rv'],
      response: 'Your RV weighs approximately 12,000 pounds', // This would come from user profile
      category: 'vehicle_status',
      confidence_threshold: 0.8
    });

    // Campground queries
    this.edgeProcessor.addQuery({
      id: 'campground_check_in',
      patterns: ['when is check in', 'check in time', 'when can we check in'],
      response: 'Most campgrounds allow check-in after 2:00 PM',
      category: 'travel_info',
      confidence_threshold: 0.8
    });

    this.edgeProcessor.addQuery({
      id: 'campground_check_out',
      patterns: ['when is check out', 'check out time', 'when do we check out'],
      response: 'Most campgrounds require check-out by 11:00 AM',
      category: 'travel_info',
      confidence_threshold: 0.8
    });

    // Utility queries
    this.edgeProcessor.addQuery({
      id: 'water_tank_capacity',
      patterns: ['water tank capacity', 'how much water', 'water tank size'],
      response: 'Your fresh water tank holds 100 gallons', // This would come from RV profile
      category: 'vehicle_status',
      confidence_threshold: 0.8
    });

    this.edgeProcessor.addQuery({
      id: 'waste_tank_capacity',
      patterns: ['waste tank capacity', 'black water tank', 'gray water tank'],
      response: 'Your waste tanks hold 40 gallons each for black and gray water',
      category: 'vehicle_status',
      confidence_threshold: 0.8
    });

    // Emergency queries
    this.edgeProcessor.addQuery({
      id: 'emergency_contact',
      patterns: ['emergency contact', 'roadside assistance', 'help emergency'],
      response: 'For emergencies, call 911. For roadside assistance, call your insurance provider or AAA.',
      category: 'common_questions',
      confidence_threshold: 0.9
    });

    // Weather-related edge queries
    this.edgeProcessor.addQuery({
      id: 'driving_weather_check',
      patterns: ['is it safe to drive', 'weather for driving', 'driving conditions'],
      response: 'I recommend checking current weather conditions before departure. Would you like me to get the latest forecast?',
      category: 'travel_info',
      confidence_threshold: 0.7
    });

    if (this.config.debugMode) {
      console.log('📚 Preloaded common RV and travel queries');
    }
  }

  /**
   * Register cloud fallback function
   */
  setCloudFallback(fallbackFunction: (query: string, context?: Record<string, any>) => Promise<VoiceResponse>): void {
    this.cloudFallbackFunction = fallbackFunction;
    
    if (this.config.debugMode) {
      console.log('☁️ Cloud fallback function registered');
    }
  }

  /**
   * Update context for edge processing
   */
  updateContext(key: string, value: any): void {
    this.edgeProcessor.updateContext(key, value);
  }

  /**
   * Add custom query pattern
   */
  addCustomQuery(id: string, patterns: string[], response: string | (() => string), category: string = 'custom'): void {
    this.edgeProcessor.addQuery({
      id,
      patterns,
      response,
      category: category as any,
      confidence_threshold: 0.7
    });

    if (this.config.debugMode) {
      console.log(`➕ Added custom query: ${id}`);
    }
  }

  /**
   * Remove query pattern
   */
  removeQuery(id: string): void {
    this.edgeProcessor.removeQuery(id);
    
    if (this.config.debugMode) {
      console.log(`➖ Removed query: ${id}`);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): EdgeProcessingMetrics {
    const edgeMetrics = this.edgeProcessor.getMetrics();
    
    return {
      ...this.metrics,
      totalQueries: edgeMetrics.total_queries || this.metrics.totalQueries,
      edgeHandled: edgeMetrics.edge_handled || this.metrics.edgeHandled
    };
  }

  /**
   * Get detailed performance statistics
   */
  getDetailedStats(): Record<string, any> {
    const metrics = this.getMetrics();
    const edgeMetrics = this.edgeProcessor.getMetrics();
    
    return {
      performance: {
        edgeSuccessRate: metrics.totalQueries > 0 ? metrics.edgeHandled / metrics.totalQueries : 0,
        averageLatencySavings: metrics.latencySavings,
        edgeLatency: metrics.avgEdgeLatency,
        cloudLatency: metrics.avgCloudLatency
      },
      edgeProcessor: edgeMetrics,
      configuration: this.config
    };
  }

  /**
   * Optimize edge processing based on usage patterns
   */
  optimize(): void {
    const metrics = this.edgeProcessor.getMetrics();
    
    // Adjust confidence threshold based on success rate
    if (metrics.edge_handled && metrics.total_queries) {
      const successRate = metrics.edge_handled / metrics.total_queries;
      
      if (successRate < 0.3) {
        // Lower threshold to catch more queries
        this.edgeProcessor.updateConfig({ confidence_threshold: 0.6 });
      } else if (successRate > 0.8) {
        // Raise threshold to improve quality
        this.edgeProcessor.updateConfig({ confidence_threshold: 0.8 });
      }
    }

    // Enable adaptive fallback if latency savings are significant
    if (this.metrics.latencySavings > 500) { // 500ms savings
      this.config.adaptiveFallback = true;
    }

    if (this.config.debugMode) {
      console.log('🔧 Edge processing optimized based on usage patterns');
    }
  }

  /**
   * Clear caches and reset learning data
   */
  reset(): void {
    this.edgeProcessor.clearCache();
    this.metrics = {
      totalQueries: 0,
      edgeHandled: 0,
      cloudFallbacks: 0,
      avgEdgeLatency: 0,
      avgCloudLatency: 0,
      latencySavings: 0
    };

    if (this.config.debugMode) {
      console.log('🔄 Edge integration reset');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<VoiceEdgeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update edge processor config
    this.edgeProcessor.updateConfig({
      enabled: this.config.enabled,
      max_processing_time_ms: this.config.timeoutMs
    });

    if (this.config.debugMode) {
      console.log('⚙️ Voice edge integration config updated');
    }
  }

  /**
   * Test edge processing with sample queries
   */
  async runDiagnostics(): Promise<Record<string, any>> {
    const testQueries = [
      'what time is it',
      'what is 5 plus 3',
      'how much fuel',
      'when will we arrive',
      'help'
    ];

    const results = [];

    for (const query of testQueries) {
      const startTime = performance.now();
      const result = await this.processVoiceQuery({
        text: query,
        timestamp: Date.now()
      });
      const duration = performance.now() - startTime;

      results.push({
        query,
        response: result.text,
        source: result.source,
        latency: duration,
        confidence: result.confidence
      });
    }

    return {
      testResults: results,
      metrics: this.getMetrics(),
      config: this.config
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.edgeProcessor.destroy();
    
    if (this.config.debugMode) {
      console.log('🛑 Voice edge integration destroyed');
    }
  }
}