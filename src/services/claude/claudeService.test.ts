import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeService, ClaudeServiceError, ClaudeErrorType, type ChatMessage } from './claudeService';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  const mockMessages = { create: mockCreate };
  
  return {
    default: vi.fn(() => ({
      messages: mockMessages
    })),
    __mockMessages: mockMessages,
    __mockCreate: mockCreate
  };
});

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock environment variables
const originalEnv = import.meta.env;

describe('ClaudeService', () => {
  let mockCreate: any;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Get mock references
    const anthropicModule = vi.mocked(await import('@anthropic-ai/sdk'));
    mockCreate = (anthropicModule as any).__mockCreate;
    
    // Setup default environment
    import.meta.env = {
      ...originalEnv,
      VITE_ANTHROPIC_API_KEY: 'test-api-key'
    };
  });

  afterEach(() => {
    import.meta.env = originalEnv;
  });

  describe('Constructor', () => {
    it('should initialize with environment API key', () => {
      const service = new ClaudeService();
      expect(service.isReady()).toBe(true);
      expect(service.getConfig().model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should initialize with custom config', () => {
      const customConfig = {
        apiKey: 'custom-api-key',
        model: 'claude-3-opus-20240229',
        maxTokens: 2048,
        temperature: 0.5
      };

      const service = new ClaudeService(customConfig);
      const config = service.getConfig();
      
      expect(service.isReady()).toBe(true);
      expect(config.model).toBe(customConfig.model);
      expect(config.maxTokens).toBe(customConfig.maxTokens);
      expect(config.temperature).toBe(customConfig.temperature);
    });

    it('should throw error when API key is missing', () => {
      import.meta.env.VITE_ANTHROPIC_API_KEY = '';
      
      expect(() => new ClaudeService()).toThrow(ClaudeServiceError);
      expect(() => new ClaudeService()).toThrow('API key is required');
    });

    it('should use provided API key over environment variable', () => {
      const service = new ClaudeService({ apiKey: 'override-key' });
      expect(service.isReady()).toBe(true);
    });
  });

  describe('chat method', () => {
    let service: ClaudeService;

    beforeEach(() => {
      service = new ClaudeService({ apiKey: 'test-key' });
    });

    it('should send chat message and return response', async () => {
      const mockResponse = {
        id: 'msg_123',
        content: [{ type: 'text', text: 'Hello! How can I help you?' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 8 }
      };
      
      mockCreate.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello', timestamp: new Date() }
      ];

      const response = await service.chat(messages);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [{ role: 'user', content: 'Hello' }]
      });

      expect(response.role).toBe('assistant');
      expect(response.content).toBe('Hello! How can I help you?');
      expect(response.id).toBe('msg_123');
      expect(response.timestamp).toBeInstanceOf(Date);
    });

    it('should handle custom options', async () => {
      const mockResponse = {
        id: 'msg_456',
        content: [{ type: 'text', text: 'Custom response' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 5, output_tokens: 3 }
      };
      
      mockCreate.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() }
      ];

      const options = {
        model: 'claude-3-haiku-20240307',
        maxTokens: 512,
        temperature: 0.2,
        systemPrompt: 'You are a test assistant'
      };

      await service.chat(messages, options);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 512,
        temperature: 0.2,
        messages: [{ role: 'user', content: 'Test' }],
        system: 'You are a test assistant'
      });
    });

    it('should include tools when provided', async () => {
      const mockResponse = {
        id: 'msg_789',
        content: [{ type: 'text', text: 'Tool response' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 15, output_tokens: 5 }
      };
      
      mockCreate.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Use tool', timestamp: new Date() }
      ];

      const tools = [{ name: 'test_tool', description: 'A test tool' }];

      await service.chat(messages, { tools });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [{ role: 'user', content: 'Use tool' }],
        tools
      });
    });

    it('should filter system messages', async () => {
      const mockResponse = {
        id: 'msg_filter',
        content: [{ type: 'text', text: 'Filtered response' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 8, output_tokens: 4 }
      };
      
      mockCreate.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User message' },
        { role: 'assistant', content: 'Assistant message' }
      ];

      await service.chat(messages);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [
          { role: 'user', content: 'User message' },
          { role: 'assistant', content: 'Assistant message' }
        ]
      });
    });

    it('should handle multiple text blocks in response', async () => {
      const mockResponse = {
        id: 'msg_multi',
        content: [
          { type: 'text', text: 'First part' },
          { type: 'text', text: ' Second part' },
          { type: 'tool_use', name: 'test' }, // Should be ignored
          { type: 'text', text: ' Third part' }
        ],
        stop_reason: 'end_turn',
        usage: { input_tokens: 12, output_tokens: 15 }
      };
      
      mockCreate.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Multi-block test', timestamp: new Date() }
      ];

      const response = await service.chat(messages);
      expect(response.content).toBe('First part Second part Third part');
    });

    it('should throw error when service is not initialized', async () => {
      // Create service with invalid API key to simulate initialization failure
      vi.mocked(import('@anthropic-ai/sdk')).default.mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      expect(() => new ClaudeService({ apiKey: 'invalid' })).toThrow(ClaudeServiceError);
    });
  });

  describe('chatStream method', () => {
    let service: ClaudeService;
    let mockStream: any;

    beforeEach(() => {
      service = new ClaudeService({ apiKey: 'test-key' });
      
      // Mock async generator for streaming
      mockStream = {
        async *[Symbol.asyncIterator] () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } };
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } };
          yield { type: 'message_stop' };
        }
      };
    });

    it('should stream chat response', async () => {
      mockCreate.mockResolvedValue(mockStream);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Stream test', timestamp: new Date() }
      ];

      const chunks: any[] = [];
      await service.chatStream(messages, (chunk) => chunks.push(chunk));

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual({ content: 'Hello', isComplete: false });
      expect(chunks[1]).toEqual({ content: 'Hello world', isComplete: false });
      expect(chunks[2]).toEqual({ content: 'Hello world', isComplete: true });
    });

    it('should handle streaming errors', async () => {
      const errorStream = {
        async *[Symbol.asyncIterator] () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Start' } };
          throw new Error('Stream error');
        }
      };

      mockCreate.mockResolvedValue(errorStream);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Error test', timestamp: new Date() }
      ];

      const chunks: any[] = [];
      
      await expect(
        service.chatStream(messages, (chunk) => chunks.push(chunk))
      ).rejects.toThrow(ClaudeServiceError);

      expect(chunks[0]).toEqual({ content: 'Start', isComplete: false });
      expect(chunks[1]).toEqual({ 
        content: 'Start', 
        isComplete: true, 
        error: 'Error processing response stream' 
      });
    });
  });

  describe('sendMessage convenience method', () => {
    let service: ClaudeService;

    beforeEach(() => {
      service = new ClaudeService({ apiKey: 'test-key' });
    });

    it('should send single message and return content', async () => {
      const mockResponse = {
        id: 'msg_simple',
        content: [{ type: 'text', text: 'Simple response' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 5, output_tokens: 3 }
      };
      
      mockCreate.mockResolvedValue(mockResponse);

      const response = await service.sendMessage('Hello');

      expect(response).toBe('Simple response');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [{ role: 'user', content: 'Hello' }]
      });
    });

    it('should use system prompt when provided', async () => {
      const mockResponse = {
        id: 'msg_system',
        content: [{ type: 'text', text: 'System response' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 8, output_tokens: 3 }
      };
      
      mockCreate.mockResolvedValue(mockResponse);

      await service.sendMessage('Test', 'You are a helpful assistant');

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [{ role: 'user', content: 'Test' }],
        system: 'You are a helpful assistant'
      });
    });
  });

  describe('testConnection method', () => {
    let service: ClaudeService;

    beforeEach(() => {
      service = new ClaudeService({ apiKey: 'test-key' });
    });

    it('should return true for successful connection', async () => {
      const mockResponse = {
        id: 'msg_test',
        content: [{ type: 'text', text: 'OK' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 5, output_tokens: 1 }
      };
      
      mockCreate.mockResolvedValue(mockResponse);

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        temperature: 0,
        messages: [{ 
          role: 'user', 
          content: 'Hello, please respond with just "OK" to test the connection.' 
        }],
        system: 'You are a test assistant. Respond with just "OK".'
      });
    });

    it('should return false for failed connection', async () => {
      mockCreate.mockRejectedValue(new Error('Connection failed'));

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('should return false for unexpected response', async () => {
      const mockResponse = {
        id: 'msg_unexpected',
        content: [{ type: 'text', text: 'Unexpected response' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 5, output_tokens: 5 }
      };
      
      mockCreate.mockResolvedValue(mockResponse);

      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('Error handling', () => {
    let service: ClaudeService;

    beforeEach(() => {
      service = new ClaudeService({ apiKey: 'test-key' });
    });

    it('should handle 401 API key errors', async () => {
      const apiError = { status: 401, message: 'Invalid API key' };
      mockCreate.mockRejectedValue(apiError);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() }
      ];

      await expect(service.chat(messages)).rejects.toThrow(ClaudeServiceError);
      await expect(service.chat(messages)).rejects.toThrow('Invalid API key');
    });

    it('should handle 429 rate limit errors', async () => {
      const apiError = { status: 429, message: 'Rate limit exceeded' };
      mockCreate.mockRejectedValue(apiError);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() }
      ];

      await expect(service.chat(messages)).rejects.toThrow(ClaudeServiceError);
      await expect(service.chat(messages)).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle 400 invalid request errors', async () => {
      const apiError = { status: 400, message: 'Invalid request' };
      mockCreate.mockRejectedValue(apiError);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() }
      ];

      await expect(service.chat(messages)).rejects.toThrow(ClaudeServiceError);
      await expect(service.chat(messages)).rejects.toThrow('Invalid request');
    });

    it('should handle network errors', async () => {
      const networkError = { code: 'NETWORK_ERROR', message: 'Network failed' };
      mockCreate.mockRejectedValue(networkError);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() }
      ];

      await expect(service.chat(messages)).rejects.toThrow(ClaudeServiceError);
      await expect(service.chat(messages)).rejects.toThrow('Network error');
    });

    it('should handle unknown errors', async () => {
      const unknownError = new Error('Something went wrong');
      mockCreate.mockRejectedValue(unknownError);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() }
      ];

      await expect(service.chat(messages)).rejects.toThrow(ClaudeServiceError);
      await expect(service.chat(messages)).rejects.toThrow('Something went wrong');
    });
  });

  describe('Configuration management', () => {
    it('should update configuration', () => {
      const service = new ClaudeService({ apiKey: 'test-key' });
      
      service.updateConfig({
        model: 'claude-3-haiku-20240307',
        temperature: 0.2
      });

      const config = service.getConfig();
      expect(config.model).toBe('claude-3-haiku-20240307');
      expect(config.temperature).toBe(0.2);
      expect(config.maxTokens).toBe(1024); // Should keep original value
    });

    it('should not expose API key in getConfig', () => {
      const service = new ClaudeService({ apiKey: 'secret-key' });
      const config = service.getConfig();
      
      expect(config).not.toHaveProperty('apiKey');
      expect(config.model).toBeDefined();
      expect(config.maxTokens).toBeDefined();
      expect(config.temperature).toBeDefined();
    });
  });

  describe('Type definitions', () => {
    it('should have correct ChatMessage interface', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Test message',
        timestamp: new Date(),
        id: 'msg_123'
      };

      expect(message.role).toBe('user');
      expect(message.content).toBe('Test message');
      expect(message.timestamp).toBeInstanceOf(Date);
      expect(message.id).toBe('msg_123');
    });

    it('should have correct ClaudeServiceError types', () => {
      const error = new ClaudeServiceError(
        'Test error',
        ClaudeErrorType.API_KEY_INVALID,
        new Error('Original error')
      );

      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ClaudeErrorType.API_KEY_INVALID);
      expect(error.originalError).toBeInstanceOf(Error);
      expect(error.name).toBe('ClaudeServiceError');
    });
  });

  describe('Tool Integration', () => {
    let service: ClaudeService;

    beforeEach(() => {
      service = new ClaudeService({ apiKey: 'test-key' });
      
      // Mock the tool registry and executor
      vi.doMock('@/services/pam/tools/toolRegistry', () => ({
        getToolsForClaude: vi.fn().mockReturnValue([
          {
            name: 'getUserProfile',
            description: 'Get user profile information',
            input_schema: {
              type: 'object',
              properties: {
                include_financial_goals: { type: 'boolean' }
              }
            }
          },
          {
            name: 'getTripHistory',
            description: 'Get user trip history',
            input_schema: {
              type: 'object',
              properties: {
                start_date: { type: 'string' },
                end_date: { type: 'string' }
              }
            }
          }
        ])
      }));

      vi.doMock('@/services/pam/tools/toolExecutor', () => ({
        executeToolCall: vi.fn()
      }));
    });

    describe('Single Tool Call Integration', () => {
      it('should handle single tool call successfully', async () => {
        const { executeToolCall } = await import('@/services/pam/tools/toolExecutor');
        const { getToolsForClaude } = await import('@/services/pam/tools/toolRegistry');
        
        const userId = 'user-123';
        const messages = [
          { role: 'user' as const, content: 'What is my profile information?', timestamp: new Date() }
        ];

        // Mock initial response with tool use
        const mockToolUseResponse = {
          id: 'msg-1',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'getUserProfile',
              input: { include_financial_goals: true }
            }
          ],
          stop_reason: 'tool_use',
          usage: { input_tokens: 100, output_tokens: 50 }
        };

        // Mock tool execution result
        vi.mocked(executeToolCall).mockResolvedValue({
          success: true,
          data: {
            id: 'user-123',
            name: 'John Doe',
            email: 'john@example.com',
            financial_goals: [
              { name: 'Emergency Fund', target: 10000, current: 5000 }
            ]
          },
          formattedResponse: 'User profile: John Doe (john@example.com) with emergency fund goal of $10,000 (50% complete)',
          executionTime: 150
        });

        // Mock continuation response after tool execution
        const mockContinuationResponse = {
          id: 'msg-2',
          content: [
            {
              type: 'text',
              text: 'Based on your profile, I can see you\'re John Doe with an emergency fund goal. You\'re 50% of the way to your $10,000 target!'
            }
          ],
          stop_reason: 'end_turn',
          usage: { input_tokens: 200, output_tokens: 75 }
        };

        // Setup mock calls
        mockCreate
          .mockResolvedValueOnce(mockToolUseResponse as any)
          .mockResolvedValueOnce(mockContinuationResponse as any);

        // Execute test
        const result = await service.chat(messages, {
          userId,
          tools: vi.mocked(getToolsForClaude)(),
          systemPrompt: 'You are a helpful assistant with access to user data.'
        });

        // Verify tool execution was called
        expect(vi.mocked(executeToolCall)).toHaveBeenCalledWith(
          'getUserProfile',
          { include_financial_goals: true },
          userId,
          'claude_tool-1'
        );

        // Verify final response
        expect(result).toEqual({
          role: 'assistant',
          content: 'Based on your profile, I can see you\'re John Doe with an emergency fund goal. You\'re 50% of the way to your $10,000 target!',
          timestamp: expect.any(Date),
          id: 'msg-2'
        });

        // Verify API calls
        expect(mockCreate).toHaveBeenCalledTimes(2);
      });

      it('should handle tool execution failure gracefully', async () => {
        const { executeToolCall } = await import('@/services/pam/tools/toolExecutor');
        const { getToolsForClaude } = await import('@/services/pam/tools/toolRegistry');
        
        const userId = 'user-123';
        const messages = [
          { role: 'user' as const, content: 'Show me my profile', timestamp: new Date() }
        ];

        // Mock tool use response
        const mockToolUseResponse = {
          id: 'msg-1',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'getUserProfile',
              input: {}
            }
          ],
          stop_reason: 'tool_use',
          usage: { input_tokens: 50, output_tokens: 25 }
        };

        // Mock failed tool execution
        vi.mocked(executeToolCall).mockResolvedValue({
          success: false,
          error: 'Database connection failed',
          executionTime: 100
        });

        // Mock continuation response with error
        const mockContinuationResponse = {
          id: 'msg-2',
          content: [
            {
              type: 'text',
              text: 'I apologize, but I\'m unable to access your profile information right now due to a database issue. Please try again later.'
            }
          ],
          stop_reason: 'end_turn',
          usage: { input_tokens: 150, output_tokens: 50 }
        };

        mockCreate
          .mockResolvedValueOnce(mockToolUseResponse as any)
          .mockResolvedValueOnce(mockContinuationResponse as any);

        const result = await service.chat(messages, { 
          userId, 
          tools: vi.mocked(getToolsForClaude)() 
        });

        expect(vi.mocked(executeToolCall)).toHaveBeenCalled();
        expect(result.content).toContain('unable to access your profile');
      });
    });

    describe('Multiple Tool Calls Integration', () => {
      it('should handle multiple sequential tool calls', async () => {
        const { executeToolCall } = await import('@/services/pam/tools/toolExecutor');
        const { getToolsForClaude } = await import('@/services/pam/tools/toolRegistry');
        
        const userId = 'user-123';
        const messages = [
          { role: 'user' as const, content: 'Show me my profile and recent trips', timestamp: new Date() }
        ];

        // Mock response with multiple tool uses
        const mockMultiToolResponse = {
          id: 'msg-1',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'getUserProfile',
              input: { include_financial_goals: false }
            },
            {
              type: 'tool_use',
              id: 'tool-2',
              name: 'getTripHistory',
              input: { limit: 5 }
            }
          ],
          stop_reason: 'tool_use',
          usage: { input_tokens: 100, output_tokens: 75 }
        };

        // Mock tool execution results
        vi.mocked(executeToolCall)
          .mockResolvedValueOnce({
            success: true,
            data: { id: 'user-123', name: 'John Doe', email: 'john@example.com' },
            formattedResponse: 'User: John Doe (john@example.com)',
            executionTime: 120
          })
          .mockResolvedValueOnce({
            success: true,
            data: [
              { id: 'trip-1', destination: 'Los Angeles', date: '2024-01-15', cost: 250 },
              { id: 'trip-2', destination: 'San Francisco', date: '2024-01-20', cost: 180 }
            ],
            formattedResponse: 'Recent trips: Los Angeles ($250), San Francisco ($180)',
            executionTime: 200
          });

        const mockContinuationResponse = {
          id: 'msg-2',
          content: [
            {
              type: 'text',
              text: 'Here\'s your information, John! You\'ve taken 2 recent trips to Los Angeles ($250) and San Francisco ($180). Total spent: $430.'
            }
          ],
          stop_reason: 'end_turn',
          usage: { input_tokens: 300, output_tokens: 100 }
        };

        mockCreate
          .mockResolvedValueOnce(mockMultiToolResponse as any)
          .mockResolvedValueOnce(mockContinuationResponse as any);

        const result = await service.chat(messages, { 
          userId, 
          tools: vi.mocked(getToolsForClaude)() 
        });

        // Verify both tools were called
        expect(vi.mocked(executeToolCall)).toHaveBeenCalledTimes(2);
        expect(vi.mocked(executeToolCall)).toHaveBeenNthCalledWith(1, 'getUserProfile', { include_financial_goals: false }, userId, 'claude_tool-1');
        expect(vi.mocked(executeToolCall)).toHaveBeenNthCalledWith(2, 'getTripHistory', { limit: 5 }, userId, 'claude_tool-2');

        expect(result.content).toContain('John');
        expect(result.content).toContain('Los Angeles');
        expect(result.content).toContain('San Francisco');
      });

      it('should handle mixed success/failure in multiple tool calls', async () => {
        const { executeToolCall } = await import('@/services/pam/tools/toolExecutor');
        const { getToolsForClaude } = await import('@/services/pam/tools/toolRegistry');
        
        const userId = 'user-123';
        const messages = [
          { role: 'user' as const, content: 'Get my profile and trips', timestamp: new Date() }
        ];

        const mockMultiToolResponse = {
          id: 'msg-1',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'getUserProfile',
              input: {}
            },
            {
              type: 'tool_use',
              id: 'tool-2',
              name: 'getTripHistory',
              input: {}
            }
          ],
          stop_reason: 'tool_use',
          usage: { input_tokens: 80, output_tokens: 60 }
        };

        // First tool succeeds, second fails
        vi.mocked(executeToolCall)
          .mockResolvedValueOnce({
            success: true,
            data: { name: 'John Doe' },
            formattedResponse: 'User: John Doe',
            executionTime: 100
          })
          .mockResolvedValueOnce({
            success: false,
            error: 'Trip data unavailable',
            executionTime: 50
          });

        const mockContinuationResponse = {
          id: 'msg-2',
          content: [
            {
              type: 'text',
              text: 'I found your profile information (John Doe), but I\'m unable to retrieve your trip history at the moment.'
            }
          ],
          stop_reason: 'end_turn',
          usage: { input_tokens: 200, output_tokens: 80 }
        };

        mockCreate
          .mockResolvedValueOnce(mockMultiToolResponse as any)
          .mockResolvedValueOnce(mockContinuationResponse as any);

        const result = await service.chat(messages, { 
          userId, 
          tools: vi.mocked(getToolsForClaude)() 
        });

        expect(vi.mocked(executeToolCall)).toHaveBeenCalledTimes(2);
        expect(result.content).toContain('John Doe');
        expect(result.content).toContain('unable to retrieve');
      });
    });

    describe('No Tools Needed Scenario', () => {
      it('should handle regular conversation without tool use', async () => {
        const { executeToolCall } = await import('@/services/pam/tools/toolExecutor');
        const { getToolsForClaude } = await import('@/services/pam/tools/toolRegistry');
        
        const messages = [
          { role: 'user' as const, content: 'Hello, how are you today?', timestamp: new Date() }
        ];

        const mockRegularResponse = {
          id: 'msg-1',
          content: [
            {
              type: 'text',
              text: 'Hello! I\'m doing well, thank you for asking. How can I help you today?'
            }
          ],
          stop_reason: 'end_turn',
          usage: { input_tokens: 20, output_tokens: 30 }
        };

        mockCreate.mockResolvedValueOnce(mockRegularResponse as any);

        const result = await service.chat(messages, { 
          tools: vi.mocked(getToolsForClaude)() 
        });

        expect(vi.mocked(executeToolCall)).not.toHaveBeenCalled();
        expect(result).toEqual({
          role: 'assistant',
          content: 'Hello! I\'m doing well, thank you for asking. How can I help you today?',
          timestamp: expect.any(Date),
          id: 'msg-1'
        });
      });

      it('should work without tools array provided', async () => {
        const { executeToolCall } = await import('@/services/pam/tools/toolExecutor');
        
        const messages = [
          { role: 'user' as const, content: 'What is 2+2?', timestamp: new Date() }
        ];

        const mockMathResponse = {
          id: 'msg-1',
          content: [
            {
              type: 'text',
              text: '2 + 2 = 4'
            }
          ],
          stop_reason: 'end_turn',
          usage: { input_tokens: 15, output_tokens: 10 }
        };

        mockCreate.mockResolvedValueOnce(mockMathResponse as any);

        const result = await service.chat(messages); // No tools provided

        expect(vi.mocked(executeToolCall)).not.toHaveBeenCalled();
        expect(result.content).toBe('2 + 2 = 4');
      });
    });

    describe('Error Handling and Edge Cases', () => {
      it('should handle tool execution timeout/error gracefully', async () => {
        const { executeToolCall } = await import('@/services/pam/tools/toolExecutor');
        const { getToolsForClaude } = await import('@/services/pam/tools/toolRegistry');
        
        const userId = 'user-123';
        const messages = [
          { role: 'user' as const, content: 'Get my profile', timestamp: new Date() }
        ];

        const mockToolUseResponse = {
          id: 'msg-1',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'getUserProfile',
              input: {}
            }
          ],
          stop_reason: 'tool_use',
          usage: { input_tokens: 50, output_tokens: 25 }
        };

        // Mock tool execution throwing an error
        vi.mocked(executeToolCall).mockRejectedValue(new Error('Tool execution timeout'));

        const mockContinuationResponse = {
          id: 'msg-2',
          content: [
            {
              type: 'text',
              text: 'I apologize, but I encountered an error while trying to access your information. Please try again.'
            }
          ],
          stop_reason: 'end_turn',
          usage: { input_tokens: 100, output_tokens: 40 }
        };

        mockCreate
          .mockResolvedValueOnce(mockToolUseResponse as any)
          .mockResolvedValueOnce(mockContinuationResponse as any);

        const result = await service.chat(messages, { 
          userId, 
          tools: vi.mocked(getToolsForClaude)() 
        });

        expect(result.content).toContain('encountered an error');
      });

      it('should handle missing userId when tools are requested', async () => {
        const { executeToolCall } = await import('@/services/pam/tools/toolExecutor');
        const { getToolsForClaude } = await import('@/services/pam/tools/toolRegistry');
        
        const messages = [
          { role: 'user' as const, content: 'Get my profile', timestamp: new Date() }
        ];

        const mockToolUseResponse = {
          id: 'msg-1',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'getUserProfile',
              input: {}
            }
          ],
          stop_reason: 'tool_use',
          usage: { input_tokens: 50, output_tokens: 25 }
        };

        mockCreate.mockResolvedValueOnce(mockToolUseResponse as any);

        // Call without userId - should continue without tool execution
        const result = await service.chat(messages, { 
          tools: vi.mocked(getToolsForClaude)() 
        });

        expect(vi.mocked(executeToolCall)).not.toHaveBeenCalled();
        expect(result.content).toBe(''); // No continuation without userId
      });

      it('should handle malformed tool use response', async () => {
        const { executeToolCall } = await import('@/services/pam/tools/toolExecutor');
        const { getToolsForClaude } = await import('@/services/pam/tools/toolRegistry');
        
        const userId = 'user-123';
        const messages = [
          { role: 'user' as const, content: 'Test malformed response', timestamp: new Date() }
        ];

        const mockMalformedResponse = {
          id: 'msg-1',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              // Missing name and input
            }
          ],
          stop_reason: 'tool_use',
          usage: { input_tokens: 30, output_tokens: 20 }
        };

        const mockContinuationResponse = {
          id: 'msg-2',
          content: [
            {
              type: 'text',
              text: 'I encountered an issue processing your request. Please try again.'
            }
          ],
          stop_reason: 'end_turn',
          usage: { input_tokens: 80, output_tokens: 35 }
        };

        mockCreate
          .mockResolvedValueOnce(mockMalformedResponse as any)
          .mockResolvedValueOnce(mockContinuationResponse as any);

        const result = await service.chat(messages, { 
          userId, 
          tools: vi.mocked(getToolsForClaude)() 
        });

        // Should handle gracefully without calling executeToolCall
        expect(result.content).toContain('encountered an issue');
      });

      it('should handle API errors during tool execution continuation', async () => {
        const { executeToolCall } = await import('@/services/pam/tools/toolExecutor');
        const { getToolsForClaude } = await import('@/services/pam/tools/toolRegistry');
        
        const userId = 'user-123';
        const messages = [
          { role: 'user' as const, content: 'Get my profile', timestamp: new Date() }
        ];

        const mockToolUseResponse = {
          id: 'msg-1',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'getUserProfile',
              input: {}
            }
          ],
          stop_reason: 'tool_use',
          usage: { input_tokens: 50, output_tokens: 25 }
        };

        vi.mocked(executeToolCall).mockResolvedValue({
          success: true,
          data: { name: 'John Doe' },
          formattedResponse: 'User: John Doe',
          executionTime: 100
        });

        // First call succeeds, second call (continuation) fails
        mockCreate
          .mockResolvedValueOnce(mockToolUseResponse as any)
          .mockRejectedValueOnce(new Error('API rate limit exceeded'));

        await expect(service.chat(messages, { 
          userId, 
          tools: vi.mocked(getToolsForClaude)() 
        })).rejects.toThrow('API rate limit exceeded');

        expect(vi.mocked(executeToolCall)).toHaveBeenCalled();
      });
    });

    describe('Complex Integration Scenarios', () => {
      it('should handle conversation with mixed tool and non-tool responses', async () => {
        const { executeToolCall } = await import('@/services/pam/tools/toolExecutor');
        const { getToolsForClaude } = await import('@/services/pam/tools/toolRegistry');
        
        const userId = 'user-123';
        const messages = [
          { role: 'user' as const, content: 'Hello', timestamp: new Date() },
          { role: 'assistant' as const, content: 'Hi! How can I help?', timestamp: new Date() },
          { role: 'user' as const, content: 'Show me my profile please', timestamp: new Date() }
        ];

        const mockToolUseResponse = {
          id: 'msg-1',
          content: [
            {
              type: 'text',
              text: 'I\'ll get your profile information for you.'
            },
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'getUserProfile',
              input: { include_financial_goals: true }
            }
          ],
          stop_reason: 'tool_use',
          usage: { input_tokens: 80, output_tokens: 60 }
        };

        vi.mocked(executeToolCall).mockResolvedValue({
          success: true,
          data: { name: 'John Doe', email: 'john@example.com' },
          formattedResponse: 'Profile: John Doe (john@example.com)',
          executionTime: 150
        });

        const mockContinuationResponse = {
          id: 'msg-2',
          content: [
            {
              type: 'text',
              text: 'Here\'s your profile information: John Doe (john@example.com). Is there anything specific you\'d like to know about your account?'
            }
          ],
          stop_reason: 'end_turn',
          usage: { input_tokens: 200, output_tokens: 90 }
        };

        mockCreate
          .mockResolvedValueOnce(mockToolUseResponse as any)
          .mockResolvedValueOnce(mockContinuationResponse as any);

        const result = await service.chat(messages, { 
          userId, 
          tools: vi.mocked(getToolsForClaude)() 
        });

        expect(result.content).toContain('John Doe');
        expect(result.content).toContain('john@example.com');
        expect(result.content).toContain('anything specific');
      });

      it('should preserve conversation context through tool calls', async () => {
        const { executeToolCall } = await import('@/services/pam/tools/toolExecutor');
        const { getToolsForClaude } = await import('@/services/pam/tools/toolRegistry');
        
        const userId = 'user-123';
        const conversationMessages = [
          { role: 'user' as const, content: 'My name is Alice', timestamp: new Date() },
          { role: 'assistant' as const, content: 'Nice to meet you, Alice!', timestamp: new Date() },
          { role: 'user' as const, content: 'Can you get my profile data?', timestamp: new Date() }
        ];

        const mockToolUseResponse = {
          id: 'msg-1',
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'getUserProfile',
              input: {}
            }
          ],
          stop_reason: 'tool_use',
          usage: { input_tokens: 120, output_tokens: 40 }
        };

        vi.mocked(executeToolCall).mockResolvedValue({
          success: true,
          data: { name: 'Alice Smith', email: 'alice@example.com' },
          formattedResponse: 'Profile: Alice Smith (alice@example.com)',
          executionTime: 100
        });

        const mockContinuationResponse = {
          id: 'msg-2',
          content: [
            {
              type: 'text',
              text: 'I found your profile, Alice! Your full name is Alice Smith and your email is alice@example.com.'
            }
          ],
          stop_reason: 'end_turn',
          usage: { input_tokens: 250, output_tokens: 70 }
        };

        mockCreate
          .mockResolvedValueOnce(mockToolUseResponse as any)
          .mockResolvedValueOnce(mockContinuationResponse as any);

        const result = await service.chat(conversationMessages, { 
          userId, 
          tools: vi.mocked(getToolsForClaude)() 
        });

        // Verify the continuation call includes all previous messages plus tool results
        const continuationCall = mockCreate.mock.calls[1][0];
        expect(continuationCall.messages).toHaveLength(6); // 3 original + 1 assistant response + 1 tool result + continuation
        expect(result.content).toContain('Alice');
      });
    });
  });
});