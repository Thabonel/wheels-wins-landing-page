/**
 * TTS Queue Manager - Handles voice message queuing and playback
 * Prevents overlapping speech and manages voice priorities
 */

export interface QueuedMessage {
  id: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: number;
  context?: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export class TTSQueueManager {
  private queue: QueuedMessage[] = [];
  private currentMessage: QueuedMessage | null = null;
  private isProcessing = false;
  private currentAudio: HTMLAudioElement | null = null;
  private onSpeakingChange?: (isSpeaking: boolean) => void;
  private onInterrupt?: () => void;

  constructor(
    onSpeakingChange?: (isSpeaking: boolean) => void,
    onInterrupt?: () => void
  ) {
    this.onSpeakingChange = onSpeakingChange;
    this.onInterrupt = onInterrupt;
  }

  /**
   * Add a message to the queue
   */
  enqueue(message: Omit<QueuedMessage, 'id' | 'timestamp'>): string {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queuedMessage: QueuedMessage = {
      ...message,
      id,
      timestamp: Date.now()
    };

    // Insert based on priority
    if (message.priority === 'urgent') {
      // Urgent messages go to the front
      this.queue.unshift(queuedMessage);
      // Interrupt current speech for urgent messages
      if (this.isProcessing) {
        this.interrupt();
      }
    } else if (message.priority === 'high') {
      // High priority goes after urgent but before others
      const urgentCount = this.queue.filter(m => m.priority === 'urgent').length;
      this.queue.splice(urgentCount, 0, queuedMessage);
    } else {
      // Normal and low priority go to the end
      this.queue.push(queuedMessage);
    }

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Process the queue
   */
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.onSpeakingChange?.(true);

    while (this.queue.length > 0) {
      this.currentMessage = this.queue.shift()!;
      
      try {
        await this.speakMessage(this.currentMessage);
        this.currentMessage.onComplete?.();
      } catch (error) {
        console.error('TTS Queue Manager: Error speaking message', error);
        this.currentMessage.onError?.(error as Error);
      }
    }

    this.currentMessage = null;
    this.isProcessing = false;
    this.onSpeakingChange?.(false);
  }

  /**
   * Speak a single message
   */
  private async speakMessage(message: QueuedMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      // Import voice service dynamically to avoid circular dependencies
      import('@/lib/voiceService').then(async ({ pamVoiceService }) => {
        try {
          const voiceResponse = await pamVoiceService.generateVoice({
            text: message.content,
            priority: message.priority,
            context: message.context as any
          });

          // Create and play audio
          this.currentAudio = new Audio(voiceResponse.audioUrl);
          this.currentAudio.volume = 1.0;

          this.currentAudio.onended = () => {
            this.cleanup();
            resolve();
          };

          this.currentAudio.onerror = (error) => {
            console.error('Audio playback error:', error);
            this.cleanup();
            reject(new Error('Audio playback failed'));
          };

          await this.currentAudio.play();
        } catch (error) {
          this.cleanup();
          reject(error);
        }
      });
    });
  }

  /**
   * Interrupt current speech
   */
  interrupt() {
    if (this.currentAudio && !this.currentAudio.paused) {
      console.log('🔇 Interrupting current speech');
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.cleanup();
      this.onInterrupt?.();
      
      // If there was a current message, put it back at high priority
      if (this.currentMessage && this.currentMessage.priority !== 'urgent') {
        this.currentMessage.priority = 'high';
        this.queue.unshift(this.currentMessage);
      }
      
      this.currentMessage = null;
      this.isProcessing = false;
      this.onSpeakingChange?.(false);
      
      // Continue processing queue
      this.processQueue();
    }
  }

  /**
   * Stop all speech and clear queue
   */
  stopAll() {
    this.interrupt();
    this.queue = [];
    this.currentMessage = null;
    this.isProcessing = false;
    this.onSpeakingChange?.(false);
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      currentMessage: this.currentMessage,
      priorities: this.queue.reduce((acc, msg) => {
        acc[msg.priority] = (acc[msg.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Clean up audio resources
   */
  private cleanup() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
  }

  /**
   * Destroy the queue manager
   */
  destroy() {
    this.stopAll();
    this.cleanup();
    this.onSpeakingChange = undefined;
    this.onInterrupt = undefined;
  }
}