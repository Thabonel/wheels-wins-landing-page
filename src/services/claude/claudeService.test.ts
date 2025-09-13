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
        [Symbol.asyncIterator]: async function* () {
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
        [Symbol.asyncIterator]: async function* () {
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
});