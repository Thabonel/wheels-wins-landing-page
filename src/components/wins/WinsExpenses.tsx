import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Drawer, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useScrollReset } from "@/hooks/useScrollReset";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileFormWrapper } from "@/components/common/MobileFormWrapper";

// Import refactored components
import ExpenseTable from "./expenses/ExpenseTable";
import ExpenseChart from "./expenses/ExpenseChart";
import AddExpenseForm from "./expenses/AddExpenseForm";
import MobileExpenseForm from "./expenses/MobileExpenseForm";
import PamInsightCard from "./expenses/PamInsightCard";
import { useExpenseActions } from "@/hooks/useExpenseActions";
import ExpenseInput from "./expenses/ExpenseInput";
import VoiceExpenseLogger from "./expenses/VoiceExpenseLogger";

export default function WinsExpenses() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState("timeline");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { expenses, categories, categoryColors } = useExpenseActions();
  const [presetCategory, setPresetCategory] = useState<string | undefined>();
  const isMobile = useIsMobile();
  
  // Reset scroll when selected category or view mode changes
  useScrollReset([selectedCategory, viewMode]);
  
  // Check for Quick Actions presets on mount
  useEffect(() => {
    // Check if we should open the form
    if (sessionStorage.getItem('openExpenseForm') === 'true') {
      setDrawerOpen(true);
      sessionStorage.removeItem('openExpenseForm');
    }
    
    // Check for expense preset
    const preset = sessionStorage.getItem('expensePreset');
    if (preset) {
      const { category } = JSON.parse(preset);
      setPresetCategory(category);
      setDrawerOpen(true);
      sessionStorage.removeItem('expensePreset');
    }
    
    // Check for receipt upload
    if (sessionStorage.getItem('openReceiptUpload') === 'true') {
      setDrawerOpen(true);
      // The AddExpenseForm will handle the receipt upload
      sessionStorage.removeItem('openReceiptUpload');
    }
    
    // Check for voice entry
    if (sessionStorage.getItem('startVoiceEntry') === 'true') {
      // Voice entry will be handled by VoiceExpenseLogger
      sessionStorage.removeItem('startVoiceEntry');
    }
  }, []);
  
  // Filter expenses based on selected category
  const filteredExpenses = selectedCategory === "all" 
    ? expenses 
    : expenses.filter(expense => expense.category.toLowerCase() === selectedCategory.toLowerCase());
  
  // Prepare chart data based on categories - ensure amount is always a number
  const filteredChartData = Object.entries(
    expenses.reduce((acc, expense) => {
      const category = expense.category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      const amount = Number(expense.amount);
      acc[category] += isNaN(amount) ? 0 : amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, amount]) => ({ 
    name, 
    amount: Number(amount) || 0 
  }));
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Tabs 
          value={selectedCategory} 
          onValueChange={setSelectedCategory} 
          className="w-auto"
        >
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="all">All Expenses</TabsTrigger>
            {categories.map(category => (
              <TabsTrigger key={category} value={category.toLowerCase()}>
                {category}
              </TabsTrigger>
            ))}
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
          
          <MobileFormWrapper open={drawerOpen} onOpenChange={setDrawerOpen}>
            {isMobile ? (
              <MobileExpenseForm 
                onClose={() => {
                  setDrawerOpen(false);
                  setPresetCategory(undefined);
                }} 
                presetCategory={presetCategory}
              />
            ) : (
              <AddExpenseForm 
                onClose={() => {
                  setDrawerOpen(false);
                  setPresetCategory(undefined);
                }} 
                presetCategory={presetCategory}
              />
            )}
          </MobileFormWrapper>
          <Button onClick={() => setDrawerOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Natural language expense input */}
      <ExpenseInput />

      {/* Voice expense logger for hands-free logging */}
      <VoiceExpenseLogger className="mb-6" />

      {viewMode === "timeline" ? (
        <ExpenseTable 
          expenses={filteredExpenses} 
          categoryColors={categoryColors} 
          onFilterClick={() => console.log('Filter clicked')}
        />
      ) : (
        <ExpenseChart chartData={filteredChartData} />
      )}

      <PamInsightCard 
        content="Your fuel costs are 23% higher than last month. I found three gas stations nearby with prices $0.30 lower than you've been paying. Want me to show you the route?"
      />
    </div>
  );
}
