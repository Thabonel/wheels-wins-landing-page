/**
 * Avatar utility functions for generating and managing user avatars
 */

/**
 * Generates a fallback avatar URL using UI Avatars service
 * @param name - The user's name to generate initials from
 * @param userId - Optional user ID for consistent colors
 * @returns URL for the generated avatar
 */
export function generateAvatarUrl(name: string, userId?: string): string {
  // Clean and format the name
  const cleanName = (name || 'User').trim();
  
  // Generate initials (max 2 characters)
  const initials = cleanName
    .split(' ')
    .map(word => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
  
  // Generate a consistent background color based on userId or name
  const seed = userId || cleanName;
  const colors = [
    '3B82F6', // blue-500
    '10B981', // emerald-500
    '8B5CF6', // violet-500
    'F59E0B', // amber-500
    'EF4444', // red-500
    'EC4899', // pink-500
    '06B6D4', // cyan-500
    '84CC16', // lime-500
  ];
  
  // Simple hash function to get consistent color
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  const bgColor = colors[colorIndex];
  
  // Generate the avatar URL
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=${bgColor}&color=fff&bold=true&size=128&font-size=0.33`;
}

/**
 * Gets the avatar URL for a user, with fallback to generated avatar
 * @param avatarUrl - The user's avatar URL from database
 * @param name - The user's name for fallback generation
 * @param userId - The user's ID for consistent colors
 * @returns The avatar URL to use
 */
export function getUserAvatarUrl(avatarUrl?: string | null, name?: string, userId?: string): string {
  // If we have a valid avatar URL, use it
  if (avatarUrl && avatarUrl.startsWith('http')) {
    return avatarUrl;
  }
  
  // Otherwise generate a fallback
  return generateAvatarUrl(name || 'User', userId);
}

/**
 * Extracts initials from a name
 * @param name - The name to extract initials from
 * @returns The initials (max 2 characters)
 */
export function getInitials(name: string): string {
  return (name || 'U')
    .split(' ')
    .map(word => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
}