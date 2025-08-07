/**
 * Color-based avatar generator for user profiles
 * Generates consistent, unique avatars based on user ID or name
 */

import { Platform } from 'react-native';

// Vibrant color palette for avatars
const AVATAR_COLORS = [
  '#FF2D55', // Neon pink
  '#FF3B30', // Red
  '#FF6B6B', // Coral
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#00FF88', // Neon green
  '#34C759', // Green
  '#00FFFF', // Cyan
  '#5AC8FA', // Light blue
  '#007AFF', // Blue
  '#5856D6', // Purple
  '#8866FF', // Violet
  '#AF52DE', // Magenta
  '#FF2D92', // Hot pink
  '#00C7BE', // Teal
];

/**
 * Generate a consistent color based on a string (user ID or name)
 */
function getColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Get initials from a display name or username
 */
function getInitials(name: string): string {
  if (!name || name.trim() === '') {
    return '?';
  }

  // Handle guest users
  if (name.toLowerCase().startsWith('guest')) {
    return 'G';
  }

  // Get first two initials from name
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  
  // Single word - use first two characters
  return name.slice(0, 2).toUpperCase();
}

/**
 * Generate an SVG avatar with initials and background color
 */
function generateSVGAvatar(initials: string, color: string, size: number = 200): string {
  const fontSize = size * 0.4;
  
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${color}" rx="${size * 0.1}"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" 
            fill="white" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial" 
            font-size="${fontSize}" font-weight="600">
        ${initials}
      </text>
    </svg>
  `;
  
  return svg.trim();
}

/**
 * Convert SVG to data URI
 */
function svgToDataUri(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Generate a color-based avatar URL
 * @param identifier - User ID, username, or email to generate avatar from
 * @param displayName - Display name to extract initials from
 * @param size - Avatar size in pixels (default: 200)
 * @returns Data URI of the generated avatar
 */
export function generateAvatar(
  identifier: string,
  displayName?: string,
  size: number = 200
): string {
  // Use identifier for color consistency
  const color = getColorFromString(identifier);
  
  // Use display name for initials, fallback to identifier
  const nameForInitials = displayName || identifier;
  const initials = getInitials(nameForInitials);
  
  // Generate SVG avatar
  const svg = generateSVGAvatar(initials, color, size);
  
  // Return as data URI
  return svgToDataUri(svg);
}

/**
 * Generate avatar specifically for guest users
 */
export function generateGuestAvatar(guestId: string): string {
  const guestNumber = guestId.replace(/\D/g, '').slice(-4) || '0000';
  return generateAvatar(guestId, `Guest ${guestNumber}`);
}

/**
 * Generate avatar for authenticated users
 */
export function generateUserAvatar(userId: string, displayName?: string): string {
  return generateAvatar(userId, displayName);
}

/**
 * Get a default avatar for anonymous/error states
 */
export function getDefaultAvatar(): string {
  return generateAvatar('default', '?');
}

/**
 * Check if a URL is a placeholder image that should be replaced
 */
export function isPlaceholderImage(url?: string): boolean {
  if (!url) return true;
  
  const placeholderDomains = [
    'via.placeholder.com',
    'placeholder.com',
    'placeholdit.com',
    'placehold.it',
    'picsum.photos',
    'loremflickr.com',
    'lorempixel.com'
  ];
  
  return placeholderDomains.some(domain => url.includes(domain));
}

/**
 * Get avatar URL with fallback to generated avatar
 */
export function getAvatarUrl(
  avatarUrl?: string,
  identifier?: string,
  displayName?: string
): string {
  // If we have a valid non-placeholder URL, use it
  if (avatarUrl && !isPlaceholderImage(avatarUrl)) {
    return avatarUrl;
  }
  
  // Otherwise generate an avatar
  if (identifier) {
    return generateAvatar(identifier, displayName);
  }
  
  // Final fallback
  return getDefaultAvatar();
}

// Export color palette for use in other components
export { AVATAR_COLORS };

// Platform-specific adjustments
export const AVATAR_CONFIG = {
  defaultSize: Platform.select({ ios: 200, android: 200, default: 200 }),
  cornerRadius: Platform.select({ ios: 0.1, android: 0.1, default: 0.1 }), // As percentage of size
};