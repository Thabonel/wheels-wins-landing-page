
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
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
      <h2 className="text-lg font-medium">Monthly Budgets</h2>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={onEditClick}>
              <Settings className="mr-2 h-4 w-4" />
              Manage Categories
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add or remove budget categories</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
