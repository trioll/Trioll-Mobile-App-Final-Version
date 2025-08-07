export class OfflineQueueManagerClass {
  private queue: any[] = [];
  
  addToQueue(action: any) {
    this.queue.push(action);
  }
  
  async processQueue() {
    // Mock implementation
    this.queue = [];
  }
  
  getQueueSize() {
    return this.queue.length;
  }
  
  clearQueue() {
    this.queue = [];
  }
}

export const OfflineQueueManager = new OfflineQueueManagerClass();
