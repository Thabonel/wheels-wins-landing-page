
import { Button } from "@/components/ui/button";
import { Settings, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TotalBudgetsHeaderProps {
  onEditClick: () => void;
}

export default function TotalBudgetsHeader({ onEditClick }: TotalBudgetsHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium">Monthly Budgets</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Track your spending across different categories. Set monthly limits to stay on budget during your travels.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={onEditClick}>
              <Settings className="mr-2 h-4 w-4" />
              Edit Budgets
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Manage budget categories, set spending limits, and customize your budget tracking preferences</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
