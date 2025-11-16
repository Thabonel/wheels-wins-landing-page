/**
 * Mapbox Request Guard
 *
 * Purpose: Prevent accidental request storms to Mapbox APIs from UI bugs while
 * keeping the trip planner responsive. It throttles (queues) requests rather than
 * canceling them, and emits lightweight warnings when guardrails engage.
 *
 * Design:
 * - Per-endpoint-class buckets: 'geocoding', 'directions', 'styles', 'isochrone', 'other'
 * - Token bucket + small concurrency limit per class
 * - Gentle backoff on HTTP 429 with jitter
 * - Observable warnings when throttling engages (console.warn by default)
 */

type Kind = 'geocoding' | 'directions' | 'styles' | 'isochrone' | 'other';

interface BucketConfig {
  // Max parallel requests allowed for this kind
  concurrency: number;
  // Token bucket: tokens added per second
  refillPerSecond: number;
  // Max tokens capacity (burst)
  capacity: number;
}

// Sensible defaults tuned not to be too restrictive
const DEFAULTS: Record<Kind, BucketConfig> = {
  geocoding: { concurrency: 3, refillPerSecond: 6, capacity: 12 },
  directions: { concurrency: 2, refillPerSecond: 4, capacity: 8 },
  styles: { concurrency: 4, refillPerSecond: 8, capacity: 16 },
  isochrone: { concurrency: 2, refillPerSecond: 4, capacity: 8 },
  other: { concurrency: 4, refillPerSecond: 8, capacity: 16 },
};

class Bucket {
  private inFlight = 0;
  private tokens: number;
  private queue: Array<() => void> = [];
  private warned = false;
  private lastRefill = Date.now();

  constructor(private cfg: BucketConfig, private kind: Kind) {
    this.tokens = cfg.capacity;
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    if (elapsed > 0.2) {
      this.tokens = Math.min(this.cfg.capacity, this.tokens + elapsed * this.cfg.refillPerSecond);
      this.lastRefill = now;
    }
  }

  private schedule() {
    this.refill();
    while (this.inFlight < this.cfg.concurrency && this.tokens >= 1 && this.queue.length) {
      this.tokens -= 1;
      const start = this.queue.shift()!;
      this.inFlight += 1;
      start();
    }
    if (this.queue.length && !this.warned) {
      this.warned = true;
      setTimeout(() => (this.warned = false), 5000);
      // Lightweight warning only; avoids UI spam
      // eslint-disable-next-line no-console
      console.warn(`MapboxGuard: throttling '${this.kind}' requests. Queue size=${this.queue.length}`);
    }
  }

  run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task = () => {
        // Execute and on completion decrement inflight then reschedule
        fn()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.inFlight = Math.max(0, this.inFlight - 1);
            this.schedule();
          });
      };
      this.queue.push(task);
      this.schedule();
    });
  }
}

const buckets: Record<Kind, Bucket> = {
  geocoding: new Bucket(DEFAULTS.geocoding, 'geocoding'),
  directions: new Bucket(DEFAULTS.directions, 'directions'),
  styles: new Bucket(DEFAULTS.styles, 'styles'),
  isochrone: new Bucket(DEFAULTS.isochrone, 'isochrone'),
  other: new Bucket(DEFAULTS.other, 'other'),
};

function classify(url: string): Kind {
  if (url.includes('/geocoding/')) return 'geocoding';
  if (url.includes('/directions/')) return 'directions';
  if (url.includes('/styles/')) return 'styles';
  if (url.includes('/isochrone/')) return 'isochrone';
  return 'other';
}

/**
 * Fetch wrapper with throttling/backoff.
 */
export async function guardedFetch(input: RequestInfo | URL, init?: RequestInit, kind?: Kind): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as URL).toString();
  const k = kind || classify(url);
  const bucket = buckets[k];

  const exec = async () => {
    const res = await fetch(input as any, init);
    // Gentle backoff on 429
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10);
      const waitMs = (isNaN(retryAfter) ? 1000 : retryAfter * 1000) + Math.floor(Math.random() * 250);
      // eslint-disable-next-line no-console
      console.warn(`MapboxGuard: 429 received for '${k}'. Backing off ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
      return fetch(input as any, init);
    }
    return res;
  };

  return bucket.run(exec);
}

/**
 * Helper to wrap JSON request pattern
 */
export async function guardedJson<T = any>(url: string, init?: RequestInit, kind?: Kind): Promise<T> {
  const res = await guardedFetch(url, init, kind);
  // If still rate limited or server error, propagate cleanly
  if (!res.ok) {
    throw new Error(`MapboxGuard: request failed (${res.status}) ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Allow runtime tuning if needed
 */
export function configureMapboxGuard(overrides: Partial<Record<Kind, Partial<BucketConfig>>>) {
  (Object.keys(overrides) as Kind[]).forEach(k => {
    const cfg = overrides[k] || {};
    const current = DEFAULTS[k];
    const merged: BucketConfig = {
      concurrency: cfg.concurrency ?? current.concurrency,
      refillPerSecond: cfg.refillPerSecond ?? current.refillPerSecond,
      capacity: cfg.capacity ?? current.capacity,
    };
    // Replace bucket instance
    // Note: not exposing queue transfer to keep code simple; safe since this is called rarely
    (buckets as any)[k] = new Bucket(merged, k);
  });
}

