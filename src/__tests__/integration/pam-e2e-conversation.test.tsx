/**
 * PAM End-to-End Conversation Tests
 * 
 * Tests complete user conversation flows with the enhanced Phase 4 PAM system:
 * - Multi-turn conversations across domain agents
 * - RAG-powered memory integration throughout conversations
 * - Context preservation and learning across interactions
 * - Real-world conversation scenarios
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PamInterface } from '@/components/pam/PamInterface';
import { PamProvider } from '@/context/PamContext';
import { AuthProvider } from '@/context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockUser } from '@/test/mocks/supabase';

// Mock WebSocket for PAM communication
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
};

global.WebSocket = vi.fn(() => mockWebSocket) as any;

// Mock enhanced PAM memory hook
const mockEnhancedMemory = {
  region: 'US-West',
  travel_style: 'budget',
  vehicle_type: 'Class A Motorhome',
  preferences: { 
    budget: 150, 
    campgroundType: 'state_parks',
    travelPace: 'slow'
  },
  personal_knowledge: {
    relevant_chunks: [
      {
        chunk_id: 'chunk-1',
        content: 'I prefer state parks because they offer excellent value with clean facilities and beautiful natural settings. My best experiences have been at Goblin Valley and Dead Horse Point.',
        document_name: 'utah_camping_guide.md',
        relevance_score: 0.92,
        chunk_metadata: { created: '2024-01-15' }
      }
    ],
    knowledge_summary: 'Found relevant camping preferences and experiences.',
    total_documents: 7
  }
};

vi.mock('@/hooks/useEnhancedPamMemory', () => ({
  getEnhancedPamMemory: vi.fn(() => Promise.resolve(mockEnhancedMemory))
}));

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: mockUser, error: null })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
        }))
      }))
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }
  })),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser }, error: null })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: { user: mockUser } }, error: null }))
  }
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PamProvider>
          {children}
        </PamProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('PAM End-to-End Conversation Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    
    // Mock successful WebSocket connection
    vi.mocked(mockWebSocket.addEventListener).mockImplementation((event: string, callback: Function) => {
      if (event === 'open') {
        setTimeout(() => callback(), 100);
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Multi-Domain Trip Planning Conversation', () => {
    it('should handle complete trip planning workflow with RAG integration', async () => {
      render(
        <TestWrapper>
          <PamInterface />
        </TestWrapper>
      );

      // Wait for PAM to initialize
      await waitFor(() => {
        expect(screen.getByText(/PAM is ready/i)).toBeInTheDocument();
      });

      // Mock conversation sequence responses
      const conversationFlow = [
        {
          input: "I want to plan a 2-week RV trip to Utah's national parks with my usual budget preferences",
          expectedResponse: {
            agent: 'wheels',
            content: "Based on your budget travel style and Class A Motorhome, I'll plan a 2-week Utah national parks trip. From your personal notes about Utah camping, I see you loved Goblin Valley and Dead Horse Point for their value and natural beauty.",
            tools: ['intelligent_trip_planner', 'semantic_memory_search'],
            confidence: 0.95
          }
        },
        {
          input: "How much should I budget for this trip including campground fees and fuel?",
          expectedResponse: {
            agent: 'wins',
            content: "For a 2-week Utah RV trip with your Class A Motorhome and $150/day budget preference, I estimate $2,100 total. This includes $980 for campgrounds (14 nights at state parks), $840 for fuel, and $280 for miscellaneous expenses.",
            tools: ['smart_expense_tracker', 'pam_savings_calculator'],
            confidence: 0.92
          }
        },
        {
          input: "Are there other RV travelers going to Utah around the same time I could connect with?",
          expectedResponse: {
            agent: 'social',
            content: "I found 3 budget-conscious RV travelers planning Utah trips in your timeframe. Based on your travel style and interests in state parks, you're highly compatible with Sarah (89% match) and Mike (85% match).",
            tools: ['intelligent_traveler_discovery', 'compatibility_scorer'],
            confidence: 0.88
          }
        },
        {
          input: "Remember these preferences for future trips and create a camping checklist",
          expectedResponse: {
            agent: 'memory',
            content: "I've stored your Utah trip preferences in your personal knowledge base and created a custom camping checklist based on your Class A Motorhome setup and budget priorities. This will help with future trip planning.",
            tools: ['conversation_context', 'preference_manager'],
            confidence: 0.96
          }
        }
      ];

      // Execute conversation flow
      for (const [index, turn] of conversationFlow.entries()) {
        // Mock the PAM response
        vi.mocked(mockWebSocket.send).mockImplementation((message) => {
          const messageData = JSON.parse(message as string);
          
          // Simulate PAM processing and response
          setTimeout(() => {
            const response = {
              type: 'pam_response',
              data: {
                response: turn.expectedResponse.content,
                agent: turn.expectedResponse.agent,
                toolsUsed: turn.expectedResponse.tools,
                confidence: turn.expectedResponse.confidence,
                suggestions: [
                  'View detailed itinerary',
                  'Get camping recommendations',
                  'Connect with travelers'
                ],
                context: {
                  ragIntegrated: true,
                  knowledgeEnhanced: true,
                  personalizedResponse: true
                }
              }
            };
            
            // Trigger message event
            const messageEvent = new MessageEvent('message', {
              data: JSON.stringify(response)
            });
            mockWebSocket.addEventListener.mock.calls
              .filter(call => call[0] === 'message')
              .forEach(call => call[1](messageEvent));
          }, 200);
        });

        // Type user input
        const chatInput = screen.getByPlaceholderText(/Ask PAM anything/i);
        await user.clear(chatInput);
        await user.type(chatInput, turn.input);
        
        // Send message
        const sendButton = screen.getByRole('button', { name: /send/i });
        await user.click(sendButton);

        // Wait for PAM response
        await waitFor(() => {
          expect(screen.getByText(new RegExp(turn.expectedResponse.content.substring(0, 30), 'i'))).toBeInTheDocument();
        }, { timeout: 5000 });

        // Verify conversation context preservation
        const conversationHistory = screen.getAllByTestId('chat-message');
        expect(conversationHistory).toHaveLength((index + 1) * 2); // User message + PAM response per turn

        // Verify agent-specific functionality
        if (turn.expectedResponse.agent === 'wheels') {
          expect(screen.getByText(/trip planning/i)).toBeInTheDocument();
        } else if (turn.expectedResponse.agent === 'wins') {
          expect(screen.getByText(/budget/i)).toBeInTheDocument();
        } else if (turn.expectedResponse.agent === 'social') {
          expect(screen.getByText(/travelers/i)).toBeInTheDocument();
        } else if (turn.expectedResponse.agent === 'memory') {
          expect(screen.getByText(/knowledge base/i)).toBeInTheDocument();
        }
      }

      // Verify final conversation state
      expect(screen.getAllByTestId('chat-message')).toHaveLength(8); // 4 turns × 2 messages each
      expect(mockWebSocket.send).toHaveBeenCalledTimes(4);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('pam_interactions');
    });
  });

  describe('RAG-Enhanced Knowledge Retrieval', () => {
    it('should seamlessly integrate personal knowledge in responses', async () => {
      render(
        <TestWrapper>
          <PamInterface />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/PAM is ready/i)).toBeInTheDocument();
      });

      // Mock knowledge-heavy query
      vi.mocked(mockWebSocket.send).mockImplementation(() => {
        setTimeout(() => {
          const response = {
            type: 'pam_response',
            data: {
              response: "From your Utah camping guide, I see you preferred Goblin Valley and Dead Horse Point for their excellent value and beautiful settings. Based on this experience, I recommend similar state parks like Valley of the Gods or Goosenecks State Park for your next Utah adventure.",
              agent: 'memory',
              toolsUsed: ['semantic_memory_search', 'conversation_context'],
              confidence: 0.95,
              knowledgeSources: [
                {
                  document: 'utah_camping_guide.md',
                  relevance: 0.92,
                  snippet: 'Goblin Valley and Dead Horse Point excellent value'
                }
              ],
              suggestions: [
                'View full document',
                'Search more knowledge',
                'Add new camping notes'
              ]
            }
          };
          
          const messageEvent = new MessageEvent('message', {
            data: JSON.stringify(response)
          });
          mockWebSocket.addEventListener.mock.calls
            .filter(call => call[0] === 'message')
            .forEach(call => call[1](messageEvent));
        }, 300);
      });

      const chatInput = screen.getByPlaceholderText(/Ask PAM anything/i);
      await user.type(chatInput, 'What did I write about Utah camping in my notes?');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Verify RAG integration
      await waitFor(() => {
        expect(screen.getByText(/From your Utah camping guide/i)).toBeInTheDocument();
        expect(screen.getByText(/Goblin Valley and Dead Horse Point/i)).toBeInTheDocument();
      });

      // Verify knowledge source attribution
      expect(screen.getByText(/utah_camping_guide.md/i)).toBeInTheDocument();
      
      // Verify knowledge-specific suggestions
      expect(screen.getByText(/View full document/i)).toBeInTheDocument();
      expect(screen.getByText(/Search more knowledge/i)).toBeInTheDocument();
    });
  });

  describe('Context Preservation Across Sessions', () => {
    it('should maintain conversation context in subsequent interactions', async () => {
      render(
        <TestWrapper>
          <PamInterface />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/PAM is ready/i)).toBeInTheDocument();
      });

      // Simulate returning user with conversation history
      vi.mocked(mockWebSocket.send).mockImplementation((message) => {
        const messageData = JSON.parse(message as string);
        
        setTimeout(() => {
          const response = {
            type: 'pam_response',
            data: {
              response: "Welcome back! I remember our previous conversation about your Utah RV trip planning. You were interested in budget-friendly state parks and had great experiences at Goblin Valley. How did your trip go?",
              agent: 'memory',
              toolsUsed: ['conversation_context', 'profile_retriever'],
              confidence: 0.94,
              context: {
                previousConversations: 3,
                lastInteraction: '2 days ago',
                topicContinuity: 'utah_rv_camping'
              }
            }
          };
          
          const messageEvent = new MessageEvent('message', {
            data: JSON.stringify(response)
          });
          mockWebSocket.addEventListener.mock.calls
            .filter(call => call[0] === 'message')
            .forEach(call => call[1](messageEvent));
        }, 250);
      });

      const chatInput = screen.getByPlaceholderText(/Ask PAM anything/i);
      await user.type(chatInput, 'Hi PAM, I\'m back!');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Verify context preservation
      await waitFor(() => {
        expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
        expect(screen.getByText(/previous conversation about your Utah RV trip/i)).toBeInTheDocument();
        expect(screen.getByText(/Goblin Valley/i)).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Agent Handoff Scenarios', () => {
    it('should smoothly transition between agents based on conversation flow', async () => {
      render(
        <TestWrapper>
          <PamInterface />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/PAM is ready/i)).toBeInTheDocument();
      });

      const handoffSequence = [
        {
          input: "I'm planning a camping trip",
          agent: 'memory',
          response: "I'd be happy to help with your camping trip! Based on your preferences for budget travel and state parks, what destination are you considering?"
        },
        {
          input: "Colorado national parks",
          agent: 'wheels',
          response: "Great choice! For Colorado national parks with your Class A Motorhome, I recommend Rocky Mountain National Park and Mesa Verde. Both have RV-friendly campgrounds."
        },
        {
          input: "What will this cost me?",
          agent: 'wins',
          response: "For a week in Colorado, expect about $1,050 total: $420 for campgrounds, $350 for fuel, and $280 for food and activities."
        }
      ];

      for (const [index, turn] of handoffSequence.entries()) {
        vi.mocked(mockWebSocket.send).mockImplementation(() => {
          setTimeout(() => {
            const response = {
              type: 'pam_response',
              data: {
                response: turn.response,
                agent: turn.agent,
                toolsUsed: [`${turn.agent}_primary_tool`],
                confidence: 0.90,
                handoff: index > 0 ? {
                  from: handoffSequence[index - 1].agent,
                  to: turn.agent,
                  reason: 'Query domain changed'
                } : undefined
              }
            };
            
            const messageEvent = new MessageEvent('message', {
              data: JSON.stringify(response)
            });
            mockWebSocket.addEventListener.mock.calls
              .filter(call => call[0] === 'message')
              .forEach(call => call[1](messageEvent));
          }, 200);
        });

        const chatInput = screen.getByPlaceholderText(/Ask PAM anything/i);
        await user.clear(chatInput);
        await user.type(chatInput, turn.input);
        
        const sendButton = screen.getByRole('button', { name: /send/i });
        await user.click(sendButton);

        await waitFor(() => {
          expect(screen.getByText(new RegExp(turn.response.substring(0, 20), 'i'))).toBeInTheDocument();
        });
      }

      // Verify smooth conversation flow
      const messages = screen.getAllByTestId('chat-message');
      expect(messages).toHaveLength(6); // 3 exchanges
      expect(mockWebSocket.send).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should gracefully handle agent failures and continue conversation', async () => {
      render(
        <TestWrapper>
          <PamInterface />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/PAM is ready/i)).toBeInTheDocument();
      });

      // Mock agent failure scenario
      vi.mocked(mockWebSocket.send).mockImplementation(() => {
        setTimeout(() => {
          const errorResponse = {
            type: 'pam_error',
            data: {
              error: 'Trip planning service temporarily unavailable',
              fallbackResponse: "I'm experiencing some technical difficulties with trip planning right now, but I can still help with other questions about your travel preferences or previous trips.",
              agent: 'fallback',
              suggestions: [
                'Try again in a few minutes',
                'Ask about travel preferences',
                'View previous conversations'
              ]
            }
          };
          
          const messageEvent = new MessageEvent('message', {
            data: JSON.stringify(errorResponse)
          });
          mockWebSocket.addEventListener.mock.calls
            .filter(call => call[0] === 'message')
            .forEach(call => call[1](messageEvent));
        }, 300);
      });

      const chatInput = screen.getByPlaceholderText(/Ask PAM anything/i);
      await user.type(chatInput, 'Plan a trip to Yellowstone');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Verify graceful error handling
      await waitFor(() => {
        expect(screen.getByText(/technical difficulties/i)).toBeInTheDocument();
        expect(screen.getByText(/Try again in a few minutes/i)).toBeInTheDocument();
      });

      // Verify PAM remains functional for other queries
      vi.mocked(mockWebSocket.send).mockImplementation(() => {
        setTimeout(() => {
          const recoveryResponse = {
            type: 'pam_response',
            data: {
              response: "I can see from your travel history that you enjoy visiting national parks and prefer budget-friendly camping options. You've had great experiences at state parks in Utah.",
              agent: 'memory',
              toolsUsed: ['profile_retriever'],
              confidence: 0.85
            }
          };
          
          const messageEvent = new MessageEvent('message', {
            data: JSON.stringify(recoveryResponse)
          });
          mockWebSocket.addEventListener.mock.calls
            .filter(call => call[0] === 'message')
            .forEach(call => call[1](messageEvent));
        }, 200);
      });

      await user.clear(chatInput);
      await user.type(chatInput, 'What are my travel preferences?');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/travel history/i)).toBeInTheDocument();
        expect(screen.getByText(/national parks/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should maintain good performance with long conversations', async () => {
      render(
        <TestWrapper>
          <PamInterface />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/PAM is ready/i)).toBeInTheDocument();
      });

      const startTime = Date.now();

      // Simulate 10-turn conversation
      for (let i = 0; i < 10; i++) {
        vi.mocked(mockWebSocket.send).mockImplementation(() => {
          setTimeout(() => {
            const response = {
              type: 'pam_response',
              data: {
                response: `Response ${i + 1}: This is a test response for performance evaluation.`,
                agent: 'memory',
                confidence: 0.85,
                turn: i + 1
              }
            };
            
            const messageEvent = new MessageEvent('message', {
              data: JSON.stringify(response)
            });
            mockWebSocket.addEventListener.mock.calls
              .filter(call => call[0] === 'message')
              .forEach(call => call[1](messageEvent));
          }, 100);
        });

        const chatInput = screen.getByPlaceholderText(/Ask PAM anything/i);
        await user.clear(chatInput);
        await user.type(chatInput, `Test message ${i + 1}`);
        
        const sendButton = screen.getByRole('button', { name: /send/i });
        await user.click(sendButton);

        await waitFor(() => {
          expect(screen.getByText(`Response ${i + 1}:`)).toBeInTheDocument();
        });
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify performance
      expect(totalTime).toBeLessThan(15000); // 10 turns in under 15 seconds
      expect(screen.getAllByTestId('chat-message')).toHaveLength(20); // 10 exchanges
      
      // Verify UI remains responsive
      const chatInput = screen.getByPlaceholderText(/Ask PAM anything/i);
      expect(chatInput).not.toBeDisabled();
    });

    it('should handle rapid-fire messages appropriately', async () => {
      render(
        <TestWrapper>
          <PamInterface />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/PAM is ready/i)).toBeInTheDocument();
      });

      let responseCount = 0;
      vi.mocked(mockWebSocket.send).mockImplementation(() => {
        responseCount++;
        setTimeout(() => {
          const response = {
            type: 'pam_response',
            data: {
              response: `Rapid response ${responseCount}`,
              agent: 'memory',
              confidence: 0.80
            }
          };
          
          const messageEvent = new MessageEvent('message', {
            data: JSON.stringify(response)
          });
          mockWebSocket.addEventListener.mock.calls
            .filter(call => call[0] === 'message')
            .forEach(call => call[1](messageEvent));
        }, 50);
      });

      const chatInput = screen.getByPlaceholderText(/Ask PAM anything/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send 5 rapid messages
      const messages = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
      
      for (const message of messages) {
        await user.clear(chatInput);
        await user.type(chatInput, message, { delay: 1 });
        await user.click(sendButton);
      }

      // Wait for all responses
      await waitFor(() => {
        expect(screen.getByText('Rapid response 5')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify all messages were handled
      expect(mockWebSocket.send).toHaveBeenCalledTimes(5);
      expect(screen.getAllByTestId('chat-message')).toHaveLength(10);
    });
  });
});