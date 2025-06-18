
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerTrigger } from "@/components/ui/drawer";
import { PlusCircle } from "lucide-react";

// Import refactored components
import IncomeTable from "./income/IncomeTable";
import IncomeChart from "./income/IncomeChart";
import IncomeSummaryCards from "./income/IncomeSumm
import AddIncomeForm from "./income/AddIncomeForm";
import PamInsightCard from "./income/PamInsightCard";
import { useIncomeData } from "./income/useIncomeData";
import { sourceColors } from "./income/mockData";

export default function WinsIncome() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { incomeData, chartData, addIncome, isLoading } = useIncomeData();
  
  // Calculate total income
  const totalIncome = incomeData.reduce((sum, item) => sum + item.amount, 0);
  
  if (isLoading) {
    return <div className="text-center py-6">Loading income data...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Your Income</h2>
        
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Income
            </Button>
          </DrawerTrigger>
          <AddIncomeForm onAddIncome={addIncome} onClose={() => setDrawerOpen(false)} />
        </Drawer>
      </div>
      
      <IncomeSummaryCards totalIncome={totalIncome} />
      
      <IncomeChart chartData={chartData} />

      <IncomeTable incomeData={incomeData} sourceColors={sourceColors} />
      
      <PamInsightCard />
    </div>
  );
}
