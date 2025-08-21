import React from 'react';

// Trip Planner specific performance monitoring

interface TripPlannerMetrics {
  componentLoadTime: number;
  mapInitTime: number;
  routeCalculationTime: number;
  gpxParseTime: number;
  gpxExportTime: number;
  waypointAddTime: number;
  memoryUsage: number;
  mapTileLoadTime: number;
}

class TripPlannerPerformanceMonitor {
  private metrics: Partial<TripPlannerMetrics> = {};
  private startTimes: Map<string, number> = new Map();

  // Start timing an operation
  startTimer(operation: keyof TripPlannerMetrics): void {
    this.startTimes.set(operation, performance.now());
    if (import.meta.env.DEV) {
      console.log(`⏱️ Started timing: ${operation}`);
    }
  }

  // End timing and record the duration
  endTimer(operation: keyof TripPlannerMetrics): number {
    const startTime = this.startTimes.get(operation);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.metrics[operation] = duration;
      this.startTimes.delete(operation);
      
      if (import.meta.env.DEV) {
        const emoji = duration < 100 ? '🚀' : duration < 500 ? '⚡' : duration < 1000 ? '🔄' : '🐌';
        console.log(`${emoji} ${operation}: ${duration.toFixed(2)}ms`);
      }
      
      // Send to analytics if configured
      this.reportMetric(operation, duration);
      
      return duration;
    }
    return 0;
  }

  // Report metric to analytics service
  private reportMetric(metric: string, value: number): void {
    // Send to Google Analytics or other analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'timing_complete', {
        name: metric,
        value: Math.round(value),
        event_category: 'Trip Planner Performance',
      });
    }
  }

  // Check memory usage
  checkMemoryUsage(): number | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMemoryMB = memory.usedJSHeapSize / 1048576;
      this.metrics.memoryUsage = usedMemoryMB;
      
      if (usedMemoryMB > 200 && import.meta.env.DEV) {
        console.warn(`⚠️ High memory usage in Trip Planner: ${usedMemoryMB.toFixed(2)}MB`);
      }
      
      return usedMemoryMB;
    }
    return null;
  }

  // Get all metrics
  getMetrics(): Partial<TripPlannerMetrics> {
    return { ...this.metrics };
  }

  // Generate performance report
  generateReport(): string {
    const report: string[] = ['📊 Trip Planner Performance Report'];
    report.push('=' .repeat(40));
    
    Object.entries(this.metrics).forEach(([key, value]) => {
      if (typeof value === 'number') {
        const unit = key === 'memoryUsage' ? 'MB' : 'ms';
        const formatted = key === 'memoryUsage' ? value.toFixed(2) : value.toFixed(0);
        report.push(`${key}: ${formatted}${unit}`);
      }
    });
    
    // Performance recommendations
    report.push('');
    report.push('Recommendations:');
    
    if (this.metrics.mapInitTime && this.metrics.mapInitTime > 2000) {
      report.push('⚠️ Map initialization is slow. Consider lazy loading map tiles.');
    }
    
    if (this.metrics.routeCalculationTime && this.metrics.routeCalculationTime > 3000) {
      report.push('⚠️ Route calculation is slow. Consider using web workers.');
    }
    
    if (this.metrics.gpxParseTime && this.metrics.gpxParseTime > 1000) {
      report.push('⚠️ GPX parsing is slow. Consider streaming parser.');
    }
    
    if (this.metrics.memoryUsage && this.metrics.memoryUsage > 150) {
      report.push('⚠️ High memory usage. Check for memory leaks.');
    }
    
    return report.join('\n');
  }

  // Reset all metrics
  reset(): void {
    this.metrics = {};
    this.startTimes.clear();
  }

  // Singleton instance
  private static instance: TripPlannerPerformanceMonitor | null = null;
  
  static getInstance(): TripPlannerPerformanceMonitor {
    if (!TripPlannerPerformanceMonitor.instance) {
      TripPlannerPerformanceMonitor.instance = new TripPlannerPerformanceMonitor();
    }
    return TripPlannerPerformanceMonitor.instance;
  }
}

// Export singleton instance
export const tripPlannerPerf = TripPlannerPerformanceMonitor.getInstance();

// React hook for trip planner performance monitoring
export function useTripPlannerPerformance() {
  React.useEffect(() => {
    // Monitor component load time
    tripPlannerPerf.startTimer('componentLoadTime');
    
    // Use RAF to measure after paint
    requestAnimationFrame(() => {
      tripPlannerPerf.endTimer('componentLoadTime');
    });
    
    // Check memory periodically
    const memoryInterval = setInterval(() => {
      tripPlannerPerf.checkMemoryUsage();
    }, 10000); // Check every 10 seconds
    
    return () => {
      clearInterval(memoryInterval);
      
      // Log performance report on unmount in development
      if (import.meta.env.DEV) {
        console.log(tripPlannerPerf.generateReport());
      }
    };
  }, []);
  
  return tripPlannerPerf;
}

// Utility to measure async operations
export async function measureTripPlannerAsync<T>(
  operation: keyof TripPlannerMetrics,
  asyncFn: () => Promise<T>
): Promise<T> {
  tripPlannerPerf.startTimer(operation);
  try {
    const result = await asyncFn();
    tripPlannerPerf.endTimer(operation);
    return result;
  } catch (error) {
    tripPlannerPerf.endTimer(operation);
    throw error;
  }
}

// Debounced operations for better performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttled operations for better performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}