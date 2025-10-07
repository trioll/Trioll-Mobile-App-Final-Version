import { getLogger } from '../utils/logger';

const logger = getLogger('backendValidation');

/**
 * Safe backend validation loader
 * This module provides a safe way to load backend validation without causing early initialization errors
 */

export async function loadBackendValidation() {
  try {
    // Dynamically import the backend validation module
    const { runBackendValidation } = await import('../services/backend/runBackendValidation');

    // Make it available globally
    if (typeof global !== 'undefined') {
      (global as any).runBackendValidation = runBackendValidation;
    }

    logger.info('✅ Backend validation loaded successfully');
    logger.info('You can now use: await runBackendValidation({ verbose: true })');

    return runBackendValidation;
  } catch {
    logger.error('❌ Failed to load backend validation:', error);
    throw error;
  }
}

// Export a helper to check if backend validation is available
export function isBackendValidationAvailable(): boolean {
  return typeof (global as any).runBackendValidation === 'function';
}
