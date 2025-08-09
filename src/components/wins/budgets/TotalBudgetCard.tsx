
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useBudgetCalculations } from "./useBudgetCalculations";
import { useOffline } from "@/context/OfflineContext";

export default function TotalBudgetCard() {
  const { budgetSummary, loading } = useBudgetCalculations();
  const { isOffline } = useOffline();

  if (loading) {
    return <Card className="border-2 border-blue-100"><CardContent>Loading summary...</CardContent></Card>;
  }

  const { totalBudget, totalSpent, totalRemaining, totalProgress } = budgetSummary;
  
  return (
    <Card className="border-2 border-blue-100">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Total Monthly Budget</span>
          {isOffline && <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Cached Data</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm">
          <span>Progress: {totalProgress}%</span>
          <span>
            <span className="font-medium">${totalSpent}</span>
            <span className="text-muted-foreground"> of ${totalBudget}</span>
          </span>
        </div>
        <Progress value={totalProgress} className="h-3" />

        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Budgeted</span>
            <span className="text-2xl font-bold">${totalBudget}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Spent</span>
            <span className="text-2xl font-bold">${totalSpent}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Remaining</span>
            <span className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${totalRemaining}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
