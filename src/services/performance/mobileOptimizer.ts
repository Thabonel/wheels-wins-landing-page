/**
 * Mobile Performance Optimizer
 * Handles touch interactions, viewport optimizations, and mobile-specific performance
 */

interface TouchOptimizations {
  enableFastClick: boolean;
  optimizeScrolling: boolean;
  enablePullToRefresh: boolean;
  improveTextInput: boolean;
}

interface ViewportOptimizations {
  enableViewportMeta: boolean;
  optimizeForNotch: boolean;
  handleOrientationChange: boolean;
}

class MobileOptimizer {
  private touchOptimized = false;
  private viewportOptimized = false;
  private intersectionObserver?: IntersectionObserver;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeMobileOptimizations();
    }
  }

  /**
   * Initialize all mobile performance optimizations
   */
  private initializeMobileOptimizations(): void {
    this.optimizeTouchInteractions({
      enableFastClick: true,
      optimizeScrolling: true,
      enablePullToRefresh: false, // Disabled by default to prevent conflicts
      improveTextInput: true
    });

    this.optimizeViewport({
      enableViewportMeta: true,
      optimizeForNotch: true,
      handleOrientationChange: true
    });

    this.setupIntersectionObserver();
    this.optimizeImageLoading();
    this.handleMemoryPressure();
  }

  /**
   * Optimize touch interactions for mobile devices
   */
  optimizeTouchInteractions(options: TouchOptimizations): void {
    if (this.touchOptimized || !this.isMobileDevice()) return;

    if (options.enableFastClick) {
      // Remove 300ms click delay on mobile
      document.addEventListener('touchstart', this.handleTouchStart, { passive: true });

      // Add CSS for better touch targets
      this.addTouchTargetCSS();
    }

    if (options.optimizeScrolling) {
      // Enable momentum scrolling on iOS
      document.documentElement.style.webkitOverflowScrolling = 'touch';

      // Optimize scroll performance
      document.addEventListener('touchstart', this.handleTouchStart, { passive: true });
      document.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    }

    if (options.improveTextInput) {
      this.optimizeTextInputs();
    }

    this.touchOptimized = true;
  }

  /**
   * Optimize viewport settings for mobile
   */
  optimizeViewport(options: ViewportOptimizations): void {
    if (this.viewportOptimized) return;

    if (options.enableViewportMeta) {
      this.setOptimalViewport();
    }

    if (options.optimizeForNotch) {
      this.handleSafeArea();
    }

    if (options.handleOrientationChange) {
      this.setupOrientationHandler();
    }

    this.viewportOptimized = true;
  }

  /**
   * Setup intersection observer for lazy loading and performance
   */
  private setupIntersectionObserver(): void {
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Element is visible, trigger loading if needed
              const element = entry.target as HTMLElement;

              // Handle lazy loading for images
              if (element.tagName === 'IMG' && element.dataset.src) {
                (element as HTMLImageElement).src = element.dataset.src;
                element.removeAttribute('data-src');
                this.intersectionObserver?.unobserve(element);
              }

              // Handle lazy loading for components
              if (element.dataset.lazyComponent) {
                this.loadLazyComponent(element);
              }
            }
          });
        },
        {
          rootMargin: '50px 0px', // Start loading 50px before element is visible
          threshold: 0.1
        }
      );
    }
  }

  /**
   * Optimize image loading for mobile
   */
  private optimizeImageLoading(): void {
    // Set up responsive images
    const images = document.querySelectorAll('img[data-sizes]');
    images.forEach((img) => {
      this.setupResponsiveImage(img as HTMLImageElement);
    });

    // Add loading="lazy" to images below the fold
    this.addLazyLoadingToImages();
  }

  /**
   * Handle memory pressure on mobile devices
   */
  private handleMemoryPressure(): void {
    // Listen for memory pressure events (Safari)
    if ('memory' in performance) {
      const checkMemory = () => {
        const memInfo = (performance as any).memory;
        const usedRatio = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;

        if (usedRatio > 0.8) {
          console.warn('High memory usage detected, cleaning up...');
          this.cleanupForMemoryPressure();
        }
      };

      // Check memory usage every 30 seconds
      setInterval(checkMemory, 30000);
    }

    // Handle page visibility changes to free up resources
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseNonEssentialWork();
      } else {
        this.resumeWork();
      }
    });
  }

  /**
   * Measure and report Core Web Vitals
   */
  measureWebVitals(): void {
    // Largest Contentful Paint (LCP)
    this.measureLCP();

    // First Input Delay (FID)
    this.measureFID();

    // Cumulative Layout Shift (CLS)
    this.measureCLS();
  }

  // Private helper methods

  private isMobileDevice(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private handleTouchStart = (event: TouchEvent): void => {
    // Mark touch start for fast click detection
    const target = event.target as Element;
    target.setAttribute('data-touch-start', Date.now().toString());
  };

  private handleTouchMove = (event: TouchEvent): void => {
    // Optimize scroll performance
    const target = event.target as Element;
    if (target.scrollHeight > target.clientHeight) {
      event.stopPropagation();
    }
  };

  private addTouchTargetCSS(): void {
    const style = document.createElement('style');
    style.textContent = `
      /* Ensure touch targets are at least 44x44px */
      button, [role="button"], input[type="submit"], input[type="button"] {
        min-height: 44px;
        min-width: 44px;
        touch-action: manipulation;
      }

      /* Improve tap highlighting */
      * {
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
      }

      /* Prevent zoom on input focus */
      input[type="text"], input[type="email"], input[type="password"],
      input[type="number"], textarea, select {
        font-size: 16px !important;
      }
    `;
    document.head.appendChild(style);
  }

  private optimizeTextInputs(): void {
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach((input) => {
      // Prevent zoom on focus by ensuring 16px font size
      const element = input as HTMLInputElement | HTMLTextAreaElement;
      if (parseFloat(window.getComputedStyle(element).fontSize) < 16) {
        element.style.fontSize = '16px';
      }
    });
  }

  private setOptimalViewport(): void {
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;

    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }

    viewportMeta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
  }

  private handleSafeArea(): void {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --safe-area-inset-top: env(safe-area-inset-top);
        --safe-area-inset-right: env(safe-area-inset-right);
        --safe-area-inset-bottom: env(safe-area-inset-bottom);
        --safe-area-inset-left: env(safe-area-inset-left);
      }

      .safe-area-padding {
        padding-top: var(--safe-area-inset-top);
        padding-right: var(--safe-area-inset-right);
        padding-bottom: var(--safe-area-inset-bottom);
        padding-left: var(--safe-area-inset-left);
      }
    `;
    document.head.appendChild(style);
  }

  private setupOrientationHandler(): void {
    const handleOrientationChange = () => {
      // Fix viewport height issues on mobile
      setTimeout(() => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      }, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    // Initial setup
    handleOrientationChange();
  }

  private setupResponsiveImage(img: HTMLImageElement): void {
    const sizes = img.dataset.sizes;
    if (sizes) {
      img.sizes = sizes;
    }

    // Use intersection observer if available
    if (this.intersectionObserver && img.dataset.src) {
      this.intersectionObserver.observe(img);
    }
  }

  private addLazyLoadingToImages(): void {
    const images = document.querySelectorAll('img:not([loading])');
    images.forEach((img, index) => {
      // Add lazy loading to images below the fold (after first 3 images)
      if (index > 2) {
        img.setAttribute('loading', 'lazy');
      }
    });
  }

  private loadLazyComponent(element: HTMLElement): void {
    const componentName = element.dataset.lazyComponent;
    if (componentName) {
      // Trigger lazy component loading
      const event = new CustomEvent('loadLazyComponent', {
        detail: { componentName, element }
      });
      window.dispatchEvent(event);
    }
  }

  private cleanupForMemoryPressure(): void {
    // Clear unused caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('old-') || name.includes('temp-')) {
            caches.delete(name);
          }
        });
      });
    }

    // Trigger garbage collection if possible
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  private pauseNonEssentialWork(): void {
    // Pause animations, reduce polling intervals, etc.
    document.querySelectorAll('video').forEach(video => video.pause());
  }

  private resumeWork(): void {
    // Resume normal operations
    console.debug('Page visible, resuming normal operations');
  }

  private measureLCP(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.debug('LCP:', lastEntry.startTime);
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }
  }

  private measureFID(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          console.debug('FID:', entry.processingStart - entry.startTime);
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
    }
  }

  private measureCLS(): void {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });
        console.debug('CLS:', clsValue);
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    }
  }
}

// Create and export singleton instance
const mobileOptimizer = new MobileOptimizer();

export default mobileOptimizer;
export { MobileOptimizer };