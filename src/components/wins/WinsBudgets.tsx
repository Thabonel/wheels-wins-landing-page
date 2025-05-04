
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import BudgetCategoryCard from "./budgets/BudgetCategoryCard";
import TotalBudgetCard from "./budgets/TotalBudgetCard";
import PamBudgetAdvice from "./budgets/PamBudgetAdvice";
import { budgetCategories } from "./budgets/mockData";

export default function WinsBudgets() {
  // Calculate total budget summary
  const totalBudget = budgetCategories.reduce((sum, item) => sum + item.budgeted, 0);
  const totalSpent = budgetCategories.reduce((sum, item) => sum + item.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const totalProgress = Math.round((totalSpent / totalBudget) * 100);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Monthly Budgets</h2>
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Edit Budgets
        </Button>
      </div>
      
      {/* Overall Budget Card */}
      <TotalBudgetCard 
        totalBudget={totalBudget}
        totalSpent={totalSpent}
        totalRemaining={totalRemaining}
        totalProgress={totalProgress}
      />
      
      {/* Category Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgetCategories.map((category) => (
          <BudgetCategoryCard 
            key={category.id}
            {...category}
          />
        ))}
      </div>
      
      {/* Pam's Budget Advice */}
      <PamBudgetAdvice />
    </div>
  );
}
