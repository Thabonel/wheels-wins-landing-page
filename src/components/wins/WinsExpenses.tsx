
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Drawer, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

// Import refactored components
import ExpenseTable from "./expenses/ExpenseTable";
import ExpenseChart from "./expenses/ExpenseChart";
import AddExpenseForm from "./expenses/AddExpenseForm";
import PamInsightCard from "./expenses/PamInsightCard";
import { chartData, categoryColors } from "./expenses/mockData";
import { useExpenseActions } from "@/hooks/useExpenseActions";

export default function WinsExpenses() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState("timeline");
  const { expenses } = useExpenseActions();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Tabs defaultValue="all" className="w-auto">
          <TabsList>
            <TabsTrigger value="all">All Expenses</TabsTrigger>
            <TabsTrigger value="fuel">Fuel</TabsTrigger>
            <TabsTrigger value="food">Food</TabsTrigger>
            <TabsTrigger value="camp">Camp</TabsTrigger>
            <TabsTrigger value="fun">Fun</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md overflow-hidden">
            <Button 
              variant={viewMode === "timeline" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("timeline")}
              className="rounded-none border-0"
            >
              Timeline
            </Button>
            <Button 
              variant={viewMode === "chart" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("chart")}
              className="rounded-none border-0"
            >
              Chart
            </Button>
          </div>
          
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </DrawerTrigger>
            <AddExpenseForm onClose={() => setDrawerOpen(false)} />
          </Drawer>
        </div>
      </div>

      {viewMode === "timeline" ? (
        <ExpenseTable 
          expenses={expenses} 
          categoryColors={categoryColors} 
          onFilterClick={() => console.log('Filter clicked')}
        />
      ) : (
        <ExpenseChart chartData={chartData} />
      )}

      <PamInsightCard 
        content="Your fuel costs are 23% higher than last month. I found three gas stations nearby with prices $0.30 lower than you've been paying. Want me to show you the route?"
      />
    </div>
  );
}
