
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerTrigger } from "@/components/ui/drawer";
import { PlusCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileFormWrapper } from "@/components/common/MobileFormWrapper";

// Import refactored components
import IncomeTable from "./income/IncomeTable";
import IncomeChart from "./income/IncomeChart";
import IncomeSummaryCards from "./income/IncomeSummaryCards";
import AddIncomeForm from "./income/AddIncomeForm";
import MobileIncomeForm from "./income/MobileIncomeForm";
import PamInsightCard from "./income/PamInsightCard";
import { useIncomeData } from "./income/useIncomeData";
import { sourceColors } from "./income/mockData";

export default function WinsIncome() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { incomeData, chartData, addIncome, isLoading } = useIncomeData();
  const isMobile = useIsMobile();
  
  // Check if we should open the form on mount
  useEffect(() => {
    if (sessionStorage.getItem('openIncomeForm') === 'true') {
      setDrawerOpen(true);
      sessionStorage.removeItem('openIncomeForm');
    }
  }, []);
  
  // Calculate total income
  const totalIncome = incomeData.reduce((sum, item) => sum + item.amount, 0);
  
  if (isLoading) {
    return <div className="text-center py-6">Loading income data...</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Header with consistent styling */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div className="flex-1">
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <MobileFormWrapper open={drawerOpen} onOpenChange={setDrawerOpen}>
            {isMobile ? (
              <MobileIncomeForm onAddIncome={addIncome} onClose={() => setDrawerOpen(false)} />
            ) : (
              <AddIncomeForm onAddIncome={addIncome} onClose={() => setDrawerOpen(false)} />
            )}
          </MobileFormWrapper>
          <Button onClick={() => setDrawerOpen(true)} className="w-full md:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Income
          </Button>
        </div>
      </div>
      
      <IncomeSummaryCards totalIncome={totalIncome} />
      
      <IncomeChart chartData={chartData} />

      <IncomeTable incomeData={incomeData} sourceColors={sourceColors} />
      
      <PamInsightCard />
    </div>
  );
}
