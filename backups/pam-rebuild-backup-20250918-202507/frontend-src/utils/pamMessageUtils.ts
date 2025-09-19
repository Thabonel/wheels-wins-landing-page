/**
 * Utility functions for PAM message handling with consistent field extraction
 */

export interface PamMessage {
  type?: string;
  content?: string;
  message?: string;
  response?: string;
  text?: string;
  [key: string]: any;
}

/**
 * Extract message content from PAM message with standardized fallback logic
 * Handles inconsistency between backend message fields: content, message, response, text
 */
export function extractMessageContent(message: PamMessage): string {
  return message.content || message.message || message.response || message.text || '';
}

/**
 * Normalize PAM message to use consistent 'content' field
 */
export function normalizePamMessage(message: PamMessage): PamMessage & { content: string } {
  const content = extractMessageContent(message);
  return {
    ...message,
    content
  };
}

/**
 * Check if PAM message has valid content
 */
export function hasValidContent(message: PamMessage): boolean {
  const content = extractMessageContent(message);
  return Boolean(content && content.trim());
}

/**
 * Get message content with fallback
 */
export function getMessageContentSafe(message: PamMessage, fallback: string = ''): string {
  const content = extractMessageContent(message);
  return content && content.trim() ? content : fallback;
}