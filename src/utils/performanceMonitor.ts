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
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-log metrics in development
if (import.meta.env.DEV) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceMonitor.logMetrics();
    }, 3000);
  });
}