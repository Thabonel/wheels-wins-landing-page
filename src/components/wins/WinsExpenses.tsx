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
      {/* Page Header Section */}
      <div className="space-y-4">
        {/* Title and Description */}
        <div>
          <h2 className="text-2xl font-bold">Expenses</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track and categorize your travel expenses</p>
        </div>
        
        {/* Primary Actions Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* View Toggle - More prominent segmented control */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button 
              variant={viewMode === "timeline" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("timeline")}
              className={`rounded-md px-4 py-2 ${viewMode === "timeline" ? "" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}
            >
              Timeline
            </Button>
            <Button 
              variant={viewMode === "chart" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("chart")}
              className={`rounded-md px-4 py-2 ${viewMode === "chart" ? "" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}
            >
              Chart
            </Button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 flex-col sm:flex-row">
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
            <Button onClick={() => setDrawerOpen(true)} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
            <Button 
              onClick={() => setShowBankUpload(!showBankUpload)} 
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Bank Statement
            </Button>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <Tabs 
        value={selectedCategory} 
        onValueChange={setSelectedCategory} 
        className="w-full"
      >
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-gray-50 dark:bg-gray-900">
          <TabsTrigger value="all">
            All Expenses
          </TabsTrigger>
          {categories.map(category => (
            <TabsTrigger 
              key={category} 
              value={category.toLowerCase()}
              className="whitespace-nowrap"
            >
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Quick Input Section */}
      <div className="space-y-4">
        {/* Natural language expense input */}
        <ExpenseInput />

        {/* Voice expense logger for hands-free logging */}
        <VoiceExpenseLogger />
      </div>

      {/* Bank Statement Upload Section - Conditionally shown */}
      {showBankUpload && (
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">Import Bank Statement</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Upload your bank statement to automatically import and categorize expenses.
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowBankUpload(false)}
              className="hover:bg-blue-100 dark:hover:bg-blue-900/50"
            >
              ✕
            </Button>
          </div>
          <BankStatementConverter />
        </div>
      )}

      {/* Main Content Area - Table or Chart View */}
      <div className="min-h-[400px]">
        {viewMode === "timeline" ? (
          <ExpenseTable 
            expenses={filteredExpenses} 
            categoryColors={categoryColors} 
            onFilterClick={() => console.log('Filter clicked')}
          />
        ) : (
          <ExpenseChart chartData={filteredChartData} />
        )}
      </div>

      {/* PAM Insight Card */}
      <PamInsightCard 
        content="Your fuel costs are 23% higher than last month. I found three gas stations nearby with prices $0.30 lower than you've been paying. Want me to show you the route?"
      />
    </div>
  );
}
