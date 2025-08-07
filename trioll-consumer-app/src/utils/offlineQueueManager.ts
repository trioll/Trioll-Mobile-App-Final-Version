import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { getLogger } from './logger';

const logger = getLogger('offlineQueueManager');

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'normal' | 'low';
}

export interface OfflineQueueConfig {
  maxQueueSize: number;
  maxRetries: number;
  retryDelay: number;
  priorityOrder: boolean;
  persistQueue: boolean;
  processInterval: number;
}

class OfflineQueueManager {
  private queue: QueuedRequest[] = [];
  private config: OfflineQueueConfig;
  private isProcessing = false;
  private processingTimer: NodeJS.Timeout | null = null;
  private networkListener: any = null;
  private storageKey = 'offline_request_queue';

  constructor(config: Partial<OfflineQueueConfig> = {}) {
    this.config = {
      maxQueueSize: 100,
      maxRetries: 3,
      retryDelay: 5000,
      priorityOrder: true,
      persistQueue: true,
      processInterval: 30000,
      ...config,
    };

    this.initialize();
  }

  private async initialize() {
    // Load persisted queue
    if (this.config.persistQueue) {
      await this.loadQueue();
    }

    // Start processing queue periodically
    this.startProcessingTimer();

    logger.info('Offline queue manager initialized', {
      queueSize: this.queue.length,
    });
  }

  private async loadQueue() {
    try {
      const data = await AsyncStorage.getItem(this.storageKey);
      if (data) {
        this.queue = JSON.parse(data);
        logger.info(`Loaded ${this.queue.length} queued requests`);
      }
    } catch (error) {
      logger.error('Failed to load queued requests', error);
    }
  }

  private async saveQueue() {
    if (!this.config.persistQueue) return;

    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      logger.error('Failed to save queued requests', error);
    }
  }

  enqueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): string {
    const id = this.generateRequestId();
    const queuedRequest: QueuedRequest = {
      ...request,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: request.maxRetries || this.config.maxRetries,
    };

    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove oldest low priority request
      const lowPriorityIndex = this.queue.findIndex(r => r.priority === 'low');
      if (lowPriorityIndex !== -1) {
        this.queue.splice(lowPriorityIndex, 1);
      } else {
        // Remove oldest request
        this.queue.shift();
      }
    }

    this.queue.push(queuedRequest);
    this.sortQueue();
    this.saveQueue();

    logger.info('Request queued', { id, url: request.url });

    // Try to process immediately
    this.processQueue();

    return id;
  }

  dequeue(id: string): boolean {
    const index = this.queue.findIndex(r => r.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
      return true;
    }
    return false;
  }

  private sortQueue() {
    if (!this.config.priorityOrder) return;

    const priorityWeight = { high: 3, normal: 2, low: 1 };
    this.queue.sort((a, b) => {
      // Sort by priority then by timestamp
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    // Check network connectivity
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected || !networkState.isInternetReachable) {
      logger.info('No network connection, skipping queue processing');
      return;
    }

    this.isProcessing = true;
    logger.info(`Processing ${this.queue.length} queued requests`);

    const processedRequests: string[] = [];

    for (const request of [...this.queue]) {
      try {
        const success = await this.processRequest(request);
        if (success) {
          processedRequests.push(request.id);
        }
      } catch (error) {
        logger.error(`Failed to process request ${request.id}`, error);
      }

      // Check network after each request
      const currentNetworkState = await Network.getNetworkStateAsync();
      if (!currentNetworkState.isConnected) {
        logger.info('Lost network connection, pausing queue processing');
        break;
      }
    }

    // Remove successfully processed requests
    this.queue = this.queue.filter(r => !processedRequests.includes(r.id));
    this.saveQueue();

    this.isProcessing = false;
    logger.info(`Processed ${processedRequests.length} requests, ${this.queue.length} remaining`);
  }

  private async processRequest(request: QueuedRequest): Promise<boolean> {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      if (response.ok) {
        logger.info(`Successfully processed queued request ${request.id}`);
        return true;
      }

      // Check if error is retryable
      if (response.status >= 500 || response.status === 429) {
        return this.handleRetry(request);
      }

      // Non-retryable error, remove from queue
      logger.error(`Non-retryable error for request ${request.id}`, {
        status: response.status,
      });
      return true; // Remove from queue
    } catch (error) {
      // Network error, retry
      return this.handleRetry(request);
    }
  }

  private handleRetry(request: QueuedRequest): boolean {
    request.retryCount++;

    if (request.retryCount >= request.maxRetries) {
      logger.error(`Max retries reached for request ${request.id}`);
      return true; // Remove from queue
    }

    logger.info(`Retrying request ${request.id} (attempt ${request.retryCount})`);
    return false; // Keep in queue
  }

  private startProcessingTimer() {
    if (this.processingTimer) return;

    this.processingTimer = setInterval(() => {
      this.processQueue();
    }, this.config.processInterval);
  }

  private stopProcessingTimer() {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getQueue(): QueuedRequest[] {
    return [...this.queue];
  }

  async clearQueue() {
    this.queue = [];
    await this.saveQueue();
    logger.info('Queue cleared');
  }

  dispose() {
    this.stopProcessingTimer();
    this.saveQueue();
  }
}

export const offlineQueueManager = new OfflineQueueManager();