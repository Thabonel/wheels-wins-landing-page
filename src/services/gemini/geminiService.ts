import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/logger';
import { getToolsForGemini } from '@/services/pam/tools/toolRegistry';
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
 * Get the optimal Gemini model (Flash for speed and cost-efficiency)
 */
function getOptimalGeminiModel(): string {
  // Use Gemini Flash models for optimal performance/cost ratio
  const availableModels = [
    'gemini-1.5-flash',      // Primary: fastest and cheapest
    'gemini-1.5-pro',       // Fallback: more capable but slower/costlier
    'gemini-pro',           // Legacy fallback
  ];

  return availableModels[0]; // Use Flash model as primary
}

/**
 * Gemini service configuration
 */
export interface GeminiConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Chat options for customizing requests
 */
export interface ChatOptions {
  systemMessage?: string;
  tools?: boolean;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * Tool call interface
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Initialize Gemini client with API key
 */
export function initializeGemini(config: GeminiConfig) {
  if (!config.apiKey) {
    throw new Error('Gemini API key is required. Please set VITE_GEMINI_API_KEY environment variable.');
  }

  try {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({
      model: config.model || getOptimalGeminiModel(),
      generationConfig: {
        temperature: config.temperature || 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: config.maxTokens || 8192,
        responseMimeType: "text/plain",
      }
    });

    return model;
  } catch (error) {
    logger.error('Failed to initialize Gemini:', error);
    throw new Error(`Failed to initialize Gemini: ${error}`);
  }
}

/**
 * Enhanced Gemini Service with tool calling and streaming support
 */
export class GeminiService {
  private client: any;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = config;
    this.client = initializeGemini(config);
  }

  /**
   * Convert messages to Gemini format
   */
  private convertMessagesToGeminiFormat(messages: ChatMessage[]) {
    const conversationParts = [];
    let systemInstruction = null;

    for (const message of messages) {
      if (message.role === 'system') {
        systemInstruction = message.content;
      } else if (message.role === 'user') {
        conversationParts.push({
          role: 'user',
          parts: [{ text: message.content }]
        });
      } else if (message.role === 'assistant') {
        conversationParts.push({
          role: 'model',
          parts: [{ text: message.content }]
        });
      }
    }

    return { conversationParts, systemInstruction };
  }

  /**
   * Send a single message to Gemini
   */
  async sendMessage(
    message: string,
    options: ChatOptions = {}
  ): Promise<string> {
    try {
      logger.info('Sending message to Gemini Flash');

      const messages: ChatMessage[] = [];

      if (options.systemMessage) {
        messages.push({
          role: 'system',
          content: options.systemMessage
        });
      }

      messages.push({
        role: 'user',
        content: message
      });

      const { conversationParts, systemInstruction } = this.convertMessagesToGeminiFormat(messages);

      // Create model with system instruction if provided
      let model = this.client;
      if (systemInstruction) {
        const genAI = new GoogleGenerativeAI(this.config.apiKey);
        model = genAI.getGenerativeModel({
          model: this.config.model || getOptimalGeminiModel(),
          systemInstruction: systemInstruction,
          generationConfig: {
            temperature: options.temperature || 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: options.maxTokens || 8192,
            responseMimeType: "text/plain",
          }
        });
      }

      const result = await model.generateContent(message);
      const response = await result.response;
      const text = response.text();

      logger.info('Received response from Gemini Flash');
      return text;

    } catch (error) {
      logger.error('Gemini API error:', error);
      throw new Error(`Gemini API error: ${error}`);
    }
  }

  /**
   * Send a chat conversation to Gemini
   */
  async sendChat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<string> {
    try {
      logger.info('Sending chat conversation to Gemini Flash');

      const { conversationParts, systemInstruction } = this.convertMessagesToGeminiFormat(messages);

      // Create model with system instruction if provided
      const genAI = new GoogleGenerativeAI(this.config.apiKey);
      const model = genAI.getGenerativeModel({
        model: this.config.model || getOptimalGeminiModel(),
        systemInstruction: systemInstruction,
        generationConfig: {
          temperature: options.temperature || 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: options.maxTokens || 8192,
          responseMimeType: "text/plain",
        }
      });

      let result;

      if (conversationParts.length === 1 && conversationParts[0].role === 'user') {
        // Single user message
        result = await model.generateContent(conversationParts[0].parts[0].text);
      } else {
        // Multi-turn conversation
        const chat = model.startChat({
          history: conversationParts.slice(0, -1) // All but the last message
        });

        const lastMessage = conversationParts[conversationParts.length - 1];
        result = await chat.sendMessage(lastMessage.parts[0].text);
      }

      const response = await result.response;
      const text = response.text();

      logger.info('Received chat response from Gemini Flash');
      return text;

    } catch (error) {
      logger.error('Gemini chat error:', error);
      throw new Error(`Gemini chat error: ${error}`);
    }
  }

  /**
   * Send a streaming chat conversation to Gemini
   */
  async *sendChatStream(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    try {
      logger.info('Sending streaming chat to Gemini Flash');

      const { conversationParts, systemInstruction } = this.convertMessagesToGeminiFormat(messages);

      // Create model with system instruction if provided
      const genAI = new GoogleGenerativeAI(this.config.apiKey);
      const model = genAI.getGenerativeModel({
        model: this.config.model || getOptimalGeminiModel(),
        systemInstruction: systemInstruction,
        generationConfig: {
          temperature: options.temperature || 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: options.maxTokens || 8192,
          responseMimeType: "text/plain",
        }
      });

      let streamResponse;

      if (conversationParts.length === 1 && conversationParts[0].role === 'user') {
        // Single user message
        streamResponse = await model.generateContentStream(conversationParts[0].parts[0].text);
      } else {
        // Multi-turn conversation
        const chat = model.startChat({
          history: conversationParts.slice(0, -1) // All but the last message
        });

        const lastMessage = conversationParts[conversationParts.length - 1];
        streamResponse = await chat.sendMessageStream(lastMessage.parts[0].text);
      }

      let fullContent = '';

      for await (const chunk of streamResponse.stream) {
        const chunkText = chunk.text();
        fullContent += chunkText;

        yield {
          content: chunkText,
          isComplete: false
        };
      }

      // Final chunk indicating completion
      yield {
        content: fullContent,
        isComplete: true
      };

      logger.info('Completed streaming response from Gemini Flash');

    } catch (error) {
      logger.error('Gemini streaming error:', error);
      yield {
        content: '',
        isComplete: true,
        error: `Gemini streaming error: ${error}`
      };
    }
  }

  /**
   * Health check for Gemini service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.sendMessage('Hello');
      return !!response;
    } catch (error) {
      logger.error('Gemini health check failed:', error);
      return false;
    }
  }

  /**
   * Get model information
   */
  getModelInfo() {
    return {
      provider: 'gemini',
      model: this.config.model || getOptimalGeminiModel(),
      maxTokens: this.config.maxTokens || 8192,
      contextWindow: 1048576, // 1M tokens
      costPer1MTokens: {
        input: 0.075, // $0.075 per 1M input tokens (Flash)
        output: 0.30   // $0.30 per 1M output tokens (Flash)
      }
    };
  }
}

/**
 * Create a default Gemini service instance
 */
export function createGeminiService(): GeminiService | null {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    logger.warn('VITE_GEMINI_API_KEY not found. Gemini service unavailable.');
    return null;
  }

  return new GeminiService({
    apiKey,
    model: getOptimalGeminiModel(),
    temperature: 0.7,
    maxTokens: 8192
  });
}

/**
 * Singleton instance for easy access
 */
let geminiServiceInstance: GeminiService | null = null;

export function getGeminiService(): GeminiService | null {
  if (!geminiServiceInstance) {
    geminiServiceInstance = createGeminiService();
  }
  return geminiServiceInstance;
}

export default GeminiService;