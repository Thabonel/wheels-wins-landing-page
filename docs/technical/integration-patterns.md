
# Integration Patterns

This document outlines the integration patterns used in the PAM system for connecting with external services, APIs, and third-party platforms.

## Overview

PAM follows a modular integration architecture that allows for:
- **Service abstraction** through adapter patterns
- **Graceful degradation** when services are unavailable
- **Rate limiting** and retry mechanisms
- **Configuration-driven** service selection
- **Monitoring** and observability

## External Service Integrations

### OpenAI Integration

#### Connection Pattern
```typescript
class OpenAIAdapter {
  private client: OpenAI;
  private rateLimiter: RateLimiter;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      maxRetries: 3,
      timeout: 30000
    });
    this.rateLimiter = new RateLimiter({
      requests: 60,
      window: 60000 // 1 minute
    });
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    await this.rateLimiter.checkLimit();
    
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4",
        messages,
        max_tokens: 1000,
        temperature: 0.7
      });
      
      return this.transformResponse(response);
    } catch (error) {
      throw new OpenAIError(error.message, error.code);
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: "text-embedding-ada-002",
      input: text
    });
    
    return response.data[0].embedding;
  }
}
```

#### Error Handling & Fallbacks
```typescript
class PAMChatService {
  private openAI: OpenAIAdapter;
  private fallbackService: OfflinePAMService;

  async processMessage(message: string, context: Context): Promise<Response> {
    try {
      // Primary: OpenAI processing
      return await this.openAI.chat([
        { role: "system", content: this.buildSystemPrompt(context) },
        { role: "user", content: message }
      ]);
    } catch (error) {
      if (error instanceof OpenAIError) {
        // Log error for monitoring
        logger.error("OpenAI service unavailable", { error, context });
        
        // Fallback: Local processing
        return await this.fallbackService.processMessage(message, context);
      }
      throw error;
    }
  }
}
```

### Supabase Integration

#### Database Connection Pattern
```typescript
class SupabaseAdapter {
  private client: SupabaseClient;
  private connectionPool: ConnectionPool;

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      },
      db: {
        schema: 'public'
      }
    });
  }

  async query<T>(
    table: string, 
    operation: QueryOperation
  ): Promise<QueryResult<T>> {
    const query = this.client.from(table);
    
    // Apply RLS automatically
    const { data, error } = await this.applyOperation(query, operation);
    
    if (error) {
      throw new DatabaseError(error.message, error.code);
    }
    
    return { data, meta: { count: data?.length || 0 } };
  }

  // Real-time subscriptions
  subscribe<T>(
    table: string, 
    filter: SubscriptionFilter,
    callback: (payload: T) => void
  ): RealtimeChannel {
    return this.client
      .channel(`${table}-changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: this.buildFilter(filter)
      }, callback)
      .subscribe();
  }
}
```

#### Authentication Integration
```typescript
class AuthService {
  private supabase: SupabaseAdapter;

  async signIn(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new AuthError(error.message, error.status);
    }

    // Store session and sync with backend
    await this.syncUserSession(data.session);
    return this.transformAuthData(data);
  }

  async refreshToken(): Promise<Session> {
    const { data, error } = await this.supabase.client.auth.refreshSession();
    
    if (error) {
      // Handle refresh failure
      await this.handleRefreshFailure(error);
      throw new AuthError("Session refresh failed");
    }

    return data.session;
  }
}
```

### Stripe Integration

#### Payment Processing Pattern
```typescript
class StripeAdapter {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(config: StripeConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2023-10-16'
    });
    this.webhookSecret = config.webhookSecret;
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, string>
  ): Promise<PaymentIntent> {
    return await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true
      }
    });
  }

  async handleWebhook(
    payload: string,
    signature: string
  ): Promise<WebhookEvent> {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret
    );

    // Process different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object);
        break;
      default:
        logger.info(`Unhandled webhook event: ${event.type}`);
    }

    return event;
  }
}
```

#### Subscription Management
```typescript
class SubscriptionService {
  private stripe: StripeAdapter;
  private database: DatabaseService;

  async createSubscription(
    userId: string,
    priceId: string
  ): Promise<Subscription> {
    // Create customer if doesn't exist
    const customer = await this.ensureCustomer(userId);
    
    // Create subscription
    const subscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    });

    // Store in database
    await this.database.subscriptions.create({
      userId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      priceId
    });

    return subscription;
  }
}
```

### Twilio Integration

#### SMS Service Pattern
```typescript
class TwilioAdapter {
  private client: Twilio;
  private fromNumber: string;

  constructor(config: TwilioConfig) {
    this.client = twilio(config.accountSid, config.authToken);
    this.fromNumber = config.phoneNumber;
  }

  async sendSMS(to: string, message: string): Promise<MessageInstance> {
    try {
      return await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: this.formatPhoneNumber(to)
      });
    } catch (error) {
      throw new SMSError(error.message, error.code);
    }
  }

  async send2FACode(phoneNumber: string): Promise<string> {
    const code = this.generateSecureCode();
    const message = `Your PAM verification code is: ${code}. Valid for 10 minutes.`;
    
    await this.sendSMS(phoneNumber, message);
    
    // Store code for verification (with expiration)
    await this.store2FACode(phoneNumber, code);
    
    return code;
  }
}
```

## Internal Service Integration

### Microservice Communication

#### Service Registry Pattern
```typescript
class ServiceRegistry {
  private services: Map<string, ServiceConfig> = new Map();
  private healthChecks: Map<string, HealthChecker> = new Map();

  register(name: string, config: ServiceConfig): void {
    this.services.set(name, config);
    this.healthChecks.set(name, new HealthChecker(config));
  }

  async getService(name: string): Promise<ServiceClient> {
    const config = this.services.get(name);
    if (!config) {
      throw new ServiceNotFoundError(name);
    }

    const health = await this.healthChecks.get(name)?.check();
    if (!health?.healthy) {
      throw new ServiceUnavailableError(name);
    }

    return new ServiceClient(config);
  }
}
```

#### Event-Driven Architecture
```typescript
class EventBus {
  private redis: Redis;
  private handlers: Map<string, EventHandler[]> = new Map();

  async publish(event: SystemEvent): Promise<void> {
    await this.redis.publish(event.type, JSON.stringify({
      ...event,
      timestamp: new Date().toISOString(),
      id: generateEventId()
    }));
  }

  subscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  async handleEvent(eventType: string, payload: any): Promise<void> {
    const handlers = this.handlers.get(eventType) || [];
    
    await Promise.all(
      handlers.map(handler => 
        this.executeHandler(handler, payload).catch(error => {
          logger.error("Event handler failed", { eventType, error });
        })
      )
    );
  }
}

// Usage example
const eventBus = new EventBus();

// When a budget is exceeded
eventBus.publish({
  type: 'budget.exceeded',
  userId: 'user-id',
  data: {
    budgetId: 'budget-id',
    category: 'groceries',
    amount: 450.00,
    limit: 400.00
  }
});

// Multiple services can react
eventBus.subscribe('budget.exceeded', async (event) => {
  // Send notification
  await notificationService.send({
    userId: event.userId,
    type: 'budget_alert',
    message: `You've exceeded your ${event.data.category} budget`
  });
});
```

## Data Synchronization Patterns

### Eventual Consistency
```typescript
class DataSyncService {
  private local: LocalDatabase;
  private remote: RemoteDatabase;
  private syncQueue: SyncQueue;

  async syncData(userId: string): Promise<SyncResult> {
    const syncResult = {
      conflicts: 0,
      synced: 0,
      errors: 0
    };

    try {
      // Get changes since last sync
      const localChanges = await this.local.getChangesSince(userId, lastSync);
      const remoteChanges = await this.remote.getChangesSince(userId, lastSync);

      // Resolve conflicts (last-write-wins with user preference)
      const resolved = await this.resolveConflicts(localChanges, remoteChanges);

      // Apply changes
      await this.applyChanges(resolved);

      syncResult.synced = resolved.length;
    } catch (error) {
      syncResult.errors++;
      logger.error("Sync failed", { userId, error });
    }

    return syncResult;
  }

  private async resolveConflicts(
    local: Change[],
    remote: Change[]
  ): Promise<Change[]> {
    const conflicts = this.findConflicts(local, remote);
    const resolved: Change[] = [];

    for (const conflict of conflicts) {
      // Business logic for conflict resolution
      const resolution = await this.resolveConflict(conflict);
      resolved.push(resolution);
    }

    return resolved;
  }
}
```

### Offline-First Architecture
```typescript
class OfflineFirstService {
  private localStore: IndexedDB;
  private syncService: DataSyncService;
  private networkStatus: NetworkMonitor;

  async saveData(data: any): Promise<void> {
    // Always save locally first
    await this.localStore.save(data);

    if (this.networkStatus.isOnline()) {
      // Try to sync immediately
      this.syncService.sync(data).catch(error => {
        // Queue for later sync if fails
        this.queueForSync(data);
      });
    } else {
      // Queue for sync when online
      this.queueForSync(data);
    }
  }

  async loadData(query: Query): Promise<any[]> {
    // Always load from local first
    const localData = await this.localStore.query(query);

    if (this.networkStatus.isOnline()) {
      // Attempt to refresh from remote
      this.refreshFromRemote(query).catch(error => {
        logger.warn("Failed to refresh from remote", { error });
      });
    }

    return localData;
  }
}
```

## API Gateway Pattern

### Request Routing & Transformation
```typescript
class APIGateway {
  private routes: Map<string, RouteConfig> = new Map();
  private middleware: Middleware[] = [];

  route(pattern: string, config: RouteConfig): void {
    this.routes.set(pattern, config);
  }

  async handleRequest(request: Request): Promise<Response> {
    // Apply middleware (auth, rate limiting, logging)
    for (const middleware of this.middleware) {
      request = await middleware.process(request);
    }

    // Find matching route
    const route = this.findRoute(request.path);
    if (!route) {
      return new Response("Not Found", { status: 404 });
    }

    // Transform request if needed
    const transformedRequest = await this.transformRequest(request, route);

    // Forward to service
    const serviceResponse = await this.forwardToService(
      transformedRequest, 
      route.service
    );

    // Transform response
    return await this.transformResponse(serviceResponse, route);
  }

  private async forwardToService(
    request: Request,
    service: ServiceConfig
  ): Promise<Response> {
    const serviceUrl = await this.serviceRegistry.getServiceUrl(service.name);
    
    return await fetch(`${serviceUrl}${request.path}`, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });
  }
}
```

### Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number = 5,
    private resetTimeout: number = 60000
  ) {}

  async call<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime < this.resetTimeout) {
        throw new CircuitBreakerOpenError();
      }
      this.state = 'half-open';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }
}
```

## Monitoring & Observability

### Distributed Tracing
```typescript
class TracingService {
  private tracer: Tracer;

  constructor() {
    this.tracer = trace.getTracer('pam-system');
  }

  async traceOperation<T>(
    name: string,
    operation: (span: Span) => Promise<T>
  ): Promise<T> {
    return await this.tracer.startActiveSpan(name, async (span) => {
      try {
        const result = await operation(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

// Usage
const result = await tracingService.traceOperation(
  'process-chat-message',
  async (span) => {
    span.setAttributes({
      'user.id': userId,
      'message.length': message.length
    });
    
    return await chatService.processMessage(message, context);
  }
);
```

### Health Check Aggregation
```typescript
class HealthAggregator {
  private healthCheckers: HealthChecker[] = [];

  addChecker(checker: HealthChecker): void {
    this.healthCheckers.push(checker);
  }

  async checkHealth(): Promise<HealthReport> {
    const checks = await Promise.allSettled(
      this.healthCheckers.map(checker => checker.check())
    );

    const report: HealthReport = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {}
    };

    for (let i = 0; i < checks.length; i++) {
      const result = checks[i];
      const checker = this.healthCheckers[i];

      if (result.status === 'fulfilled') {
        report.services[checker.name] = result.value;
      } else {
        report.services[checker.name] = {
          status: 'unhealthy',
          error: result.reason.message
        };
        report.status = 'degraded';
      }
    }

    return report;
  }
}
```

These integration patterns provide a robust, scalable, and maintainable approach to connecting PAM with external services while handling failures gracefully and maintaining system reliability.
