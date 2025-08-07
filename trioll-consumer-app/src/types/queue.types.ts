/**
 * Queue Management Types
 * Defines types for queue status and management functionality
 */

import { StandardSuccessResponse, StandardErrorResponse } from './api.types';

// Queue item status
export enum QueueItemStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying'
}

// Queue priority levels
export enum QueuePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Queue item type
export enum QueueItemType {
  API_REQUEST = 'api_request',
  ANALYTICS_EVENT = 'analytics_event',
  GAME_SUBMISSION = 'game_submission',
  USER_ACTION = 'user_action',
  FILE_UPLOAD = 'file_upload',
  BACKGROUND_SYNC = 'background_sync'
}

// Base queue item interface
export interface QueueItem {
  id: string;
  type: QueueItemType;
  status: QueueItemStatus;
  priority: QueuePriority;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  maxAttempts: number;
  data: Record<string, any>;
  metadata?: {
    userId?: string;
    sessionId?: string;
    correlationId?: string;
    source?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
    lastAttemptAt?: string;
  };
}

// Queue status information
export interface QueueStatus {
  queueId: string;
  status: QueueItemStatus;
  position?: number;
  totalItems?: number;
  estimatedTimeSeconds?: number;
  progress?: number;
  startedAt?: string;
  completedAt?: string;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
  metadata?: Record<string, any>;
}

// Queue statistics
export interface QueueStatistics {
  totalItems: number;
  pendingItems: number;
  processingItems: number;
  completedItems: number;
  failedItems: number;
  averageProcessingTime: number;
  estimatedTimeRemaining: number;
  throughput: {
    itemsPerMinute: number;
    itemsPerHour: number;
  };
}

// Queue configuration
export interface QueueConfig {
  maxConcurrentItems?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  batchSize?: number;
  priorityWeights?: {
    [QueuePriority.CRITICAL]: number;
    [QueuePriority.HIGH]: number;
    [QueuePriority.NORMAL]: number;
    [QueuePriority.LOW]: number;
  };
}

// API Response types
export interface QueueStatusResponse extends StandardSuccessResponse<QueueStatus> {
  data: QueueStatus;
}

export interface QueueItemResponse extends StandardSuccessResponse<QueueItem> {
  data: QueueItem;
}

export interface QueueStatisticsResponse extends StandardSuccessResponse<QueueStatistics> {
  data: QueueStatistics;
}

export interface QueueItemsResponse extends StandardSuccessResponse<QueueItem[]> {
  data: QueueItem[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// Queue operation results
export interface QueueAddResult {
  success: boolean;
  queueId: string;
  position: number;
  estimatedTimeSeconds?: number;
}

export interface QueueCancelResult {
  success: boolean;
  queueId: string;
  wasCancelled: boolean;
  reason?: string;
}

// Type guards
export function isQueueStatus(data: any): data is QueueStatus {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.queueId === 'string' &&
    typeof data.status === 'string' &&
    Object.values(QueueItemStatus).includes(data.status)
  );
}

export function isQueueItem(data: any): data is QueueItem {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.type === 'string' &&
    typeof data.status === 'string' &&
    typeof data.priority === 'string' &&
    typeof data.createdAt === 'string'
  );
}

// Helper functions
export function isQueueItemRetryable(item: QueueItem): boolean {
  return (
    item.status === QueueItemStatus.FAILED &&
    item.attempts < item.maxAttempts &&
    (!item.error || item.error.details?.retryable !== false)
  );
}

export function getQueueItemAge(item: QueueItem): number {
  return Date.now() - new Date(item.createdAt).getTime();
}

export function estimateQueueTime(position: number, averageProcessingTime: number): number {
  return Math.ceil(position * averageProcessingTime);
}