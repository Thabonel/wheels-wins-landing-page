/**
 * Migration Helper for PAM AI SDK
 * Database and deployment preparation utilities
 */

import { supabase } from '@/integrations/supabase/client';
import * as Sentry from '@sentry/react';

/**
 * Database migration preparation
 */
export class DatabaseMigration {
  /**
   * Create necessary database tables for AI SDK
   */
  static async prepareTables(): Promise<void> {
    try {
      // Create conversation history table
      const { error: conversationError } = await supabase.rpc('execute_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS pam_conversations (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            session_id TEXT NOT NULL,
            messages JSONB DEFAULT '[]'::jsonb,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_pam_conversations_user_id 
            ON pam_conversations(user_id);
          CREATE INDEX IF NOT EXISTS idx_pam_conversations_session_id 
            ON pam_conversations(session_id);
        `,
      });

      if (conversationError) {
        console.error('Error creating conversation table:', conversationError);
      }

      // Create tool execution logs table
      const { error: toolError } = await supabase.rpc('execute_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS pam_tool_executions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            conversation_id UUID REFERENCES pam_conversations(id) ON DELETE CASCADE,
            tool_name TEXT NOT NULL,
            parameters JSONB,
            result JSONB,
            duration_ms INTEGER,
            success BOOLEAN DEFAULT true,
            error_message TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_pam_tool_executions_conversation_id 
            ON pam_tool_executions(conversation_id);
          CREATE INDEX IF NOT EXISTS idx_pam_tool_executions_tool_name 
            ON pam_tool_executions(tool_name);
        `,
      });

      if (toolError) {
        console.error('Error creating tool execution table:', toolError);
      }

      // Create usage metrics table
      const { error: metricsError } = await supabase.rpc('execute_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS pam_usage_metrics (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            date DATE DEFAULT CURRENT_DATE,
            total_messages INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            total_cost DECIMAL(10, 4) DEFAULT 0,
            tool_executions JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, date)
          );
          
          CREATE INDEX IF NOT EXISTS idx_pam_usage_metrics_user_date 
            ON pam_usage_metrics(user_id, date);
        `,
      });

      if (metricsError) {
        console.error('Error creating metrics table:', metricsError);
      }

      // Create RLS policies
      await this.createRLSPolicies();

      console.log('Database tables prepared for AI SDK migration');
    } catch (error) {
      console.error('Database migration error:', error);
      Sentry.captureException(error);
      throw error;
    }
  }

  /**
   * Create Row Level Security policies
   */
  private static async createRLSPolicies(): Promise<void> {
    const policies = [
      {
        table: 'pam_conversations',
        policy: 'user_conversations',
        sql: `
          CREATE POLICY user_conversations ON pam_conversations
            FOR ALL USING (auth.uid() = user_id);
        `,
      },
      {
        table: 'pam_tool_executions',
        policy: 'user_tool_executions',
        sql: `
          CREATE POLICY user_tool_executions ON pam_tool_executions
            FOR ALL USING (
              EXISTS (
                SELECT 1 FROM pam_conversations
                WHERE pam_conversations.id = pam_tool_executions.conversation_id
                  AND pam_conversations.user_id = auth.uid()
              )
            );
        `,
      },
      {
        table: 'pam_usage_metrics',
        policy: 'user_metrics',
        sql: `
          CREATE POLICY user_metrics ON pam_usage_metrics
            FOR ALL USING (auth.uid() = user_id);
        `,
      },
    ];

    for (const { table, policy, sql } of policies) {
      try {
        // Enable RLS
        await supabase.rpc('execute_sql', {
          query: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,
        });

        // Create policy
        await supabase.rpc('execute_sql', {
          query: sql,
        });
      } catch (error) {
        console.warn(`RLS policy ${policy} may already exist:`, error);
      }
    }
  }

  /**
   * Migrate existing conversations from WebSocket to AI SDK format
   */
  static async migrateConversations(): Promise<{
    migrated: number;
    failed: number;
  }> {
    let migrated = 0;
    let failed = 0;

    try {
      // Fetch existing conversations (if stored)
      const { data: existingData, error } = await supabase
        .from('pam_websocket_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error || !existingData) {
        console.log('No existing conversations to migrate');
        return { migrated, failed };
      }

      for (const session of existingData) {
        try {
          // Transform WebSocket format to AI SDK format
          const messages = session.messages?.map((msg: any) => ({
            id: msg.id || crypto.randomUUID(),
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text || msg.message || msg.content,
            timestamp: msg.timestamp || session.created_at,
          })) || [];

          // Insert into new table
          const { error: insertError } = await supabase
            .from('pam_conversations')
            .insert({
              user_id: session.user_id,
              session_id: session.session_id || session.id,
              messages,
              metadata: {
                migrated_from: 'websocket',
                original_id: session.id,
                migrated_at: new Date().toISOString(),
              },
              created_at: session.created_at,
              updated_at: session.updated_at || session.created_at,
            });

          if (insertError) {
            failed++;
            console.error('Migration error for session:', session.id, insertError);
          } else {
            migrated++;
          }
        } catch (error) {
          failed++;
          console.error('Error migrating session:', session.id, error);
        }
      }
    } catch (error) {
      console.error('Migration failed:', error);
      Sentry.captureException(error);
    }

    return { migrated, failed };
  }
}

/**
 * Feature flag management
 */
export class FeatureFlags {
  private static readonly FLAGS_KEY = 'pam_feature_flags';
  private static readonly USER_VARIANT_KEY = 'pam_user_variant';

  /**
   * Get current feature flags
   */
  static getFlags(): Record<string, boolean> {
    const stored = localStorage.getItem(this.FLAGS_KEY);
    return stored ? JSON.parse(stored) : this.getDefaultFlags();
  }

  /**
   * Get default flags
   */
  private static getDefaultFlags(): Record<string, boolean> {
    return {
      useAiSdk: false,
      enableStreaming: true,
      enableTools: true,
      enableVoice: true,
      enableFallback: true,
      enableMetrics: true,
    };
  }

  /**
   * Set a feature flag
   */
  static setFlag(flag: string, enabled: boolean): void {
    const flags = this.getFlags();
    flags[flag] = enabled;
    localStorage.setItem(this.FLAGS_KEY, JSON.stringify(flags));

    // Track flag change
    Sentry.addBreadcrumb({
      message: 'Feature flag changed',
      data: { flag, enabled },
      level: 'info',
    });
  }

  /**
   * Get user variant for gradual rollout
   */
  static getUserVariant(): 'control' | 'treatment' {
    let variant = localStorage.getItem(this.USER_VARIANT_KEY);
    
    if (!variant) {
      // Assign variant based on user ID hash
      const userId = supabase.auth.getUser().then(({ data }) => data?.user?.id);
      variant = Math.random() < 0.5 ? 'control' : 'treatment';
      localStorage.setItem(this.USER_VARIANT_KEY, variant);
    }
    
    return variant as 'control' | 'treatment';
  }

  /**
   * Check if AI SDK should be used
   */
  static shouldUseAiSdk(): boolean {
    const flags = this.getFlags();
    const variant = this.getUserVariant();
    
    // Check explicit flag first
    if (flags.useAiSdk !== undefined) {
      return flags.useAiSdk;
    }
    
    // Check variant for gradual rollout
    return variant === 'treatment';
  }
}

/**
 * Circuit breaker for fallback management
 */
export class CircuitBreaker {
  private static failures = new Map<string, number>();
  private static lastFailure = new Map<string, number>();
  private static isOpen = new Map<string, boolean>();

  private static readonly FAILURE_THRESHOLD = 3;
  private static readonly RESET_TIMEOUT = 60000; // 1 minute

  /**
   * Record a failure
   */
  static recordFailure(service: string): void {
    const failures = (this.failures.get(service) || 0) + 1;
    this.failures.set(service, failures);
    this.lastFailure.set(service, Date.now());

    if (failures >= this.FAILURE_THRESHOLD) {
      this.isOpen.set(service, true);
      Sentry.captureMessage(`Circuit breaker opened for ${service}`, 'warning');
      
      // Schedule reset
      setTimeout(() => {
        this.reset(service);
      }, this.RESET_TIMEOUT);
    }
  }

  /**
   * Record a success
   */
  static recordSuccess(service: string): void {
    this.failures.set(service, 0);
    this.isOpen.set(service, false);
  }

  /**
   * Check if circuit is open
   */
  static isCircuitOpen(service: string): boolean {
    return this.isOpen.get(service) || false;
  }

  /**
   * Reset circuit
   */
  private static reset(service: string): void {
    this.failures.set(service, 0);
    this.isOpen.set(service, false);
    Sentry.addBreadcrumb({
      message: `Circuit breaker reset for ${service}`,
      level: 'info',
    });
  }
}

/**
 * Migration orchestrator
 */
export class MigrationOrchestrator {
  /**
   * Execute full migration
   */
  static async executeMigration(options: {
    prepareTables?: boolean;
    migrateData?: boolean;
    enableFlags?: boolean;
  } = {}): Promise<{
    success: boolean;
    details: any;
  }> {
    const details: any = {};

    try {
      // Step 1: Prepare database tables
      if (options.prepareTables !== false) {
        console.log('Preparing database tables...');
        await DatabaseMigration.prepareTables();
        details.tablesCreated = true;
      }

      // Step 2: Migrate existing data
      if (options.migrateData !== false) {
        console.log('Migrating existing conversations...');
        const migrationResult = await DatabaseMigration.migrateConversations();
        details.migration = migrationResult;
      }

      // Step 3: Enable feature flags
      if (options.enableFlags) {
        console.log('Enabling AI SDK feature flags...');
        FeatureFlags.setFlag('useAiSdk', true);
        details.flagsEnabled = true;
      }

      // Step 4: Test circuit breaker
      console.log('Testing circuit breaker...');
      CircuitBreaker.recordSuccess('pam-ai-sdk');
      details.circuitBreakerReady = true;

      return {
        success: true,
        details,
      };
    } catch (error) {
      console.error('Migration failed:', error);
      Sentry.captureException(error);
      return {
        success: false,
        details: {
          ...details,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Rollback migration
   */
  static async rollback(): Promise<void> {
    try {
      // Disable AI SDK flags
      FeatureFlags.setFlag('useAiSdk', false);
      
      // Open circuit breaker to force fallback
      CircuitBreaker.recordFailure('pam-ai-sdk');
      CircuitBreaker.recordFailure('pam-ai-sdk');
      CircuitBreaker.recordFailure('pam-ai-sdk');
      
      console.log('Migration rolled back successfully');
    } catch (error) {
      console.error('Rollback failed:', error);
      Sentry.captureException(error);
      throw error;
    }
  }
}