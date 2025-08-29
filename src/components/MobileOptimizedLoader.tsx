import React from 'react';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

export interface LoadingSkeletonProps {
  count?: number;
  isMobile?: boolean;
}

export function LoadingSkeleton({ count = 3, isMobile = false }: LoadingSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className={`animate-pulse bg-secondary/20 rounded-lg ${
            isMobile ? 'h-16 p-3' : 'h-20 p-4'
          }`}
        >
          <div className="flex space-x-3">
            <div className={`rounded-full bg-secondary/40 ${
              isMobile ? 'h-8 w-8' : 'h-10 w-10'
            }`} />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-secondary/40 rounded w-3/4" />
              <div className="h-2 bg-secondary/30 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface NetworkStatusProps {
  status: 'online' | 'offline' | 'cached';
  queueSize?: number;
  cacheSize?: number;
}

export function NetworkStatus({ status, queueSize = 0, cacheSize = 0 }: NetworkStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          icon: Wifi,
          text: 'Online',
          className: 'text-green-600 bg-green-50 border-green-200'
        };
      case 'offline':
        return {
          icon: WifiOff,
          text: `Offline${queueSize > 0 ? ` (${queueSize} queued)` : ''}`,
          className: 'text-red-600 bg-red-50 border-red-200'
        };
      case 'cached':
        return {
          icon: Wifi,
          text: 'Cached Data',
          className: 'text-amber-600 bg-amber-50 border-amber-200'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium ${config.className}`}>
      <Icon size={12} />
      <span>{config.text}</span>
      {cacheSize > 0 && (
        <span className="text-xs opacity-70">
          ({Math.round(cacheSize / 1024)}KB)
        </span>
      )}
    </div>
  );
}

export interface ProgressiveLoaderProps {
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  isMobile?: boolean;
}

export function ProgressiveLoader({ 
  isLoading, 
  hasMore, 
  onLoadMore, 
  isMobile = false 
}: ProgressiveLoaderProps) {
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const target = document.getElementById('progressive-loader-trigger');
    if (target) observer.observe(target);

    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div 
      id="progressive-loader-trigger"
      className={`flex justify-center items-center ${isMobile ? 'py-4' : 'py-6'}`}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin" size={isMobile ? 16 : 20} />
          <span className={isMobile ? 'text-sm' : 'text-base'}>
            Loading more...
          </span>
        </div>
      ) : (
        <button
          onClick={onLoadMore}
          className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
        >
          Load More
        </button>
      )}
    </div>
  );
}

export interface DataUsageIndicatorProps {
  usage: {
    size: number;
    impact: 'low' | 'medium' | 'high';
  };
  isMobile?: boolean;
}

export function DataUsageIndicator({ usage, isMobile = false }: DataUsageIndicatorProps) {
  if (!isMobile) return null;

  const getImpactConfig = () => {
    switch (usage.impact) {
      case 'low':
        return { color: 'text-green-600', bg: 'bg-green-100' };
      case 'medium':
        return { color: 'text-amber-600', bg: 'bg-amber-100' };
      case 'high':
        return { color: 'text-red-600', bg: 'bg-red-100' };
    }
  };

  const config = getImpactConfig();
  const sizeKB = Math.round(usage.size / 1024);

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${config.bg} ${config.color}`}>
      <span>📊</span>
      <span>{sizeKB}KB</span>
      <span className="opacity-70">({usage.impact})</span>
    </div>
  );
}