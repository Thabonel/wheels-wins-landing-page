import React, { lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';

// Lazy load calendar components that use @fullcalendar
const FullCalendarWrapper = lazy(() => import('@/components/you/FullCalendarWrapper'));

// Calendar loading fallback
const CalendarLoadingFallback = () => (
  <Card className="w-full h-[600px]">
    <CardContent className="flex items-center justify-center h-full">
      <div className="text-center space-y-4">
        <div className="animate-pulse">
          <div className="grid grid-cols-7 gap-1 mb-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center space-x-2 text-gray-500">
          <Calendar className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading calendar...</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Lazy calendar component wrapper
export const LazyFullCalendarWrapper: React.FC<any> = (props) => (
  <Suspense fallback={<CalendarLoadingFallback />}>
    <FullCalendarWrapper {...props} />
  </Suspense>
);