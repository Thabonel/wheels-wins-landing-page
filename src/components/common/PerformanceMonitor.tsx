import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Timer, Zap, Activity } from 'lucide-react';

interface PerformanceMetrics {
  pageLoadTime: number;
  mapLoadTime: number;
  interactionReadyTime: number;
  bundleSize?: number;
}

export function usePerformanceMonitor(componentName: string) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    mapLoadTime: 0,
    interactionReadyTime: 0
  });

  useEffect(() => {
    const startTime = performance.now();

    // Measure page load time
    if (window.performance && window.performance.timing) {
      const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
      setMetrics(prev => ({ ...prev, pageLoadTime: loadTime }));
    }

    // Mark when component is mounted
    performance.mark(`${componentName}-mounted`);

    // Measure time to interactive
    const measureInteractive = () => {
      const interactiveTime = performance.now() - startTime;
      setMetrics(prev => ({ ...prev, interactionReadyTime: interactiveTime }));
      performance.mark(`${componentName}-interactive`);
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(measureInteractive);
    } else {
      setTimeout(measureInteractive, 0);
    }

    return () => {
      // Clean up performance marks
      try {
        performance.clearMarks(`${componentName}-mounted`);
        performance.clearMarks(`${componentName}-interactive`);
      } catch (e) {
        // Ignore errors in cleanup
      }
    };
  }, [componentName]);

  const recordMapLoadTime = (loadTime: number) => {
    setMetrics(prev => ({ ...prev, mapLoadTime: loadTime }));
    performance.mark(`${componentName}-map-loaded`);
  };

  return { metrics, recordMapLoadTime };
}

interface PerformanceOverlayProps {
  metrics: PerformanceMetrics;
  show?: boolean;
}

export function PerformanceOverlay({ metrics, show = false }: PerformanceOverlayProps) {
  if (!show || process.env.NODE_ENV === 'production') return null;

  const getPerformanceColor = (time: number) => {
    if (time < 1000) return 'text-green-600';
    if (time < 3000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Card className="fixed bottom-4 right-4 z-50 bg-white/90 backdrop-blur-sm shadow-lg">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-4 w-4" />
          <span className="text-sm font-semibold">Performance Metrics</span>
        </div>
        
        <div className="space-y-1">
          {metrics.pageLoadTime > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-600">Page Load:</span>
              <Badge variant="secondary" className={getPerformanceColor(metrics.pageLoadTime)}>
                {formatTime(metrics.pageLoadTime)}
              </Badge>
            </div>
          )}
          
          {metrics.mapLoadTime > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-600">Map Load:</span>
              <Badge variant="secondary" className={getPerformanceColor(metrics.mapLoadTime)}>
                {formatTime(metrics.mapLoadTime)}
              </Badge>
            </div>
          )}
          
          {metrics.interactionReadyTime > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-600">Interactive:</span>
              <Badge variant="secondary" className={getPerformanceColor(metrics.interactionReadyTime)}>
                {formatTime(metrics.interactionReadyTime)}
              </Badge>
            </div>
          )}
        </div>

        <div className="mt-2 pt-2 border-t">
          <div className="flex items-center gap-1">
            <Zap className={`h-3 w-3 ${metrics.interactionReadyTime < 1000 ? 'text-green-600' : 'text-yellow-600'}`} />
            <span className="text-xs text-gray-600">
              Target: &lt;1s interactive
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}