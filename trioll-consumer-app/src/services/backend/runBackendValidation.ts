/**
 * Backend Validation Runner
 * Wrapper function to run backend validation from the console
 */

import { backendReadinessValidator } from './backendReadinessValidator';
import { getLogger } from '../../utils/logger';

const logger = getLogger('BackendValidationRunner');

export interface ValidationOptions {
  skipHealthCheck?: boolean;
  skipAuthentication?: boolean;
  skipDatabase?: boolean;
  skipWebSocket?: boolean;
  skipPerformance?: boolean;
  skipSecurity?: boolean;
  skipMonitoring?: boolean;
  skipIntegration?: boolean;
  verbose?: boolean;
}

/**
 * Run comprehensive backend validation
 * Can be called from the React Native console:
 * await runBackendValidation({ verbose: true })
 */
export async function runBackendValidation(options: ValidationOptions = {}) {
  try {
    logger.info('Starting Backend Validation...');

    // Run the validation
    const report = await backendReadinessValidator.validateBackend();

    // Return the report
    return report;
  } catch {
    logger.error('Backend validation failed:', error);
    throw error;
  }
}

// Make it available globally for console access
if (typeof global !== 'undefined') {
  (global as { runBackendValidation?: typeof runBackendValidation }).runBackendValidation =
    runBackendValidation;
}

// Export for regular imports
export default runBackendValidation;
