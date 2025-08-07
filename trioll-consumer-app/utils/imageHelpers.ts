// Helper to create placeholder image URLs
export const createPlaceholderImage = (_text: string, _bgColor: string): string => {
  // Use a verified working game thumbnail as fallback
  // This ensures images always load even when other services fail
  return 'https://img.gamedistribution.com/07326c59e55a4796b087aa7c3ac51204-512x512.jpeg';
};
