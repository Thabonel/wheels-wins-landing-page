
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DollarSign } from "lucide-react";

interface BudgetCategoryProps {
  id: number;
  name: string;
  budgeted: number;
  spent: number;
  remaining: number;
  progress: number;
  color: string;
  status: string;
}

export default function BudgetCategoryCard({
  name,
  budgeted,
  spent,
  remaining,
  progress,
}: BudgetCategoryProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex justify-between">
          <span>{name}</span>
          <span className="text-muted-foreground">${budgeted}</span>
        </CardTitle>
        <div className="flex justify-between text-sm">
          <span>Progress: {progress}%</span>
          <span>
            <span className="font-medium">${spent}</span>
            <span className="text-muted-foreground"> of ${budgeted}</span>
          </span>
        </div>
        <Progress
          value={progress}
          className={`h-2 ${progress > 100 ? 'bg-muted [&>div]:bg-red-500' : ''}`}
        />
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-muted-foreground">Remaining</div>
            <div className={`font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(remaining)}
              {remaining < 0 && " over budget"}
            </div>
          </div>

          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
            remaining >= 0 ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <DollarSign className={`h-4 w-4 ${
              remaining >= 0 ? 'text-green-600' : 'text-red-600'
            }`} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/20 p-2">
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
          View Transactions
        </Button>
      </CardFooter>
    </Card>
  );
}
