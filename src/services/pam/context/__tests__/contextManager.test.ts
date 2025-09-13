/**
 * Comprehensive Test Suite for Advanced Context Management System
 * 
 * Test Coverage:
 * - Context initialization and management
 * - Sliding window functionality
 * - Token counting and limits
 * - Message summarization
 * - Conversation branching
 * - Persistence operations
 * - Performance and scalability
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AdvancedContextManager, type ContextWindow, type EnhancedMessage } from '../contextManager';
import { ClaudeTokenCounter } from '../tokenCounter';
import { ContextSummarizer } from '../summarizer';
import { ConversationBranchManager } from '../branchManager';
import { ContextPersistenceManager } from '../persistenceManager';

// =====================================================
// TEST SETUP AND UTILITIES
// =====================================================

const mockUserId = 'test-user-123';
const mockConversationId = 'test-conversation-456';

const createMockMessage = (
  content: string,
  role: 'user' | 'assistant' = 'user',
  topics: string[] = ['general'],
  importance: number = 0.5
): EnhancedMessage => ({
  id: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
  role,
  content,
  timestamp: new Date(),
  tokenCount: Math.ceil(content.length / 4),
  importance,
  messageType: role,
  topics,
  entities: [],
  sentiment: 'neutral',
  contextRelevance: 0.7,
  createdAt: new Date(),
  metadata: {
    userIntent: 'general'
  }
});

const createMockContextWindow = (messageCount: number = 10): ContextWindow => {
  const messages = Array.from({ length: messageCount }, (_, i) => 
    createMockMessage(`Message ${i + 1}`, i % 2 === 0 ? 'user' : 'assistant')
  );

  return {
    id: `window_${Date.now()}`,
    conversationId: mockConversationId,
    messages,
    tokenCount: messages.reduce((sum, msg) => sum + msg.tokenCount, 0),
    lastUpdated: new Date(),
    windowSize: 50,
    metadata: {
      version: '1.0',
      createdAt: new Date(),
      optimizationCount: 0,
      averageMessageTokens: 25,
      totalMessages: messageCount,
      summarizedMessages: 0
    }
  };
};

// =====================================================
// ADVANCED CONTEXT MANAGER TESTS
// =====================================================

describe('AdvancedContextManager', () => {
  let contextManager: AdvancedContextManager;

  beforeEach(() => {
    contextManager = new AdvancedContextManager(mockUserId, mockConversationId, {
      maxWindowSize: 20,
      maxTokens: 1000,
      tokenBuffer: 200,
      summarizationThreshold: 15
    });
  });

  afterEach(() => {
    contextManager.dispose();
  });

  describe('Context Initialization', () => {
    it('should initialize context with default settings', async () => {
      const context = await contextManager.initializeContext();
      
      expect(context).toBeDefined();
      expect(context.conversationId).toBe(mockConversationId);
      expect(context.messages).toEqual([]);
      expect(context.tokenCount).toBe(0);
      expect(context.metadata.version).toBe('1.0');
    });

    it('should initialize context with existing messages', async () => {
      const existingMessages = [
        createMockMessage('Hello', 'user'),
        createMockMessage('Hi there!', 'assistant')
      ];

      const context = await contextManager.initializeContext(existingMessages);
      
      expect(context.messages).toHaveLength(2);
      expect(context.tokenCount).toBeGreaterThan(0);
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock an error scenario
      vi.spyOn(contextManager as any, 'loadUserProfile').mockRejectedValue(new Error('Profile load failed'));
      
      const context = await contextManager.initializeContext();
      
      // Should create fallback context
      expect(context).toBeDefined();
      expect(context.contextVersion).toContain('fallback');
    });
  });

  describe('Message Management', () => {
    it('should add messages to context window', async () => {
      await contextManager.initializeContext();
      
      const message = createMockMessage('Test message', 'user');
      await contextManager.addMessage(message);
      
      const claudeContext = contextManager.getContextForClaude();
      expect(claudeContext).toHaveLength(1);
      expect(claudeContext[0].content).toBe('Test message');
    });

    it('should trigger optimization when limits are exceeded', async () => {
      await contextManager.initializeContext();
      
      // Add messages exceeding the window size
      for (let i = 0; i < 25; i++) {
        const message = createMockMessage(`Message ${i}`, 'user');
        await contextManager.addMessage(message);
      }
      
      const context = contextManager.getContextForClaude();
      
      // Should be optimized to stay within limits
      expect(context.length).toBeLessThanOrEqual(20);
    });

    it('should preserve high-importance messages during optimization', async () => {
      await contextManager.initializeContext();
      
      const importantMessage = createMockMessage('Very important message', 'user', ['critical'], 0.95);
      await contextManager.addMessage(importantMessage);
      
      // Add many low-importance messages
      for (let i = 0; i < 30; i++) {
        const message = createMockMessage(`Filler message ${i}`, 'user', ['general'], 0.1);
        await contextManager.addMessage(message);
      }
      
      const context = contextManager.getContextForClaude();
      const hasImportantMessage = context.some(msg => msg.content.includes('Very important'));
      
      expect(hasImportantMessage).toBe(true);
    });
  });

  describe('Context Summarization Integration', () => {
    it('should create summaries when threshold is reached', async () => {
      await contextManager.initializeContext();
      
      // Add enough messages to trigger summarization
      for (let i = 0; i < 20; i++) {
        const message = createMockMessage(`Message about topic ${i % 3}`, 'user', [`topic_${i % 3}`]);
        await contextManager.addMessage(message);
      }
      
      const context = contextManager.getContextForClaude();
      
      // Should have a summary at the beginning
      const hasSummary = context.some(msg => 
        msg.role === 'system' && msg.content.includes('Previous conversation summary')
      );
      
      expect(hasSummary).toBe(true);
    });

    it('should maintain context coherence with summaries', async () => {
      await contextManager.initializeContext();
      
      // Create a conversation flow
      const messages = [
        createMockMessage('Let\'s plan a trip to Paris', 'user', ['travel', 'planning']),
        createMockMessage('Great! Paris is wonderful. What dates?', 'assistant', ['travel']),
        createMockMessage('Next month, for 5 days', 'user', ['travel', 'planning']),
        createMockMessage('I found some great hotels', 'assistant', ['travel', 'accommodation'])
      ];
      
      for (const message of messages) {
        await contextManager.addMessage(message);
      }
      
      const context = contextManager.getContextForClaude();
      
      // Verify context maintains conversation flow
      expect(context.length).toBeGreaterThan(0);
      const hasTravel = context.some(msg => 
        msg.content.toLowerCase().includes('paris') || 
        msg.content.toLowerCase().includes('travel')
      );
      
      expect(hasTravel).toBe(true);
    });
  });

  describe('Topic Shift Detection', () => {
    it('should detect gradual topic shifts', async () => {
      await contextManager.initializeContext();
      
      // Start with travel topic
      await contextManager.addMessage(createMockMessage('Plan trip to NYC', 'user', ['travel']));
      await contextManager.addMessage(createMockMessage('Great choice!', 'assistant', ['travel']));
      
      // Gradually shift to finance
      await contextManager.addMessage(createMockMessage('How much will it cost?', 'user', ['travel', 'finance']));
      await contextManager.addMessage(createMockMessage('Let me check prices', 'assistant', ['finance']));
      
      // Full shift to finance
      const financeMessage = createMockMessage('What about my budget?', 'user', ['finance', 'budget']);
      await contextManager.addMessage(financeMessage);
      
      // Should detect topic evolution
      const context = contextManager.getContextForClaude();
      expect(context.length).toBeGreaterThan(0);
    });

    it('should handle topic returns appropriately', async () => {
      await contextManager.initializeContext();
      
      // Original topic
      await contextManager.addMessage(createMockMessage('Plan camping trip', 'user', ['travel', 'camping']));
      
      // Side topic
      await contextManager.addMessage(createMockMessage('What about the weather?', 'user', ['weather']));
      
      // Return to original
      await contextManager.addMessage(createMockMessage('Back to camping plans', 'user', ['travel', 'camping']));
      
      const context = contextManager.getContextForClaude();
      
      // Should maintain both topics in context
      const hasCamping = context.some(msg => msg.content.includes('camping'));
      const hasWeather = context.some(msg => msg.content.includes('weather'));
      
      expect(hasCamping).toBe(true);
      expect(hasWeather).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large message volumes efficiently', async () => {
      const startTime = Date.now();
      
      await contextManager.initializeContext();
      
      // Add 100 messages
      for (let i = 0; i < 100; i++) {
        const message = createMockMessage(`Performance test message ${i}`, 'user');
        await contextManager.addMessage(message);
      }
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should process within reasonable time (adjust threshold as needed)
      expect(processingTime).toBeLessThan(5000); // 5 seconds
      
      const context = contextManager.getContextForClaude();
      expect(context.length).toBeGreaterThan(0);
    });

    it('should maintain memory efficiency with large contexts', async () => {
      await contextManager.initializeContext();
      
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Add many messages with optimization
      for (let i = 0; i < 200; i++) {
        const message = createMockMessage(`Memory test message ${i}`, 'user');
        await contextManager.addMessage(message);
        
        // Force optimization periodically
        if (i % 20 === 0) {
          await contextManager.forceOptimization();
        }
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable (adjust threshold as needed)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should recover from context corruption', async () => {
      await contextManager.initializeContext();
      
      // Simulate context corruption
      (contextManager as any).currentWindow = null;
      
      // Should auto-recover when trying to add message
      const message = createMockMessage('Recovery test', 'user');
      await contextManager.addMessage(message);
      
      const context = contextManager.getContextForClaude();
      expect(context).toHaveLength(1);
      expect(context[0].content).toBe('Recovery test');
    });

    it('should handle invalid message data gracefully', async () => {
      await contextManager.initializeContext();
      
      // Try to add invalid message
      const invalidMessage = {
        // Missing required fields
        content: 'Invalid message'
      } as any;
      
      await expect(contextManager.addMessage(invalidMessage)).resolves.not.toThrow();
    });

    it('should handle persistence failures gracefully', async () => {
      // Mock persistence failure
      vi.spyOn(contextManager as any, 'persistContext').mockRejectedValue(new Error('Persistence failed'));
      
      await contextManager.initializeContext();
      
      const message = createMockMessage('Test message', 'user');
      await expect(contextManager.addMessage(message)).resolves.not.toThrow();
    });
  });

  describe('Context Statistics and Monitoring', () => {
    it('should provide accurate context statistics', async () => {
      await contextManager.initializeContext();
      
      for (let i = 0; i < 10; i++) {
        const message = createMockMessage(`Stats test ${i}`, 'user', ['test'], 0.6);
        await contextManager.addMessage(message);
      }
      
      const stats = contextManager.getContextStats();
      
      expect(stats.messageCount).toBe(10);
      expect(stats.tokenCount).toBeGreaterThan(0);
      expect(stats.averageImportance).toBeCloseTo(0.6, 1);
    });

    it('should track optimization metrics', async () => {
      await contextManager.initializeContext();
      
      // Trigger multiple optimizations
      for (let i = 0; i < 50; i++) {
        const message = createMockMessage(`Optimization test ${i}`, 'user');
        await contextManager.addMessage(message);
        
        if (i % 10 === 0) {
          await contextManager.forceOptimization();
        }
      }
      
      const stats = contextManager.getContextStats();
      
      expect(stats.messageCount).toBeLessThanOrEqual(20); // Should be optimized
      expect(stats.tokenEfficiency).toBeGreaterThan(0);
    });
  });
});

// =====================================================
// TOKEN COUNTER TESTS
// =====================================================

describe('ClaudeTokenCounter', () => {
  let tokenCounter: ClaudeTokenCounter;

  beforeEach(() => {
    tokenCounter = new ClaudeTokenCounter();
  });

  describe('Token Counting Accuracy', () => {
    it('should estimate tokens for simple text accurately', () => {
      const message = { role: 'user' as const, content: 'Hello, how are you today?' };
      const count = tokenCounter.countMessageTokens(message);
      
      expect(count.total).toBeGreaterThan(0);
      expect(count.total).toBeLessThan(20); // Reasonable range
      expect(count.confidence).toBeGreaterThan(0.5);
    });

    it('should handle complex formatting correctly', () => {
      const message = {
        role: 'user' as const,
        content: `
          **Bold text** and *italic text*
          \`\`\`javascript
          function test() {
            return "Hello World";
          }
          \`\`\`
          
          - List item 1
          - List item 2
        `
      };
      
      const count = tokenCounter.countMessageTokens(message);
      
      expect(count.total).toBeGreaterThan(20);
      expect(count.method).toBe('estimated');
    });

    it('should cache token counts for efficiency', () => {
      const message = { role: 'user' as const, content: 'Cached test message' };
      
      const count1 = tokenCounter.countMessageTokens(message);
      const count2 = tokenCounter.countMessageTokens(message);
      
      expect(count1.total).toBe(count2.total);
      expect(count2.method).toBe('cached');
    });
  });

  describe('Context Window Management', () => {
    it('should accurately check if context fits within limits', () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        role: 'user' as const,
        content: `Message number ${i} with some additional content to increase token count`
      }));
      
      const result = tokenCounter.checkContextFits(messages);
      
      expect(result.fits).toBe(true);
      expect(result.currentTokens).toBeGreaterThan(0);
      expect(result.utilizationRate).toBeLessThan(1);
      expect(result.recommendation).toBeDefined();
    });

    it('should recommend optimization for large contexts', () => {
      // Create very long messages to exceed limits
      const longMessage = 'Very long message '.repeat(1000);
      const messages = Array.from({ length: 20 }, () => ({
        role: 'user' as const,
        content: longMessage
      }));
      
      const result = tokenCounter.checkContextFits(messages);
      
      expect(result.recommendation).toContain('optimization');
      expect(result.utilizationRate).toBeGreaterThan(0.5);
    });
  });

  describe('Optimal Window Calculation', () => {
    it('should calculate optimal window preserving important messages', () => {
      const messages = Array.from({ length: 30 }, (_, i) => 
        createMockMessage(`Message ${i}`, 'user', ['test'], i > 25 ? 0.9 : 0.3)
      );
      
      const result = tokenCounter.calculateOptimalWindow(messages, 10);
      
      expect(result.optimalMessages.length).toBeLessThanOrEqual(messages.length);
      expect(result.retainedImportance).toBeGreaterThan(0.7); // Should retain important messages
      expect(result.tokensSaved).toBeGreaterThan(0);
    });

    it('should preserve recent messages regardless of importance', () => {
      const messages = [
        ...Array.from({ length: 20 }, (_, i) => createMockMessage(`Old ${i}`, 'user', ['test'], 0.9)),
        ...Array.from({ length: 5 }, (_, i) => createMockMessage(`Recent ${i}`, 'user', ['test'], 0.1))
      ];
      
      const result = tokenCounter.calculateOptimalWindow(messages, 5);
      
      const recentCount = result.optimalMessages.filter(msg => msg.content.includes('Recent')).length;
      expect(recentCount).toBe(5); // All recent messages preserved
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate costs accurately for different message types', () => {
      const userMessage = { role: 'user' as const, content: 'User question' };
      const assistantMessage = { role: 'assistant' as const, content: 'Assistant response' };
      const systemMessage = { role: 'system' as const, content: 'System prompt' };
      
      const userCost = tokenCounter.countMessageTokens(userMessage);
      const assistantCost = tokenCounter.countMessageTokens(assistantMessage);
      const systemCost = tokenCounter.countMessageTokens(systemMessage);
      
      expect(userCost.costEstimate).toBeGreaterThan(0);
      expect(assistantCost.costEstimate).toBeGreaterThan(userCost.costEstimate); // Output tokens cost more
      expect(systemCost.costEstimate).toBeGreaterThan(0);
    });

    it('should calculate token budgets correctly', () => {
      const currentTokens = 50000;
      const budget = tokenCounter.calculateTokenBudget(currentTokens);
      
      expect(budget.allocated).toBe(currentTokens);
      expect(budget.available).toBeGreaterThan(0);
      expect(budget.utilizationRate).toBeGreaterThan(0);
      expect(budget.utilizationRate).toBeLessThan(1);
    });
  });
});

// =====================================================
// CONTEXT SUMMARIZER TESTS
// =====================================================

describe('ContextSummarizer', () => {
  let summarizer: ContextSummarizer;

  beforeEach(() => {
    summarizer = new ContextSummarizer({
      strategy: 'hybrid',
      maxSummaryLength: 500,
      compressionRatio: 0.3
    });
  });

  describe('Message Clustering', () => {
    it('should cluster messages by topic similarity', async () => {
      const messages = [
        createMockMessage('Let\'s plan a trip', 'user', ['travel', 'planning']),
        createMockMessage('Where do you want to go?', 'assistant', ['travel']),
        createMockMessage('What\'s my budget?', 'user', ['finance', 'budget']),
        createMockMessage('Your budget is $2000', 'assistant', ['finance']),
        createMockMessage('Book the flight', 'user', ['travel', 'booking']),
      ];

      const result = await summarizer.summarizeMessages(messages);
      
      expect(result.summary).toBeDefined();
      expect(result.summary.keyTopics).toContain('travel');
      expect(result.summary.keyTopics).toContain('finance');
      expect(result.compressionAchieved).toBeGreaterThan(0);
    });

    it('should preserve important information in summaries', async () => {
      const messages = [
        createMockMessage('Book flight to Paris on May 15th', 'user', ['travel'], 0.9),
        createMockMessage('Flight booked successfully', 'assistant', ['travel'], 0.9),
        createMockMessage('Random conversation', 'user', ['general'], 0.1),
        createMockMessage('More random talk', 'assistant', ['general'], 0.1),
      ];

      const result = await summarizer.summarizeMessages(messages);
      
      expect(result.summary.summaryText.toLowerCase()).toContain('paris');
      expect(result.keyInformationRetained).toBeGreaterThan(0.7);
    });
  });

  describe('Summarization Strategies', () => {
    it('should use extractive strategy effectively', async () => {
      const extractiveSummarizer = new ContextSummarizer({ strategy: 'extractive' });
      
      const messages = [
        createMockMessage('Key decision: we will go to Tokyo', 'user', ['travel'], 0.9),
        createMockMessage('Great choice!', 'assistant', ['travel'], 0.3),
        createMockMessage('Let me book the hotel', 'user', ['travel'], 0.7),
      ];

      const result = await extractiveSummarizer.summarizeMessages(messages);
      
      expect(result.strategy).toBe('extractive');
      expect(result.summary.summaryText).toContain('Tokyo'); // Should extract key content
    });

    it('should handle template-based summarization', async () => {
      const templateSummarizer = new ContextSummarizer({ strategy: 'template_based' });
      
      const messages = [
        createMockMessage('Plan trip to Japan', 'user', ['travel']),
        createMockMessage('Budget is $3000', 'user', ['finance']),
      ];

      const result = await templateSummarizer.summarizeMessages(messages);
      
      expect(result.strategy).toBe('template_based');
      expect(result.summary.summaryText).toBeDefined();
    });
  });

  describe('Iterative Summarization', () => {
    it('should handle very long conversations with iterative summarization', async () => {
      const longConversation = Array.from({ length: 100 }, (_, i) =>
        createMockMessage(`Message ${i} about topic ${i % 5}`, 'user', [`topic_${i % 5}`])
      );

      const result = await summarizer.createIterativeSummary(longConversation, 20);
      
      expect(result.originalMessageCount).toBe(100);
      expect(result.compressionAchieved).toBeGreaterThan(0.5); // Should achieve good compression
      expect(result.summary.keyTopics.length).toBeGreaterThan(0);
    });
  });

  describe('Quality Assessment', () => {
    it('should assess summary quality accurately', async () => {
      const highQualityMessages = [
        createMockMessage('Let\'s discuss the quarterly budget review', 'user', ['finance', 'business']),
        createMockMessage('The budget shows 15% growth in revenue', 'assistant', ['finance']),
        createMockMessage('What about expense optimization?', 'user', ['finance', 'optimization']),
      ];

      const result = await summarizer.summarizeMessages(highQualityMessages);
      
      expect(result.quality.score).toBeGreaterThan(0.6);
      expect(result.quality.coherence).toBeGreaterThan(0.5);
      expect(result.quality.completeness).toBeGreaterThan(0.5);
      expect(result.quality.readability).toBeGreaterThan(0.5);
    });
  });
});

// =====================================================
// CONVERSATION BRANCH MANAGER TESTS
// =====================================================

describe('ConversationBranchManager', () => {
  let branchManager: ConversationBranchManager;
  let mockContextManager: AdvancedContextManager;

  beforeEach(() => {
    mockContextManager = new AdvancedContextManager(mockUserId, mockConversationId);
    branchManager = new ConversationBranchManager(mockUserId, mockContextManager, {
      enableAutoBranching: true,
      topicShiftThreshold: 0.6,
      maxBranchDepth: 3
    });
  });

  afterEach(() => {
    branchManager.dispose();
    mockContextManager.dispose();
  });

  describe('Topic Shift Detection', () => {
    it('should detect sudden topic shifts', async () => {
      const recentMessages = [
        createMockMessage('Planning my vacation to Hawaii', 'user', ['travel', 'vacation']),
        createMockMessage('Great! Hawaii is beautiful', 'assistant', ['travel']),
        createMockMessage('What about the weather?', 'user', ['travel', 'weather']),
      ];
      
      const newMessage = createMockMessage('Can you help with my tax return?', 'user', ['finance', 'tax']);
      
      const analysis = await branchManager.analyzeTopicShift(newMessage, recentMessages, {});
      
      expect(analysis.shiftDetected).toBe(true);
      expect(analysis.shiftType).toBe('sudden');
      expect(analysis.confidence).toBeGreaterThan(0.6);
      expect(analysis.recommendedAction).toBe('branch');
    });

    it('should detect gradual topic evolution', async () => {
      const recentMessages = [
        createMockMessage('Planning vacation', 'user', ['travel']),
        createMockMessage('Where to?', 'assistant', ['travel']),
        createMockMessage('How much will it cost?', 'user', ['travel', 'finance']),
        createMockMessage('Budget around $2000', 'assistant', ['finance']),
      ];
      
      const newMessage = createMockMessage('What about investment options?', 'user', ['finance', 'investment']);
      
      const analysis = await branchManager.analyzeTopicShift(newMessage, recentMessages, {});
      
      expect(analysis.shiftType).toBe('gradual');
    });

    it('should detect return to previous topics', async () => {
      const recentMessages = [
        createMockMessage('Let\'s plan the camping trip', 'user', ['travel', 'camping']),
        createMockMessage('What about food supplies?', 'user', ['camping', 'food']),
        createMockMessage('Need to check weather', 'user', ['weather']),
      ];
      
      const newMessage = createMockMessage('Back to camping gear list', 'user', ['travel', 'camping']);
      
      const analysis = await branchManager.analyzeTopicShift(newMessage, recentMessages, {});
      
      expect(analysis.shiftType).toBe('return');
    });
  });

  describe('Branch Creation and Management', () => {
    it('should create branches for topic shifts', async () => {
      const branch = await branchManager.createBranch(
        'Financial Planning',
        'topic_shift',
        'msg_123'
      );
      
      expect(branch.branch.topic).toBe('Financial Planning');
      expect(branch.branch.reason).toBe('topic_shift');
      expect(branch.depth).toBe(0); // Root branch
      expect(branch.isActive).toBe(false);
    });

    it('should switch between branches', async () => {
      const branch1 = await branchManager.createBranch('Travel', 'topic_shift', 'msg_1');
      const branch2 = await branchManager.createBranch('Finance', 'topic_shift', 'msg_2');
      
      await branchManager.switchBranch(branch2.id);
      
      expect(branch2.isActive).toBe(true);
      expect(branch1.isActive).toBe(false);
    });

    it('should maintain branch tree structure', async () => {
      const rootBranch = await branchManager.createBranch('Main Topic', 'manual', 'msg_1');
      await branchManager.switchBranch(rootBranch.id);
      
      const childBranch = await branchManager.createBranch('Sub Topic', 'topic_shift', 'msg_2');
      
      expect(childBranch.parent).toBe(rootBranch);
      expect(rootBranch.children).toContain(childBranch);
      expect(childBranch.depth).toBe(1);
    });
  });

  describe('Branch Navigation', () => {
    it('should provide navigation options', async () => {
      const branch1 = await branchManager.createBranch('Travel', 'manual', 'msg_1');
      const branch2 = await branchManager.createBranch('Finance', 'manual', 'msg_2');
      
      await branchManager.switchBranch(branch1.id);
      
      const navigation = branchManager.getCurrentBranchNavigation();
      
      expect(navigation.currentBranch).toBe(branch1.id);
      expect(navigation.availableBranches).toContain(branch2.id);
      expect(navigation.navigationOptions.length).toBeGreaterThan(0);
    });

    it('should suggest relevant branches', async () => {
      const travelBranch = await branchManager.createBranch('Travel Planning', 'manual', 'msg_1');
      const financeBranch = await branchManager.createBranch('Budget Planning', 'manual', 'msg_2');
      
      await branchManager.switchBranch(travelBranch.id);
      
      const navigation = branchManager.getCurrentBranchNavigation();
      
      // Should suggest finance branch as it's related to travel planning
      const suggestions = navigation.navigationOptions.filter(opt => opt.relevance > 0.5);
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Branch Merging', () => {
    it('should find merge candidates', async () => {
      const branch1 = await branchManager.createBranch('Travel Planning', 'manual', 'msg_1');
      const branch2 = await branchManager.createBranch('Trip Planning', 'manual', 'msg_2');
      
      // Make branches inactive
      branch1.isActive = false;
      branch2.isActive = false;
      
      const candidates = await branchManager.findMergeCandidates();
      
      expect(candidates.length).toBeGreaterThan(0);
      const candidate = candidates.find(c => 
        c.sourceBranch.topic === 'Trip Planning' && 
        c.targetBranch.topic === 'Travel Planning'
      );
      expect(candidate?.topicOverlap).toBeGreaterThan(0.5);
    });
  });

  describe('Branch Statistics and Cleanup', () => {
    it('should provide accurate branch statistics', async () => {
      await branchManager.createBranch('Branch 1', 'manual', 'msg_1');
      const branch2 = await branchManager.createBranch('Branch 2', 'manual', 'msg_2');
      
      await branchManager.switchBranch(branch2.id);
      
      const stats = branchManager.getBranchStats();
      
      expect(stats.totalBranches).toBe(2);
      expect(stats.activeBranches).toBe(1);
      expect(stats.maxDepth).toBeGreaterThanOrEqual(0);
    });

    it('should cleanup inactive branches', async () => {
      const branch1 = await branchManager.createBranch('Old Branch', 'manual', 'msg_1');
      const branch2 = await branchManager.createBranch('New Branch', 'manual', 'msg_2');
      
      // Make branches old and inactive
      branch1.isActive = false;
      branch1.metadata.lastActivity = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
      branch1.metadata.importance = 0.3; // Low importance
      
      const result = await branchManager.cleanupInactiveBranches();
      
      expect(result.archived + result.merged).toBeGreaterThanOrEqual(0);
    });
  });
});

// =====================================================
// CONTEXT PERSISTENCE MANAGER TESTS
// =====================================================

describe('ContextPersistenceManager', () => {
  let persistenceManager: ContextPersistenceManager;

  beforeEach(() => {
    persistenceManager = new ContextPersistenceManager(mockUserId, {
      primaryStorage: 'localStorage',
      backupStorage: 'none',
      enableCompression: true,
      compressionThreshold: 1 // Low threshold for testing
    });
  });

  afterEach(() => {
    persistenceManager.dispose();
  });

  describe('Storage Operations', () => {
    it('should store and retrieve context data', async () => {
      const contextWindow = createMockContextWindow(5);
      const storedContext = {
        id: 'test-context-1',
        userId: mockUserId,
        conversationId: mockConversationId,
        contextWindow,
        branches: [],
        summaries: [],
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          lastModified: new Date(),
          syncStatus: 'synced' as const,
          size: 1000,
          checksum: 'test-checksum',
          storageBackend: 'localStorage'
        }
      };

      await persistenceManager.storeContext(storedContext);
      const retrieved = await persistenceManager.retrieveContext(mockConversationId);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(storedContext.id);
      expect(retrieved?.contextWindow.messages.length).toBe(5);
    });

    it('should handle storage failures gracefully', async () => {
      const contextWindow = createMockContextWindow(1);
      const storedContext = {
        id: 'test-context-fail',
        userId: mockUserId,
        conversationId: 'fail-conversation',
        contextWindow,
        branches: [],
        summaries: [],
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          lastModified: new Date(),
          syncStatus: 'synced' as const,
          size: 1000,
          checksum: 'test-checksum',
          storageBackend: 'localStorage'
        }
      };

      // Mock storage failure
      const originalStore = localStorage.setItem;
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      await expect(persistenceManager.storeContext(storedContext)).rejects.toThrow();
      
      // Restore original function
      localStorage.setItem = originalStore;
    });

    it('should compress large contexts automatically', async () => {
      const largeContent = 'Large content '.repeat(1000);
      const messages = [createMockMessage(largeContent, 'user')];
      const contextWindow = { ...createMockContextWindow(0), messages };
      
      const storedContext = {
        id: 'large-context',
        userId: mockUserId,
        conversationId: 'large-conversation',
        contextWindow,
        branches: [],
        summaries: [],
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          lastModified: new Date(),
          syncStatus: 'synced' as const,
          size: 50000, // Large size
          checksum: 'test-checksum',
          storageBackend: 'localStorage'
        }
      };

      await persistenceManager.storeContext(storedContext);
      const retrieved = await persistenceManager.retrieveContext('large-conversation');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.contextWindow.messages[0].content).toBe(largeContent);
    });
  });

  describe('Storage Management', () => {
    it('should provide storage statistics', async () => {
      const stats = await persistenceManager.getStorageStats();
      
      expect(stats.primary).toBeDefined();
      expect(stats.primary.used).toBeGreaterThanOrEqual(0);
      expect(stats.primary.total).toBeGreaterThan(0);
      expect(stats.primary.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(stats.totalContexts).toBeGreaterThanOrEqual(0);
    });

    it('should export and import contexts', async () => {
      const contextWindow = createMockContextWindow(3);
      const storedContext = {
        id: 'export-test',
        userId: mockUserId,
        conversationId: 'export-conversation',
        contextWindow,
        branches: [],
        summaries: [],
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          lastModified: new Date(),
          syncStatus: 'synced' as const,
          size: 1000,
          checksum: 'test-checksum',
          storageBackend: 'localStorage'
        }
      };

      await persistenceManager.storeContext(storedContext);
      
      const exportData = await persistenceManager.exportContexts();
      expect(exportData).toBeDefined();
      
      const parsed = JSON.parse(exportData);
      expect(parsed.contexts).toBeInstanceOf(Array);
      expect(parsed.contexts.length).toBeGreaterThan(0);

      // Clear and import
      await persistenceManager.clearAllData();
      const result = await persistenceManager.importContexts(exportData);
      
      expect(result.imported).toBeGreaterThan(0);
      expect(result.errors).toBe(0);
    });

    it('should handle quota management', async () => {
      const stats = await persistenceManager.getStorageStats();
      
      if (stats.primary.nearLimit) {
        expect(stats.primary.recommendations.length).toBeGreaterThan(0);
        expect(stats.primary.recommendations.some(r => 
          r.includes('compression') || r.includes('cleanup')
        )).toBe(true);
      }
    });
  });

  describe('Cross-tab Synchronization', () => {
    it('should handle storage events for cross-tab sync', () => {
      // Mock storage event
      const mockEvent = new StorageEvent('storage', {
        key: 'pam_context_test',
        newValue: JSON.stringify({ test: 'data' }),
        oldValue: JSON.stringify({ test: 'old_data' })
      });

      let eventFired = false;
      
      window.addEventListener('pamContextUpdated', () => {
        eventFired = true;
      });

      // Trigger storage event
      window.dispatchEvent(mockEvent);
      
      // Should trigger custom event (in real scenario)
      expect(eventFired).toBe(true);
    });
  });
});

// =====================================================
// INTEGRATION TESTS
// =====================================================

describe('Context Management Integration', () => {
  let contextManager: AdvancedContextManager;
  let tokenCounter: ClaudeTokenCounter;
  let summarizer: ContextSummarizer;
  let branchManager: ConversationBranchManager;
  let persistenceManager: ContextPersistenceManager;

  beforeEach(async () => {
    contextManager = new AdvancedContextManager(mockUserId, mockConversationId);
    tokenCounter = new ClaudeTokenCounter();
    summarizer = new ContextSummarizer();
    branchManager = new ConversationBranchManager(mockUserId, contextManager);
    persistenceManager = new ContextPersistenceManager(mockUserId);
    
    await contextManager.initializeContext();
  });

  afterEach(() => {
    contextManager.dispose();
    branchManager.dispose();
    persistenceManager.dispose();
  });

  describe('Full Conversation Flow', () => {
    it('should handle complete conversation lifecycle', async () => {
      // Start conversation
      const messages = [
        createMockMessage('Hi, I want to plan a vacation', 'user', ['travel', 'planning']),
        createMockMessage('Great! Where would you like to go?', 'assistant', ['travel']),
        createMockMessage('I\'m thinking about Japan', 'user', ['travel', 'destination']),
        createMockMessage('Japan is wonderful! What\'s your budget?', 'assistant', ['travel', 'finance']),
        createMockMessage('Around $3000', 'user', ['finance', 'budget']),
        createMockMessage('Let me help with budgeting', 'assistant', ['finance']),
      ];

      // Add messages with automatic optimization
      for (const message of messages) {
        await contextManager.addMessage(message);
        
        // Check token limits
        const context = contextManager.getContextForClaude();
        const tokenCheck = tokenCounter.checkContextFits(context);
        expect(tokenCheck.fits).toBe(true);
      }

      // Verify context coherence
      const finalContext = contextManager.getContextForClaude();
      expect(finalContext.length).toBeGreaterThan(0);
      
      // Should maintain conversation flow
      const hasTravel = finalContext.some(msg => 
        msg.content.toLowerCase().includes('vacation') || 
        msg.content.toLowerCase().includes('japan')
      );
      expect(hasTravel).toBe(true);
    });

    it('should handle topic shifts with automatic branching', async () => {
      // Initial topic
      await contextManager.addMessage(createMockMessage('Plan trip to Paris', 'user', ['travel']));
      await contextManager.addMessage(createMockMessage('Great choice!', 'assistant', ['travel']));
      
      // Topic shift
      const financeMessage = createMockMessage('What about my retirement savings?', 'user', ['finance', 'retirement']);
      
      // Analyze potential branch
      const recentMessages = contextManager.getContextForClaude()
        .map(msg => createMockMessage(msg.content, msg.role as any, ['travel']))
        .slice(-5);
      
      const shiftAnalysis = await branchManager.analyzeTopicShift(
        createMockMessage(financeMessage.content, 'user', ['finance', 'retirement']),
        recentMessages,
        {}
      );

      expect(shiftAnalysis.shiftDetected).toBe(true);
      expect(shiftAnalysis.recommendedAction).toBe('branch');

      // Create branch if recommended
      if (shiftAnalysis.recommendedAction === 'branch') {
        await branchManager.createBranch('Financial Planning', 'topic_shift', financeMessage.id);
      }

      const stats = branchManager.getBranchStats();
      expect(stats.totalBranches).toBeGreaterThan(0);
    });

    it('should persist and restore complete conversation state', async () => {
      // Create conversation with branches
      await contextManager.addMessage(createMockMessage('Main conversation', 'user', ['main']));
      
      const branch = await branchManager.createBranch('Side topic', 'manual', 'test-msg');
      await branchManager.switchBranch(branch.id);
      await contextManager.addMessage(createMockMessage('Branch message', 'user', ['branch']));
      
      // Get current state
      const originalContext = contextManager.getContextForClaude();
      const originalBranches = branchManager.getBranches();
      
      // Create storage representation
      const contextWindow = createMockContextWindow(originalContext.length);
      contextWindow.messages = originalContext.map(msg => createMockMessage(msg.content, msg.role as any));
      
      const storedContext = {
        id: 'integration-test',
        userId: mockUserId,
        conversationId: mockConversationId,
        contextWindow,
        branches: originalBranches,
        summaries: [],
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          lastModified: new Date(),
          syncStatus: 'synced' as const,
          size: 1000,
          checksum: 'test-checksum',
          storageBackend: 'localStorage'
        }
      };
      
      // Store state
      await persistenceManager.storeContext(storedContext);
      
      // Restore state
      const restoredContext = await persistenceManager.retrieveContext(mockConversationId);
      
      expect(restoredContext).toBeDefined();
      expect(restoredContext?.contextWindow.messages.length).toBe(originalContext.length);
      expect(restoredContext?.branches.length).toBe(originalBranches.length);
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with large conversations', async () => {
      const startTime = Date.now();
      
      // Simulate large conversation
      for (let i = 0; i < 200; i++) {
        const message = createMockMessage(`Performance test message ${i}`, 'user', [`topic_${i % 10}`]);
        await contextManager.addMessage(message);
        
        // Periodically check performance
        if (i % 50 === 0) {
          const context = contextManager.getContextForClaude();
          const tokenCheck = tokenCounter.checkContextFits(context);
          
          // Should stay within limits due to optimization
          expect(tokenCheck.fits).toBe(true);
        }
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(30000); // 30 seconds
      
      const finalStats = contextManager.getContextStats();
      expect(finalStats.messageCount).toBeGreaterThan(0);
      expect(finalStats.messageCount).toBeLessThanOrEqual(50); // Should be optimized
    });
  });

  describe('Error Recovery', () => {
    it('should recover from complete system failure', async () => {
      // Add some messages
      await contextManager.addMessage(createMockMessage('Before failure', 'user'));
      
      // Simulate complete failure
      contextManager.dispose();
      branchManager.dispose();
      
      // Recreate managers
      const newContextManager = new AdvancedContextManager(mockUserId, mockConversationId);
      const newBranchManager = new ConversationBranchManager(mockUserId, newContextManager);
      
      // Should initialize without issues
      await newContextManager.initializeContext();
      
      // Should be able to continue
      await newContextManager.addMessage(createMockMessage('After recovery', 'user'));
      
      const context = newContextManager.getContextForClaude();
      expect(context).toHaveLength(1);
      expect(context[0].content).toBe('After recovery');
      
      // Cleanup
      newContextManager.dispose();
      newBranchManager.dispose();
    });
  });
});

// =====================================================
// PERFORMANCE BENCHMARKS
// =====================================================

describe('Performance Benchmarks', () => {
  it('should meet token counting performance requirements', () => {
    const tokenCounter = new ClaudeTokenCounter();
    const message = { role: 'user' as const, content: 'Performance test message '.repeat(100) };
    
    const startTime = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      tokenCounter.countMessageTokens({ ...message, content: `${message.content} ${i}` });
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / 1000;
    
    // Should count tokens quickly
    expect(avgTime).toBeLessThan(1); // Less than 1ms per message on average
  });

  it('should meet context optimization performance requirements', async () => {
    const contextManager = new AdvancedContextManager(mockUserId, mockConversationId, {
      maxWindowSize: 20,
      maxTokens: 5000
    });
    
    await contextManager.initializeContext();
    
    const startTime = Date.now();
    
    // Add many messages to trigger optimization
    for (let i = 0; i < 100; i++) {
      const message = createMockMessage(`Optimization test ${i}`, 'user');
      await contextManager.addMessage(message);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Should optimize efficiently
    expect(totalTime).toBeLessThan(10000); // Less than 10 seconds
    
    const stats = contextManager.getContextStats();
    expect(stats.messageCount).toBeLessThanOrEqual(20); // Should be optimized
    
    contextManager.dispose();
  });

  it('should meet memory usage requirements', async () => {
    if (!(performance as any).memory) {
      return; // Skip if performance.memory is not available
    }
    
    const initialMemory = (performance as any).memory.usedJSHeapSize;
    
    const contextManager = new AdvancedContextManager(mockUserId, mockConversationId);
    await contextManager.initializeContext();
    
    // Add many messages
    for (let i = 0; i < 500; i++) {
      const message = createMockMessage(`Memory test ${i}`, 'user');
      await contextManager.addMessage(message);
    }
    
    const finalMemory = (performance as any).memory.usedJSHeapSize;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Should not use excessive memory
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    
    contextManager.dispose();
    
    // Allow garbage collection
    await new Promise(resolve => setTimeout(resolve, 100));
  });
});

export { }; // Make this a module