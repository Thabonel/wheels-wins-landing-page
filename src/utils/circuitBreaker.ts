export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  cooldownPeriod?: number;
  timeout?: number;
}

export class CircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = 0;

  constructor(
    private readonly action: (...args: any[]) => Promise<any>,
    private readonly options: CircuitBreakerOptions = {}
  ) {}

  async call(...args: any[]): Promise<any> {
    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextAttempt) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const timeout = this.options.timeout ?? 10000;
      const result = await Promise.race([
        this.action(...args),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
      ]);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= (this.options.successThreshold ?? 1)) {
        this.reset();
      }
    } else {
      this.reset();
    }
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= (this.options.failureThreshold ?? 5)) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + (this.options.cooldownPeriod ?? 30000);
    }
  }

  private reset() {
    this.failureCount = 0;
    this.successCount = 0;
    this.state = 'CLOSED';
  }
}
