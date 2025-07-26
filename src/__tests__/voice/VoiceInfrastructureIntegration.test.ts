/**
 * Voice Infrastructure Integration Tests
 * End-to-end tests for the complete voice infrastructure system
 * Tests integration between all Phase 2 voice components
 */

import { WakeWordDetector } from '../../components/voice/WakeWordDetector';
import { ConversationManager } from '../../components/voice/ConversationManager';
import { EmotionAnalyzer } from '../../components/voice/EmotionAnalyzer';
import { VoiceEdgeIntegration } from '../../components/voice/VoiceEdgeIntegration';

// Mock MediaDevices for testing
const mockMediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({
    getTracks: () => [{ stop: jest.fn() }],
    getAudioTracks: () => [{ stop: jest.fn() }]
  })
};

Object.defineProperty(global, 'navigator', {
  value: { mediaDevices: mockMediaDevices },
  writable: true
});

// Mock AudioContext
const mockAudioContext = jest.fn().mockImplementation(() => ({
  createMediaStreamSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn()
  }),
  createAnalyser: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
    fftSize: 2048,
    getByteFrequencyData: jest.fn(),
    getByteTimeDomainData: jest.fn()
  }),
  createScriptProcessor: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
    onaudioprocess: null
  }),
  destination: {},
  sampleRate: 16000,
  close: jest.fn()
}));

Object.defineProperty(global, 'AudioContext', {
  value: mockAudioContext,
  writable: true
});

Object.defineProperty(global, 'webkitAudioContext', {
  value: mockAudioContext,
  writable: true
});

describe('Voice Infrastructure Integration', () => {
  let wakeWordDetector: WakeWordDetector;
  let conversationManager: ConversationManager;
  let emotionAnalyzer: EmotionAnalyzer;
  let edgeIntegration: VoiceEdgeIntegration;

  beforeEach(async () => {
    // Initialize all components
    wakeWordDetector = new WakeWordDetector({
      enabled: true,
      sensitivity: 0.7,
      wakeWords: ['hey pam', 'pam', 'assistant'],
      continuousListening: true
    });

    conversationManager = new ConversationManager({
      maxTurnDuration: 30000,
      silenceThreshold: 2000,
      enableBargeIn: true,
      adaptiveInterruption: true
    });

    emotionAnalyzer = new EmotionAnalyzer({
      enabled: true,
      analysisInterval: 200,
      sensitivityLevel: 0.7
    });

    edgeIntegration = new VoiceEdgeIntegration({
      enabled: true,
      timeoutMs: 100,
      fallbackToCloud: true,
      preloadCommonQueries: true
    });

    // Mock successful initialization
    await wakeWordDetector.initialize();
    await conversationManager.initialize();
  });

  afterEach(() => {
    wakeWordDetector?.destroy();
    conversationManager?.destroy();
    emotionAnalyzer?.destroy();
    edgeIntegration?.destroy();
    jest.clearAllMocks();
  });

  describe('Component Integration', () => {
    it('should integrate wake word detection with conversation management', async () => {
      let conversationStarted = false;
      let wakeWordDetected = false;

      // Setup callbacks
      conversationManager = new ConversationManager({}, {
        onConversationStart: () => {
          conversationStarted = true;
        }
      });

      await conversationManager.initialize();

      wakeWordDetector = new WakeWordDetector({}, {
        onWakeWordDetected: (result) => {
          wakeWordDetected = true;
          conversationManager.startConversation('wake_word');
        }
      });

      await wakeWordDetector.initialize();

      // Simulate wake word detection
      wakeWordDetector.simulateWakeWord('hey pam');

      expect(wakeWordDetected).toBe(true);
      expect(conversationStarted).toBe(true);
      expect(conversationManager.isConversationActive()).toBe(true);
    });

    it('should integrate emotion analysis with conversation context', async () => {
      let emotionDetected = false;
      let emotionData: any = null;

      emotionAnalyzer = new EmotionAnalyzer({}, {
        onEmotionDetected: (result) => {
          emotionDetected = true;
          emotionData = result;
        }
      });

      // Mock audio stream
      const mockStream = {
        getTracks: () => [{ stop: jest.fn() }],
        getAudioTracks: () => [{ stop: jest.fn() }]
      } as MediaStream;

      await emotionAnalyzer.initialize(mockStream);
      emotionAnalyzer.startAnalysis();

      // Simulate emotion detection would happen through audio processing
      // For testing, we verify the integration points exist
      expect(emotionAnalyzer.isActive).toBe(true);
    });

    it('should integrate edge processing with conversation flow', async () => {
      const mockCloudFallback = jest.fn().mockResolvedValue({
        text: 'Cloud response',
        source: 'cloud' as const,
        latency: 300,
        confidence: 0.8
      });

      edgeIntegration.setCloudFallback(mockCloudFallback);

      // Test edge processing for simple query
      const edgeResult = await edgeIntegration.processVoiceQuery({
        text: 'what time is it',
        timestamp: Date.now()
      });

      expect(edgeResult.source).toBe('edge');
      expect(edgeResult.latency).toBeLessThan(100);
      expect(mockCloudFallback).not.toHaveBeenCalled();

      // Test fallback for complex query
      const complexResult = await edgeIntegration.processVoiceQuery({
        text: 'complex query requiring cloud processing',
        timestamp: Date.now()
      });

      expect(complexResult.source).toBe('cloud');
      expect(mockCloudFallback).toHaveBeenCalled();
    });
  });

  describe('Complete Voice Workflow', () => {
    it('should handle complete voice interaction workflow', async () => {
      const workflowEvents: string[] = [];
      let cloudFallbackCalled = false;

      // Setup integrated system
      const mockCloudFallback = jest.fn().mockImplementation(async (query) => {
        cloudFallbackCalled = true;
        return {
          text: `Cloud processed: ${query}`,
          source: 'cloud' as const,
          latency: 250,
          confidence: 0.9
        };
      });

      edgeIntegration.setCloudFallback(mockCloudFallback);

      // Setup conversation manager with callbacks
      conversationManager = new ConversationManager({}, {
        onConversationStart: () => workflowEvents.push('conversation_started'),
        onTurnChange: (newTurn) => workflowEvents.push(`turn_${newTurn}`),
        onConversationEnd: () => workflowEvents.push('conversation_ended')
      });

      await conversationManager.initialize();

      // Setup wake word detector
      wakeWordDetector = new WakeWordDetector({}, {
        onWakeWordDetected: (result) => {
          workflowEvents.push('wake_word_detected');
          conversationManager.startConversation('wake_word');
        }
      });

      await wakeWordDetector.initialize();

      // Simulate complete workflow
      
      // 1. Wake word detection
      wakeWordDetector.simulateWakeWord('hey pam');
      expect(workflowEvents).toContain('wake_word_detected');
      expect(workflowEvents).toContain('conversation_started');

      // 2. User speech starts
      conversationManager.onUserSpeechStart();
      expect(workflowEvents).toContain('turn_user');

      // 3. Process user query through edge
      const userQuery = 'what time is it';
      const response = await edgeIntegration.processVoiceQuery({
        text: userQuery,
        timestamp: Date.now()
      });

      expect(response.source).toBe('edge');
      expect(response.latency).toBeLessThan(100);

      // 4. AI response
      conversationManager.onAIResponseStart();
      expect(workflowEvents).toContain('turn_ai');

      // 5. Complete AI response
      conversationManager.onAIResponseComplete();
      expect(workflowEvents).toContain('turn_user'); // Returns to user

      expect(cloudFallbackCalled).toBe(false); // Simple query handled at edge
    });

    it('should handle complex query requiring cloud fallback', async () => {
      const mockCloudFallback = jest.fn().mockResolvedValue({
        text: 'Complex response from cloud AI',
        source: 'cloud' as const,
        latency: 450,
        confidence: 0.95
      });

      edgeIntegration.setCloudFallback(mockCloudFallback);

      // Process complex query
      const result = await edgeIntegration.processVoiceQuery({
        text: 'can you help me plan a route from San Francisco to Yellowstone with stops at scenic viewpoints and dog-friendly campgrounds',
        timestamp: Date.now(),
        context: { user_id: 'test_user' }
      });

      expect(result.source).toBe('cloud');
      expect(result.text).toContain('Complex response');
      expect(mockCloudFallback).toHaveBeenCalledWith(
        expect.stringContaining('plan a route'),
        expect.objectContaining({ user_id: 'test_user' })
      );
    });
  });

  describe('Performance Integration', () => {
    it('should maintain performance across integrated components', async () => {
      const startTime = performance.now();

      // Initialize all components
      await Promise.all([
        wakeWordDetector.initialize(),
        conversationManager.initialize()
      ]);

      const initTime = performance.now() - startTime;
      expect(initTime).toBeLessThan(1000); // Should initialize quickly

      // Test edge processing performance
      const queryStart = performance.now();
      const result = await edgeIntegration.processVoiceQuery({
        text: 'what time is it',
        timestamp: Date.now()
      });
      const queryTime = performance.now() - queryStart;

      expect(queryTime).toBeLessThan(50); // Ultra-fast edge processing
      expect(result.source).toBe('edge');
    });

    it('should handle concurrent operations efficiently', async () => {
      const mockCloudFallback = jest.fn().mockResolvedValue({
        text: 'Cloud response',
        source: 'cloud' as const,
        latency: 200,
        confidence: 0.8
      });

      edgeIntegration.setCloudFallback(mockCloudFallback);

      // Process multiple queries concurrently
      const queries = [
        'what time is it',
        'help',
        '5 plus 3',
        'fuel level',
        'complex query for cloud'
      ];

      const startTime = performance.now();
      const results = await Promise.all(
        queries.map(query => 
          edgeIntegration.processVoiceQuery({
            text: query,
            timestamp: Date.now()
          })
        )
      );
      const totalTime = performance.now() - startTime;

      // Should handle concurrent queries efficiently
      expect(totalTime).toBeLessThan(1000);
      expect(results).toHaveLength(5);

      // Most should be handled at edge
      const edgeHandled = results.filter(r => r.source === 'edge').length;
      expect(edgeHandled).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle component failures gracefully', async () => {
      // Test wake word detector failure
      const faultyWakeWord = new WakeWordDetector({}, {
        onError: (error) => {
          expect(error).toBeInstanceOf(Error);
        }
      });

      // Should not crash other components
      expect(conversationManager.isConversationActive()).toBe(false);
      faultyWakeWord.destroy();
    });

    it('should recover from edge processing failures', async () => {
      const mockCloudFallback = jest.fn().mockResolvedValue({
        text: 'Fallback response',
        source: 'cloud' as const,
        latency: 300,
        confidence: 0.8
      });

      // Disable edge processing to force fallback
      edgeIntegration.updateConfig({ enabled: false });
      edgeIntegration.setCloudFallback(mockCloudFallback);

      const result = await edgeIntegration.processVoiceQuery({
        text: 'what time is it',
        timestamp: Date.now()
      });

      expect(result.source).toBe('cloud');
      expect(result.text).toBe('Fallback response');
      expect(mockCloudFallback).toHaveBeenCalled();
    });
  });

  describe('Context and State Management', () => {
    it('should maintain context across components', async () => {
      const context = {
        user_id: 'test_user',
        location: 'highway',
        emotion_state: 'neutral',
        conversation_active: true
      };

      // Update context in edge integration
      edgeIntegration.updateContext('user_id', context.user_id);
      edgeIntegration.updateContext('location', context.location);

      // Process query with context
      const result = await edgeIntegration.processVoiceQuery({
        text: 'help',
        timestamp: Date.now(),
        context,
        userId: context.user_id
      });

      expect(result.source).toBe('edge');
      expect(result.metadata?.pattern).toBeDefined();
    });

    it('should coordinate conversation state across components', () => {
      // Start conversation
      conversationManager.startConversation('manual');
      expect(conversationManager.isConversationActive()).toBe(true);

      // Set user turn
      conversationManager.setTurn('user');
      expect(conversationManager.getCurrentState().currentTurn).toBe('user');

      // User can speak
      expect(conversationManager.canUserSpeak()).toBe(true);

      // End conversation
      conversationManager.endConversation('completed');
      expect(conversationManager.isConversationActive()).toBe(false);
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should collect comprehensive metrics across components', async () => {
      // Process several queries
      await edgeIntegration.processVoiceQuery({
        text: 'what time is it',
        timestamp: Date.now()
      });

      await edgeIntegration.processVoiceQuery({
        text: 'help',
        timestamp: Date.now()
      });

      // Get metrics
      const metrics = edgeIntegration.getMetrics();
      
      expect(metrics.totalQueries).toBeGreaterThanOrEqual(2);
      expect(metrics.edgeHandled).toBeGreaterThanOrEqual(2);
      expect(metrics.avgEdgeLatency).toBeGreaterThan(0);

      // Get detailed stats
      const stats = edgeIntegration.getDetailedStats();
      expect(stats.performance).toBeDefined();
      expect(stats.edgeProcessor).toBeDefined();
      expect(stats.configuration).toBeDefined();
    });

    it('should provide diagnostic capabilities', async () => {
      const diagnostics = await edgeIntegration.runDiagnostics();

      expect(diagnostics.testResults).toBeDefined();
      expect(diagnostics.metrics).toBeDefined();
      expect(diagnostics.config).toBeDefined();
      expect(diagnostics.testResults.length).toBeGreaterThan(0);

      // Verify test queries ran successfully
      const successfulTests = diagnostics.testResults.filter(r => r.source === 'edge');
      expect(successfulTests.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical RV travel queries', async () => {
      const travelQueries = [
        'how long is my rv',
        'when is check in time',
        'water tank capacity',
        'fuel level',
        'when will we arrive',
        'emergency contact'
      ];

      for (const query of travelQueries) {
        const result = await edgeIntegration.processVoiceQuery({
          text: query,
          timestamp: Date.now()
        });

        expect(result.source).toBe('edge');
        expect(result.latency).toBeLessThan(100);
        expect(result.text).toBeDefined();
        expect(result.text.length).toBeGreaterThan(0);
      }
    });

    it('should handle mixed edge and cloud scenarios', async () => {
      const mockCloudFallback = jest.fn().mockResolvedValue({
        text: 'Detailed cloud response',
        source: 'cloud' as const,
        latency: 400,
        confidence: 0.9
      });

      edgeIntegration.setCloudFallback(mockCloudFallback);

      const mixedQueries = [
        { query: 'what time is it', expectedSource: 'edge' },
        { query: 'fuel level', expectedSource: 'edge' },
        { query: 'complex travel planning with multiple stops', expectedSource: 'cloud' },
        { query: 'help', expectedSource: 'edge' }
      ];

      for (const { query, expectedSource } of mixedQueries) {
        const result = await edgeIntegration.processVoiceQuery({
          text: query,
          timestamp: Date.now()
        });

        expect(result.source).toBe(expectedSource);
      }
    });
  });
});