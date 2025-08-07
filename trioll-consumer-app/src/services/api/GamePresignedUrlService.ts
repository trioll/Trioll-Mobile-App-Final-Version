
/**
 * Service for getting presigned URLs for game assets
 * This bypasses S3 BlockPublicAccess restrictions
 */

import { Config } from '../../config/environments';
import { getLogger } from '../../utils/logger';

const logger = getLogger('GamePresignedUrlService');

class GamePresignedUrlService {
  private baseUrl = Config.API_BASE_URL;

  /**
   * Get a presigned URL for a game file
   * @param gameId - The game ID (folder name in S3)
   * @param file - The file to access (default: index.html)
   * @returns The presigned URL for the file
   */
  async getPresignedUrl(gameId: string, file: string = 'index.html'): Promise<string> {
    try {
      // First, try the Lambda endpoint for presigned URLs
      try {
        const response = await fetch(
          `${this.baseUrl}/games/${gameId}/presigned-url?file=${encodeURIComponent(file)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          return data.url;
        }
      } catch (_lambdaError) {
        // Lambda endpoint not available, trying direct S3...
      }

      // If Lambda fails, try direct S3 URL
      // Map game IDs to S3 folder names
      let s3FolderName = gameId;
      if (gameId === 'evolution-runner-001') {
        s3FolderName = 'Evolution-Runner';
      }

      // Return direct S3 URL as fallback
      const directUrl = `https://trioll-prod-games-us-east-1.s3.amazonaws.com/${s3FolderName}/${file}`;
      // Using direct S3 URL
      return directUrl;
    } catch (error) {
      // Error getting game URL

      // Re-throw the error so it can be handled by the caller
      throw error;
    }
  }

  /**
   * Get presigned URLs for multiple files
   * @param gameId - The game ID
   * @param files - Array of files to get URLs for
   * @returns Map of file names to presigned URLs
   */
  async getMultiplePresignedUrls(gameId: string, files: string[]): Promise<Record<string, string>> {
    const urls: Record<string, string> = {};

    // Batch requests could be optimized with a single Lambda call
    await Promise.all(
      files.map(async file => {
        try {
          urls[file] = await this.getPresignedUrl(gameId, file);
        } catch (error) {
          logger.error(`Failed to get URL for ${file}:`, error);
          urls[file] = '';
        }
      })
    );

    return urls;
  }

  /**
   * Check if a game has files in S3
   * Evolution Runner is currently the only game with actual files
   */
  hasGameFiles(gameId: string): boolean {
    const gamesWithFiles = ['Evolution-Runner', 'evolution-runner-001'];
    return gamesWithFiles.includes(gameId);
  }
}

export const gamePresignedUrlService = new GamePresignedUrlService();
export default GamePresignedUrlService;
