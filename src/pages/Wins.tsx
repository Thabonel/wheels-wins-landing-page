
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PamAssistant from "@/components/PamAssistant";
import { useIsMobile } from "@/hooks/use-mobile";
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
  
  // Mock user data for Pam assistant
  const user = {
    name: "John",
    avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png"
  };
  
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "expenses", label: "Expenses" },
    { id: "income", label: "Income" },
    { id: "budgets", label: "Budgets" },
    { id: "tips", label: "Tips" },
    { id: "money-maker", label: "Make Money on the Road" },
  ];
  
  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content - 75% on desktop */}
        <div className="w-full lg:w-3/4">
          <Tabs 
            defaultValue="overview" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full justify-start overflow-x-auto mb-4">
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
              <TabsContent value="overview">
                <WinsOverview />
              </TabsContent>
              <TabsContent value="expenses">
                <WinsExpenses />
              </TabsContent>
              <TabsContent value="income">
                <WinsIncome />
              </TabsContent>
              <TabsContent value="budgets">
                <WinsBudgets />
              </TabsContent>
              <TabsContent value="tips">
                <WinsTips />
              </TabsContent>
              <TabsContent value="money-maker">
                <WinsMoneyMaker />
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        {/* Pam Assistant - 25% on desktop, floating button on mobile */}
        <div className={`${isMobile ? 'fixed bottom-4 right-4 z-30' : 'w-full lg:w-1/4'}`}>
          {isMobile ? (
            <button 
              onClick={() => document.getElementById('pam-modal')?.classList.toggle('hidden')}
              className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg"
            >
              <span className="text-lg font-bold">Pam</span>
            </button>
          ) : (
            <PamAssistant user={user} />
          )}
          
          {/* Mobile Pam modal */}
          {isMobile && (
            <div id="pam-modal" className="hidden fixed inset-0 z-40 bg-black bg-opacity-50">
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 max-h-[80vh] overflow-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Chat with Pam</h3>
                  <button 
                    onClick={() => document.getElementById('pam-modal')?.classList.add('hidden')}
                    className="text-gray-500"
                  >
                    Close
                  </button>
                </div>
                <PamAssistant user={user} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
