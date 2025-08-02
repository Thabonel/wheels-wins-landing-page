import React, { lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Lazy load chart components that use recharts
const ExpenseChart = lazy(() => import('@/components/wins/expenses/ExpenseChart'));
const IncomeChart = lazy(() => import('@/components/wins/income/IncomeChart'));
const MoneyMakerIncomeChart = lazy(() => import('@/components/wins/moneymaker/IncomeChart'));

// Chart loading fallback
const ChartLoadingFallback = ({ height = "300px" }: { height?: string }) => (
  <Card className="w-full" style={{ height }}>
    <CardContent className="flex items-center justify-center h-full">
      <div className="text-center space-y-3">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
        <p className="text-sm text-gray-500">Loading chart...</p>
      </div>
    </CardContent>
  </Card>
);

// Lazy chart component wrappers
export const LazyExpenseChart: React.FC<any> = (props) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <ExpenseChart {...props} />
  </Suspense>
);

export const LazyIncomeChart: React.FC<any> = (props) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <IncomeChart {...props} />
  </Suspense>
);

export const LazyMoneyMakerIncomeChart: React.FC<any> = (props) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <MoneyMakerIncomeChart {...props} />
  </Suspense>
);