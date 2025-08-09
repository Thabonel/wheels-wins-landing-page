
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerTrigger } from "@/components/ui/drawer";
import { Lightbulb } from "lucide-react";
import { useScrollReset } from "@/hooks/useScrollReset";

import TipCard from "./tips/TipCard";
import TipsLeaderboard from "./tips/TipsLeaderboard";
import PamPicksCard from "./tips/PamPicksCard";
import TipShareForm from "./tips/TipShareForm";
import TipCategorySection from "./tips/TipCategorySection";
import { useTipsData } from "./tips/useTipsData";

export default function WinsTips() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tabValue, setTabValue] = useState("tips");
  const { tipCategories, leaderboardData, addTip, isLoading } = useTipsData();
  
  // Reset scroll when tab changes
  useScrollReset([tabValue]);
  
  if (isLoading) {
    return <div className="text-center py-6">Loading tips...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Money-Saving Tips</h2>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button>
              <Lightbulb className="mr-2 h-4 w-4" />
              Share Your Tip
            </Button>
          </DrawerTrigger>
          <TipShareForm onAddTip={addTip} onClose={() => setDrawerOpen(false)} />
        </Drawer>
      </div>
      
      <Tabs 
        defaultValue="tips" 
        value={tabValue} 
        onValueChange={setTabValue}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tips">Weekly Tips</TabsTrigger>
          <TabsTrigger value="leaderboard">Savings Leaderboard</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tips" className="space-y-4 mt-6">
          {tipCategories.length > 0 ? (
            tipCategories.map((category) => (
              <TipCategorySection key={category.id} category={category} />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No tips yet. Be the first to share a money-saving tip!
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="leaderboard">
          <TipsLeaderboard leaderboardData={leaderboardData} />
        </TabsContent>
      </Tabs>
      
      <PamPicksCard />
    </div>
  );
}
