/**
 * PAM Advanced Features Integration Guide
 * 
 * This file demonstrates how to integrate the Context Management (Day 22) 
 * and Response Caching (Day 23) systems for optimal PAM performance.
 */

import { createContextSystem, CONTEXT_CONFIGS } from './context';
import { cacheIntegration, useCachedApi, useCacheStats } from './cache/cacheIntegration';
import type { EnhancedMessage } from './context/contextManager';

// =====================================================
// COMPLETE PAM INTEGRATION EXAMPLE
// =====================================================

export class AdvancedPAMService {
  private contextSystem: ReturnType<typeof createContextSystem>;
  private userId: string;
  private conversationId: string;

  constructor(userId: string, conversationId: string) {
    this.userId = userId;
    this.conversationId = conversationId;
    
    // Initialize context system with advanced configuration
    this.contextSystem = createContextSystem(userId, conversationId, CONTEXT_CONFIGS.advanced);
  }

  /**
   * Initialize the complete PAM service
   */
  async initialize(existingMessages?: any[]) {
    // Initialize context management
    await this.contextSystem.initialize(existingMessages);
    
    // Preload common data into cache for better performance
    await cacheIntegration.preloadCommonData();
    
    return this;
  }

  /**
   * Send message to Claude with full context and caching
   */
  async sendMessage(content: string, options?: {
    skipCache?: boolean;
    importance?: number;
    topics?: string[];
  }): Promise<{
    response: string;
    performance: {
      cacheHit: boolean;
      tokenCount: number;
      responseTime: number;
      apiReductionRate: number;
    };
  }> {
    const startTime = Date.now();

    // Add user message to context
    const userMessage: EnhancedMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      topics: options?.topics || [],
      entities: [], // Would be enhanced by NLP
      importance: options?.importance || 0.7,
      contextRelevance: 0.8,
      messageType: 'user',
      createdAt: new Date(),
      metadata: {},
      tokenCount: 0 // Will be calculated by context system
    };

    await this.contextSystem.addMessage(userMessage);

    // Get optimized context for Claude API
    const context = this.contextSystem.getOptimizedContext();
    const tokenCount = context.reduce((sum, msg) => sum + (msg.tokenCount || 0), 0);

    // Try cache first (unless explicitly skipping)
    const cacheKey = `claude-response:${this.conversationId}:${Date.now()}`;
    let response: string;
    let cacheHit = false;

    if (!options?.skipCache) {
      // Use cached API call wrapper
      const cachedResponse = await cacheIntegration.cachedApiCall(
        () => this.callClaudeAPI(context),
        {
          endpoint: '/api/v1/claude/chat',
          params: { context: context.slice(-5) }, // Cache based on recent context
          method: 'POST',
          ttl: 60 * 60 * 1000, // 1 hour
          tags: ['claude-response', 'conversation'],
          userSpecific: true,
          bypassCache: false
        }
      );

      response = cachedResponse;
      cacheHit = true;
    } else {
      response = await this.callClaudeAPI(context);
      cacheHit = false;
    }

    // Add Claude's response to context
    const claudeMessage: EnhancedMessage = {
      id: `msg-${Date.now()}-response`,
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      topics: [], // Would be enhanced by NLP
      entities: [],
      importance: 0.8,
      contextRelevance: 0.9,
      messageType: 'assistant',
      createdAt: new Date(),
      metadata: { responseTime: Date.now() - startTime },
      tokenCount: 0
    };

    await this.contextSystem.addMessage(claudeMessage);

    // Get performance metrics
    const cachePerformance = cacheIntegration.getCachePerformance();
    const responseTime = Date.now() - startTime;

    return {
      response,
      performance: {
        cacheHit,
        tokenCount,
        responseTime,
        apiReductionRate: cachePerformance.apiReductionRate
      }
    };
  }

  /**
   * Mock Claude API call (replace with actual implementation)
   */
  private async callClaudeAPI(context: any[]): Promise<string> {
    // This would be replaced with actual Claude API integration
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API delay
    
    return `Mock Claude response for conversation with ${context.length} messages in context.`;
  }

  /**
   * Get comprehensive system statistics
   */
  getSystemStats() {
    const contextStats = this.contextSystem.getSystemStats();
    const cachePerformance = cacheIntegration.getCachePerformance();
    
    return {
      context: contextStats,
      cache: cachePerformance,
      overall: {
        efficiency: contextStats.context.tokenEfficiency,
        apiReduction: cachePerformance.apiReductionRate,
        targetAchieved: cachePerformance.apiReductionRate >= 0.3,
        memoryUsage: contextStats.context.messageCount * 0.5 // Rough estimate in KB
      }
    };
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(): string {
    const stats = this.getSystemStats();
    const cacheReport = cacheIntegration.generatePerformanceReport();
    
    return `
# PAM Advanced Features Performance Report

## System Overview
- **Conversation ID**: ${this.conversationId}
- **User ID**: ${this.userId}
- **Generated**: ${new Date().toISOString()}

## Context Management
- **Messages in Context**: ${stats.context.context.messageCount}
- **Token Usage**: ${stats.context.tokenUsage.current.toLocaleString()} / ${stats.context.tokenUsage.limit.toLocaleString()} (${(stats.context.tokenUsage.utilization * 100).toFixed(1)}%)
- **Token Efficiency**: ${(stats.context.context.tokenEfficiency * 100).toFixed(1)}%
- **Active Branches**: ${stats.context.branches?.totalBranches || 0}

## Cache Performance
${cacheReport}

## Overall Performance
- **System Efficiency**: ${(stats.overall.efficiency * 100).toFixed(1)}%
- **API Reduction**: ${(stats.overall.apiReduction * 100).toFixed(1)}% ${stats.overall.targetAchieved ? '✅' : '⚠️'}
- **Memory Usage**: ~${stats.overall.memoryUsage.toFixed(1)}KB
- **Status**: ${stats.overall.targetAchieved ? 'TARGET ACHIEVED 🎯' : 'TARGET IN PROGRESS 🔄'}

## Recommendations
${stats.overall.apiReduction < 0.3 ? 
  '- Consider enabling more aggressive caching for common queries\n- Review conversation patterns for optimization opportunities' : 
  '- System performing optimally\n- Monitor for performance degradation over time'}
    `.trim();
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this.contextSystem.dispose();
  }
}

// =====================================================
// REACT HOOK FOR COMPLETE INTEGRATION
// =====================================================

export function useAdvancedPAM(userId: string, conversationId: string) {
  const [pamService, setPamService] = React.useState<AdvancedPAMService | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [performance, setPerformance] = React.useState<any>(null);
  
  const cachedApi = useCachedApi();
  const cacheStats = useCacheStats();

  React.useEffect(() => {
    const initializeService = async () => {
      const service = new AdvancedPAMService(userId, conversationId);
      await service.initialize();
      
      setPamService(service);
      setIsInitialized(true);
      setPerformance(service.getSystemStats());
    };

    initializeService();

    return () => {
      pamService?.dispose();
    };
  }, [userId, conversationId]);

  const sendMessage = async (content: string, options?: any) => {
    if (!pamService) throw new Error('PAM service not initialized');
    
    const result = await pamService.sendMessage(content, options);
    setPerformance(pamService.getSystemStats());
    
    return result;
  };

  const getPerformanceReport = () => {
    return pamService?.generateReport() || '';
  };

  return {
    isInitialized,
    sendMessage,
    performance,
    cacheStats: cacheStats.stats,
    cacheReport: cacheStats.report,
    getPerformanceReport,
    invalidateCache: cachedApi.invalidateByAction,
    isServiceAvailable: isInitialized && cacheStats.isAvailable
  };
}

// =====================================================
// USAGE EXAMPLES
// =====================================================

/**
 * Example 1: Basic Integration
 */
export async function exampleBasicIntegration() {
  const pamService = new AdvancedPAMService('user-123', 'conversation-456');
  await pamService.initialize();

  // Send message with full context and caching
  const result = await pamService.sendMessage('Plan a trip to Tokyo', {
    importance: 0.9,
    topics: ['travel', 'international', 'asia']
  });

  console.log('Response:', result.response);
  console.log('Performance:', result.performance);
  console.log('Cache Hit:', result.performance.cacheHit);
  console.log('API Reduction Rate:', result.performance.apiReductionRate);

  // Get comprehensive report
  const report = pamService.generateReport();
  console.log(report);

  pamService.dispose();
}

/**
 * Example 2: React Component Integration
 */
export function PAMChatComponent({ userId, conversationId }: { 
  userId: string; 
  conversationId: string; 
}) {
  const {
    isInitialized,
    sendMessage,
    performance,
    getPerformanceReport,
    isServiceAvailable
  } = useAdvancedPAM(userId, conversationId);

  const [message, setMessage] = React.useState('');
  const [response, setResponse] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSendMessage = async () => {
    if (!message.trim() || !isServiceAvailable) return;

    setLoading(true);
    try {
      const result = await sendMessage(message);
      setResponse(result.response);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized) {
    return <div>Initializing PAM Advanced Features...</div>;
  }

  return (
    <div>
      <div>
        <h3>PAM Chat</h3>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your message..."
          disabled={loading}
        />
        <button onClick={handleSendMessage} disabled={loading || !isServiceAvailable}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
      
      {response && (
        <div>
          <h4>Response:</h4>
          <p>{response}</p>
        </div>
      )}

      {performance && (
        <div>
          <h4>Performance:</h4>
          <p>API Reduction: {(performance.cache.apiReductionRate * 100).toFixed(1)}%</p>
          <p>Token Efficiency: {(performance.overall.efficiency * 100).toFixed(1)}%</p>
          <p>Target Achieved: {performance.overall.targetAchieved ? '✅' : '❌'}</p>
        </div>
      )}

      <details>
        <summary>Performance Report</summary>
        <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '10px' }}>
          {getPerformanceReport()}
        </pre>
      </details>
    </div>
  );
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  AdvancedPAMService,
  useAdvancedPAM,
  exampleBasicIntegration
};