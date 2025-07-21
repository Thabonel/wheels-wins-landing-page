
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { TabTransition } from "@/components/common/TabTransition";
import WinsOverview from "@/components/wins/WinsOverview";
import WinsExpenses from "@/components/wins/WinsExpenses";
import WinsIncome from "@/components/wins/WinsIncome";
import WinsBudgets from "@/components/wins/WinsBudgets";
import WinsTips from "@/components/wins/WinsTips";
import WinsMoneyMaker from "@/components/wins/WinsMoneyMaker";

import { useScrollReset } from "@/hooks/useScrollReset";

export default function Wins() {
  const [activeTab, setActiveTab] = useState("overview");
  const isMobile = useIsMobile();
  
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
                <WinsOverview />
              </TabTransition>
              <TabTransition activeTab={activeTab} tabId="expenses">
                <WinsExpenses />
              </TabTransition>
              <TabTransition activeTab={activeTab} tabId="income">
                <WinsIncome />
              </TabTransition>
              <TabTransition activeTab={activeTab} tabId="budgets">
                <WinsBudgets />
              </TabTransition>
              <TabTransition activeTab={activeTab} tabId="tips">
                <WinsTips />
              </TabTransition>
              <TabTransition activeTab={activeTab} tabId="money-maker">
                <WinsMoneyMaker />
              </TabTransition>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
