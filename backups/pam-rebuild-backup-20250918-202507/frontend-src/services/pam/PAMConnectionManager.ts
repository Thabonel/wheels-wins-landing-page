/**
 * PAM Connection Manager - Advanced Connection Optimization
 * Day 2 Hour 3-4: Connection pooling, load balancing, and resource optimization
 */

import { EventEmitter } from 'events';

interface ConnectionPool {
  active: Map<string, WebSocket>;
  idle: WebSocket[];
  maxConnections: number;
  minConnections: number;
  currentLoad: number;
}

interface ConnectionHealth {
  id: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  errorCount: number;
  lastActivity: number;
  uptime: number;
}

interface LoadBalancingStrategy {
  type: 'round_robin' | 'least_connections' | 'health_based' | 'latency_based';
  healthThreshold: number;
  latencyThreshold: number;
}

interface ConnectionManagerConfig {
  maxConnections: number;
  minConnections: number;
  connectionTimeout: number;
  healthCheckInterval: number;
  loadBalancing: LoadBalancingStrategy;
  enableConnectionPooling: boolean;
  enableLoadBalancing: boolean;
  enableHealthMonitoring: boolean;
}

const DEFAULT_CONFIG: ConnectionManagerConfig = {
  maxConnections: 3,
  minConnections: 1,
  connectionTimeout: 30000,
  healthCheckInterval: 10000,
  loadBalancing: {
    type: 'health_based',
    healthThreshold: 80,
    latencyThreshold: 500
  },
  enableConnectionPooling: false, // Disabled by default for PAM
  enableLoadBalancing: false, // Single connection per user typically
  enableHealthMonitoring: true
};

export class PAMConnectionManager extends EventEmitter {
  private config: ConnectionManagerConfig;
  private pools: Map<string, ConnectionPool> = new Map();
  private healthMap: Map<string, ConnectionHealth> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private connectionCounter = 0;

  constructor(config: Partial<ConnectionManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.enableHealthMonitoring) {
      this.startHealthMonitoring();
    }
  }

  /**
   * Get or create a connection pool for a user
   */
  private getPool(userId: string): ConnectionPool {
    if (!this.pools.has(userId)) {
      this.pools.set(userId, {
        active: new Map(),
        idle: [],
        maxConnections: this.config.maxConnections,
        minConnections: this.config.minConnections,
        currentLoad: 0
      });
    }
    return this.pools.get(userId)!;
  }

  /**
   * Create a new optimized WebSocket connection
   */
  async createConnection(
    userId: string,
    url: string,
    options: {
      priority?: 'high' | 'normal' | 'low';
      persistent?: boolean;
      autoReconnect?: boolean;
    } = {}
  ): Promise<WebSocket> {
    const pool = this.getPool(userId);

    // Check if we can reuse an idle connection
    if (this.config.enableConnectionPooling && pool.idle.length > 0) {
      const connection = pool.idle.pop()!;
      const connectionId = this.generateConnectionId();
      pool.active.set(connectionId, connection);

      this.emit('connectionReused', { userId, connectionId });
      return connection;
    }

    // Check connection limits
    if (pool.active.size >= pool.maxConnections) {
      if (options.priority === 'high') {
        // Close least important connection
        this.closeLeastImportantConnection(userId);
      } else {
        throw new Error(`Maximum connections (${pool.maxConnections}) reached for user ${userId}`);
      }
    }

    return this.establishNewConnection(userId, url, options);
  }

  /**
   * Establish a new WebSocket connection with optimization
   */
  private async establishNewConnection(
    userId: string,
    url: string,
    options: any
  ): Promise<WebSocket> {
    const connectionId = this.generateConnectionId();
    const pool = this.getPool(userId);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const ws = new WebSocket(url);

      // Connection timeout
      const timeoutId = setTimeout(() => {
        ws.close();
        reject(new Error(`Connection timeout after ${this.config.connectionTimeout}ms`));
      }, this.config.connectionTimeout);

      ws.onopen = () => {
        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;

        // Add to active pool
        pool.active.set(connectionId, ws);

        // Initialize health tracking
        this.healthMap.set(connectionId, {
          id: connectionId,
          status: 'healthy',
          latency,
          errorCount: 0,
          lastActivity: Date.now(),
          uptime: Date.now()
        });

        // Set up connection monitoring
        this.setupConnectionMonitoring(connectionId, ws, userId);

        this.emit('connectionEstablished', {
          userId,
          connectionId,
          latency,
          poolSize: pool.active.size
        });

        resolve(ws);
      };

      ws.onerror = (error) => {
        clearTimeout(timeoutId);
        this.emit('connectionError', { userId, connectionId, error });
        reject(error);
      };

      ws.onclose = () => {
        clearTimeout(timeoutId);
        this.handleConnectionClose(connectionId, userId);
      };
    });
  }

  /**
   * Set up monitoring for a WebSocket connection
   */
  private setupConnectionMonitoring(connectionId: string, ws: WebSocket, userId: string) {
    const originalSend = ws.send.bind(ws);
    const health = this.healthMap.get(connectionId)!;

    // Monitor outgoing messages
    ws.send = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
      health.lastActivity = Date.now();
      this.emit('messageSent', { connectionId, userId, size: this.getDataSize(data) });
      return originalSend(data);
    };

    // Monitor incoming messages
    ws.addEventListener('message', (event) => {
      health.lastActivity = Date.now();
      this.emit('messageReceived', {
        connectionId,
        userId,
        size: this.getDataSize(event.data)
      });
    });

    // Monitor errors
    ws.addEventListener('error', () => {
      health.errorCount++;
      health.status = health.errorCount > 3 ? 'unhealthy' : 'degraded';
    });
  }

  /**
   * Get the best connection for sending a message
   */
  getBestConnection(userId: string): WebSocket | null {
    const pool = this.getPool(userId);

    if (pool.active.size === 0) {
      return null;
    }

    if (!this.config.enableLoadBalancing || pool.active.size === 1) {
      return Array.from(pool.active.values())[0];
    }

    return this.selectConnectionByStrategy(userId);
  }

  /**
   * Select connection based on load balancing strategy
   */
  private selectConnectionByStrategy(userId: string): WebSocket | null {
    const pool = this.getPool(userId);
    const connections = Array.from(pool.active.entries());

    switch (this.config.loadBalancing.type) {
      case 'health_based':
        return this.selectHealthiestConnection(connections);

      case 'latency_based':
        return this.selectLowestLatencyConnection(connections);

      case 'least_connections':
        // For WebSocket, this would be message queue size
        return this.selectLeastBusyConnection(connections);

      case 'round_robin':
      default:
        return this.selectRoundRobinConnection(connections);
    }
  }

  /**
   * Select the healthiest connection
   */
  private selectHealthiestConnection(connections: [string, WebSocket][]): WebSocket | null {
    let bestConnection: WebSocket | null = null;
    let bestScore = -1;

    for (const [connectionId, ws] of connections) {
      const health = this.healthMap.get(connectionId);
      if (!health || health.status === 'unhealthy') continue;

      const score = this.calculateHealthScore(health);
      if (score > bestScore) {
        bestScore = score;
        bestConnection = ws;
      }
    }

    return bestConnection;
  }

  /**
   * Calculate health score for a connection
   */
  private calculateHealthScore(health: ConnectionHealth): number {
    const latencyScore = Math.max(0, 100 - (health.latency / 10));
    const errorScore = Math.max(0, 100 - (health.errorCount * 10));
    const activityScore = Math.max(0, 100 - ((Date.now() - health.lastActivity) / 1000));

    return (latencyScore + errorScore + activityScore) / 3;
  }

  /**
   * Select connection with lowest latency
   */
  private selectLowestLatencyConnection(connections: [string, WebSocket][]): WebSocket | null {
    let bestConnection: WebSocket | null = null;
    let lowestLatency = Infinity;

    for (const [connectionId, ws] of connections) {
      const health = this.healthMap.get(connectionId);
      if (!health || health.status === 'unhealthy') continue;

      if (health.latency < lowestLatency) {
        lowestLatency = health.latency;
        bestConnection = ws;
      }
    }

    return bestConnection;
  }

  /**
   * Select least busy connection (placeholder implementation)
   */
  private selectLeastBusyConnection(connections: [string, WebSocket][]): WebSocket | null {
    // For WebSocket, we could track message queue size or recent activity
    // For now, fall back to round robin
    return this.selectRoundRobinConnection(connections);
  }

  /**
   * Select connection using round robin
   */
  private selectRoundRobinConnection(connections: [string, WebSocket][]): WebSocket | null {
    if (connections.length === 0) return null;

    const index = this.connectionCounter % connections.length;
    this.connectionCounter++;

    return connections[index][1];
  }

  /**
   * Close least important connection
   */
  private closeLeastImportantConnection(userId: string) {
    const pool = this.getPool(userId);
    const connections = Array.from(pool.active.entries());

    // Find connection with worst health score
    let worstConnection: string | null = null;
    let worstScore = Infinity;

    for (const [connectionId] of connections) {
      const health = this.healthMap.get(connectionId);
      if (!health) continue;

      const score = this.calculateHealthScore(health);
      if (score < worstScore) {
        worstScore = score;
        worstConnection = connectionId;
      }
    }

    if (worstConnection) {
      this.closeConnection(worstConnection, userId);
    }
  }

  /**
   * Close a specific connection
   */
  closeConnection(connectionId: string, userId: string) {
    const pool = this.getPool(userId);
    const ws = pool.active.get(connectionId);

    if (ws) {
      ws.close();
      pool.active.delete(connectionId);
      this.healthMap.delete(connectionId);

      this.emit('connectionClosed', { userId, connectionId, poolSize: pool.active.size });
    }
  }

  /**
   * Handle connection close event
   */
  private handleConnectionClose(connectionId: string, userId: string) {
    const pool = this.getPool(userId);
    pool.active.delete(connectionId);
    this.healthMap.delete(connectionId);

    this.emit('connectionClosed', { userId, connectionId, poolSize: pool.active.size });
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check on all connections
   */
  private performHealthCheck() {
    const now = Date.now();

    for (const [connectionId, health] of this.healthMap.entries()) {
      // Check for stale connections
      const timeSinceActivity = now - health.lastActivity;

      if (timeSinceActivity > 60000) { // 1 minute
        health.status = 'unhealthy';
      } else if (timeSinceActivity > 30000) { // 30 seconds
        health.status = 'degraded';
      } else {
        health.status = 'healthy';
      }

      // Update uptime
      health.uptime = now - health.uptime;
    }

    this.emit('healthCheck', { timestamp: now, connections: this.healthMap.size });
  }

  /**
   * Get connection statistics
   */
  getStatistics(userId?: string): any {
    if (userId) {
      const pool = this.getPool(userId);
      return {
        userId,
        activeConnections: pool.active.size,
        idleConnections: pool.idle.length,
        currentLoad: pool.currentLoad,
        health: Array.from(pool.active.keys()).map(id => this.healthMap.get(id))
      };
    }

    return {
      totalPools: this.pools.size,
      totalConnections: Array.from(this.pools.values()).reduce((sum, pool) => sum + pool.active.size, 0),
      healthyConnections: Array.from(this.healthMap.values()).filter(h => h.status === 'healthy').length,
      degradedConnections: Array.from(this.healthMap.values()).filter(h => h.status === 'degraded').length,
      unhealthyConnections: Array.from(this.healthMap.values()).filter(h => h.status === 'unhealthy').length
    };
  }

  /**
   * Clean up all connections and resources
   */
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    for (const pool of this.pools.values()) {
      for (const ws of pool.active.values()) {
        ws.close();
      }
      for (const ws of pool.idle) {
        ws.close();
      }
    }

    this.pools.clear();
    this.healthMap.clear();
    this.removeAllListeners();
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `pam_conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get data size for monitoring
   */
  private getDataSize(data: any): number {
    if (typeof data === 'string') {
      return new Blob([data]).size;
    }
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    if (data instanceof Blob) {
      return data.size;
    }
    return 0;
  }
}

export default PAMConnectionManager;