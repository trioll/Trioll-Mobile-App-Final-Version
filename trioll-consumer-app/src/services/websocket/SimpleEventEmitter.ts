/**
 * Simple Event Emitter for React Native
 * Replaces Node.js EventEmitter which is not available in React Native
 */

import { getLogger } from '../../utils/logger';

const logger = getLogger('SimpleEventEmitter');

type EventHandler = (...args: unknown[]) => void;

export class SimpleEventEmitter {
  private events: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    const handlers = this.events.get(event)!;
    handlers.add(handler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    };
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          logger.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  once(event: string, handler: EventHandler): () => void {
    const onceHandler = (...args: unknown[]) => {
      handler(...args);
      this.off(event, onceHandler);
    };
    return this.on(event, onceHandler);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  listenerCount(event: string): number {
    const handlers = this.events.get(event);
    return handlers ? handlers.size : 0;
  }

  eventNames(): string[] {
    return Array.prototype.slice.call(this.events.keys());
  }
}
