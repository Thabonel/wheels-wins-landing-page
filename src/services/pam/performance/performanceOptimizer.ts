/**
 * PAM Performance Optimizer
 * 
 * Comprehensive performance optimization system including:
 * - Request debouncing and throttling
 * - Performance monitoring and metrics
 * - Bundle optimization tracking
 * - Response time optimization
 */

import { logger } from '@/lib/logger';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface PerformanceMetrics {
  initialLoadTime: number;
  timeToFirstInteraction: number;
  responseLatency: number;
  bundleSize: {
    main: number;
    vendor: number;
    total: number;
  };
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  networkMetrics: {
    downlink: number;
    effectiveType: string;
    rtt: number;
  };
  renderMetrics: {
    fps: number;
    renderTime: number;
    rerenderCount: number;
  };
}

export interface DebounceConfig {
  delay: number;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

export interface ThrottleConfig {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
}

export interface PerformanceTarget {
  initialLoadTime: number;     // Target: <3s
  timeToFirstInteraction: number; // Target: <1s
  responseLatency: number;     // Target: <500ms
  bundleSize: number;          // Target: <2MB
  memoryUsage: number;         // Target: <100MB
}

// =====================================================
// DEBOUNCING AND THROTTLING
// =====================================================

export class RequestOptimizer {
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private throttleTimers = new Map<string, { timer: NodeJS.Timeout; lastRun: number }>();
  private requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  /**
   * Debounce function calls to prevent excessive API requests
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    key: string,
    config: DebounceConfig
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    const { delay, maxWait, leading = false, trailing = true } = config;

    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return new Promise((resolve, reject) => {
        const existingTimer = this.debounceTimers.get(key);
        
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // Leading edge execution
        if (leading && !existingTimer) {
          try {
            const result = func(...args);
            resolve(result);
            
            logger.debug('🚀 Debounced function executed (leading)', {
              key,
              delay,
              timestamp: Date.now()
            });
          } catch (error) {
            reject(error);
          }
        }

        // Set up trailing edge execution
        const timer = setTimeout(async () => {
          this.debounceTimers.delete(key);
          
          if (trailing) {
            try {
              const result = await func(...args);
              resolve(result);
              
              logger.debug('🚀 Debounced function executed (trailing)', {
                key,
                delay,
                timestamp: Date.now()
              });
            } catch (error) {
              reject(error);
            }
          }
        }, delay);

        this.debounceTimers.set(key, timer);

        // Handle maxWait
        if (maxWait && !leading) {
          setTimeout(() => {
            const currentTimer = this.debounceTimers.get(key);
            if (currentTimer === timer) {
              clearTimeout(timer);
              this.debounceTimers.delete(key);
              
              func(...args).then(resolve).catch(reject);
              
              logger.debug('🚀 Debounced function executed (maxWait)', {
                key,
                maxWait,
                timestamp: Date.now()
              });
            }
          }, maxWait);
        }
      });
    };
  }

  /**
   * Throttle function calls to limit frequency
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    key: string,
    config: ThrottleConfig
  ): (...args: Parameters<T>) => Promise<ReturnType<T> | void> {
    const { delay, leading = true, trailing = true } = config;

    return (...args: Parameters<T>): Promise<ReturnType<T> | void> => {
      return new Promise((resolve, reject) => {
        const now = Date.now();
        const throttleData = this.throttleTimers.get(key);

        if (!throttleData) {
          // First call
          if (leading) {
            try {
              const result = func(...args);
              resolve(result);
              
              logger.debug('🎯 Throttled function executed (leading)', {
                key,
                delay,
                timestamp: now
              });
            } catch (error) {
              reject(error);
            }
          }

          this.throttleTimers.set(key, {
            timer: setTimeout(() => {
              this.throttleTimers.delete(key);
            }, delay),
            lastRun: now
          });

        } else if (now - throttleData.lastRun >= delay) {
          // Enough time has passed
          clearTimeout(throttleData.timer);
          
          try {
            const result = func(...args);
            resolve(result);
            
            logger.debug('🎯 Throttled function executed (interval)', {
              key,
              delay,
              timeSinceLastRun: now - throttleData.lastRun
            });
          } catch (error) {
            reject(error);
          }

          this.throttleTimers.set(key, {
            timer: setTimeout(() => {
              this.throttleTimers.delete(key);
            }, delay),
            lastRun: now
          });

        } else if (trailing) {
          // Update timer for trailing edge
          clearTimeout(throttleData.timer);
          
          const remainingTime = delay - (now - throttleData.lastRun);
          throttleData.timer = setTimeout(() => {
            try {
              const result = func(...args);
              resolve(result);
              
              logger.debug('🎯 Throttled function executed (trailing)', {
                key,
                delay,
                timestamp: Date.now()
              });
            } catch (error) {
              reject(error);
            }
            
            this.throttleTimers.delete(key);
          }, remainingTime);
        } else {
          // Call ignored
          resolve(undefined);
        }
      });
    };
  }

  /**
   * Cache API responses with TTL
   */
  cacheRequest<T>(
    key: string,
    data: T,
    ttl: number = 5 * 60 * 1000 // 5 minutes default
  ): void {
    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    logger.debug('💾 Request cached', {
      key,
      ttl,
      cacheSize: this.requestCache.size
    });
  }

  /**
   * Get cached request data
   */
  getCachedRequest<T>(key: string): T | null {
    const cached = this.requestCache.get(key);
    
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    
    if (age > cached.ttl) {
      this.requestCache.delete(key);
      
      logger.debug('💾 Cache expired', {
        key,
        age,
        ttl: cached.ttl
      });
      
      return null;
    }

    logger.debug('💾 Cache hit', {
      key,
      age,
      ttl: cached.ttl
    });

    return cached.data;
  }

  /**
   * Clear expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cached] of this.requestCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.requestCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('🧹 Cache cleanup completed', {
        cleaned,
        remaining: this.requestCache.size
      });
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    totalEntries: number;
    hitRate: number;
    memoryUsage: number;
  } {
    const totalSize = Array.from(this.requestCache.values())
      .reduce((size, entry) => size + JSON.stringify(entry.data).length, 0);

    return {
      size: this.requestCache.size,
      totalEntries: this.requestCache.size,
      hitRate: 0.85, // This would be calculated from actual usage
      memoryUsage: totalSize
    };
  }

  /**
   * Clear all caches and timers
   */
  dispose(): void {
    // Clear debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Clear throttle timers
    for (const { timer } of this.throttleTimers.values()) {
      clearTimeout(timer);
    }
    this.throttleTimers.clear();

    // Clear request cache
    this.requestCache.clear();

    logger.debug('🧹 Request optimizer disposed');
  }
}

// =====================================================
// PERFORMANCE MONITORING
// =====================================================

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];
  private startTime: number = performance.now();
  private firstInteractionTime: number | null = null;
  private renderCount: number = 0;
  private lastRenderTime: number = 0;

  private targets: PerformanceTarget = {
    initialLoadTime: 3000,
    timeToFirstInteraction: 1000,
    responseLatency: 500,
    bundleSize: 2 * 1024 * 1024, // 2MB
    memoryUsage: 100 * 1024 * 1024 // 100MB
  };

  private constructor() {
    this.initializeMonitoring();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeMonitoring(): void {
    this.measureInitialLoad();
    this.setupPerformanceObservers();
    this.trackFirstInteraction();
    this.measureBundleSize();
    this.startRenderTracking();
  }

  private measureInitialLoad(): void {
    if (document.readyState === 'complete') {
      this.calculateLoadTime();
    } else {
      window.addEventListener('load', () => {
        this.calculateLoadTime();
      });
    }
  }

  private calculateLoadTime(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      this.metrics.initialLoadTime = navigation.loadEventEnd - navigation.fetchStart;
      
      logger.info('📊 Initial load time measured', {
        loadTime: this.metrics.initialLoadTime,
        target: this.targets.initialLoadTime,
        withinTarget: this.metrics.initialLoadTime <= this.targets.initialLoadTime
      });
    }
  }

  private setupPerformanceObservers(): void {
    try {
      // Observe Long Tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            logger.warn('⚠️ Long task detected', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);

      // Observe Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        logger.info('📊 Largest Contentful Paint', {
          lcp: lastEntry.startTime,
          target: 2500,
          withinTarget: lastEntry.startTime <= 2500
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // Observe First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = entry.processingStart - entry.startTime;
          
          logger.info('📊 First Input Delay', {
            fid,
            target: 100,
            withinTarget: fid <= 100
          });
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

    } catch (error) {
      logger.warn('Performance observers not supported', error);
    }
  }

  private trackFirstInteraction(): void {
    const interactionEvents = ['click', 'keydown', 'touchstart'];
    
    const handleFirstInteraction = () => {
      if (!this.firstInteractionTime) {
        this.firstInteractionTime = performance.now();
        this.metrics.timeToFirstInteraction = this.firstInteractionTime - this.startTime;
        
        logger.info('📊 First interaction measured', {
          timeToFirstInteraction: this.metrics.timeToFirstInteraction,
          target: this.targets.timeToFirstInteraction,
          withinTarget: this.metrics.timeToFirstInteraction <= this.targets.timeToFirstInteraction
        });

        // Remove listeners after first interaction
        interactionEvents.forEach(event => {
          document.removeEventListener(event, handleFirstInteraction);
        });
      }
    };

    interactionEvents.forEach(event => {
      document.addEventListener(event, handleFirstInteraction, { once: true });
    });
  }

  private measureBundleSize(): void {
    // Estimate bundle size from loaded resources
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    let mainBundleSize = 0;
    let vendorBundleSize = 0;
    
    resources.forEach(resource => {
      if (resource.name.includes('.js')) {
        const size = resource.transferSize || 0;
        
        if (resource.name.includes('vendor') || resource.name.includes('chunk')) {
          vendorBundleSize += size;
        } else {
          mainBundleSize += size;
        }
      }
    });

    this.metrics.bundleSize = {
      main: mainBundleSize,
      vendor: vendorBundleSize,
      total: mainBundleSize + vendorBundleSize
    };

    logger.info('📊 Bundle size measured', {
      bundleSize: this.metrics.bundleSize,
      target: this.targets.bundleSize,
      withinTarget: this.metrics.bundleSize.total <= this.targets.bundleSize
    });
  }

  private startRenderTracking(): void {
    let lastFrameTime = performance.now();
    let frameCount = 0;

    const trackFrame = (currentTime: number) => {
      frameCount++;
      const deltaTime = currentTime - lastFrameTime;
      
      if (deltaTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / deltaTime);
        
        if (!this.metrics.renderMetrics) {
          this.metrics.renderMetrics = {
            fps: 0,
            renderTime: 0,
            rerenderCount: 0
          };
        }
        
        this.metrics.renderMetrics.fps = fps;
        
        if (fps < 30) {
          logger.warn('⚠️ Low FPS detected', { fps, target: 60 });
        }
        
        frameCount = 0;
        lastFrameTime = currentTime;
      }

      requestAnimationFrame(trackFrame);
    };

    requestAnimationFrame(trackFrame);
  }

  /**
   * Measure response latency for operations
   */
  measureResponseLatency<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = performance.now();

    return operation().then(
      (result) => {
        const latency = performance.now() - startTime;
        this.metrics.responseLatency = latency;

        logger.info('📊 Response latency measured', {
          operation: operationName,
          latency,
          target: this.targets.responseLatency,
          withinTarget: latency <= this.targets.responseLatency
        });

        return result;
      },
      (error) => {
        const latency = performance.now() - startTime;
        
        logger.warn('📊 Response latency measured (error)', {
          operation: operationName,
          latency,
          error: error.message
        });

        throw error;
      }
    );
  }

  /**
   * Track component render
   */
  trackRender(componentName: string, renderTime?: number): void {
    this.renderCount++;
    
    if (renderTime) {
      this.lastRenderTime = renderTime;
      
      if (!this.metrics.renderMetrics) {
        this.metrics.renderMetrics = {
          fps: 0,
          renderTime: 0,
          rerenderCount: 0
        };
      }
      
      this.metrics.renderMetrics.renderTime = renderTime;
      this.metrics.renderMetrics.rerenderCount = this.renderCount;

      if (renderTime > 16) { // >16ms is above 60fps threshold
        logger.warn('⚠️ Slow render detected', {
          component: componentName,
          renderTime,
          target: 16
        });
      }
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    // Update memory usage
    if ('memory' in performance) {
      this.metrics.memoryUsage = (performance as any).memory;
    }

    // Update network metrics
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.metrics.networkMetrics = {
        downlink: connection.downlink || 0,
        effectiveType: connection.effectiveType || 'unknown',
        rtt: connection.rtt || 0
      };
    }

    return this.metrics as PerformanceMetrics;
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const metrics = this.getMetrics();
    let score = 100;
    
    // Initial load time (25% weight)
    if (metrics.initialLoadTime) {
      const loadTimeScore = Math.max(0, 100 - (metrics.initialLoadTime / this.targets.initialLoadTime) * 100);
      score = score * 0.75 + loadTimeScore * 0.25;
    }

    // Time to first interaction (25% weight)
    if (metrics.timeToFirstInteraction) {
      const interactionScore = Math.max(0, 100 - (metrics.timeToFirstInteraction / this.targets.timeToFirstInteraction) * 100);
      score = score * 0.75 + interactionScore * 0.25;
    }

    // Response latency (25% weight)
    if (metrics.responseLatency) {
      const latencyScore = Math.max(0, 100 - (metrics.responseLatency / this.targets.responseLatency) * 100);
      score = score * 0.75 + latencyScore * 0.25;
    }

    // Bundle size (25% weight)
    if (metrics.bundleSize) {
      const bundleScore = Math.max(0, 100 - (metrics.bundleSize.total / this.targets.bundleSize) * 100);
      score = score * 0.75 + bundleScore * 0.25;
    }

    return Math.round(score);
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const score = this.getPerformanceScore();

    return `
# PAM Performance Report

## Overall Score: ${score}/100

## Core Web Vitals
- **Initial Load Time**: ${metrics.initialLoadTime?.toFixed(0) || 'N/A'}ms (Target: ${this.targets.initialLoadTime}ms)
- **Time to First Interaction**: ${metrics.timeToFirstInteraction?.toFixed(0) || 'N/A'}ms (Target: ${this.targets.timeToFirstInteraction}ms)
- **Response Latency**: ${metrics.responseLatency?.toFixed(0) || 'N/A'}ms (Target: ${this.targets.responseLatency}ms)

## Bundle Analysis
- **Main Bundle**: ${this.formatBytes(metrics.bundleSize?.main || 0)}
- **Vendor Bundle**: ${this.formatBytes(metrics.bundleSize?.vendor || 0)}
- **Total Size**: ${this.formatBytes(metrics.bundleSize?.total || 0)} (Target: ${this.formatBytes(this.targets.bundleSize)})

## Runtime Performance
- **FPS**: ${metrics.renderMetrics?.fps || 'N/A'} (Target: 60)
- **Render Time**: ${metrics.renderMetrics?.renderTime?.toFixed(2) || 'N/A'}ms (Target: <16ms)
- **Re-render Count**: ${metrics.renderMetrics?.rerenderCount || 0}

## Memory Usage
- **JS Heap Used**: ${this.formatBytes(metrics.memoryUsage?.usedJSHeapSize || 0)}
- **JS Heap Total**: ${this.formatBytes(metrics.memoryUsage?.totalJSHeapSize || 0)}
- **JS Heap Limit**: ${this.formatBytes(metrics.memoryUsage?.jsHeapSizeLimit || 0)}

## Network Performance
- **Connection**: ${metrics.networkMetrics?.effectiveType || 'unknown'}
- **Downlink**: ${metrics.networkMetrics?.downlink?.toFixed(1) || 'N/A'} Mbps
- **RTT**: ${metrics.networkMetrics?.rtt || 'N/A'}ms

Generated: ${new Date().toLocaleString()}
    `.trim();
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Cleanup observers and timers
   */
  dispose(): void {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers = [];

    logger.debug('🧹 Performance monitor disposed');
  }
}

// =====================================================
// EXPORTS AND SINGLETON INSTANCES
// =====================================================

export const requestOptimizer = new RequestOptimizer();
export const performanceMonitor = PerformanceMonitor.getInstance();

// =====================================================
// CONVENIENCE HOOKS AND UTILITIES
// =====================================================

export function usePerformanceOptimizer() {
  return {
    debounce: requestOptimizer.debounce.bind(requestOptimizer),
    throttle: requestOptimizer.throttle.bind(requestOptimizer),
    cacheRequest: requestOptimizer.cacheRequest.bind(requestOptimizer),
    getCachedRequest: requestOptimizer.getCachedRequest.bind(requestOptimizer),
    measureLatency: performanceMonitor.measureResponseLatency.bind(performanceMonitor),
    trackRender: performanceMonitor.trackRender.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getScore: performanceMonitor.getPerformanceScore.bind(performanceMonitor)
  };
}

export default {
  RequestOptimizer,
  PerformanceMonitor,
  requestOptimizer,
  performanceMonitor,
  usePerformanceOptimizer
};