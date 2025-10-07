/**
 * Offline queue for API requests
 * Stores failed requests and retries them when connection is restored
 */

import { getLogger } from '../../utils/logger';
import { ApiError, ApiErrorCode } from './errorHandler';
import { withRetry, RetryOptions } from './retryMechanism';
import * as Network from 'expo-network';

const logger = getLogger('OfflineQueue');

export interface QueuedRequest {
  id: string;
  endpoint: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'normal' | 'low';
  metadata?: Record<string, unknown>;
}

export interface OfflineQueueOptions {
  maxQueueSize?: number;
  maxRetries?: number;
  syncInterval?: number;
  onSync?: (request: QueuedRequest) => void;
  onError?: (request: QueuedRequest, error: ApiError) => void;
  onSuccess?: (request: QueuedRequest) => void;
}

const DEFAULT_OPTIONS: Required<Omit<OfflineQueueOptions, 'onSync' | 'onError' | 'onSuccess'>> = {
  maxQueueSize: 100,
  maxRetries: 5,
  syncInterval: 30000, // 30 seconds
};

export class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private isOnline = true;
  private syncTimer: NodeJS.Timeout | null = null;
  private options: typeof DEFAULT_OPTIONS & OfflineQueueOptions;
  private processing = false;
  private storageKey = 'trioll_offline_queue';

  constructor(options: OfflineQueueOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load persisted queue
    await this.loadQueue();

    // Monitor network status
    setInterval(async () => {
      const state = await Network.getNetworkStateAsync();
      const wasOffline = !this.isOnline;
      this.isOnline = (state.isConnected && state.isInternetReachable) ?? false;

      if (wasOffline && this.isOnline) {
        logger.info('Connection restored, processing offline queue');
        this.processQueue();
      }
    }, 5000);

    // Check initial network state
    const netState = await Network.getNetworkStateAsync();
    this.isOnline = (netState.isConnected && netState.isInternetReachable) ?? false;

    // Start sync timer
    this.startSyncTimer();
  }

  /**
   * Add a request to the offline queue
   */
  async enqueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    if (this.queue.length >= this.options.maxQueueSize) {
      // Remove lowest priority oldest item
      const lowestPriorityIndex = this.queue.findIndex(item => item.priority === 'low');

      if (lowestPriorityIndex !== -1) {
        this.queue.splice(lowestPriorityIndex, 1);
      } else {
        this.queue.shift(); // Remove oldest
      }
    }

    const queuedRequest: QueuedRequest = {
      ...request,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(queuedRequest);

    // Sort by priority
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    await this.saveQueue();

    logger.info('Request queued for offline processing:', {
      endpoint: request.endpoint,
      method: request.method,
      queueSize: this.queue.length,
    });

    // Try to process immediately if online
    if (this.isOnline && !this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process queued requests
   */
  async processQueue(): Promise<void> {
    if (this.processing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const processedIds: string[] = [];

    try {
      for (let i = 0; i < [...this.queue].length; i++) {
        const request = [...this.queue][i];
        if (!this.isOnline) break;

        try {
          // Execute the request
          await this.executeRequest(request);

          // Success - remove from queue
          processedIds.push(request.id);
          this.options.onSuccess?.(request);
         } catch {
          const apiError =
            error instanceof ApiError
              ? error
              : new ApiError(ApiErrorCode.UNKNOWN_ERROR, 'Unknown error');

          // Check if error is due to being offline
          if (apiError.code === ApiErrorCode.NETWORK_ERROR) {
            this.isOnline = false;
            break;
          }

          // Increment retry count
          request.retryCount++;

          if (request.retryCount >= this.options.maxRetries) {
            // Max retries reached - remove from queue
            processedIds.push(request.id);
            logger.error('Max retries reached for queued request:', {
              endpoint: request.endpoint,
              error: apiError.message,
            });
            this.options.onError?.(request, apiError);
          }
        }
      }

      // Remove processed requests
      this.queue = this.queue.filter(req => !processedIds.includes(req.id));
      await this.saveQueue();
    } finally {
      this.processing = false;
    }
  }

  /**
   * Execute a queued request
   */
  private async executeRequest(request: QueuedRequest): Promise<void> {
    this.options.onSync?.(request);

    const retryOptions: RetryOptions = {
      maxRetries: 1, // Single attempt per queue processing
      timeout: 30000,
    };

    await withRetry(
      async () => {
        const response = await fetch(request.endpoint, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });

        if (!response.ok) {
          throw response;
        }

        return response.json();
      },
      request.endpoint,
      retryOptions
    );
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): {
    size: number;
    isOnline: boolean;
    isProcessing: boolean;
    oldestRequest?: Date;
  } {
    const oldestRequest =
      this.queue.length > 0 ? new Date(Math.min(...this.queue.map(r => r.timestamp))) : undefined;

    return {
      size: this.queue.length,
      isOnline: this.isOnline,
      isProcessing: this.processing,
      oldestRequest,
    };
  }

  /**
   * Clear the queue
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
    logger.info('Offline queue cleared');
  }

  /**
   * Get queued requests
   */
  getQueue(): QueuedRequest[] {
    return [...this.queue];
  }

  /**
   * Save queue to persistent storage
   */
  private async saveQueue(): Promise<void> {
    try {
      // Using a simple storage mechanism
      // In production, use proper storage like AsyncStorage or SecureStore
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
      }
    } catch {
      logger.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Load queue from persistent storage
   */
  private async loadQueue(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(this.storageKey);
        if (saved) {
          this.queue = JSON.parse(saved);
          logger.info(`Loaded ${this.queue.length} queued requests`);
        }
      }
    } catch {
      logger.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  /**
   * Start sync timer
   */
  private startSyncTimer(): void {
    this.stopSyncTimer();

    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.processing && this.queue.length > 0) {
        this.processQueue();
      }
    }, this.options.syncInterval);
  }

  /**
   * Stop sync timer
   */
  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopSyncTimer();
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();
