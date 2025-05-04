
import { useState } from "react";
import TotalBudgetsHeader from "./budgets/TotalBudgetsHeader";
import TotalBudgetCard from "./budgets/TotalBudgetCard";
import BudgetCategoriesGrid from "./budgets/BudgetCategoriesGrid";
import PamBudgetAdvice from "./budgets/PamBudgetAdvice";
import { useBudgetCalculations } from "./budgets/useBudgetCalculations";

export default function WinsBudgets() {
  const [isEditing, setIsEditing] = useState(false);
  const { categories, budgetSummary } = useBudgetCalculations();
  
  const handleEditClick = () => {
    setIsEditing(true);
    // In a real application, this would open a budget editing interface
    console.log("Edit budgets clicked");
  };
  
  return (
    <div className="space-y-6">
      <TotalBudgetsHeader onEditClick={handleEditClick} />
      
      {/* Overall Budget Card */}
      <TotalBudgetCard 
        totalBudget={budgetSummary.totalBudget}
        totalSpent={budgetSummary.totalSpent}
        totalRemaining={budgetSummary.totalRemaining}
        totalProgress={budgetSummary.totalProgress}
      />
      
      {/* Category Budget Cards */}
      <BudgetCategoriesGrid categories={categories} />
      
      {/* Pam's Budget Advice */}
      <PamBudgetAdvice />
    </div>
  );
}
