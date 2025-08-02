import React, { lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Lazy load the heavy TripPlannerApp with all Mapbox dependencies
const TripPlannerApp = lazy(() => import('./TripPlannerApp'));

const TripPlannerLoadingFallback = () => (
  <Card className="h-[600px] w-full">
    <CardContent className="flex items-center justify-center h-full">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <div className="space-y-2">
          <p className="text-gray-600 font-medium">Loading Trip Planner...</p>
          <p className="text-sm text-gray-500">Loading map services and route planning tools</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

interface LazyTripPlannerAppProps {
  [key: string]: any;
}

const LazyTripPlannerApp: React.FC<LazyTripPlannerAppProps> = (props) => {
  return (
    <Suspense fallback={<TripPlannerLoadingFallback />}>
      <TripPlannerApp {...props} />
    </Suspense>
  );
};

export default LazyTripPlannerApp;