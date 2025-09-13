// Export main ClaudeService for easy importing
export { 
  ClaudeService, 
  ClaudeServiceError, 
  ClaudeErrorType,
  claudeService as default 
} from './claudeService';

export type { 
  ChatMessage, 
  StreamingResponse, 
  ClaudeConfig, 
  ChatOptions 
} from './claudeService';