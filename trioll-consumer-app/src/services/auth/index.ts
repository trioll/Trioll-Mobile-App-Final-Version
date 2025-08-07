/**
 * Auth Service Export
 * Production mode - using real AWS Cognito authentication
 */

// Export real Cognito service for production
export { cognitoAuthService } from './cognitoAuthService';
export { authService } from './authServiceAdapter';