/**
 * Avatar utility functions for generating consistent user avatars
 */

/**
 * Generates a deterministic avatar URL based on user ID or name
 * Uses UI Avatars service for consistent avatar generation
 */
export function generateAvatarUrl(identifier: string, name?: string): string {
  // Use UI Avatars service for consistent avatar generation
  const displayName = name || `User ${identifier.substring(0, 5)}`;
  const initials = displayName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  // Generate a consistent background color based on the identifier
  const colors = [
    '007bff', // Blue
    '28a745', // Green
    'dc3545', // Red
    'ffc107', // Yellow
    '17a2b8', // Cyan
    '6610f2', // Purple
    'e83e8c', // Pink
    'fd7e14', // Orange
  ];
  
  // Use identifier to deterministically select a color
  const colorIndex = identifier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const backgroundColor = colors[colorIndex];
  
  // Return UI Avatars URL with parameters
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${backgroundColor}&color=fff&size=200&bold=true`;
}

/**
 * Gets avatar URL with fallback
 * First tries to use provided avatar URL, then falls back to generated avatar
 */
export function getAvatarWithFallback(avatarUrl?: string | null, userId?: string, userName?: string): string {
  // If we have a valid avatar URL, use it
  if (avatarUrl && avatarUrl.startsWith('http')) {
    return avatarUrl;
  }
  
  // Otherwise generate one based on user ID or name
  const identifier = userId || userName || 'anonymous';
  return generateAvatarUrl(identifier, userName);
}