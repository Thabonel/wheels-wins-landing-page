/**
 * Performance Measurement and Monitoring System
 * 
 * Comprehensive performance tracking with before/after metrics,
 * bundle analysis, and automated reporting.
 */

import { logger } from '@/lib/logger';
import { pamAnalytics } from '../analytics';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface PerformanceBenchmark {
  name: string;
  before: PerformanceSnapshot;
  after: PerformanceSnapshot;
  improvement: {
    percentage: number;
    absolute: number;
    significance: 'major' | 'moderate' | 'minor' | 'none';
  };
  timestamp: Date;
}

export interface PerformanceSnapshot {
  // Core Web Vitals
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  
  // Load Performance
  domContentLoaded: number;
  loadComplete: number;
  timeToInteractive: number;
  
  // Runtime Performance
  scriptDuration: number;
  taskDuration: number;
  renderingDuration: number;
  paintingDuration: number;
  
  // Memory Usage
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  
  // Bundle Metrics
  bundleSize: {
    main: number;
    vendor: number;
    chunks: number[];
    total: number;
    compressed: number;
  };
  
  // Network Performance
  resourceCount: number;
  transferSize: number;
  loadTime: number;
  cacheHitRate: number;
  
  // Component Performance
  averageRenderTime: number;
  slowRenders: number;
  reRenderCount: number;
  
  // User Experience
  interactionLatency: number;
  scrollPerformance: number;
  animationFrameRate: number;
}

export interface OptimizationTarget {
  metric: keyof PerformanceSnapshot;
  target: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

// =====================================================
// PERFORMANCE MEASUREMENT SERVICE
// =====================================================

export class PerformanceMeasurementService {
  private static instance: PerformanceMeasurementService;
  private benchmarks: PerformanceBenchmark[] = [];
  private observers: PerformanceObserver[] = [];
  private metrics: Map<string, number[]> = new Map();
  private isMonitoring: boolean = false;
  private baselineSnapshot: PerformanceSnapshot | null = null;

  private targets: OptimizationTarget[] = [
    {
      metric: 'firstContentfulPaint',
      target: 1800,
      priority: 'critical',
      description: 'First content visible to user'
    },
    {
      metric: 'largestContentfulPaint',
      target: 2500,
      priority: 'critical',
      description: 'Largest content element painted'
    },
    {
      metric: 'firstInputDelay',
      target: 100,
      priority: 'high',
      description: 'Time to first user interaction'
    },
    {
      metric: 'cumulativeLayoutShift',
      target: 0.1,
      priority: 'high',
      description: 'Visual stability score'
    },
    {
      metric: 'timeToInteractive',
      target: 3800,
      priority: 'high',
      description: 'Time until page is fully interactive'
    },
    {
      metric: 'bundleSize.total',
      target: 2 * 1024 * 1024, // 2MB
      priority: 'medium',
      description: 'Total JavaScript bundle size'
    },
    {
      metric: 'averageRenderTime',
      target: 16,
      priority: 'medium',
      description: 'Average component render time'
    },
    {
      metric: 'usedJSHeapSize',
      target: 50 * 1024 * 1024, // 50MB
      priority: 'low',
      description: 'JavaScript memory usage'
    }
  ];

  private constructor() {
    this.initializeMonitoring();
  }

  static getInstance(): PerformanceMeasurementService {
    if (!PerformanceMeasurementService.instance) {
      PerformanceMeasurementService.instance = new PerformanceMeasurementService();
    }
    return PerformanceMeasurementService.instance;
  }

  // =====================================================
  // INITIALIZATION AND SETUP
  // =====================================================

  private initializeMonitoring(): void {
    if (typeof window === 'undefined') return;

    this.setupPerformanceObservers();
    this.setupResourceMonitoring();
    this.setupRenderMonitoring();
    this.isMonitoring = true;

    // Take baseline snapshot after page load
    if (document.readyState === 'complete') {
      this.takeBaselineSnapshot();
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.takeBaselineSnapshot(), 1000);
      });
    }
  }

  private setupPerformanceObservers(): void {
    try {
      // Long Task Observer
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('longTask', entry.duration);
          
          if (entry.duration > 50) {
            logger.warn('🐌 Long task detected', {
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);

      // Largest Contentful Paint Observer
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('largestContentfulPaint', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay Observer
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = entry.processingStart - entry.startTime;
          this.recordMetric('firstInputDelay', fid);
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Layout Shift Observer
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.recordMetric('cumulativeLayoutShift', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

      // Resource Observer
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;
          this.recordMetric('resourceLoadTime', resource.duration);
          this.recordMetric('transferSize', resource.transferSize || 0);
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

    } catch (error) {
      logger.warn('Some performance observers not supported', error);
    }
  }

  private setupResourceMonitoring(): void {
    // Monitor script loading
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      script.addEventListener('load', () => {
        this.recordMetric('scriptLoad', performance.now());
      });
    });

    // Monitor image loading
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.complete) {
        this.recordMetric('imageLoad', 0);
      } else {
        img.addEventListener('load', () => {
          this.recordMetric('imageLoad', performance.now());
        });
      }
    });
  }

  private setupRenderMonitoring(): void {
    let frameCount = 0;
    let lastTime = performance.now();
    let renderTimes: number[] = [];

    const measureFrame = (currentTime: number) => {
      frameCount++;
      const deltaTime = currentTime - lastTime;
      
      if (deltaTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / deltaTime);
        this.recordMetric('fps', fps);
        
        frameCount = 0;
        lastTime = currentTime;
      }

      // Track render times
      renderTimes.push(deltaTime);
      if (renderTimes.length > 60) { // Keep last 60 frames
        renderTimes = renderTimes.slice(-60);
        const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
        this.recordMetric('averageRenderTime', avgRenderTime);
      }

      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);
  }

  // =====================================================
  // SNAPSHOT MANAGEMENT
  // =====================================================

  async takeSnapshot(label: string = 'current'): Promise<PerformanceSnapshot> {
    const startTime = performance.now();

    // Wait for any pending measurements
    await new Promise(resolve => setTimeout(resolve, 100));

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    // Bundle size analysis
    const bundleAnalysis = await this.analyzeBundleSize();
    
    // Memory analysis
    const memory = (performance as any).memory || {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    };

    const snapshot: PerformanceSnapshot = {
      // Core Web Vitals
      firstContentfulPaint: this.getMetricValue('firstContentfulPaint') || 0,
      largestContentfulPaint: this.getMetricValue('largestContentfulPaint') || 0,
      firstInputDelay: this.getMetricValue('firstInputDelay') || 0,
      cumulativeLayoutShift: this.getMetricValue('cumulativeLayoutShift') || 0,
      
      // Load Performance
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.navigationStart || 0,
      loadComplete: navigation?.loadEventEnd - navigation?.navigationStart || 0,
      timeToInteractive: await this.calculateTimeToInteractive(),
      
      // Runtime Performance
      scriptDuration: this.getMetricSum('scriptLoad'),
      taskDuration: this.getMetricSum('longTask'),
      renderingDuration: this.getMetricSum('averageRenderTime'),
      paintingDuration: this.getMetricValue('largestContentfulPaint') || 0,
      
      // Memory Usage
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      
      // Bundle Metrics
      bundleSize: bundleAnalysis,
      
      // Network Performance
      resourceCount: resources.length,
      transferSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      loadTime: resources.reduce((sum, r) => sum + r.duration, 0) / resources.length,
      cacheHitRate: this.calculateCacheHitRate(resources),
      
      // Component Performance
      averageRenderTime: this.getMetricAverage('averageRenderTime'),
      slowRenders: this.getMetricCount('averageRenderTime', (value) => value > 16),
      reRenderCount: this.getMetricCount('componentRender'),
      
      // User Experience
      interactionLatency: this.getMetricAverage('firstInputDelay'),
      scrollPerformance: 60, // Would need scroll-specific monitoring
      animationFrameRate: this.getMetricAverage('fps')
    };

    const measureTime = performance.now() - startTime;
    logger.info(`📊 Performance snapshot taken: ${label}`, {
      measureTime: measureTime.toFixed(2) + 'ms',
      snapshot: this.summarizeSnapshot(snapshot)
    });

    return snapshot;
  }

  private async takeBaselineSnapshot(): Promise<void> {
    this.baselineSnapshot = await this.takeSnapshot('baseline');
    
    // Track baseline in analytics
    pamAnalytics.trackAction('performance_baseline', {
      snapshot: this.summarizeSnapshot(this.baselineSnapshot),
      timestamp: new Date().toISOString()
    });
  }

  // =====================================================
  // BENCHMARK MANAGEMENT
  // =====================================================

  async createBenchmark(name: string, beforeSnapshot?: PerformanceSnapshot): Promise<string> {
    const before = beforeSnapshot || this.baselineSnapshot || await this.takeSnapshot('before');
    const benchmarkId = `${name}-${Date.now()}`;

    // Store the before snapshot
    (this as any).pendingBenchmarks = (this as any).pendingBenchmarks || new Map();
    (this as any).pendingBenchmarks.set(benchmarkId, { name, before });

    logger.info(`📊 Benchmark started: ${name}`, {
      id: benchmarkId,
      before: this.summarizeSnapshot(before)
    });

    return benchmarkId;
  }

  async completeBenchmark(benchmarkId: string): Promise<PerformanceBenchmark> {
    const pending = (this as any).pendingBenchmarks?.get(benchmarkId);
    if (!pending) {
      throw new Error(`Benchmark ${benchmarkId} not found`);
    }

    const after = await this.takeSnapshot('after');
    const improvement = this.calculateImprovement(pending.before, after);

    const benchmark: PerformanceBenchmark = {
      name: pending.name,
      before: pending.before,
      after,
      improvement,
      timestamp: new Date()
    };

    this.benchmarks.push(benchmark);
    (this as any).pendingBenchmarks?.delete(benchmarkId);

    // Track benchmark in analytics
    pamAnalytics.trackAction('performance_benchmark', {
      name: pending.name,
      improvement: improvement.percentage,
      significance: improvement.significance
    });

    logger.info(`📊 Benchmark completed: ${pending.name}`, {
      improvement: `${improvement.percentage.toFixed(1)}%`,
      significance: improvement.significance
    });

    return benchmark;
  }

  // =====================================================
  // ANALYSIS AND CALCULATIONS
  // =====================================================

  private calculateImprovement(before: PerformanceSnapshot, after: PerformanceSnapshot): {
    percentage: number;
    absolute: number;
    significance: 'major' | 'moderate' | 'minor' | 'none';
  } {
    // Calculate weighted improvement across key metrics
    const metrics = [
      { key: 'firstContentfulPaint', weight: 0.25, higher_is_better: false },
      { key: 'largestContentfulPaint', weight: 0.25, higher_is_better: false },
      { key: 'firstInputDelay', weight: 0.2, higher_is_better: false },
      { key: 'timeToInteractive', weight: 0.15, higher_is_better: false },
      { key: 'bundleSize.total', weight: 0.1, higher_is_better: false },
      { key: 'averageRenderTime', weight: 0.05, higher_is_better: false }
    ];

    let totalImprovement = 0;
    let totalWeight = 0;

    for (const metric of metrics) {
      const beforeValue = this.getNestedValue(before, metric.key);
      const afterValue = this.getNestedValue(after, metric.key);

      if (beforeValue && afterValue && beforeValue > 0) {
        const improvement = metric.higher_is_better
          ? (afterValue - beforeValue) / beforeValue
          : (beforeValue - afterValue) / beforeValue;

        totalImprovement += improvement * metric.weight;
        totalWeight += metric.weight;
      }
    }

    const percentage = totalWeight > 0 ? (totalImprovement / totalWeight) * 100 : 0;
    const absolute = Math.abs(percentage);

    let significance: 'major' | 'moderate' | 'minor' | 'none';
    if (absolute >= 20) significance = 'major';
    else if (absolute >= 10) significance = 'moderate';
    else if (absolute >= 5) significance = 'minor';
    else significance = 'none';

    return { percentage, absolute, significance };
  }

  private async analyzeBundleSize(): Promise<PerformanceSnapshot['bundleSize']> {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    let mainSize = 0;
    let vendorSize = 0;
    const chunks: number[] = [];
    let totalSize = 0;
    let compressedSize = 0;

    for (const resource of resources) {
      if (resource.name.includes('.js')) {
        const size = resource.transferSize || 0;
        const decodedSize = resource.decodedBodySize || 0;
        
        totalSize += decodedSize;
        compressedSize += size;

        if (resource.name.includes('vendor')) {
          vendorSize += decodedSize;
        } else if (resource.name.includes('chunk')) {
          chunks.push(decodedSize);
        } else {
          mainSize += decodedSize;
        }
      }
    }

    return {
      main: mainSize,
      vendor: vendorSize,
      chunks,
      total: totalSize,
      compressed: compressedSize
    };
  }

  private async calculateTimeToInteractive(): Promise<number> {
    return new Promise((resolve) => {
      // Simplified TTI calculation
      // In a real implementation, this would be more sophisticated
      const checkInteractive = () => {
        const longTasks = this.metrics.get('longTask') || [];
        const recentLongTasks = longTasks.filter(time => 
          performance.now() - time < 5000 // Last 5 seconds
        );

        if (recentLongTasks.length === 0) {
          resolve(performance.now());
        } else {
          setTimeout(checkInteractive, 100);
        }
      };

      setTimeout(checkInteractive, 0);
    });
  }

  private calculateCacheHitRate(resources: PerformanceResourceTiming[]): number {
    const cacheableResources = resources.filter(r => 
      r.transferSize !== undefined && r.decodedBodySize !== undefined
    );

    if (cacheableResources.length === 0) return 0;

    const cachedResources = cacheableResources.filter(r => 
      r.transferSize === 0 || r.transferSize < r.decodedBodySize * 0.1
    );

    return cachedResources.length / cacheableResources.length;
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  private getMetricValue(name: string): number | null {
    const values = this.metrics.get(name);
    return values && values.length > 0 ? values[values.length - 1] : null;
  }

  private getMetricAverage(name: string): number {
    const values = this.metrics.get(name) || [];
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  private getMetricSum(name: string): number {
    const values = this.metrics.get(name) || [];
    return values.reduce((a, b) => a + b, 0);
  }

  private getMetricCount(name: string, filter?: (value: number) => boolean): number {
    const values = this.metrics.get(name) || [];
    return filter ? values.filter(filter).length : values.length;
  }

  private getNestedValue(obj: any, path: string): number {
    return path.split('.').reduce((o, p) => o && o[p], obj) || 0;
  }

  private summarizeSnapshot(snapshot: PerformanceSnapshot): any {
    return {
      fcp: Math.round(snapshot.firstContentfulPaint),
      lcp: Math.round(snapshot.largestContentfulPaint),
      fid: Math.round(snapshot.firstInputDelay),
      cls: snapshot.cumulativeLayoutShift.toFixed(3),
      tti: Math.round(snapshot.timeToInteractive),
      bundleSize: Math.round(snapshot.bundleSize.total / 1024) + 'KB',
      memory: Math.round(snapshot.usedJSHeapSize / 1024 / 1024) + 'MB'
    };
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  getBenchmarks(): PerformanceBenchmark[] {
    return [...this.benchmarks];
  }

  getTargets(): OptimizationTarget[] {
    return [...this.targets];
  }

  getCurrentMetrics(): Map<string, number[]> {
    return new Map(this.metrics);
  }

  getBaselineSnapshot(): PerformanceSnapshot | null {
    return this.baselineSnapshot;
  }

  async generateReport(): Promise<string> {
    const current = await this.takeSnapshot('report');
    const baseline = this.baselineSnapshot;

    if (!baseline) {
      return 'No baseline snapshot available. Please wait for initialization to complete.';
    }

    const improvement = this.calculateImprovement(baseline, current);

    return `
# PAM Performance Report

## Overall Performance Score
**Improvement: ${improvement.percentage.toFixed(1)}%** (${improvement.significance})

## Core Web Vitals
| Metric | Baseline | Current | Target | Status |
|--------|----------|---------|---------|---------|
| First Contentful Paint | ${baseline.firstContentfulPaint.toFixed(0)}ms | ${current.firstContentfulPaint.toFixed(0)}ms | 1800ms | ${current.firstContentfulPaint <= 1800 ? '✅' : '❌'} |
| Largest Contentful Paint | ${baseline.largestContentfulPaint.toFixed(0)}ms | ${current.largestContentfulPaint.toFixed(0)}ms | 2500ms | ${current.largestContentfulPaint <= 2500 ? '✅' : '❌'} |
| First Input Delay | ${baseline.firstInputDelay.toFixed(0)}ms | ${current.firstInputDelay.toFixed(0)}ms | 100ms | ${current.firstInputDelay <= 100 ? '✅' : '❌'} |
| Cumulative Layout Shift | ${baseline.cumulativeLayoutShift.toFixed(3)} | ${current.cumulativeLayoutShift.toFixed(3)} | 0.1 | ${current.cumulativeLayoutShift <= 0.1 ? '✅' : '❌'} |

## Bundle Analysis
| Component | Baseline | Current | Change |
|-----------|----------|---------|---------|
| Main Bundle | ${this.formatBytes(baseline.bundleSize.main)} | ${this.formatBytes(current.bundleSize.main)} | ${this.formatChange(baseline.bundleSize.main, current.bundleSize.main)} |
| Vendor Bundle | ${this.formatBytes(baseline.bundleSize.vendor)} | ${this.formatBytes(current.bundleSize.vendor)} | ${this.formatChange(baseline.bundleSize.vendor, current.bundleSize.vendor)} |
| Total Size | ${this.formatBytes(baseline.bundleSize.total)} | ${this.formatBytes(current.bundleSize.total)} | ${this.formatChange(baseline.bundleSize.total, current.bundleSize.total)} |
| Compression Ratio | ${((1 - baseline.bundleSize.compressed / baseline.bundleSize.total) * 100).toFixed(1)}% | ${((1 - current.bundleSize.compressed / current.bundleSize.total) * 100).toFixed(1)}% | - |

## Runtime Performance
| Metric | Baseline | Current | Change |
|--------|----------|---------|---------|
| Memory Usage | ${this.formatBytes(baseline.usedJSHeapSize)} | ${this.formatBytes(current.usedJSHeapSize)} | ${this.formatChange(baseline.usedJSHeapSize, current.usedJSHeapSize)} |
| Avg Render Time | ${baseline.averageRenderTime.toFixed(2)}ms | ${current.averageRenderTime.toFixed(2)}ms | ${this.formatChange(baseline.averageRenderTime, current.averageRenderTime, 'ms')} |
| Animation FPS | ${baseline.animationFrameRate.toFixed(0)} | ${current.animationFrameRate.toFixed(0)} | ${this.formatChange(baseline.animationFrameRate, current.animationFrameRate, '', true)} |

## Benchmarks Completed
${this.benchmarks.map(b => `- **${b.name}**: ${b.improvement.percentage.toFixed(1)}% improvement (${b.improvement.significance})`).join('\n') || 'No benchmarks completed yet'}

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

  private formatChange(
    before: number, 
    after: number, 
    unit: string = '', 
    higherIsBetter: boolean = false
  ): string {
    const change = after - before;
    const percentage = before > 0 ? (change / before) * 100 : 0;
    const isImprovement = higherIsBetter ? change > 0 : change < 0;
    const icon = isImprovement ? '📈' : change < 0 ? '📉' : '➡️';
    
    return `${icon} ${change.toFixed(2)}${unit} (${percentage.toFixed(1)}%)`;
  }

  dispose(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.isMonitoring = false;
  }
}

// =====================================================
// EXPORTS
// =====================================================

export const performanceMeasurement = PerformanceMeasurementService.getInstance();

export default PerformanceMeasurementService;