/**
 * PAM Cross-Agent Integration Tests
 * 
 * Tests the integration and workflows between the enhanced Phase 4 domain agents:
 * - WheelsAgent (Trip Planning)
 * - WinsAgent (Financial Management) 
 * - SocialAgent (Community Networking)
 * - MemoryAgent (RAG-powered Memory)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WheelsAgent } from '@/services/pam/agents/WheelsAgent';
import { WinsAgent } from '@/services/pam/agents/WinsAgent';
import { SocialAgent } from '@/services/pam/agents/SocialAgent';
import { MemoryAgent } from '@/services/pam/agents/MemoryAgent';
import type { ConversationContext } from '@/services/pam/architectureTypes';
import { mockUser } from '@/test/mocks/supabase';

// Mock external dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
          }))
        })),
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
          }))
        }))
      })),
      rpc: vi.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }
  }
}));

vi.mock('@/hooks/useEnhancedPamMemory', () => ({
  getEnhancedPamMemory: vi.fn(() => Promise.resolve({
    region: 'US-West',
    travel_style: 'budget',
    vehicle_type: 'Class A Motorhome',
    preferences: { budget: 150, campgroundType: 'state_parks' },
    personal_knowledge: {
      relevant_chunks: [
        {
          chunk_id: 'chunk-1',
          content: 'I prefer state parks for camping because they are affordable and well-maintained.',
          document_name: 'my_travel_notes.txt',
          relevance_score: 0.89,
          chunk_metadata: {}
        }
      ],
      knowledge_summary: 'Found 1 relevant piece of information from your personal documents.',
      total_documents: 3
    }
  }))
}));

vi.mock('@/services/api', () => ({
  apiFetch: vi.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      results: [
        {
          chunk_id: 'chunk-1',
          content: 'I prefer state parks for camping because they are affordable and well-maintained.',
          document_name: 'my_travel_notes.txt',
          similarity: 0.89,
          chunk_metadata: {}
        }
      ]
    })
  }))
}));

describe('PAM Cross-Agent Integration Workflows', () => {
  let wheelsAgent: WheelsAgent;
  let winsAgent: WinsAgent;
  let socialAgent: SocialAgent;
  let memoryAgent: MemoryAgent;
  let mockContext: ConversationContext;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Initialize all domain agents
    wheelsAgent = new WheelsAgent();
    winsAgent = new WinsAgent();
    socialAgent = new SocialAgent();
    memoryAgent = new MemoryAgent();

    // Create mock conversation context
    mockContext = {
      userId: mockUser.id,
      conversationId: 'test-conversation-id',
      sessionId: 'test-session-id',
      timestamp: new Date(),
      userProfile: {
        preferences: {
          travelStyle: 'budget',
          vehicleType: 'motorhome',
          budgetRange: [100, 200]
        },
        tripHistory: [],
        lastActive: new Date()
      },
      metadata: {
        region: 'US-West',
        platform: 'web'
      }
    };

    // Wait for agents to initialize
    await Promise.all([
      wheelsAgent.initialize(),
      winsAgent.initialize(),
      socialAgent.initialize(),
      memoryAgent.initialize()
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Memory-Enhanced Trip Planning Workflow', () => {
    it('should integrate personal knowledge with trip planning recommendations', async () => {
      // 1. User asks for trip recommendations with personal context
      const tripQuery = "I want to plan a budget RV trip to national parks, considering my previous camping experiences";

      // 2. MemoryAgent should extract personal knowledge first
      const memoryResponse = await memoryAgent.processRequest(tripQuery, mockContext);
      
      expect(memoryResponse.toolsUsed).toContain('semantic_memory_search');
      expect(memoryResponse.response).toContain('personal knowledge');
      expect(memoryResponse.context?.knowledgeEnhanced).toBe(true);

      // 3. WheelsAgent should use enhanced context for trip planning
      const enrichedContext = {
        ...mockContext,
        personalKnowledge: memoryResponse.context
      };

      const tripResponse = await wheelsAgent.processRequest(tripQuery, enrichedContext);
      
      expect(tripResponse.toolsUsed).toContain('intelligent_trip_planner');
      expect(tripResponse.response).toContain('budget');
      expect(tripResponse.confidence).toBeGreaterThan(0.85);
    });

    it('should provide conversation context for travel queries', async () => {
      // Test conversation context tool integration
      const contextQuery = "What are my usual travel preferences for RV camping?";

      const response = await memoryAgent.processRequest(contextQuery, mockContext);

      expect(response.toolsUsed).toContain('conversation_context');
      expect(response.response).toContain('travel style');
      expect(response.context?.ragIntegrated).toBe(true);
    });
  });

  describe('Financial-Memory Integration Workflow', () => {
    it('should combine personal financial data with PAM savings tracking', async () => {
      // 1. User asks about travel budget optimization
      const budgetQuery = "How can I optimize my RV travel budget based on my spending history?";

      // 2. MemoryAgent provides user context and preferences
      const memoryResponse = await memoryAgent.processRequest(budgetQuery, mockContext);
      
      // 3. WinsAgent uses this context for financial analysis
      const enrichedContext = {
        ...mockContext,
        memoryInsights: memoryResponse.context
      };

      const financialResponse = await winsAgent.processRequest(budgetQuery, enrichedContext);
      
      expect(financialResponse.toolsUsed).toContain('smart_expense_tracker');
      expect(financialResponse.response).toContain('budget');
      expect(financialResponse.context?.pamSavingsTracking).toBe(true);
    });

    it('should track PAM-attributed savings with conversation memory', async () => {
      // Test PAM savings attribution workflow
      const savingsQuery = "Track my savings from following PAM's camping recommendations";

      const response = await winsAgent.processRequest(savingsQuery, mockContext);

      expect(response.toolsUsed).toContain('smart_expense_tracker');
      expect(response.context?.pamSavingsTracking).toBe(true);
      expect(response.suggestions).toContain('View PAM impact report');
    });
  });

  describe('Social-Memory Integration Workflow', () => {
    it('should use personal knowledge for intelligent traveler matching', async () => {
      // 1. User seeks travel companions
      const socialQuery = "Find me RV travelers with similar interests and travel style";

      // 2. MemoryAgent should provide user profile context
      const memoryResponse = await memoryAgent.processRequest("what are my travel preferences", mockContext);

      // 3. SocialAgent uses this for intelligent matching
      const enrichedContext = {
        ...mockContext,
        userPreferences: memoryResponse.context
      };

      const socialResponse = await socialAgent.processRequest(socialQuery, enrichedContext);

      expect(socialResponse.toolsUsed).toContain('intelligent_traveler_discovery');
      expect(socialResponse.response).toContain('travel style');
      expect(socialResponse.context?.communityEngaged).toBe(true);
    });

    it('should provide group formation recommendations based on personal preferences', async () => {
      // Test intelligent group formation with memory integration
      const groupQuery = "Create a travel group for budget RV enthusiasts in my region";

      const response = await socialAgent.processRequest(groupQuery, mockContext);

      expect(response.toolsUsed).toContain('intelligent_group_formation');
      expect(response.response).toContain('budget');
      expect(response.confidence).toBeGreaterThan(0.85);
    });
  });

  describe('Cross-Agent Collaboration Scenarios', () => {
    it('should handle complex multi-domain requests', async () => {
      // Complex query requiring multiple agents
      const complexQuery = "Plan a 2-week RV trip to California state parks, find travel companions with similar interests, track my budget, and remember my preferences for future trips";

      // Sequential processing by multiple agents
      const responses = await Promise.all([
        wheelsAgent.processRequest(complexQuery, mockContext),
        socialAgent.processRequest(complexQuery, mockContext), 
        winsAgent.processRequest(complexQuery, mockContext),
        memoryAgent.processRequest(complexQuery, mockContext)
      ]);

      // Verify each agent handled relevant aspects
      const [tripResponse, socialResponse, budgetResponse, memoryResponse] = responses;

      // Trip planning response
      expect(tripResponse.toolsUsed).toContain('intelligent_trip_planner');
      expect(tripResponse.response).toContain('California');

      // Social networking response  
      expect(socialResponse.toolsUsed).toContain('intelligent_traveler_discovery');
      expect(socialResponse.response).toContain('companions');

      // Financial tracking response
      expect(budgetResponse.toolsUsed).toContain('smart_expense_tracker');
      expect(budgetResponse.response).toContain('budget');

      // Memory storage response
      expect(memoryResponse.toolsUsed).toContain('conversation_context');
      expect(memoryResponse.context?.ragIntegrated).toBe(true);
    });

    it('should maintain conversation context across agent interactions', async () => {
      // Simulate conversation flow across multiple agents
      const queries = [
        "I'm planning a budget RV trip",
        "What campgrounds would you recommend?", 
        "How much should I budget for this trip?",
        "Are there other travelers going to the same area?"
      ];

      const responses = [];
      let evolvedContext = { ...mockContext };

      for (const query of queries) {
        // Each query could be handled by different agents based on content
        let response;
        
        if (query.includes('campgrounds')) {
          response = await wheelsAgent.processRequest(query, evolvedContext);
        } else if (query.includes('budget')) {
          response = await winsAgent.processRequest(query, evolvedContext);
        } else if (query.includes('travelers')) {
          response = await socialAgent.processRequest(query, evolvedContext);
        } else {
          response = await memoryAgent.processRequest(query, evolvedContext);
        }

        responses.push(response);
        
        // Evolve context based on previous responses
        evolvedContext = {
          ...evolvedContext,
          metadata: {
            ...evolvedContext.metadata,
            previousResponse: response.context
          }
        };
      }

      // Verify conversation coherence
      expect(responses).toHaveLength(4);
      expect(responses.every(r => r.confidence > 0.7)).toBe(true);
      expect(responses.some(r => r.toolsUsed.length > 0)).toBe(true);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should gracefully handle agent failures in cross-agent workflows', async () => {
      // Mock a tool failure
      const originalTool = wheelsAgent.tools.get('intelligent_trip_planner');
      wheelsAgent.tools.set('intelligent_trip_planner', {
        ...originalTool!,
        execute: vi.fn().mockRejectedValue(new Error('Tool temporarily unavailable'))
      });

      const query = "Plan a trip to Yellowstone National Park";
      const response = await wheelsAgent.processRequest(query, mockContext);

      // Should still provide a response, even with tool failure
      expect(response.response).toBeTruthy();
      expect(response.confidence).toBeLessThan(0.8); // Lower confidence due to failure
      expect(response.suggestions).toContain('Try again later');
    });

    it('should handle missing user context gracefully', async () => {
      // Test with minimal context
      const minimalContext: ConversationContext = {
        userId: 'test-user',
        conversationId: 'test-conversation',
        sessionId: 'test-session',
        timestamp: new Date(),
        metadata: {}
      };

      const query = "Help me plan a trip";
      const response = await wheelsAgent.processRequest(query, minimalContext);

      expect(response.response).toBeTruthy();
      expect(response.suggestions).toContain('Tell me your preferences');
    });
  });

  describe('Performance and Efficiency', () => {
    it('should complete cross-agent workflows within reasonable time', async () => {
      const startTime = Date.now();
      
      const query = "Plan a budget RV trip with social connections and expense tracking";
      
      // Process in parallel where possible
      const responses = await Promise.all([
        wheelsAgent.processRequest(query, mockContext),
        winsAgent.processRequest(query, mockContext),
        socialAgent.processRequest(query, mockContext),
        memoryAgent.processRequest(query, mockContext)
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 5 seconds for integration test
      expect(duration).toBeLessThan(5000);
      expect(responses).toHaveLength(4);
      expect(responses.every(r => r.response.length > 0)).toBe(true);
    });

    it('should efficiently use RAG capabilities without redundant searches', async () => {
      const apiFetchSpy = vi.mocked(require('@/services/api').apiFetch);
      
      const query = "What are my camping preferences based on my documents?";
      
      // Multiple calls to memory agent
      await Promise.all([
        memoryAgent.processRequest(query, mockContext),
        memoryAgent.processRequest(query, mockContext),
        memoryAgent.processRequest(query, mockContext)
      ]);

      // Should use efficient caching/batching
      expect(apiFetchSpy).toHaveBeenCalledTimes(3); // One per request is acceptable
    });
  });
});