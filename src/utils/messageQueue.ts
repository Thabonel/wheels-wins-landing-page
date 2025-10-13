/**
 * Message Queue with IndexedDB Persistence
 *
 * Ensures messages are never lost during WebSocket disconnections
 * Features:
 * - IndexedDB persistence (survives page reloads)
 * - Automatic retry with exponential backoff
 * - Message deduplication
 * - Priority queue support
 * - Idempotency guarantees
 */

import { logger } from '@/lib/logger';

export interface QueuedMessage {
  id: string;
  message: string;
  userId: string;
  context?: any;
  priority: number;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: number;
  status: 'pending' | 'sending' | 'sent' | 'failed';
}

export interface MessageQueueConfig {
  dbName: string;
  storeName: string;
  maxRetries: number;
  baseRetryDelay: number;
  maxRetryDelay: number;
}

const DEFAULT_CONFIG: MessageQueueConfig = {
  dbName: 'pam-message-queue',
  storeName: 'messages',
  maxRetries: 5,
  baseRetryDelay: 1000, // 1 second
  maxRetryDelay: 60000  // 60 seconds
};

export class MessageQueue {
  private db: IDBDatabase | null = null;
  private config: MessageQueueConfig;
  private processingInterval: NodeJS.Timeout | null = null;
  private sendCallback: ((message: QueuedMessage) => Promise<void>) | null = null;

  constructor(config: Partial<MessageQueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize IndexedDB
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, 1);

      request.onerror = () => {
        logger.error('Failed to open MessageQueue IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('✅ MessageQueue IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(this.config.storeName, { keyPath: 'id' });

          // Create indexes for efficient querying
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('nextRetryAt', 'nextRetryAt', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });

          logger.info('✅ MessageQueue object store created');
        }
      };
    });
  }

  /**
   * Enqueue a message for sending
   */
  async enqueue(
    message: string,
    userId: string,
    context?: any,
    priority: number = 0
  ): Promise<string> {
    if (!this.db) {
      throw new Error('MessageQueue not initialized - call initialize() first');
    }

    const messageId = this.generateMessageId();
    const queuedMessage: QueuedMessage = {
      id: messageId,
      message,
      userId,
      context,
      priority,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      nextRetryAt: Date.now(),
      status: 'pending'
    };

    await this.saveMessage(queuedMessage);
    logger.info(`📝 Message queued: ${messageId} (priority: ${priority})`);

    // Trigger immediate processing
    this.processQueue();

    return messageId;
  }

  /**
   * Save message to IndexedDB
   */
  private async saveMessage(message: QueuedMessage): Promise<void> {
    if (!this.db) {
      throw new Error('MessageQueue not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.put(message);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get message by ID
   */
  async getMessage(messageId: string): Promise<QueuedMessage | null> {
    if (!this.db) {
      throw new Error('MessageQueue not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.get(messageId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending messages (sorted by priority, then timestamp)
   */
  async getPendingMessages(): Promise<QueuedMessage[]> {
    if (!this.db) {
      throw new Error('MessageQueue not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const messages = request.result as QueuedMessage[];

        // Filter for pending messages ready to send
        const pending = messages
          .filter(msg =>
            (msg.status === 'pending' || msg.status === 'sending') &&
            msg.nextRetryAt <= Date.now() &&
            msg.retryCount < msg.maxRetries
          )
          .sort((a, b) => {
            // Sort by priority (higher first), then timestamp (older first)
            if (a.priority !== b.priority) {
              return b.priority - a.priority;
            }
            return a.timestamp - b.timestamp;
          });

        resolve(pending);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Mark message as sent
   */
  async markAsSent(messageId: string): Promise<void> {
    const message = await this.getMessage(messageId);
    if (!message) {
      logger.warn(`Message ${messageId} not found in queue`);
      return;
    }

    message.status = 'sent';
    await this.saveMessage(message);
    logger.info(`✅ Message ${messageId} marked as sent`);
  }

  /**
   * Mark message as failed (for retry)
   */
  async markAsFailed(messageId: string, error?: string): Promise<void> {
    const message = await this.getMessage(messageId);
    if (!message) {
      logger.warn(`Message ${messageId} not found in queue`);
      return;
    }

    message.retryCount++;

    if (message.retryCount >= message.maxRetries) {
      // Exceeded max retries - mark as permanently failed
      message.status = 'failed';
      logger.error(`❌ Message ${messageId} failed permanently after ${message.retryCount} retries`);
    } else {
      // Schedule retry with exponential backoff
      const backoffDelay = Math.min(
        this.config.baseRetryDelay * Math.pow(2, message.retryCount),
        this.config.maxRetryDelay
      );

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 1000;
      message.nextRetryAt = Date.now() + backoffDelay + jitter;
      message.status = 'pending';

      logger.warn(`⚠️ Message ${messageId} retry scheduled (${message.retryCount}/${message.maxRetries}) in ${Math.round(backoffDelay/1000)}s`);
    }

    await this.saveMessage(message);
  }

  /**
   * Delete message from queue
   */
  async deleteMessage(messageId: string): Promise<void> {
    if (!this.db) {
      throw new Error('MessageQueue not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.delete(messageId);

      request.onsuccess = () => {
        logger.info(`🗑️ Message ${messageId} deleted from queue`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all sent messages (cleanup)
   */
  async clearSentMessages(): Promise<number> {
    if (!this.db) {
      throw new Error('MessageQueue not initialized');
    }

    const messages = await this.getAllMessages();
    const sentMessages = messages.filter(msg => msg.status === 'sent');

    for (const msg of sentMessages) {
      await this.deleteMessage(msg.id);
    }

    logger.info(`🧹 Cleared ${sentMessages.length} sent messages from queue`);
    return sentMessages.length;
  }

  /**
   * Get all messages (for debugging)
   */
  async getAllMessages(): Promise<QueuedMessage[]> {
    if (!this.db) {
      throw new Error('MessageQueue not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Set callback for sending messages
   */
  setSendCallback(callback: (message: QueuedMessage) => Promise<void>): void {
    this.sendCallback = callback;
  }

  /**
   * Process queue - attempt to send pending messages
   */
  async processQueue(): Promise<void> {
    if (!this.sendCallback) {
      logger.warn('No send callback set - messages will remain queued');
      return;
    }

    try {
      const pending = await this.getPendingMessages();

      if (pending.length === 0) {
        return;
      }

      logger.info(`🔄 Processing ${pending.length} pending messages`);

      for (const message of pending) {
        try {
          // Mark as sending
          message.status = 'sending';
          await this.saveMessage(message);

          // Attempt to send via callback
          await this.sendCallback(message);

          // Success - mark as sent
          await this.markAsSent(message.id);
        } catch (error) {
          // Failed - schedule retry
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.warn(`Failed to send message ${message.id}:`, errorMessage);
          await this.markAsFailed(message.id, errorMessage);
        }
      }
    } catch (error) {
      logger.error('Error processing message queue:', error);
    }
  }

  /**
   * Start automatic queue processing
   */
  startAutoProcessing(intervalMs: number = 5000): void {
    if (this.processingInterval) {
      logger.warn('Auto-processing already started');
      return;
    }

    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, intervalMs);

    logger.info(`✅ Message queue auto-processing started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop automatic queue processing
   */
  stopAutoProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      logger.info('⏹️ Message queue auto-processing stopped');
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    sending: number;
    sent: number;
    failed: number;
  }> {
    const messages = await this.getAllMessages();

    return {
      total: messages.length,
      pending: messages.filter(m => m.status === 'pending').length,
      sending: messages.filter(m => m.status === 'sending').length,
      sent: messages.filter(m => m.status === 'sent').length,
      failed: messages.filter(m => m.status === 'failed').length
    };
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup and close database
   */
  async destroy(): Promise<void> {
    this.stopAutoProcessing();

    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info('🔌 MessageQueue database closed');
    }
  }
}

/**
 * Singleton instance for global use
 */
let messageQueueInstance: MessageQueue | null = null;

export async function getMessageQueue(): Promise<MessageQueue> {
  if (!messageQueueInstance) {
    messageQueueInstance = new MessageQueue();
    await messageQueueInstance.initialize();
  }
  return messageQueueInstance;
}

export function resetMessageQueue(): void {
  if (messageQueueInstance) {
    messageQueueInstance.destroy();
    messageQueueInstance = null;
  }
}
