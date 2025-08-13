import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Drawer, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { PlusCircle, Upload } from "lucide-react";
import { useScrollReset } from "@/hooks/useScrollReset";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileFormWrapper } from "@/components/common/MobileFormWrapper";
import { BankStatementConverter } from "@/components/bank-statement/BankStatementConverter";

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
  const [showBankUpload, setShowBankUpload] = useState(false);
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
      {/* Header with proper category navigation */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-4">Expenses</h2>
          <Tabs 
            value={selectedCategory} 
            onValueChange={setSelectedCategory} 
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1 h-auto p-1">
              <TabsTrigger value="all" className="text-xs md:text-sm py-2 px-2 md:px-3">
                All Expenses
              </TabsTrigger>
              {categories.map(category => (
                <TabsTrigger 
                  key={category} 
                  value={category.toLowerCase()}
                  className="text-xs md:text-sm py-2 px-2 md:px-3"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
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
          <Button onClick={() => setDrawerOpen(true)} className="w-full md:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
          <Button 
            onClick={() => setShowBankUpload(!showBankUpload)} 
            variant="outline"
            className="w-full md:w-auto"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Bank Statement
          </Button>
        </div>
      </div>

      {/* Natural language expense input */}
      <ExpenseInput />

      {/* Voice expense logger for hands-free logging */}
      <VoiceExpenseLogger className="mb-6" />

      {/* Bank Statement Upload Section */}
      {showBankUpload && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-4">Import Bank Statement</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Upload your bank statement to automatically import expenses and categorize them.
          </p>
          <BankStatementConverter />
        </div>
      )}

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
