
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerTrigger } from "@/components/ui/drawer";
import { PlusCircle, ChevronDown, ChevronUp } from "lucide-react";

import SummaryCard from "./moneymaker/SummaryCard";
import IncomeChart from "./moneymaker/IncomeChart";
import IncomeIdeaCard from "./moneymaker/IncomeIdeaCard";
import IncomeIdeaForm from "./moneymaker/IncomeIdeaForm";
import PamSuggestions from "./moneymaker/PamSuggestions";
import { activeIdeas, archivedIdeas, chartData } from "./moneymaker/mockData";

export default function WinsMoneyMaker() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  
  // Calculate total monthly income
  const totalMonthlyIncome = activeIdeas.reduce((sum, idea) => sum + idea.monthlyIncome, 0);
  
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
          <IncomeIdeaForm />
        </Drawer>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Total Monthly Income"
          value={`$${totalMonthlyIncome}`}
          trend={{
            value: "+$230 from last month",
            isPositive: true
          }}
        />
        
        <SummaryCard
          title="Active Income Streams"
          value={activeIdeas.filter(i => i.status === "Active").length}
          subtitle={`${activeIdeas.filter(i => i.status === "Paused").length} currently paused`}
        />
        
        <SummaryCard
          title="Top Performer"
          value={activeIdeas.sort((a, b) => b.monthlyIncome - a.monthlyIncome)[0]?.name}
          subtitle={`$${activeIdeas.sort((a, b) => b.monthlyIncome - a.monthlyIncome)[0]?.monthlyIncome}/month`}
        />
      </div>
      
      {/* Income comparison chart */}
      <IncomeChart chartData={chartData} />
      
      {/* Active Income Ideas */}
      <div>
        <h3 className="font-medium text-lg mb-3">Your Active Ideas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeIdeas.map((idea) => (
            <IncomeIdeaCard key={idea.id} {...idea} />
          ))}
        </div>
      </div>
      
      {/* Archived Ideas (collapsible) */}
      <div>
        <button
          onClick={() => setArchivedOpen(!archivedOpen)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <span>Archived Ideas ({archivedIdeas.length})</span>
          {archivedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        {archivedOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {archivedIdeas.map((idea) => (
              <IncomeIdeaCard key={idea.id} {...idea} />
            ))}
          </div>
        )}
      </div>
      
      {/* Pam's Suggestions */}
      <PamSuggestions />
    </div>
  );
}
