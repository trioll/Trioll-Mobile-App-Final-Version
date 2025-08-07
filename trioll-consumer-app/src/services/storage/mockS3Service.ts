/**
 * Mock S3 Service
 * UI-First implementation that simulates S3 storage without AWS SDK
 */

import { getLogger } from '../../utils/logger';
import { performanceMonitor } from '../monitoring/performanceMonitor';

const logger = getLogger('MockS3Service');

interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  onProgress?: (progress: number) => void;
}

interface SecureFile {
  key: string;
  size: number;
  lastModified: Date;
  url: string;
}

// Mock storage in memory
const mockStorage = new Map<string, {
  content: string | ArrayBuffer;
  metadata: any;
  lastModified: Date;
}>();

class MockS3Service {
  private mockUserId = 'mock-user-123';

  constructor() {
    logger.info('Mock S3 Service initialized - UI-first mode');
  }

  /**
   * Upload user content to mock storage
   */
  async uploadUserContent(
    filename: string,
    content: string | Blob | ArrayBuffer,
    options?: UploadOptions
  ): Promise<{ key: string; url: string }> {
    const startTime = Date.now();

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      // Simulate progress updates
      if (options?.onProgress) {
        for (let i = 0; i <= 100; i += 20) {
          options.onProgress(i);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      const key = `${this.mockUserId}/${filename}`;
      const mockContent = content instanceof Blob ? await content.text() : content;
      
      mockStorage.set(key, {
        content: mockContent,
        metadata: {
          contentType: options?.contentType || 'application/octet-stream',
          ...options?.metadata,
        },
        lastModified: new Date(),
      });

      performanceMonitor.recordMetric('mock_s3_upload_duration', Date.now() - startTime);

      logger.info(`Mock upload successful: ${key}`);
      
      return {
        key,
        url: `https://mock-s3.trioll.com/${key}`,
      };
    } catch (error) {
      performanceMonitor.recordMetric('mock_s3_upload_error', 1);
      throw error;
    }
  }

  /**
   * Get user content from mock storage
   */
  async getUserContent(key: string): Promise<{ content: ArrayBuffer; metadata: any }> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const data = mockStorage.get(key);
    if (!data) {
      throw new Error('File not found');
    }

    const content = typeof data.content === 'string' 
      ? new TextEncoder().encode(data.content).buffer
      : data.content;

    return {
      content,
      metadata: data.metadata,
    };
  }

  /**
   * Delete user content from mock storage
   */
  async deleteUserContent(key: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!mockStorage.has(key)) {
      throw new Error('File not found');
    }

    mockStorage.delete(key);
    logger.info(`Mock delete successful: ${key}`);
  }

  /**
   * List user files from mock storage
   */
  async listUserFiles(prefix?: string): Promise<SecureFile[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const userPrefix = `${this.mockUserId}/${prefix || ''}`;
    const files: SecureFile[] = [];

    for (const [key, data] of mockStorage.entries()) {
      if (key.startsWith(userPrefix)) {
        files.push({
          key,
          size: data.content instanceof ArrayBuffer 
            ? data.content.byteLength 
            : new TextEncoder().encode(data.content.toString()).length,
          lastModified: data.lastModified,
          url: `https://mock-s3.trioll.com/${key}`,
        });
      }
    }

    return files;
  }

  /**
   * Generate presigned URL for mock storage
   */
  async generatePresignedUrl(
    key: string,
    operation: 'get' | 'put',
    expiresIn = 3600
  ): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const timestamp = Date.now();
    const signature = btoa(`${key}-${operation}-${timestamp}-${expiresIn}`);
    
    return `https://mock-s3.trioll.com/${key}?signature=${signature}&expires=${timestamp + expiresIn * 1000}`;
  }

  /**
   * Initialize service (no-op for mock)
   */
  async initialize(idToken?: string): Promise<void> {
    logger.info('Mock S3 service initialized', { hasToken: !!idToken });
  }

  /**
   * Get game assets (mock implementation)
   */
  async getGameAssets(gameId: string): Promise<{
    thumbnailUrl: string;
    coverImageUrl: string;
    videoUrl?: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      thumbnailUrl: `https://mock-s3.trioll.com/games/${gameId}/thumbnail.jpg`,
      coverImageUrl: `https://mock-s3.trioll.com/games/${gameId}/cover.jpg`,
      videoUrl: `https://mock-s3.trioll.com/games/${gameId}/trailer.mp4`,
    };
  }

  /**
   * Clear credentials (no-op for mock)
   */
  clearCredentials(): void {
    logger.info('Mock credentials cleared');
  }

  /**
   * Check if user is authenticated (always true for mock)
   */
  isAuthenticated(): boolean {
    return true;
  }
}

// Export singleton instance
export const mockS3Service = new MockS3Service();

// Export as secureS3Service for compatibility
export const secureS3Service = mockS3Service;

// Export for testing
export { MockS3Service };