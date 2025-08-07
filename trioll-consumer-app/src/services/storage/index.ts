/**
 * Storage Service Export
 * For UI-first development, exports mock service instead of AWS S3
 */

// Export mock service as the default for UI-first development
export { secureS3Service } from './mockS3Service';