/**
 * PAM Offline Message Queue - Day 3 Fallback Implementation
 * Queues messages when PAM is offline and syncs when connection is restored
 */

import { EventEmitter } from 'events';

export interface QueuedMessage {
  id: string;
  content: string;
  timestamp: number;
  userId: string;
  type: 'chat' | 'command' | 'voice';
  metadata?: Record<string, any>;
  priority: 'high' | 'normal' | 'low';
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'expired';
}

export interface QueueConfig {
  maxQueueSize: number;
  maxRetries: number;
  retryDelay: number;
  enablePersistence: boolean;
  enablePriority: boolean;
  expirationTime: number; // milliseconds
}

export interface QueueStats {
  totalMessages: number;
  pendingMessages: number;
  sentMessages: number;
  failedMessages: number;
  queueSize: number;
  oldestMessage?: number;
  newestMessage?: number;
}

const DEFAULT_CONFIG: QueueConfig = {
  maxQueueSize: 100,
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  enablePersistence: true,
  enablePriority: true,
  expirationTime: 24 * 60 * 60 * 1000 // 24 hours
};

export class PAMOfflineQueue extends EventEmitter {
  private config: QueueConfig;
  private queue: QueuedMessage[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private storageKey: string = 'pam_offline_queue';

  constructor(config: Partial<QueueConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Load persisted queue on initialization
    if (this.config.enablePersistence) {
      this.loadFromStorage();
    }

    // Set up network status monitoring
    this.setupNetworkMonitoring();

    // Set up periodic cleanup
    this.setupPeriodicCleanup();
  }

  /**
   * Add a message to the offline queue
   */
  enqueue(
    content: string,
    userId: string,
    options: {
      type?: 'chat' | 'command' | 'voice';
      priority?: 'high' | 'normal' | 'low';
      metadata?: Record<string, any>;
      maxRetries?: number;
    } = {}
  ): string {
    const messageId = this.generateMessageId();

    const message: QueuedMessage = {
      id: messageId,
      content,
      userId,
      timestamp: Date.now(),
      type: options.type || 'chat',
      priority: options.priority || 'normal',
      metadata: options.metadata || {},
      retryCount: 0,
      maxRetries: options.maxRetries || this.config.maxRetries,
      status: 'pending'
    };

    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove oldest low-priority message to make room
      this.removeOldestLowPriorityMessage();
    }

    // Insert message in priority order if priority is enabled
    if (this.config.enablePriority) {
      this.insertByPriority(message);
    } else {
      this.queue.push(message);
    }

    // Persist to storage
    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    this.emit('messageQueued', message);

    // Try to sync immediately if online
    if (this.isOnline && !this.syncInProgress) {
      this.syncQueue();
    }

    return messageId;
  }

  /**
   * Remove a message from the queue
   */
  dequeue(messageId: string): QueuedMessage | null {
    const index = this.queue.findIndex(msg => msg.id === messageId);
    if (index === -1) return null;

    const message = this.queue.splice(index, 1)[0];

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    this.emit('messageDequeued', message);
    return message;
  }

  /**
   * Get the next message to send (highest priority, oldest timestamp)
   */
  getNextMessage(): QueuedMessage | null {
    const pendingMessages = this.queue.filter(msg =>
      msg.status === 'pending' && !this.isExpired(msg)
    );

    if (pendingMessages.length === 0) return null;

    // Sort by priority (high -> normal -> low) then by timestamp (oldest first)
    pendingMessages.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];

      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    return pendingMessages[0];
  }

  /**
   * Mark a message as sent successfully
   */
  markAsSent(messageId: string): boolean {
    const message = this.queue.find(msg => msg.id === messageId);
    if (!message) return false;

    message.status = 'sent';

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    this.emit('messageSent', message);
    return true;
  }

  /**
   * Mark a message as failed and potentially retry
   */
  markAsFailed(messageId: string, error: string): boolean {
    const message = this.queue.find(msg => msg.id === messageId);
    if (!message) return false;

    message.retryCount++;

    if (message.retryCount >= message.maxRetries) {
      message.status = 'failed';
      this.emit('messageFailed', message, error);
    } else {
      message.status = 'pending';
      this.emit('messageRetry', message, error);

      // Schedule retry
      setTimeout(() => {
        if (this.isOnline && !this.syncInProgress) {
          this.syncQueue();
        }
      }, this.config.retryDelay * message.retryCount);
    }

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    return true;
  }

  /**
   * Sync the entire queue with the server
   */
  async syncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    this.emit('syncStarted');

    try {
      let syncedCount = 0;
      let message = this.getNextMessage();

      while (message && syncedCount < 10) { // Limit to 10 messages per sync batch
        try {
          message.status = 'sending';
          this.emit('messageSending', message);

          // Simulate sending message (replace with actual API call)
          await this.sendMessage(message);

          this.markAsSent(message.id);
          syncedCount++;

        } catch (error) {
          this.markAsFailed(message.id, error instanceof Error ? error.message : 'Unknown error');
        }

        message = this.getNextMessage();
      }

      this.emit('syncCompleted', { syncedCount });

    } catch (error) {
      this.emit('syncError', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Clear all messages from the queue
   */
  clearQueue(filter?: (message: QueuedMessage) => boolean): number {
    const originalLength = this.queue.length;

    if (filter) {
      this.queue = this.queue.filter(msg => !filter(msg));
    } else {
      this.queue = [];
    }

    const removedCount = originalLength - this.queue.length;

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    this.emit('queueCleared', { removedCount });
    return removedCount;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const pending = this.queue.filter(msg => msg.status === 'pending');
    const sent = this.queue.filter(msg => msg.status === 'sent');
    const failed = this.queue.filter(msg => msg.status === 'failed');

    const timestamps = this.queue.map(msg => msg.timestamp);

    return {
      totalMessages: this.queue.length,
      pendingMessages: pending.length,
      sentMessages: sent.length,
      failedMessages: failed.length,
      queueSize: this.queue.length,
      oldestMessage: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestMessage: timestamps.length > 0 ? Math.max(...timestamps) : undefined
    };
  }

  /**
   * Get all messages in the queue
   */
  getAllMessages(): QueuedMessage[] {
    return [...this.queue];
  }

  /**
   * Get messages by status
   */
  getMessagesByStatus(status: QueuedMessage['status']): QueuedMessage[] {
    return this.queue.filter(msg => msg.status === status);
  }

  /**
   * Set up network status monitoring
   */
  private setupNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('networkOnline');

      // Start syncing when back online
      setTimeout(() => {
        if (!this.syncInProgress) {
          this.syncQueue();
        }
      }, 1000);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('networkOffline');
    });
  }

  /**
   * Set up periodic cleanup of expired messages
   */
  private setupPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredMessages();
    }, 60000); // Clean up every minute
  }

  /**
   * Clean up expired messages
   */
  private cleanupExpiredMessages(): void {
    const originalLength = this.queue.length;
    this.queue = this.queue.filter(msg => !this.isExpired(msg));

    if (this.queue.length < originalLength) {
      if (this.config.enablePersistence) {
        this.saveToStorage();
      }
      this.emit('messagesExpired', { count: originalLength - this.queue.length });
    }
  }

  /**
   * Check if a message is expired
   */
  private isExpired(message: QueuedMessage): boolean {
    return Date.now() - message.timestamp > this.config.expirationTime;
  }

  /**
   * Insert message by priority
   */
  private insertByPriority(message: QueuedMessage): void {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    const messagePriority = priorityOrder[message.priority];

    let insertIndex = this.queue.length;

    for (let i = 0; i < this.queue.length; i++) {
      const queuedPriority = priorityOrder[this.queue[i].priority];

      if (messagePriority > queuedPriority ||
          (messagePriority === queuedPriority && message.timestamp < this.queue[i].timestamp)) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, message);
  }

  /**
   * Remove oldest low-priority message to make room
   */
  private removeOldestLowPriorityMessage(): void {
    // Find oldest low-priority message
    let oldestIndex = -1;
    let oldestTimestamp = Infinity;

    for (let i = 0; i < this.queue.length; i++) {
      const msg = this.queue[i];
      if (msg.priority === 'low' && msg.timestamp < oldestTimestamp) {
        oldestTimestamp = msg.timestamp;
        oldestIndex = i;
      }
    }

    // If no low-priority messages, remove oldest normal priority
    if (oldestIndex === -1) {
      for (let i = 0; i < this.queue.length; i++) {
        const msg = this.queue[i];
        if (msg.priority === 'normal' && msg.timestamp < oldestTimestamp) {
          oldestTimestamp = msg.timestamp;
          oldestIndex = i;
        }
      }
    }

    // Remove the oldest found message
    if (oldestIndex !== -1) {
      const removed = this.queue.splice(oldestIndex, 1)[0];
      this.emit('messageEvicted', removed);
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Simulate sending a message (replace with actual API call)
   */
  private async sendMessage(message: QueuedMessage): Promise<void> {
    // This would be replaced with actual WebSocket or HTTP API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate 95% success rate
        if (Math.random() < 0.95) {
          resolve();
        } else {
          reject(new Error('Network error'));
        }
      }, Math.random() * 1000 + 500); // 500ms to 1.5s delay
    });
  }

  /**
   * Save queue to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Failed to save queue to storage:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
        this.emit('queueLoaded', { messageCount: this.queue.length });
      }
    } catch (error) {
      console.warn('Failed to load queue from storage:', error);
      this.queue = [];
    }
  }

  /**
   * Destroy the queue and clean up
   */
  destroy(): void {
    this.queue = [];
    this.removeAllListeners();

    if (this.config.enablePersistence) {
      try {
        localStorage.removeItem(this.storageKey);
      } catch (error) {
        console.warn('Failed to clear queue storage:', error);
      }
    }
  }
}

export default PAMOfflineQueue;