import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';
import { getToolsForClaude } from '@/services/pam/tools/toolRegistry';
import { executeToolCall } from '@/services/pam/tools/toolExecutor';

/**
 * Message interface for chat conversations
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  id?: string;
}

/**
 * Streaming response interface
 */
export interface StreamingResponse {
  content: string;
  isComplete: boolean;
  error?: string;
}

/**
 * Get the latest Claude 3.5 Sonnet model (never Opus - too expensive)
 */
function getLatestSonnetModel(): string {
  // Try newer models first, fallback to known stable
  const latestModels = [
    'claude-3-5-sonnet-20241215',  // December 2024
    'claude-3-5-sonnet-20241115',  // November 2024
    'claude-3-5-sonnet-20241022',  // Fallback (October 2024)
  ];

  // Return the most likely available model
  return latestModels[0]; // Use latest available
}

/**
 * Claude service configuration
 */
export interface ClaudeConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Chat options for customizing requests
 */
export interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  tools?: any[];
  stream?: boolean;
}

/**
 * Error types for better error handling
 */
export enum ClaudeErrorType {
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_KEY_INVALID = 'API_KEY_INVALID',
  RATE_LIMITED = 'RATE_LIMITED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class ClaudeServiceError extends Error {
  constructor(
    message: string,
    public type: ClaudeErrorType,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ClaudeServiceError';
  }
}

/**
 * Service for interacting with Claude AI via Anthropic API
 */
export class ClaudeService {
  private client: Anthropic;
  private config: ClaudeConfig;
  private isInitialized: boolean = false;

  constructor(config?: Partial<ClaudeConfig>) {
    // Get API key from environment or config
    const apiKey = config?.apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new ClaudeServiceError(
        'Anthropic API key is required. Set VITE_ANTHROPIC_API_KEY environment variable.',
        ClaudeErrorType.API_KEY_MISSING
      );
    }

    this.config = {
      apiKey,
      model: config?.model || getLatestSonnetModel(), // Web search available on newer models
      maxTokens: config?.maxTokens || 1024,
      temperature: config?.temperature || 0.7,
      ...config
    };

    try {
      this.client = new Anthropic({
        apiKey: this.config.apiKey,
        dangerouslyAllowBrowser: true // Required for frontend usage
      });
      
      this.isInitialized = true;
      logger.info('Claude service initialized successfully', {
        model: this.config.model,
        maxTokens: this.config.maxTokens
      });
    } catch (error) {
      logger.error('Failed to initialize Claude service', error);
      throw new ClaudeServiceError(
        'Failed to initialize Claude service',
        ClaudeErrorType.UNKNOWN_ERROR,
        error
      );
    }
  }

  /**
   * Check if the service is properly initialized
   */
  public isReady(): boolean {
    return this.isInitialized && !!this.client;
  }

  /**
   * Send a chat message and get a response
   */
  public async chat(
    messages: ChatMessage[],
    options?: ChatOptions & { userId?: string }
  ): Promise<ChatMessage> {
    if (!this.isReady()) {
      throw new ClaudeServiceError(
        'Claude service is not initialized',
        ClaudeErrorType.UNKNOWN_ERROR
      );
    }

    try {
      logger.debug('Sending chat request to Claude', {
        messageCount: messages.length,
        model: options?.model || this.config.model,
        hasTools: !!options?.tools,
        userId: options?.userId
      });

      // Format messages for Anthropic API
      const formattedMessages = this.formatMessages(messages);
      
      // Prepare request parameters
      const requestParams: Anthropic.Messages.MessageCreateParams = {
        model: options?.model || this.config.model!,
        max_tokens: options?.maxTokens || this.config.maxTokens!,
        temperature: options?.temperature || this.config.temperature,
        messages: formattedMessages,
        ...(options?.systemPrompt && { system: options.systemPrompt }),
        ...(options?.tools && { tools: options.tools })
      };

      let response = await this.client.messages.create(requestParams);

      logger.debug('Received response from Claude', {
        stopReason: response.stop_reason,
        usage: response.usage,
        hasToolUse: response.stop_reason === 'tool_use'
      });

      // Handle tool use requests
      if (response.stop_reason === 'tool_use' && options?.userId) {
        const toolResults = await this.handleToolUse(response, options.userId);
        
        // Continue conversation with tool results
        const continuationMessages = [
          ...formattedMessages,
          {
            role: 'assistant' as const,
            content: response.content
          },
          ...toolResults
        ];

        // Make another API call with tool results
        const continuationResponse = await this.client.messages.create({
          ...requestParams,
          messages: continuationMessages
        });

        response = continuationResponse;
        
        logger.debug('Received continuation response after tool use', {
          stopReason: continuationResponse.stop_reason,
          usage: continuationResponse.usage
        });
      }

      // Extract text content from final response
      const content = this.extractTextContent(response);

      return {
        role: 'assistant',
        content,
        timestamp: new Date(),
        id: response.id
      };

    } catch (error) {
      logger.error('Claude API error', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Handle tool use requests from Claude
   */
  private async handleToolUse(
    response: Anthropic.Messages.Message,
    userId: string
  ): Promise<Anthropic.Messages.MessageParam[]> {
    const toolResults: Anthropic.Messages.MessageParam[] = [];

    try {
      // Process each content block for tool use
      for (const contentBlock of response.content) {
        if (contentBlock.type === 'tool_use') {
          const { id: toolUseId, name: toolName, input: toolInput } = contentBlock;

          logger.debug('Executing tool from Claude', {
            toolName,
            toolUseId,
            userId,
            input: toolInput
          });

          // Execute the tool
          const toolResult = await executeToolCall(
            toolName,
            toolInput || {},
            userId,
            `claude_${toolUseId}`
          );

          // Format result for Claude
          const toolResultMessage: Anthropic.Messages.MessageParam = {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolUseId,
                content: toolResult.success 
                  ? toolResult.formattedResponse || JSON.stringify(toolResult.data)
                  : `Error: ${toolResult.error || 'Tool execution failed'}`,
                is_error: !toolResult.success
              }
            ]
          };

          toolResults.push(toolResultMessage);

          logger.debug('Tool execution completed for Claude', {
            toolName,
            toolUseId,
            success: toolResult.success,
            executionTime: toolResult.executionTime
          });
        }
      }
    } catch (error) {
      logger.error('Error handling tool use from Claude', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      
      // Return error result to Claude
      toolResults.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'error',
            content: 'Tool execution encountered an unexpected error. Please try again.',
            is_error: true
          }
        ]
      });
    }

    return toolResults;
  }

  /**
   * Send a chat message with streaming response
   */
  public async chatStream(
    messages: ChatMessage[],
    onChunk: (chunk: StreamingResponse) => void,
    options?: ChatOptions
  ): Promise<void> {
    if (!this.isReady()) {
      throw new ClaudeServiceError(
        'Claude service is not initialized',
        ClaudeErrorType.UNKNOWN_ERROR
      );
    }

    try {
      logger.debug('Starting streaming chat request to Claude', {
        messageCount: messages.length,
        model: options?.model || this.config.model
      });

      // Format messages for Anthropic API
      const formattedMessages = this.formatMessages(messages);
      
      // Prepare request parameters with streaming
      const requestParams: Anthropic.Messages.MessageCreateParams = {
        model: options?.model || this.config.model!,
        max_tokens: options?.maxTokens || this.config.maxTokens!,
        temperature: options?.temperature || this.config.temperature,
        messages: formattedMessages,
        stream: true,
        ...(options?.systemPrompt && { system: options.systemPrompt }),
        ...(options?.tools && { tools: options.tools })
      };

      const stream = await this.client.messages.create(requestParams);
      let accumulatedContent = '';

      for await (const chunk of stream) {
        try {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            accumulatedContent += chunk.delta.text;
            
            onChunk({
              content: accumulatedContent,
              isComplete: false
            });
          } else if (chunk.type === 'message_stop') {
            onChunk({
              content: accumulatedContent,
              isComplete: true
            });
            break;
          }
        } catch (chunkError) {
          logger.error('Error processing stream chunk', chunkError);
          onChunk({
            content: accumulatedContent,
            isComplete: true,
            error: 'Error processing response stream'
          });
          break;
        }
      }

    } catch (error) {
      logger.error('Claude streaming API error', error);
      const serviceError = this.handleApiError(error);
      onChunk({
        content: '',
        isComplete: true,
        error: serviceError.message
      });
      throw serviceError;
    }
  }

  /**
   * Send a single message (convenience method)
   */
  public async sendMessage(
    message: string,
    systemPrompt?: string,
    options?: ChatOptions
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: message,
        timestamp: new Date()
      }
    ];

    const response = await this.chat(messages, {
      ...options,
      systemPrompt
    });

    return response.content;
  }

  /**
   * Test the connection to Claude API
   */
  public async testConnection(): Promise<boolean> {
    try {
      const testMessage = await this.sendMessage(
        'Hello, please respond with just "OK" to test the connection.',
        'You are a test assistant. Respond with just "OK".',
        { maxTokens: 10, temperature: 0 }
      );
      
      const isWorking = testMessage.toLowerCase().includes('ok');
      logger.info('Claude connection test', { success: isWorking, response: testMessage });
      
      return isWorking;
    } catch (error) {
      logger.error('Claude connection test failed', error);
      return false;
    }
  }

  /**
   * Format messages for Anthropic API
   */
  private formatMessages(messages: ChatMessage[]): Anthropic.Messages.MessageParam[] {
    return messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
  }

  /**
   * Extract text content from Anthropic response
   */
  private extractTextContent(response: Anthropic.Messages.Message): string {
    return response.content
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.Messages.TextBlock).text)
      .join('');
  }

  /**
   * Handle API errors and convert to ClaudeServiceError
   */
  private handleApiError(error: any): ClaudeServiceError {
    if (error instanceof ClaudeServiceError) {
      return error;
    }

    // Handle specific Anthropic API errors
    if (error?.status) {
      switch (error.status) {
        case 401:
          return new ClaudeServiceError(
            'Invalid API key. Please check your Anthropic API key.',
            ClaudeErrorType.API_KEY_INVALID,
            error
          );
        case 429:
          return new ClaudeServiceError(
            'Rate limit exceeded. Please wait before making more requests.',
            ClaudeErrorType.RATE_LIMITED,
            error
          );
        case 400:
          return new ClaudeServiceError(
            'Invalid request. Please check your message format.',
            ClaudeErrorType.INVALID_REQUEST,
            error
          );
        default:
          return new ClaudeServiceError(
            `API error: ${error.message || 'Unknown error'}`,
            ClaudeErrorType.UNKNOWN_ERROR,
            error
          );
      }
    }

    // Handle network errors
    if (error?.code === 'NETWORK_ERROR' || error?.name === 'NetworkError') {
      return new ClaudeServiceError(
        'Network error. Please check your internet connection.',
        ClaudeErrorType.NETWORK_ERROR,
        error
      );
    }

    // Generic error handling
    return new ClaudeServiceError(
      error?.message || 'An unexpected error occurred',
      ClaudeErrorType.UNKNOWN_ERROR,
      error
    );
  }

  /**
   * Update service configuration
   */
  public updateConfig(newConfig: Partial<ClaudeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Claude service configuration updated', newConfig);
  }

  /**
   * Get current configuration (without API key for security)
   */
  public getConfig(): Omit<ClaudeConfig, 'apiKey'> {
    const { apiKey, ...publicConfig } = this.config;
    return publicConfig;
  }
}

// Create singleton instance
const claudeService = new ClaudeService();

export default claudeService;
export { claudeService };