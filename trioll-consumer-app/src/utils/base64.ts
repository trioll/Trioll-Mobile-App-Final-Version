import { getLogger } from '../utils/logger';

const logger = getLogger('base64');

/**
 * Base64 utilities for React Native
 * Provides cross-platform base64 encoding/decoding
 */

/**
 * Decode base64 string to UTF-8
 * Replacement for browser's atob() function
 */
export const base64Decode = (str: string): string => {
  try {
    // Handle URL-safe base64
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    const padded = base64 + '=='.substring(0, (4 - (base64.length % 4)) % 4);

    // Use Buffer for Node.js/React Native environments
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(padded, 'base64').toString('utf-8');
    }

    // Fallback for environments without Buffer
    // This is a simple implementation for basic use cases
    throw new Error('Base64 decoding not supported in this environment');
  } catch {
    logger.error('Base64 decode error:', error);
    throw error;
  }
};

/**
 * Encode UTF-8 string to base64
 * Replacement for browser's btoa() function
 */
export const base64Encode = (str: string): string => {
  try {
    // Use Buffer for Node.js/React Native environments
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf-8').toString('base64');
    }

    // Fallback for environments without Buffer
    throw new Error('Base64 encoding not supported in this environment');
  } catch {
    logger.error('Base64 encode error:', error);
    throw error;
  }
};

/**
 * Decode JWT token payload
 * Extracts and decodes the payload section of a JWT
 */
export const decodeJWT = (token: string): any => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = parts[1];
    const decoded = base64Decode(payload);
    return JSON.parse(decoded);
  } catch {
    logger.error('JWT decode error:', error);
    throw error;
  }
};
