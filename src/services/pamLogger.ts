import { supabase } from '@/integrations/supabase/client';

export interface PamLogEntry {
  user_id?: string;
  session_id?: string;
  intent: string;
  message?: string;
  response?: string;
  confidence_level?: number;
  response_time?: number;
  tokens_used?: number;
  tools_used?: string[];
  error_type?: string;
  error_message?: string;
  status: 'success' | 'error' | 'timeout';
  mode: 'voice' | 'text';
  metadata?: Record<string, any>;
}

class PamLogger {
  private sessionId: string;
  private pendingLogs: PamLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startFlushInterval();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startFlushInterval() {
    // Flush logs every 5 seconds
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, 5000);
  }

  private async flushLogs() {
    if (this.pendingLogs.length === 0) return;

    const logsToFlush = [...this.pendingLogs];
    this.pendingLogs = [];

    try {
      const { error } = await supabase
        .from('agent_logs')
        .insert(logsToFlush);

      if (error) {
        console.error('Failed to flush PAM logs:', error);
        // Re-add logs to pending if insert failed
        this.pendingLogs = [...logsToFlush, ...this.pendingLogs];
      }
    } catch (err) {
      console.error('Error flushing PAM logs:', err);
      // Re-add logs to pending if insert failed
      this.pendingLogs = [...logsToFlush, ...this.pendingLogs];
    }
  }

  async log(entry: Omit<PamLogEntry, 'session_id'>) {
    const logEntry: PamLogEntry = {
      ...entry,
      session_id: this.sessionId,
    };

    // Add to pending logs for batch insert
    this.pendingLogs.push(logEntry);

    // If we have too many pending logs, flush immediately
    if (this.pendingLogs.length >= 10) {
      await this.flushLogs();
    }
  }

  async logInteraction({
    user_id,
    intent,
    message,
    response,
    confidence_level = 1.0,
    response_time,
    tokens_used,
    tools_used = [],
    mode = 'text',
    metadata = {},
  }: {
    user_id?: string;
    intent: string;
    message?: string;
    response?: string;
    confidence_level?: number;
    response_time?: number;
    tokens_used?: number;
    tools_used?: string[];
    mode?: 'voice' | 'text';
    metadata?: Record<string, any>;
  }) {
    await this.log({
      user_id,
      intent,
      message,
      response,
      confidence_level,
      response_time,
      tokens_used,
      tools_used,
      status: 'success',
      mode,
      metadata,
    });
  }

  async logError({
    user_id,
    intent,
    message,
    error_type,
    error_message,
    mode = 'text',
    metadata = {},
  }: {
    user_id?: string;
    intent: string;
    message?: string;
    error_type: string;
    error_message: string;
    mode?: 'voice' | 'text';
    metadata?: Record<string, any>;
  }) {
    await this.log({
      user_id,
      intent,
      message,
      error_type,
      error_message,
      status: 'error',
      mode,
      metadata,
    });
  }

  newSession() {
    this.sessionId = this.generateSessionId();
  }

  async destroy() {
    // Flush any remaining logs
    await this.flushLogs();
    
    // Clear the flush interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}

// Export singleton instance
export const pamLogger = new PamLogger();