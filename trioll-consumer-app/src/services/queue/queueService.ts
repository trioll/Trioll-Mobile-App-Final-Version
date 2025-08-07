/**
 * Queue Management Service
 * Provides queue status functionality and integrates with existing offline queue
 */

import { 
  QueueStatus, 
  QueueStatusResponse,
  QueueItem,
  QueueItemStatus,
  QueueStatistics,
  QueueStatisticsResponse,
  QueueItemsResponse,
  QueuePriority,
  QueueItemType,
  isQueueStatus
} from '../../types/queue.types';
import { 
  createSuccessResponse, 
  createErrorResponse 
} from '../../api/adapters/responseAdapter';
import { ApiErrorCode } from '../api/errorHandler';
import { offlineQueue, QueuedRequest } from '../api/offlineQueue';
import { triollAPIStandard } from '../api/TriollAPIStandard';
import { getLogger } from '../../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = getLogger('QueueService');

// Cache for queue statuses
const QUEUE_STATUS_CACHE_KEY = 'queue:status:cache';
const CACHE_TTL = 5000; // 5 seconds for pending/processing, longer for completed

interface QueueStatusCache {
  [queueId: string]: {
    status: QueueStatus;
    timestamp: number;
  };
}

export class QueueService {
  private statusCache: QueueStatusCache = {};
  private statusUpdateInterval?: NodeJS.Timeout;

  constructor() {
    this.loadCacheFromStorage();
    this.startStatusUpdateInterval();
  }

  /**
   * Get status of a specific queue item
   */
  async getQueueStatus(queueId: string): Promise<QueueStatusResponse> {
    try {
      // Check cache first
      const cached = await this.getCachedStatus(queueId);
      if (cached) {
        return createSuccessResponse(cached, 200);
      }

      // Check local offline queue
      const localStatus = await this.getLocalQueueStatus(queueId);
      if (localStatus) {
        await this.cacheStatus(queueId, localStatus);
        return createSuccessResponse(localStatus, 200);
      }

      // Fetch from API
      const response = await triollAPIStandard.makeRequest<QueueStatus>(
        `/queue/status/${queueId}`
      );

      if (response.success && response.data) {
        await this.cacheStatus(queueId, response.data);
        return createSuccessResponse(response.data, response.statusCode);
      }

      // If API doesn't have it, create a not found response
      return createErrorResponse(
        'Queue item not found',
        404,
        ApiErrorCode.NOT_FOUND,
        { queueId }
      );
    } catch (error) {
      logger.error('Failed to get queue status:', error);
      return createErrorResponse(
        'Failed to get queue status',
        500,
        ApiErrorCode.SERVER_ERROR
      );
    }
  }

  /**
   * Get status from local offline queue
   */
  private async getLocalQueueStatus(queueId: string): Promise<QueueStatus | null> {
    const requests = await offlineQueue.getQueuedRequests();
    const requestIndex = requests.findIndex(r => r.id === queueId);
    
    if (requestIndex === -1) return null;
    
    const request = requests[requestIndex];
    const pendingCount = requests.filter(r => 
      r.priority === request.priority && 
      requests.indexOf(r) <= requestIndex
    ).length;

    return {
      queueId: request.id,
      status: QueueItemStatus.PENDING,
      position: requestIndex + 1,
      totalItems: requests.length,
      estimatedTimeSeconds: this.estimateProcessingTime(pendingCount),
      metadata: {
        ...request.metadata,
        localQueue: true,
        priority: request.priority
      }
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStatistics(): Promise<QueueStatisticsResponse> {
    try {
      const localRequests = await offlineQueue.getQueuedRequests();
      const cachedStatuses = Object.values(this.statusCache).map(c => c.status);

      const stats: QueueStatistics = {
        totalItems: localRequests.length + cachedStatuses.length,
        pendingItems: localRequests.length,
        processingItems: cachedStatuses.filter(s => s.status === QueueItemStatus.PROCESSING).length,
        completedItems: cachedStatuses.filter(s => s.status === QueueItemStatus.COMPLETED).length,
        failedItems: cachedStatuses.filter(s => s.status === QueueItemStatus.FAILED).length,
        averageProcessingTime: 30, // 30 seconds average
        estimatedTimeRemaining: localRequests.length * 30,
        throughput: {
          itemsPerMinute: 2,
          itemsPerHour: 120
        }
      };

      return createSuccessResponse(stats, 200);
    } catch (error) {
      logger.error('Failed to get queue statistics:', error);
      return createErrorResponse(
        'Failed to get queue statistics',
        500,
        ApiErrorCode.SERVER_ERROR
      );
    }
  }

  /**
   * Add item to queue (wraps offline queue)
   */
  async addToQueue(
    endpoint: string,
    method: string,
    data?: any,
    priority: QueuePriority = QueuePriority.NORMAL
  ): Promise<string> {
    const queueId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await offlineQueue.addRequest({
      id: queueId,
      endpoint,
      method,
      data,
      priority,
      metadata: {
        queueId,
        createdAt: new Date().toISOString()
      }
    });

    // Create initial status
    const status: QueueStatus = {
      queueId,
      status: QueueItemStatus.PENDING,
      position: await this.getQueuePosition(queueId),
      totalItems: (await offlineQueue.getQueuedRequests()).length,
      metadata: { endpoint, method }
    };

    await this.cacheStatus(queueId, status);
    
    return queueId;
  }

  /**
   * Cancel a queue item
   */
  async cancelQueueItem(queueId: string): Promise<boolean> {
    try {
      // Update status to cancelled
      const status = await this.getCachedStatus(queueId);
      if (status) {
        status.status = QueueItemStatus.CANCELLED;
        await this.cacheStatus(queueId, status);
      }

      // Remove from offline queue if present
      const requests = await offlineQueue.getQueuedRequests();
      const filtered = requests.filter(r => r.id !== queueId);
      
      if (filtered.length < requests.length) {
        // Item was in queue and removed
        await AsyncStorage.setItem(
          'offlineQueue',
          JSON.stringify(filtered)
        );
        return true;
      }

      // Try API cancellation
      const response = await triollAPIStandard.makeRequest(
        `/queue/cancel/${queueId}`,
        { method: 'POST' }
      );

      return response.success;
    } catch (error) {
      logger.error('Failed to cancel queue item:', error);
      return false;
    }
  }

  /**
   * Get all queue items with pagination
   */
  async getQueueItems(
    page: number = 1,
    limit: number = 20,
    status?: QueueItemStatus
  ): Promise<QueueItemsResponse> {
    try {
      const localRequests = await offlineQueue.getQueuedRequests();
      
      // Convert offline queue requests to QueueItem format
      const items: QueueItem[] = localRequests.map((req, index) => ({
        id: req.id,
        type: QueueItemType.API_REQUEST,
        status: QueueItemStatus.PENDING,
        priority: req.priority as QueuePriority,
        createdAt: req.timestamp || new Date().toISOString(),
        updatedAt: req.timestamp || new Date().toISOString(),
        attempts: req.retryCount || 0,
        maxAttempts: req.maxRetries || 3,
        data: {
          endpoint: req.endpoint,
          method: req.method,
          body: req.data
        },
        metadata: req.metadata
      }));

      // Filter by status if provided
      const filteredItems = status 
        ? items.filter(item => item.status === status)
        : items;

      // Paginate
      const start = (page - 1) * limit;
      const paginatedItems = filteredItems.slice(start, start + limit);

      return createSuccessResponse(paginatedItems, 200, undefined);
    } catch (error) {
      logger.error('Failed to get queue items:', error);
      return createErrorResponse(
        'Failed to get queue items',
        500,
        ApiErrorCode.SERVER_ERROR
      );
    }
  }

  /**
   * Cache queue status
   */
  private async cacheStatus(queueId: string, status: QueueStatus): Promise<void> {
    this.statusCache[queueId] = {
      status,
      timestamp: Date.now()
    };

    // Persist to storage
    await this.saveCacheToStorage();
  }

  /**
   * Get cached status if valid
   */
  private async getCachedStatus(queueId: string): Promise<QueueStatus | null> {
    const cached = this.statusCache[queueId];
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    const ttl = this.getCacheTTL(cached.status.status);

    if (age > ttl) {
      delete this.statusCache[queueId];
      return null;
    }

    return cached.status;
  }

  /**
   * Get cache TTL based on status
   */
  private getCacheTTL(status: QueueItemStatus): number {
    switch (status) {
      case QueueItemStatus.COMPLETED:
      case QueueItemStatus.FAILED:
      case QueueItemStatus.CANCELLED:
        return 300000; // 5 minutes for terminal states
      case QueueItemStatus.PROCESSING:
        return 5000; // 5 seconds for processing
      default:
        return 10000; // 10 seconds for pending
    }
  }

  /**
   * Estimate processing time based on queue position
   */
  private estimateProcessingTime(position: number): number {
    // Simple estimation: 30 seconds per item
    return position * 30;
  }

  /**
   * Get queue position for an item
   */
  private async getQueuePosition(queueId: string): Promise<number> {
    const requests = await offlineQueue.getQueuedRequests();
    const index = requests.findIndex(r => r.id === queueId);
    return index === -1 ? 0 : index + 1;
  }

  /**
   * Load cache from storage
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(QUEUE_STATUS_CACHE_KEY);
      if (cached) {
        this.statusCache = JSON.parse(cached);
      }
    } catch (error) {
      logger.error('Failed to load queue cache:', error);
    }
  }

  /**
   * Save cache to storage
   */
  private async saveCacheToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        QUEUE_STATUS_CACHE_KEY,
        JSON.stringify(this.statusCache)
      );
    } catch (error) {
      logger.error('Failed to save queue cache:', error);
    }
  }

  /**
   * Start interval to update queue statuses
   */
  private startStatusUpdateInterval(): void {
    this.statusUpdateInterval = setInterval(async () => {
      // Clean up old cache entries
      const now = Date.now();
      for (const [queueId, cached] of Object.entries(this.statusCache)) {
        const age = now - cached.timestamp;
        const ttl = this.getCacheTTL(cached.status.status);
        
        if (age > ttl) {
          delete this.statusCache[queueId];
        }
      }

      await this.saveCacheToStorage();
    }, 30000); // Every 30 seconds
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
    }
  }
}

// Export singleton instance
export const queueService = new QueueService();