import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Config } from './types.js';
import pino from 'pino';

const logger = pino({ level: 'info' });

export class SupabaseService {
  private client: SupabaseClient;
  private queryTimeout: number;

  constructor(config: Config) {
    this.client = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      global: {
        headers: {
          'X-Client-Info': `${config.MCP_SERVER_NAME}/${config.MCP_SERVER_VERSION}`,
        },
      },
    });
    this.queryTimeout = config.QUERY_TIMEOUT_MS;
    
    logger.info(`Initialized Supabase client for MCP server`);
  }

  /**
   * Execute a query with timeout and error handling
   */
  private async executeWithTimeout<T>(
    queryPromise: Promise<T> | PromiseLike<T>,
    operation: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Query timeout: ${operation}`)), this.queryTimeout);
    });

    try {
      return await Promise.race([Promise.resolve(queryPromise), timeoutPromise]);
    } catch (error) {
      logger.error(`Supabase query failed: ${operation}`, error);
      throw error;
    }
  }

  /**
   * Get expenses for a user with optional filtering
   */
  async getExpenses(params: {
    user_id: string;
    since?: string;
    until?: string;
    limit?: number;
    category?: string;
  }) {
    let query = this.client
      .from('expenses')
      .select('*')
      .eq('user_id', params.user_id);

    if (params.since) {
      query = query.gte('date', params.since);
    }
    if (params.until) {
      query = query.lte('date', params.until);
    }
    if (params.category) {
      query = query.ilike('category', `%${params.category}%`);
    }

    query = query
      .order('date', { ascending: false })
      .limit(params.limit || 100);

    const { data, error } = await this.executeWithTimeout(
      query,
      `getExpenses for user ${params.user_id}`
    );

    if (error) {
      throw new Error(`Failed to fetch expenses: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get budgets for a user
   */
  async getBudgets(params: { user_id: string; active_only?: boolean }) {
    let query = this.client
      .from('budgets')
      .select('*')
      .eq('user_id', params.user_id);

    if (params.active_only !== false) {
      // Default to active only
      query = query.eq('active', true);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await this.executeWithTimeout(
      query,
      `getBudgets for user ${params.user_id}`
    );

    if (error) {
      throw new Error(`Failed to fetch budgets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get income records for a user
   */
  async getIncome(params: {
    user_id: string;
    since?: string;
    until?: string;
    limit?: number;
  }) {
    let query = this.client
      .from('income')
      .select('*')
      .eq('user_id', params.user_id);

    if (params.since) {
      query = query.gte('date', params.since);
    }
    if (params.until) {
      query = query.lte('date', params.until);
    }

    query = query
      .order('date', { ascending: false })
      .limit(params.limit || 100);

    const { data, error } = await this.executeWithTimeout(
      query,
      `getIncome for user ${params.user_id}`
    );

    if (error) {
      throw new Error(`Failed to fetch income: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Execute a raw SQL query (SELECT only)
   */
  async executeRawQuery(query: string, params: any[] = []) {
    try {
      // Replace numbered parameters ($1, $2, etc.) with actual values
      let processedQuery = query;
      params.forEach((param, index) => {
        const placeholder = `$${index + 1}`;
        // Simple parameter substitution (in production, use proper prepared statements)
        const value = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : param;
        processedQuery = processedQuery.replace(new RegExp(`\\${placeholder}\\b`, 'g'), String(value));
      });

      const { data, error } = await this.executeWithTimeout(
        this.client.rpc('execute_sql', { query: processedQuery }),
        `executeRawQuery: ${query.substring(0, 50)}...`
      );

      if (error) {
        throw new Error(`Failed to execute query: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('Raw query execution failed', { query: query.substring(0, 100), error });
      throw error;
    }
  }

  /**
   * Test connection to Supabase
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.executeWithTimeout(
        this.client.from('profiles').select('id').limit(1),
        'testConnection'
      );
      
      if (error && !error.message.includes('permission')) {
        // Permission errors are expected with anon key, connection is still valid
        throw error;
      }

      logger.info('Supabase connection test successful');
      return true;
    } catch (error) {
      logger.error('Supabase connection test failed', error);
      return false;
    }
  }
}