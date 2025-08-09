
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerTrigger } from "@/components/ui/drawer";
import { PlusCircle } from "lucide-react";

import SummaryCards from "./moneymaker/SummaryCards";
import IncomeChart from "./moneymaker/IncomeChart";
import ActiveIdeasSection from "./moneymaker/ActiveIdeasSection";
import ArchivedIdeasSection from "./moneymaker/ArchivedIdeasSection";
import IncomeIdeaForm from "./moneymaker/IncomeIdeaForm";
import PamSuggestions from "./moneymaker/PamSuggestions";
import HustleBoardSuggestions from "./moneymaker/HustleBoardSuggestions";
import { useMoneyMakerData } from "./moneymaker/useMoneyMakerData";

export default function WinsMoneyMaker() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { 
    activeIdeas, 
    archivedIdeas, 
    chartData, 
    totalMonthlyIncome, 
    addMoneyMakerIdea,
    isLoading 
  } = useMoneyMakerData();
  
  if (isLoading) {
    return <div className="text-center py-6">Loading money maker ideas...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium">Money Makers</h2>
          <p className="text-sm text-muted-foreground">Track your income sources on the road</p>
        </div>
        
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Income Idea
            </Button>
          </DrawerTrigger>
          <IncomeIdeaForm onAddIdea={addMoneyMakerIdea} onClose={() => setDrawerOpen(false)} />
        </Drawer>
      </div>

      {/* Summary cards */}
      <SummaryCards totalMonthlyIncome={totalMonthlyIncome} activeIdeas={activeIdeas} />
      
      {/* Income comparison chart */}
      <IncomeChart chartData={chartData} />
      
      {/* Hustle Board Suggestions */}
      <HustleBoardSuggestions onAddToIncome={addMoneyMakerIdea} />
      
      {/* Active Income Ideas */}
      <ActiveIdeasSection activeIdeas={activeIdeas} />
      
      {/* Archived Ideas (collapsible) */}
      <ArchivedIdeasSection archivedIdeas={archivedIdeas} />
      
      {/* Pam's Suggestions */}
      <PamSuggestions />
    </div>
  );
}
