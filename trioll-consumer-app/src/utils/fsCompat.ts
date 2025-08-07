import * as FileSystem from 'expo-file-system';

import { getLogger } from '../utils/logger';

const logger = getLogger('fsCompat');
// RNFS-compatible API using Expo FileSystem
export const RNFS = {
  // Directory paths
  DocumentDirectoryPath: FileSystem.documentDirectory || '',
  CachesDirectoryPath: FileSystem.cacheDirectory || '',
  TemporaryDirectoryPath: FileSystem.cacheDirectory || '',

  /**
   * Check if file exists
   */
  async exists(filepath: string): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(filepath);
      return info.exists;
    } catch (error) {
      logger.warn('FileSystem exists error:', error);
      return false;
    }
  },

  /**
   * Get file info
   */
  async stat(
    filepath: string
  ): Promise<{ size: number; isFile: () => boolean; isDirectory: () => boolean }> {
    try {
      const info = await FileSystem.getInfoAsync(filepath);
      return {
        size: info.exists && 'size' in info ? info.size : 0,
        isFile: () => info.exists && !info.isDirectory,
        isDirectory: () => info.exists && (info.isDirectory || false),
      };
    } catch (error) {
      logger.warn('FileSystem stat error:', error);
      throw error;
    }
  },

  /**
   * Read directory
   */
  async readDir(dirpath: string): Promise<
    Array<{
      name: string;
      path: string;
      size: number;
      isFile: () => boolean;
      isDirectory: () => boolean;
    }>
  > {
    try {
      const files = await FileSystem.readDirectoryAsync(dirpath);
      const results = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filepath = `${dirpath }/${file}`;
        const info = await FileSystem.getInfoAsync(filepath);

        results.push({
          name: file,
          path: filepath,
          size: info.exists && 'size' in info ? info.size : 0,
          isFile: () => info.exists && !info.isDirectory,
          isDirectory: () => info.exists && (info.isDirectory || false),
        });
      }

      return results;
    } catch (error) {
      logger.warn('FileSystem readDir error:', error);
      return [];
    }
  },

  /**
   * Create directory
   */
  async mkdir(
    filepath: string,
    options?: { NSURLIsExcludedFromBackupKey?: boolean }
  ): Promise<void> {
    try {
      await FileSystem.makeDirectoryAsync(filepath, { intermediates: true });
    } catch (error) {
      logger.warn('FileSystem mkdir error:', error);
      throw error;
    }
  },

  /**
   * Delete file
   */
  async unlink(filepath: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(filepath, { idempotent: true });
    } catch (error) {
      logger.warn('FileSystem unlink error:', error);
      throw error;
    }
  },

  /**
   * Move file
   */
  async moveFile(from: string, to: string): Promise<void> {
    try {
      await FileSystem.moveAsync({ from, to });
    } catch (error) {
      logger.warn('FileSystem moveFile error:', error);
      throw error;
    }
  },

  /**
   * Copy file
   */
  async copyFile(from: string, to: string): Promise<void> {
    try {
      await FileSystem.copyAsync({ from, to });
    } catch (error) {
      logger.warn('FileSystem copyFile error:', error);
      throw error;
    }
  },

  /**
   * Write file
   */
  async writeFile(filepath: string, contents: string, encoding?: string): Promise<void> {
    try {
      await FileSystem.writeAsStringAsync(filepath, contents, {
        encoding:
          encoding === 'base64' ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
      });
    } catch (error) {
      logger.warn('FileSystem writeFile error:', error);
      throw error;
    }
  },

  /**
   * Read file
   */
  async readFile(filepath: string, encoding?: string): Promise<string> {
    try {
      const contents = await FileSystem.readAsStringAsync(filepath, {
        encoding:
          encoding === 'base64' ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
      });
      return contents;
    } catch (error) {
      logger.warn('FileSystem readFile error:', error);
      throw error;
    }
  },

  /**
   * Download file
   */
  async downloadFile(options: {
    fromUrl: string;
    toFile: string;
    headers?: { [key: string]: string };
    background?: boolean;
    progressDivider?: number;
    begin?: (res: unknown) => void;
    progress?: (res: unknown) => void;
  }): Promise<{ promise: Promise<{ statusCode: number; bytesWritten: number }> }> {
    const downloadPromise = FileSystem.downloadAsync(options.fromUrl, options.toFile, {
      headers: options.headers,
    }).then(_result => ({
      statusCode: 200, // Expo doesn't provide status code
      bytesWritten: 0, // Expo doesn't provide bytes written
    }));

    return {
      promise: downloadPromise,
    };
  },

  /**
   * Get free disk storage
   */
  async getFSInfo(): Promise<{ totalSpace: number; freeSpace: number }> {
    try {
      const info = await FileSystem.getFreeDiskStorageAsync();
      return {
        totalSpace: info || 0,
        freeSpace: info || 0,
      };
    } catch (error) {
      logger.warn('FileSystem getFSInfo error:', error);
      return { totalSpace: 0, freeSpace: 0 };
    }
  },
};

// Export as default
export default RNFS;
