/**
 * Gemini Service Entry Point
 * Primary AI provider for PAM with optimal speed/cost ratio
 */

export {
  GeminiService,
  createGeminiService,
  getGeminiService,
  initializeGemini
} from './geminiService';

export type {
  ChatMessage,
  StreamingResponse,
  GeminiConfig,
  ChatOptions,
  ToolCall
} from './geminiService';

// Default export for easy importing
export { GeminiService as default } from './geminiService';