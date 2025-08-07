export interface QueueItem {
  id: string;
  action: string;
  data: any;
  timestamp: number;
  retries: number;
}

class OfflineQueue {
  private queue: QueueItem[] = [];

  addToQueue(action: string, data: any): void {
    this.queue.push({
      id: Date.now().toString(),
      action,
      data,
      timestamp: Date.now(),
      retries: 0,
    });
  }

  async processQueue(): Promise<void> {
    // Process items in queue
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

export const offlineQueue = new OfflineQueue();
export default offlineQueue;
