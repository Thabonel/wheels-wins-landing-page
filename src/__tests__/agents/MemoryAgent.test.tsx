/**
 * MemoryAgent Unit Tests
 * 
 * Tests the RAG-enhanced MemoryAgent functionality:
 * - Semantic memory search using existing vector infrastructure
 * - Conversation context with personal knowledge integration
 * - Enhanced response generation with RAG results
 * - Conversation memory storage with embeddings
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryAgent } from '@/services/pam/agents/MemoryAgent';
import type { ConversationContext, InteractionRecord } from '@/services/pam/architectureTypes';
import { mockUser } from '@/test/mocks/supabase';

// Mock external dependencies
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({
          data: {
            id: 'test-bucket-id',
            user_id: mockUser.id,
            name: 'PAM Conversations',
            is_active: true
          },
          error: null
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        is: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-doc-id' }, error: null }))
        }))
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-pref-id' }, error: null }))
        }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: [], error: null }))
  })),
  functions: {
    invoke: vi.fn(() => Promise.resolve({ data: null, error: null }))
  }
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient
}));

const mockGetEnhancedPamMemory = vi.fn();
vi.mock('@/hooks/useEnhancedPamMemory', () => ({
  getEnhancedPamMemory: mockGetEnhancedPamMemory
}));

describe('MemoryAgent Unit Tests', () => {
  let memoryAgent: MemoryAgent;
  let mockContext: ConversationContext;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    memoryAgent = new MemoryAgent();
    
    mockContext = {
      userId: mockUser.id,
      conversationId: 'test-conversation-id',
      sessionId: 'test-session-id',
      timestamp: new Date(),
      userProfile: {
        preferences: {
          travelStyle: 'budget',
          communicationStyle: 'friendly',
          favoriteDestinations: ['Yellowstone', 'Yosemite']
        },
        tripHistory: [
          { destination: 'Grand Canyon', date: '2024-01-15' },
          { destination: 'Zion National Park', date: '2024-02-20' }
        ],
        lastActive: new Date()
      },
      metadata: {
        region: 'US-West',
        platform: 'web'
      }
    };

    await memoryAgent.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Registration and Initialization', () => {
    it('should initialize with all RAG-enhanced tools', async () => {
      const tools = memoryAgent.getAvailableTools();
      
      // Original tools
      expect(tools).toContain('preference_manager');
      expect(tools).toContain('profile_retriever');
      expect(tools).toContain('learning_engine');
      expect(tools).toContain('context_builder');
      
      // New RAG-enhanced tools
      expect(tools).toContain('semantic_memory_search');
      expect(tools).toContain('conversation_context');
    });

    it('should have correct tool descriptions', () => {
      const tool = memoryAgent.tools.get('semantic_memory_search');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('Semantic Memory Search');
      expect(tool?.description).toContain('vector embeddings');
      expect(tool?.category).toBe('memory');
    });
  });

  describe('Semantic Memory Search Tool', () => {
    it('should successfully search personal knowledge', async () => {
      // Mock successful search with results
      mockGetEnhancedPamMemory.mockResolvedValue({
        region: 'US-West',
        travel_style: 'budget',
        personal_knowledge: {
          relevant_chunks: [
            {
              chunk_id: 'chunk-1',
              content: 'I love camping at state parks because they have great facilities and are budget-friendly.',
              document_name: 'my_camping_notes.txt',
              relevance_score: 0.92,
              chunk_metadata: { source: 'user_upload' }
            },
            {
              chunk_id: 'chunk-2',
              content: 'Best camping gear includes a portable grill and comfortable chairs.',
              document_name: 'gear_recommendations.md',
              relevance_score: 0.78,
              chunk_metadata: { source: 'user_upload' }
            }
          ],
          knowledge_summary: 'Found 2 relevant pieces of information from your personal documents.',
          total_documents: 5
        }
      });

      const tool = memoryAgent.tools.get('semantic_memory_search');
      const result = await tool?.execute({
        userId: mockUser.id,
        query: 'camping recommendations',
        limit: 3
      });

      expect(result?.success).toBe(true);
      expect(result?.results).toHaveLength(2);
      expect(result?.results[0].content).toContain('state parks');
      expect(result?.summary).toContain('Found 2 relevant pieces');
      expect(result?.totalDocuments).toBe(5);
      expect(result?.searchQuery).toBe('camping recommendations');
      
      expect(mockGetEnhancedPamMemory).toHaveBeenCalledWith(mockUser.id, '', 'camping recommendations');
    });

    it('should handle search with no results', async () => {
      // Mock search with no personal knowledge
      mockGetEnhancedPamMemory.mockResolvedValue({
        region: 'US-West',
        travel_style: 'budget',
        // No personal_knowledge field
      });

      const tool = memoryAgent.tools.get('semantic_memory_search');
      const result = await tool?.execute({
        userId: mockUser.id,
        query: 'non-existent topic',
        limit: 3
      });

      expect(result?.success).toBe(true);
      expect(result?.results).toHaveLength(0);
      expect(result?.summary).toContain('No relevant personal knowledge found');
      expect(result?.totalDocuments).toBe(0);
    });

    it('should handle search errors gracefully', async () => {
      // Mock error in enhanced memory retrieval
      mockGetEnhancedPamMemory.mockRejectedValue(new Error('Knowledge search failed'));

      const tool = memoryAgent.tools.get('semantic_memory_search');
      const result = await tool?.execute({
        userId: mockUser.id,
        query: 'test query',
        limit: 3
      });

      expect(result?.success).toBe(false);
      expect(result?.error).toBe('Failed to search personal knowledge');
      expect(result?.results).toHaveLength(0);
    });
  });

  describe('Conversation Context Tool', () => {
    it('should build comprehensive conversation context', async () => {
      // Mock enhanced memory with personal knowledge
      mockGetEnhancedPamMemory.mockResolvedValue({
        region: 'US-West',
        travel_style: 'adventurous',
        vehicle_type: 'Class B Van',
        preferences: { budget: 120, campgroundType: 'national_parks' },
        personal_knowledge: {
          relevant_chunks: [
            {
              chunk_id: 'chunk-1',
              content: 'I prefer national parks for their stunning scenery and hiking trails.',
              document_name: 'travel_journal.txt',
              relevance_score: 0.85,
              chunk_metadata: {}
            }
          ],
          knowledge_summary: 'Found relevant travel preferences.',
          total_documents: 3
        }
      });

      const tool = memoryAgent.tools.get('conversation_context');
      const result = await tool?.execute({
        userId: mockUser.id,
        currentMessage: 'Plan a camping trip to Utah',
        region: 'US-West'
      });

      expect(result?.success).toBe(true);
      expect(result?.enhancedContext).toBeDefined();
      
      const context = result?.enhancedContext;
      expect(context?.userPreferences?.travelStyle).toBe('adventurous');
      expect(context?.userPreferences?.vehicleType).toBe('Class B Van');
      expect(context?.personalKnowledge).toBeDefined();
      expect(context?.personalKnowledge?.relevant_chunks).toHaveLength(1);
      expect(context?.conversationFlow?.region).toBe('US-West');
      
      expect(mockGetEnhancedPamMemory).toHaveBeenCalledWith(mockUser.id, 'US-West', 'Plan a camping trip to Utah');
    });

    it('should handle missing personal knowledge gracefully', async () => {
      // Mock enhanced memory without personal knowledge
      mockGetEnhancedPamMemory.mockResolvedValue({
        region: 'US-East',
        travel_style: 'luxury',
        preferences: { budget: 300 }
      });

      const tool = memoryAgent.tools.get('conversation_context');
      const result = await tool?.execute({
        userId: mockUser.id,
        currentMessage: 'Tell me about luxury camping',
        region: 'US-East'
      });

      expect(result?.success).toBe(true);
      expect(result?.enhancedContext?.personalKnowledge).toBeNull();
      expect(result?.enhancedContext?.userPreferences?.travelStyle).toBe('luxury');
    });
  });

  describe('Request Analysis and Tool Selection', () => {
    it('should detect knowledge queries and select semantic search', async () => {
      const queries = [
        'find my camping notes',
        'search my documents about RV maintenance',
        'look up what I wrote about Yellowstone',
        'tell me about my personal travel experiences'
      ];

      for (const query of queries) {
        const response = await memoryAgent.processRequest(query, mockContext);
        expect(response.toolsUsed).toContain('semantic_memory_search');
      }
    });

    it('should detect personal references and select semantic search', async () => {
      const queries = [
        'my document about camping gear',
        'I wrote something about this destination',
        'check my personal notes on budget travel',
        'my private camping journal entries'
      ];

      for (const query of queries) {
        const response = await memoryAgent.processRequest(query, mockContext);
        expect(response.toolsUsed).toContain('semantic_memory_search');
      }
    });

    it('should detect travel context needs and select conversation context', async () => {
      const queries = [
        'Plan a trip to national parks with my usual preferences',
        'What campgrounds would work for my RV and budget?',
        'Find destinations that match my travel style'
      ];

      for (const query of queries) {
        const response = await memoryAgent.processRequest(query, mockContext);
        expect(response.toolsUsed).toContain('conversation_context');
      }
    });

    it('should select multiple tools for complex queries', async () => {
      const complexQuery = 'Find my notes about budget camping and use my preferences to plan a trip';
      
      const response = await memoryAgent.processRequest(complexQuery, mockContext);
      
      // Should trigger both semantic search and conversation context
      expect(response.toolsUsed).toContain('semantic_memory_search');
      expect(response.toolsUsed).toContain('conversation_context');
    });
  });

  describe('Enhanced Response Generation', () => {
    it('should prioritize semantic search results in responses', async () => {
      // Mock successful semantic search
      mockGetEnhancedPamMemory.mockResolvedValue({
        personal_knowledge: {
          relevant_chunks: [
            {
              chunk_id: 'chunk-1',
              content: 'My favorite camping spot is Devil\'s Garden in Arches National Park because of the incredible rock formations and relatively easy access.',
              document_name: 'utah_trip_notes.md',
              relevance_score: 0.94,
              chunk_metadata: {}
            }
          ],
          knowledge_summary: 'Found 1 relevant piece from your travel notes.',
          total_documents: 4
        }
      });

      const query = 'What did I write about Utah camping spots?';
      const response = await memoryAgent.processRequest(query, mockContext);

      expect(response.response).toContain('I found 1 relevant pieces from your personal knowledge');
      expect(response.response).toContain('Devil\'s Garden in Arches');
      expect(response.response).toContain('utah_trip_notes.md');
      expect(response.response).toContain('collection of 4 personal documents');
      expect(response.confidence).toBe(0.95); // High confidence with RAG
      expect(response.context?.knowledgeEnhanced).toBe(true);
      expect(response.context?.ragIntegrated).toBe(true);
    });

    it('should handle conversation context in responses', async () => {
      // Mock conversation context with personal knowledge
      mockGetEnhancedPamMemory.mockResolvedValue({
        travel_style: 'budget',
        vehicle_type: 'Travel Trailer',
        personal_knowledge: {
          relevant_chunks: [
            {
              chunk_id: 'chunk-1',
              content: 'Budget camping tips for travel trailers',
              document_name: 'budget_guide.txt',
              relevance_score: 0.88,
              chunk_metadata: {}
            }
          ],
          knowledge_summary: 'Found budget travel information.',
          total_documents: 2
        }
      });

      const query = 'Help me plan a budget RV trip based on what you know about me';
      const response = await memoryAgent.processRequest(query, mockContext);

      expect(response.response).toContain('Given your budget travel style');
      expect(response.response).toContain('Travel Trailer');
      expect(response.response).toContain('based on your personal documents');
      expect(response.confidence).toBe(0.95);
      expect(response.suggestions).toContain('Get travel recommendations');
    });

    it('should provide enhanced fallback responses', async () => {
      // Mock no specific tool triggers
      const query = 'Hello PAM';
      const response = await memoryAgent.processRequest(query, mockContext);

      expect(response.response).toContain('personal knowledge base');
      expect(response.suggestions).toContain('Upload personal documents');
      expect(response.context?.ragIntegrated).toBe(true);
    });
  });

  describe('Conversation Memory Storage', () => {
    it('should store substantive travel-related conversations', async () => {
      const interaction: InteractionRecord = {
        userId: mockUser.id,
        message: 'What are the best RV-friendly campgrounds in Utah with full hookups and good hiking access?',
        response: 'Based on your preferences for state parks and hiking, I recommend Goblin Valley State Park and Dead Horse Point State Park. Both offer full hookups and excellent hiking trails nearby.',
        intent: { category: 'trip_planning', confidence: 0.9 },
        timestamp: new Date(),
        feedback: { rating: 5, helpful: true }
      };

      await memoryAgent.storeInteraction(interaction);

      // Verify interaction was stored
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('pam_interactions');
      
      // Verify conversation bucket creation/retrieval
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_knowledge_buckets');
      
      // Verify document creation for conversation memory
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_knowledge_documents');
      
      // Verify chunk creation
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_knowledge_chunks');
      
      // Verify embedding generation was triggered
      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('generate-embeddings', {
        body: { documentId: 'test-doc-id' }
      });
    });

    it('should not store very short conversations', async () => {
      const interaction: InteractionRecord = {
        userId: mockUser.id,
        message: 'Hi',
        response: 'Hello!',
        intent: { category: 'greeting' },
        timestamp: new Date()
      };

      await memoryAgent.storeInteraction(interaction);

      // Should only store basic interaction, not conversation memory
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('pam_interactions');
      expect(mockSupabaseClient.from).not.toHaveBeenCalledWith('user_knowledge_buckets');
    });

    it('should store conversations with positive feedback', async () => {
      const interaction: InteractionRecord = {
        userId: mockUser.id,
        message: 'Recommend some camping gear',
        response: 'I recommend a portable camp chair, LED lantern, and compact camp stove for comfortable camping',
        intent: { category: 'recommendations' },
        timestamp: new Date(),
        feedback: { rating: 5, helpful: true }
      };

      await memoryAgent.storeInteraction(interaction);

      // Should store as conversation memory due to positive feedback
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_knowledge_buckets');
    });

    it('should handle conversation memory storage errors gracefully', async () => {
      // Mock error in bucket creation
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: new Error('Database error') })
          })
        })
      }));

      const interaction: InteractionRecord = {
        userId: mockUser.id,
        message: 'What are good RV camping spots in Colorado?',
        response: 'Colorado has excellent RV camping at Rocky Mountain National Park and Mueller State Park.',
        intent: { category: 'trip_planning' },
        timestamp: new Date()
      };

      // Should not throw error
      await expect(memoryAgent.storeInteraction(interaction)).resolves.not.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing user context gracefully', async () => {
      const minimalContext: ConversationContext = {
        userId: 'test-user',
        conversationId: 'test-conversation',
        sessionId: 'test-session',
        timestamp: new Date(),
        metadata: {}
      };

      const query = 'Tell me my preferences';
      const response = await memoryAgent.processRequest(query, minimalContext);

      expect(response.response).toBeTruthy();
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.suggestions).toContain('Tell me your preferences');
    });

    it('should handle tool execution failures gracefully', async () => {
      // Mock tool failure
      const originalTool = memoryAgent.tools.get('semantic_memory_search');
      memoryAgent.tools.set('semantic_memory_search', {
        ...originalTool!,
        execute: vi.fn().mockRejectedValue(new Error('Search service unavailable'))
      });

      const query = 'Find my camping notes';
      const response = await memoryAgent.processRequest(query, minimalContext);

      expect(response.response).toBeTruthy();
      expect(response.confidence).toBeLessThan(0.8);
      expect(response.context?.ragIntegrated).toBe(true); // Still shows RAG integration attempt
    });

    it('should validate tool parameters', async () => {
      const tool = memoryAgent.tools.get('semantic_memory_search');
      
      // Test with missing userId
      const result = await tool?.execute({ query: 'test', limit: 3 });
      expect(result?.success).toBe(false);
      
      // Test with missing query
      const result2 = await tool?.execute({ userId: 'test-user', limit: 3 });
      expect(result2?.success).toBe(false);
    });
  });

  describe('Performance and Efficiency', () => {
    it('should complete requests within reasonable time', async () => {
      const startTime = Date.now();
      
      const query = 'Search my documents for camping recommendations and build context';
      await memoryAgent.processRequest(query, mockContext);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should efficiently handle multiple concurrent requests', async () => {
      const queries = [
        'Find my budget camping notes',
        'What are my travel preferences?',
        'Search for RV maintenance tips',
        'Tell me about my favorite destinations'
      ];

      const startTime = Date.now();
      const responses = await Promise.all(
        queries.map(query => memoryAgent.processRequest(query, mockContext))
      );
      const duration = Date.now() - startTime;

      expect(responses).toHaveLength(4);
      expect(responses.every(r => r.response.length > 0)).toBe(true);
      expect(duration).toBeLessThan(3000); // All requests within 3 seconds
    });
  });
});