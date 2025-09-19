/**
 * Performance monitoring utilities for Core Web Vitals
 */

interface PerformanceMetrics {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private reportCallback?: (metrics: PerformanceMetrics) => void;

  constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // Observe paint timings (FCP, LCP)
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.FCP = Math.round(entry.startTime);
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('Paint observer not supported');
    }

    // Observe largest contentful paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.LCP = Math.round(lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP observer not supported');
    }

    // Observe first input delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ('processingStart' in entry && 'startTime' in entry) {
            const fidEntry = entry as PerformanceEventTiming;
            this.metrics.FID = Math.round(fidEntry.processingStart - fidEntry.startTime);
          }
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID observer not supported');
    }

    // Observe cumulative layout shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput && 'value' in entry) {
            clsValue += (entry as any).value;
          }
        }
        this.metrics.CLS = Math.round(clsValue * 1000) / 1000;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS observer not supported');
    }

    // Measure TTFB
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      if (timing.responseStart && timing.requestStart) {
        this.metrics.TTFB = timing.responseStart - timing.requestStart;
      }
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public logMetrics() {
    const metrics = this.getMetrics();
    console.group('📊 Core Web Vitals');
    console.log(`FCP (First Contentful Paint): ${metrics.FCP ? `${metrics.FCP  }ms` : 'Not measured'}`);
    console.log(`LCP (Largest Contentful Paint): ${metrics.LCP ? `${metrics.LCP  }ms` : 'Not measured'} ${metrics.LCP && metrics.LCP < 2500 ? '✅' : '⚠️'}`);
    console.log(`FID (First Input Delay): ${metrics.FID ? `${metrics.FID  }ms` : 'Not measured'} ${metrics.FID && metrics.FID < 100 ? '✅' : '⚠️'}`);
    console.log(`CLS (Cumulative Layout Shift): ${metrics.CLS || 'Not measured'} ${metrics.CLS && metrics.CLS < 0.1 ? '✅' : '⚠️'}`);
    console.log(`TTFB (Time to First Byte): ${metrics.TTFB ? `${metrics.TTFB  }ms` : 'Not measured'}`);
    console.groupEnd();
  }

  public onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void) {
    this.reportCallback = callback;
  }

  public reportToAnalytics() {
    const metrics = this.getMetrics();
    
    // Report to Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'web_vitals', {
        event_category: 'Performance',
        event_label: 'Core Web Vitals',
        value: Math.round(metrics.LCP || 0),
        fcp: metrics.FCP,
        lcp: metrics.LCP,
        fid: metrics.FID,
        cls: metrics.CLS,
        ttfb: metrics.TTFB
      });
    }

    // Call custom callback if provided
    if (this.reportCallback) {
      this.reportCallback(metrics);
    }
  }

  // Component performance tracking methods
  public recordComponentLoad(componentName: string, loadTime: number) {
    console.log(`📊 Component Load: ${componentName} in ${loadTime}ms`);

    if (loadTime > 1000) {
      console.warn(`🐌 Slow component load: ${componentName} (${loadTime}ms)`);
    }
  }

  public recordUserInteraction(action: string, duration?: number) {
    console.log(`👤 User Interaction: ${action}${duration ? ` (${duration}ms)` : ''}`);
  }

  public generatePerformanceReport(): string {
    const metrics = this.getMetrics();

    return `
📊 Performance Report
====================
FCP (First Contentful Paint): ${metrics.FCP || 0}ms
LCP (Largest Contentful Paint): ${metrics.LCP || 0}ms
FID (First Input Delay): ${metrics.FID || 0}ms
CLS (Cumulative Layout Shift): ${metrics.CLS || 0}
TTFB (Time to First Byte): ${metrics.TTFB || 0}ms

🎯 Recommendations:
${(metrics.FCP || 0) > 1800 ? '• Optimize First Contentful Paint\n' : ''}
${(metrics.LCP || 0) > 2500 ? '• Optimize Largest Contentful Paint\n' : ''}
${(metrics.FID || 0) > 100 ? '• Reduce First Input Delay\n' : ''}
${(metrics.CLS || 0) > 0.1 ? '• Fix layout shifts\n' : ''}
    `.trim();
  }

  public getBundleMetrics(): any[] {
    // Return empty array for compatibility - bundle metrics would need separate implementation
    return [];
  }

  public getPerformanceMetrics(): any[] {
    // Return metrics in array format for compatibility
    return [this.metrics];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for component performance tracking
export const usePerformanceTracking = (componentName: string) => {
  const startTime = Date.now();

  return {
    recordLoad: () => {
      const loadTime = Date.now() - startTime;
      performanceMonitor.recordComponentLoad(componentName, loadTime);
    },
    recordInteraction: (action: string, duration?: number) => {
      performanceMonitor.recordUserInteraction(`${componentName}:${action}`, duration);
    }
  };
};

// Auto-log metrics in development
if (import.meta.env.DEV) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceMonitor.logMetrics();
    }, 3000);
  });
}