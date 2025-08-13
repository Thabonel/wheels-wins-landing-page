
import { useState, lazy, Suspense } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { TabTransition } from "@/components/common/TabTransition";
import WinsOnboarding from "@/components/wins/WinsOnboarding";

// Lazy load financial components to reduce initial bundle size (especially charts)
const WinsOverview = lazy(() => import("@/components/wins/WinsOverview"));
const WinsExpenses = lazy(() => import("@/components/wins/WinsExpenses"));
const WinsIncome = lazy(() => import("@/components/wins/WinsIncome"));
const WinsBudgets = lazy(() => import("@/components/wins/WinsBudgets"));
const WinsTips = lazy(() => import("@/components/wins/WinsTips"));
const WinsMoneyMaker = lazy(() => import("@/components/wins/WinsMoneyMaker"));

import { useScrollReset } from "@/hooks/useScrollReset";

// Loading component for financial modules
const FinancialModuleLoader = ({ moduleName }: { moduleName: string }) => (
  <div className="flex items-center justify-center h-96">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    <span className="ml-3 text-gray-600">Loading {moduleName}...</span>
  </div>
);

export default function Wins() {
  const [activeTab, setActiveTab] = useState("overview");
  const isMobile = useIsMobile();
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Use our consistent scroll reset hook
  useScrollReset([activeTab]);
  
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "expenses", label: "Expenses" },
    { id: "income", label: "Income" },
    { id: "budgets", label: "Budgets" },
    { id: "tips", label: "Tips" },
    { id: "money-maker", label: "Make Money on the Road" },
  ];
  
  return (
    <>
      {/* Onboarding modal */}
      <WinsOnboarding onComplete={() => setShowOnboarding(false)} />
      
      <div className="container p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content - 75% on desktop */}
        <div className="w-full lg:w-3/4">
          <Tabs
            defaultValue="overview"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full justify-start flex-wrap mb-4">
              {isMobile ? (
                <div className="w-full p-2">
                  <select 
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-md py-2 px-3 text-sm"
                  >
                    {tabs.map((tab) => (
                      <option key={tab.id} value={tab.id}>
                        {tab.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                tabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id} 
                    className="text-base py-3 px-6"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))
              )}
            </TabsList>
            
            <div className="bg-white rounded-lg border p-4 min-h-[600px] mt-2" id="content">
              <TabTransition activeTab={activeTab} tabId="overview">
                <Suspense fallback={<FinancialModuleLoader moduleName="Overview" />}>
                  <WinsOverview onTabChange={setActiveTab} />
                </Suspense>
              </TabTransition>
              <TabTransition activeTab={activeTab} tabId="expenses">
                <Suspense fallback={<FinancialModuleLoader moduleName="Expenses" />}>
                  <WinsExpenses />
                </Suspense>
              </TabTransition>
              <TabTransition activeTab={activeTab} tabId="income">
                <Suspense fallback={<FinancialModuleLoader moduleName="Income" />}>
                  <WinsIncome />
                </Suspense>
              </TabTransition>
              <TabTransition activeTab={activeTab} tabId="budgets">
                <Suspense fallback={<FinancialModuleLoader moduleName="Budgets" />}>
                  <WinsBudgets />
                </Suspense>
              </TabTransition>
              <TabTransition activeTab={activeTab} tabId="tips">
                <Suspense fallback={<FinancialModuleLoader moduleName="Money-Saving Tips" />}>
                  <WinsTips />
                </Suspense>
              </TabTransition>
              <TabTransition activeTab={activeTab} tabId="money-maker">
                <Suspense fallback={<FinancialModuleLoader moduleName="Money Maker" />}>
                  <WinsMoneyMaker />
                </Suspense>
              </TabTransition>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
    </>
  );
}
