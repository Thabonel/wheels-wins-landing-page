import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load Recharts components to reduce initial bundle size
const ResponsiveContainer = React.lazy(() =>
  import('recharts').then(module => ({ default: module.ResponsiveContainer }))
);
const LineChart = React.lazy(() =>
  import('recharts').then(module => ({ default: module.LineChart }))
);
const Line = React.lazy(() =>
  import('recharts').then(module => ({ default: module.Line }))
);
const XAxis = React.lazy(() =>
  import('recharts').then(module => ({ default: module.XAxis }))
);
const YAxis = React.lazy(() =>
  import('recharts').then(module => ({ default: module.YAxis }))
);
const CartesianGrid = React.lazy(() =>
  import('recharts').then(module => ({ default: module.CartesianGrid }))
);
const Tooltip = React.lazy(() =>
  import('recharts').then(module => ({ default: module.Tooltip }))
);
const Legend = React.lazy(() =>
  import('recharts').then(module => ({ default: module.Legend }))
);
const BarChart = React.lazy(() =>
  import('recharts').then(module => ({ default: module.BarChart }))
);
const Bar = React.lazy(() =>
  import('recharts').then(module => ({ default: module.Bar }))
);
const PieChart = React.lazy(() =>
  import('recharts').then(module => ({ default: module.PieChart }))
);
const Pie = React.lazy(() =>
  import('recharts').then(module => ({ default: module.Pie }))
);
const Cell = React.lazy(() =>
  import('recharts').then(module => ({ default: module.Cell }))
);

// Chart loading skeleton
const ChartSkeleton = ({ height = 200 }: { height?: number }) => (
  <div className="w-full" style={{ height }}>
    <Skeleton className="w-full h-full rounded-lg" />
  </div>
);

// Lazy chart wrapper components
export const LazyLineChart: React.FC<any> = ({ children, ...props }) => (
  <Suspense fallback={<ChartSkeleton height={props.height || 200} />}>
    <ResponsiveContainer {...props}>
      <LineChart {...props}>
        {children}
      </LineChart>
    </ResponsiveContainer>
  </Suspense>
);

export const LazyBarChart: React.FC<any> = ({ children, ...props }) => (
  <Suspense fallback={<ChartSkeleton height={props.height || 200} />}>
    <ResponsiveContainer {...props}>
      <BarChart {...props}>
        {children}
      </BarChart>
    </ResponsiveContainer>
  </Suspense>
);

export const LazyPieChart: React.FC<any> = ({ children, ...props }) => (
  <Suspense fallback={<ChartSkeleton height={props.height || 200} />}>
    <ResponsiveContainer {...props}>
      <PieChart {...props}>
        {children}
      </PieChart>
    </ResponsiveContainer>
  </Suspense>
);

// Export lazy-loaded chart components
export {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
};

// Preload charts when user likely to need them
export const preloadCharts = () => {
  import('recharts');
};

// Hook to preload charts on user interaction
export const useChartPreloader = () => {
  const preload = React.useCallback(() => {
    preloadCharts();
  }, []);

  return preload;
};