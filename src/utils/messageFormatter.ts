/**
 * Message Formatting Utilities for PAM Responses
 * Cleans up excessive markdown formatting for better chat UI display
 */

export interface FormattedMessage {
  content: string;
  hasStructure: boolean;
}

/**
 * Formats PAM response messages by cleaning excessive markdown
 * and making them more suitable for chat display
 */
export function formatPamMessage(rawMessage: string): FormattedMessage {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return { content: rawMessage || '', hasStructure: false };
  }

  let formatted = rawMessage;
  let hasStructure = false;

  // Remove excessive ## headers and replace with cleaner format
  formatted = formatted.replace(/^##\s+(.+)$/gm, (match, title) => {
    hasStructure = true;
    return `🗺️ ${title}`;
  });

  // Clean up route overview sections
  formatted = formatted.replace(/^#\s+(.+)$/gm, (match, title) => {
    hasStructure = true;
    return `📍 ${title}`;
  });

  // Convert bold markdown to emoji-enhanced format
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, (match, text) => {
    // Special handling for common travel terms
    if (text.includes('Distance') || text.includes('km') || text.includes('miles')) {
      return `🛣️ ${text}`;
    }
    if (text.includes('Duration') || text.includes('Time') || text.includes('hours')) {
      return `⏱️ ${text}`;
    }
    if (text.includes('Sydney') || text.includes('Melbourne') || text.includes('Hobart')) {
      return `📍 ${text}`;
    }
    if (text.includes('Ferry') || text.includes('Spirit of Tasmania')) {
      return `⛴️ ${text}`;
    }
    // Default: just remove the bold formatting
    return text;
  });

  // Clean up bullet points - make them more readable
  formatted = formatted.replace(/^-\s+\*\*(.*?)\*\*:\s*(.*)/gm, (match, title, description) => {
    hasStructure = true;
    return `• ${title}: ${description}`;
  });

  // Simple bullet points
  formatted = formatted.replace(/^-\s+(.+)/gm, '• $1');

  // Remove excessive whitespace and clean up line breaks
  formatted = formatted
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive line breaks
    .replace(/^\s+|\s+$/g, '')  // Trim start/end whitespace
    .replace(/\s{2,}/g, ' ');   // Replace multiple spaces with single space

  // Add emoji for common budget/cost terms
  formatted = formatted.replace(/\$(\d+(?:-\d+)?)/g, '💰 $$$1');
  
  // Add travel emoji for route directions
  formatted = formatted.replace(/→/g, ' ➡️ ');

  return {
    content: formatted,
    hasStructure
  };
}

/**
 * Formats long responses by adding better paragraph breaks
 * and improving readability for chat display
 */
export function formatLongMessage(message: string): string {
  const formatted = formatPamMessage(message);
  
  if (!formatted.hasStructure) {
    return formatted.content;
  }

  // For structured messages, add better spacing
  return formatted.content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

/**
 * Extract key information from travel responses for quick preview
 */
export function extractTravelSummary(message: string): string | null {
  const distanceMatch = message.match(/Distance.*?(\d+(?:,\d+)?)\s*km/i);
  const timeMatch = message.match(/Duration.*?(\d+(?:-\d+)?)\s*hours?/i);
  const costMatch = message.match(/\$(\d+(?:-\d+)?)/);

  const parts = [];
  if (distanceMatch) parts.push(`${distanceMatch[1]}km`);
  if (timeMatch) parts.push(`${timeMatch[1]}h`);
  if (costMatch) parts.push(`$${costMatch[1]}`);

  return parts.length > 0 ? parts.join(' • ') : null;
}