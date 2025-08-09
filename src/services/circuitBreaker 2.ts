/**
 * Circuit Breaker Service
 * Prevents cascading failures by falling back to WebSocket after repeated errors
 */

import * as Sentry from '@sentry/react';

interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold: number;      // Number of successes to close circuit
  timeout: number;               // Time to wait before attempting to close (ms)
  monitoringWindow: number;      // Time window to track failures (ms)
}

interface CircuitState {
  status: 'closed' | 'open' | 'half-open';
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  errorMessages: string[];
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState;
  private name: string;
  private onStateChange?: (state: CircuitState) => void;

  constructor(
    name: string, 
    config: Partial<CircuitBreakerConfig> = {},
    onStateChange?: (state: CircuitState) => void
  ) {
    this.name = name;
    this.config = {
      failureThreshold: config.failureThreshold || 3,
      successThreshold: config.successThreshold || 2,
      timeout: config.timeout || 30000, // 30 seconds
      monitoringWindow: config.monitoringWindow || 60000, // 1 minute
    };
    this.onStateChange = onStateChange;
    
    this.state = {
      status: 'closed',
      failures: 0,
      successes: 0,
      errorMessages: [],
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    // Check if circuit is open
    if (this.state.status === 'open') {
      if (this.canAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        // Circuit is open, use fallback or throw
        if (fallback) {
          console.warn(`[${this.name}] Circuit open, using fallback`);
          return fallback();
        }
        throw new Error(`Circuit breaker ${this.name} is open`);
      }
    }

    try {
      // Attempt the operation
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error);
      
      // If circuit just opened, use fallback
      if (this.state.status === 'open' && fallback) {
        console.warn(`[${this.name}] Circuit opened, switching to fallback`);
        return fallback();
      }
      
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  private recordSuccess(): void {
    const previousStatus = this.state.status;
    
    if (this.state.status === 'half-open') {
      this.state.successes++;
      
      if (this.state.successes >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    } else if (this.state.status === 'closed') {
      // Reset failure count on success when closed
      this.state.failures = 0;
      this.state.errorMessages = [];
    }

    if (previousStatus !== this.state.status) {
      this.notifyStateChange();
    }
  }

  /**
   * Record a failed operation
   */
  private recordFailure(error: any): void {
    const previousStatus = this.state.status;
    const errorMessage = error?.message || 'Unknown error';
    
    this.state.failures++;
    this.state.errorMessages.push(errorMessage);
    this.state.lastFailureTime = new Date();

    // Keep only recent error messages
    if (this.state.errorMessages.length > 5) {
      this.state.errorMessages = this.state.errorMessages.slice(-5);
    }

    // Log to Sentry
    Sentry.addBreadcrumb({
      message: `Circuit breaker ${this.name} failure`,
      data: {
        failures: this.state.failures,
        threshold: this.config.failureThreshold,
        error: errorMessage,
      },
      level: 'error',
    });

    if (this.state.status === 'half-open') {
      // Single failure in half-open immediately opens circuit
      this.transitionToOpen();
    } else if (
      this.state.status === 'closed' &&
      this.state.failures >= this.config.failureThreshold
    ) {
      // Threshold reached, open circuit
      this.transitionToOpen();
    }

    if (previousStatus !== this.state.status) {
      this.notifyStateChange();
    }
  }

  /**
   * Transition to open state
   */
  private transitionToOpen(): void {
    console.error(`[${this.name}] Circuit breaker opened after ${this.state.failures} failures`);
    
    this.state.status = 'open';
    this.state.nextAttemptTime = new Date(Date.now() + this.config.timeout);
    this.state.successes = 0;

    Sentry.captureMessage(
      `Circuit breaker ${this.name} opened`,
      'warning'
    );
  }

  /**
   * Transition to half-open state
   */
  private transitionToHalfOpen(): void {
    console.log(`[${this.name}] Circuit breaker transitioning to half-open`);
    
    this.state.status = 'half-open';
    this.state.successes = 0;
    this.state.failures = 0;
  }

  /**
   * Transition to closed state
   */
  private transitionToClosed(): void {
    console.log(`[${this.name}] Circuit breaker closed`);
    
    this.state.status = 'closed';
    this.state.failures = 0;
    this.state.successes = 0;
    this.state.errorMessages = [];
    this.state.nextAttemptTime = undefined;

    Sentry.addBreadcrumb({
      message: `Circuit breaker ${this.name} closed`,
      level: 'info',
    });
  }

  /**
   * Check if we can attempt to reset the circuit
   */
  private canAttemptReset(): boolean {
    if (!this.state.nextAttemptTime) {
      return true;
    }
    return new Date() >= this.state.nextAttemptTime;
  }

  /**
   * Notify state change listeners
   */
  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return { ...this.state };
  }

  /**
   * Reset the circuit breaker (for testing)
   */
  reset(): void {
    this.state = {
      status: 'closed',
      failures: 0,
      successes: 0,
      errorMessages: [],
    };
    this.notifyStateChange();
  }

  /**
   * Force open the circuit (for emergency)
   */
  forceOpen(): void {
    this.transitionToOpen();
    this.notifyStateChange();
  }

  /**
   * Force close the circuit (for recovery)
   */
  forceClose(): void {
    this.transitionToClosed();
    this.notifyStateChange();
  }
}

// Singleton instance for PAM AI SDK
export const pamAiSdkCircuitBreaker = new CircuitBreaker(
  'PAM-AI-SDK',
  {
    failureThreshold: 3,      // Open after 3 failures
    successThreshold: 2,      // Close after 2 successes
    timeout: 30000,          // 30 seconds before retry
    monitoringWindow: 60000, // Track failures within 1 minute
  },
  (state) => {
    // Log state changes for monitoring
    console.log('PAM AI SDK Circuit Breaker State:', state);
    
    // Could emit events or update UI here
    if (state.status === 'open') {
      console.warn('PAM AI SDK circuit is open - falling back to WebSocket');
    }
  }
);