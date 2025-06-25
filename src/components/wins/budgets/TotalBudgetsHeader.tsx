
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

interface TotalBudgetsHeaderProps {
  onEditClick: () => void;
}

export default function TotalBudgetsHeader({ onEditClick }: TotalBudgetsHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <h2 className="text-lg font-medium">Monthly Budgets</h2>
      <Button variant="outline" onClick={onEditClick}>
        <Settings className="mr-2 h-4 w-4" />
        Edit Budgets
      </Button>
    </div>
  );
}
