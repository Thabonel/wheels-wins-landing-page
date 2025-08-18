
import { useState } from "react";
import TotalBudgetsHeader from "./budgets/TotalBudgetsHeader";
import TotalBudgetCard from "./budgets/TotalBudgetCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "lucide-react";
import BudgetCategoriesGrid from "./budgets/BudgetCategoriesGrid";
import PamBudgetAdvice from "./budgets/PamBudgetAdvice";
import OfflinePamBudgetAdvice from "./budgets/OfflinePamBudgetAdvice";
import OfflineBudgetBanner from "./budgets/OfflineBudgetBanner";
import CategoryManagementModal from "./expenses/CategoryManagementModal";
import { useOffline } from "@/context/OfflineContext";

export default function WinsBudgets() {
  const [isEditing, setIsEditing] = useState(false);
  const { isOffline } = useOffline();

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
  const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString();

  // Generate months for the past 12 months and next 6 months (18 months total)
  const months = Array.from({ length: 18 }).map((_, i) => {
    // Start from 6 months in the future and go back 18 months
    const monthOffset = 6 - i;
    const date = new Date(currentYear, currentMonth + monthOffset, 1);
    return {
      value: `${date.getMonth()}-${date.getFullYear()}`,
      label: date.toLocaleString("default", { month: "long", year: "numeric" }),
      month: date.getMonth(),
      year: date.getFullYear(),
    };
  });

  const handleEditClick = () => {
    if (isOffline) return; // Disable editing when offline
    setIsEditing(true);
  };

  const handleMonthChange = (value: string) => {
    if (isOffline) return; // Disable month changes when offline
    const [month, year] = value.split("-").map(Number);
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  return (
    <div className="space-y-6">
      {isOffline && <OfflineBudgetBanner />}
      
      <TotalBudgetsHeader onEditClick={handleEditClick} />

      <div className="flex justify-end items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select onValueChange={handleMonthChange} defaultValue={`${selectedMonth}-${selectedYear}`} disabled={isOffline}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select a month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>View and manage budgets for different months. Select past months to review spending or future months to plan ahead.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <TotalBudgetCard />
      <BudgetCategoriesGrid />
      
      {isOffline ? <OfflinePamBudgetAdvice /> : <PamBudgetAdvice />}

      <CategoryManagementModal open={isEditing && !isOffline} onOpenChange={setIsEditing} />
    </div>
  );
}
