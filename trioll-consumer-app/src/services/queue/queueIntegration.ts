/**
 * Queue Integration Examples
 * Shows how to integrate the queue service with other parts of the application
 */

import { queueService } from './queueService';
import { QueuePriority, QueueItemStatus } from '../../types/queue.types';
import { standardWebSocketService } from '../websocket/StandardWebSocketService';
import { WebSocketMessageType } from '../../types/websocket.types';
import { getLogger } from '../../utils/logger';

const logger = getLogger('QueueIntegration');

/**
 * Environment Activator Integration
 * Provides queue status checking for environment switching
 */
export async function checkActivationStatus(activationId: string) {
  const response = await queueService.getQueueStatus(activationId);
  
  if (!response.success) {
    throw new Error(response.message);
  }
  
  return response.data;
}

/**
 * Game Submission Queue Integration
 * Queue game submissions for review
 */
export async function queueGameSubmission(
  gameData: any,
  userId: string
): Promise<string> {
  const queueId = await queueService.addToQueue(
    '/games/submit',
    'POST',
    gameData,
    QueuePriority.NORMAL
  );

  // Subscribe to queue updates via WebSocket
  standardWebSocketService.subscribeToQueueUpdates(queueId, (update) => {
    logger.info('Game submission update:', update.data);
    
    if (update.data.status === QueueItemStatus.COMPLETED) {
      logger.info('Game submission completed:', queueId);
    } else if (update.data.status === QueueItemStatus.FAILED) {
      logger.error('Game submission failed:', update.data.error);
    }
  });

  return queueId;
}

/**
 * Analytics Queue Integration
 * Queue analytics events for batch processing
 */
export async function queueAnalyticsEvent(
  eventData: any,
  priority: QueuePriority = QueuePriority.LOW
): Promise<string> {
  return await queueService.addToQueue(
    '/analytics/events',
    'POST',
    eventData,
    priority
  );
}

/**
 * File Upload Queue Integration
 * Queue large file uploads with progress tracking
 */
export async function queueFileUpload(
  file: any,
  endpoint: string
): Promise<{
  queueId: string;
  unsubscribe: () => void;
}> {
  const queueId = await queueService.addToQueue(
    endpoint,
    'POST',
    { file },
    QueuePriority.NORMAL
  );

  // Subscribe to progress updates
  const unsubscribe = standardWebSocketService.subscribeToQueueUpdates(
    queueId,
    (update) => {
      if (update.data.progress !== undefined) {
        logger.info(`Upload progress: ${update.data.progress}%`);
      }
    }
  );

  return { queueId, unsubscribe };
}

/**
 * Staging Validator Integration
 * Check staging environment readiness
 */
export async function validateStagingEnvironment(): Promise<{
  isReady: boolean;
  queueStatuses: Map<string, QueueItemStatus>;
}> {
  const criticalQueues = [
    'staging_db_migration',
    'staging_api_deployment',
    'staging_cache_warmup'
  ];

  const statuses = new Map<string, QueueItemStatus>();
  let allReady = true;

  for (const queueId of criticalQueues) {
    const response = await queueService.getQueueStatus(queueId);
    
    if (response.success) {
      statuses.set(queueId, response.data.status);
      
      if (response.data.status !== QueueItemStatus.COMPLETED) {
        allReady = false;
      }
    } else {
      // Queue not found means it hasn't been created yet
      statuses.set(queueId, QueueItemStatus.PENDING);
      allReady = false;
    }
  }

  return {
    isReady: allReady,
    queueStatuses: statuses
  };
}

/**
 * User Action Queue Integration
 * Queue user actions when offline
 */
export async function queueUserAction(
  action: string,
  data: any,
  userId: string
): Promise<string> {
  const queueId = await queueService.addToQueue(
    `/users/${userId}/actions`,
    'POST',
    { action, data, timestamp: new Date().toISOString() },
    QueuePriority.HIGH
  );

  // Notify user that action is queued
  standardWebSocketService.sendStandardMessage(
    WebSocketMessageType.NOTIFICATION,
    {
      notificationId: `queue_${queueId}`,
      type: 'system',
      title: 'Action Queued',
      message: 'Your action will be processed when connection is restored',
      priority: 'low'
    },
    'notifications'
  );

  return queueId;
}

/**
 * Batch Queue Status Check
 * Check multiple queue items at once
 */
export async function checkMultipleQueueStatuses(
  queueIds: string[]
): Promise<Map<string, QueueItemStatus>> {
  const statuses = new Map<string, QueueItemStatus>();

  await Promise.all(
    queueIds.map(async (queueId) => {
      const response = await queueService.getQueueStatus(queueId);
      if (response.success) {
        statuses.set(queueId, response.data.status);
      }
    })
  );

  return statuses;
}

/**
 * Queue Health Monitor
 * Monitor overall queue health
 */
export async function monitorQueueHealth(): Promise<{
  isHealthy: boolean;
  metrics: {
    queueLength: number;
    processingRate: number;
    errorRate: number;
    averageWaitTime: number;
  };
}> {
  const stats = await queueService.getQueueStatistics();
  
  if (!stats.success) {
    return {
      isHealthy: false,
      metrics: {
        queueLength: 0,
        processingRate: 0,
        errorRate: 1,
        averageWaitTime: 0
      }
    };
  }

  const { totalItems, failedItems, throughput, averageProcessingTime } = stats.data;
  const errorRate = totalItems > 0 ? failedItems / totalItems : 0;
  const isHealthy = errorRate < 0.1 && throughput.itemsPerMinute > 0;

  return {
    isHealthy,
    metrics: {
      queueLength: totalItems,
      processingRate: throughput.itemsPerMinute,
      errorRate,
      averageWaitTime: averageProcessingTime
    }
  };
}