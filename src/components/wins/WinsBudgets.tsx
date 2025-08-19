
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

  // Generate months for past 2 years and next year (36 months total)
  const months = Array.from({ length: 36 }).map((_, i) => {
    // Start from 12 months in the future and go back 24 months
    const date = new Date(currentYear, currentMonth + 12 - i, 1);
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

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          View and edit budgets for any month
        </p>
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

      <TotalBudgetCard />
      <BudgetCategoriesGrid />
      
      {isOffline ? <OfflinePamBudgetAdvice /> : <PamBudgetAdvice />}

      <CategoryManagementModal open={isEditing && !isOffline} onOpenChange={setIsEditing} />
    </div>
  );
}
