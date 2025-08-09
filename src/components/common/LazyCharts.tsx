import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load chart components
const ExpenseChart = lazy(() => 
  import('@/components/wins/expense-tracker/ExpenseChart').then(module => ({
    default: module.ExpenseChart
  }))
);

const FinancialOverview = lazy(() => 
  import('@/components/wins/FinancialOverview').then(module => ({
    default: module.default
  }))
);

interface LazyExpenseChartProps {
  expenses: any[];
  dateRange: { from: Date; to: Date };
}

export function LazyExpenseChart(props: LazyExpenseChartProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      }
    >
      <ExpenseChart {...props} />
    </Suspense>
  );
}

export function LazyFinancialOverview() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      }
    >
      <FinancialOverview />
    </Suspense>
  );
}